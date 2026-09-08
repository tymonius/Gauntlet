(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  const hostKey = String(params.get("host") || "").trim();
  const storageKey = TOKEN_PATTERN.test(code)
    ? `gauntlet_onboarding_${code.slice(0, 16)}`
    : "gauntlet_onboarding_invalid";

  const FACTIONS = Object.freeze({
    military: {
      name: "Military",
      guide: "../../factions/military/",
      summary: "Military turns battlefield victories into Command and spends it on movement, pressure, defense, and control.",
      leaders: [
        { name: "General", summary: "Offensive momentum, reinforcement, and pressing an advantage." },
        { name: "Commandant", summary: "Defense, counterattack, retreat pressure, and fortified control." }
      ]
    },
    diplomats: {
      name: "Diplomats",
      guide: "../../factions/diplomats/",
      summary: "Diplomats use Influence, Terms, Proposals, concessions, and legitimacy to shape the conflict.",
      leaders: [
        { name: "Ambassador", summary: "Negotiation, Terms, and extracting value from agreements." },
        { name: "Senator", summary: "Political leverage, Proposals, and building public legitimacy." }
      ]
    },
    financiers: {
      name: "Financiers",
      guide: "../../factions/financiers/",
      summary: "Financiers turn Capital, Assets, Deeds, leverage, and ownership into strategic power.",
      leaders: [
        { name: "Banker", summary: "Capital management, reserves, financing, and compounding leverage." },
        { name: "Executive", summary: "Assets, acquisition, ownership, and converting control into power." }
      ]
    },
    intelligence: {
      name: "Intelligence",
      guide: "../../factions/intelligence/",
      summary: "Intelligence gathers information, conducts Missions, and disrupts hidden enemy plans.",
      leaders: [
        { name: "Ranger", summary: "Field operations, Missions, adaptability, and direct intervention." },
        { name: "Spymaster", summary: "Surveillance, interference, hidden information, and manipulation." }
      ]
    },
    mystics: {
      name: "Mystics",
      guide: "../../factions/mystics/",
      summary: "Mystics perform Rites, invoke the Arcane, and transform cards as their power develops.",
      leaders: [
        { name: "Alchemist", summary: "Transmutation, deliberate card transformation, and constructed engines." },
        { name: "Spirit Walker", summary: "Ritual progression, invocation, and spiritual momentum." }
      ]
    },
    inquisition: {
      name: "Inquisition",
      guide: "../../factions/inquisition/",
      summary: "Inquisition builds Conviction through judgment, denial, condemnation, and suppression.",
      leaders: [
        { name: "Grand Inquisitor", summary: "Condemnation, institutional judgment, and controlled denial." },
        { name: "Witch Hunter", summary: "Pursuit, Purge, targeted suppression, and Graveyard pressure." }
      ]
    }
  });

  const state = {
    session: null,
    participantId: "",
    roster: null,
    saved: readState()
  };

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    for (const id of [
      "sessionLabel", "sessionDetail", "errorPanel", "errorTitle", "errorMessage",
      "organizerPanel", "copyInvite", "refreshRoster", "downloadRoster", "organizerStatus",
      "choiceCount", "pendingCount", "rosterBody", "pendingPlayers", "pendingList",
      "onboardingForm", "displayName", "leaderFieldset", "leaderPrompt", "leaderChoices",
      "choiceReason", "selectedFactionHeading", "selectedFactionCopy", "selectedFactionLink",
      "selectionSummary", "introConfirmed", "submitChoice", "submitStatus", "successPanel",
      "successHeading", "successCopy", "reviseChoice"
    ]) el[id] = document.getElementById(id);

    document.querySelectorAll('input[name="faction"]').forEach((input) => {
      input.addEventListener("change", () => selectFaction(input.value));
    });
    el.onboardingForm?.addEventListener("submit", submitChoice);
    el.reviseChoice?.addEventListener("click", () => {
      el.successPanel.hidden = true;
      document.getElementById("choose")?.scrollIntoView({ behavior: "smooth", block: "start" });
      el.displayName?.focus({ preventScroll: true });
    });
    el.copyInvite?.addEventListener("click", copyParticipantLink);
    el.refreshRoster?.addEventListener("click", loadRoster);
    el.downloadRoster?.addEventListener("click", downloadRosterCsv);

    restoreForm();

    if (!TOKEN_PATTERN.test(code)) {
      showFatalError(
        "This onboarding link is incomplete.",
        "Ask the game-night organizer for the full invitation link. It must contain a valid playtest session code."
      );
      return;
    }

    loadSession();
  }

  async function loadSession() {
    setSessionStatus("Checking invitation…", "");
    try {
      state.session = await api(`/api/sessions/${encodeURIComponent(code)}`);
      renderSession();
      if (hostKey) {
        el.organizerPanel.hidden = false;
        await loadRoster();
      }
    } catch (error) {
      console.error(error);
      showFatalError(
        error.status === 404 ? "This game-night invitation was not found." : "The playtest service is unavailable.",
        error.status === 404
          ? "The invitation may have been retired or copied incorrectly. Ask the organizer for a fresh link."
          : "Try the link again later or contact the organizer so your choice can be recorded another way."
      );
    }
  }

  function renderSession() {
    const closed = state.session?.status === "closed";
    document.body.classList.toggle("session-ready", !closed);
    document.body.classList.toggle("session-closed", closed);
    el.errorPanel.hidden = true;
    el.onboardingForm.hidden = false;

    setSessionStatus(
      closed ? "Selections are closed" : "Invitation ready",
      `${state.session.sheetSerial} · ${state.session.rulesVersion}`
    );

    if (closed) {
      el.submitChoice.disabled = true;
      setFormStatus(el.submitStatus, "This invitation has been closed by the organizer.", "error");
    }
  }

  function selectFaction(key, preferredLeader = "") {
    const faction = FACTIONS[key];
    if (!faction) {
      el.leaderFieldset.disabled = true;
      el.leaderPrompt.textContent = "Choose a faction first.";
      el.leaderChoices.replaceChildren();
      updateSelectedFaction(null);
      updateSelectionSummary();
      return;
    }

    el.leaderFieldset.disabled = false;
    el.leaderPrompt.textContent = `Choose how you want to lead ${faction.name}.`;
    el.leaderChoices.replaceChildren();

    faction.leaders.forEach((leader) => {
      const label = document.createElement("label");
      label.className = "leader-choice";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "leader";
      input.value = leader.name;
      input.required = true;
      if (leader.name === preferredLeader) input.checked = true;
      input.addEventListener("change", updateSelectionSummary);

      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = leader.name;
      const summary = document.createElement("small");
      summary.textContent = leader.summary;
      copy.append(name, summary);
      label.append(input, copy);
      el.leaderChoices.append(label);
    });

    updateSelectedFaction(key);
    updateSelectionSummary();
  }

  function updateSelectedFaction(key) {
    const faction = FACTIONS[key];
    if (!faction) {
      el.selectedFactionHeading.textContent = "Choose a faction above.";
      el.selectedFactionCopy.textContent = "Once selected, use its full faction guide to learn its resource, Leader abilities, special procedures, and any additional victory condition.";
      el.selectedFactionLink.href = "../../#factions";
      el.selectedFactionLink.textContent = "Browse faction guides";
      return;
    }

    el.selectedFactionHeading.textContent = faction.name;
    el.selectedFactionCopy.textContent = `${faction.summary} Read the full guide before game night for its resource, special procedures, Leader abilities, and any additional victory condition.`;
    el.selectedFactionLink.href = faction.guide;
    el.selectedFactionLink.textContent = `Read the ${faction.name} guide`;
  }

  function updateSelectionSummary() {
    const factionKey = selectedValue("faction");
    const leader = selectedValue("leader");
    const faction = FACTIONS[factionKey];
    el.selectionSummary.textContent = faction && leader
      ? `You are asking the organizer to prepare ${leader} of the ${faction.name}. You may revise this choice before the session closes.`
      : "Choose a faction and Leader above.";
  }

  async function submitChoice(event) {
    event.preventDefault();
    el.successPanel.hidden = true;

    if (!el.onboardingForm.reportValidity()) {
      setFormStatus(el.submitStatus, "Complete the required fields before submitting.", "error");
      return;
    }

    const faction = selectedValue("faction");
    const leader = selectedValue("leader");
    if (!FACTIONS[faction] || !FACTIONS[faction].leaders.some((item) => item.name === leader)) {
      setFormStatus(el.submitStatus, "Choose a valid faction and Leader.", "error");
      return;
    }

    setBusy(true);
    setFormStatus(el.submitStatus, "Saving your choice…");
    try {
      await ensureParticipant();
      await recordChoice();
      saveState({
        participantId: state.participantId,
        displayName: el.displayName.value.trim(),
        faction,
        leader,
        reason: el.choiceReason.value.trim(),
        introConfirmed: el.introConfirmed.checked
      });
      showSuccess(faction, leader);
      if (hostKey) void loadRoster();
    } catch (error) {
      console.error(error);
      if (state.participantId && error.status === 404) {
        try {
          state.participantId = "";
          await ensureParticipant();
          await recordChoice();
          saveState({
            participantId: state.participantId,
            displayName: el.displayName.value.trim(),
            faction,
            leader,
            reason: el.choiceReason.value.trim(),
            introConfirmed: el.introConfirmed.checked
          });
          showSuccess(faction, leader);
          return;
        } catch (retryError) {
          console.error(retryError);
          setFormStatus(el.submitStatus, retryError.message || "Your choice could not be saved.", "error");
        }
      } else {
        setFormStatus(el.submitStatus, error.message || "Your choice could not be saved.", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function ensureParticipant() {
    if (state.participantId) return;
    const result = await api(`/api/sessions/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: {
        displayName: el.displayName.value.trim(),
        role: "player"
      }
    });
    state.participantId = result.participantId;
  }

  async function recordChoice() {
    await api(`/api/sessions/${encodeURIComponent(code)}/event`, {
      method: "POST",
      body: {
        eventType: "onboarding_choice",
        data: {
          participantId: state.participantId,
          displayName: el.displayName.value.trim(),
          faction: selectedValue("faction"),
          leader: selectedValue("leader"),
          reason: el.choiceReason.value.trim(),
          introConfirmed: el.introConfirmed.checked
        }
      }
    });
  }

  function showSuccess(factionKey, leader) {
    const faction = FACTIONS[factionKey];
    setFormStatus(el.submitStatus, "Saved.", "success");
    el.successHeading.textContent = `${leader} of the ${faction.name} is on the roster.`;
    el.successCopy.textContent = "The organizer can now prepare your recommended Deck, Leader, Territories, and required faction components. Re-submit at any time before the session closes to replace this choice.";
    el.successPanel.hidden = false;
    el.successPanel.focus({ preventScroll: true });
    el.successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function loadRoster() {
    if (!hostKey) return;
    setFormStatus(el.organizerStatus, "Loading roster…");
    el.refreshRoster.disabled = true;
    try {
      state.roster = await api(`/api/sessions/${encodeURIComponent(code)}/onboarding`, {
        headers: { "X-Host-Key": hostKey }
      });
      renderRoster();
      setFormStatus(el.organizerStatus, `Roster refreshed ${formatDate(state.roster.generatedAt)}.`, "success");
    } catch (error) {
      console.error(error);
      setFormStatus(el.organizerStatus, error.message || "The roster could not be loaded.", "error");
    } finally {
      el.refreshRoster.disabled = false;
    }
  }

  function renderRoster() {
    const choices = Array.isArray(state.roster?.choices) ? state.roster.choices : [];
    const pending = Array.isArray(state.roster?.pendingParticipants) ? state.roster.pendingParticipants : [];
    el.choiceCount.textContent = String(choices.length);
    el.pendingCount.textContent = String(pending.length);
    el.downloadRoster.disabled = choices.length === 0;
    el.rosterBody.replaceChildren();

    if (choices.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "No choices have been submitted yet.";
      row.append(cell);
      el.rosterBody.append(row);
    } else {
      choices
        .slice()
        .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)))
        .forEach((choice) => {
          const row = document.createElement("tr");
          appendCell(row, choice.displayName || "Unnamed player");
          appendCell(row, FACTIONS[choice.faction]?.name || choice.faction || "—");
          appendCell(row, choice.leader || "—");
          appendCell(row, choice.reason || "—");
          appendCell(row, formatDate(choice.submittedAt));
          el.rosterBody.append(row);
        });
    }

    el.pendingPlayers.hidden = pending.length === 0;
    el.pendingList.replaceChildren();
    pending.forEach((participant) => {
      const item = document.createElement("li");
      item.textContent = participant.displayName || "Unnamed player";
      el.pendingList.append(item);
    });
  }

  async function copyParticipantLink() {
    const invite = new URL(window.location.href);
    invite.searchParams.delete("host");
    try {
      await navigator.clipboard.writeText(invite.href);
      setFormStatus(el.organizerStatus, "Participant link copied.", "success");
    } catch {
      window.prompt("Copy this participant link:", invite.href);
    }
  }

  function downloadRosterCsv() {
    const choices = Array.isArray(state.roster?.choices) ? state.roster.choices : [];
    if (choices.length === 0) return;
    const rows = [
      ["Player", "Faction", "Leader", "Reason", "Submitted at"],
      ...choices.map((choice) => [
        choice.displayName || "",
        FACTIONS[choice.faction]?.name || choice.faction || "",
        choice.leader || "",
        choice.reason || "",
        choice.submittedAt || ""
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.session?.sheetSerial || "gauntlet"}-game-night-roster.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function restoreForm() {
    const saved = state.saved;
    state.participantId = String(saved.participantId || "");
    if (saved.displayName) el.displayName.value = saved.displayName;
    if (saved.reason) el.choiceReason.value = saved.reason;
    el.introConfirmed.checked = saved.introConfirmed === true;

    if (FACTIONS[saved.faction]) {
      const factionInput = document.querySelector(`input[name="faction"][value="${saved.faction}"]`);
      if (factionInput) factionInput.checked = true;
      selectFaction(saved.faction, saved.leader || "");
    } else {
      updateSelectedFaction(null);
      updateSelectionSummary();
    }
  }

  function readState() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveState(value) {
    state.saved = value;
    try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* optional */ }
  }

  function selectedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const init = { method: options.method || "GET", headers };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const response = await fetch(`${API_ORIGIN}${path}`, init);
    let payload = null;
    try { payload = await response.json(); } catch { /* no JSON body */ }
    if (!response.ok) {
      const error = new Error(payload?.error || `Session service returned ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function setSessionStatus(label, detail) {
    el.sessionLabel.textContent = label;
    el.sessionDetail.textContent = detail;
  }

  function showFatalError(title, message) {
    document.body.classList.remove("session-ready");
    el.onboardingForm.hidden = true;
    el.organizerPanel.hidden = true;
    el.errorTitle.textContent = title;
    el.errorMessage.textContent = message;
    el.errorPanel.hidden = false;
    el.errorPanel.focus({ preventScroll: true });
    setSessionStatus("Invitation unavailable", "");
  }

  function setBusy(busy) {
    el.submitChoice.disabled = busy || state.session?.status === "closed";
    el.submitChoice.textContent = busy ? "Saving…" : "Submit my choice";
  }

  function setFormStatus(element, message, kind = "") {
    if (!element) return;
    element.textContent = message;
    element.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function appendCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = String(value ?? "");
    row.append(cell);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }
})();
