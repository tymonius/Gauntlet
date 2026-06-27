document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("randomDeckButton");
  if (!button) return;
  button.addEventListener("click", generateRandomDeckForTesting);
});

function generateRandomDeckForTesting() {
  if (!state?.data) {
    window.alert("Card data has not loaded yet.");
    return;
  }

  if (hasDeckContent() && !window.confirm("Replace the current deck with a random test deck?")) {
    return;
  }

  const rules = getRules();
  const cards = [...state.data.cards].filter(card => Number.isFinite(Number(card.cost)));
  const uniqueCards = new Set(rules.unique_cards || []);
  const minimumCards = Number(rules.minimum_cards || 30);
  const maximumPoints = Number(rules.maximum_points || 60);
  const minimumCost = Math.min(...cards.map(card => Number(card.cost)));

  const generated = buildRandomCardSet(cards, uniqueCards, minimumCards, maximumPoints, minimumCost);
  if (!generated) {
    window.alert("Could not generate a valid random deck from the current card pool.");
    return;
  }

  state.deckName = `Random Test Deck ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  state.cards = generated;
  state.territories = chooseRandomTerritories();
  renderAll();
  flashStatus("Randomized");
}

function buildRandomCardSet(cards, uniqueCards, minimumCards, maximumPoints, minimumCost) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const result = {};
    let points = 0;

    for (let slot = 0; slot < minimumCards; slot += 1) {
      const remainingSlots = minimumCards - slot - 1;
      const maxCostForThisSlot = maximumPoints - points - remainingSlots * minimumCost;
      const eligible = cards.filter(card => {
        if (Number(card.cost) > maxCostForThisSlot) return false;
        if (uniqueCards.has(card.name) && result[card.name]) return false;
        return true;
      });

      if (!eligible.length) break;

      const chosen = randomItem(eligible);
      result[chosen.name] = (result[chosen.name] || 0) + 1;
      points += Number(chosen.cost);
    }

    const count = Object.values(result).reduce((sum, qty) => sum + qty, 0);
    if (count === minimumCards && points <= maximumPoints) {
      return result;
    }
  }

  return null;
}

function chooseRandomTerritories() {
  const rules = getRules();
  const territoryTarget = Number(rules.territories || 3);
  const arenaLimit = Number(rules.maximum_arenas || 1);
  const allTerritories = [...state.data.territories];
  const arenas = shuffle(allTerritories.filter(territory => territory.arena));
  const nonArenas = shuffle(allTerritories.filter(territory => !territory.arena));
  const selected = [];

  if (arenaLimit > 0 && arenas.length && Math.random() < 0.35) {
    selected.push(arenas[0].name);
  }

  for (const territory of nonArenas) {
    if (selected.length >= territoryTarget) break;
    selected.push(territory.name);
  }

  if (selected.length < territoryTarget) {
    for (const territory of arenas.slice(0, arenaLimit)) {
      if (selected.length >= territoryTarget) break;
      if (!selected.includes(territory.name)) selected.push(territory.name);
    }
  }

  return shuffle(selected).slice(0, territoryTarget);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
