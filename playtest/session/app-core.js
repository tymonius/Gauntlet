(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  const suppliedHostKey = String(params.get("host") || "").trim();
  const storagePrefix = TOKEN_PATTERN.test(code) ? `gauntlet_playtest_${code.slice(0, 16)}` : "gauntlet_playtest_invalid";

  let session = null;
  let participantId = readStorage(`${storagePrefix}_participant`);
  let hostKey = suppliedHostKey || readStorage(`${storagePrefix}_host`);
  const nativeFetch = window.fetch.bind(window);

  const el = {};

  installRulesInteractionLinker();
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    for (const id of [
      "loadingPanel", "errorPanel", "errorTitle", "errorMessage", "sessionApp",
      "sheetSerial", "sessionStatus", "summarySerial", "statusPill", "rulesVersion",
      "participantCount", "arbiterCount", "createdAt", "joinPanel", "joinForm",
      "displayName", "role", "joinStatus", "joinedPanel", "joinedCopy", "openArbiter",
      "stopReason", "recordStop", "noteForm", "noteText", "eventStatus", "hostPanel",
      "closeSession", "closeStatus"
    ]) el[id] = document.getElementById(id);

    el.joinForm?.addEventListener("submit", joinSession);
    el.openArbiter?.addEventListener("click", openArbiter);
    el.recordStop?.addEventListener("click", () => recordEvent("game_stopped", {
      reason: el.stopReason.value
    }));
    el.noteForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const note = el.noteText.value.trim();
      if (!note) return;
      recordEvent("note", { note }).then((ok) => {
        if (ok) el.noteText.value = "";
      });
    });
    el.closeSession?.addEventListener("click", closeSession);
    document.querySelectorAll("[data-event]").forEach((button) => {
      button.addEventListener("click", () => recordEvent(button.dataset.event, {}));
    });

    if (suppliedHostKey) writeStorage(`${storagePrefix}_host`, suppliedHostKey);

    if (!TOKEN_PATTERN.test(code)) {
      showError(
        "The sheet code is missing or invalid.",
        "Open this page by scanning a formal playtest sheet. Each printed sheet has its own single-use code."
      );
      return;
    }

    loadSession();
  }

  async function loadSession() {
    setLoading(true);
    try {
      session = await api(`/api/sessions/${encodeURIComponent(code)}`);
      storeFormalContext(session);
      renderSession();
    } catch (error) {
      console.error(error);
      const notFound = error.status === 404;
      showError(
        notFound ? "This playtest session was not found." : "The playtest session service is unavailable.",
        notFound
          ? "The code may be damaged, mistyped, or no longer recognized. Use the printed sheet serial for manual reconciliation."
          : "The paper sheet can still be completed normally. Record its serial so the session can be reconciled later."
      );
    } finally {
      setLoading(false);
    }
  }

  function renderSession() {
    if (!session) return;
    const closed = session.status === "closed";
    document.body.classList.toggle("session-closed", closed);
    el.sessionApp.hidden = false;
    el.errorPanel.hidden = true;

    el.sheetSerial.textContent = session.sheetSerial;
    el.sessionStatus.textContent = closed ? "Closed · QR retired" : "Open session";
    el.summarySerial.textContent = session.sheetSerial;
    el.rulesVersion.textContent = session.rulesVersion;
    el.participantCount.textContent = String(session.participantCount || 0);
    el.arbiterCount.textContent = String(session.arbiterQuestionCount || 0);
    el.createdAt.textContent = formatDate(session.createdAt);
    el.statusPill.textContent = closed ? "Closed" : "Open";
    el.statusPill.classList.toggle("closed", closed);

    const joined = Boolean(participantId);
    el.joinPanel.hidden = joined || closed;
    el.joinedPanel.hidden = !joined;
    if (joined) {
      el.joinedCopy.textContent = closed
        ? "This session is closed, but its Rules Arbiter record remains available for review."
        : "Questions and feedback submitted through the Rules Arbiter will include this session.";
    }

    el.hostPanel.hidden = !hostKey || closed;
    if (closed) {
      el.eventStatus.textContent = "This session is closed. The printed QR code has been retired.";
      el.eventStatus.className = "form-status";
    }
  }

  async function joinSession(event) {
    event.preventDefault();
    setFormStatus(el.joinStatus, "Joining…");
    setFormBusy(el.joinForm, true);
    try {
      const result = await api(`/api/sessions/${encodeURIComponent(code)}/join`, {
        method: "POST",
        body: {
          displayName: el.displayName.value.trim(),
          role: el.role.value
        }
      });
      participantId = result.participantId;
      writeStorage(`${storagePrefix}_participant`, participantId);
      session = { ...session, participantCount: Number(session.participantCount || 0) + 1 };
      setFormStatus(el.joinStatus, "Joined.", "success");
      renderSession();
    } catch (error) {
      console.error(error);
      setFormStatus(el.joinStatus, error.message || "The session could not be joined.", "error");
    } finally {
      setFormBusy(el.joinForm, false);
    }
  }

  async function recordEvent(eventType, data) {
    if (!session || session.status !== "open") return false;
    setFormStatus(el.eventStatus, "Saving…");
    try {
      await api(`/api/sessions/${encodeURIComponent(code)}/event`, {
        method: "POST",
        body: { eventType, data }
      });
      const labels = {
        game_started: "Game start recorded.",
        game_completed: "Completed game recorded.",
        game_stopped: "Stopped game recorded.",
        note: "Note saved."
      };
      setFormStatus(el.eventStatus, labels[eventType] || "Session event saved.", "success");
      return true;
    } catch (error) {
      console.error(error);
      setFormStatus(el.eventStatus, error.message || "The event could not be saved.", "error");
      return false;
    }
  }

  async function closeSession() {
    if (!hostKey || !session || session.status !== "open") return;
    const confirmed = window.confirm(
      "Close this formal playtest session? Future joins and playtest events will be blocked, and the printed QR code will be retired."
    );
    if (!confirmed) return;

    el.closeSession.disabled = true;
    setFormStatus(el.closeStatus, "Closing…");
    try {
      session = await api(`/api/sessions/${encodeURIComponent(code)}/close`, {
        method: "POST",
        body: { hostKey }
      });
      setFormStatus(el.closeStatus, "Session closed and QR code retired.", "success");
      renderSession();
    } catch (error) {
      console.error(error);
      setFormStatus(el.closeStatus, error.message || "The session could not be closed.", "error");
      el.closeSession.disabled = false;
    }
  }

  function openArbiter() {
    const launcher = document.querySelector(".ga-rules-launcher");
    if (launcher) launcher.click();
    else window.setTimeout(openArbiter, 120);
  }

  function installRulesInteractionLinker() {
    window.fetch = async function linkedFetch(input, init = {}) {
      const response = await nativeFetch(input, init);
      try {
        const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
        const isRulesRequest = /gauntlet-rules-assistant/i.test(url.hostname) && /\/(api\/)?rules\/?$/.test(url.pathname);
        if (!isRulesRequest || !response.ok || !TOKEN_PATTERN.test(code)) return response;

        const requestBody = parseRequestBody(init.body);
        const answer = await response.clone().json();
        if (!answer?.interactionId) return response;

        void nativeFetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(code)}/arbiter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interactionId: answer.interactionId,
            classification: answer.rulingStatus || null,
            question: requestBody?.question || "",
            answer: answer.answer || "",
            sources: Array.isArray(answer.sources) ? answer.sources : []
          })
        }).then(() => refreshCounts()).catch((error) => {
          console.info("Rules interaction could not be linked to the playtest session.", error);
        });
      } catch (error) {
        console.info("Playtest Rules Arbiter linkage skipped.", error);
      }
      return response;
    };
  }

  async function refreshCounts() {
    try {
      const refreshed = await api(`/api/sessions/${encodeURIComponent(code)}`);
      session = { ...session, ...refreshed };
      renderSession();
    } catch {
      // The Rules Arbiter answer remains usable even if count refresh fails.
    }
  }

  function parseRequestBody(body) {
    if (typeof body !== "string") return null;
    try { return JSON.parse(body); } catch { return null; }
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const init = { method: options.method || "GET", headers };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const response = await nativeFetch(`${API_ORIGIN}${path}`, init);
    let payload = null;
    try { payload = await response.json(); } catch { /* no JSON body */ }
    if (!response.ok) {
      const error = new Error(payload?.error || `Session service returned ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function storeFormalContext(value) {
    try {
      sessionStorage.setItem("gauntlet_playtest_session_id", value.sessionId);
      sessionStorage.setItem("gauntlet_playtest_sheet_serial", value.sheetSerial);
    } catch {
      // Rules interaction interception still links this page when storage is unavailable.
    }
  }

  function setLoading(loading) {
    if (el.loadingPanel) el.loadingPanel.hidden = !loading;
  }

  function showError(title, message) {
    setLoading(false);
    el.sessionApp.hidden = true;
    el.errorTitle.textContent = title;
    el.errorMessage.textContent = message;
    el.errorPanel.hidden = false;
    el.errorPanel.focus({ preventScroll: true });
    el.sheetSerial.textContent = "Unavailable";
    el.sessionStatus.textContent = "Use printed serial";
  }

  function setFormStatus(element, message, kind = "") {
    if (!element) return;
    element.textContent = message;
    element.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function setFormBusy(form, busy) {
    form.querySelectorAll("button, input, select, textarea").forEach((control) => {
      control.disabled = busy;
    });
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function readStorage(key) {
    try { return sessionStorage.getItem(key) || ""; } catch { return ""; }
  }

  function writeStorage(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* optional */ }
  }
})();
