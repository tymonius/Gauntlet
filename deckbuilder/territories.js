(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const escapeHtml = value => deckbuilder.escapeHtml(value);

  const constructionRules = () => deckbuilder.constructionRules();
  const currentGameLabel = () => deckbuilder.currentGame()?.displayVersion || "Current game";
  const cardCatalog = () => deckbuilder.cardCatalog();

  const territoryState = {
    pool: [],
    selectedIds: [],
    search: "",
    category: "all",
    selectedId: null,
    pending: null,
  };
  let TERRITORY_WIDTH = 0;
  let TERRITORY_HEIGHT = 0;
  const territorySurfaceReady = import('../card-design/production-surface.mjs').then(({ PRODUCTION_SURFACES }) => {
    TERRITORY_WIDTH = PRODUCTION_SURFACES.landscape.widthCssPx;
    TERRITORY_HEIGHT = PRODUCTION_SURFACES.landscape.heightCssPx;
  });
  const MAX_TERRITORY_PREVIEW_WIDTH = 360;

  const territoryElements = {};
  let territoryPreviewResizeObserver = null;

  deckbuilder.registerRenderHook(renderTerritoryIntegration);
  deckbuilder.registerValidationHook(extendValidation);
  deckbuilder.registerSerializeHook(serializeTerritories);
  deckbuilder.registerHydrateHook(hydrateTerritories);
  deckbuilder.registerDeckListHook(territoryDeckListLines);
  deckbuilder.registerFeature("territories", {
    selectedIds: () => [...territoryState.selectedIds],
    selected: () => selectedTerritories(),
    isReady: () => territoryState.pool.length > 0,
    setSelectedIds(items) {
      territoryState.selectedIds = resolveTerritoryIds(items || []);
      territoryState.pending = null;
      territoryState.selectedId = territoryState.selectedIds[0] || territoryState.pool[0]?.id || null;
      return [...territoryState.selectedIds];
    },
  });

  document.addEventListener("DOMContentLoaded", installTerritoryIntegration);

  async function installTerritoryIntegration() {
    await territorySurfaceReady;
    for (const id of [
      "territoryMetricCount", "territoryRequiredCount", "territorySearch", "territoryCategory", "territoryAvailableCount",
      "territoryList", "territoryPreview", "clearTerritoriesButton", "deckTerritories"
    ]) territoryElements[id] = document.getElementById(id);

    territoryElements.territorySearch?.addEventListener("input", () => {
      territoryState.search = territoryElements.territorySearch.value.trim().toLowerCase();
      renderTerritoryPicker();
    });

    territoryElements.territoryCategory?.addEventListener("change", () => {
      territoryState.category = territoryElements.territoryCategory.value;
      renderTerritoryPicker();
    });

    territoryElements.clearTerritoriesButton?.addEventListener("click", () => {
      if (territoryState.selectedIds.length && !confirm("Remove all selected Territories?")) return;
      territoryState.selectedIds = [];
      territoryState.selectedId = null;
      deckbuilder.render();
    });

    loadTerritories();
  }

  async function loadTerritories() {
    try {
      const currentGame = await deckbuilder.bootstrap();
      territoryState.pool = (currentGame.territories || []).map(territory => ({
        id: territory.id,
        name: territory.name,
        arena: Boolean(territory.arena),
        watchlist: territory.watchlist || "None",
        status: territory.status || "Approved",
        text: String(territory.text || territory.effects?.map(effect => effect.text).filter(Boolean).join("\n") || ""),
        source: currentGame.authorityUrl
      }));

      if (territoryState.pending) {
        territoryState.selectedIds = resolveTerritoryIds(territoryState.pending);
        territoryState.pending = null;
      }

      if (!territoryState.selectedId && territoryState.pool.length) {
        territoryState.selectedId = territoryState.pool[0].id;
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
    if (!territoryState.pool.length || !dataStatus) return;
    dataStatus.textContent = `${currentGameLabel()} · ${cardCatalog().length} active cards + ${territoryState.pool.length} Territories loaded`;
  }

  function filteredTerritories() {
    return territoryState.pool
      .filter(territory => {
        if (territoryState.category === "standard" && territory.arena) return false;
        if (territoryState.category === "arena" && !territory.arena) return false;
        return true;
      })
      .filter(territory => {
        if (!territoryState.search) return true;
        return `${territory.name} ${territory.watchlist} ${territory.text}`
          .toLowerCase()
          .includes(territoryState.search);
      });
  }

  function renderTerritoryPicker() {
    const list = territoryElements.territoryList;
    if (!list) return;

    if (!territoryState.pool.length) {
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

    if (!territories.some(territory => territory.id === territoryState.selectedId)) {
      territoryState.selectedId = territories[0].id;
    }

    const rules = constructionRules();
    const selectedArenaCount = selectedTerritories().filter(item => item.arena).length;
    territories.forEach(territory => {
      const selected = territoryState.selectedIds.includes(territory.id);
      const unavailable = !selected && (
        territoryState.selectedIds.length >= rules.territoriesPerPlayer ||
        (territory.arena && selectedArenaCount >= rules.maximumArenas)
      );

      const row = document.createElement("article");
      row.className = `compact-territory-row${territory.id === territoryState.selectedId ? " selected" : ""}${selected ? " chosen" : ""}`;
      row.innerHTML = `
        <button
          type="button"
          class="compact-row-preview-button"
          data-action="preview"
          aria-label="Preview ${escapeHtml(territory.name)}"
          ${territory.id === territoryState.selectedId ? 'aria-current="true"' : ""}
        >
          <span class="compact-card-title"><strong>${escapeHtml(territory.name)}</strong></span>
          <span class="compact-card-meta">
            <span class="mini-pill">${territory.arena ? "Arena" : "Territory"}</span>
            ${selected ? '<span class="mini-pill">Selected</span>' : ""}
          </span>
        </button>
        <button type="button" data-action="toggle" class="${selected ? "secondary danger" : ""}" aria-label="${selected ? "Remove" : "Choose"} ${escapeHtml(territory.name)}" ${unavailable ? "disabled" : ""}>${selected ? "Remove" : "Choose"}</button>
      `;

      row.querySelector('[data-action="preview"]').addEventListener("click", () => {
        territoryState.selectedId = territory.id;
        renderTerritoryPicker();
      });
      row.querySelector('[data-action="toggle"]').addEventListener("click", () => {
        territoryState.selectedId = territory.id;
        toggleTerritory(territory.id);
      });
      list.append(row);
    });

    renderTerritoryPreview(getTerritory(territoryState.selectedId));
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

    const selected = territoryState.selectedIds.includes(territory.id);
    const rules = constructionRules();
    const selectedArenaCount = selectedTerritories().filter(item => item.arena).length;
    const unavailable = !selected && (
      territoryState.selectedIds.length >= rules.territoriesPerPlayer ||
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

    if (territoryState.selectedIds.includes(id)) {
      territoryState.selectedIds = territoryState.selectedIds.filter(item => item !== id);
    } else {
      const rules = constructionRules();
      if (territoryState.selectedIds.length >= rules.territoriesPerPlayer) return;
      if (territory.arena && selectedTerritories().filter(item => item.arena).length >= rules.maximumArenas) return;
      territoryState.selectedIds = [...territoryState.selectedIds, id];
    }

    territoryState.selectedId = id;
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
    territoryState.selectedIds = [];
    if (territoryState.pool.length) territoryState.selectedIds = resolveTerritoryIds(data.territories || []);
    else territoryState.pending = data.territories || [];
  }

  function resolveTerritoryIds(items) {
    const entries = items || [];
    if (!entries.length) return [];
    const ids = [];
    const rules = constructionRules();
    for (const item of entries) {
      const id = typeof item === "string" ? item : item.id;
      const name = typeof item === "string" ? item : item.name;
      const territory = getTerritory(id) || territoryState.pool.find(candidate => candidate.name === name);
      if (!territory || ids.includes(territory.id)) continue;
      if (territory.arena && ids.map(getTerritory).filter(Boolean).filter(candidate => candidate.arena).length >= rules.maximumArenas) continue;
      if (ids.length >= rules.territoriesPerPlayer) break;
      ids.push(territory.id);
    }
    return ids;
  }

  function selectedTerritories() {
    return territoryState.selectedIds.map(getTerritory).filter(Boolean);
  }

  function getTerritory(id) {
    return territoryState.pool.find(territory => territory.id === id);
  }

})();