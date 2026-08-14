const AUTHORITY_SET_ID = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const CANONICAL_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
const CANONICAL_SHA256 = '641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c';
const STARTERS_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json';
const STARTERS_SHA256 = '4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64';

const state = {
  canonical: null,
  starters: [],
  factionId: '',
  leaderId: '',
  quantities: new Map(),
  territoryIds: [],
};

const el = {
  sourceStatus: document.querySelector('[data-source-status]'),
  factionSelect: document.querySelector('[data-faction-select]'),
  leaderSelect: document.querySelector('[data-leader-select]'),
  starterName: document.querySelector('[data-starter-name]'),
  starterSummary: document.querySelector('[data-starter-summary]'),
  loadStarter: document.querySelector('[data-load-starter]'),
  cardCount: document.querySelector('[data-card-count]'),
  deckValue: document.querySelector('[data-deck-value]'),
  territoryCount: document.querySelector('[data-territory-count]'),
  arenaCount: document.querySelector('[data-arena-count]'),
  validationStatus: document.querySelector('[data-validation-status]'),
  clearDeck: document.querySelector('[data-clear-deck]'),
  cardSearch: document.querySelector('[data-card-search]'),
  cardFilter: document.querySelector('[data-card-filter]'),
  cardPool: document.querySelector('[data-card-pool]'),
  currentDeck: document.querySelector('[data-current-deck]'),
  territorySearch: document.querySelector('[data-territory-search]'),
  territoryPool: document.querySelector('[data-territory-pool]'),
  territoryOrder: document.querySelector('[data-territory-order]'),
};

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchVerified(url, expectedSha256) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
  const bytes = await response.arrayBuffer();
  const actualHash = bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
  if (actualHash !== expectedSha256) throw new Error(`Source hash mismatch for ${url}.`);
  return new TextDecoder().decode(bytes);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value) {
  return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function construction() {
  return state.canonical?.deck_construction || {};
}

function selectedFaction() {
  return state.canonical?.factions?.find((faction) => faction.id === state.factionId) || null;
}

function selectedStarter() {
  return state.starters.find((deck) => deck.factionId === state.factionId && deck.leaderId === state.leaderId) || null;
}

function cardById(id) {
  return state.canonical?.cards?.find((card) => card.id === id) || null;
}

function territoryId(territory) {
  return territory.id || slugify(territory.name);
}

function territories() {
  return Array.isArray(state.canonical?.territories) ? state.canonical.territories : [];
}

function territoryType(territory) {
  const explicit = territory.type || territory.kind || territory.classification || '';
  return territory.arena === true || String(explicit).toLowerCase().includes('arena') || String(territory.name).startsWith('Arena:') ? 'Arena' : 'Standard';
}

function territoryText(territory) {
  if (typeof territory.text === 'string') return territory.text;
  if (typeof territory.effect === 'string') return territory.effect;
  if (Array.isArray(territory.effects)) return territory.effects.map((effect) => typeof effect === 'string' ? effect : [effect.label, effect.text].filter(Boolean).join(': ')).join(' ');
  return '';
}

function legalCards() {
  const faction = selectedFaction();
  if (!faction) return [];
  return state.canonical.cards.filter((card) => card.allegiance === 'Neutral' || card.allegiance === faction.name);
}

function cardQuantity(id) {
  return state.quantities.get(id) || 0;
}

function setCardQuantity(id, nextQuantity) {
  const card = cardById(id);
  if (!card) return;
  let quantity = Math.max(0, Math.floor(Number(nextQuantity) || 0));
  if (card.unique) quantity = Math.min(quantity, 1);
  if (quantity) state.quantities.set(id, quantity);
  else state.quantities.delete(id);
  renderCardPool();
  renderCurrentDeck();
  renderMetrics();
}

function totals() {
  let cards = 0;
  let value = 0;
  for (const [id, quantity] of state.quantities.entries()) {
    const card = cardById(id);
    if (!card) continue;
    cards += quantity;
    value += quantity * Number(card.cost || 0);
  }
  const selectedTerritories = territories().filter((territory) => state.territoryIds.includes(territoryId(territory)));
  const arenas = selectedTerritories.filter((territory) => territoryType(territory) === 'Arena').length;
  return { cards, value, selectedTerritories, arenas };
}

function validation() {
  const limits = construction();
  const total = totals();
  const problems = [];
  if (!selectedFaction()) problems.push('Choose one faction.');
  if (!state.leaderId) problems.push('Choose one Leader.');
  if (total.cards < Number(limits.minimum_cards || 30)) problems.push(`Deck needs at least ${Number(limits.minimum_cards || 30)} cards.`);
  if (total.value > Number(limits.maximum_deckbuilding_value || 60)) problems.push(`Deck value exceeds ${Number(limits.maximum_deckbuilding_value || 60)}.`);
  if (total.selectedTerritories.length !== Number(limits.territories_per_player || 3)) problems.push(`Choose exactly ${Number(limits.territories_per_player || 3)} Territories.`);
  if (total.arenas > Number(limits.maximum_arenas || 1)) problems.push(`Choose no more than ${Number(limits.maximum_arenas || 1)} Arena.`);
  const faction = selectedFaction();
  for (const [id, quantity] of state.quantities.entries()) {
    const card = cardById(id);
    if (!card) problems.push(`Unknown card id ${id}.`);
    else if (card.allegiance !== 'Neutral' && card.allegiance !== faction?.name) problems.push(`${card.name} is not legal for ${faction?.name || 'this faction'}.`);
    else if (card.unique && quantity > 1) problems.push(`${card.name} is Unique and may appear only once.`);
  }
  return problems;
}

function renderFactionSelect() {
  const factions = state.canonical.factions || [];
  el.factionSelect.innerHTML = '<option value="">Choose a faction</option>' + factions.map((faction) => `<option value="${escapeHtml(faction.id)}">${escapeHtml(faction.name)}</option>`).join('');
  el.factionSelect.disabled = false;
  el.factionSelect.value = state.factionId;
}

function renderLeaderSelect() {
  const faction = selectedFaction();
  if (!faction) {
    el.leaderSelect.innerHTML = '<option value="">Choose a faction first</option>';
    el.leaderSelect.disabled = true;
    return;
  }
  el.leaderSelect.innerHTML = '<option value="">Choose a Leader</option>' + faction.leaders.map((leader) => `<option value="${escapeHtml(slugify(leader.name))}">${escapeHtml(leader.name)}</option>`).join('');
  el.leaderSelect.disabled = false;
  el.leaderSelect.value = state.leaderId;
}

function renderStarterControl() {
  const starter = selectedStarter();
  el.loadStarter.disabled = !starter;
  if (!starter) {
    el.starterName.textContent = state.leaderId ? 'No approved starter found' : 'Choose a Leader';
    el.starterSummary.textContent = 'Each Leader has one finalized competitive starter Deck.';
    return;
  }
  el.starterName.textContent = starter.name;
  el.starterSummary.textContent = starter.summary;
}

function effectHtml(card) {
  const effects = Array.isArray(card.effects) ? card.effects : [];
  return effects.map((effect) => `<div class="effect-line"><strong>${escapeHtml(effect.label)}:</strong> ${escapeHtml(effect.text)}</div>`).join('');
}

function renderCardPool() {
  if (!selectedFaction()) {
    el.cardPool.innerHTML = '<p class="empty-state">Choose a faction to open its legal card pool.</p>';
    return;
  }
  const query = el.cardSearch.value.trim().toLowerCase();
  const filter = el.cardFilter.value;
  const faction = selectedFaction();
  const cards = legalCards().filter((card) => {
    if (filter === 'neutral' && card.allegiance !== 'Neutral') return false;
    if (filter === 'faction' && card.allegiance !== faction.name) return false;
    if (!query) return true;
    const haystack = [card.name, card.allegiance, card.trait, ...(card.effects || []).flatMap((effect) => [effect.label, effect.text])].join(' ').toLowerCase();
    return haystack.includes(query);
  }).sort((a, b) => Number(a.cost) - Number(b.cost) || a.name.localeCompare(b.name));
  if (!cards.length) {
    el.cardPool.innerHTML = '<p class="empty-state">No legal cards match this filter.</p>';
    return;
  }
  el.cardPool.innerHTML = cards.map((card) => {
    const quantity = cardQuantity(card.id);
    return `<article class="card-entry" data-card-id="${escapeHtml(card.id)}"><div><h3>${escapeHtml(card.name)}</h3><div class="card-meta"><span>${escapeHtml(card.allegiance)}</span><span>Value ${Number(card.cost)}</span>${card.trait ? `<span>${escapeHtml(card.trait)}</span>` : ''}${card.unique ? '<span class="unique-note">Unique</span>' : ''}</div><div class="card-text">${effectHtml(card)}</div></div><div class="qty-control"><button type="button" data-dec aria-label="Remove ${escapeHtml(card.name)}">−</button><span>${quantity}</span><button type="button" data-inc aria-label="Add ${escapeHtml(card.name)}">+</button></div></article>`;
  }).join('');
  el.cardPool.querySelectorAll('[data-card-id]').forEach((entry) => {
    const id = entry.dataset.cardId;
    entry.querySelector('[data-dec]').addEventListener('click', () => setCardQuantity(id, cardQuantity(id) - 1));
    entry.querySelector('[data-inc]').addEventListener('click', () => setCardQuantity(id, cardQuantity(id) + 1));
  });
}

function renderCurrentDeck() {
  const rows = [...state.quantities.entries()].map(([id, quantity]) => ({ card: cardById(id), quantity })).filter((entry) => entry.card).sort((a, b) => a.card.name.localeCompare(b.card.name));
  if (!rows.length) {
    el.currentDeck.innerHTML = '<p class="empty-state">No cards selected.</p>';
    return;
  }
  el.currentDeck.innerHTML = rows.map(({ card, quantity }) => `<div class="deck-row" data-current-id="${escapeHtml(card.id)}"><div><strong>${escapeHtml(card.name)}</strong><br><span>${escapeHtml(card.allegiance)} · value ${Number(card.cost)} each</span></div><span>${quantity * Number(card.cost)} value</span><div class="qty-control"><button type="button" data-dec>−</button><span>${quantity}</span><button type="button" data-inc>+</button></div></div>`).join('');
  el.currentDeck.querySelectorAll('[data-current-id]').forEach((row) => {
    const id = row.dataset.currentId;
    row.querySelector('[data-dec]').addEventListener('click', () => setCardQuantity(id, cardQuantity(id) - 1));
    row.querySelector('[data-inc]').addEventListener('click', () => setCardQuantity(id, cardQuantity(id) + 1));
  });
}

function renderTerritories() {
  const all = territories();
  const query = el.territorySearch.value.trim().toLowerCase();
  const visible = all.filter((territory) => [territory.name, territoryType(territory), territoryText(territory)].join(' ').toLowerCase().includes(query));
  if (!all.length) {
    el.territoryPool.innerHTML = '<p class="empty-state">The verified canonical dataset did not expose a Territory collection. Do not use this reconstruction.</p>';
    return;
  }
  el.territoryPool.innerHTML = visible.map((territory) => {
    const id = territoryId(territory);
    const selected = state.territoryIds.includes(id);
    return `<article class="territory-card${selected ? ' selected' : ''}" data-territory-id="${escapeHtml(id)}"><label><input type="checkbox" ${selected ? 'checked' : ''}/><span><h3>${escapeHtml(territory.name)}</h3><p>${escapeHtml(territoryText(territory))}</p><span class="type">${territoryType(territory)}</span></span></label></article>`;
  }).join('') || '<p class="empty-state">No Territories match this search.</p>';
  el.territoryPool.querySelectorAll('[data-territory-id]').forEach((entry) => {
    entry.querySelector('input').addEventListener('change', (event) => toggleTerritory(entry.dataset.territoryId, event.target.checked));
  });
  renderTerritoryOrder();
}

function toggleTerritory(id, checked) {
  if (checked && !state.territoryIds.includes(id)) {
    if (state.territoryIds.length >= Number(construction().territories_per_player || 3)) {
      renderTerritories();
      return;
    }
    const territory = territories().find((item) => territoryId(item) === id);
    if (territoryType(territory) === 'Arena' && totals().arenas >= Number(construction().maximum_arenas || 1)) {
      renderTerritories();
      return;
    }
    state.territoryIds.push(id);
  } else if (!checked) {
    state.territoryIds = state.territoryIds.filter((item) => item !== id);
  }
  renderTerritories();
  renderMetrics();
}

function renderTerritoryOrder() {
  const selected = state.territoryIds.map((id) => territories().find((territory) => territoryId(territory) === id)).filter(Boolean);
  el.territoryOrder.innerHTML = selected.length ? selected.map((territory, index) => `<li><strong>${index + 1}.</strong> ${escapeHtml(territory.name)}</li>`).join('') : '<li>No Territories selected.</li>';
}

function renderMetrics() {
  const total = totals();
  el.cardCount.textContent = total.cards;
  el.deckValue.textContent = total.value;
  el.territoryCount.textContent = total.selectedTerritories.length;
  el.arenaCount.textContent = total.arenas;
  const problems = validation();
  el.validationStatus.className = `validation-box ${problems.length ? 'invalid' : 'valid'}`;
  el.validationStatus.innerHTML = problems.length ? `<strong>Not yet legal.</strong><br>${problems.map(escapeHtml).join('<br>')}` : '<strong>Legal clean-v0.6.3 construction.</strong><br>This package satisfies the certified construction constraints.';
}

function clearPackage() {
  state.quantities.clear();
  state.territoryIds = [];
  renderCardPool();
  renderCurrentDeck();
  renderTerritories();
  renderMetrics();
}

function loadStarter(starter = selectedStarter()) {
  if (!starter) return;
  const byName = new Map(state.canonical.cards.map((card) => [card.name, card]));
  const territoryByName = new Map(territories().map((territory) => [territory.name, territory]));
  const quantities = new Map();
  for (const item of starter.cards) {
    const card = byName.get(item.name);
    if (!card) throw new Error(`Approved starter references missing card: ${item.name}`);
    quantities.set(card.id, Number(item.quantity));
  }
  const orderedNames = starter.recommendedTerritoryOrder || starter.territories || [];
  const territoryIds = orderedNames.map((name) => {
    const territory = territoryByName.get(name);
    if (!territory) throw new Error(`Approved starter references missing Territory: ${name}`);
    return territoryId(territory);
  });
  state.quantities = quantities;
  state.territoryIds = territoryIds;
  renderCardPool();
  renderCurrentDeck();
  renderTerritories();
  renderMetrics();
}

function applyQuerySelection() {
  const params = new URLSearchParams(window.location.search);
  const factionId = params.get('faction') || '';
  const leaderId = params.get('leader') || '';
  if (state.canonical.factions.some((faction) => faction.id === factionId)) state.factionId = factionId;
  renderFactionSelect();
  renderLeaderSelect();
  if (selectedFaction()?.leaders.some((leader) => slugify(leader.name) === leaderId)) state.leaderId = leaderId;
  renderLeaderSelect();
  renderStarterControl();
  if (params.get('starter') === '1' && selectedStarter()) loadStarter();
}

function bindEvents() {
  el.factionSelect.addEventListener('change', () => {
    state.factionId = el.factionSelect.value;
    state.leaderId = '';
    clearPackage();
    renderLeaderSelect();
    renderStarterControl();
    renderCardPool();
    renderMetrics();
  });
  el.leaderSelect.addEventListener('change', () => {
    state.leaderId = el.leaderSelect.value;
    renderStarterControl();
    renderMetrics();
  });
  el.loadStarter.addEventListener('click', () => loadStarter());
  el.clearDeck.addEventListener('click', clearPackage);
  el.cardSearch.addEventListener('input', renderCardPool);
  el.cardFilter.addEventListener('change', renderCardPool);
  el.territorySearch.addEventListener('input', renderTerritories);
}

async function initialize() {
  try {
    const [canonicalSource, starterSource] = await Promise.all([
      fetchVerified(CANONICAL_SOURCE, CANONICAL_SHA256),
      fetchVerified(STARTERS_SOURCE, STARTERS_SHA256),
    ]);
    const canonical = JSON.parse(canonicalSource);
    const starters = JSON.parse(starterSource);
    if (canonical.version !== 'clean-v0.6.3-downstream') throw new Error(`Unexpected canonical version: ${canonical.version}`);
    if (canonical.authority_set_id !== AUTHORITY_SET_ID) throw new Error('Canonical authority-set ID mismatch.');
    if (!Array.isArray(canonical.cards) || canonical.cards.length !== 128) throw new Error('Clean Deckbuilder requires exactly 128 playable cards.');
    if (!Array.isArray(canonical.factions) || canonical.factions.length !== 6) throw new Error('Clean Deckbuilder requires exactly six factions.');
    if (!Array.isArray(canonical.territories) || canonical.territories.length !== 25) throw new Error('Clean Deckbuilder requires exactly 25 Territories.');
    if (starters.version !== 'clean-v0.6.3-downstream' || !Array.isArray(starters.decks) || starters.decks.length !== 12) throw new Error('Clean Deckbuilder requires exactly 12 approved starter Decks.');
    if (!starters.decks.every((deck) => deck.cardCount === 30 && deck.deckbuildingValue === 60)) throw new Error('Approved starter Deck invariant failed.');
    state.canonical = canonical;
    state.starters = starters.decks;
    bindEvents();
    renderFactionSelect();
    renderLeaderSelect();
    renderStarterControl();
    renderCardPool();
    renderCurrentDeck();
    renderTerritories();
    renderMetrics();
    applyQuerySelection();
    el.sourceStatus.textContent = `Verified canonical data ${CANONICAL_SHA256.slice(0, 12)}… and 12 approved starters · authority ${AUTHORITY_SET_ID.slice(0, 12)}….`;
  } catch (error) {
    console.error(error);
    el.sourceStatus.textContent = `Source verification failed: ${error.message}`;
    el.sourceStatus.closest('.authority-card')?.classList.add('source-error');
    el.cardPool.innerHTML = '<p class="empty-state">Certified Deckbuilder inputs could not be verified. Do not use this reconstruction.</p>';
    el.territoryPool.innerHTML = '<p class="empty-state">Certified Deckbuilder inputs could not be verified.</p>';
  }
}

initialize();
