(() => {
  const STARTER_DECK_SOURCE = "starter-decks.json";
  let starterDecks = [];
  let loadError = null;

  window.GAUNTLET_STARTER_DECKS = {
    getSelectedDeck: selectedStarterDeck,
    getMatchingCurrentDeck: matchingCurrentStarterDeck
  };

  const baseRenderAll = renderAll;
  renderAll = function renderAllWithStarterDeck() {
    baseRenderAll();
    renderStarterDeckPreview();
    syncStarterDeckButton();
  };

  document.addEventListener("DOMContentLoaded", installStarterDecks);

  async function installStarterDecks() {
    const button = document.getElementById("starterDeckButton");
    const leaderSelect = document.getElementById("leaderSelect");

    button?.addEventListener("click", loadRecommendedDeck);
    leaderSelect?.addEventListener("change", () => {
      renderStarterDeckPreview();
      syncStarterDeckButton();
    });
    installStarterPrintTips();

    try {
      const response = await fetch(STARTER_DECK_SOURCE, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${STARTER_DECK_SOURCE}: ${response.status}`);
      const data = await response.json();
      starterDecks = Array.isArray(data.decks) ? data.decks : [];
    } catch (error) {
      console.error(error);
      loadError = error;
    }

    renderStarterDeckPreview();
    syncStarterDeckButton();
  }

  function selectedStarterDeck() {
    return starterDecks.find(deck =>
      deck.factionId === state.factionId &&
      deck.leaderId === state.leaderId
    ) || null;
  }

  function matchingCurrentStarterDeck() {
    const preset = selectedStarterDeck();
    if (!preset || !state.cards.length || !state.territoryPool?.length) return null;

    const currentCards = new Map();
    for (const { card, qty } of deckEntries()) {
      currentCards.set(card.name, (currentCards.get(card.name) || 0) + Number(qty));
    }

    const expectedCards = new Map();
    for (const item of preset.cards || []) {
      expectedCards.set(item.name, (expectedCards.get(item.name) || 0) + Number(item.quantity));
    }

    if (currentCards.size !== expectedCards.size) return null;
    for (const [name, quantity] of expectedCards) {
      if (currentCards.get(name) !== quantity) return null;
    }

    const currentTerritories = (state.territories || [])
      .map(id => state.territoryPool.find(territory => territory.id === id)?.name)
      .filter(Boolean);
    const expectedTerritories = preset.territories || [];

    if (currentTerritories.length !== expectedTerritories.length) return null;
    if (currentTerritories.some((name, index) => name !== expectedTerritories[index])) return null;

    return preset;
  }

  function starterDeckReady() {
    return Boolean(
      selectedStarterDeck() &&
      state.cards.length &&
      state.territoryPool?.length
    );
  }

  function syncStarterDeckButton() {
    const button = document.getElementById("starterDeckButton");
    if (!button) return;

    const preset = selectedStarterDeck();
    const faction = getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);

    button.disabled = !starterDeckReady();
    button.textContent = preset && leader
      ? `Load ${leader.name} starter`
      : "Load recommended deck";
    button.title = loadError
      ? "Recommended Decks could not be loaded"
      : starterDeckReady()
        ? "Replace the current Deck with the recommended first-game preset for this Leader"
        : "Waiting for card, Territory, and starter Deck data";
  }

  function renderStarterDeckPreview() {
    const preview = document.getElementById("starterDeckPreview");
    if (!preview) return;

    if (loadError) {
      preview.className = "starter-deck-preview empty-state";
      preview.textContent = "Recommended starter Decks could not be loaded.";
      return;
    }

    const preset = selectedStarterDeck();
    if (!preset) {
      preview.className = "starter-deck-preview empty-state";
      preview.textContent = starterDecks.length
        ? "Choose a Leader to see its recommended starter Deck."
        : "Loading recommended starter Deck…";
      return;
    }

    preview.className = "starter-deck-preview";
    preview.innerHTML = `
      <div class="starter-deck-heading">
        <div>
          <p class="eyebrow">Recommended first-game Deck</p>
          <h3>${escapeHtml(preset.name)}</h3>
        </div>
        <div class="starter-deck-metrics">
          <span class="mini-pill">${Number(preset.cardCount) || 30} cards</span>
          <span class="mini-pill">${Number(preset.deckbuildingValue) || 60}/60 value</span>
        </div>
      </div>
      <p>${escapeHtml(preset.summary)}</p>
      <div class="starter-territories">
        <strong>Territories, from your end outward:</strong>
        ${preset.territories.map(name => `<span class="mini-pill">${escapeHtml(name)}</span>`).join("")}
      </div>
      <p class="starter-tip"><strong>First-game tip:</strong> ${escapeHtml(preset.firstGameTip)}</p>
    `;
  }

  function installStarterPrintTips() {
    const button = document.getElementById("printDeckButton");
    if (!button || button.dataset.starterPrintTipsInstalled === "true") return;

    button.dataset.starterPrintTipsInstalled = "true";
    button.addEventListener("click", prepareStarterPrintTips, true);
  }

  function prepareStarterPrintTips() {
    const preset = matchingCurrentStarterDeck();
    if (!preset) return;

    const inheritedOpen = window.open;
    const starterAwareOpen = function starterAwareOpen(...args) {
      const printWindow = inheritedOpen.apply(window, args);
      if (!printWindow) return printWindow;

      const inheritedWrite = printWindow.document.write.bind(printWindow.document);
      printWindow.document.write = html => inheritedWrite(addStarterStrategyToPrintDocument(html, preset));
      return printWindow;
    };

    window.open = starterAwareOpen;
    window.setTimeout(() => {
      if (window.open === starterAwareOpen) window.open = inheritedOpen;
    }, 0);
  }

  function addStarterStrategyToPrintDocument(html, preset) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const summary = documentNode.querySelector(".first-page-summary");
    const summaryGrid = summary?.querySelector(".summary-grid");
    const style = documentNode.querySelector("style");
    if (!summary || !summaryGrid || !style) return html;

    summary.classList.add("has-starter-strategy");

    const strategy = documentNode.createElement("section");
    strategy.className = "starter-print-strategy";
    strategy.innerHTML = `
      <div>
        <h2>Starter strategy</h2>
        <p>${escapeStarterHtml(preset.summary)}</p>
      </div>
      <div>
        <h2>First-game tip</h2>
        <p>${escapeStarterHtml(preset.firstGameTip)}</p>
      </div>`;
    summaryGrid.before(strategy);

    style.textContent += `
.first-page-summary.has-starter-strategy .summary-line{margin-bottom:.055in}
.first-page-summary.has-starter-strategy .summary-grid{min-height:1.95in}
.starter-print-strategy{display:grid;grid-template-columns:.9fr 1.45fr;gap:.18in;margin:0 0 .08in;padding:.065in .085in;border:1px solid #999;background:#f2f2f2!important;box-shadow:inset 0 0 0 999px #f2f2f2;font-size:7.25pt;line-height:1.18}
.starter-print-strategy h2{margin:0 0 .025in;font-size:7.4pt}
.starter-print-strategy p{margin:0}`;

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function escapeStarterHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadRecommendedDeck() {
    const preset = selectedStarterDeck();
    const faction = getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);
    if (!preset || !faction || !leader || !starterDeckReady()) return;

    const hasCurrentDeck = Object.keys(state.deck).length > 0 || state.territories.length > 0;
    if (
      hasCurrentDeck &&
      !confirm(`Replace the current Deck with ${leader.name}'s recommended starter Deck, ${preset.name}?`)
    ) return;

    const deck = {};
    const missingCards = [];

    for (const item of preset.cards) {
      const card = state.cards.find(candidate =>
        candidate.name === item.name &&
        (candidate.faction === "neutral" || candidate.faction === preset.factionId)
      );

      if (!card) {
        missingCards.push(item.name);
        continue;
      }

      deck[card.id] = item.quantity;
    }

    const territoryIds = [];
    const missingTerritories = [];
    for (const name of preset.territories) {
      const territory = state.territoryPool.find(candidate => candidate.name === name);
      if (!territory) missingTerritories.push(name);
      else territoryIds.push(territory.id);
    }

    if (missingCards.length || missingTerritories.length) {
      const missing = [
        ...missingCards.map(name => `card: ${name}`),
        ...missingTerritories.map(name => `Territory: ${name}`)
      ];
      console.error("Starter Deck references missing source entries", missing);
      alert(`Unable to load this starter Deck because source entries are missing:\n\n${missing.join("\n")}`);
      return;
    }

    state.deckName = `${leader.name} — ${preset.name}`;
    state.deck = deck;
    state.territories = territoryIds;
    state.selectedCardId = null;
    state.selectedTerritoryId = territoryIds[0] || null;

    renderAll();

    const validation = validateDeck();
    if (!validation.valid) {
      console.error("Recommended starter Deck failed runtime validation", preset, validation);
      alert("The recommended Deck loaded but failed validation. Please report this Deckbuilder error.");
    }
  }
})();
