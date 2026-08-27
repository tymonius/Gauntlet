import { updateArtDirectionMap } from './format.js';

const API_VERSION = '2022-11-28';
const SESSION_VERSION = 'v1';
const SESSION_MAX_SECONDS = 6 * 60 * 60;
const STATE_MAX_SECONDS = 10 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function config(env) {
  const [owner, repo] = String(env.GITHUB_REPOSITORY || 'tymonius/Gauntlet').split('/');
  return {
    owner,
    repo,
    publicOrigin: String(env.PUBLIC_SITE_ORIGIN || 'https://gauntlet.run'),
    allowedOrigins: new Set(String(env.ALLOWED_ORIGINS || env.PUBLIC_SITE_ORIGIN || 'https://gauntlet.run')
      .split(',').map(value => value.trim()).filter(Boolean)),
    allowedLogin: String(env.GITHUB_ALLOWED_LOGIN || 'tymonius').toLowerCase(),
    defaultBranch: String(env.GITHUB_DEFAULT_BRANCH || 'main'),
    authorBranch: String(env.GITHUB_AUTHOR_BRANCH || 'artwork/compositor-authoring'),
    authorityPath: String(env.GITHUB_AUTHORITY_PATH || 'game-data/current-game.json'),
    callbackUrl: String(env.OAUTH_CALLBACK_URL || ''),
  };
}

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : encoder.encode(String(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlDecode(value) {
  const padded = String(value).replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function encryptionKey(secret) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(secret)));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function signState(payload, secret) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyState(value, secret) {
  const [body, signature] = String(value || '').split('.');
  if (!body || !signature) throw new Error('Invalid OAuth state.');
  const valid = await crypto.subtle.verify(
    'HMAC',
    await signingKey(secret),
    base64UrlDecode(signature),
    encoder.encode(body),
  );
  if (!valid) throw new Error('Invalid OAuth state signature.');
  const payload = JSON.parse(decoder.decode(base64UrlDecode(body)));
  if (!payload.exp || Number(payload.exp) < Math.floor(Date.now() / 1000)) throw new Error('OAuth state expired.');
  return payload;
}

async function encryptSession(payload, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(secret),
    encoder.encode(JSON.stringify(payload)),
  );
  return `${SESSION_VERSION}.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(encrypted))}`;
}

async function decryptSession(value, secret) {
  const [version, ivValue, encryptedValue] = String(value || '').split('.');
  if (version !== SESSION_VERSION || !ivValue || !encryptedValue) throw new Error('Invalid authoring session.');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlDecode(ivValue) },
    await encryptionKey(secret),
    base64UrlDecode(encryptedValue),
  );
  const payload = JSON.parse(decoder.decode(decrypted));
  if (!payload.exp || Number(payload.exp) < Math.floor(Date.now() / 1000)) throw new Error('Authoring session expired.');
  if (!payload.githubToken || !payload.login) throw new Error('Incomplete authoring session.');
  return payload;
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const cfg = config(env);
  if (!origin || !cfg.allowedOrigins.has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

function requireAllowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || !config(env).allowedOrigins.has(origin)) {
    throw Object.assign(new Error('Origin is not allowed.'), { status: 403 });
  }
}

function validateReturnTo(value, env) {
  const cfg = config(env);
  const url = new URL(String(value || `${cfg.publicOrigin}/card-design/`));
  if (url.origin !== cfg.publicOrigin || !url.pathname.startsWith('/card-design/')) {
    throw new Error('Invalid authoring return URL.');
  }
  url.hash = '';
  return url.toString();
}

function callbackUrl(request, env) {
  return config(env).callbackUrl || `${new URL(request.url).origin}/auth/callback`;
}

async function github(path, token, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': API_VERSION,
      'user-agent': 'gauntlet-artwork-authoring',
      ...(init.headers || {}),
    },
  });
  if (response.status === 204) return null;
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.message || `GitHub API request failed (${response.status}).`);
    error.status = response.status;
    error.github = payload;
    throw error;
  }
  return payload;
}

function decodeGitHubContent(file) {
  const binary = atob(String(file?.content || '').replace(/\s+/gu, ''));
  return decoder.decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

function encodeGitHubContent(text) {
  const bytes = encoder.encode(String(text));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function authenticatedSession(request, env) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('GitHub authoring sign-in required.'), { status: 401 });
  const session = await decryptSession(match[1], env.ARTWORK_SESSION_SECRET);
  if (String(session.login).toLowerCase() !== config(env).allowedLogin) {
    throw Object.assign(new Error('This GitHub account is not authorized for Gauntlet artwork authoring.'), { status: 403 });
  }
  return session;
}

async function handleLogin(request, env) {
  if (!env.ARTWORK_GITHUB_CLIENT_ID || !env.ARTWORK_GITHUB_CLIENT_SECRET || !env.ARTWORK_SESSION_SECRET) {
    return new Response('Artwork authoring is not configured.', { status: 503 });
  }
  const url = new URL(request.url);
  const returnTo = validateReturnTo(url.searchParams.get('return_to'), env);
  const now = Math.floor(Date.now() / 1000);
  const state = await signState({
    returnTo,
    exp: now + STATE_MAX_SECONDS,
    nonce: base64UrlEncode(crypto.getRandomValues(new Uint8Array(16))),
  }, env.ARTWORK_SESSION_SECRET);
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.ARTWORK_GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', callbackUrl(request, env));
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('prompt', 'select_account');
  return Response.redirect(authorize.toString(), 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateValue = url.searchParams.get('state');
  if (!code || !stateValue) return new Response('GitHub authorization was not completed.', { status: 400 });

  const state = await verifyState(stateValue, env.ARTWORK_SESSION_SECRET);
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'gauntlet-artwork-authoring',
    },
    body: JSON.stringify({
      client_id: env.ARTWORK_GITHUB_CLIENT_ID,
      client_secret: env.ARTWORK_GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl(request, env),
    }),
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    return new Response(`GitHub token exchange failed: ${tokenPayload.error_description || tokenPayload.error || tokenResponse.status}`, { status: 502 });
  }

  const user = await github('/user', tokenPayload.access_token);
  const cfg = config(env);
  if (String(user?.login || '').toLowerCase() !== cfg.allowedLogin) {
    return new Response('This GitHub account is not authorized to edit Gauntlet artwork.', { status: 403 });
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenLifetime = Number(tokenPayload.expires_in);
  const expiresIn = Number.isFinite(tokenLifetime)
    ? Math.max(60, Math.min(SESSION_MAX_SECONDS, tokenLifetime - 60))
    : SESSION_MAX_SECONDS;
  const session = await encryptSession({
    githubToken: tokenPayload.access_token,
    login: user.login,
    exp: now + expiresIn,
  }, env.ARTWORK_SESSION_SECRET);

  const returnTo = new URL(validateReturnTo(state.returnTo, env));
  returnTo.hash = `artwork-auth=${encodeURIComponent(session)}`;
  return Response.redirect(returnTo.toString(), 302);
}

async function ensureAuthorBranch(token, cfg) {
  const branchPath = `/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.authorBranch)}`;
  try {
    return await github(branchPath, token);
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const base = await github(`/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.defaultBranch)}`, token);
  return github(`/repos/${cfg.owner}/${cfg.repo}/git/refs`, token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${cfg.authorBranch}`, sha: base.object.sha }),
  });
}

async function getAuthorityFile(token, cfg) {
  await ensureAuthorBranch(token, cfg);
  return github(
    `/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.authorityPath}?ref=${encodeURIComponent(cfg.authorBranch)}`,
    token,
  );
}

async function ensurePullRequest(token, cfg) {
  const query = new URLSearchParams({
    state: 'open',
    head: `${cfg.owner}:${cfg.authorBranch}`,
    base: cfg.defaultBranch,
    per_page: '10',
  });
  const existing = await github(`/repos/${cfg.owner}/${cfg.repo}/pulls?${query}`, token);
  if (existing?.length) return existing[0];
  return github(`/repos/${cfg.owner}/${cfg.repo}/pulls`, token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Update canonical artwork compositions',
      head: cfg.authorBranch,
      base: cfg.defaultBranch,
      body: 'Canonical artwork-composition updates saved from the public `/card-design/` compositor.\n\nArtwork direction is stored directly in `game-data/current-game.json.artDirection`, the complete current gameplay authority.',
    }),
  });
}

async function handleSession(request, env) {
  requireAllowedOrigin(request, env);
  const session = await authenticatedSession(request, env);
  return json({
    authenticated: true,
    login: session.login,
    expiresAt: new Date(Number(session.exp) * 1000).toISOString(),
    branch: config(env).authorBranch,
  }, 200, corsHeaders(request, env));
}

async function handleArtDirection(request, env) {
  requireAllowedOrigin(request, env);
  const session = await authenticatedSession(request, env);
  const cfg = config(env);

  if (request.method === 'GET') {
    const file = await getAuthorityFile(session.githubToken, cfg);
    const authority = JSON.parse(decodeGitHubContent(file));
    return json({
      directions: authority?.artDirection && typeof authority.artDirection === 'object' ? authority.artDirection : {},
      branch: cfg.authorBranch,
    }, 200, corsHeaders(request, env));
  }

  const payload = await request.json();
  const file = await getAuthorityFile(session.githubToken, cfg);
  const currentSource = decodeGitHubContent(file);
  const authority = JSON.parse(currentSource);
  if (authority?.schemaVersion !== 2 || authority?.authority !== 'current-game') {
    throw new Error('Artwork authoring requires the complete current-game authority.');
  }
  const before = authority.artDirection && typeof authority.artDirection === 'object' ? authority.artDirection : {};
  const after = updateArtDirectionMap(before, payload?.id, payload?.direction);
  const id = String(payload?.id || '');
  const nextAuthority = { ...authority, artDirection: after };
  const nextSource = `${JSON.stringify(nextAuthority, null, 2)}\n`;

  if (nextSource !== currentSource) {
    await github(`/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.authorityPath}`, session.githubToken, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: `Adjust artwork composition for ${id}`,
        content: encodeGitHubContent(nextSource),
        sha: file.sha,
        branch: cfg.authorBranch,
      }),
    });
  }

  const pr = await ensurePullRequest(session.githubToken, cfg);
  return json({
    saved: true,
    id,
    direction: after[id] || null,
    file: cfg.authorityPath,
    branch: cfg.authorBranch,
    pr: pr ? { number: pr.number, url: pr.html_url } : null,
  }, 200, corsHeaders(request, env));
}

function health(env) {
  const cfg = config(env);
  return json({
    ok: true,
    service: 'gauntlet-artwork-authoring',
    repository: `${cfg.owner}/${cfg.repo}`,
    authorBranch: cfg.authorBranch,
    configured: Boolean(env.ARTWORK_GITHUB_CLIENT_ID && env.ARTWORK_GITHUB_CLIENT_SECRET && env.ARTWORK_SESSION_SECRET),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      try {
        requireAllowedOrigin(request, env);
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      } catch (error) {
        return json({ error: error.message }, error.status || 403, corsHeaders(request, env));
      }
    }

    try {
      if (url.pathname === '/health' && request.method === 'GET') return health(env);
      if (url.pathname === '/auth/login' && request.method === 'GET') return handleLogin(request, env);
      if (url.pathname === '/auth/callback' && request.method === 'GET') return handleCallback(request, env);
      if (url.pathname === '/api/session' && request.method === 'GET') return handleSession(request, env);
      if (url.pathname === '/api/art-direction' && (request.method === 'GET' || request.method === 'POST')) {
        return handleArtDirection(request, env);
      }
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error(error);
      const headers = url.pathname.startsWith('/api/') ? corsHeaders(request, env) : {};
      return json({ error: error instanceof Error ? error.message : String(error) }, error?.status || 500, headers);
    }
  },
};

export const __test = {
  base64UrlEncode,
  base64UrlDecode,
  signState,
  verifyState,
  encryptSession,
  decryptSession,
  validateReturnTo,
};
