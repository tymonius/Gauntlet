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
  let panel = null;
  let form = null;
  let notes = [];
  let refreshTimer = null;
  let participantTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    installStyles();
    installPanel();
    hideLegacyNoteControl();
    if (retrospective) installRetrospectiveTreatment();
    bindEvents();
    restoreDraft();
    watchForParticipant();
    window.addEventListener("online", () => void flushQueue());
    window.addEventListener("focus", () => void refreshJournal());
  }

  function installPanel() {
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

  function bindEvents() {
    form?.addEventListener("submit", saveNote);
    form?.querySelectorAll("textarea, input, select").forEach((control) => {
      control.addEventListener("input", saveDraft);
      control.addEventListener("change", saveDraft);
    });
  }

  function watchForParticipant() {
    detectParticipant();
    participantTimer = window.setInterval(() => {
      const priorId = participant?.participantId;
      detectParticipant();
      if (participant?.participantId && participant.participantId !== priorId) void refreshJournal();
    }, 900);
  }

  function detectParticipant() {
    participant = readJsonStorage(participantKey);
    const available = Boolean(participant?.participantId && participant?.participantToken);
    if (panel) panel.hidden = !available;
    if (available && !refreshTimer) {
      void refreshJournal();
      refreshTimer = window.setInterval(() => void refreshJournal(), 8000);
    }
  }

  async function refreshJournal() {
    if (!participant?.participantId || !participant?.participantToken || document.hidden) return;
    setSyncState("Syncing…", "checking");
    try {
      await flushQueue(false);
      const [notePayload, session] = await Promise.all([getNotes(), getSession()]);
      notes = Array.isArray(notePayload.notes) ? notePayload.notes : [];
      renderTimeline();
      setFormDisabled(session.status !== "open");
      setSyncState(session.status === "open" ? "Saved" : "Journal closed", session.status === "open" ? "connected" : "closed");
    } catch (error) {
      console.info("Playtest journal refresh skipped.", error);
      setSyncState(navigator.onLine ? "Retrying…" : "Offline — drafts safe", "paused");
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
    writeJsonStorage(queueKey, remaining);
    if (showStatus && !remaining.length) setFormStatus("Offline notes synchronized.", "success");
    renderTimeline();
  }

  async function getNotes() {
    const response = await fetch(`${API_ORIGIN}/api/tracked-games/${encodeURIComponent(code)}/notes`, {
      method: "GET",
      cache: "no-store",
      headers: participantHeaders()
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `Journal service returned ${response.status}.`);
    return payload;
  }

  async function postNote(note) {
    const response = await fetch(`${API_ORIGIN}/api/tracked-games/${encodeURIComponent(code)}/notes`, {
      method: "POST",
      headers: { ...participantHeaders(), "content-type": "application/json" },
      body: JSON.stringify({
        participantId: participant.participantId,
        participantToken: participant.participantToken,
        ...note
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `Journal service returned ${response.status}.`);
    return payload;
  }

  async function getSession() {
    const response = await fetch(`${API_ORIGIN}/api/tracked-games/${encodeURIComponent(code)}`, {
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `Tracked service returned ${response.status}.`);
    return payload;
  }

  function participantHeaders() {
    return {
      accept: "application/json",
      "X-Participant-Id": participant.participantId,
      "X-Participant-Token": participant.participantToken
    };
  }

  function renderTimeline() {
    const timeline = panel?.querySelector("#journalTimeline");
    if (!timeline) return;
    const queue = readJsonStorage(queueKey) || [];
    if (!notes.length && (!Array.isArray(queue) || !queue.length)) {
      timeline.innerHTML = `<p class="journal-empty">No notes yet. Add one when something becomes worth remembering.</p>`;
      return;
    }
    const saved = notes.map((item) => noteMarkup(item, false)).join("");
    const pending = Array.isArray(queue) ? queue.map((item) => noteMarkup({ ...item, source: retrospective ? "reconstructed" : "live" }, true)).join("") : "";
    timeline.innerHTML = `${saved}${pending}`;
  }

  function renderQueuedState() {
    renderTimeline();
  }

  function noteMarkup(item, pending) {
    const details = [];
    if (item.round !== null && item.round !== undefined && item.round !== "") details.push(`Round ${escapeHtml(item.round)}`);
    if (item.elapsedMinutes !== null && item.elapsedMinutes !== undefined && item.elapsedMinutes !== "") details.push(`${escapeHtml(item.elapsedMinutes)} min`);
    if (!details.length && item.createdAt) details.push(new Date(item.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    return `<article class="journal-entry${pending ? " pending" : ""}">
      <div class="journal-entry-meta">
        <strong>${escapeHtml(CATEGORY_LABELS[item.category] || "Other")}</strong>
        <span>${details.join(" · ") || (pending ? "Pending sync" : "Saved")}${item.source === "reconstructed" ? " · Reconstructed" : ""}</span>
      </div>
      <p>${escapeHtml(item.note)}</p>
      ${pending ? '<span class="journal-pending-label">Pending sync</span>' : ""}
    </article>`;
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
    if (draft.category && CATEGORY_LABELS[draft.category]) panel.querySelector("#journalCategory").value = draft.category;
    panel.querySelector("#journalRound").value = draft.round || "";
    panel.querySelector("#journalElapsed").value = draft.elapsedMinutes || "";
    panel.querySelector("#journalText").value = draft.note || "";
  }

  function clearDraftAndForm() {
    try { window.localStorage.removeItem(draftKey); } catch {}
    panel.querySelector("#journalText").value = "";
    panel.querySelector("#journalRound").value = "";
    panel.querySelector("#journalElapsed").value = "";
  }

  function queueNote(note) {
    const queue = readJsonStorage(queueKey);
    const next = Array.isArray(queue) ? queue : [];
    next.push(note);
    writeJsonStorage(queueKey, next.slice(-50));
  }

  function setFormDisabled(disabled) {
    form?.querySelectorAll("button, textarea, input, select").forEach((control) => {
      control.disabled = Boolean(disabled);
      control.setAttribute("aria-disabled", disabled ? "true" : "false");
    });
  }

  function setSyncState(text, state) {
    const element = panel?.querySelector("#journalSyncState");
    if (!element) return;
    element.textContent = text;
    element.dataset.state = state || "";
  }

  function setFormStatus(text, state = "") {
    const element = panel?.querySelector("#journalFormStatus");
    if (!element) return;
    element.textContent = text;
    element.dataset.state = state;
  }

  function hideLegacyNoteControl() {
    const legacy = document.querySelector(".note-details");
    if (legacy) legacy.hidden = true;
  }

  function installRetrospectiveTreatment() {
    document.body.dataset.collectionMode = "retrospective";
    const hero = document.querySelector(".tracked-hero");
    if (hero && !document.getElementById("retrospectiveBanner")) {
      const banner = document.createElement("div");
      banner.id = "retrospectiveBanner";
      banner.className = "retrospective-banner";
      banner.innerHTML = `<strong>Retrospective record</strong><span>This game was entered after play. Results, questionnaires, and notes remain explicitly separated from live tracking.</span>`;
      hero.insertAdjacentElement("afterend", banner);
    }
    const title = document.getElementById("tracked-title");
    if (title) title.innerHTML = `Record this <span>playtest.</span>`;
    const lede = document.querySelector(".hero-lede");
    if (lede) lede.textContent = "Invite the other player, record the remembered result, reconstruct only specific moments you actually remember, and complete separate individual questionnaires.";
    const start = document.getElementById("recordStart");
    if (start) start.hidden = true;
    const completed = document.getElementById("showCompletedResult");
    const stopped = document.getElementById("showStoppedResult");
    if (completed) completed.textContent = "Record completed game";
    if (stopped) stopped.textContent = "Record stopped game";
    const heading = document.querySelector("#playPanel .panel-heading h2");
    if (heading) heading.textContent = "Record the remembered outcome.";
    const copy = document.querySelector("#playPanel > p");
    if (copy) copy.textContent = "The creator records the shared result once. Both players then complete their own questionnaires.";
    const observer = new MutationObserver(() => {
      const guidance = document.getElementById("lifecycleControlGuidance");
      if (guidance && guidance.textContent !== "Record the remembered result when both players have joined.") {
        guidance.textContent = "Record the remembered result when both players have joined.";
      }
      if (start) start.hidden = true;
    });
    observer.observe(document.getElementById("sessionApp") || document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  }

  function installStyles() {
    if (document.getElementById("playerJournalStyles")) return;
    const style = document.createElement("style");
    style.id = "playerJournalStyles";
    style.textContent = `
      .player-journal-panel{margin-top:1.5rem;border-top:5px solid #8f1f25}
      .journal-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem}
      .journal-heading h2{margin:.2rem 0 .45rem}
      .journal-heading p:last-child{max-width:68ch}
      .journal-sync-state{flex:0 0 auto;border:1px solid #9a8267;padding:.35rem .55rem;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;background:#f8f0e2}
      .journal-sync-state[data-state="connected"]{border-color:#456c50;color:#31533a}
      .journal-sync-state[data-state="paused"]{border-color:#9b7128;color:#765317}
      .journal-form{display:grid;gap:.9rem;margin-top:1.1rem}
      .journal-form label{display:grid;gap:.35rem;font-weight:700}
      .journal-form textarea,.journal-form input,.journal-form select{width:100%;padding:.65rem .7rem;border:1px solid #8f775e;background:#fffdf8;color:#211d19;font:inherit}
      .journal-fields{display:grid;grid-template-columns:1.3fr .65fr .8fr;gap:.75rem}
      .journal-actions{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap}
      .journal-actions .form-status{margin:0;min-height:0}
      .journal-actions .form-status[data-state="warning"]{color:#765317}
      .journal-actions .form-status[data-state="success"]{color:#31533a}
      .journal-privacy{margin-top:1rem;padding:.7rem .85rem;background:#eee3d1;border-left:3px solid #8f1f25;color:#4e4235;font-size:.9rem}
      .journal-timeline{display:grid;gap:.65rem;margin-top:1rem}
      .journal-entry{border:1px solid rgba(77,57,38,.24);background:#fffaf0;padding:.8rem .9rem}
      .journal-entry.pending{border-style:dashed;opacity:.82}
      .journal-entry-meta{display:flex;justify-content:space-between;gap:.75rem;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#6a5947}
      .journal-entry-meta strong{color:#8f1f25}
      .journal-entry p{margin:.45rem 0 0;white-space:pre-wrap}
      .journal-pending-label{display:inline-block;margin-top:.45rem;font-size:.72rem;font-weight:700;color:#765317}
      .journal-empty{margin:.25rem 0;color:#6a5947;font-style:italic}
      .retrospective-banner{width:min(1180px,calc(100% - 2rem));margin:-.5rem auto 1.5rem;padding:.8rem 1rem;background:#211d19;color:#f4ead7;border:1px solid #9c783c;display:flex;gap:.8rem;align-items:baseline;flex-wrap:wrap}
      .retrospective-banner strong{color:#ddb973;text-transform:uppercase;letter-spacing:.07em;font-size:.8rem}
      @media(max-width:720px){.journal-heading{display:grid}.journal-fields{grid-template-columns:1fr}.journal-entry-meta{display:grid;gap:.2rem}.retrospective-banner{margin-top:.5rem}}
    `;
    document.head.append(style);
  }

  function makeId() {
    return typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function readJsonStorage(key) {
    try { return JSON.parse(window.localStorage.getItem(key) || "null"); }
    catch { return null; }
  }

  function writeJsonStorage(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); }
    catch {}
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }
})();
