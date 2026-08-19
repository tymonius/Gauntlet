import currentGameAuthorityJson from '../../game-data/current-game.json';
import cardChangesJson from '../../docs/v0.6.4-card-additions.json';
import territorySourceJson from '../../docs/v0.6.4-territories.json';
import {
  cleanV063Content,
  type CleanV063Card,
  type CleanV063Gameplay,
  type CleanV063Territory,
} from '../reconstruction/clean-v063/content';

const currentGameAuthority = currentGameAuthorityJson as {
  authority: string;
  version: string;
  baseVersion: string;
  leaders: Array<{ id: string; faction: string; name: string; image: string }>;
  sources: { cardChanges?: string; territories?: string };
};

export const CURRENT_GAME_AUTHORITY_PATH = 'game-data/current-game.json' as const;
export const V064_CANDIDATE_RULES_VERSION = 'v0.6.4-candidate' as const;
export const V064_TERRITORY_SOURCE_ISSUE = 738 as const;
const BUNDLED_CARD_CHANGES_SOURCE = '/docs/v0.6.4-card-additions.json' as const;
const BUNDLED_TERRITORY_SOURCE = '/docs/v0.6.4-territories.json' as const;

interface CurrentCardChangesSource {
  version: typeof V064_CANDIDATE_RULES_VERSION;
  base_version: 'v0.6.3';
  cards: Array<CleanV063Card & Record<string, unknown>>;
  retired_cards: Array<{ id?: string; name?: string }>;
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
  content: CleanV063Gameplay;
  cardsById: ReadonlyMap<string, CleanV063Card>;
  territoriesById: ReadonlyMap<string, V064TerritorySourceEntry>;
}

function assertCurrentGameAuthority(): void {
  if (currentGameAuthority.authority !== 'current-game') {
    throw new Error('Digital v0.6.4 content must be governed by the current-game authority.');
  }
  if (currentGameAuthority.version !== V064_CANDIDATE_RULES_VERSION || currentGameAuthority.baseVersion !== 'v0.6.3') {
    throw new Error(`Digital candidate adapter does not match current-game version ${currentGameAuthority.version}/${currentGameAuthority.baseVersion}.`);
  }
  if (currentGameAuthority.sources.cardChanges !== BUNDLED_CARD_CHANGES_SOURCE) {
    throw new Error(`Digital candidate card-change bundle ${BUNDLED_CARD_CHANGES_SOURCE} drifted from current-game authority ${currentGameAuthority.sources.cardChanges || 'missing'}.`);
  }
  if (currentGameAuthority.sources.territories !== BUNDLED_TERRITORY_SOURCE) {
    throw new Error(`Digital candidate Territory bundle ${BUNDLED_TERRITORY_SOURCE} drifted from current-game authority ${currentGameAuthority.sources.territories || 'missing'}.`);
  }
}

function assertCardChangesSource(value: unknown): asserts value is CurrentCardChangesSource {
  if (!value || typeof value !== 'object') throw new Error('Current card-change source must be an object.');
  const source = value as Partial<CurrentCardChangesSource>;
  if (source.version !== currentGameAuthority.version || source.base_version !== currentGameAuthority.baseVersion) {
    throw new Error('Digital card-change source version metadata does not match the current-game authority.');
  }
  if (!Array.isArray(source.cards) || !Array.isArray(source.retired_cards)) {
    throw new Error('Current card-change source must declare cards and retired_cards.');
  }
}

function resolveCurrentCards(): CleanV063Card[] {
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

  return [...byId.values()];
}

function assertV064TerritorySource(value: unknown): asserts value is V064TerritorySource {
  if (!value || typeof value !== 'object') throw new Error('v0.6.4 Territory source must be an object.');
  const source = value as Partial<V064TerritorySource>;
  if (source.version !== currentGameAuthority.version || source.base_version !== currentGameAuthority.baseVersion) {
    throw new Error('Digital Territory source version metadata does not match the current-game authority.');
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

export function loadV064CandidateContent(): V064CandidateContentIndex {
  assertCurrentGameAuthority();
  const raw: unknown = territorySourceJson;
  assertV064TerritorySource(raw);

  const baseIds = new Set(cleanV063Content.content.territories.map((territory) => territory.id));
  const candidateIds = new Set(raw.territories.map((territory) => territory.id));
  if (baseIds.size !== candidateIds.size || [...baseIds].some((id) => !candidateIds.has(id))) {
    throw new Error('v0.6.4 Territory candidate must preserve the complete v0.6.3 Territory identity set.');
  }

  const cards = resolveCurrentCards();
  const cardsById = new Map(cards.map(card => [card.id, card]));
  const territoriesById = new Map<string, V064TerritorySourceEntry>();
  for (const territory of raw.territories) territoriesById.set(territory.id, territory);

  const content: CleanV063Gameplay = {
    ...cleanV063Content.content,
    factions: resolveCurrentFactions(),
    cards,
    territories: raw.territories.map(({ id, name, text }) => ({ id, name, text })),
  };

  return {
    authorityPath: CURRENT_GAME_AUTHORITY_PATH,
    rulesVersion: V064_CANDIDATE_RULES_VERSION,
    baseVersion: 'v0.6.3',
    territorySourceIssue: V064_TERRITORY_SOURCE_ISSUE,
    territorySource: raw,
    content,
    cardsById,
    territoriesById,
  };
}

export const v064CandidateContent = loadV064CandidateContent();
