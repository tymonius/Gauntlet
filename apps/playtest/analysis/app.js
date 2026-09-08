(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");

  const RATING_DEFS = Object.freeze([
    ["expectationMatch", "Expectation matched play"],
    ["leaderDistinction", "Leader felt distinct"],
    ["fun", "Overall fun"],
    ["pacing", "Pacing"],
    ["meaningfulDecisions", "Meaningful decisions"],
    ["battleTension", "Battle tension"],
    ["rulesClarity", "Rules clarity"],
    ["factionClarity", "Faction clarity"],
    ["tableOrganization", "Table organization"]
  ]);

  const FACTIONS = Object.freeze({
    military: { name: "Military", color: "#9e262c" },
    diplomats: { name: "Diplomats", color: "#264f91" },
    financiers: { name: "Financiers", color: "#227044" },
    intelligence: { name: "Intelligence", color: "#282827" },
    mystics: { name: "Mystics", color: "#5d347e" },
    inquisition: { name: "Inquisition", color: "#a67a27" }
  });

  const state = {
    adminToken: "",
    payload: null,
    games: [],
    filteredGames: []
  };
  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    for (const id of [
      "accessPanel", "accessForm", "adminToken", "accessStatus", "analysisApp",
      "dataFreshness", "connectionStatus", "refreshData", "lockAnalysis",
      "metricGames", "metricGamesDetail", "metricResponses", "metricResponsesDetail",
      "metricReplay", "metricDuration", "metricArbiter", "metricPlayMode", "metricPlayModeDetail",
      "metricDiagnostics", "metricVersions", "metricVersionsDetail",
      "filterStatus", "filterVersion", "filterPlayMode", "filterFaction", "filterLeader", "filterFrom", "filterTo",
      "filterSearch", "resetFilters", "filterSummary", "anonymizeExports", "downloadBundle",
      "downloadResponses", "downloadGames", "downloadArbiter", "exportStatus", "ratingAverages",
      "outcomeSummary", "decisionSummary", "diagnosticSummary", "breakdownRows", "writtenFeedback", "gameRecords"
    ]) el[id] = document.getElementById(id);

    el.accessForm?.addEventListener("submit", unlockAnalysis);
    el.refreshData?.addEventListener("click", refreshData);
    el.lockAnalysis?.addEventListener("click", lockAnalysis);
    for (const control of [
      el.filterStatus, el.filterVersion, el.filterPlayMode, el.filterFaction, el.filterLeader,
      el.filterFrom, el.filterTo, el.filterSearch
    ]) {
      control?.addEventListener(control === el.filterSearch ? "input" : "change", applyFilters);
    }
    el.filterFaction?.addEventListener("change", refreshLeaderOptions);
    el.resetFilters?.addEventListener("click", resetFilters);
    el.downloadBundle?.addEventListener("click", downloadAnalysisBundle);
    el.downloadResponses?.addEventListener("click", downloadResponsesCsv);
    el.downloadGames?.addEventListener("click", downloadGamesCsv);
    el.downloadArbiter?.addEventListener("click", downloadArbiterCsv);
  }

  async function unlockAnalysis(event) {
    event.preventDefault();
    const token = el.adminToken.value.trim();
    if (!token) return;
    setFormBusy(el.accessForm, true);
    setStatus(el.accessStatus, "Loading protected playtest data…");
    try {
      const payload = await fetchAnalysis(token);
      state.adminToken = token;
      state.payload = payload;
      state.games = Array.isArray(payload.games) ? payload.games : [];
      el.adminToken.value = "";
      el.accessPanel.hidden = true;
      el.analysisApp.hidden = false;
      populateFilters();
      applyFilters();
      updateFreshness(payload.generatedAt);
      setConnection("Protected data loaded", "");
    } catch (error) {
      console.error(error);
      setStatus(el.accessStatus, error.message || "The compiled playtest record could not be loaded.", "error");
    } finally {
      setFormBusy(el.accessForm, false);
    }
  }

  async function refreshData() {
    if (!state.adminToken) return;
    setConnection("Refreshing…", "loading");
    el.refreshData.disabled = true;
    try {
      const payload = await fetchAnalysis(state.adminToken);
      state.payload = payload;
      state.games = Array.isArray(payload.games) ? payload.games : [];
      populateFilters(true);
      applyFilters();
      updateFreshness(payload.generatedAt);
      setConnection("Protected data loaded", "");
    } catch (error) {
      console.error(error);
      setConnection("Refresh failed", "error");
      setStatus(el.exportStatus, error.message || "The data could not be refreshed.", "error");
    } finally {
      el.refreshData.disabled = false;
    }
  }

  function lockAnalysis() {
    state.adminToken = "";
    state.payload = null;
    state.games = [];
    state.filteredGames = [];
    el.analysisApp.hidden = true;
    el.accessPanel.hidden = false;
    el.accessForm.reset();
    setStatus(el.accessStatus, "Analysis page locked. The facilitator key was cleared from memory.", "success");
    el.adminToken.focus();
  }

  async function fetchAnalysis(token) {
    const response = await fetch(`${API_ORIGIN}/api/tracked-analysis`, {
      method: "GET",
      cache: "no-store",
      headers: { "Authorization": `Bearer ${token}` }
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) {
      const error = new Error(payload?.error || `Analysis service returned ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function populateFilters(preserve = false) {
    const previous = preserve ? readFilters() : null;
    const versions = unique(state.games.map((game) => game.rulesVersion).filter(Boolean)).sort().reverse();
    const factions = unique(state.games.flatMap((game) => game.players.map((player) => player.faction)).filter(Boolean));
    const leaders = unique(state.games.flatMap((game) => game.players.map((player) => player.leader)).filter(Boolean)).sort();

    el.filterVersion.innerHTML = `<option value="all">All versions</option>${versions.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
    el.filterFaction.innerHTML = `<option value="all">All factions</option>${factions.sort(factionSort).map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(factionName(value))}</option>`).join("")}`;
    el.filterLeader.innerHTML = `<option value="all">All Leaders</option>${leaders.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;

    if (previous) {
      restoreSelect(el.filterVersion, previous.version);
      restoreSelect(el.filterFaction, previous.faction);
      refreshLeaderOptions(previous.leader);
    }
  }

  function refreshLeaderOptions(preferred = "") {
    const faction = el.filterFaction.value;
    const current = typeof preferred === "string" ? preferred : el.filterLeader.value;
    const leaders = unique(state.games.flatMap((game) => game.players
      .filter((player) => faction === "all" || player.faction === faction)
      .map((player) => player.leader)).filter(Boolean)).sort();
    el.filterLeader.innerHTML = `<option value="all">All Leaders</option>${leaders.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
    restoreSelect(el.filterLeader, current);
    if (typeof preferred !== "string") applyFilters();
  }

  function applyFilters() {
    if (!state.payload) return;
    const filters = readFilters();
    const fromTime = filters.from ? new Date(`${filters.from}T00:00:00`).valueOf() : null;
    const toTime = filters.to ? new Date(`${filters.to}T23:59:59.999`).valueOf() : null;
    const search = filters.search.toLowerCase();

    state.filteredGames = state.games.filter((game) => {
      if (filters.status !== "all" && game.status !== filters.status) return false;
      if (filters.version !== "all" && game.rulesVersion !== filters.version) return false;
      const playMode = ["tts", "physical"].includes(game.metadata?.playMode) ? game.metadata.playMode : "unspecified";
      if (filters.playMode !== "all" && playMode !== filters.playMode) return false;
      if (filters.faction !== "all" && !game.players.some((player) => player.faction === filters.faction)) return false;
      if (filters.leader !== "all" && !game.players.some((player) => player.leader === filters.leader)) return false;
      const created = new Date(game.createdAt).valueOf();
      if (fromTime != null && Number.isFinite(created) && created < fromTime) return false;
      if (toTime != null && Number.isFinite(created) && created > toTime) return false;
      if (search && !gameSearchText(game).includes(search)) return false;
      return true;
    });

    const summary = summarizeGames(state.filteredGames);
    renderMetrics(summary);
    renderRatings(summary);
    renderOutcomes(summary);
    renderDecisionExperience(summary);
    renderDiagnostics(summary);
    renderBreakdown(summary);
    renderWrittenFeedback();
    renderGames();
    el.filterSummary.textContent = `${state.filteredGames.length} of ${state.games.length} tracked game${state.games.length === 1 ? "" : "s"} in this research slice.`;
    const hasGames = state.filteredGames.length > 0;
    for (const button of [el.downloadBundle, el.downloadResponses, el.downloadGames, el.downloadArbiter]) button.disabled = !hasGames;
  }

  function readFilters() {
    return {
      status: el.filterStatus.value,
      version: el.filterVersion.value,
      playMode: el.filterPlayMode.value,
      faction: el.filterFaction.value,
      leader: el.filterLeader.value,
      from: el.filterFrom.value,
      to: el.filterTo.value,
      search: el.filterSearch.value.trim()
    };
  }

  function resetFilters() {
    el.filterStatus.value = "all";
    el.filterVersion.value = "all";
    el.filterPlayMode.value = "all";
    el.filterFaction.value = "all";
    el.filterFrom.value = "";
    el.filterTo.value = "";
    el.filterSearch.value = "";
    refreshLeaderOptions("all");
    applyFilters();
  }

  function renderMetrics(summary) {
    el.metricGames.textContent = String(summary.gameCount);
    el.metricGamesDetail.textContent = `${summary.closedGameCount} submitted · ${summary.openGameCount} open`;
    el.metricResponses.textContent = String(summary.responseCount);
    el.metricResponsesDetail.textContent = `${formatPercent(summary.responseCompletionRate)} of ${summary.playerCount} player seats`;
    el.metricReplay.textContent = formatPercent(summary.playAgainRate);
    el.metricDuration.textContent = summary.averageDurationMinutes == null ? "—" : `${summary.averageDurationMinutes}m`;
    el.metricArbiter.textContent = String(summary.arbiterQuestionCount);
    const ttsGames = Number(summary.playModes?.tts || 0);
    const physicalGames = Number(summary.playModes?.physical || 0);
    const unspecifiedGames = Number(summary.playModes?.unspecified || 0);
    el.metricPlayMode.textContent = ttsGames || physicalGames || unspecifiedGames ? `${physicalGames} / ${ttsGames}` : "—";
    el.metricPlayModeDetail.textContent = unspecifiedGames
      ? `physical / TTS · ${unspecifiedGames} not recorded`
      : "physical / TTS";
    el.metricDiagnostics.textContent = String(Object.values(summary.diagnosticFlags || {}).reduce((sum, count) => sum + Number(count || 0), 0));
    const versions = Object.keys(summary.rulesVersions);
    el.metricVersions.textContent = String(versions.length);
    el.metricVersionsDetail.textContent = versions.join(" · ") || "No version data";
  }

  function renderRatings(summary) {
    const count = summary.responseCount;
    if (!count) {
      el.ratingAverages.innerHTML = emptyState("No questionnaire ratings are present in this slice.");
      return;
    }
    el.ratingAverages.innerHTML = RATING_DEFS.map(([key, label]) => {
      const value = summary.ratingAverages[key];
      const width = value == null ? 0 : Math.max(0, Math.min(100, value / 5 * 100));
      return `<div class="rating-row"><strong>${escapeHtml(label)}</strong><div class="rating-bar" aria-label="${escapeAttribute(label)} ${value} out of 5"><span style="width:${width}%"></span></div><span class="rating-value">${formatRating(value)}</span></div>`;
    }).join("");
  }

  function renderOutcomes(summary) {
    const routes = Object.entries(summary.victoryRoutes).sort((a, b) => b[1] - a[1]);
    el.outcomeSummary.innerHTML = `
      <div class="outcome-card"><strong>${summary.completion.completed || 0}</strong><span>completed games</span></div>
      <div class="outcome-card"><strong>${summary.completion.stopped || 0}</strong><span>stopped early</span></div>
      <div class="outcome-card"><strong>${summary.completion.pending || 0}</strong><span>without a shared result</span></div>
      <div class="outcome-card"><strong>${routes.length ? routes.map(([route, count]) => `${escapeHtml(titleCase(route))}: ${count}`).join(" · ") : "—"}</strong><span>victory routes</span></div>`;
  }

  function renderDecisionExperience(summary) {
    const points = summary.decisionPoints || {};
    const agency = summary.agencyAfterDecided || {};
    const pointLabels = {
      never: "Never before end",
      early: "Early",
      middle: "Middle",
      late: "Late",
      at_end: "At the end"
    };
    const agencyLabels = {
      yes: "Meaningful decisions remained",
      some: "Some decisions remained",
      no: "No meaningful decisions remained",
      not_applicable: "Not applicable"
    };
    const pointCards = Object.entries(pointLabels)
      .filter(([key]) => Number(points[key] || 0) > 0)
      .map(([key, label]) => `<div class="outcome-card"><strong>${Number(points[key] || 0)}</strong><span>${escapeHtml(label)}</span></div>`);
    const agencyCards = Object.entries(agencyLabels)
      .filter(([key]) => Number(agency[key] || 0) > 0)
      .map(([key, label]) => `<div class="outcome-card"><strong>${Number(agency[key] || 0)}</strong><span>${escapeHtml(label)}</span></div>`);
    el.decisionSummary.innerHTML = [...pointCards, ...agencyCards].join("") || emptyState("No decision-point responses are present in this slice.");
  }

  function renderDiagnostics(summary) {
    const labels = {
      dont_know_what_happens_next: "Didn't know what happens next",
      rule_unclear: "Rule unclear",
      no_meaningful_option: "No meaningful option",
      feels_decided: "Game felt decided",
      repeated_or_futile_battle: "Repeated / futile battle",
      component_or_tts_problem: "Component / TTS problem"
    };
    const cards = Object.entries(summary.diagnosticFlags || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([flag, count]) => `<div class="outcome-card"><strong>${Number(count || 0)}</strong><span>${escapeHtml(labels[flag] || titleCase(flag))}</span></div>`);
    el.diagnosticSummary.innerHTML = cards.join("") || emptyState("No live diagnostic flags are present in this slice.");
  }

  function renderBreakdown(summary) {
    const rows = [];
    for (const faction of Object.keys(summary.factions).sort(factionSort)) {
      rows.push(groupRow(factionName(faction), summary.factions[faction], true));
      const leaders = Object.entries(summary.leaders)
        .filter(([leader]) => state.filteredGames.some((game) => game.players.some((player) => player.faction === faction && player.leader === leader)))
        .sort((a, b) => a[0].localeCompare(b[0]));
      for (const [leader, group] of leaders) rows.push(groupRow(`↳ ${leader}`, group, false));
    }
    el.breakdownRows.innerHTML = rows.length ? rows.join("") : `<tr><td colspan="8">No faction or Leader responses are present in this slice.</td></tr>`;
  }

  function groupRow(label, group, faction) {
    const winText = `${group.wins} / ${group.playerCount}`;
    return `<tr${faction ? ' class="breakdown-group"' : ""}>
      <td>${escapeHtml(label)}<span class="sample-note">${group.gameCount} game${group.gameCount === 1 ? "" : "s"}</span></td>
      <td>${group.responseCount}</td><td>${winText}</td><td>${formatPercent(group.playAgainRate)}</td>
      <td>${formatRating(group.ratingAverages.fun)}</td><td>${formatRating(group.ratingAverages.pacing)}</td>
      <td>${formatRating(group.ratingAverages.meaningfulDecisions)}</td><td>${formatRating(group.ratingAverages.rulesClarity)}</td>
    </tr>`;
  }

  function renderWrittenFeedback() {
    const cards = [];
    for (const game of state.filteredGames) {
      for (const player of game.players) {
        if (!player.response) continue;
        cards.push(`<article class="feedback-card">
          <header><div><h3>${escapeHtml(player.displayName)}</h3><div class="meta">${escapeHtml(player.leader)} · ${escapeHtml(factionName(player.faction))}</div></div><div class="meta">${escapeHtml(game.sheetSerial)}<br>${escapeHtml(formatDate(game.createdAt, false))}</div></header>
          <dl>
            <div><dt>Pregame attraction</dt><dd>${escapeHtml(player.selectionReason || player.response.factionInterest)}</dd></div>
            <div><dt>First felt decided</dt><dd>${escapeHtml(titleCase(player.response.feltDecidedWhen || "never"))}</dd></div>
            <div><dt>Meaningful decisions afterward</dt><dd>${escapeHtml(titleCase(player.response.agencyAfterDecided || "not_applicable"))}</dd></div>
            ${player.response.decisiveCause ? `<div><dt>What most determined the result</dt><dd>${escapeHtml(player.response.decisiveCause)}</dd></div>` : ""}
            ${player.response.comments ? `<div><dt>Additional comments</dt><dd>${escapeHtml(player.response.comments)}</dd></div>` : ""}
            <div><dt>Selected ratings</dt><dd>Fun ${formatRating(player.response.fun)} · Pacing ${formatRating(player.response.pacing)} · Decisions ${formatRating(player.response.meaningfulDecisions)} · Rules ${formatRating(player.response.rulesClarity)} · Play again ${player.response.playAgain ? "Yes" : "No"}</dd></div>
          </dl>
        </article>`);
      }
    }
    el.writtenFeedback.innerHTML = cards.length ? cards.join("") : emptyState("No written questionnaire responses are present in this slice.");
  }

  function renderGames() {
    if (!state.filteredGames.length) {
      el.gameRecords.innerHTML = emptyState("No tracked games match these filters.");
      return;
    }
    el.gameRecords.innerHTML = state.filteredGames.map((game) => {
      const result = game.result;
      const players = game.players.map((player) => playerCard(player)).join("");
      const questions = game.arbiterQuestions.length
        ? `<ul class="question-list">${game.arbiterQuestions.map((question) => `<li><strong>Seat ${question.seatIndex || "?"}${question.displayName ? ` · ${escapeHtml(question.displayName)}` : ""}</strong>: ${escapeHtml(question.question || "Question unavailable")}<br><small>${escapeHtml(question.classification || "unclassified")} · ${escapeHtml(formatDate(question.linkedAt))}</small></li>`).join("")}</ul>`
        : "<p>No Rules Arbiter questions were linked.</p>";
      const timeline = game.events.length
        ? `<ol class="timeline-list">${game.events.map((event) => {
          const detail = event.eventType === "diagnostic_flag" && event.data?.flag
            ? ` — ${titleCase(event.data.flag)}`
            : "";
          return `<li><strong>${escapeHtml(titleCase(event.eventType))}</strong>${escapeHtml(detail)} · ${escapeHtml(formatDate(event.createdAt))}</li>`;
        }).join("")}</ol>`
        : "<p>No timeline events were recorded.</p>";
      return `<details class="game-record">
        <summary><div><h3>${escapeHtml(game.sheetSerial)}</h3><div class="game-meta">${escapeHtml(game.rulesVersion)} · ${escapeHtml(game.metadata?.playMode === "tts" ? "Tabletop Simulator" : "Physical tabletop")} · ${escapeHtml(formatDate(game.createdAt))} · ${game.players.map((player) => escapeHtml(player.leader)).join(" vs. ") || "Players pending"}</div></div><span class="status-pill ${escapeAttribute(game.status)}">${escapeHtml(game.status)}</span></summary>
        <div class="game-record-content">
          <section class="game-section"><h4>Players and questionnaires</h4><div class="player-grid">${players || "<p>No players joined.</p>"}</div></section>
          <section class="game-section"><h4>Shared result</h4>${result ? resultBlock(game, result) : "<p>No shared result has been submitted.</p>"}</section>
          <section class="game-section"><h4>Rules Arbiter questions</h4>${questions}</section>
          <section class="game-section"><h4>Timeline</h4>${timeline}</section>
        </div>
      </details>`;
    }).join("");
  }

  function playerCard(player) {
    const response = player.response;
    return `<article class="player-detail" style="--faction:${escapeAttribute(FACTIONS[player.faction]?.color || "#777")}">
      <h5>Seat ${player.seatIndex}: ${escapeHtml(player.displayName)}</h5>
      <p><strong>${escapeHtml(player.leader)}</strong> · ${escapeHtml(factionName(player.faction))}</p>
      ${response ? `<p class="rating-inline">Fun ${formatRating(response.fun)} · Pacing ${formatRating(response.pacing)} · Decisions ${formatRating(response.meaningfulDecisions)} · Rules ${formatRating(response.rulesClarity)} · Play again ${response.playAgain ? "Yes" : "No"}</p><p><strong>Pregame attraction:</strong> ${escapeHtml(player.selectionReason || response.factionInterest)}</p><p><strong>First felt decided:</strong> ${escapeHtml(titleCase(response.feltDecidedWhen || "never"))} · <strong>Agency afterward:</strong> ${escapeHtml(titleCase(response.agencyAfterDecided || "not_applicable"))}</p>${response.decisiveCause ? `<p><strong>Decisive cause:</strong> ${escapeHtml(response.decisiveCause)}</p>` : ""}${response.comments ? `<p><strong>Comments:</strong> ${escapeHtml(response.comments)}</p>` : ""}` : "<p>Questionnaire not submitted.</p>"}
    </article>`;
  }

  function resultBlock(game, result) {
    const winner = game.players.find((player) => player.participantId === result.winnerParticipantId);
    const first = game.players.find((player) => player.participantId === result.firstPlayerParticipantId);
    return `<p><strong>Outcome:</strong> ${escapeHtml(titleCase(result.completionStatus))} · ${result.durationMinutes} minutes${first ? ` · First player: ${escapeHtml(first.displayName)}` : ""}${winner ? ` · Winner: ${escapeHtml(winner.displayName)} (${escapeHtml(winner.leader)})` : ""}${result.victoryRoute ? ` · ${escapeHtml(titleCase(result.victoryRoute))}` : ""}</p>
      ${result.stopReason ? `<p><strong>Stop reason:</strong> ${escapeHtml(result.stopReason)}</p>` : ""}
      ${result.productionIssue ? `<p><strong>Production issue:</strong> ${escapeHtml(result.productionIssue)}</p>` : ""}
      <p><strong>Strongest moment:</strong> ${escapeHtml(result.strongestMoment)}</p>
      <p><strong>Confusing point:</strong> ${escapeHtml(result.confusingPoint)}</p>
      <p><strong>Important observation:</strong> ${escapeHtml(result.importantObservation)}</p>`;
  }

  function downloadAnalysisBundle() {
    const games = exportGames();
    const bundle = {
      schemaVersion: "gauntlet-tracked-analysis-export-v1",
      sourceSchemaVersion: state.payload?.schemaVersion || null,
      generatedAt: new Date().toISOString(),
      sourceGeneratedAt: state.payload?.generatedAt || null,
      filters: readFilters(),
      privacy: { playerNamesAnonymized: el.anonymizeExports.checked },
      analysisBrief: {
        purpose: "Review Gauntlet tracked-playtest results, questionnaire responses, and Rules Arbiter questions.",
        ratingScale: "All questionnaire ratings use a 1–5 scale, with 5 most positive.",
        recommendedTasks: [
          "Summarize the strongest recurring positive and negative themes.",
          "Compare factions and Leaders while explicitly accounting for sample size.",
          "Identify rules, cards, phases, or terminology that repeatedly caused confusion.",
          "Examine whether fun, pacing, meaningful decisions, and replay interest move together.",
          "Distinguish production or component problems from game-design problems.",
          "Propose prioritized follow-up questions or playtest targets without treating small samples as conclusive."
        ],
        caveats: [
          "Each game can have zero, one, or two individual responses.",
          "Faction and Leader comparisons are observational and not randomized.",
          "Written responses should remain associated with their game context and outcome."
        ]
      },
      summary: summarizeGames(games),
      games
    };
    downloadJson(`gauntlet-playtest-analysis-${dateStamp()}.json`, bundle);
    setStatus(el.exportStatus, `${games.length} tracked game${games.length === 1 ? "" : "s"} exported as an analysis bundle.`, "success");
  }

  function downloadResponsesCsv() {
    const rows = [];
    for (const game of exportGames()) {
      const winner = game.players.find((player) => player.participantId === game.result?.winnerParticipantId);
      for (const player of game.players) {
        if (!player.response) continue;
        rows.push({
          sheet_serial: game.sheetSerial,
          session_status: game.status,
          rules_version: game.rulesVersion,
          play_mode: game.metadata?.playMode === "tts" ? "tts" : "physical",
          created_at: game.createdAt,
          closed_at: game.closedAt || "",
          completion_status: game.result?.completionStatus || "",
          duration_minutes: game.result?.durationMinutes ?? "",
          victory_route: game.result?.victoryRoute || "",
          winner_leader: winner?.leader || "",
          seat: player.seatIndex,
          player: player.displayName,
          faction: factionName(player.faction),
          leader: player.leader,
          pregame_attraction: player.selectionReason || player.response.factionInterest,
          expectation_match: player.response.expectationMatch,
          leader_distinction: player.response.leaderDistinction,
          fun: player.response.fun,
          pacing: player.response.pacing,
          meaningful_decisions: player.response.meaningfulDecisions,
          battle_tension: player.response.battleTension,
          rules_clarity: player.response.rulesClarity,
          faction_clarity: player.response.factionClarity,
          table_organization: player.response.tableOrganization,
          felt_decided_when: player.response.feltDecidedWhen || "",
          agency_after_decided: player.response.agencyAfterDecided || "",
          decisive_cause: player.response.decisiveCause || "",
          play_again: player.response.playAgain ? "yes" : "no",
          comments: player.response.comments,
          strongest_moment: game.result?.strongestMoment || "",
          confusing_point: game.result?.confusingPoint || "",
          important_observation: game.result?.importantObservation || "",
          production_issue: game.result?.productionIssue || ""
        });
      }
    }
    downloadCsv(`gauntlet-playtest-responses-${dateStamp()}.csv`, rows);
    setStatus(el.exportStatus, `${rows.length} questionnaire response${rows.length === 1 ? "" : "s"} exported.`, "success");
  }

  function downloadGamesCsv() {
    const rows = exportGames().map((game) => ({
      sheet_serial: game.sheetSerial,
      session_status: game.status,
      rules_version: game.rulesVersion,
      play_mode: game.metadata?.playMode === "tts" ? "tts" : "physical",
      created_at: game.createdAt,
      closed_at: game.closedAt || "",
      player_1: game.players.find((player) => player.seatIndex === 1)?.displayName || "",
      player_1_faction: factionName(game.players.find((player) => player.seatIndex === 1)?.faction || ""),
      player_1_leader: game.players.find((player) => player.seatIndex === 1)?.leader || "",
      player_2: game.players.find((player) => player.seatIndex === 2)?.displayName || "",
      player_2_faction: factionName(game.players.find((player) => player.seatIndex === 2)?.faction || ""),
      player_2_leader: game.players.find((player) => player.seatIndex === 2)?.leader || "",
      completion_status: game.result?.completionStatus || "",
      first_player_seat: participantSeat(game, game.result?.firstPlayerParticipantId),
      winner_seat: participantSeat(game, game.result?.winnerParticipantId),
      victory_route: game.result?.victoryRoute || "",
      duration_minutes: game.result?.durationMinutes ?? "",
      rounds: game.result?.rounds ?? "",
      battles: game.result?.battles ?? "",
      stop_reason: game.result?.stopReason || "",
      package_unmodified: game.result ? (game.result.packageUnmodified ? "yes" : "no") : "",
      variant_used: game.result ? (game.result.variantUsed ? "yes" : "no") : "",
      production_issue: game.result?.productionIssue || "",
      strongest_moment: game.result?.strongestMoment || "",
      confusing_point: game.result?.confusingPoint || "",
      important_observation: game.result?.importantObservation || "",
      response_count: game.players.filter((player) => player.response).length,
      arbiter_question_count: game.arbiterQuestions.length,
      diagnostic_flag_count: game.events.filter((event) => event.eventType === "diagnostic_flag").length
    }));
    downloadCsv(`gauntlet-playtest-games-${dateStamp()}.csv`, rows);
    setStatus(el.exportStatus, `${rows.length} game record${rows.length === 1 ? "" : "s"} exported.`, "success");
  }

  function downloadArbiterCsv() {
    const rows = [];
    for (const game of exportGames()) {
      for (const question of game.arbiterQuestions) {
        const player = game.players.find((item) => item.participantId === question.participantId);
        rows.push({
          sheet_serial: game.sheetSerial,
          rules_version: game.rulesVersion,
          game_status: game.status,
          linked_at: question.linkedAt,
          seat: question.seatIndex || player?.seatIndex || "",
          player: question.displayName || player?.displayName || "",
          faction: factionName(player?.faction || ""),
          leader: player?.leader || "",
          classification: question.classification || "",
          question: question.question || "",
          answer: question.answer || "",
          interaction_id: question.interactionId || ""
        });
      }
    }
    downloadCsv(`gauntlet-playtest-arbiter-questions-${dateStamp()}.csv`, rows);
    setStatus(el.exportStatus, `${rows.length} Rules Arbiter question${rows.length === 1 ? "" : "s"} exported.`, "success");
  }

  function exportGames() {
    const games = structuredCloneSafe(state.filteredGames);
    if (!el.anonymizeExports.checked) return games;
    games.forEach((game, gameIndex) => {
      const ids = new Map();
      for (const player of game.players) {
        const replacementId = `game-${gameIndex + 1}-seat-${player.seatIndex}`;
        ids.set(player.participantId, replacementId);
        player.participantId = replacementId;
        player.displayName = `Player ${gameIndex + 1}-${player.seatIndex}`;
      }
      if (game.result) {
        for (const key of ["submittedByParticipantId", "firstPlayerParticipantId", "winnerParticipantId"]) {
          if (game.result[key] && ids.has(game.result[key])) game.result[key] = ids.get(game.result[key]);
        }
      }
      for (const question of game.arbiterQuestions) {
        if (question.participantId && ids.has(question.participantId)) question.participantId = ids.get(question.participantId);
        if (question.seatIndex) question.displayName = `Player ${gameIndex + 1}-${question.seatIndex}`;
      }
      game.events = replaceParticipantReferences(game.events, ids);
    });
    return games;
  }

  function replaceParticipantReferences(value, ids) {
    if (Array.isArray(value)) return value.map((item) => replaceParticipantReferences(item, ids));
    if (!value || typeof value !== "object") return ids.has(value) ? ids.get(value) : value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceParticipantReferences(item, ids)]));
  }

  function summarizeGames(games) {
    const responses = [];
    const factions = new Map();
    const leaders = new Map();
    const rulesVersions = new Map();
    const playModes = {};
    const diagnosticFlags = {};
    const decisionPoints = {};
    const agencyAfterDecided = {};
    const completion = { completed: 0, stopped: 0, pending: 0 };
    const victoryRoutes = {};
    let closedGameCount = 0;
    let resultCount = 0;
    let durationTotal = 0;
    let durationCount = 0;
    let arbiterQuestionCount = 0;
    let playerCount = 0;

    for (const game of games) {
      rulesVersions.set(game.rulesVersion, (rulesVersions.get(game.rulesVersion) || 0) + 1);
      const playMode = ["tts", "physical"].includes(game.metadata?.playMode) ? game.metadata.playMode : "unspecified";
      playModes[playMode] = (playModes[playMode] || 0) + 1;
      for (const event of game.events || []) {
        if (event.eventType !== "diagnostic_flag" || !event.data?.flag) continue;
        diagnosticFlags[event.data.flag] = (diagnosticFlags[event.data.flag] || 0) + 1;
      }
      if (game.status === "closed") closedGameCount += 1;
      arbiterQuestionCount += game.arbiterQuestions.length;
      playerCount += game.players.length;
      if (game.result) {
        resultCount += 1;
        completion[game.result.completionStatus] = (completion[game.result.completionStatus] || 0) + 1;
        if (Number.isFinite(game.result.durationMinutes)) {
          durationTotal += game.result.durationMinutes;
          durationCount += 1;
        }
        if (game.result.victoryRoute) victoryRoutes[game.result.victoryRoute] = (victoryRoutes[game.result.victoryRoute] || 0) + 1;
      } else completion.pending += 1;

      for (const player of game.players) {
        const won = Boolean(game.result?.winnerParticipantId && game.result.winnerParticipantId === player.participantId);
        const faction = ensureGroup(factions, player.faction);
        const leader = ensureGroup(leaders, player.leader);
        for (const group of [faction, leader]) {
          group.playerCount += 1;
          group.games.add(game.sessionId);
          if (won) group.wins += 1;
        }
        if (!player.response) continue;
        responses.push(player.response);
        const decisionPoint = player.response.feltDecidedWhen || "never";
        const agency = player.response.agencyAfterDecided || "not_applicable";
        decisionPoints[decisionPoint] = (decisionPoints[decisionPoint] || 0) + 1;
        agencyAfterDecided[agency] = (agencyAfterDecided[agency] || 0) + 1;
        addGroupResponse(faction, player.response);
        addGroupResponse(leader, player.response);
      }
    }

    const playAgainYes = responses.filter((response) => response.playAgain).length;
    return {
      gameCount: games.length,
      closedGameCount,
      openGameCount: games.length - closedGameCount,
      resultCount,
      playerCount,
      responseCount: responses.length,
      responseCompletionRate: playerCount ? responses.length / playerCount : null,
      playAgainRate: responses.length ? playAgainYes / responses.length : null,
      averageDurationMinutes: durationCount ? round(durationTotal / durationCount, 1) : null,
      arbiterQuestionCount,
      completion,
      victoryRoutes,
      rulesVersions: Object.fromEntries(rulesVersions),
      playModes,
      diagnosticFlags,
      decisionPoints,
      agencyAfterDecided,
      ratingAverages: averageRatings(responses),
      factions: finalizeGroups(factions),
      leaders: finalizeGroups(leaders)
    };
  }

  function ensureGroup(map, key) {
    if (!map.has(key)) map.set(key, {
      playerCount: 0,
      games: new Set(),
      responseCount: 0,
      wins: 0,
      playAgainYes: 0,
      totals: Object.fromEntries(RATING_DEFS.map(([rating]) => [rating, 0]))
    });
    return map.get(key);
  }

  function addGroupResponse(group, response) {
    group.responseCount += 1;
    if (response.playAgain) group.playAgainYes += 1;
    for (const [key] of RATING_DEFS) group.totals[key] += Number(response[key] || 0);
  }

  function finalizeGroups(map) {
    return Object.fromEntries(Array.from(map.entries()).map(([key, group]) => [key, {
      playerCount: group.playerCount,
      gameCount: group.games.size,
      responseCount: group.responseCount,
      wins: group.wins,
      playAgainRate: group.responseCount ? group.playAgainYes / group.responseCount : null,
      ratingAverages: Object.fromEntries(RATING_DEFS.map(([rating]) => [rating, group.responseCount ? round(group.totals[rating] / group.responseCount, 2) : null]))
    }]));
  }

  function averageRatings(responses) {
    return Object.fromEntries(RATING_DEFS.map(([key]) => {
      const values = responses.map((response) => Number(response[key])).filter(Number.isFinite);
      return [key, values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 2) : null];
    }));
  }

  function gameSearchText(game) {
    const values = [game.sheetSerial, game.rulesVersion, game.status, JSON.stringify(game.metadata || {})];
    if (game.result) values.push(...Object.values(game.result));
    for (const player of game.players) {
      values.push(player.displayName, player.faction, factionName(player.faction), player.leader, player.selectionReason);
      if (player.response) values.push(...Object.values(player.response));
    }
    for (const question of game.arbiterQuestions) values.push(question.question, question.answer, question.classification, question.displayName);
    return values.filter((value) => value != null).join(" ").toLowerCase();
  }

  function participantSeat(game, participantId) {
    return game.players.find((player) => player.participantId === participantId)?.seatIndex || "";
  }

  function updateFreshness(value) {
    el.dataFreshness.textContent = `Compiled ${formatDate(value)} from the protected session database.`;
  }

  function setConnection(message, kind) {
    el.connectionStatus.textContent = message;
    el.connectionStatus.className = `connection-status${kind ? ` ${kind}` : ""}`;
  }

  function setStatus(element, message, kind = "") {
    element.textContent = message;
    element.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function setFormBusy(form, busy) {
    form?.querySelectorAll("button, input, select, textarea").forEach((control) => { control.disabled = busy; });
  }

  function restoreSelect(select, value) {
    if (Array.from(select.options).some((option) => option.value === value)) select.value = value;
  }

  function unique(values) { return Array.from(new Set(values)); }
  function factionName(value) { return FACTIONS[value]?.name || titleCase(value); }
  function factionSort(a, b) { return Object.keys(FACTIONS).indexOf(a) - Object.keys(FACTIONS).indexOf(b); }
  function formatRating(value) { return value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(2); }
  function formatPercent(value) { return value == null || !Number.isFinite(Number(value)) ? "—" : `${Math.round(Number(value) * 100)}%`; }
  function round(value, places) { const factor = 10 ** places; return Math.round(value * factor) / factor; }
  function titleCase(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
  function formatDate(value, includeTime = true) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return String(value || "");
    return new Intl.DateTimeFormat(undefined, includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
  }
  function dateStamp() { return new Date().toISOString().slice(0, 10); }
  function emptyState(message) { return `<div class="empty-state">${escapeHtml(message)}</div>`; }

  function downloadJson(filename, value) {
    downloadBlob(filename, `${JSON.stringify(value, null, 2)}\n`, "application/json");
  }

  function downloadCsv(filename, rows) {
    const headers = unique(rows.flatMap((row) => Object.keys(row)));
    const content = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
      .map((row) => row.map(csvCell).join(",")).join("\n");
    downloadBlob(filename, `${content}\n`, "text/csv");
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

  function structuredCloneSafe(value) {
    return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function escapeAttribute(value) { return escapeHtml(value); }
})();
