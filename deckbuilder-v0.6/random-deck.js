(() => {
  const CARD_TARGET = 30;
  const VALUE_LIMIT = 60;
  const MIN_FACTION_CARDS = 6;
  const MAX_FACTION_CARDS = 10;
  const SOFT_COPY_LIMIT = 3;
  const ARENA_CHANCE = 0.35;

  document.addEventListener("DOMContentLoaded", installRandomDeckButton);

  function installRandomDeckButton() {
    const button = document.getElementById("randomDeckButton");
    if (!button) return;

    button.addEventListener("click", generateRandomDeck);

    const readyCheck = window.setInterval(() => {
      const ready = state.cards.length > 0 && state.territoryPool?.length > 0;
      button.disabled = !ready;
      button.title = ready
        ? "Replace the current deck with a random valid deck for the selected faction and leader"
        : "Waiting for card and Territory sources to load";
      if (ready) window.clearInterval(readyCheck);
    }, 100);
  }

  function generateRandomDeck() {
    const faction = getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);
    if (!faction || faction.status !== "ready" || !leader) return;
    if (!state.cards.length || !state.territoryPool?.length) return;

    const hasCurrentDeck = Object.keys(state.deck).length > 0 || state.territories.length > 0;
    if (hasCurrentDeck && !confirm(`Replace the current deck with a random ${faction.name} deck for ${leader.name}?`)) return;

    const generated = buildRandomPlayableCards();
    if (!generated) {
      alert("Unable to generate a valid random deck from the currently loaded card pool.");
      return;
    }

    state.deck = generated;
    state.territories = chooseRandomTerritories();
    state.selectedCardId = null;
    state.selectedTerritoryId = state.territories[0] || null;
    state.deckName = `Random ${leader.name} Test Deck ${formatTime(new Date())}`;

    renderAll();

    const validation = validateDeck();
    if (!validation.valid) {
      console.error("Generated deck failed validation", validation);
      alert("The random deck was generated but failed validation. Please report this deckbuilder error.");
    }
  }

  function buildRandomPlayableCards() {
    const legalCards = state.cards.filter(card => card.faction === "neutral" || card.faction === state.factionId);
    const factionCards = legalCards.filter(card => card.faction === state.factionId);
    if (!legalCards.length || !factionCards.length) return null;

    let best = null;

    for (let attempt = 0; attempt < 400; attempt += 1) {
      const factionTarget = randomInt(MIN_FACTION_CARDS, MAX_FACTION_CARDS);
      const valueTarget = randomInt(52, VALUE_LIMIT);
      const deck = {};
      let cardCount = 0;
      let pointTotal = 0;
      let factionCount = 0;

      while (cardCount < CARD_TARGET) {
        const slotsRemaining = CARD_TARGET - cardCount;
        const factionNeeded = Math.max(0, factionTarget - factionCount);
        const mustChooseFaction = factionNeeded >= slotsRemaining;
        const preferFaction = mustChooseFaction || (factionCount < factionTarget && Math.random() < 0.48);
        const maximumNextCost = VALUE_LIMIT - pointTotal - (slotsRemaining - 1);

        let candidates = legalCards.filter(card => {
          const qty = deck[card.id] || 0;
          if (card.unique && qty >= 1) return false;
          if (!card.unique && qty >= SOFT_COPY_LIMIT) return false;
          if (card.cost > maximumNextCost) return false;
          if (mustChooseFaction && card.faction !== state.factionId) return false;
          return true;
        });

        if (preferFaction && !mustChooseFaction) {
          const preferred = candidates.filter(card => card.faction === state.factionId);
          if (preferred.length) candidates = preferred;
        }

        if (!candidates.length) break;

        const desiredAverage = Math.max(1, (valueTarget - pointTotal) / slotsRemaining);
        const card = weightedChoice(candidates, candidate => {
          const distance = Math.abs(candidate.cost - desiredAverage);
          const costFit = 1 / (1 + distance * 2.2);
          const diversity = deck[candidate.id] ? 0.52 : 1.25;
          const factionFit = candidate.faction === state.factionId ? 1.12 : 1;
          return costFit * diversity * factionFit;
        });

        deck[card.id] = (deck[card.id] || 0) + 1;
        cardCount += 1;
        pointTotal += card.cost;
        if (card.faction === state.factionId) factionCount += 1;
      }

      if (cardCount !== CARD_TARGET || pointTotal > VALUE_LIMIT || factionCount < MIN_FACTION_CARDS) continue;

      const uniqueTitles = Object.keys(deck).length;
      const score = 100
        - Math.abs(valueTarget - pointTotal) * 3
        - Math.abs(factionTarget - factionCount) * 2
        + uniqueTitles * 0.25
        + Math.random();

      if (!best || score > best.score) best = { deck, score };
    }

    return best?.deck || null;
  }

  function chooseRandomTerritories() {
    const standards = shuffle(state.territoryPool.filter(territory => !territory.arena));
    const arenas = shuffle(state.territoryPool.filter(territory => territory.arena));

    if (arenas.length && standards.length >= 2 && Math.random() < ARENA_CHANCE) {
      return shuffle([arenas[0].id, standards[0].id, standards[1].id]);
    }

    return standards.slice(0, 3).map(territory => territory.id);
  }

  function weightedChoice(items, weightFor) {
    const weights = items.map(item => Math.max(0.001, weightFor(item)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;

    for (let index = 0; index < items.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return items[index];
    }

    return items[items.length - 1];
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function randomInt(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
})();
