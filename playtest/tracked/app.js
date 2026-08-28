(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const START_STORAGE_KEY = "gauntlet_standalone_onboarding_v1";
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  const suppliedHostKey = String(params.get("host") || "").trim();
  const requestedPlayMode = ["physical", "tts"].includes(params.get("mode")) ? params.get("mode") : "";
  const creationSource = params.get("source") === "start" ? "start" : "tracked-page";
  const storagePrefix = TOKEN_PATTERN.test(code) ? `gauntlet_tracked_${code.slice(0, 16)}` : "gauntlet_tracked_new";
  const nativeFetch = window.fetch.bind(window);

  const FACTIONS = Object.freeze({
    military: { name: "Military", color: "#9e262c", leaders: { general: "General", commandant: "Commandant" } },
    diplomats: { name: "Diplomats", color: "#264f91", leaders: { ambassador: "Ambassador", senator: "Senator" } },
    financiers: { name: "Financiers", color: "#227044", leaders: { banker: "Banker", executive: "Executive" } },
    intelligence: { name: "Intelligence", color: "#282827", leaders: { ranger: "Ranger", spymaster: "Spymaster" } },
    mystics: { name: "Mystics", color: "#5d347e", leaders: { alchemist: "Alchemist", "spirit-walker": "Spirit Walker" } },
    inquisition: { name: "Inquisition", color: "#a67a27", leaders: { "grand-inquisitor": "Grand Inquisitor", "witch-hunter": "Witch Hunter" } }
  });
  const RATINGS = Object.freeze([
    ["expectationMatch", "Expectation matched play", "Did the faction page accurately represent the experience?"],
    ["leaderDistinction", "Leader felt distinct", "Did this Leader create a meaningful identity?"],
    ["fun", "Overall fun", "How enjoyable was the game?"],
    ["pacing", "Pacing", "How well did the game move?"],
    ["meaningfulDecisions", "Meaningful decisions", "How often did choices feel consequential?"],
    ["battleTension", "Battle tension", "How engaging were confrontations?"],
    ["rulesClarity", "Rules clarity", "How understandable was the shared game?"],
    ["factionClarity", "Faction clarity", "How understandable was your faction and Leader?"],
    ["tableOrganization", "Table organization", "How manageable were cards, zones, and components?"]
  ]);

  const state = {
    session: null,
    participant: readJsonStorage(`${storagePrefix}_participant`),
    hostKey: suppliedHostKey || readStorage(`${storagePrefix}_host`),
    review: null,
    qrReady: false
  };
  const el = {};

  installRulesInteractionLinker();
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    for (const id of [
      "loadingPanel", "errorPanel", "errorTitle", "errorMessage", "createPanel", "createForm",
      "createName", "createPlayMode", "createFaction", "createLeader", "createSelectionReason", "savedChoiceNote", "createStatus", "sessionApp",
      "sessionSerial", "lifecycleCopy", "statusLabel", "playerCount", "arbiterCount", "responseCount",
      "sharePanel", "copyJoinLink", "shareJoinLink", "shareStatus", "qrCode", "playerCards",
      "transportPanel", "transportEyebrow", "transportTitle", "transportCopy", "transportMatchup",
      "ttsWorkshopLink", "physicalSetupLink", "transportReferences", "joinPanel",
      "joinForm", "joinName", "joinFaction", "joinLeader", "joinSelectionReason", "joinStatus", "joinedPanel", "joinedHeading",
      "joinedCopy", "openArbiter", "companionArbiter", "playPanel", "recordStart", "showCompletedResult", "showStoppedResult",
      "diagnosticPanel", "diagnosticStatus", "noteForm", "noteText", "eventStatus", "resultSection", "resultForm", "completionStatus",
      "firstPlayer", "winnerLabel", "winner", "victoryRouteLabel", "victoryRoute", "durationMinutes",
      "rounds", "battles", "stopReasonLabel", "stopReason", "packageUnmodified", "variantUsed",
      "productionIssue", "strongestMoment", "confusingPoint", "importantObservation", "resultStatus",
      "responseSection", "responseForm", "legacySelectionReasonField", "legacySelectionReason", "ratingGrid", "feltDecidedWhen",
      "agencyAfterDecided", "decisiveCause", "playAgain", "responseComments",
      "responseStatus", "completionPanel", "reviewPanel", "refreshReview", "downloadReviewJson",
      "downloadReviewCsv", "reviewContent", "reviewStatus"
    ]) el[id] = document.getElementById(id);

    populateFactionSelect(el.createFaction, el.createLeader);
    populateFactionSelect(el.joinFaction, el.joinLeader);
    if (el.createPlayMode && requestedPlayMode) el.createPlayMode.value = requestedPlayMode;
    renderRatingGrid();
    restoreStartChoice();

    el.createFaction?.addEventListener("change", () => populateLeaders(el.createFaction, el.createLeader));
    el.joinFaction?.addEventListener("change", () => populateLeaders(el.joinFaction, el.joinLeader));
    el.createForm?.addEventListener("submit", createGame);
    el.joinForm?.addEventListener("submit", joinGame);
    el.copyJoinLink?.addEventListener("click", copyJoinLink);
    el.shareJoinLink?.addEventListener("click", shareJoinLink);
    el.openArbiter?.addEventListener("click", openArbiter);
    el.companionArbiter?.addEventListener("click", openArbiter);
    el.recordStart?.addEventListener("click", () => recordEvent("game_started", {}));
    el.showCompletedResult?.addEventListener("click", () => showResultForm("completed"));
    el.showStoppedResult?.addEventListener("click", () => showResultForm("stopped"));
    document.querySelectorAll("[data-diagnostic-flag]").forEach(button => {
      button.addEventListener("click", () => recordDiagnostic(button.dataset.diagnosticFlag || ""));
    });
    el.noteForm?.addEventListener("submit", saveNote);
    el.completionStatus?.addEventListener("change", updateOutcomeFields);
    el.resultForm?.addEventListener("submit", submitResult);
    el.responseForm?.addEventListener("submit", submitResponse);
    el.refreshReview?.addEventListener("click", loadReview);
    el.downloadReviewJson?.addEventListener("click", downloadReviewJson);
    el.downloadReviewCsv?.addEventListener("click", downloadReviewCsv);

    if (suppliedHostKey && TOKEN_PATTERN.test(code)) {
      writeStorage(`${storagePrefix}_host`, suppliedHostKey);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("host");
      window.history.replaceState({}, "", cleanUrl.href);
    }

    if (!TOKEN_PATTERN.test(code)) {
      el.createPanel.hidden = false;
      return;
    }
    loadSession();
  }

  async function createGame(event) {
    event.preventDefault();
    setBusy(el.createForm, true);
    setStatus(el.createStatus, "Creating tracked game…");
    try {
      const payload = await api("/api/tracked-games", {
        method: "POST",
        body: {
          displayName: el.createName.value.trim(),
          faction: el.createFaction.value,
          leader: el.createLeader.value,
          playMode: el.createPlayMode?.value || "",
          selectionReason: el.createSelectionReason.value.trim(),
          creationSource,
          selectionSource: readStartChoice() ? "standalone-onboarding" : "tracked-page"
        }
      });
      const nextPrefix = `gauntlet_tracked_${payload.joinToken.slice(0, 16)}`;
      writeJsonStorage(`${nextPrefix}_participant`, {
        participantId: payload.participantId,
        participantToken: payload.participantToken,
        displayName: el.createName.value.trim(),
        seatIndex: payload.seatIndex,
        faction: payload.faction,
        leader: payload.leader
      });
      writeStorage(`${nextPrefix}_host`, payload.hostKey);
      window.location.assign(payload.joinUrl);
    } catch (error) {
      console.error(error);
      setStatus(el.createStatus, error.message || "The tracked game could not be created.", "error");
      setBusy(el.createForm, false);
    }
  }

  async function loadSession() {
    el.loadingPanel.hidden = false;
    el.createPanel.hidden = true;
    try {
      state.session = await api(`/api/tracked-games/${encodeURIComponent(code)}`);
      validateStoredParticipant();
      storeRulesContext();
      await renderSession();
    } catch (error) {
      console.error(error);
      showError(
        error.status === 404 ? "This tracked game was not found." : "The tracked playtest service is unavailable.",
        error.status === 404
          ? "The link may be incomplete, expired, or from a different playtest system."
          : "Try again shortly. The physical game can continue without the digital companion."
      );
    } finally {
      el.loadingPanel.hidden = true;
    }
  }

  async function renderSession() {
    const session = state.session;
    if (!session) return;
    el.sessionApp.hidden = false;
    el.errorPanel.hidden = true;
    el.sessionSerial.textContent = session.sheetSerial;
    el.statusLabel.textContent = titleCase(session.lifecycleState);
    el.playerCount.textContent = `${session.playerCount} / 2`;
    el.arbiterCount.textContent = String(session.arbiterQuestionCount || 0);
    el.responseCount.textContent = `${session.responseCount || 0} / 2`;
    el.lifecycleCopy.textContent = lifecycleCopy(session);

    renderPlayers();
    renderTransport();
    fillPlayerOptions();

    const joinedPlayer = currentPlayer();
    const open = session.status === "open";
    const full = session.playerCount === 2;
    const ownResponse = Boolean(joinedPlayer?.responseSubmitted);

    el.sharePanel.hidden = !open || full;
    if (!el.sharePanel.hidden) await renderQrCode();
    el.joinPanel.hidden = !open || Boolean(joinedPlayer) || full;
    el.joinedPanel.hidden = !joinedPlayer;
    if (joinedPlayer) {
      el.joinedHeading.textContent = `Seat ${joinedPlayer.seatIndex}: ${joinedPlayer.displayName}`;
      el.joinedCopy.textContent = `${joinedPlayer.leader} of the ${FACTIONS[joinedPlayer.faction]?.name || titleCase(joinedPlayer.faction)}. Rules Arbiter questions from this device will be attributed to you.`;
    }

    el.playPanel.hidden = !open || !joinedPlayer || !full;
    el.resultSection.hidden = !open || !joinedPlayer || !full || session.resultSubmitted;
    el.responseSection.hidden = !open || !joinedPlayer || !session.resultSubmitted || ownResponse;
    if (el.legacySelectionReasonField && joinedPlayer) {
      const legacyMissingReason = !joinedPlayer.selectionReasonCaptured;
      el.legacySelectionReasonField.hidden = !legacyMissingReason;
      if (el.legacySelectionReason) el.legacySelectionReason.required = legacyMissingReason;
    }
    el.completionPanel.hidden = !session.complete;
    el.reviewPanel.hidden = !state.hostKey;

    if (session.resultSubmitted) {
      setStatus(el.eventStatus, ownResponse
        ? "Your response is submitted. Waiting for the other player."
        : "The shared result is submitted. Complete your private response below.", "success");
    }
    if (state.hostKey) await loadReview();
  }

  function renderPlayers() {
    el.playerCards.replaceChildren();
    for (const seatIndex of [1, 2]) {
      const player = state.session.players.find((item) => Number(item.seatIndex) === seatIndex);
      const card = document.createElement("article");
      if (!player) {
        card.className = "player-card empty";
        card.innerHTML = `<div><span class="seat">Seat ${seatIndex}</span><h3>Waiting for player</h3><p>Scan the game QR code to join.</p></div>`;
      } else {
        const faction = FACTIONS[player.faction];
        card.className = "player-card";
        card.style.setProperty("--faction", faction?.color || "#777");
        card.innerHTML = `
          <span class="seat">Seat ${seatIndex}</span>
          <h3>${escapeHtml(player.displayName)}</h3>
          <p><strong>${escapeHtml(player.leader)}</strong> · ${escapeHtml(faction?.name || titleCase(player.faction))}</p>
          <p class="response-state">${player.responseSubmitted ? "Response submitted" : "Response pending"}</p>`;
      }
      el.playerCards.append(card);
    }
  }

  function renderTransport() {
    if (!el.transportPanel || !state.session) return;
    const mode = state.session.playMode === "physical" ? "physical" : "tts";
    const matchup = state.session.players
      .map(player => `${player.leader} of the ${FACTIONS[player.faction]?.name || titleCase(player.faction)}`)
      .join(" vs. ");
    el.transportMatchup.textContent = matchup
      ? `Selected matchup: ${matchup}.`
      : "The selected starter kits will appear here as both players join.";
    if (el.transportReferences) {
      el.transportReferences.innerHTML = state.session.players.map(player => {
        const factionName = FACTIONS[player.faction]?.name || titleCase(player.faction);
        return `<a href="../../factions/${escapeAttribute(player.faction)}/" target="_blank" rel="noopener">${escapeHtml(player.leader)} · ${escapeHtml(factionName)} guide ↗</a>`;
      }).join("");
    }

    if (mode === "tts") {
      el.transportEyebrow.textContent = "Remote play · Tabletop Simulator";
      el.transportTitle.textContent = "Open the v0.7.0 Workshop mod.";
      el.transportCopy.textContent = "One player hosts a multiplayer room. Each player takes the starter kit matching their selected Leader, then the creator records Game started here when setup is complete.";
      el.ttsWorkshopLink.hidden = false;
      el.physicalSetupLink.hidden = true;
    } else {
      el.transportEyebrow.textContent = "In-person play · Physical tabletop";
      el.transportTitle.textContent = "Prepare the two selected starter Decks.";
      el.transportCopy.textContent = "Use Start Playing and the Deckbuilder to print the starter Deck, Leader, Territories, references, and faction components for each selected player. Keep this tracked page open during play.";
      el.ttsWorkshopLink.hidden = true;
      el.physicalSetupLink.hidden = false;
    }
  }

  async function joinGame(event) {
    event.preventDefault();
    setBusy(el.joinForm, true);
    setStatus(el.joinStatus, "Joining game…");
    try {
      const payload = await api(`/api/tracked-games/${encodeURIComponent(code)}/join`, {
        method: "POST",
        body: {
          displayName: el.joinName.value.trim(),
          faction: el.joinFaction.value,
          leader: el.joinLeader.value,
          selectionReason: el.joinSelectionReason.value.trim()
        }
      });
      state.participant = {
        participantId: payload.participantId,
        participantToken: payload.participantToken,
        displayName: payload.displayName,
        seatIndex: payload.seatIndex,
        faction: payload.faction,
        leader: payload.leader
      };
      writeJsonStorage(`${storagePrefix}_participant`, state.participant);
      state.session = payload.session;
      setStatus(el.joinStatus, "Joined.", "success");
      await renderSession();
    } catch (error) {
      console.error(error);
      setStatus(el.joinStatus, error.message || "The game could not be joined.", "error");
    } finally {
      setBusy(el.joinForm, false);
    }
  }

  async function recordEvent(eventType, data) {
    if (!state.participant) return;
    setStatus(el.eventStatus, "Saving…");
    try {
      const payload = await api(`/api/tracked-games/${encodeURIComponent(code)}/event`, {
        method: "POST",
        body: participantBody({ eventType, data })
      });
      state.session = payload.session;
      const labels = { game_started: "Game start recorded.", note: "Note saved." };
      setStatus(el.eventStatus, labels[eventType] || "Event recorded.", "success");
      await renderSession();
    } catch (error) {
      console.error(error);
      setStatus(el.eventStatus, error.message || "The event could not be recorded.", "error");
    }
  }

  async function recordDiagnostic(flag) {
    if (!state.participant || !flag) return;
    const labels = {
      dont_know_what_happens_next: "Marked: don't know what happens next.",
      rule_unclear: "Marked: rule unclear.",
      no_meaningful_option: "Marked: no meaningful option.",
      feels_decided: "Marked: game feels decided.",
      repeated_or_futile_battle: "Marked: repeated or futile battle.",
      component_or_tts_problem: "Marked: component / TTS problem."
    };
    setStatus(el.diagnosticStatus, "Recording observation…");
    try {
      const payload = await api(`/api/tracked-games/${encodeURIComponent(code)}/event`, {
        method: "POST",
        body: participantBody({
          eventType: "diagnostic_flag",
          data: { flag }
        })
      });
      state.session = payload.session;
      setStatus(el.diagnosticStatus, labels[flag] || "Observation recorded.", "success");
    } catch (error) {
      console.error(error);
      setStatus(el.diagnosticStatus, error.message || "The observation could not be recorded.", "error");
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    const note = el.noteText.value.trim();
    if (!note) return;
    await recordEvent("note", { note });
    el.noteText.value = "";
  }

  function showResultForm(completionStatus) {
    el.resultSection.hidden = false;
    el.completionStatus.value = completionStatus;
    updateOutcomeFields();
    el.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateOutcomeFields() {
    const stopped = el.completionStatus.value === "stopped";
    el.winnerLabel.hidden = stopped;
    el.victoryRouteLabel.hidden = stopped;
    el.stopReasonLabel.hidden = !stopped;
    el.winner.required = !stopped;
    el.stopReason.required = stopped;
  }

  async function submitResult(event) {
    event.preventDefault();
    setBusy(el.resultForm, true);
    setStatus(el.resultStatus, "Submitting shared result…");
    try {
      const stopped = el.completionStatus.value === "stopped";
      const payload = await api(`/api/tracked-games/${encodeURIComponent(code)}/result`, {
        method: "POST",
        body: participantBody({
          result: {
            completionStatus: el.completionStatus.value,
            firstPlayerParticipantId: el.firstPlayer.value,
            winnerParticipantId: stopped ? null : el.winner.value,
            victoryRoute: stopped ? null : el.victoryRoute.value,
            durationMinutes: Number(el.durationMinutes.value),
            rounds: el.rounds.value,
            battles: el.battles.value,
            stopReason: stopped ? el.stopReason.value.trim() : "",
            packageUnmodified: el.packageUnmodified.checked,
            variantUsed: el.variantUsed.checked,
            productionIssue: el.productionIssue.value.trim(),
            strongestMoment: el.strongestMoment.value.trim(),
            confusingPoint: el.confusingPoint.value.trim(),
            importantObservation: el.importantObservation.value.trim()
          }
        })
      });
      state.session = payload.session;
      setStatus(el.resultStatus, "Shared result submitted.", "success");
      await renderSession();
      el.responseSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error(error);
      setStatus(el.resultStatus, error.message || "The shared result could not be submitted.", "error");
    } finally {
      setBusy(el.resultForm, false);
    }
  }

  async function submitResponse(event) {
    event.preventDefault();
    setBusy(el.responseForm, true);
    setStatus(el.responseStatus, "Submitting your response…");
    try {
      const response = {
        factionInterest: el.legacySelectionReason?.value.trim() || "",
        feltDecidedWhen: el.feltDecidedWhen.value,
        agencyAfterDecided: el.agencyAfterDecided.value,
        decisiveCause: el.decisiveCause.value.trim(),
        playAgain: el.playAgain.value === "yes",
        comments: el.responseComments.value.trim()
      };
      for (const [key] of RATINGS) response[key] = Number(document.getElementById(`rating-${key}`).value);
      const payload = await api(`/api/tracked-games/${encodeURIComponent(code)}/response`, {
        method: "POST",
        body: participantBody({ response })
      });
      state.session = payload.session;
      setStatus(el.responseStatus, "Your private response is submitted.", "success");
      await renderSession();
    } catch (error) {
      console.error(error);
      setStatus(el.responseStatus, error.message || "Your response could not be submitted.", "error");
    } finally {
      setBusy(el.responseForm, false);
    }
  }

  async function loadReview() {
    if (!state.hostKey) return;
    setStatus(el.reviewStatus, "Loading review…");
    try {
      state.review = await api(`/api/tracked-games/${encodeURIComponent(code)}/review`, {
        headers: { "X-Host-Key": state.hostKey }
      });
      renderReview();
      setStatus(el.reviewStatus, `Review refreshed ${formatDate(state.review.generatedAt)}.`, "success");
    } catch (error) {
      console.error(error);
      setStatus(el.reviewStatus, error.message || "The review could not be loaded.", "error");
    }
  }

  function renderReview() {
    const review = state.review;
    if (!review) return;
    const result = review.result;
    const resultCard = document.createElement("article");
    resultCard.className = "review-card";
    resultCard.innerHTML = result ? `
      <h3>Shared result</h3>
      <dl>
        <div><dt>Outcome</dt><dd>${escapeHtml(titleCase(result.completionStatus))}</dd></div>
        <div><dt>Duration</dt><dd>${result.durationMinutes} minutes</dd></div>
        <div><dt>Victory route</dt><dd>${escapeHtml(result.victoryRoute ? titleCase(result.victoryRoute) : "—")}</dd></div>
      </dl>
      <p><strong>Strongest moment:</strong> ${escapeHtml(result.strongestMoment)}</p>
      <p><strong>Confusing point:</strong> ${escapeHtml(result.confusingPoint)}</p>
      <p><strong>Important observation:</strong> ${escapeHtml(result.importantObservation)}</p>` : `<h3>Shared result</h3><p>Not submitted yet.</p>`;

    const responseCard = document.createElement("article");
    responseCard.className = "review-card";
    responseCard.innerHTML = `<h3>Player responses</h3>${review.responses.length ? review.responses.map((response) => `
      <section>
        <h4>Seat ${response.seatIndex}: ${escapeHtml(response.displayName)} — ${escapeHtml(response.leader)}</h4>
        <p><strong>Pregame attraction:</strong> ${escapeHtml(response.factionInterest)}</p>
        <p><strong>Ratings:</strong> fun ${response.fun}/5 · pacing ${response.pacing}/5 · decisions ${response.meaningfulDecisions}/5 · rules ${response.rulesClarity}/5</p>
        <p><strong>First felt decided:</strong> ${escapeHtml(titleCase(response.feltDecidedWhen || "never"))}</p>
        <p><strong>Meaningful decisions afterward:</strong> ${escapeHtml(titleCase(response.agencyAfterDecided || "not_applicable"))}</p>
        ${response.decisiveCause ? `<p><strong>What most determined the result:</strong> ${escapeHtml(response.decisiveCause)}</p>` : ""}
        <p><strong>Play again:</strong> ${response.playAgain ? "Yes" : "No"}</p>
        ${response.comments ? `<p><strong>Comments:</strong> ${escapeHtml(response.comments)}</p>` : ""}
      </section>`).join("") : "<p>No private responses have been submitted.</p>"}`;

    const arbiterCard = document.createElement("article");
    arbiterCard.className = "review-card";
    arbiterCard.innerHTML = `<h3>Rules Arbiter questions</h3>${review.arbiterLinks.length ? `<ul class="review-list">${review.arbiterLinks.map((link) => `<li><strong>Seat ${link.seat_index || "?"} · ${escapeHtml(link.classification || "unclassified")}</strong><br>${escapeHtml(link.question_excerpt || "Question unavailable")}</li>`).join("")}</ul>` : "<p>No Arbiter questions were linked.</p>"}`;

    el.reviewContent.replaceChildren(resultCard, responseCard, arbiterCard);
  }

  function downloadReviewJson() {
    if (!state.review) return;
    downloadBlob(`${state.session.sheetSerial}-tracked-playtest.json`, `${JSON.stringify(state.review, null, 2)}\n`, "application/json");
  }

  function downloadReviewCsv() {
    if (!state.review) return;
    const result = state.review.result || {};
    const rows = state.review.responses.length ? state.review.responses : [{}];
    const headers = [
      "sheet_serial", "status", "play_mode", "completion_status", "duration_minutes", "victory_route",
      "seat", "player", "faction", "leader", "pregame_attraction", "fun", "pacing", "meaningful_decisions",
      "battle_tension", "rules_clarity", "faction_clarity", "table_organization",
      "expectation_match", "leader_distinction", "felt_decided_when", "agency_after_decided",
      "decisive_cause", "play_again", "comments"
    ];
    const body = rows.map((response) => [
      state.session.sheetSerial, state.session.status, state.session.playMode || "", result.completionStatus || "", result.durationMinutes || "", result.victoryRoute || "",
      response.seatIndex || "", response.displayName || "", response.faction || "", response.leader || "", response.factionInterest || "",
      response.fun || "", response.pacing || "", response.meaningfulDecisions || "", response.battleTension || "", response.rulesClarity || "", response.factionClarity || "",
      response.tableOrganization || "", response.expectationMatch || "", response.leaderDistinction || "", response.feltDecidedWhen || "",
      response.agencyAfterDecided || "", response.decisiveCause || "", response.playAgain == null ? "" : response.playAgain ? "yes" : "no", response.comments || ""
    ]);
    const csv = [headers, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
    downloadBlob(`${state.session.sheetSerial}-tracked-playtest.csv`, `${csv}\n`, "text/csv");
  }

  function populateFactionSelect(factionSelect, leaderSelect) {
    factionSelect.innerHTML = `<option value="">Choose a faction</option>${Object.entries(FACTIONS).map(([id, faction]) => `<option value="${id}">${faction.name}</option>`).join("")}`;
    leaderSelect.innerHTML = '<option value="">Choose a faction first</option>';
  }

  function populateLeaders(factionSelect, leaderSelect, preferred = "") {
    const faction = FACTIONS[factionSelect.value];
    leaderSelect.disabled = !faction;
    leaderSelect.innerHTML = faction
      ? `<option value="">Choose a Leader</option>${Object.entries(faction.leaders).map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}`
      : '<option value="">Choose a faction first</option>';
    if (faction && Object.prototype.hasOwnProperty.call(faction.leaders, preferred)) leaderSelect.value = preferred;
  }

  function restoreStartChoice() {
    const choice = readStartChoice();
    if (!choice) return;
    for (const [factionSelect, leaderSelect] of [[el.createFaction, el.createLeader], [el.joinFaction, el.joinLeader]]) {
      factionSelect.value = choice.factionId;
      populateLeaders(factionSelect, leaderSelect, choice.leaderId);
    }
    const faction = FACTIONS[choice.factionId];
    const leader = faction?.leaders[choice.leaderId];
    if (faction && leader) el.savedChoiceNote.textContent = `Suggested from Start: ${leader} of the ${faction.name}.`;
  }

  function readStartChoice() {
    try {
      const choice = JSON.parse(localStorage.getItem(START_STORAGE_KEY) || "null");
      if (!choice || !FACTIONS[choice.factionId] || !FACTIONS[choice.factionId].leaders[choice.leaderId]) return null;
      return choice;
    } catch { return null; }
  }

  function renderRatingGrid() {
    el.ratingGrid.innerHTML = RATINGS.map(([key, label, description]) => `
      <div class="rating-card">
        <label for="rating-${key}">${label}<span>${description}</span></label>
        <select id="rating-${key}" required>
          <option value="">1–5</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
        </select>
      </div>`).join("");
  }

  function fillPlayerOptions() {
    const options = state.session.players.map((player) => `<option value="${escapeAttribute(player.participantId)}">Seat ${player.seatIndex}: ${escapeHtml(player.displayName)}</option>`).join("");
    el.firstPlayer.innerHTML = `<option value="">Choose</option>${options}`;
    el.winner.innerHTML = `<option value="">Choose</option>${options}`;
  }

  async function renderQrCode() {
    try {
      await ensureQrRenderer();
      const joinUrl = publicJoinUrl();
      const dataUrl = await window.QRCode.toDataURL(joinUrl, {
        width: 300, margin: 1, errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#ffffff" }
      });
      el.qrCode.innerHTML = `<img src="${dataUrl}" alt="QR code to join tracked game ${escapeAttribute(state.session.sheetSerial)}" />`;
    } catch (error) {
      console.warn(error);
      el.qrCode.innerHTML = "<span>QR code unavailable. Use Copy join link.</span>";
    }
  }

  async function ensureQrRenderer() {
    if (window.QRCode?.toDataURL) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "../batch/qrcode-loader.js?v=20260730-1";
      script.onload = resolve;
      script.onerror = () => reject(new Error("QR renderer unavailable"));
      document.head.append(script);
    });
    state.qrReady = Boolean(window.QRCode?.toDataURL);
  }

  async function copyJoinLink() {
    try {
      await copyText(publicJoinUrl());
      setStatus(el.shareStatus, "Join link copied.", "success");
    } catch {
      window.prompt("Copy this tracked-game link:", publicJoinUrl());
    }
  }

  async function shareJoinLink() {
    if (!navigator.share) return copyJoinLink();
    try {
      await navigator.share({ title: "Join my Gauntlet playtest", text: `Join tracked game ${state.session.sheetSerial}.`, url: publicJoinUrl() });
    } catch (error) {
      if (error?.name !== "AbortError") setStatus(el.shareStatus, "The share sheet could not be opened.", "error");
    }
  }

  function publicJoinUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("code", code);
    return url.href;
  }

  function installRulesInteractionLinker() {
    window.fetch = async function linkedFetch(input, init = {}) {
      const response = await nativeFetch(input, init);
      try {
        const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
        const rulesRequest = /gauntlet-rules-assistant/i.test(url.hostname) && /\/(api\/)?rules\/?$/.test(url.pathname);
        if (!rulesRequest || !response.ok || !TOKEN_PATTERN.test(code) || !state.participant?.participantToken) return response;
        const requestBody = parseBody(init.body);
        const answer = await response.clone().json();
        if (!answer?.interactionId) return response;
        void nativeFetch(`${API_ORIGIN}/api/tracked-games/${encodeURIComponent(code)}/arbiter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(participantBody({
            interactionId: answer.interactionId,
            classification: answer.rulingStatus || null,
            question: requestBody?.question || "",
            answer: answer.answer || "",
            sources: Array.isArray(answer.sources) ? answer.sources : []
          }))
        }).then(() => refreshSession()).catch((error) => console.info("Tracked Arbiter linkage skipped.", error));
      } catch (error) {
        console.info("Tracked Arbiter linkage skipped.", error);
      }
      return response;
    };
  }

  async function refreshSession() {
    try {
      state.session = await api(`/api/tracked-games/${encodeURIComponent(code)}`);
      await renderSession();
    } catch { /* The game remains usable when count refresh fails. */ }
  }

  function openArbiter() {
    const launcher = document.querySelector(".ga-rules-launcher");
    if (launcher) launcher.click();
    else window.setTimeout(openArbiter, 120);
  }

  function participantBody(value) {
    return {
      ...value,
      participantId: state.participant?.participantId,
      participantToken: state.participant?.participantToken
    };
  }

  function currentPlayer() {
    if (!state.participant?.participantId) return null;
    return state.session?.players?.find((player) => player.participantId === state.participant.participantId) || null;
  }

  function validateStoredParticipant() {
    if (!state.participant?.participantId) return;
    if (!state.session.players.some((player) => player.participantId === state.participant.participantId)) {
      state.participant = null;
      removeStorage(`${storagePrefix}_participant`);
    }
  }

  function storeRulesContext() {
    try {
      sessionStorage.setItem("gauntlet_playtest_session_id", state.session.sessionId);
      sessionStorage.setItem("gauntlet_playtest_sheet_serial", state.session.sheetSerial);
    } catch { /* optional */ }
  }

  function lifecycleCopy(session) {
    const copies = {
      joining: "Share the code and fill both player seats.",
      ready: "Both players are present. Record the start once and begin play.",
      playing: "The game is in progress. Arbiter questions are linked automatically.",
      feedback: "The shared result is submitted. Each player should complete a private response.",
      submitted: "The complete game record is submitted and the join code is retired."
    };
    return copies[session.lifecycleState] || "Tracked game open.";
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const init = { method: options.method || "GET", headers, cache: "no-store" };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const response = await nativeFetch(`${API_ORIGIN}${path}`, init);
    let payload = null;
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) {
      const error = new Error(payload?.error || `Tracked service returned ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function showError(title, message) {
    el.sessionApp.hidden = true;
    el.createPanel.hidden = true;
    el.errorPanel.hidden = false;
    el.errorTitle.textContent = title;
    el.errorMessage.textContent = message;
  }

  function setStatus(element, message, kind = "") {
    if (!element) return;
    element.textContent = message;
    element.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function setBusy(form, busy) {
    form?.querySelectorAll("button, input, select, textarea").forEach((control) => { control.disabled = busy; });
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Copy failed");
  }

  function downloadBlob(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function parseBody(body) {
    if (typeof body !== "string") return null;
    try { return JSON.parse(body); } catch { return null; }
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? String(value || "") : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function titleCase(value) {
    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) { return escapeHtml(value); }
  function readStorage(key) { try { return localStorage.getItem(key) || ""; } catch { return ""; } }
  function writeStorage(key, value) { try { localStorage.setItem(key, value); } catch { /* optional */ } }
  function removeStorage(key) { try { localStorage.removeItem(key); } catch { /* optional */ } }
  function readJsonStorage(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } }
  function writeJsonStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional */ } }
})();
