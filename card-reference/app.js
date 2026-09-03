import { PRODUCTION_SURFACES } from '../card-design/production-surface.mjs';

const RULEBOOK_URL = '../rulebook/';
const CARD_RENDER_MAX_WIDTH = 420;

const FACTION_LABELS = {
  neutral: 'Neutral',
  military: 'Military',
  diplomats: 'Diplomats',
  financiers: 'Financiers',
  intelligence: 'Intelligence',
  mystics: 'Mystics',
  inquisition: 'Inquisition'
};

const REFERENCE_TYPE_LABELS = Object.freeze({
  card: 'Playable card',
  leader: 'Leader',
  proposal: 'Proposal',
  rite: 'Rite',
  ritual: 'Ritual',
  reference: 'Reference card',
  tracker: 'Tracker card',
  ledger: 'Ledger',
  deed: 'Deed card',
  territory: 'Territory'
});

const TYPE_SORT_ORDER = Object.freeze([
  'card',
  'leader',
  'proposal',
  'rite',
  'ritual',
  'reference',
  'tracker',
  'ledger',
  'deed',
  'territory'
]);

const state = {
  entries: [],
  query: '',
  type: 'all',
  faction: 'all',
  cost: 'all',
  selectedId: null,
  version: 'current game'
};

const el = {};
let renderResizeObserver = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  bindEvents();

  try {
    const { loadCurrentGame } = await import('../game-data/current-game.mjs');
    const currentGame = await loadCurrentGame();
    state.version = currentGame.displayVersion;
    document.title = `Gauntlet ${state.version} Card Reference`;
    const otherComponents = [
      ...currentGame.sharedComponents,
      ...currentGame.components
    ].filter(component => component.cardLike);

    state.entries = [
      ...currentGame.cards.map(normalizeCard),
      ...currentGame.leaders.map(normalizeLeader),
      ...otherComponents.map(component => normalizeComponent(component, currentGame)),
      ...currentGame.territories.map(normalizeTerritory)
    ].sort(sortEntries);

    applyHashSelection();

    const cardCount = state.entries.filter(entry => entry.type === 'card').length;
    const otherCardCount = state.entries.filter(entry => entry.type !== 'card' && entry.type !== 'territory').length;
    const territoryCount = state.entries.filter(entry => entry.type === 'territory').length;
    el.cardTotal.textContent = cardCount;
    el.otherCardTotal.textContent = otherCardCount;
    el.territoryTotal.textContent = territoryCount;
    el.dataStatus.textContent = `${state.version} · ${cardCount} playable cards + ${otherCardCount} other cards + ${territoryCount} Territories loaded from current-game authority`;
    el.app.hidden = false;
    render();
  } catch (error) {
    console.error(error);
    el.dataStatus.textContent = 'Card Reference data unavailable';
    document.body.insertAdjacentHTML(
      'beforeend',
      `<p class="noscript">Unable to load the current-game authority. Serve the repository through a web server rather than opening this file directly.</p>`
    );
  }
}

function normalizeCard(card) {
  const faction = slugify(card.allegiance || 'Neutral');
  return {
    id: card.id || `${faction}-${slugify(card.name)}`,
    type: 'card',
    name: card.name,
    faction,
    factionLabel: card.allegiance || FACTION_LABELS[faction] || faction,
    cost: Number(card.cost),
    trait: card.trait || '',
    form: card.card_form || '',
    unique: Boolean(card.unique),
    uniqueRule: card.unique_rule || '',
    sections: normalizeEffects(card.effects),
    rulesNotes: normalizeNotes(card.rules_notes),
    rendererUrl: `../card-design/card-review-render.html?card=${encodeURIComponent(card.id)}`
  };
}

function normalizeTerritory(territory) {
  const arena = Boolean(territory.arena) || String(territory.type).toLowerCase() === 'arena';
  const rendererUrl = `../card-design/territory-review-render.html?territory=${encodeURIComponent(territory.id)}`;
  return {
    id: territory.id || `territory-${slugify(territory.name)}`,
    type: 'territory',
    categoryLabel: arena ? 'Arena' : 'Territory',
    name: territory.name,
    faction: 'territory',
    factionLabel: arena ? 'Arena' : 'Territory',
    arena,
    sections: normalizeEffects(territory.effects, 'Effect'),
    rulesNotes: normalizeNotes(territory.rules_notes),
    faces: [{ label: arena ? 'Arena' : 'Territory', rendererUrl }],
    rendererUrl
  };
}

function normalizeLeader(leader) {
  const faction = slugify(leader.faction || 'neutral');
  const rendererId = `${faction}-${slugify(leader.name)}`;
  const rendererUrl = buildComponentRendererUrl('leader', rendererId);
  return {
    id: `leader-${faction}-${leader.id}`,
    type: 'leader',
    categoryLabel: REFERENCE_TYPE_LABELS.leader,
    name: leader.name,
    faction,
    factionLabel: leader.factionLabel || FACTION_LABELS[faction] || faction,
    sections: {},
    rulesNotes: [],
    searchText: JSON.stringify(leader),
    faces: [{ label: 'Leader', rendererUrl }],
    rendererUrl
  };
}

function normalizeComponent(component, currentGame) {
  const type = componentTypeForFamily(component.family);
  if (!type) throw new Error(`Unsupported card-like component family ${component.family} for ${component.id}.`);

  const faction = slugify(component.faction || 'neutral');
  const rendererKind = componentRendererKind(component);
  const rendererId = componentRendererId(component);
  const faces = componentFaces(component, rendererKind, rendererId);
  const linkedData = linkedComponentData(component, currentGame);

  return {
    id: `component-${component.id}`,
    type,
    categoryLabel: REFERENCE_TYPE_LABELS[type],
    name: component.name,
    faction,
    factionLabel: faction === 'neutral' ? 'Universal' : (FACTION_LABELS[faction] || faction),
    sections: {},
    rulesNotes: [],
    searchText: JSON.stringify({ component, linkedData }),
    faces,
    rendererUrl: faces[0].rendererUrl
  };
}

function componentTypeForFamily(family) {
  return ({
    'proposal-treaty-card': 'proposal',
    'rite-card': 'rite',
    'ritual-card': 'ritual',
    'reference-card': 'reference',
    tracker: 'tracker',
    ledger: 'ledger',
    'deed-card': 'deed'
  })[family] || '';
}

function componentRendererKind(component) {
  return ({
    'proposal-treaty-card': 'proposal',
    'rite-card': 'rite',
    'ritual-card': 'ritual',
    'reference-card': 'reference',
    tracker: 'tracker',
    ledger: 'supplemental',
    'deed-card': 'supplemental'
  })[component.family] || 'supplemental';
}

function componentRendererId(component) {
  if (component.family === 'proposal-treaty-card') {
    return component.id.replace(/^diplomats-proposal-/, '');
  }
  return String(component.renderSource?.componentId || component.id || '').trim();
}

function componentFaces(component, rendererKind, rendererId) {
  const face = (label, side = 'front') => ({
    label,
    rendererUrl: buildComponentRendererUrl(rendererKind, rendererId, side)
  });

  if (component.family === 'proposal-treaty-card') {
    return [face('Proposal'), face(component.reverse || 'Treaty Article', 'reverse')];
  }
  if (component.family === 'rite-card') {
    return [face('Rite'), face(component.reverse || 'Completed', 'reverse')];
  }
  if (component.family === 'ritual-card') {
    return [face('Ritual'), face('Ritual back', 'reverse')];
  }
  if (component.family === 'reference-card') {
    return [face('Front'), face(component.reverse || 'Reverse', 'reverse')];
  }

  return [face(REFERENCE_TYPE_LABELS[componentTypeForFamily(component.family)] || 'Card')];
}

function linkedComponentData(component, currentGame) {
  if (component.family === 'proposal-treaty-card') {
    const id = component.id.replace(/^diplomats-proposal-/, '');
    return currentGame.proposals.find(proposal => proposal.id === id) || null;
  }
  if (component.family === 'rite-card') {
    const id = componentRendererId(component);
    return currentGame.mystics?.rites?.find(rite => rite.id === id) || null;
  }
  if (component.family === 'ritual-card') return currentGame.mystics?.ritual || null;
  return null;
}

function buildComponentRendererUrl(kind, id, side = 'front') {
  const params = new URLSearchParams({ kind, id, side });
  return `../card-design/component-render.html?${params.toString()}`;
}

function normalizeEffects(effects, unlabeledName = 'Text') {
  const sections = {};
  for (const effect of Array.isArray(effects) ? effects : []) {
    const rawLabel = String(effect?.label || unlabeledName).trim();
    const label = rawLabel === 'Text' ? unlabeledName : rawLabel;
    const text = String(effect?.text || '').trim();
    if (!text) continue;
    sections[label] = sections[label] ? `${sections[label]}\n${text}` : text;
  }
  return sections;
}

function normalizeNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map(note => String(note || '').trim()).filter(Boolean);
}

function cacheElements() {
  for (const id of [
    'app', 'dataStatus', 'filters', 'searchInput', 'typeFilter', 'factionFilter',
    'costFilter', 'clearFilters', 'cardTotal', 'otherCardTotal', 'territoryTotal', 'resultCount',
    'resultSummary', 'resultList', 'preview'
  ]) el[id] = document.getElementById(id);
}

function bindEvents() {
  el.filters.addEventListener('submit', event => event.preventDefault());
  el.searchInput.addEventListener('input', () => {
    state.query = el.searchInput.value.trim().toLowerCase();
    render();
  });
  el.typeFilter.addEventListener('change', () => {
    state.type = el.typeFilter.value;
    syncFilterAvailability();
    render();
  });
  el.factionFilter.addEventListener('change', () => {
    state.faction = el.factionFilter.value;
    render();
  });
  el.costFilter.addEventListener('change', () => {
    state.cost = el.costFilter.value;
    render();
  });
  el.clearFilters.addEventListener('click', clearFilters);
  window.addEventListener('hashchange', () => {
    applyHashSelection();
    render();
  });
}

function clearFilters() {
  state.query = '';
  state.type = 'all';
  state.faction = 'all';
  state.cost = 'all';
  el.searchInput.value = '';
  el.typeFilter.value = 'all';
  el.factionFilter.value = 'all';
  el.costFilter.value = 'all';
  syncFilterAvailability();
  render();
}

function syncFilterAvailability() {
  const territoriesOnly = state.type === 'territory';
  const costRelevant = state.type === 'all' || state.type === 'card';

  if (territoriesOnly) {
    state.faction = 'all';
    el.factionFilter.value = 'all';
  }
  if (!costRelevant) {
    state.cost = 'all';
    el.costFilter.value = 'all';
  }

  el.factionFilter.disabled = territoriesOnly;
  el.costFilter.disabled = !costRelevant;
}

function filteredEntries() {
  return state.entries.filter(entry => {
    if (state.type !== 'all' && entry.type !== state.type) return false;
    if (state.faction !== 'all' && (entry.type === 'territory' || entry.faction !== state.faction)) return false;
    if (state.cost !== 'all' && (entry.type !== 'card' || entry.cost !== Number(state.cost))) return false;
    if (!state.query) return true;

    const searchable = [
      entry.name,
      entry.factionLabel,
      entry.trait || '',
      entry.form || '',
      entry.uniqueRule || '',
      ...Object.keys(entry.sections),
      ...Object.values(entry.sections),
      ...(entry.rulesNotes || []),
      entry.searchText || ''
    ].join(' ').toLowerCase();

    return searchable.includes(state.query);
  });
}

function render() {
  const entries = filteredEntries();
  el.resultCount.textContent = entries.length;
  el.resultSummary.textContent = buildResultSummary();

  if (!entries.length) {
    el.resultList.className = 'reference-list empty-state';
    el.resultList.textContent = 'No cards, components, or Territories match the current filters.';
    renderPreview(null);
    return;
  }

  el.resultList.className = 'reference-list';
  if (!entries.some(entry => entry.id === state.selectedId)) state.selectedId = entries[0].id;
  el.resultList.innerHTML = '';

  entries.forEach(entry => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `reference-row${entry.id === state.selectedId ? ' selected' : ''}`;
    row.dataset.faction = entry.faction;
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(entry.id === state.selectedId));
    row.innerHTML = `
      <span>
        <span class="reference-row-title">${escapeHtml(entry.name)}</span>
        <span class="reference-row-meta">
          <span class="pill">${escapeHtml(entry.factionLabel)}</span>
          ${entry.type !== 'card' && entry.type !== 'territory' ? `<span class="pill">${escapeHtml(entry.categoryLabel)}</span>` : ''}
          ${entry.type === 'card' ? `<span class="pill">Cost ${entry.cost}</span>` : ''}
        </span>
      </span>
      <span class="reference-row-arrow" aria-hidden="true">›</span>
    `;
    row.addEventListener('click', () => selectEntry(entry.id));
    el.resultList.append(row);
  });

  renderPreview(state.entries.find(entry => entry.id === state.selectedId));
}

function buildResultSummary() {
  const parts = [];
  if (state.query) parts.push(`matching “${state.query}”`);
  if (state.type !== 'all') parts.push(`${REFERENCE_TYPE_LABELS[state.type] || state.type} only`);
  if (state.faction !== 'all') parts.push(FACTION_LABELS[state.faction] || state.faction);
  if (state.cost !== 'all') parts.push(`cost ${state.cost}`);
  return parts.length ? parts.join(' · ') : `All ${state.version} cards and Territories.`;
}

function selectEntry(id) {
  state.selectedId = id;
  const nextHash = `#${encodeURIComponent(id)}`;
  if (window.location.hash !== nextHash) history.replaceState(null, '', nextHash);
  render();
}

function applyHashSelection() {
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if (!id || !state.entries.some(entry => entry.id === id)) return;
  state.selectedId = id;
}

function renderPreview(entry) {
  renderResizeObserver?.disconnect();
  renderResizeObserver = null;

  if (!entry) {
    el.preview.className = 'reference-preview empty-state';
    delete el.preview.dataset.faction;
    el.preview.textContent = 'Select a result to view its complete production component.';
    return;
  }

  const faces = entry.faces?.length ? entry.faces : [{ label: 'Front', rendererUrl: entry.rendererUrl }];
  const activeFace = faces[0];
  const kicker = entry.type === 'territory'
    ? (entry.arena ? 'Arena' : 'Territory')
    : entry.type === 'card'
      ? `${entry.factionLabel} card`
      : `${entry.factionLabel} · ${entry.categoryLabel}`;

  el.preview.className = 'reference-preview rendered-preview';
  el.preview.dataset.faction = entry.faction;
  el.preview.setAttribute('aria-label', `${entry.name} full card reference`);
  el.preview.innerHTML = `
    <div class="rendered-card-header">
      <div>
        <p class="preview-kicker">${escapeHtml(kicker)}</p>
        <h3>${escapeHtml(entry.name)}</h3>
      </div>
      ${entry.type === 'card' ? `<span class="pill rendered-card-cost">Cost ${entry.cost}</span>` : ''}
    </div>
    ${faces.length > 1 ? `
      <div class="preview-face-switch" role="group" aria-label="${escapeHtml(entry.name)} faces">
        ${faces.map((face, index) => `
          <button
            type="button"
            class="button secondary face-toggle${index === 0 ? ' active' : ''}"
            data-face-index="${index}"
            aria-pressed="${index === 0 ? 'true' : 'false'}"
          >${escapeHtml(face.label)}</button>
        `).join('')}
      </div>
    ` : ''}
    <div class="render-stage-shell" data-render-stage>
      <iframe
        class="rendered-card-frame"
        src="${escapeHtml(activeFace.rendererUrl)}"
        title="${escapeHtml(entry.name)} complete rendered card"
        loading="eager"
        scrolling="no"
      ></iframe>
    </div>
    <div class="preview-actions">
      <button id="copyLink" class="button secondary" type="button">Copy direct link</button>
      <a id="standaloneRender" class="button secondary" href="${escapeHtml(activeFace.rendererUrl)}" target="_blank" rel="noopener">Open standalone render</a>
      <a class="button secondary" href="${RULEBOOK_URL}">Open Browser Rulebook</a>
      <a class="button secondary" href="../deckbuilder/">Open Deckbuilder</a>
    </div>
    <p class="preview-source">Complete production component rendered with the shared card pipeline and current-game authority.</p>
  `;

  document.getElementById('copyLink')?.addEventListener('click', copyDirectLink);
  el.preview.querySelectorAll('[data-face-index]').forEach(button => {
    button.addEventListener('click', () => switchPreviewFace(entry, Number(button.dataset.faceIndex)));
  });
  installRenderScaling();
}

function switchPreviewFace(entry, faceIndex) {
  const faces = entry.faces?.length ? entry.faces : [];
  const face = faces[faceIndex];
  if (!face) return;

  const frame = el.preview.querySelector('.rendered-card-frame');
  const standalone = document.getElementById('standaloneRender');
  if (frame) frame.src = face.rendererUrl;
  if (standalone) standalone.href = face.rendererUrl;

  el.preview.querySelectorAll('[data-face-index]').forEach(button => {
    const active = Number(button.dataset.faceIndex) === faceIndex;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function installRenderScaling() {
  const stage = el.preview.querySelector('[data-render-stage]');
  if (!stage) return;

  const resize = () => scaleRenderStage(stage);
  if ('ResizeObserver' in window) {
    renderResizeObserver = new ResizeObserver(resize);
    renderResizeObserver.observe(stage);
  }
  requestAnimationFrame(resize);
}

function scaleRenderStage(stage) {
  const frame = stage.querySelector('.rendered-card-frame');
  if (!frame) return;

  const surface = frame.src.includes('/card-design/territory-review-render.html')
    ? PRODUCTION_SURFACES.landscape
    : PRODUCTION_SURFACES.portrait;
  const availableWidth = Math.max(0, stage.clientWidth);
  const targetWidth = Math.min(CARD_RENDER_MAX_WIDTH, availableWidth || surface.widthCssPx);
  const scale = targetWidth / surface.widthCssPx;

  frame.style.width = `${surface.widthCssPx}px`;
  frame.style.height = `${surface.heightCssPx}px`;
  stage.style.height = `${surface.heightCssPx * scale}px`;
  frame.style.transform = `translateX(-50%) scale(${scale})`;
}

async function copyDirectLink(event) {
  try {
    await navigator.clipboard.writeText(window.location.href);
    const button = event.currentTarget;
    const original = button.textContent;
    button.textContent = 'Link copied';
    window.setTimeout(() => { button.textContent = original; }, 1400);
  } catch (error) {
    console.error(error);
    window.prompt('Copy this direct link:', window.location.href);
  }
}

function sortEntries(a, b) {
  if (a.type !== b.type) {
    return TYPE_SORT_ORDER.indexOf(a.type) - TYPE_SORT_ORDER.indexOf(b.type);
  }
  return a.name.localeCompare(b.name);
}

function slugify(value) {
  return String(value || '').toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
