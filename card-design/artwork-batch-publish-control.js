(() => {
  const PUBLIC_ORIGIN = 'https://gauntlet.run';
  const API_ORIGIN = 'https://gauntlet-artwork-authoring.tymon-scott.workers.dev';
  const SESSION_KEY = 'gauntlet.artwork-authoring-session.v1';
  const AUTH_MESSAGE = 'gauntlet-artwork-authoring-authenticated';
  const PUBLISH_PATH = '/api/art-direction/publish';
  const PUBLIC_PR_API = 'https://api.github.com/repos/tymonius/Gauntlet/pulls?state=open&head=tymonius%3Aartwork%2Fcompositor-authoring&base=main&per_page=1';

  if (window.location.origin !== PUBLIC_ORIGIN) return;

  const style = document.createElement('style');
  style.textContent = `
    /* The legacy client briefly renders its publish action inside the mutable
       save-status line. Keep that transient copy hidden; publication belongs to
       the persistent batch panel below the compositor actions. */
    .art-compositor-save-status .art-compositor-publish-actions {
      display: none !important;
    }

    .art-compositor-batch-panel {
      display: none;
      margin-top: 12px;
      padding: 12px;
      border: 1px solid rgb(255 255 255 / 0.13);
      border-radius: 10px;
      background: #181512;
      color: #d9cdbd;
      font: 500 0.72rem/1.35 system-ui, sans-serif;
    }

    .art-compositor-batch-panel[data-open="true"] {
      display: grid;
      gap: 9px;
    }

    .art-compositor-batch-copy {
      margin: 0;
    }

    .art-compositor-batch-copy a {
      color: #f1d39b;
    }

    .art-compositor-batch-publish {
      appearance: none;
      width: 100%;
      border: 1px solid #e4d3b7;
      border-radius: 8px;
      background: #e4d3b7;
      color: #251f19;
      cursor: pointer;
      font: 700 0.76rem/1.15 system-ui, sans-serif;
      padding: 10px 12px;
    }

    .art-compositor-batch-publish:hover { filter: brightness(1.05); }
    .art-compositor-batch-publish:disabled { cursor: wait; opacity: 0.65; }
  `;
  document.head.append(style);

  let currentPr = null;
  let authenticationPromise = null;
  let publishing = false;

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
      return Promise.reject(new Error('GitHub sign-in popup was blocked. Allow popups for gauntlet.run and click Publish batch again.'));
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

  function ensurePanel() {
    const controls = document.querySelector('.art-compositor-dialog .art-compositor-controls');
    if (!controls) return null;

    let panel = controls.querySelector(':scope > .art-compositor-batch-panel');
    if (panel) return panel;

    panel = document.createElement('section');
    panel.className = 'art-compositor-batch-panel';
    panel.setAttribute('aria-label', 'Artwork composition batch');

    const copy = document.createElement('p');
    copy.className = 'art-compositor-batch-copy';

    const publish = document.createElement('button');
    publish.type = 'button';
    publish.className = 'art-compositor-batch-publish';
    publish.textContent = 'Publish batch';
    publish.addEventListener('click', publishCurrentBatch);

    panel.append(copy, publish);

    const status = controls.querySelector('.art-compositor-save-status');
    if (status) controls.insertBefore(panel, status);
    else controls.append(panel);

    return panel;
  }

  function renderPanel() {
    const panel = ensurePanel();
    if (!panel) return;

    const copy = panel.querySelector('.art-compositor-batch-copy');
    const publish = panel.querySelector('.art-compositor-batch-publish');

    if (!currentPr?.number || !currentPr?.url) {
      panel.dataset.open = 'false';
      copy.textContent = '';
      publish.disabled = false;
      publish.textContent = 'Publish batch';
      return;
    }

    panel.dataset.open = 'true';
    copy.textContent = 'Open artwork batch: ';
    const link = document.createElement('a');
    link.href = currentPr.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `PR #${currentPr.number}`;
    copy.append(link, '. Keep saving positions, then publish the whole batch when ready.');

    publish.disabled = publishing;
    publish.textContent = publishing ? 'Publishing…' : 'Publish batch';
  }

  function setStatus(message) {
    const status = document.querySelector('.art-compositor-dialog .art-compositor-save-status');
    if (status) status.textContent = message;
  }

  async function discoverOpenBatch() {
    try {
      const response = await fetch(PUBLIC_PR_API, {
        headers: {
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
        },
        cache: 'no-store',
        credentials: 'omit',
      });
      if (!response.ok) return null;
      const pulls = await response.json().catch(() => []);
      const pr = Array.isArray(pulls) ? pulls[0] : null;
      currentPr = pr ? {
        number: pr.number,
        url: pr.html_url,
        headSha: pr.head?.sha || null,
      } : null;
      renderPanel();
      return currentPr;
    } catch {
      return null;
    }
  }

  async function publishCurrentBatch() {
    if (!currentPr?.number || publishing) return;

    publishing = true;
    renderPanel();
    setStatus(`Publishing artwork batch PR #${currentPr.number}…`);

    try {
      let token = sessionStorage.getItem(SESSION_KEY);
      if (!token) token = await requestAuthentication();

      const response = await fetch(`${API_ORIGIN}${PUBLISH_PATH}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ prNumber: currentPr.number }),
        mode: 'cors',
        credentials: 'omit',
      });

      if (response.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        throw new Error('GitHub authoring session expired. Click Publish batch again to sign in.');
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.published) {
        throw new Error(payload.error || `Artwork batch publication failed (${response.status}).`);
      }

      const publishedNumber = currentPr.number;
      currentPr = null;
      localStorage.removeItem('gauntlet.art-direction-drafts.v1');
      renderPanel();

      const status = document.querySelector('.art-compositor-dialog .art-compositor-save-status');
      if (status) {
        status.textContent = `Published PR #${publishedNumber} to main. All saved artwork positions in the batch are now canonical.`;
        if (payload.merge?.url) {
          status.append(' ');
          const link = document.createElement('a');
          link.href = payload.merge.url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = 'View merge commit';
          status.append(link, '.');
        }
        if (payload.warning) status.append(` ${payload.warning}`);
        status.append(' Reloading the canonical catalog…');
      }

      window.setTimeout(() => window.location.reload(), 1400);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      publishing = false;
      renderPanel();
    }
  }

  window.addEventListener('gauntlet-artwork-authoring-status', event => {
    const detail = event.detail || {};
    if (detail.kind === 'saved' && detail.pr?.number && detail.pr?.url) {
      currentPr = detail.pr;
      requestAnimationFrame(renderPanel);
    } else if (detail.kind === 'published') {
      currentPr = null;
      requestAnimationFrame(renderPanel);
    }
  });

  document.addEventListener('click', event => {
    const opener = event.target instanceof Element
      ? event.target.closest('.art-compositor-launch')
      : null;
    if (!opener) return;
    window.setTimeout(renderPanel, 0);
  }, true);

  // Only respond when the compositor dialog itself is inserted. The previous
  // observer rerendered for every child mutation inside the dialog, including
  // mutations made by renderPanel(), creating an infinite MutationObserver loop
  // whenever an artwork batch PR was open.
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('.art-compositor-dialog') || node.querySelector('.art-compositor-dialog')) {
          requestAnimationFrame(renderPanel);
          return;
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  discoverOpenBatch();
})();
