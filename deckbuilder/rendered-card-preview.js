(async () => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const escapeHtml = value => deckbuilder.escapeHtml(value);
  const deckState = () => deckbuilder.deckState();

  const { PRODUCTION_SURFACES } = await import("../card-design/production-surface.mjs");
  const CARD_WIDTH = PRODUCTION_SURFACES.portrait.widthCssPx;
  const CARD_HEIGHT = PRODUCTION_SURFACES.portrait.heightCssPx;
  const MAX_PREVIEW_WIDTH = 300;
  let resizeObserver = null;

  function renderProductionCardPreview(card) {
    const cardPreview = document.getElementById("cardPreview");
    if (!cardPreview) return;

    resizeObserver?.disconnect();
    resizeObserver = null;

    if (!card) {
      cardPreview.className = "card-preview empty-state";
      cardPreview.textContent = "Select a card to view its complete rendered card.";
      return;
    }

    const quantity = Number(deckState().deck?.[card.id] || 0);
    const uniqueAtLimit = Boolean(card.unique && quantity >= 1);
    const rendererUrl = `../card-design/face-render.html?id=${encodeURIComponent(`card:${card.id}`)}`;

    cardPreview.className = "card-preview rendered-card-preview";
    cardPreview.innerHTML = `
      <div class="deckbuilder-card-render-stage" data-card-render-stage>
        <iframe
          class="deckbuilder-card-render-frame"
          src="${escapeHtml(rendererUrl)}"
          title="${escapeHtml(card.name)} complete rendered card"
          loading="eager"
          scrolling="no"
        ></iframe>
      </div>
      <div class="button-row rendered-card-preview-actions">
        <button id="previewAddButton" type="button"${uniqueAtLimit ? " disabled" : ""}>Add to deck</button>
        ${quantity ? `<span class="mini-pill">${quantity} in deck</span>` : ""}
      </div>
    `;

    document.getElementById("previewAddButton")?.addEventListener("click", () => deckbuilder.addCard(card.id));
    installScaling(cardPreview);
  }

  function installScaling(cardPreview) {
    const stage = cardPreview.querySelector("[data-card-render-stage]");
    if (!stage) return;

    const resize = () => scaleStage(stage);
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);
    }
    requestAnimationFrame(resize);
  }

  function scaleStage(stage) {
    const frame = stage.querySelector(".deckbuilder-card-render-frame");
    if (!frame) return;

    const availableWidth = Math.max(0, stage.clientWidth);
    const targetWidth = Math.min(MAX_PREVIEW_WIDTH, availableWidth || CARD_WIDTH);
    const scale = targetWidth / CARD_WIDTH;

    stage.style.height = `${CARD_HEIGHT * scale}px`;
    frame.style.transform = `translateX(-50%) scale(${scale})`;
  }

  deckbuilder.setCardPreviewRenderer(renderProductionCardPreview);

  if (document.readyState !== "loading") {
    deckbuilder.renderAvailable();
  } else {
    document.addEventListener("DOMContentLoaded", () => deckbuilder.renderAvailable(), { once: true });
  }
})().catch(error => {
  console.error("Deckbuilder rendered-card preview failed to initialize.", error);
});
