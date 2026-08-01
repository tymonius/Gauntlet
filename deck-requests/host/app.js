(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const LISTS_KEY = "gauntlet_deck_prep_lists_v1";
  const STATUSES_KEY = "gauntlet_deck_prep_statuses_v1";
  const STATUS_OPTIONS = ["requested", "printed", "prepared", "collected"];
  const params = new URLSearchParams(window.location.search);
  const activeCode = String(params.get("code") || "").trim();
  const activeHostKey = String(params.get("host") || "").trim();
  const activeLabel = cleanText(params.get("label") || "", 120);
  const activeDeadline = cleanDate(params.get("deadline") || "");

  const state = {
    starterDecks: [],
    session: null,
    choices: []
  };
  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    for (const id of [
      "createPrepListForm", "prepLabel", "prepDeadline", "prepAdminToken", "createPrepListButton", "createPrepListStatus",
      "savedPrepLists", "dashboard", "dashboardTitle", "dashboardMeta", "dashboardStatus", "copyRequestLink",
      "refreshRequests", "downloadRequests", "closeRequests", "requestCount", "requestedCount", "preparedCount",
      "collectedCount", "requestList"
    ]) el[id] = document.getElementById(id);

    el.createPrepListForm.addEventListener("submit", createPrepList);
    el.copyRequestLink.addEventListener("click", copyActiveRequestLink);
    el.refreshRequests.addEventListener("click", loadRequests);
    el.downloadRequests.addEventListener("click", downloadCsv);
    el.closeRequests.addEventListener("click", closeActiveList);

    await loadStarterDecks();
    renderSavedLists();

    if (TOKEN_PATTERN.test(activeCode) && TOKEN_PATTERN.test(activeHostKey)) {
      registerActiveList();
      renderSavedLists();
      el.dashboard.hidden = false;
      await loadRequests();
    }
  }

  async function createPrepList(event) {
    event.preventDefault();
    const label = cleanText(el.prepLabel.value, 120);
    const deadline = cleanDate(el.prepDeadline.value);
    const adminToken = el.prepAdminToken.value.trim();
    if (!label) {
      setCreateStatus("Enter a label players will recognize.", "error");
      el.prepLabel.focus();
      return;
    }
    if (!adminToken) {
      setCreateStatus("Enter the facilitator creation key.", "error");
      el.prepAdminToken.focus();
      return;
    }
    if (!window.confirm(`Create the Deck Prep list “${label}”?`)) return;

    setCreateBusy(true);
    setCreateStatus("Checking the request service…");
    try {
      const healthResponse = await fetch(`${API_ORIGIN}/health`, { cache: "no-store" });
      const health = await safeJson(healthResponse);
      if (!healthResponse.ok || !health?.database || !health?.sessionCreationConfigured || !health?.onboardingSupported) {
        throw new Error(health?.error || "The request service is not ready.");
      }

      setCreateStatus("Creating the Deck Prep list…");
      const response = await fetch(`${API_ORIGIN}/api/sessions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rulesVersion: "v0.6.1",
          sessionKind: "event",
          metadata: {
            generatedFrom: "deck-prep-host",
            intendedUse: "deck-prep-list",
            prepLabel: label,
            prepDeadline: deadline || undefined
          }
        })
      });
      const created = await safeJson(response);
      if (!response.ok) throw new Error(created?.error || `Deck Prep creation failed (${response.status}).`);
      if (!TOKEN_PATTERN.test(created?.joinToken || "") || !TOKEN_PATTERN.test(created?.hostKey || "")) {
        throw new Error("The request service did not return usable private links.");
      }

      const record = buildRecord({
        code: created.joinToken,
        hostKey: created.hostKey,
        label,
        deadline,
        sheetSerial: created.sheetSerial,
        createdAt: created.createdAt
      });
      saveList(record);
      el.prepAdminToken.value = "";
      setCreateStatus("Deck Prep list created. Opening the queue…", "success");
      window.setTimeout(() => window.location.assign(record.hostUrl), 200);
    } catch (error) {
      console.error(error);
      setCreateStatus(error.message || "The Deck Prep list could not be created.", "error");
    } finally {
      setCreateBusy(false);
    }
  }

  function registerActiveList() {
    const existing = readLists().find(item => item.code === activeCode);
    const record = buildRecord({
      code: activeCode,
      hostKey: activeHostKey,
      label: activeLabel || existing?.label || "Deck Prep list",
      deadline: activeDeadline || existing?.deadline || "",
      sheetSerial: existing?.sheetSerial || "",
      createdAt: existing?.createdAt || new Date().toISOString()
    });
    saveList(record);
  }

  function buildRecord({ code, hostKey, label, deadline, sheetSerial, createdAt }) {
    const publicUrl = new URL("../../start/", window.location.href);
    publicUrl.searchParams.set("request", code);
    publicUrl.searchParams.set("label", label);
    if (deadline) publicUrl.searchParams.set("deadline", deadline);

    const hostUrl = new URL("./", window.location.href);
    hostUrl.searchParams.set("code", code);
    hostUrl.searchParams.set("host", hostKey);
    hostUrl.searchParams.set("label", label);
    if (deadline) hostUrl.searchParams.set("deadline", deadline);

    return {
      code,
      hostKey,
      label,
      deadline,
      sheetSerial: sheetSerial || "",
      publicUrl: publicUrl.href,
      hostUrl: hostUrl.href,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function renderSavedLists() {
    const lists = readLists().sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    if (!lists.length) {
      el.savedPrepLists.className = "saved-list-grid empty-state";
      el.savedPrepLists.textContent = "No Deck Prep lists are saved in this browser yet.";
      return;
    }
    el.savedPrepLists.className = "saved-list-grid";
    el.savedPrepLists.innerHTML = lists.map(list => `
      <article class="saved-card">
        <p class="eyebrow">${escapeHtml(list.sheetSerial || "Deck Prep")}</p>
        <h3>${escapeHtml(list.label)}</h3>
        <p>${list.deadline ? `Requests due ${escapeHtml(formatDate(list.deadline))}` : "No request deadline"}</p>
        <div class="saved-actions">
          <a class="primary" href="${escapeAttribute(list.hostUrl)}">Open queue</a>
          <button type="button" data-copy-code="${escapeAttribute(list.code)}">Copy request link</button>
          <button type="button" data-forget-code="${escapeAttribute(list.code)}">Forget</button>
        </div>
      </article>`).join("");

    el.savedPrepLists.querySelectorAll("[data-copy-code]").forEach(button => {
      button.addEventListener("click", () => {
        const list = readLists().find(item => item.code === button.dataset.copyCode);
        if (list) copyText(list.publicUrl, button, "Copied");
      });
    });
    el.savedPrepLists.querySelectorAll("[data-forget-code]").forEach(button => {
      button.addEventListener("click", () => {
        if (!window.confirm("Forget this private Deck Prep shortcut on this browser? The server-backed requests are not deleted.")) return;
        writeLists(readLists().filter(item => item.code !== button.dataset.forgetCode));
        renderSavedLists();
      });
    });
  }

  async function loadRequests() {
    if (!TOKEN_PATTERN.test(activeCode) || !TOKEN_PATTERN.test(activeHostKey)) return;
    setDashboardStatus("Loading Deck requests…");
    try {
      const response = await fetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(activeCode)}/onboarding?host=${encodeURIComponent(activeHostKey)}`, { cache: "no-store" });
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || `Request queue failed (${response.status}).`);
      state.session = payload.session;
      state.choices = Array.isArray(payload.choices) ? payload.choices : [];
      updateActiveRecordFromSession();
      renderDashboard();
      setDashboardStatus(`Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`, "success");
    } catch (error) {
      console.error(error);
      setDashboardStatus(error.message || "The request queue could not be loaded.", "error");
      el.requestList.className = "request-list empty-state";
      el.requestList.textContent = "Unable to load requests.";
    }
  }

  function updateActiveRecordFromSession() {
    const lists = readLists();
    const list = lists.find(item => item.code === activeCode);
    if (!list) return;
    if (state.session?.sheetSerial) list.sheetSerial = state.session.sheetSerial;
    list.updatedAt = new Date().toISOString();
    writeLists(lists);
    renderSavedLists();
  }

  function renderDashboard() {
    const list = activeList();
    const label = list?.label || activeLabel || "Deck Prep list";
    el.dashboardTitle.textContent = label;
    const deadlineText = list?.deadline ? ` · requests due ${formatDate(list.deadline)}` : "";
    el.dashboardMeta.textContent = `${state.session?.sheetSerial || "Deck Prep"}${deadlineText} · ${state.session?.status === "closed" ? "requests closed" : "accepting requests"}`;
    el.closeRequests.disabled = state.session?.status === "closed";

    if (!state.choices.length) {
      el.requestList.className = "request-list empty-state";
      el.requestList.textContent = "No Deck requests have been submitted yet. Copy the player request link and send it to the group.";
      updateSummary();
      return;
    }

    el.requestList.className = "request-list";
    el.requestList.innerHTML = state.choices.map(choice => requestCard(choice)).join("");
    el.requestList.querySelectorAll("[data-request-status]").forEach(select => {
      select.addEventListener("change", () => {
        setRequestStatus(select.dataset.requestStatus, select.value);
        renderDashboard();
      });
    });
    updateSummary();
  }

  function requestCard(choice) {
    const deck = matchingDeck(choice);
    const status = requestStatus(choice.participantId);
    const printUrl = new URL("../../deckbuilder/", window.location.href);
    printUrl.searchParams.set("faction", choice.faction);
    printUrl.searchParams.set("leader", deck?.leaderId || slugify(choice.leader));
    printUrl.searchParams.set("starter", "1");
    printUrl.searchParams.set("source", "deck-request");
    const territories = deck?.territories?.join(" → ") || "Open the Deckbuilder to view the recommended Territories.";
    const submitted = choice.submittedAt ? new Date(choice.submittedAt).toLocaleString() : "Submission time unavailable";
    return `
      <article class="request-card status-${escapeAttribute(status)}">
        <div>
          <p class="eyebrow">${escapeHtml(choice.faction)} · ${escapeHtml(choice.leader)}</p>
          <h3>${escapeHtml(choice.displayName)}</h3>
          <div class="request-meta">
            <span>${escapeHtml(deck?.name || "Recommended starter Deck")}</span>
            <span>${escapeHtml(submitted)}</span>
          </div>
          <p><strong>Territories, from their end outward:</strong> ${escapeHtml(territories)}</p>
          ${choice.reason ? `<p class="note"><strong>Player note:</strong> ${escapeHtml(choice.reason)}</p>` : ""}
          <div class="request-actions"><a class="primary" href="${escapeAttribute(printUrl.href)}">Open and print this Deck</a></div>
        </div>
        <div class="request-control">
          <label>Preparation status
            <select data-request-status="${escapeAttribute(choice.participantId)}">
              ${STATUS_OPTIONS.map(option => `<option value="${option}"${option === status ? " selected" : ""}>${statusLabel(option)}</option>`).join("")}
            </select>
          </label>
          <p class="status-help">The player may revise their faction or Leader from the same request link. Refresh before printing to confirm the latest choice.</p>
        </div>
      </article>`;
  }

  function updateSummary() {
    const statuses = state.choices.map(choice => requestStatus(choice.participantId));
    el.requestCount.textContent = String(state.choices.length);
    el.requestedCount.textContent = String(statuses.filter(status => status === "requested").length);
    el.preparedCount.textContent = String(statuses.filter(status => status === "prepared").length);
    el.collectedCount.textContent = String(statuses.filter(status => status === "collected").length);
  }

  async function closeActiveList() {
    if (!window.confirm("Close this Deck Prep list? Players will no longer be able to submit or revise requests, but they can still print their own Decks.")) return;
    setDashboardStatus("Closing requests…");
    try {
      const response = await fetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(activeCode)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostKey: activeHostKey })
      });
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || `Closing requests failed (${response.status}).`);
      state.session = payload;
      renderDashboard();
      setDashboardStatus("Requests closed. Existing choices remain available for preparation.", "success");
    } catch (error) {
      console.error(error);
      setDashboardStatus(error.message || "Requests could not be closed.", "error");
    }
  }

  function copyActiveRequestLink() {
    const list = activeList();
    if (!list) return;
    copyText(list.publicUrl, el.copyRequestLink, "Copied");
  }

  function downloadCsv() {
    if (!state.choices.length) {
      setDashboardStatus("There are no requests to download.", "error");
      return;
    }
    const rows = [["Player", "Faction", "Leader", "Starter Deck", "Territories", "Status", "Player Note", "Submitted"]];
    state.choices.forEach(choice => {
      const deck = matchingDeck(choice);
      rows.push([
        choice.displayName,
        choice.faction,
        choice.leader,
        deck?.name || "Recommended starter Deck",
        deck?.territories?.join(" | ") || "",
        statusLabel(requestStatus(choice.participantId)),
        choice.reason || "",
        choice.submittedAt || ""
      ]);
    });
    const csv = rows.map(row => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(activeList()?.label || "gauntlet-deck-prep")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setDashboardStatus("Request CSV downloaded.", "success");
  }

  async function loadStarterDecks() {
    try {
      const response = await fetch("../../deckbuilder/starter-decks.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Starter Deck library returned ${response.status}.`);
      const data = await response.json();
      state.starterDecks = Array.isArray(data.decks) ? data.decks : [];
    } catch (error) {
      console.error(error);
      state.starterDecks = [];
    }
  }

  function matchingDeck(choice) {
    const leaderId = slugify(choice.leader);
    return state.starterDecks.find(deck => deck.factionId === choice.faction && deck.leaderId === leaderId) || null;
  }

  function activeList() {
    return readLists().find(item => item.code === activeCode) || null;
  }

  function saveList(record) {
    const lists = readLists().filter(item => item.code !== record.code);
    lists.push(record);
    writeLists(lists);
  }

  function readLists() {
    try {
      const lists = JSON.parse(localStorage.getItem(LISTS_KEY) || "[]");
      return Array.isArray(lists) ? lists.filter(item => item && TOKEN_PATTERN.test(item.code || "") && TOKEN_PATTERN.test(item.hostKey || "")) : [];
    } catch {
      return [];
    }
  }

  function writeLists(lists) {
    try { localStorage.setItem(LISTS_KEY, JSON.stringify(lists)); } catch { /* Private links still work from the URL. */ }
  }

  function readStatuses() {
    try {
      const statuses = JSON.parse(localStorage.getItem(STATUSES_KEY) || "{}");
      return statuses && typeof statuses === "object" && !Array.isArray(statuses) ? statuses : {};
    } catch {
      return {};
    }
  }

  function requestStatus(participantId) {
    const value = readStatuses()[`${activeCode}:${participantId}`];
    return STATUS_OPTIONS.includes(value) ? value : "requested";
  }

  function setRequestStatus(participantId, status) {
    if (!STATUS_OPTIONS.includes(status)) return;
    const statuses = readStatuses();
    statuses[`${activeCode}:${participantId}`] = status;
    try { localStorage.setItem(STATUSES_KEY, JSON.stringify(statuses)); } catch { /* Status remains visible until reload. */ }
  }

  function statusLabel(status) {
    return ({ requested: "Requested", printed: "Printed", prepared: "Prepared", collected: "Collected" })[status] || "Requested";
  }

  function setCreateBusy(busy) {
    el.createPrepListButton.disabled = busy;
    el.prepLabel.disabled = busy;
    el.prepDeadline.disabled = busy;
    el.prepAdminToken.disabled = busy;
  }

  function setCreateStatus(message, kind = "") {
    el.createPrepListStatus.textContent = message;
    el.createPrepListStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function setDashboardStatus(message, kind = "") {
    el.dashboardStatus.textContent = message;
    el.dashboardStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  async function copyText(value, button, successLabel) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = successLabel;
      window.setTimeout(() => { button.textContent = original; }, 1200);
    } catch {
      window.prompt("Copy this link:", value);
    }
  }

  async function safeJson(response) {
    try { return await response.json(); } catch { return null; }
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

  function slugify(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
