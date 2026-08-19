(() => {
  const PUBLIC_ORIGIN = 'https://gauntlet.run';
  const API_ORIGIN = 'https://gauntlet-artwork-authoring.tymon-scott.workers.dev';
  const SESSION_KEY = 'gauntlet.artwork-authoring-session.v1';
  const DRAFTS_KEY = 'gauntlet.art-direction-drafts.v1';
  const AUTH_MESSAGE = 'gauntlet-artwork-authoring-authenticated';
  const PUBLIC_SAVE_PATH = '/api/art-direction';

  if (window.location.origin !== PUBLIC_ORIGIN) return;

  const nativeFetch = window.fetch.bind(window);
  let authenticationPromise = null;

  // Online authoring now writes the canonical source on main. Do not let an old
  // browser-only draft silently override that source when the catalog loads.
  localStorage.removeItem(DRAFTS_KEY);

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

  async function canonicalSave(input, init) {
    let token = sessionStorage.getItem(SESSION_KEY);
    if (!token) token = await requestAuthentication();

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
      throw new Error(payload.error || `Canonical artwork save failed (${response.status}).`);
    }
    if (payload.saved) announce({ kind: 'saved', ...payload });
    return response;
  }

  window.fetch = function gauntletArtworkAuthoringFetch(input, init) {
    if (!publicSaveRequest(input, init)) return nativeFetch(input, init);
    return canonicalSave(input, init).catch(error => {
      announce({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
      throw error;
    });
  };

  window.addEventListener('gauntlet-artwork-authoring-status', event => {
    window.setTimeout(() => {
      const status = document.querySelector('.art-compositor-save-status');
      if (!status) return;
      const detail = event.detail || {};
      if (detail.kind === 'saved' && detail.canonical) {
        status.textContent = '';
        status.append('Saved canonically to main. ');
        if (detail.commit?.url) {
          const link = document.createElement('a');
          link.href = detail.commit.url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = 'View commit';
          status.append(link, '. ');
        }
        status.append('Card Reference and other shared renderers will use this composition after the site publication build completes.');
      } else if (detail.kind === 'auth-expired') {
        status.textContent = 'GitHub authoring session expired. Click Save position again to sign in.';
      } else if (detail.kind === 'error') {
        status.textContent = `${detail.message} The displayed crop has not become canonical.`;
      }
    }, 0);
  });

  consumeAuthFragment();
})();
