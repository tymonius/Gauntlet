import baseGameplayJson from '../../artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json';
import currentGameAuthorityJson from '../../game-data/current-game.json';
import cardChangesJson from '../../legacy/v0.6.4-candidate/v0.6.4-card-additions.json';
import rulesSourceJson from '../../legacy/v0.6.4-candidate/v0.6.4-rules.json';
import territorySourceJson from '../../legacy/v0.6.4-candidate/v0.6.4-territories.json';
import {
  cleanV063Content,
  type CleanV063Card,
  type CleanV063Gameplay,
  type CleanV063Territory,
} from '../../legacy/digital-engine-reconstruction/clean-v063/content';

interface CurrentGameAuthorityCompatibility {
  authority: string;
  version: string;
  baseVersion?: string;
  leaders: Array<{ id: string; faction: string; name: string; image: string }>;
  sources?: { baseGameplay?: string; cardChanges?: string; rules?: string; territories?: string };
  provenance?: {
    historicalBaseVersion?: string;
    transitionalSourceVersion?: string;
    historicalInputs?: { baseGameplay?: string; cardChanges?: string; rules?: string; territories?: string };
  };
}

const currentGameAuthority = currentGameAuthorityJson as unknown as CurrentGameAuthorityCompatibility;

function candidateAuthorityMetadata() {
  return {
    version: currentGameAuthority.version === V064_CANDIDATE_RULES_VERSION
      ? currentGameAuthority.version
      : currentGameAuthority.provenance?.transitionalSourceVersion,
    baseVersion: currentGameAuthority.baseVersion
      ?? currentGameAuthority.provenance?.historicalBaseVersion,
    sources: currentGameAuthority.sources
      ?? currentGameAuthority.provenance?.historicalInputs
      ?? {},
  };
}

export const CURRENT_GAME_AUTHORITY_PATH = 'game-data/current-game.json' as const;
export const V064_CANDIDATE_RULES_VERSION = 'v0.6.4-candidate' as const;
export const V064_TERRITORY_SOURCE_ISSUE = 738 as const;
const BUNDLED_BASE_GAMEPLAY_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json' as const;
const BUNDLED_CARD_CHANGES_SOURCE = '/docs/v0.6.4-card-additions.json' as const;
const BUNDLED_RULES_SOURCE = '/docs/v0.6.4-rules.json' as const;
const BUNDLED_TERRITORY_SOURCE = '/docs/v0.6.4-territories.json' as const;

interface CurrentBaseGameplaySource {
  gameplay: {
    battle: Record<string, unknown>;
  } & Record<string, unknown>;
}

interface CurrentCardChangesSource {
  version: typeof V064_CANDIDATE_RULES_VERSION;
  base_version: 'v0.6.3';
  cards: Array<CleanV063Card & Record<string, unknown>>;
  retired_cards: Array<{ id?: string; name?: string }>;
}

interface CurrentRuleCardTextOverride {
  id: string;
  label: string;
  text: string;
}

export interface V064RulesSource {
  schema_version: 1;
  version: typeof V064_CANDIDATE_RULES_VERSION;
  base_version: 'v0.6.3';
  status: string;
  change_type: 'collapse-pending-battle-into-onset';
  mechanics_changed: true;
  summary: string;
  battle: Record<string, unknown> & { remove_fields: string[]; sequence: string[] };
  terminology: Record<string, string>;
  card_text_overrides: CurrentRuleCardTextOverride[];
  rulebook_overrides: Array<{ id: string; heading: string; body: string }>;
}

export interface V064TerritorySourceEntry extends CleanV063Territory {
  number: number;
  arena: boolean;
  type: 'Territory' | 'Arena';
  effects: Array<{ label: 'Text'; text: string }>;
}

export interface V064TerritorySource {
  schema_version: number;
  version: typeof V064_CANDIDATE_RULES_VERSION;
  base_version: 'v0.6.3';
  target: string;
  source_issue: typeof V064_TERRITORY_SOURCE_ISSUE;
  mechanics_changed: true;
  count: 25;
  territories: V064TerritorySourceEntry[];
}

export interface V064CandidateContentIndex {
  authorityPath: typeof CURRENT_GAME_AUTHORITY_PATH;
  rulesVersion: typeof V064_CANDIDATE_RULES_VERSION;
  baseVersion: 'v0.6.3';
  territorySourceIssue: typeof V064_TERRITORY_SOURCE_ISSUE;
  territorySource: V064TerritorySource;
  rulesSource: V064RulesSource;
  battle: Readonly<Record<string, unknown>>;
  content: CleanV063Gameplay;
  cardsById: ReadonlyMap<string, CleanV063Card>;
  territoriesById: ReadonlyMap<string, V064TerritorySourceEntry>;
}

function assertCurrentGameAuthority(): void {
  if (currentGameAuthority.authority !== 'current-game') {
    throw new Error('Digital v0.6.4 content must be governed by the current-game authority.');
  }
  const metadata = candidateAuthorityMetadata();
  if (metadata.version !== V064_CANDIDATE_RULES_VERSION || metadata.baseVersion !== 'v0.6.3') {
    throw new Error(`Digital candidate adapter cannot resolve the historical v0.6.4-candidate/v0.6.3 provenance from current-game authority ${currentGameAuthority.version}.`);
  }
  if (metadata.sources.baseGameplay !== BUNDLED_BASE_GAMEPLAY_SOURCE) {
    throw new Error(`Digital candidate base gameplay bundle ${BUNDLED_BASE_GAMEPLAY_SOURCE} drifted from current-game provenance ${metadata.sources.baseGameplay || 'missing'}.`);
  }
  if (metadata.sources.cardChanges !== BUNDLED_CARD_CHANGES_SOURCE) {
    throw new Error(`Digital candidate card-change bundle ${BUNDLED_CARD_CHANGES_SOURCE} drifted from current-game provenance ${metadata.sources.cardChanges || 'missing'}.`);
  }
  if (metadata.sources.rules !== BUNDLED_RULES_SOURCE) {
    throw new Error(`Digital candidate rules bundle ${BUNDLED_RULES_SOURCE} drifted from current-game provenance ${metadata.sources.rules || 'missing'}.`);
  }
  if (metadata.sources.territories !== BUNDLED_TERRITORY_SOURCE) {
    throw new Error(`Digital candidate Territory bundle ${BUNDLED_TERRITORY_SOURCE} drifted from current-game provenance ${metadata.sources.territories || 'missing'}.`);
  }
}

function assertBaseGameplaySource(value: unknown): asserts value is CurrentBaseGameplaySource {
  if (!value || typeof value !== 'object') throw new Error('Current base gameplay source must be an object.');
  const source = value as Partial<CurrentBaseGameplaySource>;
  if (!source.gameplay || typeof source.gameplay !== 'object' || !source.gameplay.battle || typeof source.gameplay.battle !== 'object') {
    throw new Error('Current base gameplay source must declare battle rules.');
  }
}

function assertCardChangesSource(value: unknown): asserts value is CurrentCardChangesSource {
  if (!value || typeof value !== 'object') throw new Error('Current card-change source must be an object.');
  const source = value as Partial<CurrentCardChangesSource>;
  if (source.version !== V064_CANDIDATE_RULES_VERSION || source.base_version !== 'v0.6.3') {
    throw new Error('Digital card-change source version metadata does not match the v0.6.4 candidate provenance.');
  }
  if (!Array.isArray(source.cards) || !Array.isArray(source.retired_cards)) {
    throw new Error('Current card-change source must declare cards and retired_cards.');
  }
}

function assertRulesSource(value: unknown): asserts value is V064RulesSource {
  if (!value || typeof value !== 'object') throw new Error('Current rules source must be an object.');
  const source = value as Partial<V064RulesSource>;
  if (source.schema_version !== 1 || source.version !== V064_CANDIDATE_RULES_VERSION || source.base_version !== 'v0.6.3') {
    throw new Error('Digital rules source version metadata does not match the v0.6.4 candidate provenance.');
  }
  if (source.change_type !== 'collapse-pending-battle-into-onset' || source.mechanics_changed !== true) {
    throw new Error('Digital rules source must contain the accepted Onset migration.');
  }
  if (!source.battle || !Array.isArray(source.card_text_overrides) || !Array.isArray(source.rulebook_overrides)) {
    throw new Error('Digital rules source is missing battle or wording overrides.');
  }
}

function effectAliasKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function applyRuleCardTextOverrides(cards: CleanV063Card[], rules: V064RulesSource): CleanV063Card[] {
  const byId = new Map(cards.map(card => [card.id, { ...card, effects: card.effects.map(effect => ({ ...effect })) }]));
  for (const override of rules.card_text_overrides) {
    const card = byId.get(override.id);
    if (!card) throw new Error(`Digital rule wording override cannot resolve ${override.id}.`);
    const index = card.effects.findIndex(effect => effect.label === override.label);
    if (index < 0) throw new Error(`Digital rule wording override cannot resolve ${override.label} on ${override.id}.`);
    card.effects[index] = { ...card.effects[index], text: override.text };
    const aliasKey = effectAliasKey(override.label);
    const cardWithAliases = card as CleanV063Card & Record<string, unknown>;
    if (aliasKey && Object.prototype.hasOwnProperty.call(cardWithAliases, aliasKey)) {
      cardWithAliases[aliasKey] = override.text;
    }
  }
  return cards.map(card => byId.get(card.id) as CleanV063Card);
}

function resolveCurrentCards(rules: V064RulesSource): CleanV063Card[] {
  const raw: unknown = cardChangesJson;
  assertCardChangesSource(raw);

  const byId = new Map(cleanV063Content.content.cards.map(card => [card.id, card]));
  const byName = new Map(cleanV063Content.content.cards.map(card => [card.name, card.id]));

  for (const retired of raw.retired_cards) {
    const id = retired.id || (retired.name ? byName.get(retired.name) : undefined);
    if (!id || !byId.has(id)) throw new Error(`Digital current-game retirement cannot resolve ${retired.id || retired.name || 'unknown card'}.`);
    const previous = byId.get(id);
    byId.delete(id);
    if (previous) byName.delete(previous.name);
  }

  for (const candidate of raw.cards) {
    if (!candidate.id || !candidate.name) throw new Error('Digital current-game card change is missing stable id or name.');
    const conflictingId = byName.get(candidate.name);
    if (conflictingId && conflictingId !== candidate.id) {
      throw new Error(`Digital current-game card name ${candidate.name} conflicts with stable id ${conflictingId}.`);
    }
    const previous = byId.get(candidate.id);
    if (previous?.name && previous.name !== candidate.name) byName.delete(previous.name);
    byId.set(candidate.id, {
      id: candidate.id,
      name: candidate.name,
      allegiance: candidate.allegiance,
      cost: Number(candidate.cost),
      effects: candidate.effects,
      ...(Array.isArray(candidate.rules_notes) ? { rules_notes: candidate.rules_notes.map(String) } : {}),
    });
    byName.set(candidate.name, candidate.id);
  }

  return applyRuleCardTextOverrides([...byId.values()], rules);
}

function assertV064TerritorySource(value: unknown): asserts value is V064TerritorySource {
  if (!value || typeof value !== 'object') throw new Error('v0.6.4 Territory source must be an object.');
  const source = value as Partial<V064TerritorySource>;
  if (source.version !== V064_CANDIDATE_RULES_VERSION || source.base_version !== 'v0.6.3') {
    throw new Error('Digital Territory source version metadata does not match the v0.6.4 candidate provenance.');
  }
  if (source.source_issue !== V064_TERRITORY_SOURCE_ISSUE || source.mechanics_changed !== true) {
    throw new Error('v0.6.4 Territory source must remain pinned to the approved issue #738 clarification set.');
  }
  if (source.count !== 25 || !Array.isArray(source.territories) || source.territories.length !== 25) {
    throw new Error('v0.6.4 Territory source must contain exactly 25 Territories and Arenas.');
  }

  const ids = new Set<string>();
  for (const territory of source.territories) {
    if (!territory?.id || !territory.name || !territory.text) throw new Error('v0.6.4 Territory entry is incomplete.');
    if (ids.has(territory.id)) throw new Error(`Duplicate v0.6.4 Territory id: ${territory.id}`);
    ids.add(territory.id);
    if (!Array.isArray(territory.effects)
      || territory.effects.length !== 1
      || territory.effects[0]?.label !== 'Text'
      || territory.effects[0]?.text !== territory.text) {
      throw new Error(`v0.6.4 Territory effect text drifted for ${territory.id}.`);
    }
  }
}

function resolveCurrentFactions(): CleanV063Gameplay['factions'] {
  return cleanV063Content.content.factions.map(faction => ({
    ...faction,
    leaders: currentGameAuthority.leaders
      .filter(leader => leader.faction === faction.id)
      .map(leader => ({ name: leader.name, image: leader.image })),
  }));
}

function resolveBattleRules(baseSource: CurrentBaseGameplaySource, rules: V064RulesSource): Readonly<Record<string, unknown>> {
  const result: Record<string, unknown> = { ...baseSource.gameplay.battle, ...rules.battle };
  const removeFields = Array.isArray(rules.battle.remove_fields) ? rules.battle.remove_fields : [];
  delete result.remove_fields;
  for (const field of removeFields) delete result[field];
  return Object.freeze(result);
}

export function loadV064CandidateContent(): V064CandidateContentIndex {
  assertCurrentGameAuthority();
  const baseRaw: unknown = baseGameplayJson;
  const territoryRaw: unknown = territorySourceJson;
  const rulesRaw: unknown = rulesSourceJson;
  assertBaseGameplaySource(baseRaw);
  assertV064TerritorySource(territoryRaw);
  assertRulesSource(rulesRaw);

  const baseIds = new Set(cleanV063Content.content.territories.map((territory) => territory.id));
  const candidateIds = new Set(territoryRaw.territories.map((territory) => territory.id));
  if (baseIds.size !== candidateIds.size || [...baseIds].some((id) => !candidateIds.has(id))) {
    throw new Error('v0.6.4 Territory candidate must preserve the complete v0.6.3 Territory identity set.');
  }

  const cards = resolveCurrentCards(rulesRaw);
  const cardsById = new Map(cards.map(card => [card.id, card]));
  const territoriesById = new Map<string, V064TerritorySourceEntry>();
  for (const territory of territoryRaw.territories) territoriesById.set(territory.id, territory);

  const content: CleanV063Gameplay = {
    ...cleanV063Content.content,
    factions: resolveCurrentFactions(),
    cards,
    territories: territoryRaw.territories.map(({ id, name, text }) => ({ id, name, text })),
  };

  return {
    authorityPath: CURRENT_GAME_AUTHORITY_PATH,
    rulesVersion: V064_CANDIDATE_RULES_VERSION,
    baseVersion: 'v0.6.3',
    territorySourceIssue: V064_TERRITORY_SOURCE_ISSUE,
    territorySource: territoryRaw,
    rulesSource: rulesRaw,
    battle: resolveBattleRules(baseRaw, rulesRaw),
    content,
    cardsById,
    territoriesById,
  };
}

export const v064CandidateContent = loadV064CandidateContent();
