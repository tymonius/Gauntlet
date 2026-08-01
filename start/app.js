(() => {
  const STORAGE_KEY = "gauntlet_standalone_onboarding_v1";
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const params = new URLSearchParams(window.location.search);
  const requestCode = String(params.get("request") || "").trim();
  const requestLabel = cleanText(params.get("label") || "", 120);
  const requestDeadline = cleanDate(params.get("deadline") || "");
  const requestStorageKey = TOKEN_PATTERN.test(requestCode)
    ? `gauntlet_deck_request_${requestCode.slice(0, 16)}`
    : "";

  const FACTIONS = Object.freeze({
    military: {
      name: "Military",
      summary: "Turn battlefield victories into Command, then spend it on movement, pressure, defense, and control.",
      leaders: [
        { id: "general", name: "General", summary: "Attack, build momentum, and press one victory into the next." },
        { id: "commandant", name: "Commandant", summary: "Absorb attacks, counterattack, and turn defense into control." }
      ]
    },
    diplomats: {
      name: "Diplomats",
      summary: "Use Influence, Terms, Proposals, concessions, and legitimacy to reshape the conflict.",
      leaders: [
        { id: "ambassador", name: "Ambassador", summary: "Make attractive offers and gain value when the opponent accepts." },
        { id: "senator", name: "Senator", summary: "Risk political capital, endure setbacks, and win the long negotiation." }
      ]
    },
    financiers: {
      name: "Financiers",
      summary: "Convert Capital, Treasury cards, Deeds, leverage, and ownership into strategic power.",
      leaders: [
        { id: "banker", name: "Banker", summary: "Finance purchases flexibly and turn cards into collateral." },
        { id: "executive", name: "Executive", summary: "Occupy enemy ground and convert battlefield gains into ownership." }
      ]
    },
    intelligence: {
      name: "Intelligence",
      summary: "Gather Intel, complete Missions, inspect hidden commitments, and disrupt enemy plans.",
      leaders: [
        { id: "ranger", name: "Ranger", summary: "Master terrain, fieldcraft, and adaptable operations." },
        { id: "spymaster", name: "Spymaster", summary: "Chain Missions together and coordinate a faster covert campaign." }
      ]
    },
    mystics: {
      name: "Mystics",
      summary: "Perform Rites, invoke the Arcane, transform cards, and build toward ritual power.",
      leaders: [
        { id: "alchemist", name: "Alchemist", summary: "Transmute cards deliberately and construct powerful combinations." },
        { id: "spirit-walker", name: "Spirit Walker", summary: "Advance ritual progression through invocation and spiritual momentum." }
      ]
    },
    inquisition: {
      name: "Inquisition",
      summary: "Build Conviction through condemnation, denial, Graveyard pressure, and Purge.",
      leaders: [
        { id: "grand-inquisitor", name: "Grand Inquisitor", summary: "Judge opposing cards and turn battle wins into efficient Purges." },
        { id: "witch-hunter", name: "Witch Hunter", summary: "Punish failed attacks, pursue retreating enemies, and suppress resources." }
      ]
    }
  });

  const state = {
    factionId: "",
    leaderId: "",
    introConfirmed: false,
    starterDecks: [],
    starterLoadError: null,
    requestSession: null,
    requestLoadError: null,
    savedRequest: null
  };

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    for (const id of [
      "leaderFieldset", "leaderPrompt", "leaderChoices", "selectedHeading", "selectedSummary",
      "starterPreview", "printForm", "printSelectionHeading", "printSelectionCopy", "introConfirmed",
      "openStarterDeck", "printStatus"
    ]) el[id] = document.getElementById(id);

    if (TOKEN_PATTERN.test(requestCode)) installDeckRequestPanel();

    document.querySelectorAll('input[name="faction"]').forEach(input => {
      input.addEventListener("change", () => selectFaction(input.value));
    });
    el.introConfirmed.addEventListener("change", () => {
      state.introConfirmed = el.introConfirmed.checked;
      saveState();
      syncPrintAction();
    });
    el.printForm.addEventListener("submit", openGuidedDeckbuilder);
    el.deckRequestForm?.addEventListener("submit", submitDeckRequest);
    el.requestDisplayName?.addEventListener("input", syncPrintAction);
    el.requestNote?.addEventListener("input", saveRequestDraft);

    restoreState();
    restoreRequestState();
    renderChoice();
    await Promise.all([loadStarterDecks(), loadRequestSession()]);
    renderChoice();
  }

  function installDeckRequestPanel() {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("deck-request.css?v=20260731-1", window.location.href).href;
    document.head.append(stylesheet);

    const printGrid = document.querySelector(".print-grid");
    if (!printGrid || !el.printForm) return;
    const stack = document.createElement("div");
    stack.className = "print-actions-stack";
    el.printForm.replaceWith(stack);
    stack.append(el.printForm);

    const requestForm = document.createElement("form");
    requestForm.id = "deckRequestForm";
    requestForm.className = "deck-request-card";
    requestForm.noValidate = true;
    requestForm.innerHTML = `
      <p class="eyebrow">Host-prepared option</p>
      <h3>Have the host prepare this Deck.</h3>
      <p id="requestListContext" class="deck-request-context">Checking the Deck Prep link…</p>
      <label class="field" for="requestDisplayName">Your name
        <input id="requestDisplayName" type="text" maxlength="80" autocomplete="name" required placeholder="Name the host will recognize" />
      </label>
      <label class="field" for="requestNote">Note for the host <small>optional</small>
        <textarea id="requestNote" rows="3" maxlength="500" placeholder="Pickup details, accessibility needs, or anything else relevant to preparation"></textarea>
      </label>
      <button id="submitDeckRequest" class="button primary" type="submit" disabled>Send my Deck request</button>
      <p id="deckRequestStatus" class="form-status" aria-live="polite"></p>
      <div id="deckRequestSuccess" class="deck-request-success" hidden tabindex="-1">
        <h4 id="deckRequestSuccessHeading">Request sent.</h4>
        <p id="deckRequestSuccessCopy"></p>
      </div>`;
    stack.append(requestForm);

    for (const id of [
      "deckRequestForm", "requestListContext", "requestDisplayName", "requestNote", "submitDeckRequest",
      "deckRequestStatus", "deckRequestSuccess", "deckRequestSuccessHeading", "deckRequestSuccessCopy"
    ]) el[id] = document.getElementById(id);
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

      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = leader.name;
      const summary = document.createElement("small");
      summary.textContent = leader.summary;
      copy.append(name, summary);
      label.append(input, copy);
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

  async function loadStarterDecks() {
    try {
      const response = await fetch("../deckbuilder/starter-decks.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Starter deck library returned ${response.status}.`);
      const data = await response.json();
      state.starterDecks = Array.isArray(data.decks) ? data.decks : [];
      state.starterLoadError = null;
    } catch (error) {
      console.error(error);
      state.starterLoadError = error;
    }
  }

  async function loadRequestSession() {
    if (!TOKEN_PATTERN.test(requestCode) || !el.deckRequestForm) return;
    try {
      const response = await fetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(requestCode)}`, { cache: "no-store" });
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || `Deck Prep link failed (${response.status}).`);
      if (payload.sessionKind !== "event") throw new Error("This link is not a Deck Prep request list.");
      state.requestSession = payload;
      state.requestLoadError = null;
      renderRequestContext();
    } catch (error) {
      console.error(error);
      state.requestLoadError = error;
      renderRequestContext();
    }
  }

  function renderRequestContext() {
    if (!el.requestListContext) return;
    if (state.requestLoadError) {
      el.requestListContext.className = "deck-request-closed";
      el.requestListContext.textContent = "This Deck Prep link could not be opened. You can still print the selected Deck yourself.";
      setRequestStatus(state.requestLoadError.message || "Deck request unavailable.", "error");
      syncPrintAction();
      return;
    }

    const label = requestLabel || state.requestSession?.sheetSerial || "this Deck Prep list";
    const deadline = requestDeadline ? ` Requests are requested by ${formatDate(requestDeadline)}.` : "";
    if (state.requestSession?.status === "closed") {
      el.requestListContext.className = "deck-request-closed";
      el.requestListContext.textContent = `${label} is no longer accepting requests or revisions. You can still print the selected Deck yourself.`;
    } else {
      el.requestListContext.className = "deck-request-context";
      el.requestListContext.textContent = `The host of ${label} has offered to print and prepare your selected starter Deck.${deadline}`;
    }
    syncPrintAction();
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
    el.printSelectionHeading.textContent = faction && leader
      ? `${leader.name} of the ${faction.name}`
      : "Choose a faction and leader first.";
    el.printSelectionCopy.textContent = faction && leader
      ? deck
        ? `${deck.name} will load automatically in the Deckbuilder. Your choice is saved in this browser.`
        : "The matching starter deck will load automatically in the Deckbuilder. Your choice is saved in this browser."
      : "Your selection is saved in this browser as you work.";

    if (el.submitDeckRequest) {
      const nameReady = Boolean(el.requestDisplayName?.value.trim());
      const requestOpen = state.requestSession?.status === "open" && !state.requestLoadError;
      el.submitDeckRequest.disabled = !(complete && nameReady && requestOpen);
    }
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

  async function submitDeckRequest(event) {
    event.preventDefault();
    const faction = FACTIONS[state.factionId];
    const leader = selectedLeader();
    const displayName = cleanText(el.requestDisplayName?.value || "", 80);
    if (!faction || !leader) {
      setRequestStatus("Choose a faction and leader before requesting preparation.", "error");
      document.getElementById("choose")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!state.introConfirmed) {
      setRequestStatus("Confirm that you read the First Game Introduction.", "error");
      el.introConfirmed.focus();
      return;
    }
    if (!displayName) {
      setRequestStatus("Enter the name the host will recognize.", "error");
      el.requestDisplayName.focus();
      return;
    }
    if (state.requestSession?.status !== "open") {
      setRequestStatus("This Deck Prep list is no longer accepting requests.", "error");
      return;
    }

    setRequestBusy(true);
    setRequestStatus(state.savedRequest?.participantId ? "Updating your Deck request…" : "Sending your Deck request…");
    try {
      let participantId = state.savedRequest?.participantId || "";
      let participantToken = state.savedRequest?.participantToken || "";
      if (!participantId) {
        const joined = await joinDeckRequest(displayName);
        participantId = joined.participantId;
        participantToken = joined.participantToken || "";
      }

      try {
        await recordDeckChoice(participantId, displayName, leader.name);
      } catch (error) {
        if (error.status !== 404 || !state.savedRequest?.participantId) throw error;
        const joined = await joinDeckRequest(displayName);
        participantId = joined.participantId;
        participantToken = joined.participantToken || "";
        await recordDeckChoice(participantId, displayName, leader.name);
      }

      state.savedRequest = {
        participantId,
        participantToken,
        displayName,
        note: cleanText(el.requestNote?.value || "", 500),
        updatedAt: new Date().toISOString()
      };
      saveRequestState();
      showRequestSuccess(faction, leader, selectedStarterDeck());
      setRequestStatus("Your latest choice is now on the host's preparation list.", "success");
      el.submitDeckRequest.textContent = "Update my Deck request";
    } catch (error) {
      console.error(error);
      setRequestStatus(error.message || "Your Deck request could not be sent.", "error");
    } finally {
      setRequestBusy(false);
      syncPrintAction();
    }
  }

  async function joinDeckRequest(displayName) {
    const response = await fetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(requestCode)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "onboarding", role: "player", displayName })
    });
    const payload = await safeJson(response);
    if (!response.ok) throw httpError(payload?.error || `Deck request registration failed (${response.status}).`, response.status);
    return payload;
  }

  async function recordDeckChoice(participantId, displayName, leaderName) {
    const response = await fetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(requestCode)}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "onboarding_choice",
        data: {
          participantId,
          displayName,
          faction: state.factionId,
          leader: leaderName,
          reason: cleanText(el.requestNote?.value || "", 500),
          introConfirmed: true
        }
      })
    });
    const payload = await safeJson(response);
    if (!response.ok) throw httpError(payload?.error || `Deck request failed (${response.status}).`, response.status);
    return payload;
  }

  function showRequestSuccess(faction, leader, deck) {
    el.deckRequestSuccess.hidden = false;
    el.deckRequestSuccessHeading.textContent = "Deck request sent.";
    el.deckRequestSuccessCopy.textContent = `${leader.name} of the ${faction.name}${deck ? ` — ${deck.name}` : ""} is on the host's preparation list. Reopen this same link to revise the request before it closes.`;
    el.deckRequestSuccess.focus({ preventScroll: true });
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

  function restoreRequestState() {
    if (!requestStorageKey || !el.requestDisplayName) return;
    try {
      const saved = JSON.parse(localStorage.getItem(requestStorageKey) || "null");
      if (!saved || typeof saved !== "object") return;
      state.savedRequest = saved;
      el.requestDisplayName.value = cleanText(saved.displayName || "", 80);
      el.requestNote.value = cleanText(saved.note || "", 500);
      if (saved.participantId) el.submitDeckRequest.textContent = "Update my Deck request";
    } catch {
      // A damaged request draft should not block self-printing or a fresh request.
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

  function saveRequestDraft() {
    if (!requestStorageKey) return;
    state.savedRequest = {
      ...(state.savedRequest || {}),
      displayName: cleanText(el.requestDisplayName?.value || "", 80),
      note: cleanText(el.requestNote?.value || "", 500),
      updatedAt: new Date().toISOString()
    };
    saveRequestState();
  }

  function saveRequestState() {
    if (!requestStorageKey || !state.savedRequest) return;
    try { localStorage.setItem(requestStorageKey, JSON.stringify(state.savedRequest)); } catch { /* Request still reaches the host. */ }
  }

  function setRequestBusy(busy) {
    if (!el.submitDeckRequest) return;
    el.requestDisplayName.disabled = busy;
    el.requestNote.disabled = busy;
    el.submitDeckRequest.disabled = busy;
  }

  function setStatus(message, kind = "") {
    el.printStatus.textContent = message;
    el.printStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function setRequestStatus(message, kind = "") {
    if (!el.deckRequestStatus) return;
    el.deckRequestStatus.textContent = message;
    el.deckRequestStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  async function safeJson(response) {
    try { return await response.json(); } catch { return null; }
  }

  function httpError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  function cleanText(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
  }

  function cleanDate(value) {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
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
