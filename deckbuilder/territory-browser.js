(() => {
  let territoryShellReady = false;
  let territoryPreviewElement = null;

  function installTerritoryBrowserShell() {
    if (territoryShellReady) return;
    const list = document.getElementById("territoryList");
    if (!list || list.closest(".territory-browser")) {
      territoryShellReady = true;
      territoryPreviewElement = document.getElementById("territoryPreview");
      return;
    }

    const browser = document.createElement("div");
    browser.className = "territory-browser";
    list.parentNode.insertBefore(browser, list);
    browser.append(list);

    territoryPreviewElement = document.createElement("aside");
    territoryPreviewElement.id = "territoryPreview";
    territoryPreviewElement.className = "territory-preview empty";
    territoryPreviewElement.textContent = "Select a Territory to view its full text.";
    browser.append(territoryPreviewElement);

    territoryShellReady = true;
  }

  function renderCompactTerritories() {
    installTerritoryBrowserShell();

    const rules = getRules();
    const arenaCount = getSelectedArenaCount();
    el.territoryList.innerHTML = "";
    el.territoryList.className = "territory-grid compact-territory-list";

    if (!state.data.territories.length) {
      el.territoryList.className = "territory-grid compact-territory-list empty-state";
      el.territoryList.textContent = "No Territories are available for this version.";
      renderTerritoryPreview(null);
      return;
    }

    if (!state.selectedTerritory || !state.data.territoryByName[state.selectedTerritory]) {
      state.selectedTerritory = state.territories[0] || state.data.territories[0].name;
    }

    for (const territory of state.data.territories) {
      const selected = state.territories.includes(territory.name);
      const wouldExceedTerritoryLimit = !selected && state.territories.length >= rules.territories;
      const wouldExceedArenaLimit = !selected && territory.arena && arenaCount >= rules.maximum_arenas;
      el.territoryList.append(compactTerritoryRow(territory, selected, wouldExceedTerritoryLimit || wouldExceedArenaLimit));
    }

    renderTerritoryPreview(state.data.territoryByName[state.selectedTerritory] || state.data.territories[0]);
  }

  function compactTerritoryRow(territory, selected, disabled) {
    const row = document.createElement("article");
    row.className = `territory-row compact-territory-row${selected ? " selected" : ""}${disabled ? " disabled" : ""}`;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-pressed", state.selectedTerritory === territory.name ? "true" : "false");

    const title = document.createElement("div");
    title.className = "territory-title-line";
    title.innerHTML = `<strong>${escapeHtml(territory.name)}</strong>`;

    const meta = document.createElement("div");
    meta.className = "compact-territory-meta";
    meta.innerHTML = `<span class="mini-pill">Territory</span>${territory.arena ? '<span class="arena-pill">Arena</span>' : ""}${selected ? '<span class="mini-pill">Selected</span>' : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected;
    checkbox.disabled = disabled;
    checkbox.setAttribute("aria-label", `${selected ? "Remove" : "Choose"} ${territory.name}`);
    checkbox.addEventListener("click", event => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      state.selectedTerritory = territory.name;
      toggleTerritory(territory.name);
    });

    const hiddenText = document.createElement("p");
    hiddenText.className = "card-text";
    hiddenText.textContent = territory.text || "";

    row.addEventListener("click", () => selectTerritoryPreview(territory.name));
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTerritoryPreview(territory.name);
      }
    });

    row.append(title, meta, checkbox, hiddenText);
    return row;
  }

  function selectTerritoryPreview(name) {
    state.selectedTerritory = name;
    renderCompactTerritories();
  }

  function renderTerritoryPreview(territory) {
    if (!territoryPreviewElement) return;

    if (!territory) {
      territoryPreviewElement.className = "territory-preview empty";
      territoryPreviewElement.textContent = "Select a Territory to view its full text.";
      return;
    }

    const selected = state.territories.includes(territory.name);
    const rules = getRules();
    const arenaCount = getSelectedArenaCount();
    const disabled = !selected && (state.territories.length >= rules.territories || (territory.arena && arenaCount >= rules.maximum_arenas));

    territoryPreviewElement.className = "territory-preview";
    territoryPreviewElement.innerHTML = `
      <div class="territory-preview-header">
        <div>
          <h3>${escapeHtml(territory.name)}</h3>
          <div class="territory-preview-meta">
            <span class="mini-pill">Territory</span>
            ${territory.arena ? '<span class="arena-pill">Arena</span>' : ""}
            ${selected ? '<span class="mini-pill">Selected</span>' : ""}
          </div>
        </div>
      </div>
      <div class="territory-preview-section">
        <div class="territory-preview-label">Effect</div>
        <p class="territory-preview-text">${escapeHtml(territory.text || "—")}</p>
      </div>
      <div class="territory-preview-actions">
        <button id="previewToggleTerritoryButton" type="button" class="${selected ? "danger secondary" : ""}" ${disabled ? "disabled" : ""}>${selected ? "Remove Territory" : "Choose Territory"}</button>
      </div>
    `;

    territoryPreviewElement.querySelector("#previewToggleTerritoryButton")?.addEventListener("click", () => {
      state.selectedTerritory = territory.name;
      toggleTerritory(territory.name);
    });
  }

  window.renderTerritories = renderCompactTerritories;
  try {
    renderTerritories = renderCompactTerritories;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();
