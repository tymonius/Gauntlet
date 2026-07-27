(() => {
  const TERRITORY_SOURCE = "../docs/Gauntlet_v0.6_Territory_Pool.md";
  const REQUIRED_TERRITORIES = 3;
  const MAX_ARENAS = 1;

  state.territoryPool = [];
  state.territories = [];
  state.territorySearch = "";
  state.territoryCategory = "all";
  state.selectedTerritoryId = null;
  state.pendingTerritories = null;

  const territoryElements = {};
  const baseRenderAll = renderAll;
  const baseValidateDeck = validateDeck;
  const baseValidateAndRender = validateAndRender;
  const baseCurrentDeckData = currentDeckData;
  const baseApplyDeckData = applyDeckData;

  document.addEventListener("DOMContentLoaded", installTerritoryIntegration);

  function installTerritoryIntegration() {
    for (const id of [
      "territoryMetricCount", "territorySearch", "territoryCategory", "territoryAvailableCount",
      "territoryList", "territoryPreview", "clearTerritoriesButton", "deckTerritories"
    ]) territoryElements[id] = document.getElementById(id);

    territoryElements.territorySearch?.addEventListener("input", () => {
      state.territorySearch = territoryElements.territorySearch.value.trim().toLowerCase();
      renderTerritoryPicker();
    });

    territoryElements.territoryCategory?.addEventListener("change", () => {
      state.territoryCategory = territoryElements.territoryCategory.value;
      renderTerritoryPicker();
    });

    territoryElements.clearTerritoriesButton?.addEventListener("click", () => {
      if (state.territories.length && !confirm("Remove all selected Territories?")) return;
      state.territories = [];
      state.selectedTerritoryId = null;
      renderAll();
    });

    loadTerritories();
  }

  async function loadTerritories() {
    try {
      const response = await fetch(TERRITORY_SOURCE, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${TERRITORY_SOURCE}: ${response.status}`);
      state.territoryPool = parseTerritoryPool(await response.text());

      if (state.pendingTerritories) {
        state.territories = resolveTerritoryIds(state.pendingTerritories);
        state.pendingTerritories = null;
      }

      if (!state.selectedTerritoryId && state.territoryPool.length) {
        state.selectedTerritoryId = state.territoryPool[0].id;
      }
      renderAll();
    } catch (error) {
      console.error(error);
      if (territoryElements.territoryList) {
        territoryElements.territoryList.className = "compact-territory-list empty-state";
        territoryElements.territoryList.textContent = "Unable to load the consolidated v0.6 Territory source.";
      }
    }
  }

  function parseTerritoryPool(markdown) {
    const source = markdown.replace(/\r/g, "");
    const headings = [...source.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)];

    return headings.map((match, index) => {
      const name = match[2].trim();
      const start = match.index + match[0].length;
      const end = index + 1 < headings.length ? headings[index + 1].index : source.length;
      const block = source.slice(start, end);
      const complexity = block.match(/\*\*Complexity:\*\*\s*([^\n]+)/i)?.[1].trim() || "Unspecified";
      const watchlist = block.match(/\*\*Watchlist:\*\*\s*([^\n]+)/i)?.[1].trim() || "None";
      const status = block.match(/\*\*Status:\*\*\s*([^\n]+)/i)?.[1].trim() || "Approved";
      const text = block.split("\n")
        .filter(line => line.trim().startsWith(">"))
        .map(line => cleanInlineMarkdown(line.trim().replace(/^>\s?/, "")))
        .filter(Boolean)
        .join("\n");

      return {
        id: `territory-${slugify(name)}`,
        name,
        arena: name.startsWith("Arena:"),
        complexity,
        watchlist,
        status,
        text,
        source: TERRITORY_SOURCE
      };
    });
  }

  function enhancedRenderAll() {
    baseRenderAll();
    renderTerritoryPicker();
    renderDeckTerritories();
    syncSourceStatus();
  }

  function syncSourceStatus() {
    if (!state.territoryPool.length || !el.dataStatus) return;
    el.dataStatus.textContent = `${state.cards.length} active cards + ${state.territoryPool.length} Territories loaded`;
  }

  function filteredTerritories() {
    return state.territoryPool
      .filter(territory => {
        if (state.territoryCategory === "standard" && territory.arena) return false;
        if (state.territoryCategory === "arena" && !territory.arena) return false;
        return true;
      })
      .filter(territory => {
        if (!state.territorySearch) return true;
        return `${territory.name} ${territory.complexity} ${territory.watchlist} ${territory.text}`
          .toLowerCase()
          .includes(state.territorySearch);
      });
  }

  function renderTerritoryPicker() {
    const list = territoryElements.territoryList;
    if (!list) return;

    if (!state.territoryPool.length) {
      list.className = "compact-territory-list empty-state";
      list.textContent = "Loading Territories…";
      renderTerritoryPreview(null);
      return;
    }

    const territories = filteredTerritories();
    territoryElements.territoryAvailableCount.textContent = territories.length;
    list.innerHTML = "";
    list.className = territories.length ? "compact-territory-list" : "compact-territory-list empty-state";

    if (!territories.length) {
      list.textContent = "No Territories match the current filters.";
      renderTerritoryPreview(null);
      return;
    }

    if (!territories.some(territory => territory.id === state.selectedTerritoryId)) {
      state.selectedTerritoryId = territories[0].id;
    }

    territories.forEach(territory => {
      const selected = state.territories.includes(territory.id);
      const arenaSelected = selectedTerritories().some(item => item.arena);
      const unavailable = !selected && (
        state.territories.length >= REQUIRED_TERRITORIES ||
        (territory.arena && arenaSelected)
      );

      const row = document.createElement("article");
      row.className = `compact-territory-row${territory.id === state.selectedTerritoryId ? " selected" : ""}${selected ? " chosen" : ""}`;
      row.innerHTML = `
        <div>
          <div class="compact-card-title"><strong>${escapeHtml(territory.name)}</strong></div>
          <div class="compact-card-meta">
            <span class="mini-pill">${territory.arena ? "Arena" : "Territory"}</span>
            <span class="mini-pill">${escapeHtml(territory.complexity)}</span>
            ${selected ? '<span class="mini-pill">Selected</span>' : ""}
          </div>
        </div>
        <button type="button" class="${selected ? "secondary danger" : ""}" ${unavailable ? "disabled" : ""}>${selected ? "Remove" : "Choose"}</button>
      `;

      row.addEventListener("click", event => {
        state.selectedTerritoryId = territory.id;
        if (event.target.tagName === "BUTTON") toggleTerritory(territory.id);
        else renderTerritoryPicker();
      });
      list.append(row);
    });

    renderTerritoryPreview(getTerritory(state.selectedTerritoryId));
  }

  function renderTerritoryPreview(territory) {
    const preview = territoryElements.territoryPreview;
    if (!preview) return;

    if (!territory) {
      preview.className = "territory-preview empty-state";
      preview.textContent = "Select a Territory to view its active working text.";
      return;
    }

    const selected = state.territories.includes(territory.id);
    const arenaSelected = selectedTerritories().some(item => item.arena);
    const unavailable = !selected && (
      state.territories.length >= REQUIRED_TERRITORIES ||
      (territory.arena && arenaSelected)
    );

    preview.className = "territory-preview";
    preview.innerHTML = `
      <h3>${escapeHtml(territory.name)}</h3>
      <div class="card-preview-meta">
        <span class="mini-pill">${territory.arena ? "Arena" : "Territory"}</span>
        <span class="mini-pill">${escapeHtml(territory.complexity)}</span>
        ${territory.status !== "Approved" ? `<span class="mini-pill">${escapeHtml(territory.status)}</span>` : ""}
      </div>
      <section class="card-text-section">
        <div class="card-text-label">Effect</div>
        <p>${escapeHtml(territory.text)}</p>
      </section>
      ${territory.watchlist !== "None" ? `<section class="territory-watchlist"><strong>Playtest watchlist:</strong> ${escapeHtml(territory.watchlist)}</section>` : ""}
      <div class="button-row"><button id="previewTerritoryButton" type="button" class="${selected ? "secondary danger" : ""}" ${unavailable ? "disabled" : ""}>${selected ? "Remove Territory" : "Choose Territory"}</button></div>
    `;
    document.getElementById("previewTerritoryButton")?.addEventListener("click", () => toggleTerritory(territory.id));
  }

  function toggleTerritory(id) {
    const territory = getTerritory(id);
    if (!territory) return;

    if (state.territories.includes(id)) {
      state.territories = state.territories.filter(item => item !== id);
    } else {
      if (state.territories.length >= REQUIRED_TERRITORIES) return;
      if (territory.arena && selectedTerritories().some(item => item.arena)) return;
      state.territories = [...state.territories, id];
    }

    state.selectedTerritoryId = id;
    renderAll();
  }

  function renderDeckTerritories() {
    const container = territoryElements.deckTerritories;
    if (!container) return;

    const territories = selectedTerritories();
    if (!territories.length) {
      container.className = "deck-list empty-state";
      container.textContent = "No Territories selected yet.";
      return;
    }

    container.className = "deck-list";
    container.innerHTML = "";
    territories.forEach(territory => {
      const row = document.createElement("article");
      row.className = "deck-row deck-territory-row";
      row.innerHTML = `
        <div>
          <div class="deck-title"><strong>${escapeHtml(territory.name)}</strong><span class="mini-pill">${territory.arena ? "Arena" : "Territory"}</span></div>
          <div class="deck-stats"><span class="mini-pill">${escapeHtml(territory.complexity)}</span></div>
        </div>
        <div class="deck-actions"><button type="button" class="secondary danger" aria-label="Remove ${escapeHtml(territory.name)}">×</button></div>
      `;
      row.querySelector("button").addEventListener("click", () => toggleTerritory(territory.id));
      container.append(row);
    });
  }

  function enhancedValidateDeck() {
    const result = baseValidateDeck();
    const territories = selectedTerritories();
    const arenaCount = territories.filter(territory => territory.arena).length;
    const errors = [...result.errors];
    const warnings = result.warnings.filter(message => !message.startsWith("Territory selection"));

    if (territories.length !== REQUIRED_TERRITORIES) {
      errors.push(`Choose exactly ${REQUIRED_TERRITORIES} different Territories (${territories.length}/${REQUIRED_TERRITORIES} selected).`);
    }
    if (arenaCount > MAX_ARENAS) errors.push(`Choose no more than ${MAX_ARENAS} Arena.`);

    return {
      ...result,
      territoryCount: territories.length,
      arenaCount,
      errors,
      warnings,
      valid: errors.length === 0
    };
  }

  function enhancedValidateAndRender() {
    baseValidateAndRender();
    const result = enhancedValidateDeck();
    if (territoryElements.territoryMetricCount) territoryElements.territoryMetricCount.textContent = result.territoryCount;
    el.validityText.textContent = result.valid ? "Valid" : "Incomplete";
  }

  function enhancedCurrentDeckData() {
    return {
      ...baseCurrentDeckData(),
      schemaVersion: 2,
      territories: selectedTerritories().map(territory => ({ id: territory.id, name: territory.name, arena: territory.arena }))
    };
  }

  function enhancedApplyDeckData(data) {
    state.territories = [];
    baseApplyDeckData(data);

    if (state.territoryPool.length) state.territories = resolveTerritoryIds(data.territories || []);
    else state.pendingTerritories = data.territories || [];

    renderAll();
  }

  async function enhancedCopyDeckList() {
    const data = enhancedCurrentDeckData();
    const faction = getFaction();
    const leader = faction.leaders.find(item => item.id === state.leaderId);
    const validation = enhancedValidateDeck();
    const lines = [
      data.name,
      `${faction.name} — ${leader?.name || "No leader"}`,
      `${validation.cardCount} cards · ${validation.pointTotal}/60 value · ${validation.territoryCount}/3 Territories`,
      "",
      ...deckEntries().map(({ card, qty }) => `${qty}x ${card.name} (${card.cost}) [${card.factionLabel}]`),
      "",
      "Territories:",
      ...selectedTerritories().map(territory => `- ${territory.name}`)
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
  }

  function resolveTerritoryIds(items) {
    const ids = [];
    for (const item of items || []) {
      const id = typeof item === "string" ? item : item.id;
      const name = typeof item === "string" ? item : item.name;
      const territory = getTerritory(id) || state.territoryPool.find(candidate => candidate.name === name);
      if (!territory || ids.includes(territory.id)) continue;
      if (territory.arena && ids.map(getTerritory).filter(Boolean).some(candidate => candidate.arena)) continue;
      if (ids.length >= REQUIRED_TERRITORIES) break;
      ids.push(territory.id);
    }
    return ids;
  }

  function selectedTerritories() {
    return state.territories.map(getTerritory).filter(Boolean);
  }

  function getTerritory(id) {
    return state.territoryPool.find(territory => territory.id === id);
  }

  renderAll = enhancedRenderAll;
  validateDeck = enhancedValidateDeck;
  validateAndRender = enhancedValidateAndRender;
  currentDeckData = enhancedCurrentDeckData;
  applyDeckData = enhancedApplyDeckData;
  copyDeckList = enhancedCopyDeckList;
})();
