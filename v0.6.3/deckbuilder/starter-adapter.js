export const V063_STARTER_CARD_NAME_MIGRATIONS = Object.freeze({
  Reserves: "Second Line",
});

export const V063_STARTER_TERRITORY_NAME_MIGRATIONS = Object.freeze({
  "Smuggler's Pass": "Smuggler's Run",
});

export function migrateV063StarterDeck(deck) {
  const territories = (deck.territories ?? []).map(migrateTerritoryName);
  return {
    ...deck,
    inheritedFromVersion: "v0.6.2",
    cards: (deck.cards ?? []).map((item) => ({
      ...item,
      name: migrateCardName(item.name),
    })),
    territories,
    recommendedTerritoryOrder: [...territories],
    territoryOrderGuidance: {
      meaning: "strategy-recommendation",
      direction: "own-end-to-opponent-end",
      chosenAfterOpeningSelection: true,
      mayRearrangeAtSetup: true,
      informedByOpeningHand: true,
      informedByOpeningDiscard: true,
      informedByInitiative: false,
    },
  };
}

export function migrateV063StarterCatalog(catalog) {
  return {
    ...catalog,
    version: "v0.6.3-candidate-adapter",
    status: "v0.6.2 starter compositions adapted for v0.6.3 names and setup guidance",
    inheritedFromVersion: catalog.version ?? "v0.6.2",
    territoryOrderSemantics: {
      meaning: "strategy-recommendation",
      direction: "own-end-to-opponent-end",
      chosenAfterOpeningSelection: true,
      mayRearrangeAtSetup: true,
      informedByOpeningHand: true,
      informedByOpeningDiscard: true,
      informedByInitiative: false,
    },
    decks: (catalog.decks ?? []).map(migrateV063StarterDeck),
  };
}

function migrateCardName(name) {
  return V063_STARTER_CARD_NAME_MIGRATIONS[name] ?? name;
}

function migrateTerritoryName(name) {
  return V063_STARTER_TERRITORY_NAME_MIGRATIONS[name] ?? name;
}
