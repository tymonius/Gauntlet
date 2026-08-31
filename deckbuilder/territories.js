(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;
  const escapeHtml = value => deckbuilder.escapeHtml(value);

  const constructionRules = () => deckbuilder.constructionRules();
  const TERRITORY_WIDTH = 336;
  const TERRITORY_HEIGHT = 240;
  const MAX_TERRITORY_PREVIEW_WIDTH = 360;

  state.territoryPool = [];
  state.territories = [];
  state.territorySearch = "";
  state.territoryCategory = "all";
  state.selectedTerritoryId = null;
  state.pendingTerritories = null;

  const territoryElements = {};
  let territoryPreviewResizeObserver = null;

  deckbuilder.registerRenderHook(renderTerritoryIntegration);
  deckbuilder.registerValidationHook(extendValidation);
  deckbuilder.registerSerializeHook(serializeTerritories);
  deckbuilder.registerHydrateHook(hydrateTerritories);
  deckbuilder.registerDeckListHook(territoryDeckListLines);
  deckbuilder.registerFeature("territories", {
    selectedIds: () => [...state.territories],
    selected: () => selectedTerritories(),
    isReady: () => state.territoryPool.length > 0,
    setSelectedIds(items) {
      state.territories = resolveTerritoryIds(items || []);
      state.pendingTerritories = null;
      state.selectedTerritoryId = state.territories[0] || state.territoryPool[0]?.id || null;
      return [...state.territories];
    },
  });

  document.addEventListener("DOMContentLoaded", installTerritoryIntegration);

  function installTerritoryIntegration() {
    for (const id of [
      "territoryMetricCount", "territoryRequiredCount", "territorySearch", "territoryCategory", "territoryAvailableCount",
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
      deckbuilder.render();
    });

    loadTerritories();
  }

  async function loadTerritories() {
    try {
      const currentGame = await deckbuilder.bootstrap();
      state.territoryPool = (currentGame.territories || []).map(territory => ({
        id: territory.id,
        name: territory.name,
        arena: Boolean(territory.arena),
        watchlist: territory.watchlist || "None",
        status: territory.status || "Approved",
        text: String(territory.text || territory.effects?.map(effect => effect.text).filter(Boolean).join("\n") || ""),
        source: currentGame.authorityUrl
      }));

      if (state.pendingTerritories) {
        state.territories = resolveTerritoryIds(state.pendingTerritories);
        state.pendingTerritories = null;
      }

      if (!state.selectedTerritoryId && state.territoryPool.length) {
        state.selectedTerritoryId = state.territoryPool[0].id;
      }
      deckbuilder.render();
    } catch (error) {
      console.error(error);
      if (territoryElements.territoryList) {
        territoryElements.territoryList.className = "compact-territory-list empty-state";
        territoryElements.territoryList.textContent = "Unable to load Territories from the current-game authority.";
      }
    }
  }

  function renderTerritoryIntegration() {
    renderTerritoryPicker();
    renderDeckTerritories();
    syncSourceStatus();
    if (territoryElements.territoryMetricCount) {
      territoryElements.territoryMetricCount.textContent = String(selectedTerritories().length);
    }
    if (territoryElements.territoryRequiredCount) {
      territoryElements.territoryRequiredCount.textContent = String(constructionRules().territoriesPerPlayer);
    }
  }

  function syncSourceStatus() {
    const dataStatus = document.getElementById("dataStatus");
    if (!state.territoryPool.length || !dataStatus) return;
    dataStatus.textContent = `${state.currentGameDisplayVersion || "Current game"} · ${state.cards.length} active cards + ${state.territoryPool.length} Territories loaded`;
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
        return `${territory.name} ${territory.watchlist} ${territory.text}`
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

    const rules = constructionRules();
    const selectedArenaCount = selectedTerritories().filter(item => item.arena).length;
    territories.forEach(territory => {
      const selected = state.territories.includes(territory.id);
      const unavailable = !selected && (
        state.territories.length >= rules.territoriesPerPlayer ||
        (territory.arena && selectedArenaCount >= rules.maximumArenas)
      );

      const row = document.createElement("article");
      row.className = `compact-territory-row${territory.id === state.selectedTerritoryId ? " selected" : ""}${selected ? " chosen" : ""}`;
      row.innerHTML = `
        <div>
          <div class="compact-card-title"><strong>${escapeHtml(territory.name)}</strong></div>
          <div class="compact-card-meta">
            <span class="mini-pill">${territory.arena ? "Arena" : "Territory"}</span>
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

    territoryPreviewResizeObserver?.disconnect();
    territoryPreviewResizeObserver = null;

    if (!territory) {
      preview.className = "territory-preview empty-state";
      preview.textContent = "Select a Territory to view its complete rendered card.";
      return;
    }

    const selected = state.territories.includes(territory.id);
    const rules = constructionRules();
    const selectedArenaCount = selectedTerritories().filter(item => item.arena).length;
    const unavailable = !selected && (
      state.territories.length >= rules.territoriesPerPlayer ||
      (territory.arena && selectedArenaCount >= rules.maximumArenas)
    );
    const rulesetMode = new URLSearchParams(window.location.search).get("rules") === "candidate" ? "candidate" : "released";
    const rendererUrl = `../card-design/territory-review-render.html?territory=${encodeURIComponent(territory.id)}&rules=${encodeURIComponent(rulesetMode)}`;

    preview.className = "territory-preview rendered-territory-preview";
    preview.innerHTML = `
      <div class="deckbuilder-territory-render-stage" data-territory-render-stage>
        <iframe
          class="deckbuilder-territory-render-frame"
          src="${escapeHtml(rendererUrl)}"
          title="${escapeHtml(territory.name)} complete rendered Territory card"
          loading="eager"
          scrolling="no"
        ></iframe>
      </div>
      ${territory.watchlist !== "None" ? `<section class="territory-watchlist rendered-territory-watchlist"><strong>Playtest watchlist:</strong> ${escapeHtml(territory.watchlist)}</section>` : ""}
      <div class="button-row rendered-territory-preview-actions"><button id="previewTerritoryButton" type="button" class="${selected ? "secondary danger" : ""}" ${unavailable ? "disabled" : ""}>${selected ? "Remove Territory" : "Choose Territory"}</button></div>
    `;
    document.getElementById("previewTerritoryButton")?.addEventListener("click", () => toggleTerritory(territory.id));
    installTerritoryPreviewScaling();
  }

  function installTerritoryPreviewScaling() {
    const stage = territoryElements.territoryPreview?.querySelector("[data-territory-render-stage]");
    if (!stage) return;

    const resize = () => scaleTerritoryPreview(stage);
    if ("ResizeObserver" in window) {
      territoryPreviewResizeObserver = new ResizeObserver(resize);
      territoryPreviewResizeObserver.observe(stage);
    }
    requestAnimationFrame(resize);
  }

  function scaleTerritoryPreview(stage) {
    const frame = stage.querySelector(".deckbuilder-territory-render-frame");
    if (!frame) return;

    const availableWidth = Math.max(0, stage.clientWidth);
    const targetWidth = Math.min(MAX_TERRITORY_PREVIEW_WIDTH, availableWidth || TERRITORY_WIDTH);
    const scale = targetWidth / TERRITORY_WIDTH;

    stage.style.height = `${TERRITORY_HEIGHT * scale}px`;
    frame.style.transform = `translateX(-50%) scale(${scale})`;
  }

  function toggleTerritory(id) {
    const territory = getTerritory(id);
    if (!territory) return;

    if (state.territories.includes(id)) {
      state.territories = state.territories.filter(item => item !== id);
    } else {
      const rules = constructionRules();
      if (state.territories.length >= rules.territoriesPerPlayer) return;
      if (territory.arena && selectedTerritories().filter(item => item.arena).length >= rules.maximumArenas) return;
      state.territories = [...state.territories, id];
    }

    state.selectedTerritoryId = id;
    deckbuilder.render();
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
        </div>
        <div class="deck-actions"><button type="button" class="secondary danger" aria-label="Remove ${escapeHtml(territory.name)}">×</button></div>
      `;
      row.querySelector("button").addEventListener("click", () => toggleTerritory(territory.id));
      container.append(row);
    });
  }

  function extendValidation(result) {
    const territories = selectedTerritories();
    const arenaCount = territories.filter(territory => territory.arena).length;
    const errors = [...result.errors];
    const warnings = [...result.warnings];

    const rules = constructionRules();
    if (territories.length !== rules.territoriesPerPlayer) {
      errors.push(`Choose exactly ${rules.territoriesPerPlayer} different Territories (${territories.length}/${rules.territoriesPerPlayer} selected).`);
    }
    if (arenaCount > rules.maximumArenas) {
      errors.push(`Choose no more than ${rules.maximumArenas} Arena${rules.maximumArenas === 1 ? "" : "s"}.`);
    }

    return {
      ...result,
      territoryCount: territories.length,
      arenaCount,
      errors,
      warnings,
      valid: errors.length === 0
    };
  }

  function territoryDeckListLines() {
    const names = selectedTerritories().map(territory => territory.name);
    return ["", `Territories: ${names.join(", ") || "None"}`];
  }

  function serializeTerritories(data) {
    return {
      ...data,
      territories: selectedTerritories().map(territory => ({ id: territory.id, name: territory.name, arena: territory.arena }))
    };
  }

  function hydrateTerritories(data) {
    state.territories = [];
    if (state.territoryPool.length) state.territories = resolveTerritoryIds(data.territories || []);
    else state.pendingTerritories = data.territories || [];
  }

  function resolveTerritoryIds(items) {
    const ids = [];
    const rules = constructionRules();
    for (const item of items || []) {
      const id = typeof item === "string" ? item : item.id;
      const name = typeof item === "string" ? item : item.name;
      const territory = getTerritory(id) || state.territoryPool.find(candidate => candidate.name === name);
      if (!territory || ids.includes(territory.id)) continue;
      if (territory.arena && ids.map(getTerritory).filter(Boolean).filter(candidate => candidate.arena).length >= rules.maximumArenas) continue;
      if (ids.length >= rules.territoriesPerPlayer) break;
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

})();