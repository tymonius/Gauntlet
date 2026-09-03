(async () => {
  const { PRODUCTION_SURFACES } = await import('../card-design/production-surface.mjs');
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
  let initialized = false;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    buildDialog();
    window.addEventListener('message', handleRendererMessage);
    window.addEventListener('resize', scaleCardStage);
    window.addEventListener('popstate', handlePopState);
  }

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'card-reference-inspection-dialog';
    dialog.setAttribute('aria-labelledby', 'card-reference-inspection-label');
    dialog.innerHTML = `
      <div class="card-reference-inspection-toolbar">
        <button class="card-reference-inspection-back" type="button" hidden>← Back to card</button>
        <span id="card-reference-inspection-label" class="card-reference-inspection-label" aria-live="polite"></span>
        <button class="card-reference-inspection-close" type="button" aria-label="Close inspection">×</button>
      </div>
      <div class="card-reference-inspection-body">
        <div class="card-reference-card-stage" aria-hidden="false">
          <iframe
            class="card-reference-inspection-frame"
            data-face-inspection-host="true"
            title="Enlarged Gauntlet card"
            scrolling="no"
          ></iframe>
        </div>
        <div class="card-reference-art-stage" aria-hidden="true" hidden>
          <img class="card-reference-art-image" alt="" />
        </div>
      </div>`;
    document.body.append(dialog);

    cardStage = dialog.querySelector('.card-reference-card-stage');
    cardFrame = dialog.querySelector('.card-reference-inspection-frame');
    artStage = dialog.querySelector('.card-reference-art-stage');
    artImage = dialog.querySelector('.card-reference-art-image');
    backButton = dialog.querySelector('.card-reference-inspection-back');
    closeButton = dialog.querySelector('.card-reference-inspection-close');

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
      data.type === 'gauntlet-face-inspect'
      || data.type === 'gauntlet-card-inspect'
      || data.type === 'gauntlet-territory-inspect'
    ) {
      const href = sameOriginUrl(data.href);
      if (!href) return;
      const format = data.type === 'gauntlet-territory-inspect' || data.orientation === 'landscape'
        ? 'landscape'
        : 'portrait';
      openCard(href, data.label, true, format);
      return;
    }

    if (
      data.type === 'gauntlet-face-art-inspect'
      || data.type === 'gauntlet-art-inspect'
      || data.type === 'gauntlet-territory-art-inspect'
    ) {
      const source = sameOriginUrl(data.source);
      if (!source) return;
      openArtwork(source, data.label);
    }
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
      openCard(cardHref, label, false, cardFormat);
      return;
    }

    dismissInspection();
  }

  function setLabel(label) {
    currentLabel = String(label || currentLabel || 'Gauntlet card').trim() || 'Gauntlet card';
    const labelElement = dialog.querySelector('.card-reference-inspection-label');
    labelElement.textContent = currentLabel;
    if (cardFrame) cardFrame.title = `Enlarged ${currentLabel}`;
  }

  function openCard(href, label, pushHistory = true, cardFormat = 'portrait') {
    currentCardHref = href;
    applyCardFormat(cardFormat);
    setLabel(label);
    const renderHref = inspectionRenderUrl(href);
    if (cardFrame.src !== renderHref) cardFrame.src = renderHref;
    showCard(false);
    openDialog(pushHistory);
    requestAnimationFrame(scaleCardStage);
  }

  function showCard(updateHistory = true) {
    artStage.hidden = true;
    artStage.setAttribute('aria-hidden', 'true');
    cardStage.hidden = false;
    cardStage.setAttribute('aria-hidden', 'false');
    backButton.hidden = true;
    if (updateHistory) replaceInspectionHistory();
    requestAnimationFrame(scaleCardStage);
  }

  function openArtwork(source, label) {
    showArtwork(source, label, true);
  }

  function showArtwork(source, label, pushHistory) {
    setLabel(label);
    artImage.src = source;
    artImage.alt = `Full artwork for ${currentLabel}`;
    cardStage.hidden = true;
    cardStage.setAttribute('aria-hidden', 'true');
    artStage.hidden = false;
    artStage.setAttribute('aria-hidden', 'false');
    backButton.hidden = !currentCardHref;
    const wasOpen = dialog.open;
    openDialog(pushHistory);
    if (wasOpen) replaceInspectionHistory();
  }

  function openDialog(pushHistory) {
    if (dialog.open) return;
    if (pushHistory) pushInspectionHistory();
    dialog.showModal();
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
    dialog.close();
    cardFrame.src = 'about:blank';
    artImage.removeAttribute('src');
    artImage.alt = '';
    currentCardHref = '';
    applyCardFormat('portrait');
  }
})().catch(error => {
  console.error('Card inspection failed to initialize.', error);
});
