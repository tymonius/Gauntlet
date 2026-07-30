import canonicalJson from '../../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json';
import type {
  CanonicalContentIndex,
  CanonicalFaction,
  CanonicalGauntletContent,
  CanonicalLeader,
} from './types';
import { isCanonicalBattleRulesV061 } from './types';

export const V061_RULES_VERSION = 'v0.6.1' as const;

const EXPECTED_BATTLE_SEQUENCE = [
  'opening_effects',
  'set_gambits',
  'form_reserves',
  'reveal_gambits',
  'choose_tactics',
  'reveal_tactics',
  'resolve_battle',
  'aftermath',
] as const;

function assertCanonicalContent(value: unknown): asserts value is CanonicalGauntletContent {
  if (!value || typeof value !== 'object') throw new Error('Canonical content must be an object.');
  const content = value as Partial<CanonicalGauntletContent>;

  if (content.version !== V061_RULES_VERSION) {
    throw new Error(`Expected canonical rules version ${V061_RULES_VERSION}, received ${String(content.version)}.`);
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
  if (!isCanonicalBattleRulesV061(content.battle)) {
    throw new Error('v0.6.1 canonical content must use the Gambit / Reserve / Tactic battle schema.');
  }
  if (content.battle.normal_reserve_size !== 3) {
    throw new Error(`Expected a normal Reserve size of 3, received ${content.battle.normal_reserve_size}.`);
  }
  if (content.battle.normal_gambits !== 1 || content.battle.normal_tactics !== 1) {
    throw new Error('Expected the v0.6.1 normal limit of one Gambit and one Tactic.');
  }
  if (content.battle.sequence.join('|') !== EXPECTED_BATTLE_SEQUENCE.join('|')) {
    throw new Error(`Unexpected v0.6.1 battle sequence: ${content.battle.sequence.join(', ')}`);
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

export function loadV061CanonicalContent(): CanonicalContentIndex {
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

export const v061CanonicalContent = loadV061CanonicalContent();
