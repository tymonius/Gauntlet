(() => {
  const oldStorageKey = "gauntlet-v0.6.1-decks";
  const storageKey = "gauntlet-v0.6.1-decks";
  const originalStorage = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem
  };

  function mappedKey(key) {
    return key === oldStorageKey ? storageKey : key;
  }

  Storage.prototype.getItem = function getItem(key) {
    return originalStorage.getItem.call(this, mappedKey(key));
  };
  Storage.prototype.setItem = function setItem(key, value) {
    return originalStorage.setItem.call(this, mappedKey(key), value);
  };
  Storage.prototype.removeItem = function removeItem(key) {
    return originalStorage.removeItem.call(this, mappedKey(key));
  };

  Object.assign(SOURCES, {
    neutral: {
      label: "Neutral",
      path: "../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
      start: "# Cost 1",
      end: "---",
      headingLevel: 2
    },
    military: {
      label: "Military",
      path: "../releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
      start: "# 6. Canonical Military card pool",
      end: "# 7. Quick reference",
      headingLevel: 2
    },
    diplomats: {
      label: "Diplomats",
      path: "../releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
      start: "# 7. Canonical Diplomat card pool",
      end: "# 8. Quick reference",
      headingLevel: 2
    },
    financiers: {
      label: "Financiers",
      path: "../releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
      start: "# 6. Canonical Financier card pool",
      end: "# 7. Quick reference",
      headingLevel: 2
    },
    intelligence: {
      label: "Intelligence",
      path: "../releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
      start: "# 7. Canonical Intelligence card pool",
      end: "# 8. Quick reference",
      headingLevel: 2
    },
    mystics: {
      label: "Mystics",
      path: "../releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
      start: "# 8. Canonical Mystics card pool",
      end: "# 9. Quick reference",
      headingLevel: 2
    },
    inquisition: {
      label: "Inquisition",
      path: "../releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
      start: "# 6. Canonical Inquisition card pool",
      end: "# 7. Quick reference",
      headingLevel: 2
    }
  });

  state.deckName = "Untitled v0.6.1 Deck";

  const originalNewDeckSnapshot = window.newDeckSnapshot;
  if (typeof originalNewDeckSnapshot === "function") {
    window.newDeckSnapshot = function newV061DeckSnapshot() {
      return {
        ...originalNewDeckSnapshot(),
        gameVersion: "v0.6.1"
      };
    };
  }

  window.addEventListener("DOMContentLoaded", () => {
    const nameInput = document.getElementById("deckName");
    if (nameInput && (!nameInput.value || nameInput.value === "Untitled v0.6 Deck")) {
      nameInput.value = state.deckName;
    }

    if (typeof STARTER_DECKS === "object" && STARTER_DECKS) {
      STARTER_DECKS.version = "v0.6.1";
      for (const deck of STARTER_DECKS.decks || []) deck.gameVersion = "v0.6.1";
    }

    const importButton = document.getElementById("importJsonButton");
    if (!importButton) return;
    const replacement = importButton.cloneNode(true);
    importButton.replaceWith(replacement);
    replacement.addEventListener("click", () => {
      const field = document.getElementById("importJson");
      try {
        const snapshot = JSON.parse(field.value);
        if (snapshot.gameVersion !== "v0.6.1") {
          throw new Error("This Deck was not exported from the v0.6.1 Deckbuilder. Open it in its original version instead of migrating it automatically.");
        }
        applyDeckData(snapshot);
        field.value = "";
      } catch (error) {
        window.alert(`Could not import Deck: ${error.message}`);
      }
    });
  });
})();
