(() => {
  const originalFetch = window.fetch.bind(window);

  injectAdditionalContextFields();
  window.fetch = submitCompleteStandaloneContext;

  function injectAdditionalContextFields() {
    const roundsField = document.getElementById("rounds")?.closest("label");
    const productionField = document.getElementById("productionIssue")?.closest("label");
    if (!roundsField || !productionField || document.getElementById("firstPlayerPerspective")) return;

    const grid = document.createElement("div");
    grid.className = "three-field-grid";
    grid.innerHTML = `
      <label class="field">
        <span class="field-label-row"><span class="field-label">Who went first?</span></span>
        <select id="firstPlayerPerspective">
          <option value="unknown">Not sure / other</option>
          <option value="self">I went first</option>
          <option value="opponent">Opponent went first</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label-row"><span class="field-label">Battles</span><span class="optional">Optional</span></span>
        <input id="battles" type="number" min="0" max="200" inputmode="numeric" />
      </label>
      <label id="victoryRouteField" class="field">
        <span class="field-label-row"><span class="field-label">How did the game end?</span></span>
        <select id="victoryRoute">
          <option value="unknown">Not sure / other</option>
          <option value="run_the_gauntlet">Ran the Gauntlet</option>
          <option value="faction_victory">Faction victory</option>
          <option value="concession">Concession</option>
          <option value="other">Other</option>
        </select>
      </label>`;

    const stopReason = document.createElement("label");
    stopReason.id = "stopReasonField";
    stopReason.className = "field";
    stopReason.hidden = true;
    stopReason.innerHTML = `
      <span class="field-label-row"><span class="field-label">Why did the game stop?</span><span class="optional">Optional</span></span>
      <input id="stopReason" type="text" maxlength="300" />`;

    productionField.before(grid);
    productionField.before(stopReason);

    const completion = document.getElementById("completionStatus");
    completion?.addEventListener("change", updateConditionalFields);
    updateConditionalFields();
  }

  function updateConditionalFields() {
    const completion = document.getElementById("completionStatus")?.value;
    const victoryRouteField = document.getElementById("victoryRouteField");
    const stopReasonField = document.getElementById("stopReasonField");
    if (victoryRouteField) victoryRouteField.hidden = completion !== "completed";
    if (stopReasonField) stopReasonField.hidden = completion !== "stopped";
  }

  async function submitCompleteStandaloneContext(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init?.method || input?.method || "GET").toUpperCase();
    if (!url.includes("/api/standalone-feedback") || method !== "POST" || typeof init?.body !== "string") {
      return originalFetch(input, init);
    }

    let payload;
    try {
      payload = JSON.parse(init.body);
    } catch {
      return originalFetch(input, init);
    }

    payload.context = payload.context && typeof payload.context === "object" ? payload.context : {};
    payload.context.firstPlayerPerspective = document.getElementById("firstPlayerPerspective")?.value || "unknown";
    payload.context.battles = document.getElementById("battles")?.value || "";
    payload.context.victoryRoute = document.getElementById("victoryRouteField")?.hidden
      ? ""
      : document.getElementById("victoryRoute")?.value || "unknown";
    payload.context.stopReason = document.getElementById("stopReasonField")?.hidden
      ? ""
      : document.getElementById("stopReason")?.value.trim() || "";

    return originalFetch(input, { ...init, body: JSON.stringify(payload) });
  }
})();
