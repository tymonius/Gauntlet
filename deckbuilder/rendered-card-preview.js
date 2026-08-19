(() => {
  const CARD_WIDTH = 240;
  const CARD_HEIGHT = 336;
  const MAX_PREVIEW_WIDTH = 300;
  let resizeObserver = null;

  renderCardPreview = function renderProductionCardPreview(card) {
    resizeObserver?.disconnect();
    resizeObserver = null;

    if (!card) {
      el.cardPreview.className = "card-preview empty-state";
      el.cardPreview.textContent = "Select a card to view its complete rendered card.";
      return;
    }

    const quantity = Number(state.deck?.[card.id] || 0);
    const uniqueAtLimit = Boolean(card.unique && quantity >= 1);
    const rendererUrl = `../card-design/card-review-render.html?card=${encodeURIComponent(card.id)}`;

    el.cardPreview.className = "card-preview rendered-card-preview";
    el.cardPreview.innerHTML = `
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

    document.getElementById("previewAddButton")?.addEventListener("click", () => addCard(card.id));
    installScaling();
  };

  function installScaling() {
    const stage = el.cardPreview?.querySelector("[data-card-render-stage]");
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

  if (
    document.readyState !== "loading" &&
    typeof el !== "undefined" &&
    el.cardPreview &&
    el.availableCards
  ) {
    renderAvailable();
  }
})();
