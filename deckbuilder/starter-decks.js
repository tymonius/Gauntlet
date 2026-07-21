(() => {
  const STARTER_DECK_SOURCE = "starter-decks.json";
  let starterDecks = [];
  let loadError = null;

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
