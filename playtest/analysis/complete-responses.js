(() => {
  const nativeFetch = window.fetch.bind(window);
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
    military: "Military",
    diplomats: "Diplomats",
    financiers: "Financiers",
    intelligence: "Intelligence",
    mystics: "Mystics",
    inquisition: "Inquisition"
  });

  let rawPayload = null;
  let scheduled = false;
  let lastSignature = "";

  window.fetch = captureAnalysisPayload;
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const target = document.getElementById("analysisApp");
    if (target) {
      new MutationObserver(scheduleEnhancement).observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["hidden"]
      });
    }
    document.addEventListener("click", interceptCompleteExports, true);
    scheduleEnhancement();
  }

  async function captureAnalysisPayload(input, init) {
    const response = await nativeFetch(input, init);
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init?.method || input?.method || "GET").toUpperCase();
    if (!url.includes("/api/tracked-analysis") || method !== "GET" || !response.ok) return response;

    try {
      rawPayload = await response.clone().json();
      const viewPayload = clone(rawPayload);
      viewPayload.games = Array.isArray(viewPayload.games)
        ? viewPayload.games.map(addStandaloneViewResult)
        : [];
      scheduleEnhancement();
      return new Response(JSON.stringify(viewPayload), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch {
      return response;
    }
  }

  function addStandaloneViewResult(game) {
    if (game.result || collectionMode(game) !== "standalone-feedback") return game;
    const player = game.players?.[0];
    const context = standaloneContext(game);
    game.result = {
      submittedByParticipantId: player?.participantId || null,
      completionStatus: context.completionStatus || "unknown",
      firstPlayerParticipantId: context.firstPlayerPerspective === "self" ? player?.participantId || null : null,
      winnerParticipantId: context.outcomePerspective === "self" ? player?.participantId || null : null,
      victoryRoute: knownValue(context.victoryRoute),
      durationMinutes: numberOrNull(context.durationMinutes),
      rounds: numberOrNull(context.rounds),
      battles: numberOrNull(context.battles),
      stopReason: context.stopReason || "",
      packageUnmodified: context.packageUnmodified !== false,
      variantUsed: context.variantUsed === true,
      productionIssue: context.productionIssue || "",
      strongestMoment: context.strongestMoment || "",
      confusingPoint: context.confusingPoint || "",
      importantObservation: context.importantObservation || "",
      submittedAt: player?.response?.submittedAt || game.closedAt || null,
      updatedAt: player?.response?.updatedAt || game.closedAt || null,
      analysisSynthetic: true
    };
    return game;
  }

  function scheduleEnhancement() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhanceVisibleAnalysis();
    });
  }

  function enhanceVisibleAnalysis() {
    if (!rawPayload || document.getElementById("analysisApp")?.hidden) return;
    const records = Array.from(document.querySelectorAll("#gameRecords .game-record"));
    if (!records.length) return;

    const serials = records.map((record) => record.querySelector("h3")?.textContent?.trim()).filter(Boolean);
    const gamesBySerial = new Map((rawPayload.games || []).map((game) => [game.sheetSerial, game]));
    const games = serials.map((serial) => gamesBySerial.get(serial)).filter(Boolean);
    const signature = `${rawPayload.generatedAt || ""}|${serials.join("|")}`;

    for (const record of records) {
      const serial = record.querySelector("h3")?.textContent?.trim();
      const game = gamesBySerial.get(serial);
      if (game) enhanceGameRecord(record, game, signature);
    }

    if (signature !== lastSignature) {
      renderCompleteWrittenFeedback(games);
      lastSignature = signature;
    }
    renderEffectiveOutcomes(games);
    renderEffectiveDuration(games);
    const summary = document.getElementById("filterSummary");
    if (summary) summary.textContent = `${games.length} of ${(rawPayload.games || []).length} playtest game${(rawPayload.games || []).length === 1 ? "" : "s"} in this research slice.`;
  }

  function enhanceGameRecord(record, game, signature) {
    if (record.dataset.completeResponseSignature === signature) return;
    record.dataset.completeResponseSignature = signature;

    const sections = Array.from(record.querySelectorAll(".game-section"));
    const playerSection = sections.find((section) => section.querySelector("h4")?.textContent?.includes("Players"));
    const resultSection = sections.find((section) => section.querySelector("h4")?.textContent?.includes("result"));

    if (playerSection) {
      playerSection.innerHTML = `<h4>Players and complete questionnaires</h4><div class="player-grid">${(game.players || []).map((player) => playerCard(game, player)).join("") || "<p>No players joined.</p>"}</div>`;
    }
    if (resultSection) {
      resultSection.innerHTML = `<h4>${collectionMode(game) === "standalone-feedback" ? "Standalone game context" : "Shared game result"}</h4>${gameContextHtml(game)}`;
    }
  }

  function renderCompleteWrittenFeedback(games) {
    const target = document.getElementById("writtenFeedback");
    if (!target) return;
    const cards = [];
    for (const game of games) {
      for (const player of game.players || []) {
        if (!player.response) continue;
        cards.push(`<article class="feedback-card">
          <header>
            <div><h3>${escapeHtml(player.displayName)}</h3><div class="meta">${escapeHtml(player.leader)} · ${escapeHtml(factionName(player.faction))} · ${escapeHtml(collectionLabel(game))}</div></div>
            <div class="meta">${escapeHtml(game.sheetSerial)}<br>${escapeHtml(displayPlayDate(game))}</div>
          </header>
          <dl>
            <div><dt>Why this faction or Leader?</dt><dd>${escapeHtml(player.response.factionInterest || "")}</dd></div>
            <div><dt>All ratings</dt><dd>${ratingsHtml(player.response)}</dd></div>
            <div><dt>Would play again?</dt><dd>${player.response.playAgain ? "Yes" : "No"}</dd></div>
            ${player.response.comments ? `<div><dt>Additional comments</dt><dd>${escapeHtml(player.response.comments)}</dd></div>` : ""}
            <div><dt>Game context and observations</dt><dd>${gameContextHtml(game)}</dd></div>
          </dl>
        </article>`);
      }
    }
    target.innerHTML = cards.length ? cards.join("") : `<div class="empty-state">No written questionnaire responses are present in this slice.</div>`;
  }

  function playerCard(game, player) {
    const response = player.response;
    return `<article class="player-detail">
      <h5>Seat ${escapeHtml(player.seatIndex)}: ${escapeHtml(player.displayName)}</h5>
      <p><strong>${escapeHtml(player.leader)}</strong> · ${escapeHtml(factionName(player.faction))}</p>
      ${response ? `
        <p><strong>Why this faction or Leader?</strong> ${escapeHtml(response.factionInterest || "")}</p>
        <div class="rating-inline">${ratingsHtml(response)}</div>
        <p><strong>Would play again?</strong> ${response.playAgain ? "Yes" : "No"}</p>
        ${response.comments ? `<p><strong>Additional comments:</strong> ${escapeHtml(response.comments)}</p>` : ""}
      ` : "<p>Questionnaire not submitted.</p>"}
    </article>`;
  }

  function ratingsHtml(response) {
    return RATING_DEFS.map(([key, label]) => `${escapeHtml(label)}: <strong>${formatRating(response?.[key])}</strong>`).join(" · ");
  }

  function gameContextHtml(game) {
    const context = normalizedGameContext(game);
    const facts = [
      ["Collection", collectionLabel(game)],
      ["Date played", displayPlayDate(game)],
      ["Opponent", context.opponent],
      ["Status", titleCase(context.completionStatus)],
      ["First player", context.firstPlayer],
      ["Outcome", context.outcome],
      ["Victory route", context.victoryRoute ? titleCase(context.victoryRoute) : "Unknown / not recorded"],
      ["Duration", context.durationMinutes == null ? "Unknown / not recorded" : `${context.durationMinutes} minutes`],
      ["Rounds", context.rounds == null ? "Unknown / not recorded" : String(context.rounds)],
      ["Battles", context.battles == null ? "Unknown / not recorded" : String(context.battles)],
      ["Generated package unmodified", context.packageUnmodified == null ? "Unknown / not recorded" : context.packageUnmodified ? "Yes" : "No"],
      ["Noncanonical ruling or variant", context.variantUsed == null ? "Unknown / not recorded" : context.variantUsed ? "Yes" : "No"]
    ].filter(([, value]) => value);

    return `<div class="complete-game-context">
      ${facts.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join("")}
      ${context.stopReason ? `<p><strong>Stop reason:</strong> ${escapeHtml(context.stopReason)}</p>` : ""}
      ${context.productionIssue ? `<p><strong>Production or component issue:</strong> ${escapeHtml(context.productionIssue)}</p>` : ""}
      <p><strong>Strongest moment:</strong> ${escapeHtml(context.strongestMoment || "Not recorded")}</p>
      <p><strong>Most confusing or frustrating point:</strong> ${escapeHtml(context.confusingPoint || "Not recorded")}</p>
      <p><strong>One important observation:</strong> ${escapeHtml(context.importantObservation || "Not recorded")}</p>
    </div>`;
  }

  function normalizedGameContext(game) {
    if (collectionMode(game) === "standalone-feedback") {
      const context = standaloneContext(game);
      const player = game.players?.[0];
      const opponent = [context.opponentLeader, factionName(context.opponentFaction)].filter(Boolean).join(" · ") || "Unknown / not entered";
      const firstPlayer = context.firstPlayerPerspective === "self"
        ? player?.displayName || "Respondent"
        : context.firstPlayerPerspective === "opponent"
          ? "Opponent"
          : "Unknown / not recorded";
      const outcome = context.outcomePerspective === "self"
        ? `${player?.displayName || "Respondent"} won`
        : context.outcomePerspective === "opponent"
          ? "Opponent won"
          : context.outcomePerspective === "no_winner"
            ? "No winner"
            : "Unknown / not recorded";
      return {
        opponent,
        completionStatus: context.completionStatus || "unknown",
        firstPlayer,
        outcome,
        victoryRoute: knownValue(context.victoryRoute),
        durationMinutes: numberOrNull(context.durationMinutes),
        rounds: numberOrNull(context.rounds),
        battles: numberOrNull(context.battles),
        stopReason: context.stopReason || "",
        packageUnmodified: typeof context.packageUnmodified === "boolean" ? context.packageUnmodified : null,
        variantUsed: typeof context.variantUsed === "boolean" ? context.variantUsed : null,
        productionIssue: context.productionIssue || "",
        strongestMoment: context.strongestMoment || "",
        confusingPoint: context.confusingPoint || "",
        importantObservation: context.importantObservation || ""
      };
    }

    const result = game.result || {};
    const first = findPlayer(game, result.firstPlayerParticipantId);
    const winner = findPlayer(game, result.winnerParticipantId);
    return {
      opponent: "Recorded from both joined players",
      completionStatus: result.completionStatus || (game.status === "closed" ? "unknown" : "pending"),
      firstPlayer: first ? `${first.displayName} (${first.leader})` : "Unknown / not recorded",
      outcome: winner ? `${winner.displayName} (${winner.leader}) won` : result.completionStatus === "completed" ? "No winner recorded" : "No winner",
      victoryRoute: knownValue(result.victoryRoute),
      durationMinutes: numberOrNull(result.durationMinutes),
      rounds: numberOrNull(result.rounds),
      battles: numberOrNull(result.battles),
      stopReason: result.stopReason || "",
      packageUnmodified: game.result ? Boolean(result.packageUnmodified) : null,
      variantUsed: game.result ? Boolean(result.variantUsed) : null,
      productionIssue: result.productionIssue || "",
      strongestMoment: result.strongestMoment || "",
      confusingPoint: result.confusingPoint || "",
      importantObservation: result.importantObservation || ""
    };
  }

  function renderEffectiveOutcomes(games) {
    const target = document.getElementById("outcomeSummary");
    if (!target) return;
    const completion = { completed: 0, stopped: 0, unknown: 0, pending: 0 };
    const routes = new Map();
    for (const game of games) {
      const context = normalizedGameContext(game);
      const status = context.completionStatus;
      completion[status] = (completion[status] || 0) + 1;
      if (context.victoryRoute) routes.set(context.victoryRoute, (routes.get(context.victoryRoute) || 0) + 1);
    }
    const routeText = Array.from(routes.entries()).sort((a, b) => b[1] - a[1]).map(([route, count]) => `${titleCase(route)}: ${count}`).join(" · ") || "—";
    target.innerHTML = `
      <div class="outcome-card"><strong>${completion.completed || 0}</strong><span>completed games</span></div>
      <div class="outcome-card"><strong>${completion.stopped || 0}</strong><span>stopped early</span></div>
      <div class="outcome-card"><strong>${(completion.unknown || 0) + (completion.pending || 0)}</strong><span>unknown or without a result</span></div>
      <div class="outcome-card"><strong>${escapeHtml(routeText)}</strong><span>victory routes</span></div>`;
  }

  function renderEffectiveDuration(games) {
    const values = games.map((game) => normalizedGameContext(game).durationMinutes).filter(Number.isFinite);
    const target = document.getElementById("metricDuration");
    if (target) target.textContent = values.length ? `${Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)}m` : "—";
  }

  function interceptCompleteExports(event) {
    const button = event.target.closest?.("#downloadBundle, #downloadResponses, #downloadGames");
    if (!button || !rawPayload) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const games = exportGames(currentVisibleGames());
    if (button.id === "downloadBundle") downloadBundle(games);
    if (button.id === "downloadResponses") downloadResponses(games);
    if (button.id === "downloadGames") downloadGames(games);
  }

  function currentVisibleGames() {
    const serials = Array.from(document.querySelectorAll("#gameRecords .game-record h3")).map((heading) => heading.textContent.trim());
    const bySerial = new Map((rawPayload.games || []).map((game) => [game.sheetSerial, game]));
    return serials.map((serial) => bySerial.get(serial)).filter(Boolean);
  }

  function exportGames(games) {
    const exported = clone(games);
    const anonymize = document.getElementById("anonymizeExports")?.checked !== false;
    if (!anonymize) return exported;
    exported.forEach((game, gameIndex) => {
      const ids = new Map();
      for (const player of game.players || []) {
        const replacementId = `game-${gameIndex + 1}-seat-${player.seatIndex}`;
        ids.set(player.participantId, replacementId);
        player.participantId = replacementId;
        player.displayName = `Player ${gameIndex + 1}-${player.seatIndex}`;
      }
      if (game.result) {
        for (const key of ["submittedByParticipantId", "firstPlayerParticipantId", "winnerParticipantId"]) {
          if (ids.has(game.result[key])) game.result[key] = ids.get(game.result[key]);
        }
      }
      for (const question of game.arbiterQuestions || []) {
        if (ids.has(question.participantId)) question.participantId = ids.get(question.participantId);
        if (question.seatIndex) question.displayName = `Player ${gameIndex + 1}-${question.seatIndex}`;
      }
      game.events = replaceParticipantReferences(game.events || [], ids);
    });
    return exported;
  }

  function downloadBundle(games) {
    const bundle = {
      schemaVersion: "gauntlet-playtest-analysis-export-v2",
      sourceSchemaVersion: rawPayload.schemaVersion || null,
      generatedAt: new Date().toISOString(),
      sourceGeneratedAt: rawPayload.generatedAt || null,
      filters: readFilters(),
      privacy: { playerNamesAnonymized: document.getElementById("anonymizeExports")?.checked !== false },
      analysisBrief: {
        purpose: "Review all Gauntlet playtest results and complete questionnaire responses, including standalone recollections.",
        ratingScale: "All questionnaire ratings use a 1–5 scale, with 5 most positive.",
        collectionModes: "live-tracked and retrospective records may contain a shared result; standalone-feedback records contain one respondent's remembered context and are explicitly labeled.",
        caveats: rawPayload.caveats || []
      },
      games
    };
    downloadJson(`gauntlet-playtest-analysis-${dateStamp()}.json`, bundle);
    setExportStatus(`${games.length} playtest game${games.length === 1 ? "" : "s"} exported as a complete analysis bundle.`);
  }

  function downloadResponses(games) {
    const rows = [];
    for (const game of games) {
      const context = normalizedGameContext(game);
      for (const player of game.players || []) {
        if (!player.response) continue;
        rows.push({
          sheet_serial: game.sheetSerial,
          collection_mode: collectionMode(game),
          played_on: game.playedOn || game.metadata?.playedOn || "",
          session_status: game.status,
          rules_version: game.rulesVersion,
          created_at: game.createdAt,
          closed_at: game.closedAt || "",
          opponent_faction: collectionMode(game) === "standalone-feedback" ? factionName(standaloneContext(game).opponentFaction) : opponentForPlayer(game, player)?.faction || "",
          opponent_leader: collectionMode(game) === "standalone-feedback" ? standaloneContext(game).opponentLeader || "" : opponentForPlayer(game, player)?.leader || "",
          completion_status: context.completionStatus,
          first_player: context.firstPlayer,
          outcome: context.outcome,
          victory_route: context.victoryRoute || "",
          duration_minutes: context.durationMinutes ?? "",
          rounds: context.rounds ?? "",
          battles: context.battles ?? "",
          stop_reason: context.stopReason,
          package_unmodified: yesNoUnknown(context.packageUnmodified),
          variant_used: yesNoUnknown(context.variantUsed),
          production_issue: context.productionIssue,
          strongest_moment: context.strongestMoment,
          confusing_point: context.confusingPoint,
          important_observation: context.importantObservation,
          seat: player.seatIndex,
          player: player.displayName,
          faction: factionName(player.faction),
          leader: player.leader,
          faction_interest: player.response.factionInterest,
          expectation_match: player.response.expectationMatch,
          leader_distinction: player.response.leaderDistinction,
          fun: player.response.fun,
          pacing: player.response.pacing,
          meaningful_decisions: player.response.meaningfulDecisions,
          battle_tension: player.response.battleTension,
          rules_clarity: player.response.rulesClarity,
          faction_clarity: player.response.factionClarity,
          table_organization: player.response.tableOrganization,
          play_again: player.response.playAgain ? "yes" : "no",
          comments: player.response.comments || ""
        });
      }
    }
    downloadCsv(`gauntlet-playtest-responses-${dateStamp()}.csv`, rows);
    setExportStatus(`${rows.length} complete questionnaire response${rows.length === 1 ? "" : "s"} exported.`);
  }

  function downloadGames(games) {
    const rows = games.map((game) => {
      const context = normalizedGameContext(game);
      const first = game.players?.find((player) => player.seatIndex === 1);
      const second = game.players?.find((player) => player.seatIndex === 2);
      const standalone = standaloneContext(game);
      return {
        sheet_serial: game.sheetSerial,
        collection_mode: collectionMode(game),
        played_on: game.playedOn || game.metadata?.playedOn || "",
        session_status: game.status,
        rules_version: game.rulesVersion,
        created_at: game.createdAt,
        closed_at: game.closedAt || "",
        player_1: first?.displayName || "",
        player_1_faction: factionName(first?.faction),
        player_1_leader: first?.leader || "",
        player_2: second?.displayName || "",
        player_2_faction: second ? factionName(second.faction) : factionName(standalone.opponentFaction),
        player_2_leader: second?.leader || standalone.opponentLeader || "",
        completion_status: context.completionStatus,
        first_player: context.firstPlayer,
        outcome: context.outcome,
        victory_route: context.victoryRoute || "",
        duration_minutes: context.durationMinutes ?? "",
        rounds: context.rounds ?? "",
        battles: context.battles ?? "",
        stop_reason: context.stopReason,
        package_unmodified: yesNoUnknown(context.packageUnmodified),
        variant_used: yesNoUnknown(context.variantUsed),
        production_issue: context.productionIssue,
        strongest_moment: context.strongestMoment,
        confusing_point: context.confusingPoint,
        important_observation: context.importantObservation,
        response_count: (game.players || []).filter((player) => player.response).length,
        arbiter_question_count: (game.arbiterQuestions || []).length
      };
    });
    downloadCsv(`gauntlet-playtest-games-${dateStamp()}.csv`, rows);
    setExportStatus(`${rows.length} complete game record${rows.length === 1 ? "" : "s"} exported.`);
  }

  function standaloneContext(game) {
    return game.standaloneContext || game.metadata?.standaloneContext || {};
  }

  function collectionMode(game) {
    return game.collectionMode || game.metadata?.collectionMode || "live-tracked";
  }

  function collectionLabel(game) {
    const mode = collectionMode(game);
    if (mode === "standalone-feedback") return "Standalone feedback";
    if (mode === "retrospective") return "Retrospective record";
    return "Live tracked game";
  }

  function displayPlayDate(game) {
    const playedOn = game.playedOn || game.metadata?.playedOn;
    if (playedOn) {
      const date = new Date(`${playedOn}T00:00:00`);
      if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
    }
    return formatDate(game.createdAt, false);
  }

  function opponentForPlayer(game, player) {
    return (game.players || []).find((candidate) => candidate.participantId !== player.participantId) || null;
  }

  function findPlayer(game, participantId) {
    return (game.players || []).find((player) => player.participantId === participantId) || null;
  }

  function knownValue(value) {
    return value && value !== "unknown" ? value : null;
  }

  function numberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) && value !== null && value !== "" ? number : null;
  }

  function yesNoUnknown(value) {
    return value == null ? "" : value ? "yes" : "no";
  }

  function readFilters() {
    return {
      status: document.getElementById("filterStatus")?.value || "all",
      version: document.getElementById("filterVersion")?.value || "all",
      faction: document.getElementById("filterFaction")?.value || "all",
      leader: document.getElementById("filterLeader")?.value || "all",
      from: document.getElementById("filterFrom")?.value || "",
      to: document.getElementById("filterTo")?.value || "",
      search: document.getElementById("filterSearch")?.value?.trim() || ""
    };
  }

  function replaceParticipantReferences(value, ids) {
    if (Array.isArray(value)) return value.map((item) => replaceParticipantReferences(item, ids));
    if (!value || typeof value !== "object") return ids.has(value) ? ids.get(value) : value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceParticipantReferences(item, ids)]));
  }

  function setExportStatus(message) {
    const target = document.getElementById("exportStatus");
    if (!target) return;
    target.textContent = message;
    target.className = "form-status success";
  }

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

  function factionName(value) {
    return value ? FACTIONS[value] || titleCase(value) : "";
  }

  function formatRating(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(0) : "—";
  }

  function titleCase(value) {
    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value, includeTime = true) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return String(value || "");
    return new Intl.DateTimeFormat(undefined, includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
  }

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function clone(value) {
    return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
})();
