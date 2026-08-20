import baseWorker, { __test } from './index.js';

const API_VERSION = '2022-11-28';
const SAVE_PATH = '/api/art-direction';
const PUBLISH_PATH = '/api/art-direction/publish';

function config(env) {
  const [owner, repo] = String(env.GITHUB_REPOSITORY || 'tymonius/Gauntlet').split('/');
  return {
    owner,
    repo,
    allowedOrigins: new Set(String(env.ALLOWED_ORIGINS || env.PUBLIC_SITE_ORIGIN || 'https://gauntlet.run')
      .split(',').map(value => value.trim()).filter(Boolean)),
    allowedLogin: String(env.GITHUB_ALLOWED_LOGIN || 'tymonius').toLowerCase(),
    defaultBranch: String(env.GITHUB_DEFAULT_BRANCH || 'main'),
    authorBranch: String(env.GITHUB_AUTHOR_BRANCH || 'artwork/compositor-authoring'),
  };
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || !config(env).allowedOrigins.has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

function requireAllowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || !config(env).allowedOrigins.has(origin)) {
    throw Object.assign(new Error('Origin is not allowed.'), { status: 403 });
  }
}

function responseWithCors(response, request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders(request, env))) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function authenticatedSession(request, env) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('GitHub authoring sign-in required.'), { status: 401 });
  const session = await __test.decryptSession(match[1], env.ARTWORK_SESSION_SECRET);
  if (String(session.login).toLowerCase() !== config(env).allowedLogin) {
    throw Object.assign(new Error('This GitHub account is not authorized for Gauntlet artwork authoring.'), { status: 403 });
  }
  return session;
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

async function findOpenPullRequest(token, cfg) {
  const query = new URLSearchParams({
    state: 'open',
    head: `${cfg.owner}:${cfg.authorBranch}`,
    base: cfg.defaultBranch,
    per_page: '10',
  });
  const pulls = await github(`/repos/${cfg.owner}/${cfg.repo}/pulls?${query}`, token);
  return pulls?.[0] || null;
}

function publicPull(pr) {
  if (!pr) return null;
  return {
    number: pr.number,
    url: pr.html_url,
    headSha: pr.head?.sha || null,
  };
}

async function handleHealth(request, env) {
  const baseResponse = await baseWorker.fetch(request, env);
  let baseHealth = {};
  try {
    baseHealth = await baseResponse.json();
  } catch {
    baseHealth = {};
  }
  return json({
    ...baseHealth,
    batchPublishing: true,
    apiCors: true,
    saveEndpoint: SAVE_PATH,
    publishEndpoint: PUBLISH_PATH,
    authorBranch: config(env).authorBranch,
  }, baseResponse.status || 200, request, env);
}

async function handleBatchStatus(request, env) {
  requireAllowedOrigin(request, env);
  const session = await authenticatedSession(request, env);
  const pr = await findOpenPullRequest(session.githubToken, config(env));
  return json({ open: Boolean(pr), pr: publicPull(pr) }, 200, request, env);
}

async function handlePublish(request, env) {
  requireAllowedOrigin(request, env);
  const session = await authenticatedSession(request, env);
  const cfg = config(env);
  const payload = await request.json().catch(() => ({}));
  const pr = await findOpenPullRequest(session.githubToken, cfg);

  if (!pr) {
    return json({ error: 'There is no open artwork composition batch to publish.' }, 409, request, env);
  }
  if (payload.prNumber && Number(payload.prNumber) !== Number(pr.number)) {
    return json({ error: `The active artwork batch is PR #${pr.number}, not PR #${payload.prNumber}. Refresh the page and try again.` }, 409, request, env);
  }

  const merge = await github(`/repos/${cfg.owner}/${cfg.repo}/pulls/${pr.number}/merge`, session.githubToken, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sha: pr.head?.sha || undefined,
      commit_title: `Publish artwork composition batch (#${pr.number})`,
    }),
  });

  if (!merge?.merged || !merge.sha) {
    return json({ error: merge?.message || `GitHub did not merge PR #${pr.number}.` }, 409, request, env);
  }

  let branchReset = true;
  let warning = null;
  try {
    const encodedRef = `heads/${cfg.authorBranch}`.split('/').map(encodeURIComponent).join('/');
    await github(`/repos/${cfg.owner}/${cfg.repo}/git/refs/${encodedRef}`, session.githubToken, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sha: merge.sha, force: true }),
    });
  } catch (error) {
    branchReset = false;
    warning = `The batch was published, but the authoring branch could not be reset automatically: ${error.message}`;
  }

  return json({
    published: true,
    pr: publicPull(pr),
    merge: {
      sha: merge.sha,
      url: `https://github.com/${cfg.owner}/${cfg.repo}/commit/${merge.sha}`,
    },
    canonicalBranch: cfg.defaultBranch,
    branchReset,
    warning,
  }, 200, request, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      try {
        requireAllowedOrigin(request, env);
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      } catch (error) {
        return json({ error: error.message }, error.status || 403, request, env);
      }
    }

    try {
      if (url.pathname === '/health' && request.method === 'GET') return handleHealth(request, env);
      if (url.pathname === PUBLISH_PATH && request.method === 'GET') return handleBatchStatus(request, env);
      if (url.pathname === PUBLISH_PATH && request.method === 'POST') return handlePublish(request, env);
      const response = await baseWorker.fetch(request, env);
      return responseWithCors(response, request, env);
    } catch (error) {
      console.error(error);
      return json({ error: error instanceof Error ? error.message : String(error) }, error?.status || 500, request, env);
    }
  },
};
