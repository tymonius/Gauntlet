(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  if (!TOKEN_PATTERN.test(code)) return;

  const storagePrefix = `gauntlet_playtest_${code.slice(0, 16)}`;
  const nativeFetch = window.fetch.bind(window);
  const FACTION_LEADERS = Object.freeze({
    military: ["General", "Commandant"],
    diplomats: ["Ambassador", "Senator"],
    financiers: ["Banker", "Executive"],
    intelligence: ["Ranger", "Spymaster"],
    mystics: ["Alchemist", "Spirit Walker"],
    inquisition: ["Grand Inquisitor", "Witch Hunter"]
  });
  const FACTION_NAMES = Object.freeze({
    military: "Military",
    diplomats: "Diplomats",
    financiers: "Financiers",
    intelligence: "Intelligence",
    mystics: "Mystics",
    inquisition: "Inquisition"
  });

  const state = {
    session: null,
    roster: [],
    configured: false
  };

  window.fetch = async function eventGameFetch(input, init = {}) {
    let nextInit = init;
    try {
      const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
      const participantId = readSession(`${storagePrefix}_participant`);
      const sessionBase = `/api/sessions/${encodeURIComponent(code)}`;
      if (participantId && (url.pathname === `${sessionBase}/arbiter` || url.pathname === `${sessionBase}/event`)) {
        const parsed = parseBody(init.body) || {};
        if (url.pathname.endsWith("/arbiter")) parsed.participantId = participantId;
        else parsed.data = { ...(parsed.data || {}), participantId };
        nextInit = {
          ...init,
          headers: { ...(init.headers || {}), "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        };
      }
    } catch {
      // Preserve the original request when it cannot be inspected.
    }

    const response = await nativeFetch(input, nextInit);
    try {
      const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
      if (url.pathname === `/api/sessions/${encodeURIComponent(code)}` && response.ok) {
        state.session = await response.clone().json();
        if (state.session?.eventSessionId) void configureEventGame();
      }
    } catch (error) {
      console.info("Event game enhancement skipped.", error);
    }
    return response;
  };

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    window.setTimeout(() => {
      if (state.session?.eventSessionId) void configureEventGame();
    }, 0);
  });

  async function configureEventGame() {
    if (state.configured || !state.session?.eventSessionId) return;
    state.configured = true;
    try {
      const response = await nativeFetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(code)}/event-participants`, {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "The event roster could not be loaded.");
      state.roster = Array.isArray(payload.participants) ? payload.participants : [];
      await waitForApp();
      renderEventGameJoin();
      updateJoinedCopy();
    } catch (error) {
      console.info("Event roster could not be loaded; the standard join form remains available.", error);
      state.configured = false;
    }
  }

  async function waitForApp() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (document.getElementById("joinPanel") && document.getElementById("joinedPanel")) return;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
  }

  function renderEventGameJoin() {
    const joinPanel = document.getElementById("joinPanel");
    if (!joinPanel || readSession(`${storagePrefix}_participant`) || state.session?.status === "closed") return;

    const hadJoinFocus = joinPanel.contains(document.activeElement);
    const identity = readIdentity(state.session.eventSessionId);
    const recognized = state.roster.find((player) => player.participantId === identity.participantId);
    if (recognized) {
      renderRecognized(joinPanel, recognized, identity);
      if (hadJoinFocus) focusEventJoinControl("eventQuickJoin");
    } else {
      renderRosterPicker(joinPanel);
      if (hadJoinFocus) focusEventJoinControl("eventPlayerSelect");
    }
  }

  function renderRecognized(panel, player, identity) {
    panel.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Your table</p>
          <h2>Playing as ${escapeHtml(player.displayName)}?</h2>
        </div>
      </div>
      <p class="event-player-summary"><strong>${escapeHtml(player.leader)}</strong> · ${escapeHtml(FACTION_NAMES[player.faction] || player.faction)}</p>
      <button id="eventQuickJoin" type="button">Join game</button>
      <button id="eventChooseAnother" type="button" class="secondary event-link-button">Not you?</button>
      <p id="eventJoinStatus" class="form-status" role="status" aria-live="polite" tabindex="-1"></p>
    `;
    document.getElementById("eventQuickJoin")?.addEventListener("click", () => joinRosterPlayer(player, identity.participantToken || "", false));
    document.getElementById("eventChooseAnother")?.addEventListener("click", () => {
      renderRosterPicker(panel);
      focusEventJoinControl("eventPlayerSelect");
    });
  }

  function renderRosterPicker(panel) {
    const options = state.roster
      .slice()
      .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)))
      .map((player) => `<option value="${escapeAttribute(player.participantId)}">${escapeHtml(player.displayName)} — ${escapeHtml(player.leader)} / ${escapeHtml(FACTION_NAMES[player.faction] || player.faction)}</option>`)
      .join("");
    panel.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Join this game</p>
          <h2>Who are you?</h2>
        </div>
      </div>
      <p>Choose your name from the event roster. Your faction and Leader will be carried into this game automatically.</p>
      <label class="event-field">
        Event player
        <select id="eventPlayerSelect">
          <option value="">Choose your name</option>
          ${options}
        </select>
      </label>
      <button id="eventRosterJoin" type="button">Join game</button>
      <button id="eventGuestToggle" type="button" class="secondary event-link-button">I am not on the roster</button>
      <p id="eventJoinStatus" class="form-status" role="status" aria-live="polite" tabindex="-1"></p>
    `;
    document.getElementById("eventRosterJoin")?.addEventListener("click", () => {
      const id = document.getElementById("eventPlayerSelect")?.value || "";
      const player = state.roster.find((item) => item.participantId === id);
      if (!player) return setStatus("Choose your name first.", "error");
      joinRosterPlayer(player, "", true);
    });
    document.getElementById("eventGuestToggle")?.addEventListener("click", () => {
      renderGuestForm(panel);
      focusEventJoinControl("eventGuestName");
    });
  }

  function renderGuestForm(panel) {
    const factionOptions = Object.entries(FACTION_NAMES)
      .map(([key, name]) => `<option value="${key}">${name}</option>`)
      .join("");
    panel.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Late addition</p>
          <h2>Join without onboarding</h2>
        </div>
      </div>
      <p>Use this only when you were not on the event roster. Your selection will apply to this game only.</p>
      <label class="event-field">Name<input id="eventGuestName" type="text" maxlength="80" autocomplete="name" /></label>
      <label class="event-field">Faction<select id="eventGuestFaction"><option value="">Choose a faction</option>${factionOptions}</select></label>
      <label class="event-field">Leader<select id="eventGuestLeader" disabled><option value="">Choose a faction first</option></select></label>
      <button id="eventGuestJoin" type="button">Join game</button>
      <button id="eventBackToRoster" type="button" class="secondary event-link-button">Back to event roster</button>
      <p id="eventJoinStatus" class="form-status" role="status" aria-live="polite" tabindex="-1"></p>
    `;
    document.getElementById("eventGuestFaction")?.addEventListener("change", updateGuestLeaders);
    document.getElementById("eventGuestJoin")?.addEventListener("click", joinGuest);
    document.getElementById("eventBackToRoster")?.addEventListener("click", () => {
      renderRosterPicker(panel);
      focusEventJoinControl("eventPlayerSelect");
    });
  }

  function focusEventJoinControl(id) {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    });
  }

  function updateGuestLeaders() {
    const faction = document.getElementById("eventGuestFaction")?.value || "";
    const select = document.getElementById("eventGuestLeader");
    if (!select) return;
    const leaders = FACTION_LEADERS[faction] || [];
    select.disabled = leaders.length === 0;
    select.innerHTML = leaders.length
      ? `<option value="">Choose a Leader</option>${leaders.map((leader) => `<option value="${escapeAttribute(leader)}">${escapeHtml(leader)}</option>`).join("")}`
      : `<option value="">Choose a faction first</option>`;
  }

  async function joinRosterPlayer(player, participantToken, confirmedRosterSelection) {
    await joinGame({
      role: "player",
      eventParticipantId: player.participantId,
      participantToken,
      confirmedRosterSelection
    });
  }

  async function joinGuest() {
    const displayName = document.getElementById("eventGuestName")?.value.trim() || "";
    const faction = document.getElementById("eventGuestFaction")?.value || "";
    const leader = document.getElementById("eventGuestLeader")?.value || "";
    if (!displayName || !faction || !leader) return setStatus("Enter your name and choose a faction and Leader.", "error");
    await joinGame({ role: "player", displayName, faction, leader });
  }

  async function joinGame(body) {
    const joinPanel = document.getElementById("joinPanel");
    const returnFocusTo = document.activeElement instanceof HTMLElement && joinPanel?.contains(document.activeElement)
      ? document.activeElement
      : null;
    setStatus("Joining…");
    const busyStatus = document.getElementById("eventJoinStatus");
    if (returnFocusTo && busyStatus instanceof HTMLElement) busyStatus.focus({ preventScroll: true });
    setJoinButtons(true);
    try {
      const response = await nativeFetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(code)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "This game could not be joined.");
      writeSession(`${storagePrefix}_participant`, payload.participantId);
      if (payload.eventParticipantId) {
        const existing = readIdentity(state.session.eventSessionId);
        saveIdentity({
          ...existing,
          eventSessionId: state.session.eventSessionId,
          participantId: payload.eventParticipantId,
          displayName: payload.displayName,
          faction: payload.faction,
          leader: payload.leader,
          updatedAt: new Date().toISOString()
        });
      }
      window.location.reload();
    } catch (error) {
      setStatus(error.message || "This game could not be joined.", "error");
      setJoinButtons(false);
      if (
        returnFocusTo &&
        document.activeElement === busyStatus &&
        returnFocusTo.isConnected
      ) returnFocusTo.focus({ preventScroll: true });
    }
  }

  function updateJoinedCopy() {
    const participantId = readSession(`${storagePrefix}_participant`);
    if (!participantId) return;
    const player = Array.isArray(state.session?.players)
      ? state.session.players.find((item) => item.participantId === participantId)
      : null;
    const copy = document.getElementById("joinedCopy");
    if (copy && player) {
      copy.textContent = `Seat ${player.seatIndex}: ${player.displayName} — ${player.leader} of the ${FACTION_NAMES[player.faction] || player.faction}. Rules Arbiter questions from this device will be attributed to you in this game.`;
    }
  }

  function setJoinButtons(disabled) {
    document.querySelectorAll("#joinPanel button, #joinPanel input, #joinPanel select").forEach((control) => {
      control.disabled = disabled;
    });
  }

  function setStatus(message, kind = "") {
    const status = document.getElementById("eventJoinStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function readIdentity(eventSessionId) {
    try { return JSON.parse(localStorage.getItem(`gauntlet_event_identity_${eventSessionId}`) || "{}"); }
    catch { return {}; }
  }

  function saveIdentity(value) {
    try {
      localStorage.setItem(`gauntlet_event_identity_${value.eventSessionId}`, JSON.stringify(value));
      localStorage.setItem("gauntlet_last_event_identity", JSON.stringify(value));
    } catch { /* optional */ }
  }

  function readSession(key) {
    try { return sessionStorage.getItem(key) || ""; } catch { return ""; }
  }

  function writeSession(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* optional */ }
  }

  function parseBody(body) {
    if (typeof body !== "string") return null;
    try { return JSON.parse(body); } catch { return null; }
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .event-player-summary { margin: 4px 0 24px; color: var(--muted); font-size: 1.05rem; }
      .event-link-button { margin-top: 10px; }
      .event-field { display: grid; gap: 8px; margin: 18px 0; font-weight: 700; }
      .event-field input, .event-field select { width: 100%; min-height: 48px; padding: 0 12px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
    `;
    document.head.append(style);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
