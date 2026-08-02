(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const ACTIVE_POLL_MS = 2500;
  const BACKGROUND_POLL_MS = 10000;
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();

  if (!TOKEN_PATTERN.test(code)) return;

  const storagePrefix = `gauntlet_tracked_${code.slice(0, 16)}`;
  const FACTIONS = Object.freeze({
    military: { name: "Military", color: "#9e262c" },
    diplomats: { name: "Diplomats", color: "#264f91" },
    financiers: { name: "Financiers", color: "#227044" },
    intelligence: { name: "Intelligence", color: "#282827" },
    mystics: { name: "Mystics", color: "#5d347e" },
    inquisition: { name: "Inquisition", color: "#a67a27" }
  });

  let session = null;
  let timer = null;
  let inFlight = false;
  let resultIntent = false;
  let lastReviewFingerprint = "";
  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    for (const id of [
      "sessionApp", "sessionSerial", "lifecycleCopy", "statusLabel", "playerCount", "arbiterCount",
      "responseCount", "sharePanel", "playerCards", "joinPanel", "joinedPanel", "joinedHeading",
      "joinedCopy", "openArbiter", "playPanel", "recordStart", "showCompletedResult",
      "showStoppedResult", "noteForm", "resultSection", "resultForm", "firstPlayer", "winner",
      "responseSection", "completionPanel", "reviewPanel", "refreshReview"
    ]) el[id] = document.getElementById(id);

    installLiveIndicator();
    bindLifecycleControls();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", () => void pollNow());
    window.addEventListener("online", () => void pollNow());
    void pollNow();
  }

  function bindLifecycleControls() {
    el.recordStart?.addEventListener("click", () => {
      el.recordStart.disabled = true;
      scheduleSoon();
    });
    el.showCompletedResult?.addEventListener("click", () => {
      resultIntent = true;
      if (session) applySession(session);
    });
    el.showStoppedResult?.addEventListener("click", () => {
      resultIntent = true;
      if (session) applySession(session);
    });
    el.resultForm?.addEventListener("submit", scheduleSoon);
    document.getElementById("responseForm")?.addEventListener("submit", scheduleSoon);
    document.getElementById("joinForm")?.addEventListener("submit", scheduleSoon);
  }

  function installLiveIndicator() {
    const copy = el.lifecycleCopy;
    if (!copy || document.getElementById("liveSyncStatus")) return;
    const indicator = document.createElement("span");
    indicator.id = "liveSyncStatus";
    indicator.className = "live-sync-status";
    indicator.setAttribute("role", "status");
    indicator.setAttribute("aria-live", "polite");
    indicator.textContent = "Live updates connecting…";
    copy.insertAdjacentElement("afterend", indicator);
  }

  async function pollNow() {
    window.clearTimeout(timer);
    if (inFlight) return scheduleNext();
    inFlight = true;
    setLiveStatus("Checking for updates…", "checking");
    try {
      const response = await fetch(`${API_ORIGIN}/api/tracked-games/${encodeURIComponent(code)}`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Tracked service returned ${response.status}.`);
      session = payload;
      applySession(payload);
      setLiveStatus(payload.complete ? "Final state synchronized" : "Live updates on", "connected");
    } catch (error) {
      console.info("Tracked live update skipped.", error);
      setLiveStatus("Live updates paused — retrying", "paused");
    } finally {
      inFlight = false;
      scheduleNext();
    }
  }

  function scheduleNext() {
    window.clearTimeout(timer);
    const delay = document.visibilityState === "visible" ? ACTIVE_POLL_MS : BACKGROUND_POLL_MS;
    timer = window.setTimeout(pollNow, delay);
  }

  function scheduleSoon() {
    window.clearTimeout(timer);
    timer = window.setTimeout(pollNow, 450);
    window.setTimeout(pollNow, 1400);
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") void pollNow();
    else scheduleNext();
  }

  function applySession(nextSession) {
    const participant = readParticipant();
    const joinedPlayer = participant?.participantId
      ? nextSession.players?.find((player) => player.participantId === participant.participantId) || null
      : null;
    const creator = Boolean(readHostKey());
    const open = nextSession.status === "open";
    const full = Number(nextSession.playerCount) === 2;
    const playing = nextSession.lifecycleState === "playing";
    const ready = nextSession.lifecycleState === "ready";
    const feedback = nextSession.lifecycleState === "feedback";
    const submitted = nextSession.lifecycleState === "submitted" || nextSession.complete;
    const ownResponse = Boolean(joinedPlayer?.responseSubmitted);

    document.body.dataset.trackedRole = creator ? "creator" : joinedPlayer ? "participant" : "visitor";
    document.body.dataset.trackedLifecycle = nextSession.lifecycleState || "joining";

    setText(el.sessionSerial, nextSession.sheetSerial);
    setText(el.statusLabel, titleCase(nextSession.lifecycleState));
    setText(el.playerCount, `${nextSession.playerCount} / 2`);
    setText(el.arbiterCount, String(nextSession.arbiterQuestionCount || 0));
    setText(el.responseCount, `${nextSession.responseCount || 0} / 2`);
    setText(el.lifecycleCopy, lifecycleCopy(nextSession));

    renderPlayers(nextSession);
    fillPlayerOptions(nextSession);

    if (el.sharePanel) el.sharePanel.hidden = !creator || !open || full;
    if (el.joinPanel) el.joinPanel.hidden = !open || Boolean(joinedPlayer) || full;
    if (el.joinedPanel) el.joinedPanel.hidden = !joinedPlayer;
    if (joinedPlayer) {
      setText(el.joinedHeading, `Seat ${joinedPlayer.seatIndex}: ${joinedPlayer.displayName}`);
      const faction = FACTIONS[joinedPlayer.faction];
      setText(el.joinedCopy, `${joinedPlayer.leader} of the ${faction?.name || titleCase(joinedPlayer.faction)}. Rules Arbiter questions from this device will be attributed to you.`);
    }

    setControlState(el.openArbiter, !open, open ? "Ask a question linked to this game" : "This game is closed");

    const showCreatorControls = creator && Boolean(joinedPlayer) && full;
    if (el.playPanel) el.playPanel.hidden = !showCreatorControls;
    if (showCreatorControls) {
      setControlState(el.recordStart, !open || !ready, startControlTitle(nextSession));
      setControlState(el.showCompletedResult, !open || !playing || nextSession.resultSubmitted, endControlTitle(nextSession));
      setControlState(el.showStoppedResult, !open || !playing || nextSession.resultSubmitted, endControlTitle(nextSession));
      setFormDisabled(el.noteForm, !open || !playing);
      updateControlGuidance(nextSession);
    }

    if (!playing || nextSession.resultSubmitted || !open) resultIntent = false;
    if (el.resultSection) {
      el.resultSection.hidden = !creator || !joinedPlayer || !full || !open || !playing || nextSession.resultSubmitted || !resultIntent;
    }
    if (el.responseSection) {
      el.responseSection.hidden = !open || !joinedPlayer || !nextSession.resultSubmitted || ownResponse;
    }
    if (el.completionPanel) el.completionPanel.hidden = !submitted;
    if (el.reviewPanel) el.reviewPanel.hidden = !creator;

    const reviewFingerprint = `${nextSession.lifecycleState}|${nextSession.playerCount}|${nextSession.responseCount}|${nextSession.arbiterQuestionCount}|${nextSession.resultSubmitted}`;
    if (creator && reviewFingerprint !== lastReviewFingerprint) {
      lastReviewFingerprint = reviewFingerprint;
      if (el.refreshReview && !el.reviewPanel?.hidden) el.refreshReview.click();
    }
  }

  function renderPlayers(nextSession) {
    if (!el.playerCards) return;
    el.playerCards.replaceChildren();
    for (const seatIndex of [1, 2]) {
      const player = nextSession.players?.find((item) => Number(item.seatIndex) === seatIndex);
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

  function fillPlayerOptions(nextSession) {
    const options = (nextSession.players || []).map((player) =>
      `<option value="${escapeHtml(player.participantId)}">Seat ${player.seatIndex}: ${escapeHtml(player.displayName)}</option>`
    ).join("");
    for (const select of [el.firstPlayer, el.winner]) {
      if (!select) continue;
      const selected = select.value;
      select.innerHTML = `<option value="">Choose</option>${options}`;
      if ([...select.options].some((option) => option.value === selected)) select.value = selected;
    }
  }

  function updateControlGuidance(nextSession) {
    if (!el.playPanel) return;
    let guidance = document.getElementById("lifecycleControlGuidance");
    if (!guidance) {
      guidance = document.createElement("p");
      guidance.id = "lifecycleControlGuidance";
      guidance.className = "lifecycle-control-guidance";
      el.playPanel.querySelector(".button-row")?.insertAdjacentElement("afterend", guidance);
    }
    const messages = {
      ready: "Start is available. Completion controls unlock after the game has been started.",
      playing: "Game start recorded. Use one completion control when play ends.",
      feedback: "The shared result is submitted. Waiting for both individual responses.",
      submitted: "This tracked game is closed. Shared lifecycle controls are read-only."
    };
    guidance.textContent = messages[nextSession.lifecycleState] || "Shared lifecycle controls unlock when both players are ready.";
  }

  function setControlState(control, disabled, title) {
    if (!control) return;
    control.disabled = Boolean(disabled);
    control.setAttribute("aria-disabled", disabled ? "true" : "false");
    control.title = title || "";
  }

  function setFormDisabled(form, disabled) {
    form?.querySelectorAll("button, textarea, input, select").forEach((control) => {
      control.disabled = Boolean(disabled);
      control.setAttribute("aria-disabled", disabled ? "true" : "false");
    });
  }

  function startControlTitle(nextSession) {
    if (nextSession.status !== "open") return "This game is closed";
    if (nextSession.lifecycleState === "ready") return "Record the game start";
    if (nextSession.lifecycleState === "playing") return "The game start is already recorded";
    if (nextSession.resultSubmitted) return "The shared result is already submitted";
    return "Both players must join first";
  }

  function endControlTitle(nextSession) {
    if (nextSession.status !== "open") return "This game is closed";
    if (nextSession.resultSubmitted) return "The shared result is already submitted";
    if (nextSession.lifecycleState !== "playing") return "Record the game start first";
    return "Record how the game ended";
  }

  function lifecycleCopy(nextSession) {
    const copies = {
      joining: "Share the code and fill both player seats.",
      ready: "Both players are present. The creator records the start once and begins play.",
      playing: "The game is in progress. Arbiter questions are linked automatically.",
      feedback: "The shared result is submitted. Each player should complete an individual response.",
      submitted: "The complete game record is submitted and the join code is retired."
    };
    return copies[nextSession.lifecycleState] || "Tracked game open.";
  }

  function readParticipant() {
    try { return JSON.parse(localStorage.getItem(`${storagePrefix}_participant`) || "null"); }
    catch { return null; }
  }

  function readHostKey() {
    try { return localStorage.getItem(`${storagePrefix}_host`) || ""; }
    catch { return ""; }
  }

  function setLiveStatus(message, kind) {
    const indicator = document.getElementById("liveSyncStatus");
    if (!indicator) return;
    indicator.textContent = message;
    indicator.className = `live-sync-status ${kind || ""}`.trim();
  }

  function setText(element, value) {
    if (element && element.textContent !== String(value ?? "")) element.textContent = String(value ?? "");
  }

  function titleCase(value) {
    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
