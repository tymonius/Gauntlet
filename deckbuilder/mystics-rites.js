(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const escapeHtml = value => deckbuilder.escapeHtml(value);

  const MYSTICS_FACTION_ID = "mystics";
  const deckState = () => deckbuilder.deckState();
  const riteState = {
    pool: [],
    selectedIds: [],
    selectedId: null,
    pending: null,
    selectedCount: 0,
    selectionEnabled: false,
  };
  const CARD_WIDTH = 240;
  const CARD_HEIGHT = 336;
  const MAX_PREVIEW_WIDTH = 300;

  const riteElements = {};
  let ritePreviewResizeObserver = null;
  let ritesReady = false;

  deckbuilder.registerRenderHook(renderRiteIntegration);
  deckbuilder.registerValidationHook(extendValidation);
  deckbuilder.registerSerializeHook(serializeRites);
  deckbuilder.registerHydrateHook(hydrateRites);
  deckbuilder.registerFactionChangeHook(resetRitesForFaction);
  deckbuilder.registerDeckListHook(riteDeckListLines);

  deckbuilder.registerFeature("mysticsRites", {
    selectedIds: () => [...riteState.selectedIds],
    selectedRites: () => selectedRites(),
    requiredCount: () => riteState.selectedCount,
    selectionEnabled: () => riteState.selectionEnabled,
    defaultIds: () => riteState.pool.map(rite => rite.id),
    isReady: () => ritesReady,
    setSelectedIds(items) {
      riteState.pending = null;
      riteState.selectedIds = isMystics()
        ? (riteState.selectionEnabled ? resolveRiteIds(items || []) : riteState.pool.map(rite => rite.id))
        : [];
      riteState.selectedId = riteState.selectedIds[0] || riteState.pool[0]?.id || null;
      return [...riteState.selectedIds];
    },
  });

  document.addEventListener("DOMContentLoaded", installRiteIntegration);

  function installRiteIntegration() {
    for (const id of [
      "mysticsRitesPanel", "riteSelectedCount", "riteInstructionCount", "clearRitesButton", "riteList", "ritePreview",
      "riteMetricCard", "riteMetricCount", "riteRequiredCount", "deckRitesSection", "deckRites"
    ]) riteElements[id] = document.getElementById(id);

    riteElements.clearRitesButton?.addEventListener("click", () => {
      if (riteState.selectedIds.length && !confirm("Remove all selected Rites?")) return;
      riteState.selectedIds = [];
      riteState.selectedId = riteState.pool[0]?.id || null;
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

      riteState.pool = rites.map(rite => ({
        id: String(rite.id),
        name: String(rite.name),
        begin: String(rite.begin || ""),
        complete: String(rite.complete || ""),
        interrupted: String(rite.interrupted || ""),
        reminder: rite.reminder?.text ? String(rite.reminder.text) : "",
      }));
      riteState.selectionEnabled = Boolean(policy);
      riteState.selectedCount = riteState.selectionEnabled ? selectedCount : rites.length;

      if (!riteState.selectionEnabled) {
        riteState.selectedIds = isMystics() ? riteState.pool.map(rite => rite.id) : [];
        riteState.pending = null;
      } else if (riteState.pending) {
        riteState.selectedIds = resolveRiteIds(riteState.pending);
        riteState.pending = null;
      } else {
        riteState.selectedIds = resolveRiteIds(riteState.selectedIds);
      }

      if (!riteState.selectedId || !getRite(riteState.selectedId)) {
        riteState.selectedId = riteState.pool[0]?.id || null;
      }

      ritesReady = true;
      deckbuilder.render();
    } catch (error) {
      ritesReady = false;
      console.error("Unable to load Mystics Rites", error);
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
    return deckState().factionId === MYSTICS_FACTION_ID;
  }

  function syncRiteMetric() {
    const mystics = isMystics();
    const selectable = mystics && riteState.selectionEnabled;
    if (riteElements.mysticsRitesPanel) riteElements.mysticsRitesPanel.hidden = !selectable;
    if (riteElements.riteMetricCard) riteElements.riteMetricCard.hidden = !selectable;
    if (riteElements.deckRitesSection) riteElements.deckRitesSection.hidden = !mystics;
    if (riteElements.riteMetricCount) riteElements.riteMetricCount.textContent = String(riteState.selectedIds.length);
    if (riteElements.riteRequiredCount) riteElements.riteRequiredCount.textContent = String(riteState.selectedCount);
    if (riteElements.riteInstructionCount) riteElements.riteInstructionCount.textContent = String(riteState.selectedCount);
    if (riteElements.riteSelectedCount) {
      riteElements.riteSelectedCount.textContent = `${riteState.selectedIds.length} / ${riteState.selectedCount}`;
    }
  }

  function renderRitePicker() {
    const list = riteElements.riteList;
    const preview = riteElements.ritePreview;
    if (!list || !preview) return;

    syncRiteMetric();
    if (!isMystics() || !riteState.selectionEnabled) {
      ritePreviewResizeObserver?.disconnect();
      return;
    }

    if (!riteState.pool.length) {
      list.className = "compact-rite-list empty-state";
      list.textContent = "Loading Rites…";
      renderRitePreview(null);
      return;
    }

    if (!getRite(riteState.selectedId)) riteState.selectedId = riteState.pool[0].id;

    list.className = "compact-rite-list";
    list.innerHTML = "";
    for (const rite of riteState.pool) {
      const selected = riteState.selectedIds.includes(rite.id);
      const unavailable = !selected && riteState.selectedIds.length >= riteState.selectedCount;
      const row = document.createElement("article");
      row.className = `compact-rite-row${rite.id === riteState.selectedId ? " selected" : ""}${selected ? " chosen" : ""}`;
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
        riteState.selectedId = rite.id;
        if (event.target.closest("button")) toggleRite(rite.id);
        else renderRitePicker();
      });
      list.append(row);
    }

    renderRitePreview(getRite(riteState.selectedId));
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

    const selected = riteState.selectedIds.includes(rite.id);
    const unavailable = !selected && riteState.selectedIds.length >= riteState.selectedCount;
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
    if (!isMystics() || !riteState.selectionEnabled || !getRite(id)) return;
    if (riteState.selectedIds.includes(id)) {
      riteState.selectedIds = riteState.selectedIds.filter(item => item !== id);
    } else {
      if (riteState.selectedIds.length >= riteState.selectedCount) return;
      riteState.selectedIds = [...riteState.selectedIds, id];
    }
    riteState.selectedId = id;
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
            <span class="mini-pill">${riteState.selectionEnabled ? "Selected Rite" : "Included Rite"}</span>
            <span class="mini-pill">Disclosure optional until begun</span>
          </div>
        </div>
        ${riteState.selectionEnabled ? `<button type="button" class="secondary danger" data-remove-rite="${escapeHtml(rite.id)}">Remove</button>` : ""}
      </article>
    `).join("");

    if (riteState.selectionEnabled) {
      container.querySelectorAll("[data-remove-rite]").forEach(button => {
        button.addEventListener("click", () => toggleRite(button.dataset.removeRite));
      });
    }
  }

  function extendValidation(result) {
    const errors = [...result.errors];
    const warnings = [...result.warnings];

    if (isMystics() && riteState.selectionEnabled) {
      const validIds = new Set(riteState.pool.map(rite => rite.id));
      const distinct = new Set(riteState.selectedIds);
      if (riteState.pool.length && (
        riteState.selectedIds.length !== riteState.selectedCount
        || distinct.size !== riteState.selectedIds.length
        || riteState.selectedIds.some(id => !validIds.has(id))
      )) {
        errors.push(`Choose exactly ${riteState.selectedCount} different Rites (${riteState.selectedIds.length}/${riteState.selectedCount} selected).`);
      }
    }

    return {
      ...result,
      riteCount: isMystics() ? riteState.selectedIds.length : 0,
      requiredRites: isMystics() ? riteState.selectedCount : 0,
      errors,
      warnings,
      valid: errors.length === 0,
    };
  }

  function riteDeckListLines() {
    if (!isMystics()) return [];
    const names = selectedRites().map(rite => rite.name);
    return [`Rites: ${names.join(", ") || "None"}`];
  }

  function serializeRites(data) {
    return {
      ...data,
      selectedRites: isMystics() ? [...riteState.selectedIds] : [],
    };
  }

  function hydrateRites(data) {
    riteState.selectedIds = [];

    if (deckState().factionId === MYSTICS_FACTION_ID) {
      if (riteState.pool.length) {
        riteState.selectedIds = riteState.selectionEnabled
          ? resolveRiteIds(data.selectedRites || [])
          : riteState.pool.map(rite => rite.id);
      } else {
        riteState.pending = data.selectedRites || [];
      }
    } else {
      riteState.pending = null;
    }
  }

  function resetRitesForFaction({ previousFactionId, factionId }) {
    if (factionId === previousFactionId) return;
    riteState.selectedIds = factionId === MYSTICS_FACTION_ID && !riteState.selectionEnabled
      ? riteState.pool.map(rite => rite.id)
      : [];
    riteState.pending = null;
    riteState.selectedId = riteState.pool[0]?.id || null;
  }

  function resolveRiteIds(items) {
    const ids = [];
    for (const item of items || []) {
      const id = typeof item === "string" ? item : item?.id;
      const name = typeof item === "string" ? "" : item?.name;
      const rite = getRite(id) || riteState.pool.find(candidate => candidate.name === name);
      if (!rite || ids.includes(rite.id)) continue;
      if (ids.length >= riteState.selectedCount) break;
      ids.push(rite.id);
    }
    return ids;
  }

  function selectedRites() {
    return riteState.selectedIds.map(getRite).filter(Boolean);
  }

  function getRite(id) {
    return riteState.pool.find(rite => rite.id === id);
  }

})();
