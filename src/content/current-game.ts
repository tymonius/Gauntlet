import currentGameJson from '../../packages/game-data/current-game.json';

export interface CurrentCanonicalCardEffect {
  label: string;
  text: string;
}

export interface CurrentCanonicalCard {
  id: string;
  name: string;
  allegiance: string;
  cost: number;
  trait?: string | null;
  card_form?: string | null;
  effects: CurrentCanonicalCardEffect[];
}

export interface CurrentCanonicalTerritory {
  id: string;
  name: string;
  text: string;
  effects?: CurrentCanonicalCardEffect[];
}

export interface CurrentCanonicalFaction {
  id: string;
  name: string;
  leaders: Array<{ id?: string; name: string; image?: string }>;
}

export interface CurrentCanonicalProposal {
  id: string;
  name: string;
  stake: number;
  requirement: string;
  accepted: string;
  refused: string;
}

export interface CurrentGameplay {
  factions: CurrentCanonicalFaction[];
  cards: CurrentCanonicalCard[];
  territories: CurrentCanonicalTerritory[];
  battle: {
    sequence: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CurrentGameAuthority {
  schemaVersion: number;
  authority: 'current-game';
  version: string;
  displayVersion: string;
  status: 'current-release';
  runtimePolicy: string;
  gameplay: CurrentGameplay;
  proposals: CurrentCanonicalProposal[];
  leaders: unknown[];
}

export interface CurrentCanonicalContentIndex {
  rulesVersion: string;
  authority: 'current-game';
  status: 'current-release';
  content: CurrentGameplay;
  cardsById: ReadonlyMap<string, CurrentCanonicalCard>;
  territoriesById: ReadonlyMap<string, CurrentCanonicalTerritory>;
  factionsById: ReadonlyMap<string, CurrentCanonicalFaction>;
  proposalsById: ReadonlyMap<string, CurrentCanonicalProposal>;
}

function uniqueMap<T>(
  items: readonly T[],
  keyFor: (item: T) => string,
  label: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const key = keyFor(item);
    if (result.has(key)) {
      throw new Error(`Duplicate current-game ${label}: ${key}`);
    }
    result.set(key, item);
  }
  return result;
}

function assertCurrentGameAuthority(
  value: unknown,
): asserts value is CurrentGameAuthority {
  if (!value || typeof value !== 'object') {
    throw new Error('Current gameplay authority must be an object.');
  }
  const game = value as Partial<CurrentGameAuthority>;
  if (game.authority !== 'current-game' || game.status !== 'current-release') {
    throw new Error(
      'Digital current-content binding requires packages/game-data/current-game.json.',
    );
  }
  if (!game.version || game.displayVersion !== game.version) {
    throw new Error('Current gameplay authority must identify one current version.');
  }
  if (!game.runtimePolicy?.includes('complete current gameplay authority')) {
    throw new Error(
      'Current gameplay authority must explicitly declare itself complete for runtime consumers.',
    );
  }

  const gameplay = game.gameplay as Partial<CurrentGameplay> | undefined;
  if (!gameplay
    || !Array.isArray(gameplay.cards)
    || !Array.isArray(gameplay.territories)
    || !Array.isArray(gameplay.factions)
    || !Array.isArray(game.proposals)
    || !Array.isArray(game.leaders)) {
    throw new Error('Current gameplay authority is missing indexed gameplay collections.');
  }
  if (gameplay.cards.length !== 142
    || gameplay.territories.length !== 25
    || gameplay.factions.length !== 6
    || game.proposals.length !== 9
    || game.leaders.length !== 12) {
    throw new Error(
      'Current gameplay authority counts do not match the published two-player pool.',
    );
  }
  if (!Array.isArray(gameplay.battle?.sequence)
    || gameplay.battle.sequence[0] !== 'onset') {
    throw new Error(
      'Current gameplay authority must expose the current Onset-first battle sequence.',
    );
  }
}

export function loadCurrentCanonicalContent(): CurrentCanonicalContentIndex {
  const raw: unknown = currentGameJson;
  assertCurrentGameAuthority(raw);

  return {
    rulesVersion: raw.version,
    authority: raw.authority,
    status: raw.status,
    content: raw.gameplay,
    cardsById: uniqueMap(raw.gameplay.cards, card => card.id, 'card id'),
    territoriesById: uniqueMap(
      raw.gameplay.territories,
      territory => territory.id,
      'Territory id',
    ),
    factionsById: uniqueMap(
      raw.gameplay.factions,
      faction => faction.id,
      'faction id',
    ),
    proposalsById: uniqueMap(raw.proposals, proposal => proposal.id, 'Proposal id'),
  };
}

export const currentCanonicalContent = loadCurrentCanonicalContent();
export const CURRENT_RULES_VERSION = currentCanonicalContent.rulesVersion;
