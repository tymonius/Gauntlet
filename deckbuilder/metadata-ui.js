(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;
  const escapeHtml = value => deckbuilder.escapeHtml(value);

  deckbuilder.registerRenderHook(refineAll);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installMetadataUi, { once: true });
  } else {
    installMetadataUi();
  }

  function installMetadataUi() {
    for (const id of ["cardSearch", "costFilter", "allegianceFilter", "leaderSelect"]) {
      const control = document.getElementById(id);
      control?.addEventListener("input", scheduleRefine);
      control?.addEventListener("change", scheduleRefine);
    }
    refineAll();
  }

  function scheduleRefine() {
    queueMicrotask(refineAll);
  }

  function refineAll() {
    refineAvailableCards();
    refineDeckRows();
    refineRenderedPreview();
    refineLeaderPreview();
    refineGenericTags(document);
  }

  function refineAvailableCards() {
    document.querySelectorAll(".compact-card-row").forEach(row => {
      const value = row.querySelector(".compact-card-title .mini-pill");
      if (value) {
        value.classList.add("value-badge");
        value.setAttribute("aria-label", `Value ${value.textContent.trim()}`);
        value.title = `Card value: ${value.textContent.trim()}`;
      }

      const metadata = [...row.querySelectorAll(".compact-card-meta .mini-pill")];
      metadata.forEach((tag, index) => {
        const text = tag.textContent.trim();
        if (!text) {
          tag.remove();
          return;
        }

        tag.classList.add("meta-tag");
        if (index === 0) tag.classList.add("faction-tag");
        else if (/\bin deck\b/i.test(text)) tag.classList.add("quantity-tag");
        else tag.classList.add("detail-tag");
      });
    });
  }

  function refineDeckRows() {
    document.querySelectorAll(".deck-row:not(.deck-territory-row)").forEach(row => {
      const title = row.querySelector(".deck-title");
      const faction = title?.querySelector(".mini-pill");
      if (faction) faction.classList.add("meta-tag", "faction-tag");

      const name = title?.querySelector("strong")?.textContent.trim();
      if (!name) return;
      const card = state.cards.find(candidate => candidate.name === name);
      if (!card) return;

      const quantity = Number(state.deck?.[card.id] || 0);
      const value = Number(card.cost || 0);
      const total = quantity * value;
      const stats = row.querySelector(".deck-stats");
      if (!stats) return;

      stats.innerHTML = `
        <div class="deck-stat-strip" aria-label="${escapeHtml(name)} deck quantities">
          <span class="deck-stat deck-stat-box"><span class="deck-stat-label">Qty</span><strong>${quantity}</strong></span>
          <span class="deck-stat deck-stat-value" aria-label="Card value ${value}"><span class="deck-stat-label">Value</span><strong class="mini-pill value-badge deck-value-medallion">${value}</strong></span>
          <span class="deck-stat deck-stat-box deck-stat-total"><span class="deck-stat-label">Total</span><strong>${total}</strong></span>
        </div>
        ${card.unique ? '<span class="mini-pill meta-tag detail-tag deck-unique-tag">Unique</span>' : ""}
      `;
    });
  }

  function refineRenderedPreview() {
    const quantity = document.querySelector(".rendered-card-preview-actions .mini-pill");
    if (quantity) quantity.classList.add("meta-tag", "quantity-tag");
  }

  function refineLeaderPreview() {
    const faction = document.querySelector(".leader-preview h3 .mini-pill");
    if (faction) faction.classList.add("meta-tag", "faction-tag");
  }

  function refineGenericTags(root) {
    root.querySelectorAll(".mini-pill").forEach(tag => {
      if (tag.classList.contains("value-badge") || tag.classList.contains("meta-tag")) return;
      if (!tag.textContent.trim()) {
        tag.remove();
        return;
      }
      tag.classList.add("meta-tag");
    });
  }
})();
