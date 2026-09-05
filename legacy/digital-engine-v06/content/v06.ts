import canonicalJson from '../../releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json';
import type {
  CanonicalContentIndex,
  CanonicalFaction,
  CanonicalGauntletContent,
  CanonicalLeader,
} from './types';

export const V06_RULES_VERSION = 'v0.6.0' as const;

function assertCanonicalContent(value: unknown): asserts value is CanonicalGauntletContent {
  if (!value || typeof value !== 'object') throw new Error('Canonical content must be an object.');
  const content = value as Partial<CanonicalGauntletContent>;

  if (content.version !== V06_RULES_VERSION) {
    throw new Error(`Expected canonical rules version ${V06_RULES_VERSION}, received ${String(content.version)}.`);
  }
  if (!Array.isArray(content.factions) || content.factions.length === 0) {
    throw new Error('Canonical content must include factions.');
  }
  if (!Array.isArray(content.cards) || content.cards.length === 0) {
    throw new Error('Canonical content must include cards.');
  }
  if (!Array.isArray(content.territories) || content.territories.length === 0) {
    throw new Error('Canonical content must include Territories.');
  }
  if (!content.deck_construction || !content.battlefield || !content.battle) {
    throw new Error('Canonical content is missing shared rules metadata.');
  }
}

function uniqueMap<T>(items: readonly T[], keyFor: (item: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const key = keyFor(item);
    if (result.has(key)) throw new Error(`Duplicate canonical ${label}: ${key}`);
    result.set(key, item);
  }
  return result;
}

function leaderEntries(factions: readonly CanonicalFaction[]): Array<CanonicalLeader & { factionId: string }> {
  return factions.flatMap((faction) => faction.leaders.map((leader) => ({ ...leader, factionId: faction.id })));
}

export function loadV06CanonicalContent(): CanonicalContentIndex {
  const raw: unknown = canonicalJson;
  assertCanonicalContent(raw);

  const factionsById = uniqueMap(raw.factions, (faction) => faction.id, 'faction id');
  const leadersByName = uniqueMap(leaderEntries(raw.factions), (leader) => leader.name, 'Leader name');
  const cardsById = uniqueMap(raw.cards, (card) => card.id, 'card id');
  const territoriesById = uniqueMap(raw.territories, (territory) => territory.id, 'Territory id');

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

export const v06CanonicalContent = loadV06CanonicalContent();
