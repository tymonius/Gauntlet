(() => {
  SOURCES.mystics = {
    label: "Mystics",
    path: "../releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md",
    start: "## 7. Canonical Mystics card pool",
    end: "## 8. Package summary and development watchlist",
    headingLevel: 3
  };

  const mystics = {
    id: "mystics",
    name: "Mystics",
    status: "ready",
    identity: "Rites, sacrifice, Graveyard transformation, and Arcane cards.",
    resource: "Ritual progression: Invocation after the first Rite; Transmutation after the second",
    victory: "Ritual: complete all three Rites, or Run the Gauntlet.",
    leaders: [
      {
        id: "alchemist",
        name: "Alchemist",
        tagline: "Nothing is fixed. Everything can be transformed.",
        role: "Sacrifice sequencing · Card conversion · Transformation",
        rules: [
          ["Rites", "During the Action phase after movement, instead of playing an Action card, begin one incomplete Rite by paying its beginning cost. You may have only one begun Rite at a time."],
          ["Materia Prima", "The first time on your turn that you send a card from your hand to your Graveyard as part of a Rite, Transmutation, or an Arcane card ability, draw one card. If this happens during battle, draw after the battle resolves."],
          ["Invocation", "After your first completed Rite, once per turn when you play an Arcane card, you may move one card from your Graveyard to your discard pile."],
          ["Transmutation", "After your second completed Rite, once per turn before dice in a battle involving you, send one hand card to your Graveyard and add its deckbuilding value to your battle total."],
          ["Ritual", "Complete all three Rites to win immediately."]
        ]
      },
      {
        id: "spirit-walker",
        name: "Spirit Walker",
        tagline: "The spirits remember what the living abandon.",
        role: "Ritual endurance · Protective sacrifice · Graveyard communion",
        rules: [
          ["Rites", "During the Action phase after movement, instead of playing an Action card, begin one incomplete Rite by paying its beginning cost. You may have only one begun Rite at a time."],
          ["Guardians of the Circle", "The first time on your turn that you lose a battle and a begun Rite would be interrupted, you may send one Arcane card from your hand to your Graveyard. If you do, that Rite is not interrupted. This cannot preserve Rite of Crossing if you no longer occupy or control its required Territory."],
          ["Invocation", "After your first completed Rite, once per turn when you play an Arcane card, you may move one card from your Graveyard to your discard pile."],
          ["Transmutation", "After your second completed Rite, once per turn before dice in a battle involving you, send one hand card to your Graveyard and add its deckbuilding value to your battle total."],
          ["Ritual", "Complete all three Rites to win immediately."]
        ]
      }
    ]
  };

  const existingIndex = FACTIONS.findIndex(faction => faction.id === "mystics");
  if (existingIndex >= 0) FACTIONS.splice(existingIndex, 1, mystics);
  else FACTIONS.splice(3, 0, mystics);
})();
