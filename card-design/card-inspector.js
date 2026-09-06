(async () => {
  if (window.GauntletCardInspector?.initialized) return;

  const inspector = window.GauntletCardInspector || {};
  window.GauntletCardInspector = inspector;
  inspector.initialized = true;

  const { PRODUCTION_SURFACES } = await import('./production-surface.mjs');
  const CARD_FORMATS = Object.freeze({
    portrait: Object.freeze({
      width: PRODUCTION_SURFACES.portrait.widthCssPx,
      height: PRODUCTION_SURFACES.portrait.heightCssPx,
    }),
    landscape: Object.freeze({
      width: PRODUCTION_SURFACES.landscape.widthCssPx,
      height: PRODUCTION_SURFACES.landscape.heightCssPx,
    }),
  });
  const MAX_SCALE = 2.35;
  const INSPECTION_HISTORY_KEY = 'gauntletCardInspection';

  let dialog;
  let cardStage;
  let cardFrame;
  let artStage;
  let artImage;
  let backButton;
  let closeButton;
  let currentCardHref = '';
  let currentLabel = 'Gauntlet card';
  let currentCardFormat = 'portrait';
  let currentSourceFrame = null;
  let runtimeInitialized = false;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    if (runtimeInitialized) return;
    runtimeInitialized = true;
    buildDialog();
    window.addEventListener('message', handleRendererMessage);
    window.addEventListener('resize', scaleCardStage);
    window.addEventListener('popstate', handlePopState);
  }

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'gauntlet-card-inspector';
    dialog.setAttribute('aria-labelledby', 'gauntlet-card-inspector-label');
    dialog.innerHTML = `
      <div class="gauntlet-card-inspector-toolbar">
        <button class="gauntlet-card-inspector-back" type="button" hidden>← Back to card</button>
        <span id="gauntlet-card-inspector-label" class="gauntlet-card-inspector-label" aria-live="polite"></span>
        <button class="gauntlet-card-inspector-close" type="button" aria-label="Close inspection">×</button>
      </div>
      <div class="gauntlet-card-inspector-body">
        <div class="gauntlet-card-inspector-card-stage" aria-hidden="false">
          <iframe
            class="gauntlet-card-inspector-frame"
            data-face-inspection-host="true"
            title="Enlarged Gauntlet card"
            scrolling="no"
          ></iframe>
        </div>
        <div class="gauntlet-card-inspector-art-stage" aria-hidden="true" hidden>
          <img class="gauntlet-card-inspector-art-image" alt="" />
        </div>
      </div>`;
    document.body.append(dialog);

    cardStage = dialog.querySelector('.gauntlet-card-inspector-card-stage');
    cardFrame = dialog.querySelector('.gauntlet-card-inspector-frame');
    artStage = dialog.querySelector('.gauntlet-card-inspector-art-stage');
    artImage = dialog.querySelector('.gauntlet-card-inspector-art-image');
    backButton = dialog.querySelector('.gauntlet-card-inspector-back');
    closeButton = dialog.querySelector('.gauntlet-card-inspector-close');

    backButton.addEventListener('click', showCard);
    closeButton.addEventListener('click', requestCloseInspection);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) requestCloseInspection();
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      requestCloseInspection();
    });
  }

  function handleRendererMessage(event) {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (
      data.type === 'gauntlet-face-art-inspect'
      || data.type === 'gauntlet-art-inspect'
      || data.type === 'gauntlet-territory-art-inspect'
    ) {
      // Artwork inspection is a second-level action. Normal preview frames open
      // the whole card first; only the enlarged card hosted here may open art.
      if (!dialog?.open || event.source !== cardFrame?.contentWindow) return;
      const source = sameOriginUrl(data.source);
      if (!source) return;
      openArtwork(source, data.label);
      return;
    }

    if (
      data.type === 'gauntlet-face-inspect'
      || data.type === 'gauntlet-card-inspect'
      || data.type === 'gauntlet-territory-inspect'
    ) {
      if (event.source === cardFrame?.contentWindow) return;
      const href = sameOriginUrl(data.href);
      if (!href) return;
      const format = data.type === 'gauntlet-territory-inspect' || data.orientation === 'landscape'
        ? 'landscape'
        : 'portrait';
      openCard(href, data.label, true, format, sourceFrameFor(event.source));
    }
  }

  function sourceFrameFor(sourceWindow) {
    return Array.from(document.querySelectorAll('iframe')).find(frame => frame.contentWindow === sourceWindow) || null;
  }

  function handlePopState(event) {
    const inspectionState = readInspectionState(event.state);
    if (inspectionState) {
      restoreInspectionState(inspectionState);
      return;
    }

    if (dialog?.open) dismissInspection();
  }

  function sameOriginUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.href);
      return url.origin === window.location.origin ? url.href : null;
    } catch {
      return null;
    }
  }

  function inspectionRenderUrl(href) {
    const url = new URL(href, window.location.href);
    if (!url.pathname.endsWith('/card-design/face-render.html')) {
      url.searchParams.set('inspection', '1');
    }
    return url.href;
  }

  function readInspectionState(state = history.state) {
    if (!state || typeof state !== 'object') return null;
    const inspectionState = state[INSPECTION_HISTORY_KEY];
    return inspectionState && typeof inspectionState === 'object' ? inspectionState : null;
  }

  function currentHistoryState() {
    return history.state && typeof history.state === 'object' ? history.state : {};
  }

  function normalizeCardFormat(format) {
    return Object.hasOwn(CARD_FORMATS, format) ? format : 'portrait';
  }

  function currentCardDimensions() {
    return CARD_FORMATS[normalizeCardFormat(currentCardFormat)];
  }

  function applyCardFormat(format) {
    currentCardFormat = normalizeCardFormat(format);
    const { width, height } = currentCardDimensions();
    if (cardFrame) {
      cardFrame.style.width = `${width}px`;
      cardFrame.style.height = `${height}px`;
    }
  }

  function buildInspectionState() {
    if (!artStage.hidden && artImage.src) {
      return {
        view: 'art',
        source: artImage.src,
        cardHref: currentCardHref,
        label: currentLabel,
        cardFormat: currentCardFormat,
      };
    }

    return {
      view: 'card',
      cardHref: currentCardHref,
      label: currentLabel,
      cardFormat: currentCardFormat,
    };
  }

  function pushInspectionHistory() {
    history.pushState(
      { ...currentHistoryState(), [INSPECTION_HISTORY_KEY]: buildInspectionState() },
      '',
      window.location.href,
    );
  }

  function replaceInspectionHistory() {
    if (!readInspectionState()) return;
    history.replaceState(
      { ...currentHistoryState(), [INSPECTION_HISTORY_KEY]: buildInspectionState() },
      '',
      window.location.href,
    );
  }

  function restoreInspectionState(inspectionState) {
    const label = String(inspectionState.label || 'Gauntlet card');
    const cardHref = sameOriginUrl(inspectionState.cardHref) || '';
    const cardFormat = normalizeCardFormat(inspectionState.cardFormat);

    if (inspectionState.view === 'art') {
      const source = sameOriginUrl(inspectionState.source);
      if (source) {
        currentCardHref = cardHref;
        applyCardFormat(cardFormat);
        showArtwork(source, label, false);
        return;
      }
    }

    if (cardHref) {
      openCard(cardHref, label, false, cardFormat, currentSourceFrame);
      return;
    }

    dismissInspection();
  }

  function setLabel(label) {
    currentLabel = String(label || currentLabel || 'Gauntlet card').trim() || 'Gauntlet card';
    const labelElement = dialog.querySelector('.gauntlet-card-inspector-label');
    labelElement.textContent = currentLabel;
    if (cardFrame) cardFrame.title = `Enlarged ${currentLabel}`;
  }

  function replaceCardFrameLocation(href) {
    if (!cardFrame?.contentWindow) return;
    try {
      // Replacement navigation is deliberate: assigning iframe.src adds a joint
      // session-history entry, which makes the parent inspector need two Backs.
      cardFrame.contentWindow.location.replace(href);
    } catch {
      cardFrame.src = href;
    }
  }

  function openCard(href, label, pushHistory = true, cardFormat = 'portrait', sourceFrame = null) {
    currentCardHref = href;
    currentSourceFrame = sourceFrame || currentSourceFrame;
    applyCardFormat(cardFormat);
    setLabel(label);
    const renderHref = inspectionRenderUrl(href);
    replaceCardFrameLocation(renderHref);
    showCard(false);
    openDialog(pushHistory);
    requestAnimationFrame(scaleCardStage);
  }

  function showCard(updateHistory = true) {
    const restoreCardFocus = dialog?.open && document.activeElement === backButton;
    artStage.hidden = true;
    artStage.setAttribute('aria-hidden', 'true');
    cardStage.hidden = false;
    cardStage.setAttribute('aria-hidden', 'false');
    backButton.hidden = true;
    if (updateHistory) replaceInspectionHistory();
    requestAnimationFrame(() => {
      scaleCardStage();
      if (restoreCardFocus && dialog?.open && !cardStage.hidden) {
        cardFrame.focus({ preventScroll: true });
      }
    });
  }

  function openArtwork(source, label) {
    showArtwork(source, label, true);
  }

  function showArtwork(source, label, pushHistory) {
    const wasOpen = dialog.open;
    setLabel(label);
    artImage.src = source;
    artImage.alt = `Full artwork for ${currentLabel}`;
    cardStage.hidden = true;
    cardStage.setAttribute('aria-hidden', 'true');
    artStage.hidden = false;
    artStage.setAttribute('aria-hidden', 'false');
    backButton.hidden = !currentCardHref;
    openDialog(pushHistory);
    if (wasOpen) {
      replaceInspectionHistory();
      (backButton.hidden ? closeButton : backButton).focus({ preventScroll: true });
    }
  }

  function openDialog(pushHistory) {
    if (dialog.open) return;
    if (pushHistory) pushInspectionHistory();
    dialog.showModal();
    document.body.classList.add('gauntlet-card-inspector-open');
  }

  function scaleCardStage() {
    if (!dialog?.open || cardStage?.hidden) return;
    const { width, height } = currentCardDimensions();
    const availableWidth = Math.max(width, window.innerWidth - 72);
    const availableHeight = Math.max(height, window.innerHeight - 132);
    const scale = Math.min(
      MAX_SCALE,
      availableWidth / width,
      availableHeight / height,
    );

    cardStage.style.width = `${width * scale}px`;
    cardStage.style.height = `${height * scale}px`;
    cardFrame.style.transform = `scale(${scale})`;
  }

  function requestCloseInspection() {
    if (!dialog?.open) return;
    if (readInspectionState()) {
      history.back();
      return;
    }
    dismissInspection();
  }

  function dismissInspection() {
    if (!dialog?.open) return;
    const sourceFrame = currentSourceFrame;
    dialog.close();
    document.body.classList.remove('gauntlet-card-inspector-open');
    replaceCardFrameLocation('about:blank');
    artImage.removeAttribute('src');
    artImage.alt = '';
    currentCardHref = '';
    currentSourceFrame = null;
    applyCardFormat('portrait');
    if (sourceFrame instanceof HTMLElement && sourceFrame.isConnected) {
      sourceFrame.focus({ preventScroll: true });
    }
  }

  inspector.close = requestCloseInspection;
})().catch(error => {
  if (window.GauntletCardInspector) window.GauntletCardInspector.initialized = false;
  console.error('Card inspector failed to initialize.', error);
});
