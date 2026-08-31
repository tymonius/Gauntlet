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
  // directly. Keep these URLs versioned so Pages deployments cannot leave old
  // authoring or batch-publication code in the browser cache.
  const authoringClient = document.createElement('script');
  authoringClient.async = false;
  authoringClient.src = 'artwork-authoring-client.js?v=20260819-7';
  document.head.append(authoringClient);

  // Publish runs through a separate reliability shim so a transient Worker or
  // GitHub mergeability race cannot strand an otherwise valid artwork batch.
  const publishRecovery = document.createElement('script');
  publishRecovery.async = false;
  publishRecovery.src = 'artwork-publish-fetch-recovery.js?v=20260831-1';
  document.head.append(publishRecovery);

  const batchPublishControl = document.createElement('script');
  batchPublishControl.async = false;
  batchPublishControl.src = 'artwork-batch-publish-control.js?v=20260819-2';
  document.head.append(batchPublishControl);

  let returnView = null;
  let hookedDialog = null;
  let viewportLock = null;
  const openingRetries = new WeakSet();
  const nativeShowModal = HTMLDialogElement.prototype.showModal;

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

  function lockViewport() {
    if (viewportLock) return;
    const root = document.documentElement;
    const body = document.body;
    if (!body) return;

    viewportLock = {
      x: window.scrollX,
      y: window.scrollY,
      rootOverflow: root.style.overflow,
      rootScrollBehavior: root.style.scrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyWidth: body.style.width,
      bodyScrollBehavior: body.style.scrollBehavior,
      bodyWidthPx: body.getBoundingClientRect().width,
    };

    // Native <dialog> focus can scroll the document to the dialog's DOM
    // position before our preventScroll focus runs. Freeze the catalog itself
    // before showModal() so that focus has nothing to scroll underneath it.
    root.style.scrollBehavior = 'auto';
    root.style.overflow = 'hidden';
    body.style.scrollBehavior = 'auto';
    body.style.position = 'fixed';
    body.style.top = `-${viewportLock.y}px`;
    body.style.left = `-${viewportLock.x}px`;
    body.style.width = `${viewportLock.bodyWidthPx}px`;
  }

  function unlockViewport() {
    const view = viewportLock;
    viewportLock = null;
    if (!view) return;

    const root = document.documentElement;
    const body = document.body;
    root.style.overflow = view.rootOverflow;
    root.style.scrollBehavior = view.rootScrollBehavior;
    if (body) {
      body.style.position = view.bodyPosition;
      body.style.top = view.bodyTop;
      body.style.left = view.bodyLeft;
      body.style.width = view.bodyWidth;
      body.style.scrollBehavior = view.bodyScrollBehavior;
    }
    restoreViewport(view);
  }

  // Lock only the artwork compositor. Other dialogs on the developer site keep
  // their native behavior. Doing this at showModal() time avoids the regression
  // caused by moving the viewport after the compositor had already been laid out.
  HTMLDialogElement.prototype.showModal = function gauntletCompositorShowModal(...args) {
    if (!this.classList.contains('art-compositor-dialog')) {
      return nativeShowModal.apply(this, args);
    }

    if (returnView?.opener) openingRetries.delete(returnView.opener);
    lockViewport();
    try {
      return nativeShowModal.apply(this, args);
    } catch (error) {
      unlockViewport();
      throw error;
    }
  };

  function hookDialog() {
    const dialog = document.querySelector('.art-compositor-dialog');
    if (!dialog || dialog === hookedDialog) return;
    hookedDialog = dialog;
    dialog.addEventListener('close', () => {
      const view = returnView;
      returnView = null;
      unlockViewport();
      if (!view) return;
      restoreViewport(view);
      view.opener?.focus?.({ preventScroll: true });
      requestAnimationFrame(() => restoreViewport(view));
    });
  }

  function retryLaunchUntilOpen(opener) {
    if (openingRetries.has(opener)) return;
    openingRetries.add(opener);
    let attempts = 0;

    const retry = () => {
      if (!openingRetries.has(opener)) return;
      const dialog = document.querySelector('.art-compositor-dialog');
      if (dialog?.open || !opener.isConnected || attempts >= 30) {
        openingRetries.delete(opener);
        return;
      }

      attempts += 1;
      opener.click();
      window.setTimeout(retry, 80);
    };

    window.setTimeout(retry, 80);
  }

  // Capture the exact catalog viewport before the compositor opens. The core
  // compositor sometimes installs its launcher just before an iframe/card has
  // become measurable; if that first click races rendering, retry the same
  // launch automatically rather than requiring the user to click repeatedly.
  document.addEventListener('click', (event) => {
    const opener = event.target instanceof Element
      ? event.target.closest('.art-compositor-launch')
      : null;
    if (!opener) return;

    if (!openingRetries.has(opener)) {
      returnView = {
        x: window.scrollX,
        y: window.scrollY,
        opener,
      };
      retryLaunchUntilOpen(opener);
    }
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