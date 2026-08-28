import starterDecksJson from '../../releases/v0.7.0/Gauntlet_v0.7.0_Starter_Decks.json';
import {
  V070_RULES_VERSION,
  v070CanonicalContent,
  type V070CanonicalCard,
  type V070CanonicalTerritory,
} from '../content/v070';

export const V070_STARTER_DECK_SOURCE =
  'releases/v0.7.0/Gauntlet_v0.7.0_Starter_Decks.json' as const;

export interface V070StarterDeckCardEntry {
  name: string;
  quantity: number;
}

export interface V070StarterDeckDefinition {
  id: string;
  factionId: string;
  leaderId: string;
  name: string;
  recommendedFirstLeader: boolean;
  summary: string;
  strategy: string;
  signatureCards: string[];
  territories: string[];
  cards: V070StarterDeckCardEntry[];
  cardCount: number;
  deckbuildingValue: number;
}

export interface V070StarterDeckPackage {
  version: typeof V070_RULES_VERSION;
  status: string;
  construction: {
    minimumCards: number;
    maximumDeckbuildingValue: number;
    territoryCount: number;
    maximumArenas: number;
    uniqueCopyLimit: number;
  };
  decks: V070StarterDeckDefinition[];
}

export interface V070ResolvedStarterDeck {
  definition: V070StarterDeckDefinition;
  cards: Array<{ card: V070CanonicalCard; quantity: number }>;
  territories: V070CanonicalTerritory[];
}

function uniqueNameMap<T extends { name: string }>(items: readonly T[], label: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.name)) throw new Error(`Duplicate v0.7.0 ${label} name: ${item.name}`);
    map.set(item.name, item);
  }
  return map;
}

function normalizeLeaderId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function assertStarterPackage(value: unknown): asserts value is V070StarterDeckPackage {
  if (!value || typeof value !== 'object') throw new Error('v0.7.0 starter package must be an object.');
  const pkg = value as Partial<V070StarterDeckPackage>;
  if (pkg.version !== V070_RULES_VERSION) {
    throw new Error('Starter Deck package must match the current v0.7.0 rules version.');
  }
  if (!Array.isArray(pkg.decks) || pkg.decks.length !== 12) {
    throw new Error('v0.7.0 public starter package must contain exactly 12 Decks.');
  }
  if (!pkg.construction
    || pkg.construction.minimumCards !== 30
    || pkg.construction.maximumDeckbuildingValue !== 60
    || pkg.construction.territoryCount !== 3
    || pkg.construction.maximumArenas !== 1) {
    throw new Error('v0.7.0 starter construction contract drifted from the released package.');
  }
}

export function loadV070StarterDecks(): ReadonlyMap<string, V070ResolvedStarterDeck> {
  const raw: unknown = starterDecksJson;
  assertStarterPackage(raw);

  const cardsByName = uniqueNameMap(v070CanonicalContent.content.cards, 'card');
  const territoriesByName = uniqueNameMap(v070CanonicalContent.content.territories, 'Territory');
  const result = new Map<string, V070ResolvedStarterDeck>();

  for (const deck of raw.decks) {
    if (result.has(deck.id)) throw new Error(`Duplicate v0.7.0 starter Deck id: ${deck.id}`);

    const faction = v070CanonicalContent.factionsById.get(deck.factionId);
    if (!faction) throw new Error(`Starter Deck ${deck.id} references unknown faction ${deck.factionId}.`);
    if (!faction.leaders.some(leader => normalizeLeaderId(leader.name) === deck.leaderId)) {
      throw new Error(`Starter Deck ${deck.id} references unknown Leader ${deck.leaderId}.`);
    }

    const cards = deck.cards.map(entry => {
      if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
        throw new Error(`Starter Deck ${deck.id} has invalid quantity for ${entry.name}.`);
      }
      const card = cardsByName.get(entry.name);
      if (!card) throw new Error(`Starter Deck ${deck.id} references unknown card ${entry.name}.`);
      if (card.allegiance !== 'Neutral' && card.allegiance !== faction.name) {
        throw new Error(`Starter Deck ${deck.id} contains off-faction card ${entry.name}.`);
      }
      return { card, quantity: entry.quantity };
    });

    const cardCount = cards.reduce((total, entry) => total + entry.quantity, 0);
    const deckbuildingValue = cards.reduce((total, entry) => total + entry.card.cost * entry.quantity, 0);
    if (cardCount !== deck.cardCount || cardCount !== raw.construction.minimumCards) {
      throw new Error(`Starter Deck ${deck.id} must contain exactly 30 cards.`);
    }
    if (deckbuildingValue !== deck.deckbuildingValue
      || deckbuildingValue > raw.construction.maximumDeckbuildingValue) {
      throw new Error(`Starter Deck ${deck.id} has invalid Deckbuilding Value.`);
    }

    if (deck.territories.length !== raw.construction.territoryCount) {
      throw new Error(`Starter Deck ${deck.id} must contain exactly three Territories.`);
    }
    const territories = deck.territories.map(name => {
      const territory = territoriesByName.get(name);
      if (!territory) throw new Error(`Starter Deck ${deck.id} references unknown Territory ${name}.`);
      return territory;
    });
    if (new Set(territories.map(territory => territory.id)).size !== territories.length) {
      throw new Error(`Starter Deck ${deck.id} contains duplicate Territories.`);
    }
    const arenaCount = territories.filter(territory => territory.name.startsWith('Arena:')).length;
    if (arenaCount > raw.construction.maximumArenas) {
      throw new Error(`Starter Deck ${deck.id} exceeds the one-Arena limit.`);
    }

    result.set(deck.id, { definition: deck, cards, territories });
  }

  return result;
}

export const v070StarterDecks = loadV070StarterDecks();
