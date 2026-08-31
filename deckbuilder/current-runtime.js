(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state, factions: FACTIONS, sources: SOURCES } = deckbuilder;

  const RELEASED_MODE = "released";
  const CANDIDATE_MODE = "candidate";
  const requestedRulesetMode = new URLSearchParams(window.location.search).get("rules") === CANDIDATE_MODE
    ? CANDIDATE_MODE
    : RELEASED_MODE;
  let currentGamePromise = null;
  let hydrated = false;

  function currentGame() {
    if (!currentGamePromise) {
      currentGamePromise = import("../game-data/ruleset.mjs")
        .then(async module => {
          state.deckStorageKey = requestedRulesetMode === CANDIDATE_MODE
            ? "gauntlet-current-game-decks"
            : `gauntlet-${module.PUBLISHED_VERSION}-decks`;
          const data = await module.loadGameRuleset(requestedRulesetMode);
          deckbuilder.setRuleset({
            mode: requestedRulesetMode,
            publishedVersion: module.PUBLISHED_VERSION,
            loadGame: () => currentGame(),
          });
          return data;
        })
        .then(data => {
          state.currentGameData = data;
          state.currentGameVersion = data.version;
          state.currentGameDisplayVersion = data.displayVersion;
          state.currentGameAuthority = data.authorityUrl;
          hydrateFactions(data);
          return data;
        });
    }
    return currentGamePromise;
  }

  function leaderRules(leader) {
    return (Array.isArray(leader.sections) ? leader.sections : []).map(section => {
      const label = section?.name || "Leader Ability";
      const text = section?.text || (Array.isArray(section?.items)
        ? section.items.map(item => `${item.name}: ${item.text}${item.cost ? ` Cost: ${item.cost}.` : ""}`).join(" ")
        : "");
      return [label, section?.cost ? `${text} Cost: ${section.cost}.` : text];
    });
  }

  function hydrateFactions(data) {
    if (hydrated) return;
    hydrated = true;
    FACTIONS.splice(0, FACTIONS.length, ...(data.factions || []).map(faction => ({
      id: faction.id,
      name: faction.name,
      status: "ready",
      identity: faction.identity || "",
      resource: faction.resource || "",
      victory: faction.victory || "",
      leaders: (faction.leaders || []).map(leader => ({
        id: leader.id || deckbuilder.slugify(leader.name),
        name: leader.name,
        tagline: leader.note || "",
        role: leader.note || `${faction.name} Leader`,
        rules: leaderRules(leader)
      }))
    })));
    if (!FACTIONS.some(faction => faction.id === state.factionId)) {
      state.factionId = FACTIONS[0]?.id || "";
    }
    const selected = FACTIONS.find(faction => faction.id === state.factionId);
    if (selected && !selected.leaders.some(leader => leader.id === state.leaderId)) {
      state.leaderId = selected.leaders[0]?.id || "";
    }
  }

  const sourceFor = (id, label) => ({ label, path: "/game-data/current-game.json", canonicalFaction: id });
  Object.assign(SOURCES, {
    neutral: sourceFor("neutral", "Neutral"),
    military: sourceFor("military", "Military"),
    diplomats: sourceFor("diplomats", "Diplomats"),
    financiers: sourceFor("financiers", "Financiers"),
    intelligence: sourceFor("intelligence", "Intelligence"),
    mystics: sourceFor("mystics", "Mystics"),
    inquisition: sourceFor("inquisition", "Inquisition")
  });

  deckbuilder.setSourceLoader(async function loadCurrentGameSource([faction, source]) {
    const data = await currentGame();
    return (data.cards || [])
      .filter(card => deckbuilder.slugify(card.allegiance || "Neutral") === faction)
      .map(card => ({
        id: card.id || `${faction}-${deckbuilder.slugify(card.name)}`,
        name: card.name,
        faction,
        factionLabel: card.allegiance || source.label,
        cost: Number(card.cost),
        complexity: card.complexity || "",
        trait: card.trait || "",
        form: card.card_form || "",
        unique: Boolean(card.unique),
        sections: Object.fromEntries((card.effects || []).map(effect => [effect.label || "Text", effect.text || ""])),
        source: `../card-reference/#${encodeURIComponent(card.id)}`
      }));
  });

  function deckHasWorkInProgress() {
    const territories = deckbuilder.feature("territories");
    const rites = deckbuilder.feature("mysticsRites");
    return Boolean(
      Object.keys(state.deck || {}).length
      || territories?.selectedIds?.().length
      || (rites?.selectionEnabled?.() && rites.selectedIds?.().length)
      || (state.deckName && state.deckName !== "Untitled Gauntlet Deck")
    );
  }

  function switchRuleset(nextMode) {
    if (nextMode === requestedRulesetMode) return;
    if (
      deckHasWorkInProgress()
      && !window.confirm("Switching rulesets reloads the Deckbuilder and clears the unsaved deck on this page. Save or export it first if you want to keep it. Continue?")
    ) return;

    const url = new URL(window.location.href);
    if (nextMode === CANDIDATE_MODE) url.searchParams.set("rules", CANDIDATE_MODE);
    else url.searchParams.delete("rules");
    window.location.assign(url);
  }

  async function installRulesetUi(selectedGame) {
    const module = await import("../game-data/ruleset.mjs");
    let candidateGame = null;
    try { candidateGame = await module.loadCurrentCandidateGame(); }
    catch (error) { console.warn("Unable to detect a release candidate for the Deckbuilder.", error); }

    const distinctCandidate = Boolean(candidateGame?.version && candidateGame.version !== module.PUBLISHED_VERSION);
    const switcher = document.querySelector("[data-ruleset-switch]");
    const note = document.querySelector("[data-candidate-rules-note]");
    const candidateVersion = document.querySelector("[data-candidate-version]");
    const buttons = [...document.querySelectorAll("[data-ruleset]")];

    if (switcher) switcher.hidden = !distinctCandidate;
    if (candidateVersion) candidateVersion.textContent = candidateGame?.displayVersion || "Current candidate";
    document.body.dataset.rulesetMode = requestedRulesetMode;
    buttons.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.ruleset === requestedRulesetMode));
      button.addEventListener("click", () => switchRuleset(button.dataset.ruleset === CANDIDATE_MODE ? CANDIDATE_MODE : RELEASED_MODE));
    });

    if (note) {
      note.hidden = requestedRulesetMode !== CANDIDATE_MODE;
      note.textContent = requestedRulesetMode === CANDIDATE_MODE
        ? `Candidate view: Deck construction, starter packages, faction components, and printing use ${selectedGame.displayVersion}. Saved Decks are kept separately from Released ${module.PUBLISHED_VERSION}.`
        : "";
    }
  }

  deckbuilder.setAuthorityBootstrap(currentGame);

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const data = await currentGame();
      await installRulesetUi(data);
      document.title = `Gauntlet ${data.displayVersion} Deckbuilder`;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = `Build, validate, save, and print a Gauntlet ${data.displayVersion} Deck.`;
      const eyebrow = document.querySelector(".tool-hero .eyebrow");
      if (eyebrow) eyebrow.textContent = requestedRulesetMode === CANDIDATE_MODE
        ? `Release candidate deck rules · ${data.displayVersion}`
        : `Released deck rules · ${data.displayVersion}`;
      const importField = document.getElementById("importJson");
      if (importField) importField.placeholder = `Paste an exported ${data.displayVersion} Deck JSON here`;
    } catch (error) {
      console.error("Unable to initialize current-game Deckbuilder metadata", error);
    }
  });
})();