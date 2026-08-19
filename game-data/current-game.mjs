export const CURRENT_GAME_AUTHORITY_URL = '/game-data/current-game.json';
export const CURRENT_ART_DIRECTION_SOURCE_URL = '/tts/artwork-direction-overrides.js';

let currentGamePromise = null;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Current-game source request failed for ${url}: HTTP ${response.status}.`);
  return response.json();
}

async function loadText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Current-game source request failed for ${url}: HTTP ${response.status}.`);
  return response.text();
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`Current-game authority expected ${label} to be an array.`);
  return value;
}

function normalizeArtFocus(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(1, Math.max(0, number > 1 ? number / 100 : number));
}

function normalizeArtDirection(value) {
  const source = value && typeof value === 'object' ? value : {};
  const direction = {};
  const focus = Array.isArray(source.focus) ? source.focus : [];
  const focusX = normalizeArtFocus(source.focusX ?? source.focus_x ?? source.x ?? focus[0]);
  const focusY = normalizeArtFocus(source.focusY ?? source.focus_y ?? source.y ?? focus[1]);

  if (focusX !== undefined && focusY !== undefined) direction.focus = [focusX, focusY];
  else if (focusX !== undefined) direction.focusX = focusX;
  else if (focusY !== undefined) direction.focusY = focusY;

  const zoom = Number.parseFloat(source.zoom);
  if (Number.isFinite(zoom)) {
    const normalizedZoom = Math.min(1.8, Math.max(1, zoom));
    if (Math.abs(normalizedZoom - 1) > 0.0001) direction.zoom = normalizedZoom;
  }
  if (source.fit === 'contain') direction.fit = 'contain';
  if (source.smart === false) direction.smart = false;
  return direction;
}

export function parseArtDirectionSource(source) {
  const text = String(source || '');
  const match = text.match(/window\.GAUNTLET_ART_DIRECTION\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);?/);
  if (!match) return {};
  const body = match[1].trim();
  if (!body) return {};

  const jsonBody = body
    .replace(/,\s*$/u, '')
    .replace(/([,{]\s*)(focus|focusX|focusY|zoom|fit|smart)\s*:/gu, '$1"$2":');
  const raw = JSON.parse(`{${jsonBody}}`);
  const result = {};
  for (const [id, direction] of Object.entries(raw)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) {
      throw new Error(`Current-game artwork direction contains an invalid id: ${id || '(empty)'}.`);
    }
    const normalized = normalizeArtDirection(direction);
    if (Object.keys(normalized).length) result[id] = normalized;
  }
  return result;
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveCards(baseCards, changes, manifest) {
  if (changes?.version !== manifest.version || changes?.base_version !== manifest.baseVersion) {
    throw new Error(`Current card changes do not match ${manifest.version} over ${manifest.baseVersion}.`);
  }

  const byId = new Map();
  const nameToId = new Map();
  for (const sourceCard of requireArray(baseCards, 'base playable cards')) {
    const card = clone(sourceCard);
    if (!card.id || !card.name) throw new Error('A base playable card is missing its stable id or name.');
    if (byId.has(card.id)) throw new Error(`Duplicate base playable-card id: ${card.id}.`);
    byId.set(card.id, card);
    nameToId.set(card.name, card.id);
  }

  for (const retired of requireArray(changes.retired_cards || [], 'retired cards')) {
    const id = retired?.id || nameToId.get(retired?.name);
    if (!id || !byId.has(id)) throw new Error(`Current-game retirement cannot resolve ${retired?.id || retired?.name || 'unknown card'}.`);
    const removed = byId.get(id);
    byId.delete(id);
    if (removed?.name) nameToId.delete(removed.name);
  }

  for (const sourceCard of requireArray(changes.cards || [], 'current card changes')) {
    const card = clone(sourceCard);
    if (!card.id || !card.name) throw new Error('A current playable card is missing its stable id or name.');
    const conflictingId = nameToId.get(card.name);
    if (conflictingId && conflictingId !== card.id) {
      throw new Error(`Current playable-card name ${card.name} conflicts with stable id ${conflictingId}.`);
    }
    const previous = byId.get(card.id);
    if (previous?.name && previous.name !== card.name) nameToId.delete(previous.name);
    byId.set(card.id, card);
    nameToId.set(card.name, card.id);
  }

  return [...byId.values()].map(card => ({
    ...card,
    current_game_version: manifest.version,
    current_game_authority: CURRENT_GAME_AUTHORITY_URL,
  }));
}

function resolveFactions(baseFactions, manifest) {
  const leaders = requireArray(manifest.leaders, 'Leader definitions');
  const leaderIds = new Set();
  for (const leader of leaders) {
    if (!leader?.id || !leader?.faction || !leader?.name) throw new Error('A current Leader definition is incomplete.');
    const key = `${leader.faction}:${leader.id}`;
    if (leaderIds.has(key)) throw new Error(`Duplicate current Leader: ${key}.`);
    leaderIds.add(key);
  }

  return requireArray(baseFactions, 'base factions').map(baseFaction => {
    const faction = clone(baseFaction);
    const override = manifest.factionOverrides?.[faction.id] || {};
    const currentLeaders = leaders
      .filter(leader => leader.faction === faction.id)
      .map(leader => clone(leader));
    if (!currentLeaders.length) throw new Error(`Current-game authority has no Leaders for ${faction.id}.`);
    return {
      ...faction,
      ...clone(override),
      leaders: currentLeaders,
    };
  });
}

function resolveFactionRules(baseRules, manifest) {
  const rules = clone(baseRules || {});
  for (const [factionId, override] of Object.entries(manifest.factionOverrides || {})) {
    if (!override?.factionRules) continue;
    rules[factionId] = {
      ...(rules[factionId] || {}),
      ...clone(override.factionRules),
    };
  }
  return rules;
}

function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || manifest?.authority !== 'current-game') {
    throw new Error('Invalid current-game authority manifest.');
  }
  if (!manifest.version || !manifest.baseVersion || !manifest.sources) {
    throw new Error('Current-game authority is missing version or source declarations.');
  }
  for (const key of ['baseGameplay', 'cardChanges', 'territories', 'proposals', 'arcaneSymbol', 'componentContract', 'starterDecks']) {
    if (!manifest.sources[key]) throw new Error(`Current-game authority is missing source ${key}.`);
  }
}

async function resolveCurrentGame() {
  const manifest = await loadJson(CURRENT_GAME_AUTHORITY_URL);
  validateManifest(manifest);

  const [base, cardChanges, territorySource, proposalSource, arcaneSymbolSource, componentContract, starterDeckSource, artDirectionSource] = await Promise.all([
    loadJson(manifest.sources.baseGameplay),
    loadJson(manifest.sources.cardChanges),
    loadJson(manifest.sources.territories),
    loadJson(manifest.sources.proposals),
    loadJson(manifest.sources.arcaneSymbol),
    loadJson(manifest.sources.componentContract),
    loadJson(manifest.sources.starterDecks),
    loadText(CURRENT_ART_DIRECTION_SOURCE_URL),
  ]);

  const gameplay = base?.gameplay;
  if (!gameplay || typeof gameplay !== 'object') throw new Error('Current-game base source has no gameplay payload.');
  if (territorySource?.version !== manifest.version || territorySource?.base_version !== manifest.baseVersion) {
    throw new Error(`Current Territory source does not match ${manifest.version} over ${manifest.baseVersion}.`);
  }
  if (proposalSource?.version !== manifest.version || proposalSource?.base_version !== manifest.baseVersion) {
    throw new Error(`Current Proposal source does not match ${manifest.version} over ${manifest.baseVersion}.`);
  }
  if (arcaneSymbolSource?.version !== manifest.version || arcaneSymbolSource?.base_version !== manifest.baseVersion) {
    throw new Error(`Current Arcane-symbol source does not match ${manifest.version} over ${manifest.baseVersion}.`);
  }

  const cards = resolveCards(gameplay.cards, cardChanges, manifest);
  const territories = requireArray(territorySource.territories, 'current Territories').map(territory => ({
    ...clone(territory),
    current_game_version: manifest.version,
    current_game_authority: CURRENT_GAME_AUTHORITY_URL,
  }));
  const proposals = requireArray(proposalSource.proposals, 'current Proposals').map(proposal => clone(proposal));
  const starterDecks = requireArray(starterDeckSource.decks, 'current starter Decks').map(deck => clone(deck));
  const factions = resolveFactions(gameplay.factions, manifest);
  const factionRules = resolveFactionRules(gameplay.faction_rules, manifest);
  const artDirection = parseArtDirectionSource(artDirectionSource);

  const ids = new Set();
  for (const card of cards) {
    if (ids.has(card.id)) throw new Error(`Duplicate resolved playable-card id: ${card.id}.`);
    ids.add(card.id);
  }
  const territoryIds = new Set();
  for (const territory of territories) {
    if (!territory.id || territoryIds.has(territory.id)) throw new Error(`Duplicate or missing resolved Territory id: ${territory.id || 'unknown'}.`);
    territoryIds.add(territory.id);
  }
  const starterIds = new Set();
  for (const deck of starterDecks) {
    if (!deck.id || starterIds.has(deck.id)) throw new Error(`Duplicate or missing current starter Deck id: ${deck.id || 'unknown'}.`);
    starterIds.add(deck.id);
  }

  const resolvedSources = {
    ...clone(manifest.sources),
    artDirection: CURRENT_ART_DIRECTION_SOURCE_URL,
  };

  return Object.freeze({
    schemaVersion: manifest.schemaVersion,
    authority: manifest.authority,
    authorityUrl: CURRENT_GAME_AUTHORITY_URL,
    version: manifest.version,
    displayVersion: manifest.displayVersion || manifest.version,
    baseVersion: manifest.baseVersion,
    status: manifest.status,
    sources: Object.freeze(resolvedSources),
    deckConstruction: Object.freeze(clone(gameplay.deck_construction || {})),
    battlefield: Object.freeze(clone(gameplay.battlefield || {})),
    battle: Object.freeze(clone(gameplay.battle || {})),
    turn: Object.freeze(clone(gameplay.turn || {})),
    setup: Object.freeze(clone(gameplay.setup || {})),
    cardRules: Object.freeze(clone(gameplay.card_rules || {})),
    factionRules: Object.freeze(factionRules),
    factions: Object.freeze(factions),
    leaders: Object.freeze(clone(manifest.leaders)),
    cards: Object.freeze(cards),
    territories: Object.freeze(territories),
    proposals: Object.freeze(proposals),
    starterDecks: Object.freeze(starterDecks),
    starterDeckData: Object.freeze(clone(starterDeckSource)),
    arcaneSymbol: Object.freeze(clone(arcaneSymbolSource)),
    artDirection: Object.freeze(clone(artDirection)),
    mystics: Object.freeze(clone(manifest.mystics || {})),
    componentContract: Object.freeze(clone(componentContract)),
    components: Object.freeze(clone(componentContract.components || [])),
    sharedComponents: Object.freeze(clone(componentContract.sharedComponents || [])),
    sourceMetadata: Object.freeze({
      base: Object.freeze({ target: base.target || null, status: base.status || null }),
      cardChanges: Object.freeze({ status: cardChanges.status || null, sourceIssues: clone(cardChanges.source_issues || []) }),
      territories: Object.freeze({ status: territorySource.status || null, sourceIssue: territorySource.source_issue || null }),
      proposals: Object.freeze({ status: proposalSource.status || null, sourceIssue: proposalSource.source_issue || null }),
      starterDecks: Object.freeze({ version: starterDeckSource.version || null, status: starterDeckSource.status || null }),
      arcaneSymbol: Object.freeze({ changeType: arcaneSymbolSource.change_type || null, mechanicsChanged: arcaneSymbolSource.mechanics_changed }),
      artDirection: Object.freeze({ source: CURRENT_ART_DIRECTION_SOURCE_URL, entries: Object.keys(artDirection).length }),
    }),
    findCard(id) { return cards.find(card => card.id === id) || null; },
    findTerritory(id) { return territories.find(territory => territory.id === id) || null; },
    findLeader(faction, id) { return factions.find(item => item.id === faction)?.leaders.find(leader => leader.id === id) || null; },
    findStarterDeck(faction, leader) { return starterDecks.find(deck => deck.factionId === faction && deck.leaderId === leader) || null; },
    artDirectionFor(id) { return artDirection[id] ? clone(artDirection[id]) : null; },
    slugify,
  });
}

export function loadCurrentGame() {
  if (!currentGamePromise) {
    currentGamePromise = resolveCurrentGame().catch(error => {
      currentGamePromise = null;
      throw error;
    });
  }
  return currentGamePromise;
}
