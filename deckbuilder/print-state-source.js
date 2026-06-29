(() => {
  function readDeckFromState() {
    const deckName = document.getElementById("deckName")?.value.trim() || "Untitled deck";
    const version = document.getElementById("dataStatus")?.textContent.trim() || "Gauntlet";
    const valid = document.getElementById("validityText")?.textContent.trim().toLowerCase() === "valid";
    const cardCount = document.getElementById("cardCount")?.textContent.trim() || "0";
    const minimumCards = document.getElementById("minimumCards")?.textContent.trim() || "30";
    const pointTotal = document.getElementById("pointTotal")?.textContent.trim() || "0";
    const maximumPoints = document.getElementById("maximumPoints")?.textContent.trim() || "60";
    const territoryCount = document.getElementById("territoryCount")?.textContent.trim() || "0";
    const territoryRequirement = document.getElementById("territoryRequirement")?.textContent.trim() || "3";
    const uniqueCards = new Set(getRules()?.unique_cards || []);

    const cardEntries = getDeckCardEntries().map(({ card, qty }) => ({
      name: card.name,
      qty,
      cost: card.cost,
      unique: uniqueCards.has(card.name),
      action: card.action || "",
      battle: card.battle || "",
      reminder: card.reminder || ""
    }));

    const cards = cardEntries.flatMap(entry => Array.from({ length: entry.qty }, () => entry));

    const territories = state.territories
      .map(name => state.data?.territoryByName?.[name])
      .filter(Boolean)
      .map(territory => ({
        name: territory.name,
        text: territory.text || "",
        arena: Boolean(territory.arena)
      }));

    return {
      deckName,
      version,
      valid,
      cardCount,
      minimumCards,
      pointTotal,
      maximumPoints,
      territoryCount,
      territoryRequirement,
      cardEntries,
      cards,
      territories
    };
  }

  window.readDeckFromPage = readDeckFromState;
  try {
    readDeckFromPage = readDeckFromState;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();
