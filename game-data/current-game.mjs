export const CURRENT_GAME_AUTHORITY_URL = '/game-data/current-game.json';

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

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`Current-game authority expected ${label} to be an array.`);
  return value;
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
  for (const key of ['baseGameplay', 'cardChanges', 'territories', 'proposals', 'arcaneSymbol', 'componentContract']) {
    if (!manifest.sources[key]) throw new Error(`Current-game authority is missing source ${key}.`);
  }
}

async function resolveCurrentGame() {
  const manifest = await loadJson(CURRENT_GAME_AUTHORITY_URL);
  validateManifest(manifest);

  const [base, cardChanges, territorySource, proposalSource, arcaneSymbolSource, componentContract] = await Promise.all([
    loadJson(manifest.sources.baseGameplay),
    loadJson(manifest.sources.cardChanges),
    loadJson(manifest.sources.territories),
    loadJson(manifest.sources.proposals),
    loadJson(manifest.sources.arcaneSymbol),
    loadJson(manifest.sources.componentContract),
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
  const factions = resolveFactions(gameplay.factions, manifest);
  const factionRules = resolveFactionRules(gameplay.faction_rules, manifest);

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

  return Object.freeze({
    schemaVersion: manifest.schemaVersion,
    authority: manifest.authority,
    authorityUrl: CURRENT_GAME_AUTHORITY_URL,
    version: manifest.version,
    displayVersion: manifest.displayVersion || manifest.version,
    baseVersion: manifest.baseVersion,
    status: manifest.status,
    sources: Object.freeze(clone(manifest.sources)),
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
    arcaneSymbol: Object.freeze(clone(arcaneSymbolSource)),
    mystics: Object.freeze(clone(manifest.mystics || {})),
    componentContract: Object.freeze(clone(componentContract)),
    components: Object.freeze(clone(componentContract.components || [])),
    sharedComponents: Object.freeze(clone(componentContract.sharedComponents || [])),
    sourceMetadata: Object.freeze({
      base: Object.freeze({ target: base.target || null, status: base.status || null }),
      cardChanges: Object.freeze({ status: cardChanges.status || null, sourceIssues: clone(cardChanges.source_issues || []) }),
      territories: Object.freeze({ status: territorySource.status || null, sourceIssue: territorySource.source_issue || null }),
      proposals: Object.freeze({ status: proposalSource.status || null, sourceIssue: proposalSource.source_issue || null }),
      arcaneSymbol: Object.freeze({ changeType: arcaneSymbolSource.change_type || null, mechanicsChanged: arcaneSymbolSource.mechanics_changed }),
    }),
    findCard(id) { return cards.find(card => card.id === id) || null; },
    findTerritory(id) { return territories.find(territory => territory.id === id) || null; },
    findLeader(faction, id) { return factions.find(item => item.id === faction)?.leaders.find(leader => leader.id === id) || null; },
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
