(() => {
  const STORAGE_KEY = "gauntlet_standalone_onboarding_v1";
  const FACTION_PRESENTATION = Object.freeze({
    military: {
      name: "Military",
      summary: "Turn battlefield victories into Command, then spend it on movement, pressure, defense, and control.",
      leaders: [
        { id: "general", name: "General", portrait: "/images/general.png", summary: "Attack, build momentum, and press one victory into the next." },
        { id: "commandant", name: "Commandant", portrait: "/images/commandant.png", summary: "Absorb attacks, counterattack, and turn defense into control." }
      ]
    },
    diplomats: {
      name: "Diplomats",
      summary: "Use Influence, Terms, Proposals, concessions, and legitimacy to reshape the conflict.",
      leaders: [
        { id: "ambassador", name: "Ambassador", portrait: "/images/ambassador.png", summary: "Make attractive offers and gain value when the opponent accepts." },
        { id: "senator", name: "Senator", portrait: "/images/senator.png", summary: "Risk political capital, endure setbacks, and win the long negotiation." }
      ]
    },
    financiers: {
      name: "Financiers",
      summary: "Convert Capital, Treasury cards, Financial Capacity, Deeds, leverage, and ownership into strategic power.",
      leaders: [
        { id: "banker", name: "Banker", portrait: "/images/banker.png", summary: "Finance purchases flexibly and turn cards into collateral." },
        { id: "executive", name: "Executive", portrait: "/images/executive.png", summary: "Occupy enemy ground and convert battlefield gains into ownership." }
      ]
    },
    intelligence: {
      name: "Intelligence",
      summary: "Gather Intel, complete Missions, inspect hidden commitments, and disrupt enemy plans.",
      leaders: [
        { id: "ranger", name: "Ranger", portrait: "/images/ranger.png", summary: "Master terrain, fieldcraft, and adaptable operations." },
        { id: "spymaster", name: "Spymaster", portrait: "/images/spymaster.png", summary: "Chain Missions together and coordinate a faster covert campaign." }
      ]
    },
    mystics: {
      name: "Mystics",
      summary: "Perform Rites, invoke the Arcane, transform cards, and build toward ritual power.",
      leaders: [
        { id: "alchemist", name: "Alchemist", portrait: "/images/alchemist.png", summary: "Transmute cards deliberately and construct powerful combinations." },
        { id: "spirit-walker", name: "Spirit Walker", portrait: "/images/spirit%20walker.png", summary: "Protect begun Rites and the Ritual by sacrificing Arcane cards of sufficient value." }
      ]
    },
    inquisition: {
      name: "Inquisition",
      summary: "Build Conviction through condemnation, denial, Graveyard pressure, and Purge.",
      leaders: [
        { id: "grand-inquisitor", name: "Grand Inquisitor", portrait: "/images/grand%20inquisitor.png", summary: "Judge opposing cards and turn battle wins into efficient Purges." },
        { id: "witch-hunter", name: "Witch Hunter", portrait: "/images/witch%20hunter.png", summary: "Punish failed attacks, pursue retreating enemies, and suppress resources." }
      ]
    }
  });

  let currentAuthority = null;
  let FACTIONS = Object.freeze({});

  const state = {
    factionId: "",
    leaderId: "",
    introConfirmed: false,
    starterDecks: [],
    starterLoadError: null
  };

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    for (const id of [
      "leaderFieldset", "leaderPrompt", "leaderChoices", "selectedHeading", "selectedSummary",
      "starterPreview", "printForm", "printSelectionHeading", "printSelectionCopy", "introConfirmed",
      "openStarterDeck", "printStatus"
    ]) el[id] = document.getElementById(id);

    document.querySelectorAll('input[name="faction"]').forEach(input => {
      input.addEventListener("change", () => selectFaction(input.value));
    });
    el.introConfirmed.addEventListener("change", () => {
      state.introConfirmed = el.introConfirmed.checked;
      saveState();
      syncPrintAction();
    });
    el.printForm.addEventListener("submit", openGuidedDeckbuilder);
    installTrackedPlaytestAction();

    await loadCurrentAuthority();
    restoreState();
    renderChoice();
    await loadStarterDecks();
    renderChoice();
  }

  function installTrackedPlaytestAction() {
    if (!el.openStarterDeck || document.getElementById("startTrackedPlaytest")) return;
    const panel = document.createElement("div");
    panel.className = "tracked-playtest-start";
    panel.style.cssText = "margin-top:1rem;padding-top:1rem;border-top:1px solid var(--start-line)";
    panel.innerHTML = `
      <p style="margin:.1rem 0 .75rem;line-height:1.5"><strong>Track this playtest</strong><br><span style="color:#59625f">Create one tracked game, share the join link with your opponent, and record the result and separate player feedback. The next screen will use the in-person or remote mode you selected, or ask where you're playing.</span></p>
      <button id="startTrackedPlaytest" class="button primary" type="button" disabled>Create tracked playtest</button>`;
    el.openStarterDeck.after(panel);
    el.startTrackedPlaytest = document.getElementById("startTrackedPlaytest");
    el.startTrackedPlaytest.addEventListener("click", openTrackedPlaytest);
  }

  function selectFaction(factionId, preferredLeader = "") {
    const faction = FACTIONS[factionId];
    state.factionId = faction ? factionId : "";
    state.leaderId = faction?.leaders.some(leader => leader.id === preferredLeader)
      ? preferredLeader
      : "";
    renderChoice();
    saveState();
    document.getElementById("leaderFieldset")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderChoice() {
    const faction = FACTIONS[state.factionId];
    document.querySelectorAll('input[name="faction"]').forEach(input => {
      input.checked = input.value === state.factionId;
    });

    if (!faction) {
      el.leaderFieldset.disabled = true;
      el.leaderPrompt.textContent = "Choose a faction first.";
      el.leaderChoices.replaceChildren();
      el.selectedHeading.textContent = "Choose a faction and leader.";
      el.selectedSummary.textContent = "Your recommended first-game deck will appear here.";
      renderStarterPreview(null);
      syncPrintAction();
      return;
    }

    el.leaderFieldset.disabled = false;
    el.leaderPrompt.textContent = `Choose how you want to lead ${faction.name}.`;
    el.leaderChoices.replaceChildren();

    faction.leaders.forEach(leader => {
      const label = document.createElement("label");
      label.className = "leader-choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "leader";
      input.value = leader.id;
      input.checked = state.leaderId === leader.id;
      input.addEventListener("change", () => {
        state.leaderId = leader.id;
        saveState();
        renderChoice();
      });

      const portrait = document.createElement("img");
      portrait.className = "leader-portrait";
      portrait.src = leader.portrait;
      portrait.alt = "";
      portrait.loading = "lazy";
      portrait.decoding = "async";

      const copy = document.createElement("span");
      copy.className = "leader-copy";
      const name = document.createElement("strong");
      name.textContent = leader.name;
      const summary = document.createElement("small");
      summary.textContent = leader.summary;
      copy.append(name, summary);
      label.append(input, portrait, copy);
      el.leaderChoices.append(label);
    });

    const leader = selectedLeader();
    el.selectedHeading.textContent = leader
      ? `${leader.name} of the ${faction.name}`
      : `${faction.name} selected — choose a leader.`;
    el.selectedSummary.textContent = leader
      ? `${faction.summary} ${leader.summary}`
      : faction.summary;
    renderStarterPreview(selectedStarterDeck());
    syncPrintAction();
  }

  async function loadCurrentAuthority() {
    const response = await fetch("../game-data/current-game.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Current-game authority returned ${response.status}.`);
    const authority = await response.json();
    if (authority?.schemaVersion !== 2 || authority?.authority !== "current-game" || !authority?.version) {
      throw new Error("Start Playing requires the complete current-game authority.");
    }
    if (!Array.isArray(authority.gameplay?.factions) || !Array.isArray(authority.leaders)) {
      throw new Error("Current-game authority is missing factions or Leaders.");
    }
    currentAuthority = authority;

    FACTIONS = Object.freeze(Object.fromEntries(authority.gameplay.factions.map(faction => {
      const presentation = FACTION_PRESENTATION[faction.id] || {};
      const leaders = authority.leaders
        .filter(leader => leader.faction === faction.id)
        .map(leader => {
          const copy = presentation.leaders?.find(item => item.id === leader.id) || {};
          return {
            id: leader.id,
            name: leader.name,
            portrait: leader.image || copy.portrait || "",
            summary: copy.summary || leader.note || "",
          };
        });
      return [faction.id, Object.freeze({
        name: faction.name,
        summary: presentation.summary || "",
        leaders: Object.freeze(leaders),
      })];
    })));
  }

  async function loadStarterDecks() {
    try {
      const tipResponse = await fetch("../deckbuilder/starter-first-game-tips.json", { cache: "no-store" });
      if (!tipResponse.ok) throw new Error(`Starter tip library returned ${tipResponse.status}.`);
      const tipData = await tipResponse.json();
      const data = currentAuthority?.starterDecks;
      if (!data || !Array.isArray(data.decks)) {
        throw new Error("Current-game authority did not provide starter Deck data.");
      }
      const tips = tipData?.tips && typeof tipData.tips === "object" ? tipData.tips : {};
      state.starterDecks = data.decks.map(deck => ({
        ...deck,
        firstGameTip: deck.firstGameTip || tips[deck.id] || ""
      }));
      state.starterLoadError = null;
    } catch (error) {
      console.error(error);
      state.starterLoadError = error;
    }
  }

  function selectedLeader() {
    const faction = FACTIONS[state.factionId];
    return faction?.leaders.find(leader => leader.id === state.leaderId) || null;
  }

  function selectedStarterDeck() {
    return state.starterDecks.find(deck =>
      deck.factionId === state.factionId && deck.leaderId === state.leaderId
    ) || null;
  }

  function renderStarterPreview(deck) {
    if (state.starterLoadError) {
      el.starterPreview.className = "starter-preview empty-state";
      el.starterPreview.textContent = "The starter deck preview could not be loaded. You can still continue to the Deckbuilder after choosing a leader.";
      return;
    }
    if (!state.starterDecks.length) {
      el.starterPreview.className = "starter-preview empty-state";
      el.starterPreview.textContent = "Loading the starter deck library…";
      return;
    }
    if (!deck) {
      el.starterPreview.className = "starter-preview empty-state";
      el.starterPreview.textContent = state.leaderId
        ? "No matching starter deck was found."
        : "Choose a leader to preview the matching recommended deck.";
      return;
    }

    el.starterPreview.className = "starter-preview";
    el.starterPreview.innerHTML = `
      <p class="eyebrow">Recommended first-game deck</p>
      <h4>${escapeHtml(deck.name)}</h4>
      <div class="starter-meta"><span>${Number(deck.cardCount) || 30} cards</span><span>${Number(deck.deckbuildingValue) || 60}/60 value</span></div>
      <p>${escapeHtml(deck.summary)}</p>
      <p><strong>Territories, from your end outward:</strong> ${deck.territories.map(escapeHtml).join(" → ")}</p>
      <p><strong>First-game tip:</strong> ${escapeHtml(deck.firstGameTip)}</p>`;
  }

  function syncPrintAction() {
    const faction = FACTIONS[state.factionId];
    const leader = selectedLeader();
    const deck = selectedStarterDeck();
    const complete = Boolean(faction && leader && state.introConfirmed);

    el.introConfirmed.checked = state.introConfirmed;
    el.openStarterDeck.disabled = !complete;
    if (el.startTrackedPlaytest) el.startTrackedPlaytest.disabled = !complete;
    el.printSelectionHeading.textContent = faction && leader
      ? `${leader.name} of the ${faction.name}`
      : "Choose a faction and leader first.";
    el.printSelectionCopy.textContent = faction && leader
      ? deck
        ? `${deck.name} will load automatically in the Deckbuilder. Your choice is saved in this browser.`
        : "The matching starter deck will load automatically in the Deckbuilder. Your choice is saved in this browser."
      : "Your selection is saved in this browser as you work.";
  }

  function openGuidedDeckbuilder(event) {
    event.preventDefault();
    const faction = FACTIONS[state.factionId];
    const leader = selectedLeader();
    if (!faction || !leader) {
      setStatus("Choose a faction and leader before continuing.", "error");
      document.getElementById("choose")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!el.introConfirmed.checked) {
      setStatus("Confirm that you read the First Game Introduction.", "error");
      el.introConfirmed.focus();
      return;
    }

    saveState();
    const url = new URL("../deckbuilder/", window.location.href);
    url.searchParams.set("faction", state.factionId);
    url.searchParams.set("leader", state.leaderId);
    url.searchParams.set("starter", "1");
    url.searchParams.set("source", "start");
    window.location.assign(url.href);
  }

  function openTrackedPlaytest() {
    const faction = FACTIONS[state.factionId];
    const leader = selectedLeader();
    if (!faction || !leader || !state.introConfirmed) {
      setStatus("Choose a faction and Leader and confirm the First Game Introduction before tracking a game.", "error");
      return;
    }
    saveState();
    const url = new URL("../playtest/tracked/", window.location.href);
    const currentParams = new URLSearchParams(window.location.search);
    url.searchParams.set("source", "start");
    const mode = currentParams.get("mode");
    if (mode === "physical" || mode === "tts") url.searchParams.set("mode", mode);
    window.location.assign(url.href);
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      if (FACTIONS[saved.factionId]) state.factionId = saved.factionId;
      const faction = FACTIONS[state.factionId];
      if (faction?.leaders.some(leader => leader.id === saved.leaderId)) state.leaderId = saved.leaderId;
      state.introConfirmed = saved.introConfirmed === true;
    } catch {
      // A damaged local preference should not block onboarding.
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        factionId: state.factionId,
        leaderId: state.leaderId,
        introConfirmed: state.introConfirmed,
        updatedAt: new Date().toISOString()
      }));
    } catch {
      // The flow remains usable when browser storage is unavailable.
    }
  }

  function setStatus(message, kind = "") {
    el.printStatus.textContent = message;
    el.printStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
