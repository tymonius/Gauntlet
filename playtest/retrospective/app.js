(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const START_STORAGE_KEY = "gauntlet_standalone_onboarding_v1";
  const FACTIONS = Object.freeze({
    military: { name: "Military", leaders: { general: "General", commandant: "Commandant" } },
    diplomats: { name: "Diplomats", leaders: { ambassador: "Ambassador", senator: "Senator" } },
    financiers: { name: "Financiers", leaders: { banker: "Banker", executive: "Executive" } },
    intelligence: { name: "Intelligence", leaders: { ranger: "Ranger", spymaster: "Spymaster" } },
    mystics: { name: "Mystics", leaders: { alchemist: "Alchemist", "spirit-walker": "Spirit Walker" } },
    inquisition: { name: "Inquisition", leaders: { "grand-inquisitor": "Grand Inquisitor", "witch-hunter": "Witch Hunter" } }
  });

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const form = document.getElementById("retrospectiveForm");
    const faction = document.getElementById("retrospectiveFaction");
    const leader = document.getElementById("retrospectiveLeader");
    const playedOn = document.getElementById("playedOn");
    const status = document.getElementById("formStatus");
    const savedChoice = readJsonStorage(START_STORAGE_KEY);

    status?.setAttribute("role", "status");
    if (status) status.tabIndex = -1;

    populateFactions(faction);
    playedOn.value = localDateValue(new Date());
    playedOn.max = localDateValue(new Date());

    if (savedChoice?.faction && FACTIONS[savedChoice.faction]) {
      faction.value = savedChoice.faction;
      populateLeaders(faction, leader);
      if (savedChoice.leader && [...leader.options].some((option) => option.value === savedChoice.leader)) {
        leader.value = savedChoice.leader;
      }
      document.getElementById("savedChoiceNote").textContent =
        `Using your saved choice: ${FACTIONS[savedChoice.faction].name} · ${leader.options[leader.selectedIndex]?.textContent || savedChoice.leader}.`;
    } else {
      populateLeaders(faction, leader);
    }

    faction.addEventListener("change", () => populateLeaders(faction, leader));
    form.addEventListener("submit", createRetrospectiveGame);
  }

  async function createRetrospectiveGame(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.getElementById("formStatus");
    const submit = form.querySelector('button[type="submit"]');
    const returnFocusTo = document.activeElement instanceof HTMLElement && form.contains(document.activeElement)
      ? document.activeElement
      : null;
    status.className = "form-status";
    status.textContent = "Creating the retrospective record…";
    if (returnFocusTo) status.focus({ preventScroll: true });
    submit.disabled = true;

    try {
      const response = await fetch(`${API_ORIGIN}/api/retrospective-games`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          displayName: document.getElementById("retrospectiveName").value.trim(),
          faction: document.getElementById("retrospectiveFaction").value,
          leader: document.getElementById("retrospectiveLeader").value,
          playedOn: document.getElementById("playedOn").value
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `The service returned ${response.status}.`);

      const prefix = `gauntlet_tracked_${payload.joinToken.slice(0, 16)}`;
      writeJsonStorage(`${prefix}_participant`, {
        participantId: payload.participantId,
        participantToken: payload.participantToken,
        displayName: document.getElementById("retrospectiveName").value.trim(),
        seatIndex: payload.seatIndex,
        faction: payload.faction,
        leader: payload.leader
      });
      writeStorage(`${prefix}_host`, payload.hostKey);
      window.location.assign(payload.reviewUrl);
    } catch (error) {
      console.error(error);
      status.className = "form-status error";
      status.textContent = error.message || "The retrospective record could not be created.";
      submit.disabled = false;
      if (
        returnFocusTo &&
        document.activeElement === status &&
        returnFocusTo.isConnected
      ) returnFocusTo.focus({ preventScroll: true });
    }
  }

  function populateFactions(select) {
    select.innerHTML = Object.entries(FACTIONS)
      .map(([value, faction]) => `<option value="${value}">${faction.name}</option>`)
      .join("");
  }

  function populateLeaders(factionSelect, leaderSelect) {
    const faction = FACTIONS[factionSelect.value];
    leaderSelect.innerHTML = faction
      ? Object.entries(faction.leaders).map(([value, name]) => `<option value="${value}">${name}</option>`).join("")
      : "";
    leaderSelect.disabled = !faction;
  }

  function localDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function readJsonStorage(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function writeJsonStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The participant can still continue in this tab if storage is unavailable.
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // The review URL supplies the creator key for the first navigation.
    }
  }
})();
