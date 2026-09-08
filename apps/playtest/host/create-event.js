(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const CURRENT_RULES_VERSION = "v0.7.1";
  const LABEL_STORAGE_KEY = "gauntlet_playtest_host_event_labels_v1";
  const registry = window.GauntletHostRegistry;
  if (!registry) return;

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const main = document.querySelector(".host-home-main");
    const hero = document.querySelector(".host-home-hero");
    if (!main || !hero || document.getElementById("createEventForm")) return;

    const section = document.createElement("section");
    section.className = "create-event-panel";
    section.setAttribute("aria-labelledby", "create-event-title");
    section.innerHTML = `
      <div class="create-event-copy">
        <p class="eyebrow">Start a game night</p>
        <h2 id="create-event-title">Create one event, then invite everyone.</h2>
        <p>This creates the private organizer dashboard and the public participant onboarding link together. Table QR codes are created later from the dashboard.</p>
        <a href="../guide/?role=host#host-create">Read the host walkthrough</a>
      </div>
      <form id="createEventForm" class="create-event-form" novalidate>
        <label>
          Event label <small>optional organizer note</small>
          <input id="eventLabel" type="text" maxlength="120" autocomplete="off" placeholder="August 8 game night" />
        </label>
        <label>
          Facilitator creation key
          <input id="eventAdminToken" type="password" autocomplete="off" required placeholder="Required to create live sessions" />
        </label>
        <button id="createEventButton" type="submit">Create and open event</button>
        <p class="create-event-security">The facilitator key is sent only to the session service for this request. It is not saved in Host Home.</p>
        <p id="createEventStatus" class="form-status" aria-live="polite"></p>
      </form>
    `;
    hero.insertAdjacentElement("afterend", section);

    for (const id of ["createEventForm", "eventLabel", "eventAdminToken", "createEventButton", "createEventStatus"]) {
      el[id] = section.querySelector(`#${id}`);
    }
    el.createEventForm.addEventListener("submit", createEvent);
    installEventLabelRendering();
  }

  async function createEvent(event) {
    event.preventDefault();
    const eventLabel = el.eventLabel.value.trim();
    const adminToken = el.eventAdminToken.value.trim();
    if (!adminToken) {
      setStatus("Enter the facilitator creation key.", "error");
      el.eventAdminToken.focus();
      return;
    }

    const confirmed = window.confirm(
      eventLabel
        ? `Create the live game-night event “${eventLabel}”?`
        : "Create a live game-night event now?"
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("Checking the session service…");
    try {
      await checkService();
      setStatus("Creating the event…");
      const created = await createSession(adminToken, eventLabel);
      const urls = resolveEventUrls(created);
      const participant = new URL(urls.participantUrl);
      const dashboard = new URL(urls.dashboardUrl);
      const code = participant.searchParams.get("code") || dashboard.searchParams.get("code") || "";
      const hostKey = dashboard.searchParams.get("host") || "";
      if (!code || !hostKey) throw new Error("The session service did not return usable event links.");

      registry.registerEvent({
        code,
        hostKey,
        sessionId: created.sessionId,
        sheetSerial: created.sheetSerial,
        dashboardUrl: urls.dashboardUrl,
        participantUrl: urls.participantUrl,
        registrationControlsUrl: urls.registrationControlsUrl,
        createdAt: created.createdAt,
        updatedAt: new Date().toISOString()
      });

      el.eventAdminToken.value = "";
      rememberEventLabel(code, eventLabel);
      setStatus("Event created. Opening the private dashboard…", "success");
      window.setTimeout(() => window.location.assign(urls.dashboardUrl), 250);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "The game-night event could not be created.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function checkService() {
    const response = await fetch(`${API_ORIGIN}/health`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Session service health check failed (${response.status}).`);
    const health = await response.json();
    if (health.version !== CURRENT_RULES_VERSION) throw new Error(`Session service reports ${health.version || "an unknown version"}.`);
    if (!health.database) throw new Error("Session service database is not configured.");
    if (!health.sessionCreationConfigured) throw new Error("Session creation is not configured.");
    if (!health.onboardingSupported || !health.eventGamesSupported) {
      throw new Error("The session service does not report game-night event support.");
    }
  }

  async function createSession(adminToken, eventLabel) {
    const response = await fetch(`${API_ORIGIN}/api/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rulesVersion: CURRENT_RULES_VERSION,
        sessionKind: "event",
        metadata: {
          generatedFrom: "playtest-host-home",
          intendedUse: "game-night-event",
          eventLabel: eventLabel || undefined
        }
      })
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload?.error || `Event creation failed (${response.status}).`);
    return payload;
  }

  function resolveEventUrls(created) {
    const registrationControlsUrl = sameOriginUrl(created.hostUrl);
    const participantUrl = sameOriginUrl(
      created.onboardingUrl || replaceSessionPath(created.joinUrl, "onboarding")
    );
    const dashboardUrl = sameOriginUrl(
      created.onboardingHostUrl || replaceSessionPath(created.hostUrl, "onboarding")
    );
    if (!registrationControlsUrl || !participantUrl || !dashboardUrl) {
      throw new Error("The session service returned incomplete event links.");
    }
    return { registrationControlsUrl, participantUrl, dashboardUrl };
  }

  function replaceSessionPath(value, destination) {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      url.pathname = url.pathname.replace(/\/playtest\/session\/?$/, `/playtest/${destination}/`);
      return url.href;
    } catch {
      return "";
    }
  }

  function sameOriginUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      return url.origin === window.location.origin ? url.href : "";
    } catch {
      return "";
    }
  }

  function rememberEventLabel(code, label) {
    if (!label) return;
    try {
      const labels = readEventLabels();
      labels[code] = label.slice(0, 120);
      localStorage.setItem(LABEL_STORAGE_KEY, JSON.stringify(labels));
    } catch {
      // The event remains usable without a local label.
    }
  }

  function installEventLabelRendering() {
    const eventList = document.getElementById("eventList");
    if (!eventList) return;
    const observer = new MutationObserver(() => applyEventLabels(eventList, observer));
    observer.observe(eventList, { childList: true, subtree: true });
    applyEventLabels(eventList, observer);
  }

  function applyEventLabels(eventList, observer) {
    const labels = readEventLabels();
    const events = (registry.read().events || [])
      .slice()
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    const cards = Array.from(eventList.querySelectorAll(".host-event-card"));
    observer.disconnect();
    cards.forEach((card, index) => {
      const event = events[index];
      const label = event && labels[event.code];
      const heading = card.querySelector("h3");
      if (!event || !label || !heading) return;
      if (heading.textContent !== label) heading.textContent = label;
      let serial = card.querySelector("[data-event-serial]");
      if (!serial) {
        serial = document.createElement("p");
        serial.className = "host-meta";
        serial.dataset.eventSerial = "true";
        heading.insertAdjacentElement("afterend", serial);
      }
      serial.textContent = event.sheetSerial ? `Event ${event.sheetSerial}` : "Game-night event";
    });
    observer.observe(eventList, { childList: true, subtree: true });
  }

  function readEventLabels() {
    try {
      const labels = JSON.parse(localStorage.getItem(LABEL_STORAGE_KEY) || "{}");
      return labels && typeof labels === "object" && !Array.isArray(labels) ? labels : {};
    } catch {
      return {};
    }
  }

  function setBusy(busy) {
    el.createEventButton.disabled = busy;
    el.eventLabel.disabled = busy;
    el.eventAdminToken.disabled = busy;
  }

  function setStatus(message, kind = "") {
    el.createEventStatus.textContent = message;
    el.createEventStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }
})();
