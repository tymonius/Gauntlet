(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;
  const escapeHtml = value => deckbuilder.escapeHtml(value);

  const MYSTICS_FACTION_ID = "mystics";
  const FALLBACK_SELECTED_COUNT = 3;
  const CARD_WIDTH = 240;
  const CARD_HEIGHT = 336;
  const MAX_PREVIEW_WIDTH = 300;

  state.ritePool = [];
  state.rites = [];
  state.selectedRiteId = null;
  state.pendingRites = null;
  state.riteSelectedCount = FALLBACK_SELECTED_COUNT;
  state.riteSelectionEnabled = false;

  const riteElements = {};
  let ritePreviewResizeObserver = null;

  deckbuilder.registerRenderHook(renderRiteIntegration);
  deckbuilder.registerValidationHook(extendValidation);
  deckbuilder.registerSerializeHook(serializeRites);
  deckbuilder.registerHydrateHook(hydrateRites);
  deckbuilder.registerFactionChangeHook(resetRitesForFaction);

  deckbuilder.registerFeature("mysticsRites", {
    selectedIds: () => [...state.rites],
    selectedRites: () => selectedRites(),
    requiredCount: () => state.riteSelectedCount,
    selectionEnabled: () => state.riteSelectionEnabled,
    defaultIds: () => state.ritePool.map(rite => rite.id),
  });

  document.addEventListener("DOMContentLoaded", installRiteIntegration);

  function installRiteIntegration() {
    for (const id of [
      "mysticsRitesPanel", "riteSelectedCount", "clearRitesButton", "riteList", "ritePreview",
      "riteMetricCard", "riteMetricCount", "deckRitesSection", "deckRites"
    ]) riteElements[id] = document.getElementById(id);

    riteElements.clearRitesButton?.addEventListener("click", () => {
      if (state.rites.length && !confirm("Remove all selected Rites?")) return;
      state.rites = [];
      state.selectedRiteId = state.ritePool[0]?.id || null;
      deckbuilder.render();
    });

    void loadRites();
  }

  async function loadRites() {
    try {
      const currentGame = await deckbuilder.bootstrap();
      const rites = currentGame.mystics?.rites;
      const policy = currentGame.mystics?.selectionPolicy;
      const selectedCount = Number(policy?.selectedCount);

      if (!Array.isArray(rites) || !rites.length) {
        throw new Error("Selected ruleset exposes no Mystics Rite pool.");
      }
      if (policy && (!Number.isInteger(selectedCount) || selectedCount <= 0 || selectedCount > rites.length)) {
        throw new Error("Selected ruleset has an invalid Mystics Rite selection count.");
      }

      state.ritePool = rites.map(rite => ({
        id: String(rite.id),
        name: String(rite.name),
        begin: String(rite.begin || ""),
        complete: String(rite.complete || ""),
        interrupted: String(rite.interrupted || ""),
        reminder: rite.reminder?.text ? String(rite.reminder.text) : "",
      }));
      state.riteSelectionEnabled = Boolean(policy);
      state.riteSelectedCount = state.riteSelectionEnabled ? selectedCount : rites.length;

      if (!state.riteSelectionEnabled) {
        state.rites = isMystics() ? state.ritePool.map(rite => rite.id) : [];
        state.pendingRites = null;
      } else if (state.pendingRites) {
        state.rites = resolveRiteIds(state.pendingRites);
        state.pendingRites = null;
      } else {
        state.rites = resolveRiteIds(state.rites);
      }

      if (!state.selectedRiteId || !getRite(state.selectedRiteId)) {
        state.selectedRiteId = state.ritePool[0]?.id || null;
      }

      document.body.dataset.mysticsRites = "ready";
      deckbuilder.render();
    } catch (error) {
      console.error("Unable to load Mystics Rites", error);
      document.body.dataset.mysticsRites = "error";
      if (riteElements.riteList) {
        riteElements.riteList.className = "compact-rite-list empty-state";
        riteElements.riteList.textContent = "Unable to load Rites from the current-game authority.";
      }
    }
  }

  function renderRiteIntegration() {
    renderRitePicker();
    renderDeckRites();
    syncRiteMetric();
  }

  function isMystics() {
    return state.factionId === MYSTICS_FACTION_ID;
  }

  function syncRiteMetric() {
    const mystics = isMystics();
    const selectable = mystics && state.riteSelectionEnabled;
    if (riteElements.mysticsRitesPanel) riteElements.mysticsRitesPanel.hidden = !selectable;
    if (riteElements.riteMetricCard) riteElements.riteMetricCard.hidden = !selectable;
    if (riteElements.deckRitesSection) riteElements.deckRitesSection.hidden = !mystics;
    if (riteElements.riteMetricCount) riteElements.riteMetricCount.textContent = String(state.rites.length);
    if (riteElements.riteSelectedCount) {
      riteElements.riteSelectedCount.textContent = `${state.rites.length} / ${state.riteSelectedCount}`;
    }
  }

  function renderRitePicker() {
    const list = riteElements.riteList;
    const preview = riteElements.ritePreview;
    if (!list || !preview) return;

    syncRiteMetric();
    if (!isMystics() || !state.riteSelectionEnabled) {
      ritePreviewResizeObserver?.disconnect();
      return;
    }

    if (!state.ritePool.length) {
      list.className = "compact-rite-list empty-state";
      list.textContent = "Loading Rites…";
      renderRitePreview(null);
      return;
    }

    if (!getRite(state.selectedRiteId)) state.selectedRiteId = state.ritePool[0].id;

    list.className = "compact-rite-list";
    list.innerHTML = "";
    for (const rite of state.ritePool) {
      const selected = state.rites.includes(rite.id);
      const unavailable = !selected && state.rites.length >= state.riteSelectedCount;
      const row = document.createElement("article");
      row.className = `compact-rite-row${rite.id === state.selectedRiteId ? " selected" : ""}${selected ? " chosen" : ""}`;
      row.innerHTML = `
        <div>
          <div class="compact-card-title"><strong>${escapeHtml(rite.name)}</strong></div>
          <div class="compact-card-meta">
            <span class="mini-pill">Rite</span>
            ${selected ? '<span class="mini-pill">Selected</span>' : ""}
          </div>
        </div>
        <button type="button" class="${selected ? "secondary danger" : ""}" ${unavailable ? "disabled" : ""}>${selected ? "Remove" : "Choose"}</button>
      `;

      row.addEventListener("click", event => {
        state.selectedRiteId = rite.id;
        if (event.target.closest("button")) toggleRite(rite.id);
        else renderRitePicker();
      });
      list.append(row);
    }

    renderRitePreview(getRite(state.selectedRiteId));
  }

  function renderRitePreview(rite) {
    const preview = riteElements.ritePreview;
    if (!preview) return;
    ritePreviewResizeObserver?.disconnect();
    ritePreviewResizeObserver = null;

    if (!rite) {
      preview.className = "rite-preview empty-state";
      preview.textContent = "Select a Rite to view its current card and rules.";
      return;
    }

    const selected = state.rites.includes(rite.id);
    const unavailable = !selected && state.rites.length >= state.riteSelectedCount;
    const rulesetMode = new URLSearchParams(window.location.search).get("rules") === "candidate" ? "candidate" : "released";
    const rendererUrl = `../card-design/component-print-render.html?kind=rite&id=${encodeURIComponent(rite.id)}&side=front&rules=${encodeURIComponent(rulesetMode)}`;

    preview.className = "rite-preview rendered-rite-preview";
    preview.innerHTML = `
      <div class="deckbuilder-rite-render-stage" data-rite-render-stage>
        <iframe
          class="deckbuilder-rite-render-frame"
          src="${escapeHtml(rendererUrl)}"
          title="${escapeHtml(rite.name)} incomplete Rite card"
          loading="eager"
          scrolling="no"
        ></iframe>
      </div>
      <div class="rite-preview-copy">
        <p><strong>Begin:</strong> ${escapeHtml(rite.begin)}</p>
        <p><strong>Complete:</strong> ${escapeHtml(rite.complete)}</p>
        ${rite.reminder ? `<p class="rite-preview-reminder"><em>${escapeHtml(rite.reminder)}</em></p>` : ""}
        <p><strong>Interrupted:</strong> ${escapeHtml(rite.interrupted)}</p>
      </div>
      <div class="button-row rendered-rite-preview-actions">
        <button id="previewRiteButton" type="button" class="${selected ? "secondary danger" : ""}" ${unavailable ? "disabled" : ""}>${selected ? "Remove Rite" : "Choose Rite"}</button>
      </div>
    `;
    document.getElementById("previewRiteButton")?.addEventListener("click", () => toggleRite(rite.id));
    installRitePreviewScaling();
  }

  function installRitePreviewScaling() {
    const stage = riteElements.ritePreview?.querySelector("[data-rite-render-stage]");
    if (!stage) return;
    const resize = () => scaleRitePreview(stage);
    if ("ResizeObserver" in window) {
      ritePreviewResizeObserver = new ResizeObserver(resize);
      ritePreviewResizeObserver.observe(stage);
    }
    requestAnimationFrame(resize);
  }

  function scaleRitePreview(stage) {
    const frame = stage.querySelector(".deckbuilder-rite-render-frame");
    if (!frame) return;
    const availableWidth = Math.max(0, stage.clientWidth);
    const targetWidth = Math.min(MAX_PREVIEW_WIDTH, availableWidth || CARD_WIDTH);
    const scale = targetWidth / CARD_WIDTH;
    stage.style.height = `${CARD_HEIGHT * scale}px`;
    frame.style.transform = `translateX(-50%) scale(${scale})`;
  }

  function toggleRite(id) {
    if (!isMystics() || !state.riteSelectionEnabled || !getRite(id)) return;
    if (state.rites.includes(id)) {
      state.rites = state.rites.filter(item => item !== id);
    } else {
      if (state.rites.length >= state.riteSelectedCount) return;
      state.rites = [...state.rites, id];
    }
    state.selectedRiteId = id;
    deckbuilder.render();
  }

  function renderDeckRites() {
    const container = riteElements.deckRites;
    if (!container) return;
    if (!isMystics()) return;

    const rites = selectedRites();
    if (!rites.length) {
      container.className = "deck-list empty-state";
      container.textContent = "No Rites selected yet.";
      return;
    }

    container.className = "deck-list";
    container.innerHTML = rites.map(rite => `
      <article class="deck-row">
        <div>
          <div class="deck-title"><strong>${escapeHtml(rite.name)}</strong></div>
          <div class="deck-stats">
            <span class="mini-pill">${state.riteSelectionEnabled ? "Selected Rite" : "Included Rite"}</span>
            <span class="mini-pill">Disclosure optional until begun</span>
          </div>
        </div>
        ${state.riteSelectionEnabled ? `<button type="button" class="secondary danger" data-remove-rite="${escapeHtml(rite.id)}">Remove</button>` : ""}
      </article>
    `).join("");

    if (state.riteSelectionEnabled) {
      container.querySelectorAll("[data-remove-rite]").forEach(button => {
        button.addEventListener("click", () => toggleRite(button.dataset.removeRite));
      });
    }
  }

  function extendValidation(result) {
    const errors = [...result.errors];
    const warnings = [...result.warnings];

    if (isMystics() && state.riteSelectionEnabled) {
      const validIds = new Set(state.ritePool.map(rite => rite.id));
      const distinct = new Set(state.rites);
      if (state.ritePool.length && (
        state.rites.length !== state.riteSelectedCount
        || distinct.size !== state.rites.length
        || state.rites.some(id => !validIds.has(id))
      )) {
        errors.push(`Choose exactly ${state.riteSelectedCount} different Rites (${state.rites.length}/${state.riteSelectedCount} selected).`);
      }
    }

    return {
      ...result,
      riteCount: isMystics() ? state.rites.length : 0,
      requiredRites: isMystics() ? state.riteSelectedCount : 0,
      errors,
      warnings,
      valid: errors.length === 0,
    };
  }

  function serializeRites(data) {
    return {
      ...data,
      selectedRites: isMystics() ? [...state.rites] : [],
    };
  }

  function hydrateRites(data) {
    state.rites = [];

    if (state.factionId === MYSTICS_FACTION_ID) {
      if (state.ritePool.length) {
        state.rites = state.riteSelectionEnabled
          ? resolveRiteIds(data.selectedRites || [])
          : state.ritePool.map(rite => rite.id);
      } else {
        state.pendingRites = data.selectedRites || [];
      }
    } else {
      state.pendingRites = null;
    }
  }

  function resetRitesForFaction({ previousFactionId, factionId }) {
    if (factionId === previousFactionId) return;
    state.rites = factionId === MYSTICS_FACTION_ID && !state.riteSelectionEnabled
      ? state.ritePool.map(rite => rite.id)
      : [];
    state.pendingRites = null;
    state.selectedRiteId = state.ritePool[0]?.id || null;
  }

  function resolveRiteIds(items) {
    const ids = [];
    for (const item of items || []) {
      const id = typeof item === "string" ? item : item?.id;
      const name = typeof item === "string" ? "" : item?.name;
      const rite = getRite(id) || state.ritePool.find(candidate => candidate.name === name);
      if (!rite || ids.includes(rite.id)) continue;
      if (ids.length >= state.riteSelectedCount) break;
      ids.push(rite.id);
    }
    return ids;
  }

  function selectedRites() {
    return state.rites.map(getRite).filter(Boolean);
  }

  function getRite(id) {
    return state.ritePool.find(rite => rite.id === id);
  }

})();
