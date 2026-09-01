export const CURRENT_GAME_AUTHORITY_URL = '/game-data/current-game.json';

let currentGamePromise = null;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Current-game authority request failed for ${url}: HTTP ${response.status}.`);
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

function validateLeader(leader) {
  if (!leader?.id || !leader?.faction || !leader?.name) {
    throw new Error('A current Leader definition is incomplete.');
  }
  const sections = requireArray(leader.sections, `${leader.id} Leader sections`);
  if (!sections.length) throw new Error(`Current Leader ${leader.id} has no sections.`);

  const classifications = new Set(['Faction Victory', 'Leader Ability', 'Resource', 'Progression']);
  for (const section of sections) {
    if (!section?.name || !classifications.has(section.classification)) {
      throw new Error(`Current Leader ${leader.id} has an invalid section classification.`);
    }
    if (section.items !== undefined) {
      const items = requireArray(section.items, `${leader.id} grouped Leader Ability items`);
      if (section.classification !== 'Leader Ability' || !items.length) {
        throw new Error(`Current Leader ${leader.id} groups items outside a Leader Ability.`);
      }
      for (const item of items) {
        if (!item?.name || !item?.text) {
          throw new Error(`Current Leader ${leader.id} has an incomplete grouped ability.`);
        }
      }
    }
  }
  if (!sections.some(section => section.classification === 'Faction Victory')) {
    throw new Error(`Current Leader ${leader.id} is missing Faction Victory.`);
  }
  if (!sections.some(section => section.classification === 'Leader Ability')) {
    throw new Error(`Current Leader ${leader.id} is missing Leader Ability.`);
  }
}

function runtimeLeader(source) {
  return clone(source);
}

function validateMysticsStarterRites(authority) {
  const policy = authority.mystics?.selectionPolicy;
  const rites = requireArray(authority.mystics?.rites, 'Mystics Rite pool');
  const selectedCount = Number(policy?.selectedCount);
  if (!Number.isInteger(selectedCount) || selectedCount <= 0) {
    throw new Error('Current Mystics Rite selection policy has no valid selectedCount.');
  }
  const riteIds = new Set(rites.map(rite => rite?.id).filter(Boolean));
  for (const deck of requireArray(authority.starterDecks?.decks, 'starter Decks')) {
    if (deck.factionId !== 'mystics') continue;
    const selected = requireArray(deck.selectedRites, `${deck.id} selected Rites`);
    const order = requireArray(deck.recommendedRiteOrder, `${deck.id} recommended Rite order`);
    if (selected.length !== selectedCount || new Set(selected).size !== selected.length) {
      throw new Error(`Mystics starter ${deck.id} must select exactly ${selectedCount} different Rites.`);
    }
    if (selected.some(id => !riteIds.has(id))) {
      throw new Error(`Mystics starter ${deck.id} references an unknown selected Rite.`);
    }
    if (order.length !== selected.length || new Set(order).size !== order.length) {
      throw new Error(`Mystics starter ${deck.id} recommended Rite order must contain each selected Rite exactly once.`);
    }
    const selectedSorted = [...selected].sort();
    const orderSorted = [...order].sort();
    if (selectedSorted.some((id, index) => id !== orderSorted[index])) {
      throw new Error(`Mystics starter ${deck.id} recommended Rite order is not a permutation of its selected Rites.`);
    }
  }
}

function validateFactionFeatures(authority) {
  const taxonomy = authority.factionFeatureTaxonomy;
  if (!taxonomy?.factionFeature || !taxonomy?.leaderAbility || !taxonomy?.actionProfiles) {
    throw new Error('Current-game authority is missing the Faction Feature taxonomy.');
  }
  const profiles = new Set(['1 Action', 'No Action', 'Automatic']);
  for (const profile of profiles) {
    if (!taxonomy.actionProfiles[profile]) throw new Error(`Faction Feature taxonomy is missing ${profile}.`);
  }

  for (const factionId of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
    for (const feature of requireArray(authority.factionFeatures?.[factionId], `${factionId} Faction Features`)) {
      if (!feature?.name || !profiles.has(feature.profile) || !feature?.timing) {
        throw new Error(`Current ${factionId} Faction Feature is incomplete.`);
      }
    }
  }
  if (authority.factionFeatures.military.length) {
    throw new Error('Military Orders are Leader Abilities and must not appear as shared Military Faction Features.');
  }
}

function validateAuthority(authority) {
  if (authority?.schemaVersion !== 2 || authority?.authority !== 'current-game') {
    throw new Error('Invalid complete current-game authority.');
  }
  if (!authority.version || !authority.displayVersion || !authority.gameplay || !authority.provenance) {
    throw new Error('Current-game authority is missing identity, gameplay, or provenance.');
  }
  for (const forbidden of ['sources', 'resolution', 'baseVersion', 'factionOverrides']) {
    if (Object.prototype.hasOwnProperty.call(authority, forbidden)) {
      throw new Error(`Current-game authority still exposes transitional field ${forbidden}.`);
    }
  }

  const gameplay = authority.gameplay;
  requireArray(gameplay.cards, 'playable cards');
  requireArray(gameplay.territories, 'Territories');
  requireArray(gameplay.factions, 'factions');
  requireArray(authority.proposals, 'Proposals');
  requireArray(authority.starterDecks?.decks, 'starter Decks');
  requireArray(authority.leaders, 'Leaders');
  validateMysticsStarterRites(authority);
  validateFactionFeatures(authority);
  authority.leaders.forEach(validateLeader);

  const ids = new Set();
  for (const card of gameplay.cards) {
    if (!card?.id || !card?.name || ids.has(card.id)) throw new Error(`Duplicate or incomplete playable card ${card?.id || '(missing id)'}.`);
    ids.add(card.id);
  }

  const headingRules = gameplay.card_rules?.effect_headings;
  const supportedHeadings = new Set(requireArray(headingRules?.supported, 'supported card effect headings'));
  const declaredPresentHeadings = new Set(requireArray(headingRules?.all_present_headings, 'present card effect headings'));
  const retiredHeadings = new Set(requireArray(headingRules?.retired, 'retired card effect headings'));
  const actualHeadings = new Set();

  for (const card of gameplay.cards) {
    for (const effect of requireArray(card.effects, `${card.id} effects`)) {
      const label = String(effect?.label || '').trim();
      if (!label) throw new Error(`Current card ${card.id} has an effect without a heading.`);
      if (!supportedHeadings.has(label)) {
        throw new Error(`Current card ${card.id} uses unsupported effect heading ${label}.`);
      }
      if (retiredHeadings.has(label)) {
        throw new Error(`Current card ${card.id} still uses retired effect heading ${label}.`);
      }
      actualHeadings.add(label);
    }
  }

  if (actualHeadings.size !== declaredPresentHeadings.size
    || [...actualHeadings].some(label => !declaredPresentHeadings.has(label))) {
    throw new Error('Current card effect-heading taxonomy does not match the headings actually present on cards.');
  }

  const territoryIds = new Set();
  for (const territory of gameplay.territories) {
    if (!territory?.id || territoryIds.has(territory.id)) throw new Error(`Duplicate or incomplete Territory ${territory?.id || '(missing id)'}.`);
    territoryIds.add(territory.id);
  }

  const active = JSON.stringify({
    gameplay: authority.gameplay,
    proposals: authority.proposals,
    arcaneSymbol: authority.arcaneSymbol,
    factionFeatureTaxonomy: authority.factionFeatureTaxonomy,
    factionFeatures: authority.factionFeatures,
    leaders: authority.leaders,
    mystics: authority.mystics,
  });
  const retired = active.match(/\bpending(?:-|\s+)battles?\b|\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/iu);
  if (retired) throw new Error(`Current-game authority still contains retired terminology: ${retired[0]}.`);
}

async function resolveCurrentGame() {
  const authority = await loadJson(CURRENT_GAME_AUTHORITY_URL);
  validateAuthority(authority);

  const gameplay = clone(authority.gameplay);
  const cards = gameplay.cards.map(clone);
  const territories = gameplay.territories.map(clone);
  const factions = gameplay.factions.map(faction => ({
    ...clone(faction),
    leaders: requireArray(faction.leaders, `${faction.id} Leaders`).map(runtimeLeader),
  }));
  const leaders = authority.leaders.map(runtimeLeader);
  const starterDeckData = clone(authority.starterDecks);
  const starterDecks = starterDeckData.decks.map(clone);
  const artDirection = clone(authority.artDirection || {});
  const componentContract = clone(authority.componentContract || {});

  return Object.freeze({
    schemaVersion: authority.schemaVersion,
    authority: authority.authority,
    authorityUrl: CURRENT_GAME_AUTHORITY_URL,
    version: authority.version,
    displayVersion: authority.displayVersion,
    status: authority.status,
    runtimePolicy: authority.runtimePolicy,
    provenance: Object.freeze(clone(authority.provenance)),
    deckConstruction: Object.freeze(clone(gameplay.deck_construction || {})),
    battlefield: Object.freeze(clone(gameplay.battlefield || {})),
    battle: Object.freeze(clone(gameplay.battle || {})),
    turn: Object.freeze(clone(gameplay.turn || {})),
    setup: Object.freeze(clone(gameplay.setup || {})),
    cardRules: Object.freeze(clone(gameplay.card_rules || {})),
    factionRules: Object.freeze(clone(gameplay.faction_rules || {})),
    factionFeatureTaxonomy: Object.freeze(clone(authority.factionFeatureTaxonomy)),
    factionFeatures: Object.freeze(clone(authority.factionFeatures)),
    factions: Object.freeze(factions),
    leaders: Object.freeze(leaders),
    cards: Object.freeze(cards),
    territories: Object.freeze(territories),
    proposals: Object.freeze(authority.proposals.map(clone)),
    starterDecks: Object.freeze(starterDecks),
    starterDeckData: Object.freeze(starterDeckData),
    arcaneSymbol: Object.freeze(clone(authority.arcaneSymbol || {})),
    artDirection: Object.freeze(artDirection),
    mystics: Object.freeze(clone(authority.mystics || {})),
    componentContract: Object.freeze(componentContract),
    components: Object.freeze(clone(componentContract.components || [])),
    sharedComponents: Object.freeze(clone(componentContract.sharedComponents || [])),
    findCard(id) { return cards.find(card => card.id === id) || null; },
    findTerritory(id) { return territories.find(territory => territory.id === id) || null; },
    findLeader(faction, id) { return factions.find(item => item.id === faction)?.leaders.find(leader => leader.id === id) || null; },
    findFactionFeatures(faction) { return clone(authority.factionFeatures[faction] || []); },
    findStarterDeck(faction, leader) { return starterDecks.find(deck => deck.factionId === faction && deck.leaderId === leader) || null; },
    artDirectionFor(id) { return artDirection[id] ? clone(artDirection[id]) : null; },
    slugify,
  });
}

function requestedRulesetMode() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('rules') || '';
}

function explicitlyRequestsReleasedRuleset() {
  return requestedRulesetMode() === 'released';
}

function bridgedProductionGame() {
  if (typeof window === 'undefined' || window === window.top) return null;
  try {
    const bridge = window.top.__gauntletProductionAuthorityBridge;
    const runtime = bridge?.runtime;
    if (!runtime?.cards?.length || !runtime?.territories?.length || !runtime?.componentContract) return null;

    const requestedMode = requestedRulesetMode();
    if (requestedMode && bridge.rulesetMode && requestedMode !== bridge.rulesetMode) return null;
    return runtime;
  } catch {
    return null;
  }
}

async function resolveRequestedGame() {
  const bridged = bridgedProductionGame();
  if (bridged) return bridged;
  if (!explicitlyRequestsReleasedRuleset()) return resolveCurrentGame();
  const { loadPublishedGame } = await import('./ruleset.mjs');
  return loadPublishedGame();
}

export function loadCurrentGame() {
  if (!currentGamePromise) {
    currentGamePromise = resolveRequestedGame().catch(error => {
      currentGamePromise = null;
      throw error;
    });
  }
  return currentGamePromise;
}
