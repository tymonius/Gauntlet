(() => {
  const RELEASED_MODE = "released";
  const CANDIDATE_MODE = "candidate";
  const PUBLISHED_VERSION = "v0.7.1";
  const requestedRulesetMode = new URLSearchParams(window.location.search).get("rules") === CANDIDATE_MODE
    ? CANDIDATE_MODE
    : RELEASED_MODE;
  const oldStorageKey = "gauntlet-v0.6.1-decks";
  const releaseStorageKey = "gauntlet-v0.6.3-decks";
  const storageKey = requestedRulesetMode === CANDIDATE_MODE
    ? "gauntlet-current-game-decks"
    : "gauntlet-v0.7.1-decks";
  let currentGamePromise = null;
  let hydrated = false;

  const originalStorage = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem
  };
  const mappedKey = key => [oldStorageKey, releaseStorageKey].includes(key) ? storageKey : key;
  Storage.prototype.getItem = function (key) { return originalStorage.getItem.call(this, mappedKey(key)); };
  Storage.prototype.setItem = function (key, value) { return originalStorage.setItem.call(this, mappedKey(key), value); };
  Storage.prototype.removeItem = function (key) { return originalStorage.removeItem.call(this, mappedKey(key)); };

  function currentGame() {
    if (!currentGamePromise) {
      currentGamePromise = import("../game-data/ruleset.mjs")
        .then(async module => {
          const data = await module.loadGameRuleset(requestedRulesetMode);
          window.GAUNTLET_DECKBUILDER_RULESET = Object.freeze({
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
          window.GAUNTLET_CURRENT_GAME_DATA = data;
          hydrateFactions(data);
          return data;
        });
    }
    return currentGamePromise;
  }

  function leaderRules(leader) {
    return (Array.isArray(leader.sections) ? leader.sections : []).map(section => {
      if (Array.isArray(section)) {
        const [label, text, cost] = section;
        return [label, cost ? `${text} Cost: ${cost}.` : text];
      }
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
    for (const published of data.factions || []) {
      const target = FACTIONS.find(faction => faction.id === published.id);
      if (!target) continue;
      target.status = "ready";
      target.resource = published.resource || target.resource;
      target.victory = published.victory || target.victory;
      target.leaders = (published.leaders || []).map(leader => ({
        id: leader.id || slugify(leader.name),
        name: leader.name,
        tagline: leader.note || "",
        role: leader.note || `${published.name} Leader`,
        rules: leaderRules(leader)
      }));
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

  loadSource = async function loadCurrentGameSource([faction, source]) {
    const data = await currentGame();
    return (data.cards || [])
      .filter(card => slugify(card.allegiance || "Neutral") === faction)
      .map(card => ({
        id: card.id || `${faction}-${slugify(card.name)}`,
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
  };

  state.deckName = "Untitled Gauntlet Deck";

  const baseCurrentDeckData = currentDeckData;
  currentDeckData = function currentAuthorityDeckData() {
    const data = baseCurrentDeckData();
    data.gameVersion = state.currentGameVersion || "current-game";
    data.gameAuthority = state.currentGameAuthority || "/game-data/current-game.json";
    if (!data.name || /^Untitled v0\.6\.[123] Deck$/.test(data.name)) data.name = "Untitled Gauntlet Deck";
    return data;
  };

  const baseRenderLeader = renderLeader;
  renderLeader = function renderCurrentLeader() {
    const faction = getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);
    if (!leader) return baseRenderLeader();
    el.leaderPreview.className = "leader-preview";
    el.leaderPreview.innerHTML = `
      <h3>${escapeHtml(leader.name)} <span class="mini-pill">${escapeHtml(faction.name)}</span></h3>
      <p><strong>${escapeHtml(leader.role || "Leader")}</strong></p>
      <p>${escapeHtml(faction.identity || "")} <strong>Resource:</strong> ${escapeHtml(faction.resource || "")} <strong>Victory:</strong> ${escapeHtml(faction.victory || "")}</p>
      <p class="muted">The printed Leader and all current rules are supplied by the current-game authority.</p>
    `;
  };

  function deckHasWorkInProgress() {
    return Boolean(
      Object.keys(state.deck || {}).length
      || state.territories?.length
      || (state.riteSelectionEnabled && state.rites?.length)
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
      const nameInput = document.getElementById("deckName");
      if (nameInput && (!nameInput.value || /^Untitled v0\.6\.[123] Deck$/.test(nameInput.value))) nameInput.value = state.deckName;
      const importField = document.getElementById("importJson");
      if (importField) importField.placeholder = `Paste an exported ${data.displayVersion} Deck JSON here`;
    } catch (error) {
      console.error("Unable to initialize current-game Deckbuilder metadata", error);
    }

    const importButton = document.getElementById("importJsonButton");
    if (importButton) {
      const replacement = importButton.cloneNode(true);
      importButton.replaceWith(replacement);
      replacement.addEventListener("click", () => {
        const field = document.getElementById("importJson");
        try {
          const snapshot = JSON.parse(field.value);
          const currentVersion = state.currentGameVersion || "current-game";
          if (snapshot.gameVersion && snapshot.gameVersion !== currentVersion) {
            throw new Error(`This Deck was exported for ${snapshot.gameVersion}; current authority is ${currentVersion}.`);
          }
          snapshot.gameVersion = currentVersion;
          applyDeckData(snapshot);
          field.value = "";
        } catch (error) {
          window.alert(`Could not import Deck: ${error.message}`);
        }
      });
    }
  });
})();
