(() => {
  const API_ORIGIN = 'https://gauntlet-artwork-authoring.tymon-scott.workers.dev';
  const PUBLISH_PATH = '/api/art-direction/publish';
  const PR_API_PREFIX = 'https://api.github.com/repos/tymonius/Gauntlet/pulls/';
  const RETRY_DELAYS_MS = [500, 1500, 3000, 5000, 8000];
  const RECOVERY_DELAYS_MS = [0, 750, 1500, 3000, 5000];
  const nativeFetch = window.fetch.bind(window);

  function sleep(ms) {
    return ms > 0 ? new Promise(resolve => window.setTimeout(resolve, ms)) : Promise.resolve();
  }

  function requestUrl(input) {
    try {
      return new URL(typeof input === 'string' ? input : input.url, window.location.href);
    } catch {
      return null;
    }
  }

  function isPublishPost(input, init) {
    const url = requestUrl(input);
    return Boolean(
      url
        && url.origin === API_ORIGIN
        && url.pathname === PUBLISH_PATH
        && String(init?.method || 'GET').toUpperCase() === 'POST',
    );
  }

  function prNumberFromBody(init) {
    try {
      const payload = JSON.parse(String(init?.body || '{}'));
      const number = Number(payload?.prNumber);
      return Number.isInteger(number) && number > 0 ? number : null;
    } catch {
      return null;
    }
  }

  async function publicPr(prNumber) {
    const response = await nativeFetch(`${PR_API_PREFIX}${prNumber}`, {
      method: 'GET',
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!response.ok) return null;
    return response.json().catch(() => null);
  }

  function recoveredSuccess(pr) {
    const sha = pr?.merge_commit_sha || null;
    return new Response(JSON.stringify({
      published: true,
      recovered: true,
      pr: {
        number: pr.number,
        url: pr.html_url,
        headSha: pr.head?.sha || null,
      },
      merge: sha ? {
        sha,
        url: `https://github.com/tymonius/Gauntlet/commit/${sha}`,
      } : null,
      canonicalBranch: 'main',
      branchReset: false,
      warning: 'The publish response was interrupted, but GitHub confirms the artwork batch was merged. The authoring branch will be synchronized before the next batch.',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  async function recoverPublishedPr(prNumber) {
    if (!prNumber) return null;
    for (const delay of RECOVERY_DELAYS_MS) {
      await sleep(delay);
      try {
        const pr = await publicPr(prNumber);
        if (pr?.merged === true || pr?.merged_at) return recoveredSuccess(pr);
        if (pr?.state === 'open' && delay === RECOVERY_DELAYS_MS.at(-1)) return null;
      } catch {
        // Keep checking. This recovery path must never replace the normal error
        // unless GitHub itself confirms that publication actually completed.
      }
    }
    return null;
  }

  async function publishWithRecovery(input, init) {
    const prNumber = prNumberFromBody(init);
    let lastPr = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await nativeFetch(input, init);
      } catch {
        if (prNumber) {
          try {
            lastPr = await publicPr(prNumber);
            if (lastPr?.merged === true || lastPr?.merged_at) return recoveredSuccess(lastPr);
          } catch {
            // The public GitHub status check is advisory. Keep retrying the
            // authenticated publish request even when GitHub's public API is
            // temporarily unavailable.
          }
        }
        if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }

    const recovered = await recoverPublishedPr(prNumber);
    if (recovered) return recovered;

    if (prNumber) {
      try { lastPr = await publicPr(prNumber) || lastPr; }
      catch { /* Keep the transport error as the primary failure. */ }
    }

    if (lastPr?.state === 'closed') {
      throw new Error(`Artwork batch PR #${prNumber} closed without being merged. Refresh the catalog before saving more positions.`);
    }

    const mergeState = lastPr?.mergeable_state && lastPr.mergeable_state !== 'unknown'
      ? ` (GitHub merge state: ${lastPr.mergeable_state})`
      : '';
    const suffix = prNumber ? ` PR #${prNumber} is still open${mergeState}.` : '';
    throw new Error(`The publish request lost its connection before completion after repeated retries.${suffix} Click Publish batch again.`);
  }

  window.fetch = function gauntletArtworkPublishRecovery(input, init) {
    if (!isPublishPost(input, init)) return nativeFetch(input, init);
    return publishWithRecovery(input, init);
  };
})();
