export const RELEASED_MODE = 'released';
export const CANDIDATE_MODE = 'candidate';
export const PUBLISHED_VERSION = 'v0.7.1';
export const PUBLISHED_AUTHORITY_URL = '/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json';
export const PUBLISHED_STARTER_DECKS_URL = '/releases/v0.7.1/Gauntlet_v0.7.1_Starter_Decks.json';

let publishedPromise = null;
let candidatePromise = null;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Gauntlet ruleset request failed for ${url}: HTTP ${response.status}.`);
  return response.json();
}

export function rulesetModeFromUrl(url = typeof window !== 'undefined' ? window.location.href : 'https://gauntlet.run/deckbuilder/') {
  const parsed = new URL(url, 'https://gauntlet.run/');
  return parsed.searchParams.get('rules') === CANDIDATE_MODE ? CANDIDATE_MODE : RELEASED_MODE;
}

// Production render surfaces historically default to current-game. They only
// enter released mode when the embedding Deckbuilder explicitly requests it.
export function renderRulesetModeFromUrl(url = typeof window !== 'undefined' ? window.location.href : 'https://gauntlet.run/card-design/') {
  const parsed = new URL(url, 'https://gauntlet.run/');
  return parsed.searchParams.get('rules') === RELEASED_MODE ? RELEASED_MODE : CANDIDATE_MODE;
}

function runtimeLeader(source) {
  return clone(source);
}

function normalizePublishedComponentContract(source, authority) {
  const contract = clone(source || {});
  contract.components = (contract.components || []).map(component => {
    if (component.id !== 'financiers-capital-ledger') return component;
    return {
      ...component,
      backPolicy: 'twoSided',
      reverse: component.reverse || 'Identical Capital Ledger face',
    };
  });

  const ritual = authority?.mystics?.ritual;
  if (ritual?.id && !contract.components.some(component => component.id === `mystics-ritual-of-${ritual.id}`)) {
    contract.components.push({
      id: `mystics-ritual-of-${ritual.id}`,
      name: ritual.name || 'Ritual of Ascension',
      faction: 'mystics',
      family: 'ritual-card',
      quantity: 1,
      cardLike: true,
      designStatus: 'final',
      productionStatus: 'ready',
      backPolicy: 'specialBack',
      specialBackFile: String(ritual.cardBack || '').replace(/^\//, ''),
      source: PUBLISHED_AUTHORITY_URL.replace(/^\//, ''),
      renderSource: {
        surface: 'card-design/rite-card.js',
        kind: 'ritual',
        componentId: ritual.id,
      },
      tts: { representation: 'card' },
    });
  }
  return contract;
}

export function normalizePublishedGame(authority, starterDeckData) {
  if (!authority?.gameplay || !Array.isArray(authority.gameplay.cards) || !Array.isArray(authority.gameplay.territories)) {
    throw new Error('Published Gauntlet authority is incomplete.');
  }
  if (!starterDeckData || !Array.isArray(starterDeckData.decks)) {
    throw new Error('Published Gauntlet starter Deck authority is incomplete.');
  }

  const gameplay = clone(authority.gameplay);
  const version = String(authority.release_version || authority.source_version || PUBLISHED_VERSION);
  if (version !== PUBLISHED_VERSION || String(starterDeckData.version || '') !== PUBLISHED_VERSION) {
    throw new Error(`Published Deckbuilder sources do not agree on ${PUBLISHED_VERSION}.`);
  }

  const cards = gameplay.cards.map(clone);
  const territories = gameplay.territories.map(clone);
  const factions = (gameplay.factions || []).map(faction => ({
    ...clone(faction),
    leaders: (faction.leaders || []).map(runtimeLeader),
  }));
  const leaders = (authority.leaders || []).map(runtimeLeader);
  const starterDecks = starterDeckData.decks.map(clone);
  const componentContract = normalizePublishedComponentContract(authority.component_contract, authority);
  const factionFeatures = clone(authority.faction_features || {});
  const artDirection = {};

  return Object.freeze({
    schemaVersion: Number(authority.schema_version) || 1,
    authority: 'published-release',
    authorityUrl: PUBLISHED_AUTHORITY_URL,
    version,
    displayVersion: version,
    status: authority.status || 'published',
    runtimePolicy: Object.freeze({ mode: RELEASED_MODE, immutable: true }),
    provenance: Object.freeze(clone(authority.provenance || {})),
    deckConstruction: Object.freeze(clone(gameplay.deck_construction || {})),
    battlefield: Object.freeze(clone(gameplay.battlefield || {})),
    battle: Object.freeze(clone(gameplay.battle || {})),
    turn: Object.freeze(clone(gameplay.turn || {})),
    setup: Object.freeze(clone(gameplay.setup || {})),
    cardRules: Object.freeze(clone(gameplay.card_rules || {})),
    factionRules: Object.freeze(clone(gameplay.faction_rules || {})),
    factionFeatureTaxonomy: Object.freeze(clone(authority.faction_feature_taxonomy || {})),
    factionFeatures: Object.freeze(factionFeatures),
    factions: Object.freeze(factions),
    leaders: Object.freeze(leaders),
    cards: Object.freeze(cards),
    territories: Object.freeze(territories),
    proposals: Object.freeze((authority.proposals || []).map(clone)),
    starterDecks: Object.freeze(starterDecks),
    starterDeckData: Object.freeze(clone(starterDeckData)),
    arcaneSymbol: Object.freeze(clone(authority.arcane_symbol || {})),
    artDirection: Object.freeze(artDirection),
    mystics: Object.freeze(clone(authority.mystics || {})),
    componentContract: Object.freeze(componentContract),
    components: Object.freeze(clone(componentContract.components || [])),
    sharedComponents: Object.freeze(clone(componentContract.sharedComponents || [])),
    findCard(id) { return cards.find(card => card.id === id) || null; },
    findTerritory(id) { return territories.find(territory => territory.id === id) || null; },
    findLeader(faction, id) {
      return leaders.find(leader => leader.faction === faction && leader.id === id)
        || factions.find(item => item.id === faction)?.leaders?.find(leader => leader.id === id)
        || null;
    },
    findFactionFeatures(faction) { return clone(factionFeatures[faction] || []); },
    findStarterDeck(faction, leader) {
      return starterDecks.find(deck => deck.factionId === faction && deck.leaderId === leader) || null;
    },
    artDirectionFor() { return null; },
  });
}

export function loadPublishedGame() {
  if (!publishedPromise) {
    publishedPromise = Promise.all([
      loadJson(PUBLISHED_AUTHORITY_URL),
      loadJson(PUBLISHED_STARTER_DECKS_URL),
    ])
      .then(([authority, starters]) => normalizePublishedGame(authority, starters))
      .catch(error => {
        publishedPromise = null;
        throw error;
      });
  }
  return publishedPromise;
}

export function loadCurrentCandidateGame() {
  if (!candidatePromise) {
    candidatePromise = import('./current-game.mjs')
      .then(module => module.loadCurrentGame())
      .catch(error => {
        candidatePromise = null;
        throw error;
      });
  }
  return candidatePromise;
}

export function loadGameRuleset(mode = RELEASED_MODE) {
  return mode === CANDIDATE_MODE ? loadCurrentCandidateGame() : loadPublishedGame();
}
