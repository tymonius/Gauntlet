import worker from './index-session.js';
import { __test } from './index.js';

const API_VERSION = '2022-11-28';
const PUBLISH_PATH = '/api/art-direction/publish';
const DEFAULT_BRANCH = 'main';
const AUTHOR_BRANCH = 'artwork/compositor-authoring';
const READY_DELAYS_MS = [0, 350, 700, 1000, 1500, 2000];

function config(env) {
  const [owner, repo] = String(env.GITHUB_REPOSITORY || 'tymonius/Gauntlet').split('/');
  return {
    owner,
    repo,
    defaultBranch: String(env.GITHUB_DEFAULT_BRANCH || DEFAULT_BRANCH),
    authorBranch: String(env.GITHUB_AUTHOR_BRANCH || AUTHOR_BRANCH),
  };
}

function requestPath(request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return '';
  }
}

function isPublishPost(request) {
  return request.method === 'POST' && requestPath(request) === PUBLISH_PATH;
}

function mergeabilityPending(pr) {
  const state = String(pr?.mergeable_state || '').toLowerCase();
  return Boolean(
    pr
      && pr.state === 'open'
      && (
        pr.mergeable === null
        || pr.mergeable === undefined
        || state === 'unknown'
        || state === 'unstable'
      ),
  );
}

function sleep(ms) {
  return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
}

async function github(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': API_VERSION,
      'user-agent': 'gauntlet-artwork-authoring',
    },
  });
  if (!response.ok) throw new Error(`GitHub readiness check failed (${response.status}).`);
  return response.json();
}

async function sessionFromRequest(request, env) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    return await __test.decryptSession(match[1], env.ARTWORK_SESSION_SECRET);
  } catch {
    return null;
  }
}

async function requestedPrNumber(request) {
  try {
    const payload = await request.clone().json();
    const value = Number(payload?.prNumber);
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

async function waitForGitHubMergeability(request, env) {
  if (!isPublishPost(request)) return;

  const [session, prNumber] = await Promise.all([
    sessionFromRequest(request, env),
    requestedPrNumber(request),
  ]);
  if (!session?.githubToken || !prNumber) return;

  const cfg = config(env);
  for (const delay of READY_DELAYS_MS) {
    await sleep(delay);
    const pr = await github(`/repos/${cfg.owner}/${cfg.repo}/pulls/${prNumber}`, session.githubToken);

    // Only wait for the exact composition batch this Worker owns. Any other PR
    // is delegated immediately to the established publish handler, which will
    // return the normal actionable validation error.
    if (
      pr?.head?.ref !== cfg.authorBranch
      || pr?.base?.ref !== cfg.defaultBranch
      || pr?.state !== 'open'
    ) return;

    if (!mergeabilityPending(pr)) return;
  }
}

export default {
  async fetch(request, env) {
    if (isPublishPost(request)) {
      try {
        // GitHub recalculates mergeability and status checks asynchronously after each compositor
        // save. A publish click can arrive during that short window, especially
        // immediately after the last Save position. Wait briefly before asking
        // the existing Worker to perform the merge.
        await waitForGitHubMergeability(request, env);
      } catch {
        // Readiness is advisory. Delegate to the established publish route so it
        // can return GitHub's authoritative merge result rather than failing here.
      }
    }
    return worker.fetch(request, env);
  },
};

export const __testReady = {
  mergeabilityPending,
};
