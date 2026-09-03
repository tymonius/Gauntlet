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
  const RATINGS = Object.freeze([
    ["expectationMatch", "Expectation matched play", "Did the faction page accurately represent the experience?"],
    ["leaderDistinction", "Leader felt distinct", "Did this Leader create a meaningful identity?"],
    ["fun", "Overall fun", "How enjoyable was the game?"],
    ["pacing", "Pacing", "How well did the game move?"],
    ["meaningfulDecisions", "Meaningful decisions", "How often did choices feel consequential?"],
    ["battleTension", "Battle tension", "How engaging were confrontations?"],
    ["rulesClarity", "Rules clarity", "How understandable was the shared game?"],
    ["factionClarity", "Faction clarity", "How understandable was your faction and Leader?"],
    ["tableOrganization", "Table organization", "How manageable were cards, zones, and components?"]
  ]);
  const RATING_LABELS = Object.freeze({ 1: "Very poor", 2: "Poor", 3: "Mixed", 4: "Good", 5: "Excellent" });
  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    for (const id of [
      "feedbackForm", "successPanel", "receiptCode", "submitAnother", "displayName", "playedOn",
      "faction", "leader", "opponentFaction", "opponentLeader", "completionStatus",
      "outcomePerspective", "durationMinutes", "rounds", "packageUnmodified", "variantUsed",
      "productionIssue", "factionInterest", "ratingGrid", "playAgain", "strongestMoment",
      "confusingPoint", "importantObservation", "comments", "formStatus"
    ]) el[id] = document.getElementById(id);

    const today = localDateValue(new Date());
    el.playedOn.max = today;
    el.playedOn.value = today;
    populateFactionSelect(el.faction, false);
    populateFactionSelect(el.opponentFaction, true);
    populateLeaders(el.faction, el.leader, false);
    populateLeaders(el.opponentFaction, el.opponentLeader, true);
    renderRatings();
    restoreStartChoice();

    el.faction.addEventListener("change", () => populateLeaders(el.faction, el.leader, false));
    el.opponentFaction.addEventListener("change", () => populateLeaders(el.opponentFaction, el.opponentLeader, true));
    el.feedbackForm.addEventListener("submit", submitFeedback);
    el.submitAnother.addEventListener("click", resetForAnother);
  }

  function populateFactionSelect(select, optional) {
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = optional ? "Unknown / not entered" : "Choose faction";
    select.append(placeholder);
    for (const [value, faction] of Object.entries(FACTIONS)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = faction.name;
      select.append(option);
    }
  }

  function populateLeaders(factionSelect, leaderSelect, optional) {
    leaderSelect.replaceChildren();
    const faction = FACTIONS[factionSelect.value];
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = optional ? "Unknown / not entered" : "Choose Leader";
    leaderSelect.append(placeholder);
    if (!faction) {
      leaderSelect.disabled = true;
      return;
    }
    for (const [value, name] of Object.entries(faction.leaders)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = name;
      leaderSelect.append(option);
    }
    leaderSelect.disabled = false;
  }

  function renderRatings() {
    el.ratingGrid.innerHTML = RATINGS.map(([key, label, help]) => `
      <fieldset class="rating-card">
        <legend class="visually-hidden">${label}</legend>
        <h3>${label}</h3>
        <p>${help}</p>
        <div class="rating-scale" role="radiogroup" aria-label="${label}">
          ${[1, 2, 3, 4, 5].map((value) => `
            <label class="rating-option" title="${RATING_LABELS[value]}">
              <input type="radio" name="rating_${key}" value="${value}" data-rating="${key}" aria-label="${value} — ${RATING_LABELS[value]}" required />
              <span aria-hidden="true">${value}</span>
            </label>`).join("")}
        </div>
      </fieldset>`).join("");
  }

  async function submitFeedback(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("Submitting feedback…");
    try {
      const ratings = collectRatings();
      const payload = await request("/api/standalone-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: el.displayName.value.trim(),
          playedOn: el.playedOn.value,
          faction: el.faction.value,
          leader: el.leader.value,
          context: {
            opponentFaction: el.opponentFaction.value,
            opponentLeader: el.opponentLeader.value,
            completionStatus: el.completionStatus.value,
            outcomePerspective: el.outcomePerspective.value,
            durationMinutes: el.durationMinutes.value,
            rounds: el.rounds.value,
            packageUnmodified: el.packageUnmodified.checked,
            variantUsed: el.variantUsed.checked,
            productionIssue: el.productionIssue.value.trim(),
            strongestMoment: el.strongestMoment.value.trim(),
            confusingPoint: el.confusingPoint.value.trim(),
            importantObservation: el.importantObservation.value.trim()
          },
          response: {
            factionInterest: el.factionInterest.value.trim(),
            ...ratings,
            playAgain: el.playAgain.value === "yes",
            comments: el.comments.value.trim()
          }
        })
      });
      el.receiptCode.textContent = payload.receipt;
      el.feedbackForm.hidden = true;
      el.successPanel.hidden = false;
      el.successPanel.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setStatus(error.message || "Feedback could not be submitted.", "error");
    } finally {
      setBusy(false);
    }
  }

  function collectRatings() {
    const ratings = {};
    for (const [key, label] of RATINGS) {
      const selected = el.ratingGrid.querySelector(`input[name="rating_${key}"]:checked`);
      if (!selected) throw new Error(`Please rate "${label}" before submitting.`);
      ratings[key] = Number(selected.value);
    }
    return ratings;
  }

  function resetForAnother() {
    el.feedbackForm.reset();
    const today = localDateValue(new Date());
    el.playedOn.max = today;
    el.playedOn.value = today;
    populateLeaders(el.faction, el.leader, false);
    populateLeaders(el.opponentFaction, el.opponentLeader, true);
    restoreStartChoice();
    el.successPanel.hidden = true;
    el.feedbackForm.hidden = false;
    setStatus("");
    el.displayName.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restoreStartChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(START_STORAGE_KEY) || "null");
      if (!saved || !FACTIONS[saved.faction] || !FACTIONS[saved.faction].leaders[saved.leader]) return;
      el.faction.value = saved.faction;
      populateLeaders(el.faction, el.leader, false);
      el.leader.value = saved.leader;
    } catch {}
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
    el.feedbackForm.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = busy; });
  }

  function setStatus(message, tone = "") {
    el.formStatus.textContent = message;
    el.formStatus.className = `form-status ${tone}`.trim();
  }

  function localDateValue(date) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  }
})();
