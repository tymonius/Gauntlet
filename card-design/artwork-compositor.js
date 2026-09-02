(() => {
  const STORAGE_KEY = 'gauntlet.art-direction-drafts.v1';
  const SMART_ID_PREFIX = '__gauntlet-compositor-smart__:';
  const SAVE_ENDPOINT = '/api/art-direction';
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 1.8;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
  const slugify = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  let dialog;
  let preview;
  let previewImage;
  let state = null;
  let compareMode = 'manual';
  let pointerState = null;
  let scanQueued = false;
  const divergences = new Map();

  const ui = {};

  function readDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeDraft(id, direction) {
    const drafts = readDrafts();
    drafts[id] = Object.keys(direction).length ? direction : null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    window.dispatchEvent(new CustomEvent('gauntlet-art-direction-drafts-changed'));
  }

  function clearDraft(id) {
    const drafts = readDrafts();
    if (!Object.prototype.hasOwnProperty.call(drafts, id)) return;
    delete drafts[id];
    if (Object.keys(drafts).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    else localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('gauntlet-art-direction-drafts-changed'));
  }

  function canonicalDirection(target) {
    const source = target.window?.GAUNTLET_ART_DIRECTION?.[target.id] ?? window.GAUNTLET_ART_DIRECTION?.[target.id];
    return source && typeof source === 'object' ? { ...source } : {};
  }

  function stableDirection(target) {
    const drafts = readDrafts();
    if (Object.prototype.hasOwnProperty.call(drafts, target.id)) {
      const draft = drafts[target.id];
      return draft && typeof draft === 'object' ? { ...draft } : {};
    }
    return canonicalDirection(target);
  }

  function directionSignature(target, direction) {
    const resolved = target.resolve?.();
    const crop = resolved?.window?.GauntletArtworkCrop || window.GauntletArtworkCrop;
    if (crop?.normalizeDirection) {
      const normalized = crop.normalizeDirection(direction || {});
      return JSON.stringify({
        fit: normalized.fit,
        focusX: normalized.focusX,
        focusY: normalized.focusY,
        smart: normalized.smart,
        zoom: normalized.zoom,
      });
    }
    return JSON.stringify(direction || {});
  }

  function draftDiffersFromCanonical(target) {
    const drafts = readDrafts();
    if (!Object.prototype.hasOwnProperty.call(drafts, target.id)) return false;
    const draft = drafts[target.id];
    return directionSignature(target, draft && typeof draft === 'object' ? draft : {})
      !== directionSignature(target, canonicalDirection(target));
  }

  function focusFrom(direction, axis) {
    const index = axis === 'x' ? 0 : 1;
    const direct = axis === 'x'
      ? direction.focusX ?? direction.focus_x ?? direction.x
      : direction.focusY ?? direction.focus_y ?? direction.y;
    const raw = direct ?? (Array.isArray(direction.focus) ? direction.focus[index] : undefined);
    if (raw === undefined || raw === null || raw === '') return null;
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return null;
    return clamp(value > 1 ? value : value * 100, 0, 100);
  }

  function zoomFrom(direction) {
    const value = Number.parseFloat(direction.zoom);
    return Number.isFinite(value) ? clamp(value, MIN_ZOOM, MAX_ZOOM) : 1;
  }

  function fitFrom(direction) {
    return direction.fit === 'contain' ? 'contain' : 'cover';
  }

  function componentArtworkId(kind, id, side) {
    const reverse = side === 'reverse' || side === 'back' || side === 'treaty' || side === 'completed';
    if (kind === 'leader') return id;
    if (kind === 'proposal') return `proposal-${id}${reverse ? '-ratified' : ''}`;
    if (kind === 'rite') return `rite-${id}${reverse ? '-completed' : ''}`;
    if (kind === 'ritual') return `ritual-${id}`;
    return id;
  }

  function iframeTarget(frame) {
    let url;
    try { url = new URL(frame.src, location.href); } catch { return null; }
    const cardId = url.searchParams.get('card');
    const territoryId = url.searchParams.get('territory');
    const componentKind = url.pathname.endsWith('/card-design/component-render.html')
      ? String(url.searchParams.get('kind') || '').trim().toLowerCase()
      : '';
    const componentId = componentKind ? String(url.searchParams.get('id') || '').trim() : '';
    const componentSide = String(url.searchParams.get('side') || 'front').trim().toLowerCase();
    const id = cardId || territoryId || (componentId ? componentArtworkId(componentKind, componentId, componentSide) : '');
    if (!id) return null;
    return {
      id,
      label: frame.title?.replace(/\s+v0\.6\.[0-9].*$/i, '').replace(/\s+canonical Card Design render$/i, '').trim() || id,
      kind: territoryId ? 'territory' : componentId ? 'component' : 'card',
      sourceElement: frame,
      resolve() {
        const doc = frame.contentDocument;
        const targetWindow = frame.contentWindow;
        const image = doc?.querySelector('.card-art img, .territory-art img');
        const artFrame = image?.closest('.card-art, .territory-art');
        return targetWindow && image && artFrame ? { window: targetWindow, document: doc, image, frame: artFrame } : null;
      },
    };
  }

  function directTarget(card) {
    const image = card.querySelector('.card-art img, .territory-art img');
    const artFrame = image?.closest('.card-art, .territory-art');
    if (!image || !artFrame) return null;
    const wrapper = card.closest('[id]');
    const label = card.getAttribute('aria-label') || card.querySelector('.card-title, .territory-title')?.textContent?.trim() || 'Gauntlet card';
    const id = card.dataset.cardId || card.dataset.territoryId || card.dataset.id || wrapper?.id || slugify(label.replace(/\s+card$/i, ''));
    if (!id) return null;
    return {
      id,
      label,
      kind: artFrame.classList.contains('territory-art') ? 'territory' : 'card',
      sourceElement: card,
      resolve: () => ({ window, document, image, frame: artFrame }),
    };
  }

  function hostFor(target) {
    if (target.sourceElement instanceof HTMLIFrameElement) {
      return target.sourceElement.closest('.specimen-column, .territory-review-item, .review-card-pair') || target.sourceElement.parentElement;
    }
    return target.sourceElement.closest('.leader-specimen, .specimen-column, .territory-review-item, .proposal-specimen, .rite-specimen, .supplemental-specimen') || target.sourceElement.parentElement;
  }

  function divergenceBadgeFor(host, id) {
    return [...host.querySelectorAll(':scope > .art-compositor-divergence-badge')]
      .find(badge => badge.dataset.artDirectionId === id) || null;
  }

  function renderDivergenceSummary() {
    const existing = document.querySelector('.art-compositor-divergence-summary');
    const items = [...divergences.values()].sort((a, b) => a.label.localeCompare(b.label));
    window.GAUNTLET_ART_DIRECTION_DIVERGENCES = Object.freeze(items.map(item => Object.freeze({ ...item })));

    if (!items.length) {
      existing?.remove();
      return;
    }

    const summary = existing || document.createElement('aside');
    summary.className = 'art-compositor-divergence-summary screen-only';
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-live', 'polite');
    summary.innerHTML = '';

    const strong = document.createElement('strong');
    strong.textContent = `${items.length} unpublished artwork composition${items.length === 1 ? '' : 's'} differ from current-game.json.`;
    const detail = document.createElement('span');
    detail.textContent = items.map(item => item.label).join(', ');
    summary.append(strong, detail);

    if (!existing) {
      const main = document.querySelector('.developer-catalog-main');
      if (main) main.prepend(summary);
      else document.body.prepend(summary);
    }
  }

  function updateDivergenceMarker(target) {
    const host = hostFor(target);
    if (!host) return;
    const divergent = draftDiffersFromCanonical(target);
    target.sourceElement.classList.toggle('art-compositor-divergent-source', divergent);
    target.sourceElement.toggleAttribute('data-art-direction-divergent', divergent);

    let badge = divergenceBadgeFor(host, target.id);
    if (divergent) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'art-compositor-divergence-badge screen-only';
        badge.dataset.artDirectionId = target.id;
        host.append(badge);
      }
      badge.textContent = 'UNPUBLISHED ART POSITION';
      divergences.set(target.id, { id: target.id, label: target.label });
    } else {
      badge?.remove();
      divergences.delete(target.id);
    }
  }

  function installLauncher(target) {
    const host = hostFor(target);
    if (!host || host.querySelector(':scope > .art-compositor-launch')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'art-compositor-launch screen-only';
    button.textContent = 'Position art';
    button.setAttribute('aria-label', `Manually position artwork for ${target.label}`);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openFor(target);
    });
    host.append(button);
  }

  function applyDirection(target, direction) {
    const resolved = target.resolve();
    if (!resolved?.window?.GauntletArtworkCrop || !resolved.image.complete || !resolved.image.naturalWidth) return false;
    resolved.window.GauntletArtworkCrop.apply(resolved.image, direction, {
      id: `${SMART_ID_PREFIX}${target.id}`,
      label: target.label,
    });
    return true;
  }

  function applySavedDirection(target) {
    const direction = stableDirection({ ...target, window: target.resolve()?.window });
    if (!Object.keys(direction).length) return;
    applyDirection(target, direction);
  }

  function scan() {
    document.querySelectorAll('iframe').forEach((frame) => {
      const target = iframeTarget(frame);
      if (!target) return;
      installLauncher(target);
      updateDivergenceMarker(target);
      const drafts = readDrafts();
      if (Object.prototype.hasOwnProperty.call(drafts, target.id)) {
        const draft = drafts[target.id];
        applyDirection(target, draft && typeof draft === 'object' ? draft : {});
      }
      if (frame.dataset.artCompositorLoadHook !== 'true') {
        frame.dataset.artCompositorLoadHook = 'true';
        frame.addEventListener('load', () => {
          installLauncher(target);
          const savedDrafts = readDrafts();
          if (Object.prototype.hasOwnProperty.call(savedDrafts, target.id)) {
            const saved = savedDrafts[target.id];
            requestAnimationFrame(() => applyDirection(target, saved && typeof saved === 'object' ? saved : {}));
          }
        });
      }
    });

    document.querySelectorAll('.gauntlet-card:not(.card-inspection-clone)').forEach((card) => {
      const target = directTarget(card);
      if (!target) return;
      installLauncher(target);
      updateDivergenceMarker(target);
      applySavedDirection(target);
    });
    renderDivergenceSummary();
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scan();
    });
  }

  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'art-compositor-dialog';
    dialog.innerHTML = `
      <div class="art-compositor-shell">
        <header class="art-compositor-header">
          <div>
            <p class="art-compositor-kicker">Manual artwork positioning</p>
            <h2 class="art-compositor-title">Artwork compositor</h2>
            <p class="art-compositor-source"></p>
          </div>
          <button class="art-compositor-close" type="button" aria-label="Close artwork compositor">×</button>
        </header>
        <div class="art-compositor-body">
          <section class="art-compositor-preview-panel">
            <div class="art-compositor-compare" role="group" aria-label="Compare manual and smart positioning">
              <button type="button" data-compare="manual" aria-pressed="true">Manual</button>
              <button type="button" data-compare="smart" aria-pressed="false">Smart</button>
            </div>
            <div class="art-compositor-preview-wrap">
              <figure class="card-art art-compositor-preview" tabindex="0" aria-label="Drag to reposition artwork. Use arrow keys for fine adjustment.">
                <img alt="" draggable="false" />
                <span class="art-compositor-crosshair" aria-hidden="true"></span>
              </figure>
            </div>
            <p class="art-compositor-help">Drag to reposition · wheel to zoom · arrows nudge · Shift + arrows move faster</p>
          </section>
          <aside class="art-compositor-controls">
            <div class="art-compositor-axis">
              <div class="art-compositor-control-heading"><strong>Horizontal</strong><label><input type="checkbox" data-auto="x" checked /> Auto</label></div>
              <div class="art-compositor-range-row"><input type="range" min="0" max="100" step="0.1" value="50" data-range="x" /><input type="number" min="0" max="100" step="0.1" value="50" data-number="x" /><span>%</span></div>
              <small data-resolved="x">Smart → 50%</small>
            </div>
            <div class="art-compositor-axis">
              <div class="art-compositor-control-heading"><strong>Vertical</strong><label><input type="checkbox" data-auto="y" checked /> Auto</label></div>
              <div class="art-compositor-range-row"><input type="range" min="0" max="100" step="0.1" value="50" data-range="y" /><input type="number" min="0" max="100" step="0.1" value="50" data-number="y" /><span>%</span></div>
              <small data-resolved="y">Smart → 50%</small>
            </div>
            <div class="art-compositor-axis">
              <div class="art-compositor-control-heading"><strong>Zoom</strong><span data-zoom-label>1.00×</span></div>
              <div class="art-compositor-range-row"><input type="range" min="1" max="1.8" step="0.01" value="1" data-range="zoom" /><input type="number" min="1" max="1.8" step="0.01" value="1" data-number="zoom" /><span>×</span></div>
            </div>
            <label class="art-compositor-fit"><span>Fit</span><select><option value="cover">Cover</option><option value="contain">Contain</option></select></label>
            <div class="art-compositor-shortcuts">
              <button type="button" data-action="center">Center</button>
              <button type="button" data-action="smart">Smart baseline</button>
              <button type="button" data-action="reset">Reset saved</button>
            </div>
            <div class="art-compositor-output">
              <div class="art-compositor-control-heading"><strong>Override</strong><span>game-data/current-game.json · artDirection</span></div>
              <code></code>
            </div>
            <div class="art-compositor-actions">
              <button type="button" class="art-compositor-save" data-action="save">Save position</button>
              <button type="button" data-action="copy">Copy override</button>
            </div>
            <p class="art-compositor-save-status" role="status" aria-live="polite"></p>
          </aside>
        </div>
      </div>`;
    document.body.append(dialog);

    preview = dialog.querySelector('.art-compositor-preview');
    previewImage = preview.querySelector('img');
    Object.assign(ui, {
      title: dialog.querySelector('.art-compositor-title'),
      source: dialog.querySelector('.art-compositor-source'),
      status: dialog.querySelector('.art-compositor-save-status'),
      output: dialog.querySelector('.art-compositor-output code'),
      compareManual: dialog.querySelector('[data-compare="manual"]'),
      compareSmart: dialog.querySelector('[data-compare="smart"]'),
      xAuto: dialog.querySelector('[data-auto="x"]'),
      xRange: dialog.querySelector('[data-range="x"]'),
      xNumber: dialog.querySelector('[data-number="x"]'),
      xResolved: dialog.querySelector('[data-resolved="x"]'),
      yAuto: dialog.querySelector('[data-auto="y"]'),
      yRange: dialog.querySelector('[data-range="y"]'),
      yNumber: dialog.querySelector('[data-number="y"]'),
      yResolved: dialog.querySelector('[data-resolved="y"]'),
      zoomRange: dialog.querySelector('[data-range="zoom"]'),
      zoomNumber: dialog.querySelector('[data-number="zoom"]'),
      zoomLabel: dialog.querySelector('[data-zoom-label]'),
      fit: dialog.querySelector('.art-compositor-fit select'),
    });

    dialog.querySelector('.art-compositor-close').addEventListener('click', closeDialog);
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
    ui.compareManual.addEventListener('click', () => setCompare('manual'));
    ui.compareSmart.addEventListener('click', () => setCompare('smart'));

    bindAxis('x');
    bindAxis('y');
    bindPair(ui.zoomRange, ui.zoomNumber, () => {
      const zoom = clamp(Number.parseFloat(ui.zoomNumber.value) || 1, MIN_ZOOM, MAX_ZOOM);
      ui.zoomRange.value = ui.zoomNumber.value = String(round(zoom, 2));
      ui.zoomLabel.textContent = `${zoom.toFixed(2)}×`;
      manualRender();
    });
    ui.fit.addEventListener('change', manualRender);

    dialog.querySelector('[data-action="center"]').addEventListener('click', () => {
      ui.xAuto.checked = false;
      ui.yAuto.checked = false;
      setAxis('x', 50);
      setAxis('y', 50);
      manualRender();
    });
    dialog.querySelector('[data-action="smart"]').addEventListener('click', () => {
      ui.xAuto.checked = true;
      ui.yAuto.checked = true;
      ui.zoomRange.value = ui.zoomNumber.value = '1';
      ui.zoomLabel.textContent = '1.00×';
      ui.fit.value = 'cover';
      manualRender();
    });
    dialog.querySelector('[data-action="reset"]').addEventListener('click', resetSaved);
    dialog.querySelector('[data-action="copy"]').addEventListener('click', copyOverride);
    dialog.querySelector('[data-action="save"]').addEventListener('click', savePosition);

    preview.addEventListener('pointerdown', startDrag);
    preview.addEventListener('pointermove', drag);
    preview.addEventListener('pointerup', endDrag);
    preview.addEventListener('pointercancel', endDrag);
    preview.addEventListener('wheel', wheelZoom, { passive: false });
    preview.addEventListener('keydown', keyboardAdjust);
  }

  function bindAxis(axis) {
    const auto = ui[`${axis}Auto`];
    const range = ui[`${axis}Range`];
    const number = ui[`${axis}Number`];
    auto.addEventListener('change', manualRender);
    bindPair(range, number, () => {
      const value = clamp(Number.parseFloat(number.value) || 0, 0, 100);
      range.value = number.value = String(round(value, 1));
      manualRender();
    });
  }

  function bindPair(range, number, callback) {
    range.addEventListener('input', () => { number.value = range.value; callback(); });
    number.addEventListener('input', () => { range.value = number.value; callback(); });
  }

  function setAxis(axis, value) {
    const normalized = String(round(clamp(value, 0, 100), 1));
    ui[`${axis}Range`].value = normalized;
    ui[`${axis}Number`].value = normalized;
  }

  function setCompare(mode) {
    compareMode = mode === 'smart' ? 'smart' : 'manual';
    const smart = compareMode === 'smart';
    ui.compareManual.setAttribute('aria-pressed', String(!smart));
    ui.compareSmart.setAttribute('aria-pressed', String(smart));
    dialog.classList.toggle('is-comparing-smart', smart);
    ui.xAuto.disabled = smart;
    ui.yAuto.disabled = smart;
    ui.xRange.disabled = smart || ui.xAuto.checked;
    ui.xNumber.disabled = smart || ui.xAuto.checked;
    ui.yRange.disabled = smart || ui.yAuto.checked;
    ui.yNumber.disabled = smart || ui.yAuto.checked;
    ui.zoomRange.disabled = smart;
    ui.zoomNumber.disabled = smart;
    ui.fit.disabled = smart;
    renderPreview();
  }

  function manualRender() {
    if (compareMode !== 'manual') setCompare('manual');
    else {
      ui.xRange.disabled = ui.xAuto.checked;
      ui.xNumber.disabled = ui.xAuto.checked;
      ui.yRange.disabled = ui.yAuto.checked;
      ui.yNumber.disabled = ui.yAuto.checked;
      renderPreview();
    }
  }

  function directionFromControls() {
    const direction = {};
    const x = clamp(Number.parseFloat(ui.xNumber.value) || 0, 0, 100) / 100;
    const y = clamp(Number.parseFloat(ui.yNumber.value) || 0, 0, 100) / 100;
    if (!ui.xAuto.checked && !ui.yAuto.checked) direction.focus = [round(x), round(y)];
    else if (!ui.xAuto.checked) direction.focusX = round(x);
    else if (!ui.yAuto.checked) direction.focusY = round(y);
    const zoom = clamp(Number.parseFloat(ui.zoomNumber.value) || 1, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(zoom - 1) > 0.0001) direction.zoom = round(zoom, 2);
    if (ui.fit.value === 'contain') direction.fit = 'contain';
    return direction;
  }

  function renderPreview() {
    if (!state || !previewImage.complete || !previewImage.naturalWidth) return;
    if (!window.GauntletArtworkCrop) {
      ui.status.textContent = 'Shared artwork crop engine is unavailable.';
      return;
    }
    const direction = compareMode === 'smart' ? { fit: 'cover', zoom: 1 } : directionFromControls();
    const result = window.GauntletArtworkCrop.apply(previewImage, direction, {
      id: `${SMART_ID_PREFIX}${state.id}`,
      label: state.label,
    });
    if (!result) return;
    ui.xResolved.textContent = `${compareMode === 'smart' || ui.xAuto.checked ? 'Smart' : 'Manual'} → ${Number(result.focusX).toFixed(1)}%`;
    ui.yResolved.textContent = `${compareMode === 'smart' || ui.yAuto.checked ? 'Smart' : 'Manual'} → ${Number(result.focusY).toFixed(1)}%`;
    preview.dataset.resolvedX = String(result.focusX);
    preview.dataset.resolvedY = String(result.focusY);
    ui.output.textContent = overrideLine(state.id, directionFromControls());
    const crosshair = preview.querySelector('.art-compositor-crosshair');
    crosshair.style.left = `${result.focusX}%`;
    crosshair.style.top = `${result.focusY}%`;
  }

  function overrideLine(id, direction) {
    const parts = [];
    if (Array.isArray(direction.focus)) parts.push(`focus: [${direction.focus[0]}, ${direction.focus[1]}]`);
    else {
      if (direction.focusX !== undefined) parts.push(`focusX: ${direction.focusX}`);
      if (direction.focusY !== undefined) parts.push(`focusY: ${direction.focusY}`);
    }
    if (direction.zoom !== undefined) parts.push(`zoom: ${direction.zoom}`);
    if (direction.fit !== undefined) parts.push(`fit: "${direction.fit}"`);
    return `'${id.replaceAll("'", "\\'")}': { ${parts.join(', ')} },`;
  }

  function openFor(target) {
    ensureDialog();
    const resolved = target.resolve();
    if (!resolved) {
      ui.status.textContent = 'This render has not finished loading yet.';
      return;
    }
    const rect = resolved.frame.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      ui.status.textContent = 'Artwork frame is not measurable yet.';
      return;
    }

    const sourceDirection = stableDirection({ ...target, window: resolved.window });
    state = { ...target, ...resolved, sourceDirection };
    const x = focusFrom(sourceDirection, 'x');
    const y = focusFrom(sourceDirection, 'y');
    ui.xAuto.checked = x === null;
    ui.yAuto.checked = y === null;
    setAxis('x', x ?? Number(resolved.image.dataset.artFocusX || 50));
    setAxis('y', y ?? Number(resolved.image.dataset.artFocusY || 50));
    const zoom = zoomFrom(sourceDirection);
    ui.zoomRange.value = ui.zoomNumber.value = String(zoom);
    ui.zoomLabel.textContent = `${zoom.toFixed(2)}×`;
    ui.fit.value = fitFrom(sourceDirection);
    ui.title.textContent = target.label;
    ui.source.textContent = `${target.id} · ${Math.round(rect.width)}×${Math.round(rect.height)} art window`;
    ui.status.textContent = draftDiffersFromCanonical(target)
      ? 'This artwork position is unpublished and differs from current-game.json.'
      : '';
    preview.classList.toggle('territory-art', target.kind === 'territory');
    preview.classList.toggle('card-art', target.kind !== 'territory');
    preview.style.aspectRatio = `${rect.width} / ${rect.height}`;
    previewImage.src = resolved.image.currentSrc || resolved.image.src;
    previewImage.alt = `Artwork for ${target.label}`;
    setCompare('manual');
    const ready = () => renderPreview();
    if (previewImage.complete && previewImage.naturalWidth) ready();
    else previewImage.addEventListener('load', ready, { once: true });
    dialog.showModal();
    preview.focus({ preventScroll: true });
  }

  function closeDialog() {
    if (!dialog?.open) return;
    dialog.close();
    state = null;
    pointerState = null;
  }

  function resetSaved() {
    if (!state) return;
    const direction = state.sourceDirection || {};
    const x = focusFrom(direction, 'x');
    const y = focusFrom(direction, 'y');
    ui.xAuto.checked = x === null;
    ui.yAuto.checked = y === null;
    setAxis('x', x ?? 50);
    setAxis('y', y ?? 50);
    const zoom = zoomFrom(direction);
    ui.zoomRange.value = ui.zoomNumber.value = String(zoom);
    ui.zoomLabel.textContent = `${zoom.toFixed(2)}×`;
    ui.fit.value = fitFrom(direction);
    manualRender();
    ui.status.textContent = 'Restored the saved source override.';
  }

  async function copyOverride() {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(overrideLine(state.id, directionFromControls()));
      ui.status.textContent = 'Override copied.';
    } catch {
      ui.status.textContent = 'Clipboard access was unavailable; select the override text manually.';
    }
  }

  async function savePosition() {
    if (!state) return;
    const direction = directionFromControls();
    let payload = {};
    try {
      const response = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: state.id, direction }),
      });
      payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.saved !== true) {
        throw new Error(payload?.error || `Artwork position save failed (${response.status}).`);
      }
    } catch (error) {
      ui.status.textContent = `Save failed. Nothing was persisted outside this open editor: ${error instanceof Error ? error.message : String(error)}`;
      return;
    }

    const unpublished = Boolean(payload?.pr?.number);
    if (unpublished) writeDraft(state.id, direction);
    else clearDraft(state.id);

    state.sourceDirection = { ...direction };
    if (state.window?.GauntletArtworkCrop) {
      state.window.GauntletArtworkCrop.apply(state.image, direction, {
        id: `${SMART_ID_PREFIX}${state.id}`,
        label: state.label,
      });
    }
    queueScan();

    ui.status.textContent = unpublished
      ? `Saved to unpublished artwork batch PR #${payload.pr.number}; the red card marker remains until that batch is published.`
      : 'Saved to game-data/current-game.json. Reloading the canonical catalog to verify the persisted position…';

    if (!unpublished) window.setTimeout(() => window.location.reload(), 500);
  }

  function cropMetrics() {
    const rect = preview.getBoundingClientRect();
    const nw = previewImage.naturalWidth || 1;
    const nh = previewImage.naturalHeight || 1;
    const zoom = compareMode === 'smart' ? 1 : clamp(Number.parseFloat(ui.zoomNumber.value) || 1, MIN_ZOOM, MAX_ZOOM);
    const scale = ui.fit.value === 'contain' ? Math.min(rect.width / nw, rect.height / nh) : Math.max(rect.width / nw, rect.height / nh);
    return {
      overflowX: Math.max(0, nw * scale * zoom - rect.width),
      overflowY: Math.max(0, nh * scale * zoom - rect.height),
    };
  }

  function startDrag(event) {
    if (!state || event.button !== 0 || compareMode === 'smart') return;
    const metrics = cropMetrics();
    pointerState = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      focusX: Number(preview.dataset.resolvedX || 50),
      focusY: Number(preview.dataset.resolvedY || 50),
      ...metrics,
      active: false,
    };
    preview.setPointerCapture(event.pointerId);
  }

  function drag(event) {
    if (!pointerState || event.pointerId !== pointerState.id) return;
    const dx = event.clientX - pointerState.x;
    const dy = event.clientY - pointerState.y;
    if (!pointerState.active && Math.hypot(dx, dy) < 2) return;
    pointerState.active = true;
    if (pointerState.overflowX > 0.5) {
      ui.xAuto.checked = false;
      setAxis('x', pointerState.focusX - dx / pointerState.overflowX * 100);
    }
    if (pointerState.overflowY > 0.5) {
      ui.yAuto.checked = false;
      setAxis('y', pointerState.focusY - dy / pointerState.overflowY * 100);
    }
    manualRender();
  }

  function endDrag(event) {
    if (!pointerState || event.pointerId !== pointerState.id) return;
    if (preview.hasPointerCapture(event.pointerId)) preview.releasePointerCapture(event.pointerId);
    pointerState = null;
  }

  function wheelZoom(event) {
    if (!state || compareMode === 'smart') return;
    event.preventDefault();
    const zoom = clamp(Number.parseFloat(ui.zoomNumber.value) || 1, MIN_ZOOM, MAX_ZOOM);
    const next = round(clamp(zoom + (event.deltaY < 0 ? 0.03 : -0.03), MIN_ZOOM, MAX_ZOOM), 2);
    ui.zoomRange.value = ui.zoomNumber.value = String(next);
    ui.zoomLabel.textContent = `${next.toFixed(2)}×`;
    manualRender();
  }

  function keyboardAdjust(event) {
    if (!state || compareMode === 'smart') return;
    const step = event.shiftKey ? 2 : 0.5;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (ui.xAuto.checked) {
        ui.xAuto.checked = false;
        setAxis('x', Number(preview.dataset.resolvedX || 50));
      }
      setAxis('x', Number(ui.xNumber.value) + (event.key === 'ArrowLeft' ? -step : step));
      manualRender();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (ui.yAuto.checked) {
        ui.yAuto.checked = false;
        setAxis('y', Number(preview.dataset.resolvedY || 50));
      }
      setAxis('y', Number(ui.yNumber.value) + (event.key === 'ArrowUp' ? -step : step));
      manualRender();
      return;
    }
    if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '_') {
      event.preventDefault();
      const delta = event.key === '+' || event.key === '=' ? 0.02 : -0.02;
      const next = round(clamp(Number(ui.zoomNumber.value) + delta, MIN_ZOOM, MAX_ZOOM), 2);
      ui.zoomRange.value = ui.zoomNumber.value = String(next);
      ui.zoomLabel.textContent = `${next.toFixed(2)}×`;
      manualRender();
    }
  }

  function initialize() {
    ensureDialog();
    scan();
    window.addEventListener('gauntlet-art-direction-ready', queueScan);
    window.addEventListener('gauntlet-art-direction-drafts-changed', queueScan);
    window.addEventListener('gauntlet-artwork-authoring-status', queueScan);
    new MutationObserver(queueScan).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', scan);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
