(() => {
  const CARD_WIDTH = 240;
  const CARD_HEIGHT = 336;
  const MAX_SCALE = 2.35;

  let dialog;
  let cardStage;
  let cardFrame;
  let artStage;
  let artImage;
  let backButton;
  let closeButton;
  let currentCardHref = '';
  let currentLabel = 'Gauntlet card';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    buildDialog();
    window.addEventListener('message', handleRendererMessage);
    window.addEventListener('resize', scaleCardStage);
  }

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'card-reference-inspection-dialog';
    dialog.innerHTML = `
      <div class="card-reference-inspection-toolbar">
        <button class="card-reference-inspection-back" type="button" hidden>← Back to card</button>
        <span class="card-reference-inspection-label" aria-live="polite"></span>
        <button class="card-reference-inspection-close" type="button" aria-label="Close inspection">×</button>
      </div>
      <div class="card-reference-inspection-body">
        <div class="card-reference-card-stage" aria-hidden="false">
          <iframe
            class="card-reference-inspection-frame"
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
    closeButton.addEventListener('click', closeInspection);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeInspection();
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (!artStage.hidden && currentCardHref) showCard();
      else closeInspection();
    });
  }

  function handleRendererMessage(event) {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'gauntlet-card-inspect' || data.type === 'gauntlet-territory-inspect') {
      const href = sameOriginUrl(data.href);
      if (!href) return;
      openCard(href, data.label);
      return;
    }

    if (data.type === 'gauntlet-art-inspect' || data.type === 'gauntlet-territory-art-inspect') {
      const source = sameOriginUrl(data.source);
      if (!source) return;
      openArtwork(source, data.label);
    }
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
    url.searchParams.set('inspection', '1');
    return url.href;
  }

  function setLabel(label) {
    currentLabel = String(label || currentLabel || 'Gauntlet card').trim() || 'Gauntlet card';
    const labelElement = dialog.querySelector('.card-reference-inspection-label');
    labelElement.textContent = currentLabel;
  }

  function openCard(href, label) {
    currentCardHref = href;
    setLabel(label);
    const renderHref = inspectionRenderUrl(href);
    if (cardFrame.src !== renderHref) cardFrame.src = renderHref;
    showCard();
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(scaleCardStage);
  }

  function showCard() {
    artStage.hidden = true;
    artStage.setAttribute('aria-hidden', 'true');
    cardStage.hidden = false;
    cardStage.setAttribute('aria-hidden', 'false');
    backButton.hidden = true;
    requestAnimationFrame(scaleCardStage);
  }

  function openArtwork(source, label) {
    setLabel(label);
    artImage.src = source;
    artImage.alt = `Full artwork for ${currentLabel}`;
    cardStage.hidden = true;
    cardStage.setAttribute('aria-hidden', 'true');
    artStage.hidden = false;
    artStage.setAttribute('aria-hidden', 'false');
    backButton.hidden = !currentCardHref;
    if (!dialog.open) dialog.showModal();
  }

  function scaleCardStage() {
    if (!dialog?.open || cardStage?.hidden) return;
    const availableWidth = Math.max(240, window.innerWidth - 72);
    const availableHeight = Math.max(336, window.innerHeight - 132);
    const scale = Math.min(
      MAX_SCALE,
      availableWidth / CARD_WIDTH,
      availableHeight / CARD_HEIGHT,
    );

    cardStage.style.width = `${CARD_WIDTH * scale}px`;
    cardStage.style.height = `${CARD_HEIGHT * scale}px`;
    cardFrame.style.transform = `scale(${scale})`;
  }

  function closeInspection() {
    if (!dialog?.open) return;
    dialog.close();
    cardFrame.src = 'about:blank';
    artImage.removeAttribute('src');
    artImage.alt = '';
    currentCardHref = '';
  }
})();
