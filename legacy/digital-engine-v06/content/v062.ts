import canonicalBaseJson from '../../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json';
import {
  buildV062CanonicalData,
  NEW_CARD_NAMES,
  V062_VERSION,
} from '../../legacy/public-versions/v0.6.2/data/canonical-data.js';
import type {
  CanonicalContentIndex,
  CanonicalFaction,
  CanonicalGauntletContent,
  CanonicalLeader,
} from './types';

export const V062_RULES_VERSION = V062_VERSION;
export const V062_NEW_CARD_NAMES = NEW_CARD_NAMES;

function assertCanonicalContent(value: unknown): asserts value is CanonicalGauntletContent {
  if (!value || typeof value !== 'object') throw new Error('Canonical content must be an object.');
  const content = value as Partial<CanonicalGauntletContent>;

  if (content.version !== V062_RULES_VERSION) {
    throw new Error(`Expected canonical rules version ${V062_RULES_VERSION}, received ${String(content.version)}.`);
  }
  if (!Array.isArray(content.factions) || content.factions.length !== 6) {
    throw new Error('v0.6.2 canonical content must include exactly six factions.');
  }
  if (!Array.isArray(content.cards) || content.cards.length !== 128) {
    throw new Error('v0.6.2 canonical content must include exactly 128 playable card titles.');
  }
  if (!Array.isArray(content.territories) || content.territories.length !== 25) {
    throw new Error('v0.6.2 canonical content must include exactly 25 Territories.');
  }
  if (!content.deck_construction || !content.battlefield || !content.battle) {
    throw new Error('v0.6.2 canonical content is missing shared rules metadata.');
  }
}

function uniqueMap<T>(items: readonly T[], keyFor: (item: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const key = keyFor(item);
    if (result.has(key)) throw new Error(`Duplicate v0.6.2 ${label}: ${key}`);
    result.set(key, item);
  }
  return result;
}

function leaderEntries(factions: readonly CanonicalFaction[]): Array<CanonicalLeader & { factionId: string }> {
  return factions.flatMap((faction) => faction.leaders.map((leader) => ({ ...leader, factionId: faction.id })));
}

export function loadV062CanonicalContent(): CanonicalContentIndex {
  const raw: unknown = buildV062CanonicalData(canonicalBaseJson);
  assertCanonicalContent(raw);

  const factionsById = uniqueMap(raw.factions, (faction) => faction.id, 'faction id');
  const leadersByName = uniqueMap(leaderEntries(raw.factions), (leader) => leader.name, 'Leader name');
  const cardsById = uniqueMap(raw.cards, (card) => card.id, 'card id');
  const territoriesById = uniqueMap(raw.territories, (territory) => territory.id, 'Territory id');

  const neutralCount = raw.cards.filter((card) => card.allegiance === 'Neutral').length;
  if (neutralCount !== 50) throw new Error(`Expected 50 Neutral cards, received ${neutralCount}.`);
  for (const faction of raw.factions) {
    const count = raw.cards.filter((card) => card.allegiance === faction.name).length;
    if (count !== 13) throw new Error(`Expected 13 ${faction.name} cards, received ${count}.`);
  }

  return {
    rulesVersion: raw.version,
    releaseName: raw.name,
    content: raw,
    factionsById,
    leadersByName,
    cardsById,
    territoriesById,
  };
}

export const v062CanonicalContent = loadV062CanonicalContent();
