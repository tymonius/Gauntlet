import worker from './index-publish.js';
import { __test } from './index.js';

const API_VERSION = '2022-11-28';
const SAVE_PATH = '/api/art-direction';

function config(env) {
  const [owner, repo] = String(env.GITHUB_REPOSITORY || 'tymonius/Gauntlet').split('/');
  return {
    owner,
    repo,
    defaultBranch: String(env.GITHUB_DEFAULT_BRANCH || 'main'),
    authorBranch: String(env.GITHUB_AUTHOR_BRANCH || 'artwork/compositor-authoring'),
    authorityPath: String(env.GITHUB_AUTHORITY_PATH || 'game-data/current-game.json'),
  };
}

function requestPath(request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return '';
  }
}

function isArtworkApi(request) {
  return requestPath(request).startsWith('/api/');
}

function isArtworkSave(request) {
  return request.method === 'POST' && requestPath(request) === SAVE_PATH;
}

function canSyncIdleBranch(comparison) {
  return Number(comparison?.ahead_by) > 0 && Number(comparison?.behind_by) === 0;
}

function isNoOpValidation(status, message, branchesEqual) {
  return Number(status) === 422
    && String(message || '').toLowerCase() === 'validation failed'
    && branchesEqual === true;
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

async function sessionFromRequest(request, env) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    return await __test.decryptSession(match[1], env.ARTWORK_SESSION_SECRET);
  } catch {
    return null;
  }
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

async function branchRefs(token, cfg) {
  const [canonical, authoring] = await Promise.all([
    github(`/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.defaultBranch)}`, token),
    github(`/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.authorBranch)}`, token),
  ]);
  return {
    canonicalSha: canonical?.object?.sha || null,
    authoringSha: authoring?.object?.sha || null,
  };
}

async function syncIdleAuthoringBranch(request, env) {
  if (!isArtworkSave(request)) return null;
  const session = await sessionFromRequest(request, env);
  if (!session?.githubToken) return null;

  const cfg = config(env);
  const openPr = await findOpenPullRequest(session.githubToken, cfg);
  if (openPr) return { session, cfg, openPr };

  const refs = await branchRefs(session.githubToken, cfg);
  if (!refs.canonicalSha || !refs.authoringSha || refs.canonicalSha === refs.authoringSha) {
    return { session, cfg, openPr: null };
  }

  // Only fast-forward/reset an idle authoring branch when it is strictly an
  // ancestor of main. If it has unpublished commits of its own, leave it alone.
  const comparison = await github(
    `/repos/${cfg.owner}/${cfg.repo}/compare/${encodeURIComponent(cfg.authorBranch)}...${encodeURIComponent(cfg.defaultBranch)}`,
    session.githubToken,
  );
  if (canSyncIdleBranch(comparison)) {
    const encodedRef = `heads/${cfg.authorBranch}`.split('/').map(encodeURIComponent).join('/');
    await github(`/repos/${cfg.owner}/${cfg.repo}/git/refs/${encodedRef}`, session.githubToken, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sha: refs.canonicalSha, force: true }),
    });
  }

  return { session, cfg, openPr: null };
}

async function branchesMatch(token, cfg) {
  const refs = await branchRefs(token, cfg);
  return Boolean(refs.canonicalSha && refs.canonicalSha === refs.authoringSha);
}

async function normalizeNoOpValidation(response, request, env, context, savePayload) {
  if (response.status !== 422 || !context?.session?.githubToken || !isArtworkSave(request)) return response;

  const copy = response.clone();
  const payload = await copy.json().catch(() => null);
  const equalBranches = await branchesMatch(context.session.githubToken, context.cfg);
  if (!isNoOpValidation(response.status, payload?.error, equalBranches)) return response;

  // GitHub rejects creation of a PR when the authoring branch has no commits
  // beyond main. That is a valid no-op save, not an authoring failure.
  const direction = savePayload?.direction && typeof savePayload.direction === 'object'
    && Object.keys(savePayload.direction).length
    ? savePayload.direction
    : null;
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify({
    saved: true,
    unchanged: true,
    id: String(savePayload?.id || ''),
    direction,
    file: context.cfg.authorityPath,
    branch: context.cfg.authorBranch,
    pr: null,
  }), {
    status: 200,
    headers,
  });
}

async function normalizeExpiredSession(response) {
  if (response.status !== 500) return response;

  const copy = response.clone();
  const payload = await copy.json().catch(() => null);
  const message = String(payload?.error || '');
  if (!/authoring session (?:expired|invalid)/i.test(message)) return response;

  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const savePayloadPromise = isArtworkSave(request)
      ? request.clone().json().catch(() => null)
      : Promise.resolve(null);

    let saveContext = null;
    if (isArtworkSave(request)) {
      try {
        saveContext = await syncIdleAuthoringBranch(request, env);
      } catch {
        // Let the established Worker path return the actionable API error.
      }
    }

    let response = await worker.fetch(request, env);
    if (!isArtworkApi(request)) return response;

    response = await normalizeNoOpValidation(
      response,
      request,
      env,
      saveContext,
      await savePayloadPromise,
    );
    return normalizeExpiredSession(response);
  },
};

export const __sessionTest = {
  canSyncIdleBranch,
  isNoOpValidation,
};
