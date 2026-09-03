(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");

  const FACTIONS = Object.freeze({
    military: { name: "Military", color: "#9e262c" },
    diplomats: { name: "Diplomats", color: "#264f91" },
    financiers: { name: "Financiers", color: "#227044" },
    intelligence: { name: "Intelligence", color: "#282827" },
    mystics: { name: "Mystics", color: "#5d347e" },
    inquisition: { name: "Inquisition", color: "#a67a27" }
  });

  const REASONS = Object.freeze({
    test: "Test or deployment check",
    duplicate: "Duplicate submission",
    incomplete: "Incomplete or abandoned record",
    invalid: "Invalid or unreliable response",
    corrupted: "Corrupted or technically malformed",
    other: "Other"
  });

  const state = { token: "", reviewer: "", payload: null };
  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    for (const id of [
      "accessPanel", "accessForm", "adminToken", "reviewerName", "accessStatus",
      "integrityApp", "dataFreshness", "connectionStatus", "refreshData", "lockPage",
      "metricActiveGames", "metricExcludedGames", "metricExcludedResponses", "metricHistory",
      "activeRecords", "excludedRecords", "historyRows", "excludeDialog", "excludeForm",
      "excludeTarget", "excludeTargetType", "excludeTargetId", "reasonCode", "reasonNote",
      "dialogStatus", "cancelExclude"
    ]) el[id] = document.getElementById(id);

    el.accessForm?.addEventListener("submit", unlock);
    el.refreshData?.addEventListener("click", refresh);
    el.lockPage?.addEventListener("click", lock);
    el.activeRecords?.addEventListener("click", handleActiveClick);
    el.excludedRecords?.addEventListener("click", handleExcludedClick);
    el.excludeForm?.addEventListener("submit", submitExclusion);
    el.cancelExclude?.addEventListener("click", () => el.excludeDialog.close());
    el.reasonCode?.addEventListener("change", () => {
      el.reasonNote.required = el.reasonCode.value === "other";
    });
  }

  async function unlock(event) {
    event.preventDefault();
    const token = el.adminToken.value.trim();
    const reviewer = el.reviewerName.value.trim();
    if (!token || !reviewer) return;
    setBusy(el.accessForm, true);
    setStatus(el.accessStatus, "Loading protected integrity data…");
    try {
      const payload = await request("GET", null, token);
      state.token = token;
      state.reviewer = reviewer;
      state.payload = payload;
      el.adminToken.value = "";
      el.reviewerName.value = "";
      el.accessPanel.hidden = true;
      el.integrityApp.hidden = false;
      render();
      setConnection("Protected data loaded", "");
    } catch (error) {
      setStatus(el.accessStatus, error.message || "Integrity data could not be loaded.", "error");
    } finally {
      setBusy(el.accessForm, false);
    }
  }

  async function refresh() {
    if (!state.token) return;
    el.refreshData.disabled = true;
    setConnection("Refreshing…", "loading");
    try {
      state.payload = await request("GET");
      render();
      setConnection("Protected data loaded", "");
    } catch (error) {
      setConnection("Refresh failed", "error");
      window.alert(error.message || "Integrity data could not be refreshed.");
    } finally {
      el.refreshData.disabled = false;
    }
  }

  function lock() {
    state.token = "";
    state.reviewer = "";
    state.payload = null;
    el.integrityApp.hidden = true;
    el.accessPanel.hidden = false;
    el.accessForm.reset();
    setStatus(el.accessStatus, "Integrity page locked. Credentials were cleared from memory.", "success");
    el.adminToken.focus();
  }

  function render() {
    const payload = state.payload || {};
    const summary = payload.summary || {};
    el.metricActiveGames.textContent = String(summary.activeGameCount || 0);
    el.metricExcludedGames.textContent = String(summary.excludedGameCount || 0);
    el.metricExcludedResponses.textContent = String(summary.excludedResponseCount || 0);
    el.metricHistory.textContent = String(summary.historyCount || 0);
    el.dataFreshness.textContent = `Loaded ${formatDate(payload.generatedAt)} · Reviewer ${state.reviewer}`;
    renderActive(payload.activeGames || []);
    renderExcluded(payload.excludedGames || [], payload.excludedResponses || []);
    renderHistory(payload.history || []);
  }

  function renderActive(games) {
    if (!games.length) {
      el.activeRecords.innerHTML = emptyState("No tracked games remain in the active research dataset.");
      return;
    }
    el.activeRecords.innerHTML = games.map((game) => {
      const players = (game.players || []).map((player) => {
        const response = player.response;
        return `<article class="player-integrity" style="--faction:${escapeAttribute(FACTIONS[player.faction]?.color || "#777")}">
          <h4>Seat ${number(player.seatIndex)} · ${escapeHtml(player.displayName)}</h4>
          <p><strong>${escapeHtml(player.leader || "Unknown Leader")}</strong> · ${escapeHtml(factionName(player.faction))}</p>
          ${response ? `<p>Questionnaire submitted ${escapeHtml(formatDate(response.submittedAt))}. Fun ${number(response.fun)}/5 · Rules ${number(response.rulesClarity)}/5 · Play again ${response.playAgain ? "Yes" : "No"}.</p>
          <button class="button danger small" type="button" data-exclude-type="response" data-exclude-id="${escapeAttribute(player.participantId)}" data-exclude-label="${escapeAttribute(`${game.sheetSerial} · Seat ${player.seatIndex} · ${player.displayName}`)}" aria-label="${escapeAttribute(`Exclude response — ${game.sheetSerial} · Seat ${player.seatIndex} · ${player.displayName}`)}">Exclude response</button>` : "<p>No questionnaire response is present.</p>"}
        </article>`;
      }).join("");
      return `<details class="integrity-game">
        <summary><div><h3>${escapeHtml(game.sheetSerial)}</h3><div class="record-meta">${escapeHtml(game.rulesVersion)} · ${escapeHtml(formatDate(game.createdAt))} · ${(game.players || []).map((player) => escapeHtml(player.leader || "Unknown")).join(" vs. ") || "Players pending"}</div></div><span class="status-pill ${escapeAttribute(game.status)}">${escapeHtml(game.status)}</span></summary>
        <div class="integrity-game-content">
          <div class="record-actions"><button class="button danger small" type="button" data-exclude-type="game" data-exclude-id="${escapeAttribute(game.sessionId)}" data-exclude-label="${escapeAttribute(`${game.sheetSerial} · complete game record`)}" aria-label="${escapeAttribute(`Exclude entire game — ${game.sheetSerial}`)}">Exclude entire game</button></div>
          <div class="player-integrity-grid">${players || "<p>No players joined.</p>"}</div>
        </div>
      </details>`;
    }).join("");
  }

  function renderExcluded(games, responses) {
    const cards = [];
    for (const item of games) {
      const game = item.game || {};
      cards.push(excludedCard(
        item.exclusion,
        `${game.sheetSerial || "Tracked game"} · entire game`,
        `${game.rulesVersion || "Unknown version"} · ${(game.players || []).map((player) => player.leader).filter(Boolean).join(" vs. ") || "Players unavailable"}`
      ));
    }
    for (const item of responses) {
      const game = item.game || {};
      const player = item.player || {};
      cards.push(excludedCard(
        item.exclusion,
        `${game.sheetSerial || "Tracked game"} · Seat ${player.seatIndex || "?"} · ${player.displayName || "Unnamed player"}`,
        `${player.leader || "Unknown Leader"} · ${factionName(player.faction)} · questionnaire response`
      ));
    }
    el.excludedRecords.innerHTML = cards.length ? cards.join("") : emptyState("No games or questionnaire responses are currently excluded.");
  }

  function excludedCard(exclusion, title, meta) {
    return `<article class="excluded-record">
      <div><h3>${escapeHtml(title)}</h3><div class="record-meta">${escapeHtml(meta)}</div>
      <p class="exclusion-reason">${escapeHtml(reasonLabel(exclusion.reasonCode))} · excluded by ${escapeHtml(exclusion.excludedBy)} on ${escapeHtml(formatDate(exclusion.excludedAt))}</p>
      ${exclusion.reasonNote ? `<p class="exclusion-note">${escapeHtml(exclusion.reasonNote)}</p>` : ""}</div>
      <button class="button secondary small" type="button" data-restore-id="${escapeAttribute(exclusion.id)}" data-restore-label="${escapeAttribute(title)}" aria-label="${escapeAttribute(`Restore record — ${title}`)}">Restore record</button>
    </article>`;
  }

  function renderHistory(history) {
    el.historyRows.innerHTML = history.length ? history.map((item) => {
      const status = item.restoredAt ? "restored" : "active";
      const target = item.targetType === "game" ? "Entire game" : "Questionnaire response";
      return `<tr><td><span class="audit-status ${status}">${status}</span></td>
        <td>${escapeHtml(target)}<br><small>${escapeHtml(item.targetId)}</small></td>
        <td>${escapeHtml(reasonLabel(item.reasonCode))}${item.reasonNote ? `<br><small>${escapeHtml(item.reasonNote)}</small>` : ""}</td>
        <td>${escapeHtml(formatDate(item.excludedAt))}<br><small>${escapeHtml(item.excludedBy)}</small></td>
        <td>${item.restoredAt ? `${escapeHtml(formatDate(item.restoredAt))}<br><small>${escapeHtml(item.restoredBy || "Unknown")}</small>` : "—"}</td></tr>`;
    }).join("") : `<tr><td colspan="5">No exclusion actions have been recorded.</td></tr>`;
  }

  function handleActiveClick(event) {
    const button = event.target.closest("[data-exclude-type]");
    if (!button) return;
    el.excludeTargetType.value = button.dataset.excludeType;
    el.excludeTargetId.value = button.dataset.excludeId;
    el.excludeTarget.textContent = button.dataset.excludeLabel;
    el.reasonCode.value = "";
    el.reasonNote.value = "";
    el.reasonNote.required = false;
    setStatus(el.dialogStatus, "");
    el.excludeDialog.showModal();
  }

  async function submitExclusion(event) {
    event.preventDefault();
    const reasonCode = el.reasonCode.value;
    const reasonNote = el.reasonNote.value.trim();
    if (!reasonCode) return setStatus(el.dialogStatus, "Select an exclusion reason.", "error");
    if (reasonCode === "other" && !reasonNote) return setStatus(el.dialogStatus, "Add an audit note for Other.", "error");
    setBusy(el.excludeForm, true);
    setStatus(el.dialogStatus, "Excluding record…");
    try {
      state.payload = await request("POST", {
        action: "exclude",
        targetType: el.excludeTargetType.value,
        targetId: el.excludeTargetId.value,
        reasonCode,
        reasonNote,
        reviewer: state.reviewer
      });
      el.excludeDialog.close();
      render();
      setConnection("Dataset updated", "");
    } catch (error) {
      setStatus(el.dialogStatus, error.message || "The record could not be excluded.", "error");
    } finally {
      setBusy(el.excludeForm, false);
    }
  }

  async function handleExcludedClick(event) {
    const button = event.target.closest("[data-restore-id]");
    if (!button) return;
    const label = button.dataset.restoreLabel || "this record";
    if (!window.confirm(`Restore ${label} to the active research dataset?`)) return;
    button.disabled = true;
    try {
      state.payload = await request("POST", {
        action: "restore",
        exclusionId: button.dataset.restoreId,
        reviewer: state.reviewer
      });
      render();
      setConnection("Record restored", "");
    } catch (error) {
      window.alert(error.message || "The record could not be restored.");
      button.disabled = false;
    }
  }

  async function request(method, body = null, tokenOverride = "") {
    const response = await fetch(`${API_ORIGIN}/api/tracked-analysis/exclusions`, {
      method,
      cache: "no-store",
      headers: {
        "Authorization": `Bearer ${tokenOverride || state.token}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload?.error || `Integrity service returned ${response.status}.`);
    return payload;
  }

  function setBusy(form, busy) {
    for (const control of form.elements) control.disabled = busy;
  }

  function setConnection(text, className) {
    el.connectionStatus.textContent = text;
    el.connectionStatus.className = `connection-status${className ? ` ${className}` : ""}`;
  }

  function setStatus(node, text, className = "") {
    if (!node) return;
    node.textContent = text;
    node.className = `form-status${className ? ` ${className}` : ""}`;
  }

  function emptyState(text) {
    return `<div class="empty-integrity">${escapeHtml(text)}</div>`;
  }

  function reasonLabel(code) {
    return REASONS[code] || code || "Unspecified";
  }

  function factionName(key) {
    return FACTIONS[key]?.name || key || "Unknown faction";
  }

  function formatDate(value) {
    if (!value) return "Unknown time";
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium", timeStyle: "short"
    }).format(date);
  }

  function number(value) {
    return Number.isFinite(Number(value)) ? String(Number(value)) : "—";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[character]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})();
