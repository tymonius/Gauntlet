(() => {
  const style = document.createElement('style');
  style.textContent = `
    .proposal-face:has(.gauntlet-card[data-art-compositor-decorative="true"]) > .art-compositor-launch {
      display: none !important;
    }
  `;
  document.head.append(style);

  // The public catalog is static, so canonical saves are bridged through the
  // authenticated artwork-authoring Worker. The client is a no-op on the local
  // authoring server, where /api/art-direction continues to write the repo file
  // directly. Keep this URL versioned so Pages deployments cannot leave an old
  // authoring client in the browser cache after persistence/auth fixes ship.
  const authoringClient = document.createElement('script');
  authoringClient.async = false;
  authoringClient.src = 'artwork-authoring-client.js?v=20260819-2';
  document.head.append(authoringClient);

  let returnView = null;
  let hookedDialog = null;

  function restoreViewport(view) {
    if (!view) return;
    const root = document.documentElement;
    const body = document.body;
    const rootBehavior = root.style.scrollBehavior;
    const bodyBehavior = body?.style.scrollBehavior || '';
    root.style.scrollBehavior = 'auto';
    if (body) body.style.scrollBehavior = 'auto';
    window.scrollTo(view.x, view.y);
    root.style.scrollBehavior = rootBehavior;
    if (body) body.style.scrollBehavior = bodyBehavior;
  }

  function hookDialog() {
    const dialog = document.querySelector('.art-compositor-dialog');
    if (!dialog || dialog === hookedDialog) return;
    hookedDialog = dialog;
    dialog.addEventListener('close', () => {
      const view = returnView;
      returnView = null;
      if (!view) return;
      restoreViewport(view);
      view.opener?.focus?.({ preventScroll: true });
      requestAnimationFrame(() => restoreViewport(view));
    });
  }

  // Capture the exact catalog viewport before the compositor opens. Native
  // dialog focus is allowed to manage the modal normally; when the compositor
  // closes, return to the card the user was editing.
  document.addEventListener('click', (event) => {
    const opener = event.target instanceof Element
      ? event.target.closest('.art-compositor-launch')
      : null;
    if (!opener) return;
    returnView = {
      x: window.scrollX,
      y: window.scrollY,
      opener,
    };
    queueMicrotask(hookDialog);
  }, true);

  function tagTargets(root = document) {
    root.querySelectorAll('.proposal-review-pair[id]').forEach(pair => {
      const faces = Array.from(pair.querySelectorAll(':scope .proposal-face .gauntlet-card'));
      faces.forEach((card, index) => {
        card.dataset.cardId = index === 0 ? pair.id : `${pair.id}-ratified`;
        if (index > 0) card.dataset.artCompositorDecorative = 'true';
      });
    });

    root.querySelectorAll('.rite-review-pair[id]').forEach(pair => {
      const faces = Array.from(pair.querySelectorAll(':scope .rite-face .gauntlet-card')).filter(card =>
        card.querySelector('.card-art img, .territory-art img'),
      );
      faces.forEach((card, index) => {
        if (card.classList.contains('completed-rite-card')) {
          card.dataset.cardId = `${pair.id}-completed`;
        } else if (index === 0) {
          card.dataset.cardId = pair.id;
        } else {
          card.dataset.cardId = `${pair.id}-face-${index + 1}`;
        }
      });
    });
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      tagTargets();
    });
  };

  tagTargets();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
