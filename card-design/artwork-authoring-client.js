(() => {
  const PUBLIC_ORIGIN = 'https://gauntlet.run';
  const API_ORIGIN = 'https://gauntlet-artwork-authoring.tymon-scott.workers.dev';
  const SESSION_KEY = 'gauntlet.artwork-authoring-session.v1';
  const DRAFTS_KEY = 'gauntlet.art-direction-drafts.v1';
  const AUTH_MESSAGE = 'gauntlet-artwork-authoring-authenticated';
  const PUBLIC_SAVE_PATH = '/api/art-direction';
  const WORKING_BRANCH = 'artwork/compositor-authoring';
  const WORKING_FILE_API = `https://api.github.com/repos/tymonius/Gauntlet/contents/tts/artwork-direction-overrides.js?ref=${encodeURIComponent(WORKING_BRANCH)}`;

  if (window.location.origin !== PUBLIC_ORIGIN) return;

  const nativeFetch = window.fetch.bind(window);
  let authenticationPromise = null;
  let hydrationPromise = null;

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
      return Promise.reject(new Error('GitHub sign-in popup was blocked. Allow popups for gauntlet.run and click Save position again.'));
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
    const next = directions && typeof directions === 'object' ? directions : {};
    const before = readDrafts();
    if (JSON.stringify(before) === JSON.stringify(next)) return false;
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
    return true;
  }

  function numberField(body, name) {
    const match = body.match(new RegExp(`(?:^|[,\\s{])["']?${name}["']?\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'u'));
    return match ? Number(match[1]) : undefined;
  }

  function parseDirectionBody(body) {
    const direction = {};
    const focus = body.match(/(?:^|[,\s{])["']?focus["']?\s*:\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/u);
    if (focus) direction.focus = [Number(focus[1]), Number(focus[2])];
    for (const key of ['focusX', 'focusY', 'zoom']) {
      const value = numberField(body, key);
      if (value !== undefined) direction[key] = value;
    }
    const fit = body.match(/(?:^|[,\s{])["']?fit["']?\s*:\s*["'](cover|contain)["']/u);
    if (fit) direction.fit = fit[1];
    return direction;
  }

  function parseDirectionSource(source) {
    const directions = {};
    const entry = /^\s*"((?:\\.|[^"\\])+)"\s*:\s*(\{[^\n]*\})\s*,?\s*$/gmu;
    for (const match of String(source || '').matchAll(entry)) {
      const id = JSON.parse(`"${match[1]}"`);
      directions[id] = parseDirectionBody(match[2]);
    }
    return directions;
  }

  function decodeGitHubContent(content) {
    const binary = atob(String(content || '').replace(/\s+/gu, ''));
    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
  }

  async function hydrateWorkingDirections({ reloadIfChanged = false } = {}) {
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      const response = await nativeFetch(WORKING_FILE_API, {
        method: 'GET',
        headers: {
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
        },
        cache: 'no-store',
        mode: 'cors',
        credentials: 'omit',
      });

      if (response.status === 404) return false;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.content) {
        throw new Error(payload.message || `Artwork batch sync failed (${response.status}).`);
      }

      const directions = parseDirectionSource(decodeGitHubContent(payload.content));
      const changed = installWorkingDirections(directions);
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
      delete drafts[payload.id];
    }
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
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
      announce({ kind: 'saved', ...payload });
    }
    return response;
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
        status.textContent = '';
        status.append('Saved to artwork composition batch ');
        const link = document.createElement('a');
        link.href = detail.pr.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = `PR #${detail.pr.number}`;
        status.append(link, '. Continue editing; merge the PR once when the batch is ready to make all saved positions canonical.');
      } else if (detail.kind === 'auth-expired') {
        status.textContent = 'GitHub authoring session expired. Click Save position again to sign in.';
      } else if (detail.kind === 'error') {
        status.textContent = `${detail.message} The current crop remains saved as a browser draft.`;
      }
    }, 0);
  });

  consumeAuthFragment();

  // Show the current in-progress batch on every catalog load. It becomes
  // canonical for Card Reference, Deckbuilder, print, and other shared
  // renderers only when the batch PR is merged into main.
  hydrateWorkingDirections({ reloadIfChanged: true }).catch(error => {
    announce({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
  });
})();
