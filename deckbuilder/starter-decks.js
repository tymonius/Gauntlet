(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;
  const deckEntries = () => deckbuilder.deckEntries();
  const escapeHtml = value => deckbuilder.escapeHtml(value);
  const territoriesApi = () => deckbuilder.feature("territories");
  const ritesApi = () => deckbuilder.feature("mysticsRites");

  const STARTER_TIP_SOURCE = "starter-first-game-tips.json";
  let starterDecks = [];
  let loadError = null;
  let currentGameReady = false;

  deckbuilder.registerFeature("starterDecks", {
    getSelectedDeck: selectedStarterDeck,
    getMatchingCurrentDeck: matchingCurrentStarterDeck,
    loadSelectedDeck: loadRecommendedDeck,
    isReady: starterDeckReady
  });
  deckbuilder.registerRenderHook(renderStarterIntegration);
  deckbuilder.registerPrintTransform("starter-strategy", addMatchingStarterStrategy, 65);

  function renderStarterIntegration() {
    renderStarterDeckPreview();
    syncStarterDeckButton();
  }

  document.addEventListener("DOMContentLoaded", installStarterDecks);

  async function installStarterDecks() {
    const button = document.getElementById("starterDeckButton");
    const leaderSelect = document.getElementById("leaderSelect");

    button?.addEventListener("click", loadRecommendedDeck);
    installResetDeckButton(button);
    leaderSelect?.addEventListener("change", () => {
      renderStarterDeckPreview();
      syncStarterDeckButton();
    });

    try {
      const tipResponse = await fetch(STARTER_TIP_SOURCE, { cache: "no-store" });
      if (!tipResponse.ok) throw new Error(`Failed to load ${STARTER_TIP_SOURCE}: ${tipResponse.status}`);
      const tipData = await tipResponse.json();

      await waitForCurrentGamePool();
      currentGameReady = true;
      document.body.dataset.currentGameCards = "ready";

      const data = state.currentGameData?.starterDeckData;
      if (!data || !Array.isArray(data.decks)) {
        throw new Error("Current-game authority did not provide starter Deck data.");
      }
      const tips = tipData?.tips && typeof tipData.tips === "object" ? tipData.tips : {};
      starterDecks = data.decks.map(deck => ({
        ...deck,
        firstGameTip: deck.firstGameTip || tips[deck.id] || ""
      }));
    } catch (error) {
      console.error(error);
      loadError = error;
    }

    deckbuilder.render();
  }

  async function waitForCurrentGamePool() {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (state.currentGameVersion && state.currentGameData?.starterDecks?.length && Array.isArray(state.cards) && state.cards.length && territoriesApi()?.isReady?.()) return;
      await new Promise(resolve => window.setTimeout(resolve, 25));
    }
    throw new Error("Timed out waiting for the shared current-game card, Territory, and starter Deck pool.");
  }

  function installResetDeckButton(starterButton) {
    if (!starterButton || document.getElementById("resetDeckButton")) return;

    const actions = document.createElement("div");
    actions.className = "button-row setup-actions";
    starterButton.before(actions);
    actions.append(starterButton);

    const resetButton = document.createElement("button");
    resetButton.id = "resetDeckButton";
    resetButton.type = "button";
    resetButton.className = "secondary danger";
    resetButton.textContent = "Reset deck";
    resetButton.title = "Clear all playable cards, Territories, and the deck name";
    resetButton.addEventListener("click", resetCurrentDeck);
    actions.append(resetButton);
  }

  function starterRiteIds(preset = null) {
    if ((preset?.factionId || state.factionId) !== "mystics") return [];
    if (Array.isArray(preset?.selectedRites)) return [...preset.selectedRites];
    const riteApi = ritesApi();
    return riteApi?.selectionEnabled?.() ? [] : (riteApi?.defaultIds?.() || []);
  }

  function resetCurrentDeck() {
    const hasCards = Object.keys(state.deck).length > 0;
    const hasTerritories = Boolean(territoriesApi()?.selectedIds?.().length);
    const hasRites = Boolean(ritesApi()?.selectedIds?.().length);
    const hasName = Boolean(state.deckName.trim());

    if (
      (hasCards || hasTerritories || hasRites || hasName) &&
      !confirm(
        "Reset this deck? This removes all playable cards, Territories, Rites, and the deck name. " +
        "Your selected faction and Leader will remain."
      )
    ) return;

    state.deck = {};
    territoriesApi()?.setSelectedIds?.([]);
    ritesApi()?.setSelectedIds?.(starterRiteIds());
    state.deckName = "";
    state.selectedCardId = null;
    deckbuilder.render();
  }

  function selectedStarterDeck() {
    return starterDecks.find(deck =>
      deck.factionId === state.factionId &&
      deck.leaderId === state.leaderId
    ) || null;
  }

  function matchingCurrentStarterDeck() {
    const preset = selectedStarterDeck();
    if (!preset || !state.cards.length || !territoriesApi()?.isReady?.()) return null;

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

    const currentTerritories = (territoriesApi()?.selected?.() || []).map(territory => territory.name);
    const expectedTerritories = preset.territories || [];

    if (currentTerritories.length !== expectedTerritories.length) return null;
    if (currentTerritories.some((name, index) => name !== expectedTerritories[index])) return null;

    if (preset.factionId === "mystics" && Array.isArray(preset.selectedRites)) {
      const currentRites = [...(ritesApi()?.selectedIds?.() || [])].sort();
      const expectedRites = [...preset.selectedRites].sort();
      if (currentRites.length !== expectedRites.length) return null;
      if (currentRites.some((id, index) => id !== expectedRites[index])) return null;
    }

    return preset;
  }

  function starterDeckReady() {
    return Boolean(
      selectedStarterDeck() &&
      currentGameReady &&
      state.currentGameVersion &&
      state.cards.length &&
      territoriesApi()?.isReady?.()
    );
  }

  function syncStarterDeckButton() {
    const button = document.getElementById("starterDeckButton");
    if (!button) return;

    const preset = selectedStarterDeck();
    const faction = deckbuilder.getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);

    button.disabled = !starterDeckReady();
    button.textContent = preset && leader
      ? `Load ${leader.name} starter`
      : "Load recommended deck";
    button.title = loadError
      ? "Recommended Decks could not be loaded"
      : starterDeckReady()
        ? `Replace the current Deck with the recommended ${state.currentGameDisplayVersion || "current"} preset for this Leader`
        : "Waiting for current-game card, Territory, and starter Deck data";
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

    const rules = deckbuilder.constructionRules();
    preview.className = "starter-deck-preview";
    preview.innerHTML = `
      <div class="starter-deck-heading">
        <div>
          <p class="eyebrow">Recommended ${escapeHtml(state.currentGameDisplayVersion || "current")} playtest Deck</p>
          <h3>${escapeHtml(preset.name)}</h3>
        </div>
        <div class="starter-deck-metrics">
          <span class="mini-pill">${Number(preset.cardCount) || rules.minimumCards} cards</span>
          <span class="mini-pill">${Number(preset.deckbuildingValue) || rules.maximumDeckbuildingValue}/${rules.maximumDeckbuildingValue} value</span>
        </div>
      </div>
      <p>${escapeHtml(preset.summary)}</p>
      <div class="starter-territories">
        <strong>Territories, from your end outward:</strong>
        ${preset.territories.map(name => `<span class="mini-pill">${escapeHtml(name)}</span>`).join("")}
      </div>
      ${renderRecommendedRiteOrder(preset)}
      <p class="starter-tip"><strong>First-game tip:</strong> ${escapeHtml(preset.firstGameTip)}</p>
    `;
  }

  function riteName(riteId) {
    const rites = state.currentGameData?.mystics?.rites || [];
    return rites.find(rite => rite.id === riteId)?.name || riteId;
  }

  function recommendedRiteNames(preset) {
    return (preset.recommendedRiteOrder || []).map(riteName);
  }

  function renderRecommendedRiteOrder(preset) {
    const names = recommendedRiteNames(preset);
    if (!names.length) return "";
    return `
      <div class="starter-territories starter-rites">
        <strong>Recommended Rite order:</strong>
        ${names.map(name => `<span class="mini-pill">${escapeHtml(name)}</span>`).join('<span aria-hidden="true">→</span>')}
      </div>`;
  }

  function addMatchingStarterStrategy(html) {
    const preset = matchingCurrentStarterDeck();
    return preset ? addStarterStrategyToPrintDocument(html, preset) : html;
  }

  function addStarterStrategyToPrintDocument(html, preset) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const summary = documentNode.querySelector(".first-page-summary");
    const summaryGrid = summary?.querySelector(".summary-grid");
    const style = documentNode.querySelector("style");
    if (!summary || !summaryGrid || !style) return html;

    summary.classList.add("has-starter-strategy");

    const territoryOrder = (preset.territories || [])
      .map((name, index) => `<span><strong>${index + 1}.</strong> ${escapeStarterHtml(name)}</span>`)
      .join('<span class="starter-territory-arrow" aria-hidden="true">→</span>');
    const riteOrder = recommendedRiteNames(preset)
      .map((name, index) => `<span><strong>${index + 1}.</strong> ${escapeStarterHtml(name)}</span>`)
      .join('<span class="starter-territory-arrow" aria-hidden="true">→</span>');

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
      </div>
      <div class="starter-print-territories">
        <h2>Recommended Territory order</h2>
        <p><strong>From your end outward:</strong> ${territoryOrder}</p>
      </div>
      ${riteOrder ? `<div class="starter-print-territories starter-print-rites">
        <h2>Recommended Rite order</h2>
        <p>${riteOrder}</p>
      </div>` : ""}`;
    summaryGrid.before(strategy);

    style.textContent += `
.first-page-summary.has-starter-strategy .summary-line{margin-bottom:.05in}
.first-page-summary.has-starter-strategy .summary-grid{min-height:1.78in}
.starter-print-strategy{display:grid;grid-template-columns:.9fr 1.45fr;gap:.055in .18in;margin:0 0 .065in;padding:.055in .085in;border:1px solid #999;background:#f2f2f2!important;box-shadow:inset 0 0 0 999px #f2f2f2;font-size:7.15pt;line-height:1.16}
.starter-print-strategy h2{margin:0 0 .022in;font-size:7.25pt}
.starter-print-strategy p{margin:0}
.starter-print-territories{grid-column:1/-1;display:grid;grid-template-columns:1.48in 1fr;gap:.08in;align-items:baseline;padding-top:.045in;border-top:1px solid #bbb}
.starter-print-territories h2{margin:0}
.starter-print-territories p{font-size:6.75pt}
.starter-print-territories span{white-space:nowrap}
.starter-territory-arrow{display:inline-block;margin:0 .045in;font-weight:900}`;

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
    const faction = deckbuilder.getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);
    if (!preset || !faction || !leader || !starterDeckReady()) return;

    const hasCurrentDeck = Object.keys(state.deck).length > 0
      || Boolean(territoriesApi()?.selectedIds?.().length)
      || Boolean(ritesApi()?.selectedIds?.().length);
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
    const territoryPool = state.currentGameData?.territories || [];
    for (const name of preset.territories) {
      const territory = territoryPool.find(candidate => candidate.name === name);
      if (!territory) missingTerritories.push(name);
      else territoryIds.push(territory.id);
    }

    if (missingCards.length || missingTerritories.length) {
      const missing = [
        ...missingCards.map(name => `card: ${name}`),
        ...missingTerritories.map(name => `Territory: ${name}`)
      ];
      console.error("Starter Deck references missing current-game entries", missing);
      alert(`Unable to load this starter Deck because current-game entries are missing:\n\n${missing.join("\n")}`);
      return;
    }

    state.deckName = `${leader.name} — ${preset.name}`;
    state.deck = deck;
    territoriesApi()?.setSelectedIds?.(territoryIds);
    ritesApi()?.setSelectedIds?.(starterRiteIds(preset));
    state.selectedCardId = null;

    deckbuilder.render();

    const validation = deckbuilder.validate();
    if (!validation.valid) {
      console.error("Recommended starter Deck failed runtime validation", preset, validation);
      alert("The recommended Deck loaded but failed validation. Please report this Deckbuilder error.");
    }
  }
})();
