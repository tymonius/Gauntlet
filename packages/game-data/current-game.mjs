import { resolveArtDirection } from './art-direction.mjs';
import { requireCurrentArray, validateCurrentGameAuthority } from './current-game-validation.mjs';

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

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function runtimeLeader(source) {
  return clone(source);
}

async function resolveCurrentGame() {
  const authority = await loadJson(CURRENT_GAME_AUTHORITY_URL);
  validateCurrentGameAuthority(authority);

  const gameplay = clone(authority.gameplay);
  const cards = gameplay.cards.map(clone);
  const territories = gameplay.territories.map(clone);
  const factions = gameplay.factions.map(faction => ({
    ...clone(faction),
    leaders: requireCurrentArray(faction.leaders, `${faction.id} Leaders`).map(runtimeLeader),
  }));
  const leaders = authority.leaders.map(runtimeLeader);
  const starterDeckData = clone(authority.starterDecks);
  const starterDecks = starterDeckData.decks.map(clone);
  const visualPolicy = clone(authority.visualPolicy || {});
  const artDirection = clone(authority.artDirection || {});
  const componentContract = clone(authority.componentContract || {});

  return Object.freeze({
    schemaVersion: authority.schemaVersion,
    authority: authority.authority,
    authorityUrl: CURRENT_GAME_AUTHORITY_URL,
    visualAuthorityUrl: CURRENT_GAME_AUTHORITY_URL,
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
    visualPolicy: Object.freeze(visualPolicy),
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
    artDirectionFor(id) { return clone(resolveArtDirection(visualPolicy, artDirection, id)); },
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

function bridgedRenderGame() {
  if (typeof window === 'undefined' || window === window.top) return null;
  try {
    const bridge = window.top.__gauntletFaceAuthorityBridge
      || window.top.__gauntletProductionAuthorityBridge;
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
  const bridged = bridgedRenderGame();
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
