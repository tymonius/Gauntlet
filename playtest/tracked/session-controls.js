(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  if (!TOKEN_PATTERN.test(code)) return;

  const focusScript = document.createElement("script");
  focusScript.src = "busy-focus-accessibility.js?v=20260903-1";
  focusScript.async = false;
  document.head.append(focusScript);

  const storagePrefix = `gauntlet_tracked_${code.slice(0, 16)}`;
  let hostKey = String(params.get("host") || "").trim() || readStorage(`${storagePrefix}_host`);
  let controls = null;
  let closedPanel = null;
  let currentSession = null;
  let lastFocusedElement = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    installStyles();
    installPanels();
    installTransitionFocus();
    bindEvents();
    void refresh();
    window.setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", () => void refresh());
  }

  function installPanels() {
    controls = document.createElement("section");
    controls.id = "sessionEndControls";
    controls.className = "tracked-panel session-end-panel";
    controls.hidden = true;
    controls.innerHTML = `
      <div class="session-end-heading">
        <div>
          <p class="eyebrow">Creator controls</p>
          <h2>End this session.</h2>
          <p><strong>Close</strong> preserves partial feedback and stops further joins. <strong>Cancel</strong> means the game did not happen and removes the record from compiled analysis.</p>
        </div>
      </div>
      <label>Reason <span class="optional">optional</span>
        <input id="sessionEndReason" type="text" maxlength="300" placeholder="Why are you ending this session?" />
      </label>
      <div class="button-row session-end-actions">
        <button id="closeSession" type="button" class="button secondary">Close session</button>
        <button id="cancelSession" type="button" class="button danger">Cancel session</button>
      </div>
      <p id="sessionEndStatus" class="form-status" role="status" aria-live="polite" tabindex="-1"></p>`;

    closedPanel = document.createElement("section");
    closedPanel.id = "manualClosurePanel";
    closedPanel.className = "tracked-panel manual-closure-panel";
    closedPanel.hidden = true;
    closedPanel.tabIndex = -1;

    const sharePanel = document.getElementById("sharePanel");
    const playersSection = document.querySelector(".players-section");
    if (sharePanel) sharePanel.insertAdjacentElement("afterend", controls);
    else if (playersSection) playersSection.insertAdjacentElement("beforebegin", controls);
    else document.getElementById("sessionApp")?.append(controls);

    const summary = document.querySelector(".tracked-summary");
    if (summary) summary.insertAdjacentElement("afterend", closedPanel);
    else document.getElementById("sessionApp")?.prepend(closedPanel);
  }

  function installTransitionFocus() {
    const focusTargets = ["joinedPanel", "resultSection", "responseSection", "completionPanel"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    focusTargets.forEach((element) => { element.tabIndex = -1; });

    document.addEventListener("focusin", (event) => {
      if (event.target instanceof Element) lastFocusedElement = event.target;
    });

    const observed = [
      document.getElementById("joinPanel"),
      document.getElementById("resultSection"),
      document.getElementById("responseSection"),
      controls,
    ].filter(Boolean);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== "attributes" || record.attributeName !== "hidden") continue;
        const panel = record.target;
        if (!(panel instanceof HTMLElement)) continue;

        if (!panel.hidden) {
          if (
            panel.id === "resultSection" &&
            ["showCompletedResult", "showStoppedResult"].includes(lastFocusedElement?.id || "")
          ) focusTransitionTarget(panel);
          continue;
        }

        if (!(lastFocusedElement instanceof Node) || !panel.contains(lastFocusedElement)) continue;

        if (panel.id === "joinPanel") {
          focusTransitionTarget(document.getElementById("joinedPanel"));
        } else if (panel.id === "resultSection") {
          focusTransitionTarget(document.getElementById("responseSection"));
        } else if (panel.id === "responseSection") {
          const completionPanel = document.getElementById("completionPanel");
          focusTransitionTarget(
            completionPanel && !completionPanel.hidden
              ? completionPanel
              : document.getElementById("joinedPanel")
          );
        } else if (panel.id === "sessionEndControls") {
          focusTransitionTarget(closedPanel);
        }
      }
    });

    observed.forEach((element) => observer.observe(element, { attributes: true, attributeFilter: ["hidden"] }));
  }

  function focusTransitionTarget(element) {
    if (!(element instanceof HTMLElement) || element.hidden) return;
    window.requestAnimationFrame(() => {
      if (element.hidden) return;
      element.focus({ preventScroll: true });
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function bindEvents() {
    controls?.querySelector("#closeSession")?.addEventListener("click", () => endSession("close"));
    controls?.querySelector("#cancelSession")?.addEventListener("click", () => endSession("cancel"));
  }

  async function refresh() {
    if (document.hidden) return;
    if (!hostKey) hostKey = readStorage(`${storagePrefix}_host`);
    try {
      currentSession = await request(`/api/tracked-games/${encodeURIComponent(code)}`);
      render();
    } catch (error) {
      console.info("Session closure controls could not refresh.", error);
    }
  }

  function render() {
    if (!currentSession) return;
    const closureType = currentSession.closureType || "";
    const open = currentSession.status === "open";
    controls.hidden = !hostKey || !open || Boolean(closureType);
    closedPanel.hidden = !closureType;

    if (!closureType) return;
    const cancelled = closureType === "cancelled";
    closedPanel.className = `tracked-panel manual-closure-panel ${cancelled ? "cancelled" : "closed"}`;
    closedPanel.innerHTML = `
      <p class="eyebrow">${cancelled ? "Session cancelled" : "Session closed"}</p>
      <h2>${cancelled ? "This record will not count as a playtest." : "Feedback collection has ended."}</h2>
      <p>${cancelled
        ? "No new players, notes, results, or questionnaires can be added. The cancelled record is retained only for audit purposes and excluded from compiled analysis."
        : "Existing players, notes, results, and questionnaires are preserved. No further joins or submissions are accepted."}</p>
      ${currentSession.closureReason ? `<p><strong>Reason:</strong> ${escapeHtml(currentSession.closureReason)}</p>` : ""}
      <a class="button secondary" href="./">Start another tracked playtest</a>`;

    const statusLabel = document.getElementById("statusLabel");
    const lifecycleCopy = document.getElementById("lifecycleCopy");
    if (statusLabel) statusLabel.textContent = cancelled ? "Cancelled" : "Closed";
    if (lifecycleCopy) lifecycleCopy.textContent = cancelled
      ? "The creator cancelled this session."
      : "The creator closed this session with the available data.";
    for (const id of ["sharePanel", "joinPanel", "playPanel", "resultSection", "responseSection", "completionPanel"]) {
      const element = document.getElementById(id);
      if (element) element.hidden = true;
    }
  }

  async function endSession(disposition) {
    if (!hostKey || !currentSession || currentSession.status !== "open") return;
    const cancel = disposition === "cancel";
    const confirmed = window.confirm(cancel
      ? "Cancel this session? The game will be marked as not played and excluded from compiled analysis. This cannot be reopened."
      : "Close this session? Existing data will be preserved, but no one will be able to join or submit more feedback.");
    if (!confirmed) return;

    const returnFocusTo = document.activeElement instanceof HTMLElement && controls.contains(document.activeElement)
      ? document.activeElement
      : null;
    setStatus(cancel ? "Cancelling session…" : "Closing session…");
    const busyStatus = controls.querySelector("#sessionEndStatus");
    if (returnFocusTo && busyStatus instanceof HTMLElement) busyStatus.focus({ preventScroll: true });
    setBusy(true);
    try {
      const reason = controls.querySelector("#sessionEndReason")?.value.trim() || "";
      const payload = await request(`/api/tracked-games/${encodeURIComponent(code)}/close`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Host-Key": hostKey
        },
        body: JSON.stringify({ disposition, reason })
      });
      currentSession = payload.session;
      setStatus(cancel ? "Session cancelled." : "Session closed.", "success");
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setStatus(error.message || "The session could not be ended.", "error");
    } finally {
      setBusy(false);
      if (
        returnFocusTo &&
        document.activeElement === busyStatus &&
        returnFocusTo.isConnected &&
        !controls.hidden
      ) returnFocusTo.focus({ preventScroll: true });
    }
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

  function setBusy(busy) {
    controls?.querySelectorAll("button, input").forEach((element) => { element.disabled = busy; });
  }

  function setStatus(message, tone = "") {
    const status = controls?.querySelector("#sessionEndStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `form-status ${tone}`.trim();
  }

  function readStorage(key) {
    try { return localStorage.getItem(key) || ""; }
    catch { return ""; }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function installStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .session-end-panel{margin:1rem 0;border-color:rgba(143,31,37,.35)}
      .session-end-heading h2,.manual-closure-panel h2{margin:.2rem 0 .5rem}
      .session-end-panel label{display:block;margin-top:1rem}
      .session-end-panel input{width:100%}
      .session-end-actions{margin-top:1rem}
      .button.danger{background:#6e171c;color:#fff;border-color:#6e171c}
      .button.danger:hover{background:#541116}
      .manual-closure-panel{margin:1rem 0;border-left:5px solid #7a6b55}
      .manual-closure-panel.cancelled{border-left-color:#8f1f25;background:#f6e9e7}
      .manual-closure-panel.closed{border-left-color:#52606d;background:#eef1f3}
    `;
    document.head.append(style);
  }
})();
