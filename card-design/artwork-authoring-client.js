(() => {
  const PUBLIC_ORIGIN = 'https://gauntlet.run';
  const API_ORIGIN = 'https://gauntlet-artwork-authoring.tymon-scott.workers.dev';
  const SESSION_KEY = 'gauntlet.artwork-authoring-session.v1';
  const DRAFTS_KEY = 'gauntlet.art-direction-drafts.v1';
  const AUTH_MESSAGE = 'gauntlet-artwork-authoring-authenticated';
  const PUBLIC_SAVE_PATH = '/api/art-direction';
  const PUBLISH_PATH = '/api/art-direction/publish';
  const WORKING_BRANCH = 'artwork/compositor-authoring';
  const WORKING_FILE_API = `https://api.github.com/repos/tymonius/Gauntlet/contents/game-data/current-game.json?ref=${encodeURIComponent(WORKING_BRANCH)}`;
  const WORKING_PR_API = 'https://api.github.com/repos/tymonius/Gauntlet/pulls?state=open&head=tymonius%3Aartwork%2Fcompositor-authoring&base=main&per_page=1';
  const CANONICAL_FILE_URL = '/game-data/current-game.json';

  if (window.location.origin !== PUBLIC_ORIGIN) return;

  const publishStyle = document.createElement('style');
  publishStyle.textContent = `
    .art-compositor-publish-actions { display: block; margin-top: 9px; }
    .art-compositor-publish-batch {
      appearance: none;
      border: 1px solid #e4d3b7;
      border-radius: 8px;
      background: #e4d3b7;
      color: #251f19;
      cursor: pointer;
      font: 650 0.72rem/1.15 system-ui, sans-serif;
      padding: 8px 11px;
    }
    .art-compositor-publish-batch:hover { filter: brightness(1.05); }
    .art-compositor-publish-batch:disabled { cursor: wait; opacity: 0.65; }
  `;
  document.head.append(publishStyle);

  const nativeFetch = window.fetch.bind(window);
  let authenticationPromise = null;
  let hydrationPromise = null;
  let currentBatchPr = null;

  function consumeAuthFragment() {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = fragment.get('artwork-auth');
    if (!token) return false;

    sessionStorage.setItem(SESSION_KEY, token);
    history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}`);

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: AUTH_MESSAGE, token }, PUBLIC_ORIGIN);
      window.close();
    }
    return true;
  }

  function loginUrl() {
    const returnTo = `${PUBLIC_ORIGIN}/card-design/`;
    return `${API_ORIGIN}/auth/login?return_to=${encodeURIComponent(returnTo)}`;
  }

  function requestAuthentication() {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return Promise.resolve(existing);
    if (authenticationPromise) return authenticationPromise;

    const popup = window.open(
      loginUrl(),
      'gauntlet-artwork-authoring',
      'popup=yes,width=720,height=780,resizable=yes,scrollbars=yes',
    );
    if (!popup) {
      return Promise.reject(new Error('GitHub sign-in popup was blocked. Allow popups for gauntlet.run and try again.'));
    }

    authenticationPromise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('GitHub artwork-authoring sign-in timed out.'));
      }, 5 * 60 * 1000);
      const poll = window.setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error('GitHub artwork-authoring sign-in was closed before completion.'));
        }
      }, 400);

      function onMessage(event) {
        if (event.origin !== PUBLIC_ORIGIN || event.data?.type !== AUTH_MESSAGE || !event.data?.token) return;
        sessionStorage.setItem(SESSION_KEY, event.data.token);
        cleanup();
        resolve(event.data.token);
      }

      function cleanup() {
        window.clearTimeout(timeout);
        window.clearInterval(poll);
        window.removeEventListener('message', onMessage);
        authenticationPromise = null;
      }

      window.addEventListener('message', onMessage);
    });

    return authenticationPromise;
  }

  function publicSaveRequest(input, init) {
    if ((init?.method || 'GET').toUpperCase() !== 'POST') return false;
    let url;
    try { url = new URL(typeof input === 'string' ? input : input.url, window.location.href); }
    catch { return false; }
    return url.origin === PUBLIC_ORIGIN && url.pathname === PUBLIC_SAVE_PATH;
  }

  function announce(detail) {
    window.dispatchEvent(new CustomEvent('gauntlet-artwork-authoring-status', { detail }));
  }

  function readDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function installWorkingDirections(directions) {
    const next = directions && typeof directions === 'object' && !Array.isArray(directions) ? directions : {};
    const before = readDrafts();
    if (JSON.stringify(before) === JSON.stringify(next)) return false;
    if (Object.keys(next).length) localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
    else localStorage.removeItem(DRAFTS_KEY);
    window.dispatchEvent(new CustomEvent('gauntlet-art-direction-drafts-changed'));
    return true;
  }

  function directionEqual(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }

  function directionDelta(canonical, working) {
    const base = canonical && typeof canonical === 'object' ? canonical : {};
    const next = working && typeof working === 'object' ? working : {};
    const delta = {};
    for (const id of new Set([...Object.keys(base), ...Object.keys(next)])) {
      if (directionEqual(base[id], next[id])) continue;
      delta[id] = Object.prototype.hasOwnProperty.call(next, id) ? next[id] : null;
    }
    return delta;
  }

  function parseDirectionSource(source) {
    const authority = JSON.parse(String(source || '{}'));
    const directions = authority?.artDirection;
    return directions && typeof directions === 'object' ? directions : {};
  }

  function decodeGitHubContent(content) {
    const binary = atob(String(content || '').replace(/\s+/gu, ''));
    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
  }

  async function hydrateWorkingDirections({ reloadIfChanged = false } = {}) {
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      const prResponse = await nativeFetch(WORKING_PR_API, {
        headers: {
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
        },
        cache: 'no-store',
        mode: 'cors',
        credentials: 'omit',
      });
      if (!prResponse.ok) throw new Error(`Artwork batch status failed (${prResponse.status}).`);
      const openPrs = await prResponse.json().catch(() => []);
      const openPr = Array.isArray(openPrs) ? openPrs[0] : null;

      // A working branch with no open batch is not authoring state. Do not
      // hydrate it. During the migration audit, preserve any already-local
      // browser drafts so Card Design can visibly flag and recover them before
      // the obsolete fallback store is retired.
      if (!openPr?.number) {
        currentBatchPr = null;
        return false;
      }

      currentBatchPr = {
        number: openPr.number,
        url: openPr.html_url,
      };

      const [workingResponse, canonicalResponse] = await Promise.all([
        nativeFetch(WORKING_FILE_API, {
          method: 'GET',
          headers: {
            accept: 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
          },
          cache: 'no-store',
          mode: 'cors',
          credentials: 'omit',
        }),
        nativeFetch(CANONICAL_FILE_URL, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        }),
      ]);

      const workingPayload = await workingResponse.json().catch(() => ({}));
      if (!workingResponse.ok || !workingPayload.content) {
        throw new Error(workingPayload.message || `Artwork batch sync failed (${workingResponse.status}).`);
      }
      if (!canonicalResponse.ok) {
        throw new Error(`Canonical artwork authority sync failed (${canonicalResponse.status}).`);
      }

      const canonicalAuthority = await canonicalResponse.json();
      const canonicalDirections = canonicalAuthority?.artDirection && typeof canonicalAuthority.artDirection === 'object'
        ? canonicalAuthority.artDirection
        : {};
      const workingDirections = parseDirectionSource(decodeGitHubContent(workingPayload.content));
      const changed = installWorkingDirections(directionDelta(canonicalDirections, workingDirections));
      if (changed && reloadIfChanged) window.location.reload();
      return changed;
    })().finally(() => {
      hydrationPromise = null;
    });

    return hydrationPromise;
  }

  function installSavedDirection(payload) {
    if (!payload?.saved || !payload.id) return;
    const drafts = readDrafts();
    if (payload.direction && typeof payload.direction === 'object' && Object.keys(payload.direction).length) {
      drafts[payload.id] = payload.direction;
    } else {
      drafts[payload.id] = null;
    }
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    window.dispatchEvent(new CustomEvent('gauntlet-art-direction-drafts-changed'));
  }

  async function batchSave(input, init) {
    let token = sessionStorage.getItem(SESSION_KEY);
    if (!token) token = await requestAuthentication();

    if (hydrationPromise) await hydrationPromise;

    const headers = new Headers(init?.headers || {});
    headers.set('authorization', `Bearer ${token}`);
    headers.set('content-type', 'application/json');
    const response = await nativeFetch(`${API_ORIGIN}${PUBLIC_SAVE_PATH}`, {
      ...init,
      headers,
      mode: 'cors',
      credentials: 'omit',
    });

    if (response.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      announce({ kind: 'auth-expired' });
      throw new Error('GitHub authoring session expired. Click Save position again to sign in.');
    }

    const copy = response.clone();
    const payload = await copy.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Artwork batch save failed (${response.status}).`);
    }
    if (payload.saved) {
      installSavedDirection(payload);
      currentBatchPr = payload.pr || currentBatchPr;
      announce({ kind: 'saved', ...payload });
    }
    return response;
  }

  async function publishBatch(pr) {
    let token = sessionStorage.getItem(SESSION_KEY);
    if (!token) token = await requestAuthentication();

    const response = await nativeFetch(`${API_ORIGIN}${PUBLISH_PATH}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ prNumber: pr?.number || null }),
      mode: 'cors',
      credentials: 'omit',
    });

    if (response.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      announce({ kind: 'auth-expired' });
      throw new Error('GitHub authoring session expired. Click Publish batch again to sign in.');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.published) {
      throw new Error(payload.error || `Artwork batch publication failed (${response.status}).`);
    }

    currentBatchPr = null;
    localStorage.removeItem(DRAFTS_KEY);
    window.dispatchEvent(new CustomEvent('gauntlet-art-direction-drafts-changed'));
    announce({ kind: 'published', ...payload });
    return payload;
  }

  async function refreshBatchStatus() {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) return null;

    const response = await nativeFetch(`${API_ORIGIN}${PUBLISH_PATH}`, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
      mode: 'cors',
      credentials: 'omit',
    });

    if (response.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (!response.ok) return null;

    const payload = await response.json().catch(() => ({}));
    currentBatchPr = payload.open ? payload.pr : null;
    return currentBatchPr;
  }

  function renderBatchStatus(status, pr, lead = 'Saved to artwork composition batch ') {
    if (!status || !pr?.number || !pr?.url) return;
    status.textContent = '';
    status.append(lead);

    const link = document.createElement('a');
    link.href = pr.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `PR #${pr.number}`;
    status.append(link, '. Keep saving additional cards to this same batch.');

    const actions = document.createElement('span');
    actions.className = 'art-compositor-publish-actions';

    const publish = document.createElement('button');
    publish.type = 'button';
    publish.className = 'art-compositor-publish-batch';
    publish.textContent = 'Publish batch';
    publish.addEventListener('click', async () => {
      publish.disabled = true;
      publish.textContent = 'Publishing…';
      try {
        await publishBatch(pr);
      } catch (error) {
        announce({ kind: 'error', message: error instanceof Error ? error.message : String(error), pr });
      }
    });

    actions.append(publish);
    status.append(actions);
  }

  window.fetch = function gauntletArtworkAuthoringFetch(input, init) {
    if (!publicSaveRequest(input, init)) return nativeFetch(input, init);
    return batchSave(input, init).catch(error => {
      announce({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
      throw error;
    });
  };

  window.addEventListener('gauntlet-artwork-authoring-status', event => {
    window.setTimeout(() => {
      const status = document.querySelector('.art-compositor-save-status');
      if (!status) return;
      const detail = event.detail || {};

      if (detail.kind === 'saved' && detail.pr?.url) {
        renderBatchStatus(status, detail.pr);
      } else if (detail.kind === 'published' && detail.published) {
        status.textContent = '';
        status.append(`Published PR #${detail.pr?.number || ''} to main. All saved artwork positions in the batch are now canonical.`);
        if (detail.merge?.url) {
          status.append(' ');
          const link = document.createElement('a');
          link.href = detail.merge.url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = 'View merge commit';
          status.append(link, '.');
        }
        if (detail.warning) status.append(` ${detail.warning}`);
        status.append(' Reloading the canonical catalog…');
        window.setTimeout(() => window.location.reload(), 1400);
      } else if (detail.kind === 'auth-expired') {
        status.textContent = 'GitHub authoring session expired. Save or publish again to sign in.';
      } else if (detail.kind === 'error') {
        status.textContent = `${detail.message} The artwork batch has not been published.`;
        if (detail.pr) renderBatchStatus(status, detail.pr, `${detail.message} `);
      }
    }, 0);
  });

  document.addEventListener('click', event => {
    const opener = event.target instanceof Element
      ? event.target.closest('.art-compositor-launch')
      : null;
    if (!opener || !currentBatchPr) return;
    window.setTimeout(() => {
      const status = document.querySelector('.art-compositor-save-status');
      if (status) renderBatchStatus(status, currentBatchPr, 'Current artwork composition batch ');
    }, 0);
  }, true);

  consumeAuthFragment();

  // Only an open artwork batch may populate browser draft state. The working
  // branch by itself is never authoritative. Existing browser drafts are left
  // intact temporarily so the divergence audit can expose any unpublished
  // compositions before that legacy storage is retired.
  hydrateWorkingDirections({ reloadIfChanged: true }).catch(error => {
    announce({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
  });

  refreshBatchStatus().catch(() => {});
})();
