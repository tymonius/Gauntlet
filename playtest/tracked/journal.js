(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  if (!TOKEN_PATTERN.test(code)) return;

  const retrospective = params.get("retrospective") === "1";
  const storagePrefix = `gauntlet_tracked_${code.slice(0, 16)}`;
  const participantKey = `${storagePrefix}_participant`;
  const draftKey = `${storagePrefix}_journal_draft`;
  const queueKey = `${storagePrefix}_journal_queue`;
  const CATEGORY_LABELS = Object.freeze({
    rules_confusion: "Rules confusion",
    balance_concern: "Balance concern",
    great_moment: "Great moment",
    frustration: "Frustration",
    component_issue: "Component issue",
    strategic_observation: "Strategic observation",
    other: "Other"
  });

  let participant = null;
  let session = null;
  let notes = [];
  let panel = null;
  let form = null;
  let feedbackNotice = null;
  let refreshTimer = null;
  let participantTimer = null;
  let refreshInFlight = false;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    installStyles();
    installJournalPanel();
    installFeedbackNotice();
    hideLegacyNoteControl();
    bindEvents();
    restoreDraft();
    watchForParticipant();
    observeAppRenders();
    window.addEventListener("online", () => void refreshAll());
    window.addEventListener("focus", () => void refreshAll());
  }

  function installJournalPanel() {
    panel = document.createElement("section");
    panel.id = "playerJournalPanel";
    panel.className = "tracked-panel player-journal-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="journal-heading">
        <div>
          <p class="eyebrow">${retrospective ? "Reconstructed observations" : "During the game"}</p>
          <h2>${retrospective ? "Rebuild your playtest notes." : "Keep a private playtest journal."}</h2>
          <p>${retrospective
            ? "Record only moments you actually remember. These entries are labeled as reconstructed rather than live observations."
            : "Capture the moment now instead of reconstructing it at the end. Your opponent cannot see these notes during play."}</p>
        </div>
        <span id="journalSyncState" class="journal-sync-state" role="status" aria-live="polite">Connecting…</span>
      </div>
      <form id="playerJournalForm" class="journal-form">
        <div class="journal-fields">
          <label>Category
            <select id="journalCategory" required>
              ${Object.entries(CATEGORY_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
            </select>
          </label>
          <label>Round <span class="optional">optional</span>
            <input id="journalRound" type="number" min="0" max="100" inputmode="numeric" />
          </label>
          <label>${retrospective ? "Approx. minute" : "Minute"} <span class="optional">optional</span>
            <input id="journalElapsed" type="number" min="0" max="1440" inputmode="numeric" placeholder="${retrospective ? "From memory" : "Auto if blank"}" />
          </label>
        </div>
        <label>Observation
          <textarea id="journalText" rows="3" maxlength="1000" required placeholder="What happened, what felt unclear, or what should be remembered?"></textarea>
        </label>
        <div class="journal-actions">
          <button class="button primary" type="submit">Save note</button>
          <span id="journalFormStatus" class="form-status" aria-live="polite"></span>
        </div>
      </form>
      <div class="journal-privacy"><strong>Private during play.</strong> Your notes appear in the creator’s private review and analysis export after the game.</div>
      <div id="journalTimeline" class="journal-timeline" aria-live="polite"></div>`;

    const joinedPanel = document.getElementById("joinedPanel");
    const playPanel = document.getElementById("playPanel");
    if (joinedPanel) joinedPanel.insertAdjacentElement("afterend", panel);
    else if (playPanel) playPanel.insertAdjacentElement("beforebegin", panel);
    else document.getElementById("sessionApp")?.append(panel);
    form = panel.querySelector("#playerJournalForm");
  }

  function installFeedbackNotice() {
    feedbackNotice = document.createElement("div");
    feedbackNotice.id = "independentFeedbackNotice";
    feedbackNotice.className = "independent-feedback-notice";
    feedbackNotice.hidden = true;
    feedbackNotice.setAttribute("role", "status");
    feedbackNotice.setAttribute("aria-live", "polite");

    const responseSection = document.getElementById("responseSection");
    const joinedPanel = document.getElementById("joinedPanel");
    if (responseSection) responseSection.insertAdjacentElement("beforebegin", feedbackNotice);
    else if (joinedPanel) joinedPanel.insertAdjacentElement("afterend", feedbackNotice);
    else document.getElementById("sessionApp")?.append(feedbackNotice);
  }

  function hideLegacyNoteControl() {
    const legacy = document.getElementById("noteForm");
    const legacyPanel = legacy?.closest(".note-form, .quick-note, form");
    if (legacyPanel) legacyPanel.hidden = true;
  }

  function bindEvents() {
    form?.addEventListener("submit", saveNote);
    form?.querySelectorAll("textarea, input, select").forEach((control) => {
      control.addEventListener("input", saveDraft);
      control.addEventListener("change", saveDraft);
    });
    document.getElementById("responseForm")?.addEventListener("submit", () => {
      window.setTimeout(() => void refreshAll(), 500);
    });
  }

  function watchForParticipant() {
    detectParticipant();
    participantTimer = window.setInterval(() => {
      const priorId = participant?.participantId;
      detectParticipant();
      if (participant?.participantId && participant.participantId !== priorId) void refreshAll();
    }, 750);
  }

  function detectParticipant() {
    participant = readJsonStorage(participantKey);
    const available = Boolean(participant?.participantId && participant?.participantToken);
    if (panel) panel.hidden = !available;
    if (!available) {
      session = null;
      if (feedbackNotice) feedbackNotice.hidden = true;
      return;
    }
    if (!refreshTimer) {
      void refreshAll();
      refreshTimer = window.setInterval(() => void refreshAll(), 4000);
    }
  }

  function observeAppRenders() {
    const sessionApp = document.getElementById("sessionApp");
    if (!sessionApp) return;
    const observer = new MutationObserver(() => applyFeedbackAccess());
    observer.observe(sessionApp, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
  }

  async function refreshAll() {
    if (refreshInFlight || !participant?.participantId || !participant?.participantToken || document.hidden) return;
    refreshInFlight = true;
    setSyncState("Syncing…", "checking");
    try {
      await flushQueue(false);
      const [notePayload, nextSession] = await Promise.all([getNotes(), getSession()]);
      notes = Array.isArray(notePayload.notes) ? notePayload.notes : [];
      session = nextSession;
      renderTimeline();
      applyFeedbackAccess();
      setFormDisabled(session.status !== "open");
      setSyncState(session.status === "open" ? "Saved" : "Journal closed", session.status === "open" ? "connected" : "closed");
    } catch (error) {
      console.info("Playtest companion refresh skipped.", error);
      setSyncState(navigator.onLine ? "Retrying…" : "Offline — drafts safe", "paused");
    } finally {
      refreshInFlight = false;
    }
  }

  function applyFeedbackAccess() {
    const responseSection = document.getElementById("responseSection");
    if (!responseSection || !participant || !session) return;
    const me = Array.isArray(session.players)
      ? session.players.find((player) => player.participantId === participant.participantId)
      : null;
    if (!me) return;

    const canRespond = session.status === "open" && !me.responseSubmitted;
    responseSection.hidden = !canRespond;

    if (!feedbackNotice) return;
    feedbackNotice.hidden = false;
    if (me.responseSubmitted) {
      feedbackNotice.className = "independent-feedback-notice success";
      feedbackNotice.innerHTML = "<strong>Your feedback is saved.</strong> The other player may still join and submit separately later.";
      return;
    }

    feedbackNotice.className = "independent-feedback-notice";
    if (Number(session.playerCount || 0) < 2) {
      feedbackNotice.innerHTML = "<strong>You do not need to wait for the other player.</strong> Submit your individual feedback below now. The second player can still scan the code and add their own response later.";
    } else if (!session.resultSubmitted) {
      feedbackNotice.innerHTML = "<strong>Individual feedback is independent.</strong> You may submit your questionnaire before the shared result is entered.";
    } else {
      feedbackNotice.innerHTML = "<strong>Complete your own response.</strong> Your opponent submits a separate questionnaire.";
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    if (!participant) return;
    const note = panel.querySelector("#journalText").value.trim();
    if (!note) return;
    const payload = {
      clientNoteId: makeId(),
      category: panel.querySelector("#journalCategory").value,
      round: panel.querySelector("#journalRound").value,
      elapsedMinutes: panel.querySelector("#journalElapsed").value,
      note
    };
    setFormStatus("Saving…");

    try {
      const response = await postNote(payload);
      notes = Array.isArray(response.notes) ? response.notes : notes;
      clearDraftAndForm();
      renderTimeline();
      setFormStatus("Note saved.", "success");
      setSyncState("Saved", "connected");
    } catch (error) {
      queueNote(payload);
      clearDraftAndForm();
      renderQueuedState();
      setFormStatus(navigator.onLine ? "Saved locally; sync will retry." : "Saved locally while offline.", "warning");
      setSyncState("Pending sync", "paused");
    }
  }

  async function flushQueue(showStatus = true) {
    if (!participant || !navigator.onLine) return;
    const queue = readJsonStorage(queueKey) || [];
    if (!Array.isArray(queue) || !queue.length) return;
    const remaining = [];
    for (const item of queue) {
      try {
        const response = await postNote(item);
        if (Array.isArray(response.notes)) notes = response.notes;
      } catch {
        remaining.push(item);
      }
    }
    writeJsonStorage(queueKey, remaining.slice(-50));
    if (showStatus && !remaining.length) setFormStatus("Offline notes synced.", "success");
  }

  function queueNote(payload) {
    const queue = readJsonStorage(queueKey) || [];
    const next = Array.isArray(queue) ? [...queue, payload].slice(-50) : [payload];
    writeJsonStorage(queueKey, next);
  }

  async function getSession() {
    return request(`/api/tracked-games/${encodeURIComponent(code)}`);
  }

  async function getNotes() {
    return request(`/api/tracked-games/${encodeURIComponent(code)}/notes`, {
      headers: participantHeaders()
    });
  }

  async function postNote(payload) {
    return request(`/api/tracked-games/${encodeURIComponent(code)}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...participantHeaders() },
      body: JSON.stringify({
        ...payload,
        participantId: participant.participantId,
        participantToken: participant.participantToken
      })
    });
  }

  async function request(path, options = {}) {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      cache: "no-store",
      ...options,
      headers: { accept: "application/json", ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `The playtest service returned ${response.status}.`);
    return payload;
  }

  function participantHeaders() {
    return {
      "X-Participant-Id": participant.participantId,
      "X-Participant-Token": participant.participantToken
    };
  }

  function renderTimeline() {
    const timeline = panel?.querySelector("#journalTimeline");
    if (!timeline) return;
    if (!notes.length) {
      timeline.innerHTML = "<p class=\"journal-empty\">No journal entries yet.</p>";
      return;
    }
    timeline.innerHTML = notes.map((item) => {
      const context = [
        Number.isInteger(item.round) ? `Round ${item.round}` : "",
        Number.isInteger(item.elapsedMinutes) ? `${item.elapsedMinutes} min` : "",
        item.source === "reconstructed" ? "Reconstructed" : ""
      ].filter(Boolean).join(" · ");
      return `<article class="journal-entry">
        <div class="journal-entry-meta"><strong>${escapeHtml(CATEGORY_LABELS[item.category] || "Other")}</strong>${context ? `<span>${escapeHtml(context)}</span>` : ""}</div>
        <p>${escapeHtml(item.note)}</p>
      </article>`;
    }).join("");
  }

  function renderQueuedState() {
    const timeline = panel?.querySelector("#journalTimeline");
    const queue = readJsonStorage(queueKey) || [];
    if (!timeline || !Array.isArray(queue) || !queue.length) return;
    const queued = `<p class="journal-queued">${queue.length} note${queue.length === 1 ? "" : "s"} waiting to sync.</p>`;
    timeline.insertAdjacentHTML("afterbegin", queued);
  }

  function saveDraft() {
    if (!panel) return;
    writeJsonStorage(draftKey, {
      category: panel.querySelector("#journalCategory").value,
      round: panel.querySelector("#journalRound").value,
      elapsedMinutes: panel.querySelector("#journalElapsed").value,
      note: panel.querySelector("#journalText").value
    });
  }

  function restoreDraft() {
    const draft = readJsonStorage(draftKey);
    if (!draft || !panel) return;
    if (CATEGORY_LABELS[draft.category]) panel.querySelector("#journalCategory").value = draft.category;
    panel.querySelector("#journalRound").value = draft.round || "";
    panel.querySelector("#journalElapsed").value = draft.elapsedMinutes || "";
    panel.querySelector("#journalText").value = draft.note || "";
  }

  function clearDraftAndForm() {
    try { localStorage.removeItem(draftKey); } catch {}
    form?.reset();
  }

  function setFormDisabled(disabled) {
    form?.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = disabled;
    });
  }

  function setFormStatus(message, tone = "") {
    const status = panel?.querySelector("#journalFormStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `form-status ${tone}`.trim();
  }

  function setSyncState(message, tone = "") {
    const status = panel?.querySelector("#journalSyncState");
    if (!status) return;
    status.textContent = message;
    status.className = `journal-sync-state ${tone}`.trim();
  }

  function readJsonStorage(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  }

  function writeJsonStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch {}
  }

  function makeId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function installStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .player-journal-panel{margin-top:1rem}
      .journal-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
      .journal-heading h2{margin:.2rem 0 .5rem}
      .journal-sync-state{font-size:.82rem;font-weight:700;white-space:nowrap}
      .journal-fields{display:grid;grid-template-columns:1.4fr .7fr .8fr;gap:.75rem}
      .journal-form textarea{width:100%}
      .journal-actions{display:flex;gap:.75rem;align-items:center;margin-top:.75rem}
      .journal-privacy{margin-top:1rem;padding:.75rem;border-left:3px solid currentColor;background:rgba(0,0,0,.04)}
      .journal-timeline{display:grid;gap:.65rem;margin-top:1rem}
      .journal-entry{padding:.75rem;border:1px solid rgba(0,0,0,.13);border-radius:.45rem;background:rgba(255,255,255,.45)}
      .journal-entry p{margin:.35rem 0 0;white-space:pre-wrap}
      .journal-entry-meta{display:flex;justify-content:space-between;gap:1rem;font-size:.82rem}
      .journal-empty,.journal-queued{margin:.25rem 0;font-style:italic}
      .independent-feedback-notice{margin:1rem 0;padding:1rem 1.1rem;border-left:4px solid #8f1f25;background:#f5ede5}
      .independent-feedback-notice.success{border-left-color:#227044;background:#eaf3ed}
      .optional{font-size:.78em;font-weight:400;opacity:.75}
      @media(max-width:700px){.journal-fields{grid-template-columns:1fr}.journal-heading{display:block}.journal-sync-state{display:inline-block;margin-bottom:.5rem}}
    `;
    document.head.append(style);
  }
})();
