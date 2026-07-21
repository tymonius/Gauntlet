(() => {
  const STORAGE_KEY = "gauntlet-v0.6.0-playtest-draft";
  const form = document.getElementById("playtestForm");
  const status = document.getElementById("saveStatus");
  let saveTimer = null;

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    setDefaultDate();
    restoreDraft();
    form.addEventListener("input", scheduleSave);
    form.addEventListener("change", scheduleSave);
    document.getElementById("printButton").addEventListener("click", () => window.print());
    document.getElementById("copyButton").addEventListener("click", copyReport);
    document.getElementById("downloadButton").addEventListener("click", downloadJson);
    document.getElementById("resetButton").addEventListener("click", clearForm);
  }

  function setDefaultDate() {
    const field = form.elements.date;
    if (field && !field.value) field.value = new Date().toISOString().slice(0, 10);
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    status.textContent = "Saving draft…";
    status.classList.remove("saved");
    saveTimer = window.setTimeout(saveDraft, 200);
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
      status.textContent = "Draft saved locally";
      status.classList.add("saved");
    } catch (error) {
      console.error(error);
      status.textContent = "Draft could not be saved";
      status.classList.remove("saved");
    }
  }

  function restoreDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      for (const element of form.elements) {
        if (!element.name || !(element.name in data)) continue;
        if (element.type === "checkbox") element.checked = Boolean(data[element.name]);
        else element.value = data[element.name] ?? "";
      }
      status.textContent = "Saved draft restored";
      status.classList.add("saved");
    } catch (error) {
      console.error(error);
      status.textContent = "Saved draft could not be restored";
    }
  }

  function collectData() {
    const data = {
      schema: "gauntlet-playtest-response",
      schemaVersion: 2,
      gameVersion: "v0.6.0",
      exportedAt: new Date().toISOString(),
    };

    for (const element of form.elements) {
      if (!element.name) continue;
      data[element.name] = element.type === "checkbox" ? element.checked : element.value;
    }

    return data;
  }

  async function copyReport() {
    const report = buildReport(collectData());
    try {
      await navigator.clipboard.writeText(report);
      status.textContent = "Report copied";
      status.classList.add("saved");
    } catch (error) {
      console.error(error);
      window.prompt("Copy the playtest report:", report);
    }
  }

  function downloadJson() {
    const data = collectData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const session = slugify(data.session_id || `${data.date || "undated"}-${data.a_faction_leader || "player-a"}-vs-${data.b_faction_leader || "player-b"}`);
    anchor.href = url;
    anchor.download = `gauntlet-playtest-${session || "response"}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    status.textContent = "Response downloaded";
    status.classList.add("saved");
  }

  function clearForm() {
    if (!confirm("Clear every response and delete the locally saved draft?")) return;
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    setDefaultDate();
    status.textContent = "Form cleared";
    status.classList.remove("saved");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildReport(data) {
    const flags = [
      ["flag_winner_clear_early", "Winner clear long before the end"],
      ["flag_repetitive", "Repetitive or low-stakes battles"],
      ["flag_no_options", "Player had no meaningful options"],
      ["flag_attack_futile", "Attacking felt consistently futile"],
      ["flag_snowball", "Territory / Asset loss snowballed too hard"],
      ["flag_alt_victory", "Additional victory felt solitaire or irrelevant"],
      ["flag_card_flow", "Card flow or Graveyard pressure broke down"],
      ["flag_rules_components", "Rules text or components interrupted play"],
    ].filter(([key]) => data[key]).map(([, label]) => label);

    return [
      "# Gauntlet v0.6.0 Playtest Report",
      "",
      `- **Date:** ${value(data.date)}`,
      `- **Session:** ${value(data.session_id)}`,
      `- **Test type:** ${value(data.test_type)}`,
      `- **Play time:** ${value(data.play_minutes)} minutes`,
      `- **Player A:** ${value(data.a_name)} — ${value(data.a_faction_leader)} — ${value(data.a_deck)}`,
      `- **Player B:** ${value(data.b_name)} — ${value(data.b_faction_leader)} — ${value(data.b_deck)}`,
      `- **First player:** ${value(data.first_player)}`,
      `- **Winner:** ${value(data.winner)}`,
      `- **Victory route:** ${value(data.victory_route)}`,
      `- **Rounds / battles / rule lookups:** ${value(data.rounds)} / ${value(data.battle_count)} / ${value(data.rule_lookups)}`,
      "",
      "## Ratings",
      "",
      `- **Player A:** fun ${value(data.a_fun)}, pacing ${value(data.a_pacing)}, decisions ${value(data.a_decisions)}, battles ${value(data.a_battles)}, faction clarity ${value(data.a_faction_clarity)}, replay ${value(data.a_replay)}`,
      `- **Player B:** fun ${value(data.b_fun)}, pacing ${value(data.b_pacing)}, decisions ${value(data.b_decisions)}, battles ${value(data.b_battles)}, faction clarity ${value(data.b_faction_clarity)}, replay ${value(data.b_replay)}`,
      "",
      `- **Warning flags:** ${flags.length ? flags.join("; ") : "None marked"}`,
      "",
      "## Feedback",
      "",
      bullet("Worked best", data.worked_best),
      bullet("Dragged or felt weak", data.worked_worst),
      bullet("Confusing or required a ruling", data.confusing),
      bullet("Too strong, weak, or automatic", data.balance_notes),
      bullet("Best moment / hardest decision", data.best_moment),
      bullet("Investigate next", data.next_test),
    ].join("\n").trim() + "\n";
  }

  function bullet(label, text) {
    return `- **${label}:** ${value(text)}`;
  }

  function value(input) {
    return String(input ?? "").trim() || "—";
  }

  function slugify(input) {
    return String(input)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90);
  }
})();
