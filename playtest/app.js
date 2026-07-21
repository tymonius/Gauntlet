(() => {
  const STORAGE_KEY = "gauntlet-v0.6.0-playtest-draft";
  const RATING_QUESTIONS = [
    ["overall_fun", "The game was fun."],
    ["objective_clarity", "I understood how to win and what I should be working toward."],
    ["faction_clarity", "I understood my faction system and Leader ability."],
    ["deck_coherence", "My Deck felt built around a coherent strategy."],
    ["meaningful_choices", "I made meaningful decisions throughout the game."],
    ["battle_tension", "Battles felt tense and consequential."],
    ["battle_clarity", "The battle sequence was easy to follow."],
    ["pace", "The overall pace felt appropriate."],
    ["downtime", "I stayed engaged while the other player acted."],
    ["interaction", "I could understand and respond to the opponent's plan."],
    ["recovery", "A plausible comeback remained available when I fell behind."],
    ["territory_progress", "Territorial progress felt durable and worthwhile."],
    ["alternate_victory", "Additional-victory pressure was visible and interactive."],
    ["card_clarity", "Card and Territory wording was clear."],
    ["component_usability", "Trackers, references, and physical game state were easy to use."],
    ["replay_interest", "I would choose to play Gauntlet again."],
  ];

  const ISSUE_COUNT = 5;
  const form = document.getElementById("playtestForm");
  const status = document.getElementById("saveStatus");
  let saveTimer = null;

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    renderRatingMatrix("a", document.getElementById("ratingMatrixA"));
    renderRatingMatrix("b", document.getElementById("ratingMatrixB"));
    renderIssueRows();
    setDefaultDate();
    restoreDraft();

    form.addEventListener("input", scheduleSave);
    form.addEventListener("change", scheduleSave);
    document.getElementById("printButton").addEventListener("click", () => window.print());
    document.getElementById("copyButton").addEventListener("click", copyReport);
    document.getElementById("downloadButton").addEventListener("click", downloadJson);
    document.getElementById("resetButton").addEventListener("click", clearForm);
  }

  function renderRatingMatrix(player, container) {
    if (!container) return;
    const title = player === "a" ? "Player A" : "Player B";
    const header = ["Statement", "1", "2", "3", "4", "5", "N/A"];
    const rows = RATING_QUESTIONS.map(([key, question]) => {
      const name = `${player}_rating_${key}`;
      const choices = ["1", "2", "3", "4", "5", "N/A"].map(value => `
        <td><label aria-label="${escapeHtml(title)}: ${escapeHtml(question)} — ${value}"><input type="radio" name="${name}" value="${value}" /></label></td>
      `).join("");
      return `<tr><td>${escapeHtml(question)}</td>${choices}</tr>`;
    }).join("");

    container.innerHTML = `
      <table class="rating-table">
        <thead><tr>${header.map(item => `<th>${item}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderIssueRows() {
    const body = document.getElementById("issueRows");
    if (!body) return;

    for (let index = 1; index <= ISSUE_COUNT; index += 1) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index}</td>
        <td><input name="issue_${index}_timing" type="text" /></td>
        <td><textarea name="issue_${index}_component" rows="3"></textarea></td>
        <td><textarea name="issue_${index}_description" rows="3"></textarea></td>
        <td>
          <select name="issue_${index}_category">
            <option value="">—</option>
            <option>Rules clarity</option>
            <option>Wording</option>
            <option>Balance</option>
            <option>Pacing</option>
            <option>Agency / snowball</option>
            <option>Onboarding</option>
            <option>Components</option>
            <option>Exploit / impossible state</option>
            <option>Preference</option>
          </select>
        </td>
        <td>
          <select name="issue_${index}_severity">
            <option value="">—</option>
            <option>Question only</option>
            <option>Minor friction</option>
            <option>Meaningful problem</option>
            <option>Severe imbalance</option>
            <option>Blocks play</option>
          </select>
        </td>
        <td>
          <select name="issue_${index}_repeatable">
            <option value="">—</option>
            <option>Unknown</option>
            <option>No</option>
            <option>Possibly</option>
            <option>Yes</option>
          </select>
        </td>
      `;
      body.append(row);
    }
  }

  function setDefaultDate() {
    const dateField = form.elements.date;
    if (dateField && !dateField.value) dateField.value = new Date().toISOString().slice(0, 10);
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    status.textContent = "Saving draft…";
    status.classList.remove("saved");
    saveTimer = window.setTimeout(saveDraft, 250);
  }

  function saveDraft() {
    try {
      const data = collectData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
        else if (element.type === "radio") element.checked = String(data[element.name]) === element.value;
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
      schemaVersion: 1,
      gameVersion: "v0.6.0",
      exportedAt: new Date().toISOString(),
    };

    for (const element of form.elements) {
      if (!element.name) continue;
      if (element.type === "checkbox") data[element.name] = element.checked;
      else if (element.type === "radio") {
        if (element.checked) data[element.name] = element.value;
        else if (!(element.name in data)) data[element.name] = "";
      } else data[element.name] = element.value;
    }

    return data;
  }

  async function copyReport() {
    const report = buildReport(collectData());
    try {
      await navigator.clipboard.writeText(report);
      status.textContent = "Readable report copied";
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
    const session = slugify(data.session_id || `${data.date || "undated"}-${data.a_faction || "player-a"}-vs-${data.b_faction || "player-b"}`);
    anchor.href = url;
    anchor.download = `gauntlet-playtest-${session || "response"}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    status.textContent = "Structured response downloaded";
    status.classList.add("saved");
  }

  function clearForm() {
    if (!confirm("Clear every response in this playtest form and delete the locally saved draft?")) return;
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    setDefaultDate();
    status.textContent = "Form cleared";
    status.classList.remove("saved");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildReport(data) {
    const lines = [
      `# Gauntlet v0.6.0 Playtest Report`,
      "",
      `- **Session:** ${value(data.session_id)}`,
      `- **Date:** ${value(data.date)}`,
      `- **Facilitator:** ${value(data.facilitator)}`,
      `- **Test mode:** ${selectedModes(data)}`,
      `- **Teach / play / debrief:** ${value(data.teach_minutes)} / ${value(data.play_minutes)} / ${value(data.debrief_minutes)} minutes`,
      "",
      `## Matchup`,
      "",
      `- **Player A:** ${value(data.a_name)} — ${value(data.a_faction)} / ${value(data.a_leader)} — ${value(data.a_deck)}`,
      `- **A Territories:** ${value(data.a_territories)}`,
      `- **Player B:** ${value(data.b_name)} — ${value(data.b_faction)} / ${value(data.b_leader)} — ${value(data.b_deck)}`,
      `- **B Territories:** ${value(data.b_territories)}`,
      `- **First player:** ${value(data.first_player)}`,
      "",
      `## Outcome`,
      "",
      `- **Winner:** ${value(data.winner)}`,
      `- **Victory route:** ${value(data.victory_route)}`,
      `- **Ending:** ${value(data.ending_quality)}`,
      `- **Rounds / player-turns / battles:** ${value(data.rounds)} / ${value(data.player_turns)} / ${value(data.battle_count)}`,
      `- **When result became apparent:** ${value(data.inevitability_observation)}`,
      "",
      `## Primary test question`,
      "",
      value(data.primary_questions),
      "",
      `## Player ratings`,
      "",
      ratingSummary(data, "a", "Player A"),
      ratingSummary(data, "b", "Player B"),
      "",
      `## Player A feedback`,
      "",
      bullet("Strategy", data.a_strategy),
      bullet("Best moment", data.a_best_moment),
      bullet("Worst moment", data.a_worst_moment),
      bullet("Hardest decision", data.a_hardest_decision),
      bullet("Most valuable", data.a_most_valuable),
      bullet("Problem component", data.a_problem_component),
      bullet("Rules confusion", data.a_rules_confusion),
      bullet("One change", data.a_one_change),
      "",
      `## Player B feedback`,
      "",
      bullet("Strategy", data.b_strategy),
      bullet("Best moment", data.b_best_moment),
      bullet("Worst moment", data.b_worst_moment),
      bullet("Hardest decision", data.b_hardest_decision),
      bullet("Most valuable", data.b_most_valuable),
      bullet("Problem component", data.b_problem_component),
      bullet("Rules confusion", data.b_rules_confusion),
      bullet("One change", data.b_one_change),
      "",
      `## Joint debrief`,
      "",
      bullet("Worked best", data.joint_best_system),
      bullet("Did not work", data.joint_worst_system),
      bullet("Preserve", data.joint_preserve),
      bullet("Investigate first", data.joint_priority),
      bullet("Starter Deck coherence — A", data.a_starter_coherence),
      bullet("Starter Deck coherence — B", data.b_starter_coherence),
      bullet("Shared verdict", data.shared_verdict),
      bullet("Most important conclusion", data.single_conclusion),
      "",
      `## Specific issues`,
      "",
      ...issueSummary(data),
      "",
      `## Facilitator conclusion`,
      "",
      bullet("Evidence", data.evidence_summary),
      bullet("Alternative explanation", data.alternative_explanation),
      bullet("Next test", data.next_test),
      bullet("Priority", data.finding_priority),
      bullet("Confidence", data.finding_confidence),
      bullet("Summary", data.facilitator_summary),
    ];

    return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n").trim() + "\n";
  }

  function ratingSummary(data, player, title) {
    const values = RATING_QUESTIONS.map(([key, question]) => `${question} ${value(data[`${player}_rating_${key}`])}`);
    return `- **${title}:** ${values.join(" · ")}`;
  }

  function issueSummary(data) {
    const issues = [];
    for (let index = 1; index <= ISSUE_COUNT; index += 1) {
      const description = data[`issue_${index}_description`];
      const component = data[`issue_${index}_component`];
      if (!description && !component) continue;
      issues.push(`- **Issue ${index}:** ${value(component)} — ${value(description)} [${value(data[`issue_${index}_category`])}; ${value(data[`issue_${index}_severity`])}; repeatable: ${value(data[`issue_${index}_repeatable`])}]`);
    }
    return issues.length ? issues : ["- None recorded."];
  }

  function selectedModes(data) {
    const labels = [
      ["mode_first_game", "First game / onboarding"],
      ["mode_blind_rules", "Blind rulebook"],
      ["mode_repeated_matchup", "Repeated matchup"],
      ["mode_leader_comparison", "Leader comparison"],
      ["mode_custom_deck", "Custom Deck"],
      ["mode_component", "Component / print"],
      ["mode_variant", "Variant"],
    ].filter(([key]) => data[key]).map(([, label]) => label);
    return labels.length ? labels.join(", ") : "Not specified";
  }

  function bullet(label, text) {
    return `- **${label}:** ${value(text)}`;
  }

  function value(input) {
    const text = String(input ?? "").trim();
    return text || "Not recorded";
  }

  function slugify(input) {
    return String(input)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  function escapeHtml(input) {
    return String(input)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
