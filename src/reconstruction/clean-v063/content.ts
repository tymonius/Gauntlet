import canonicalAuthorityJson from '../../../artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json';

export const CLEAN_V063_RULES_VERSION = 'v0.6.3-clean' as const;
export const CLEAN_V063_AUTHORITY_TARGET = 'clean-v0.6.3-canonical-structured-authority' as const;

export interface CleanV063CardEffect { label: string; text: string; }
export interface CleanV063Card {
  id: string;
  name: string;
  allegiance: string;
  cost: number;
  effects: CleanV063CardEffect[];
  rules_notes?: string[];
}
export interface CleanV063Territory { id: string; name: string; text: string; }
export interface CleanV063Faction {
  id: string;
  name: string;
  leaders: Array<{ name: string; image: string }>;
}
export interface CleanV063Gameplay {
  deck_construction: {
    opening_hand: number;
    opening_draw: number;
    opening_discard: number;
    opening_discard_face_up: boolean;
    territories_per_player: number;
    territory_arrangement_after_opening_selection: boolean;
    first_player_after_territory_arrangement: boolean;
  };
  battlefield: {
    starting_position: string;
    capture: string;
    victory: string;
    last_stand: {
      defensive_edge: boolean;
      defender_bonus: number;
      access: string;
      final_territory_control_required: boolean;
      final_territory_capture_required: boolean;
      separate_movement_sequence_required: boolean;
    };
  };
  factions: CleanV063Faction[];
  cards: CleanV063Card[];
  territories: CleanV063Territory[];
}
export interface CleanV063AuthorityData {
  schema_version: number;
  target: string;
  status: string;
  publication_unlocked: boolean;
  gameplay: CleanV063Gameplay;
}
export interface CleanV063ContentIndex {
  rulesVersion: typeof CLEAN_V063_RULES_VERSION;
  authorityTarget: typeof CLEAN_V063_AUTHORITY_TARGET;
  content: CleanV063Gameplay;
  factionsById: ReadonlyMap<string, CleanV063Faction>;
  cardsById: ReadonlyMap<string, CleanV063Card>;
  territoriesById: ReadonlyMap<string, CleanV063Territory>;
}

function uniqueMap<T>(items: readonly T[], keyFor: (item: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const key = keyFor(item);
    if (result.has(key)) throw new Error(`Duplicate clean v0.6.3 ${label}: ${key}`);
    result.set(key, item);
  }
  return result;
}

function cardEffect(card: CleanV063Card | undefined, label: string): string {
  return card?.effects.find((effect) => effect.label === label)?.text ?? '';
}

function assertCleanV063Authority(value: unknown): asserts value is CleanV063AuthorityData {
  if (!value || typeof value !== 'object') throw new Error('Clean v0.6.3 authority must be an object.');
  const data = value as Partial<CleanV063AuthorityData>;
  if (data.target !== CLEAN_V063_AUTHORITY_TARGET) throw new Error(`Unexpected clean v0.6.3 authority target: ${String(data.target)}.`);
  if (data.publication_unlocked !== false) throw new Error('Clean v0.6.3 authority must remain publication-locked.');
  const game = data.gameplay;
  if (!game || !Array.isArray(game.factions) || game.factions.length !== 6) throw new Error('Clean v0.6.3 authority must include six factions.');
  if (!Array.isArray(game.cards) || game.cards.length !== 128) throw new Error('Clean v0.6.3 authority must include 128 playable card titles.');
  if (!Array.isArray(game.territories) || game.territories.length !== 25) throw new Error('Clean v0.6.3 authority must include 25 Territories.');
  const deck = game.deck_construction;
  if (deck.opening_draw !== 4 || deck.opening_discard !== 1 || deck.opening_hand !== 3 || !deck.opening_discard_face_up) {
    throw new Error('Clean v0.6.3 opening selection must be draw four, discard one face up, keep three.');
  }
  if (!deck.territory_arrangement_after_opening_selection || !deck.first_player_after_territory_arrangement) {
    throw new Error('Clean v0.6.3 setup ordering metadata is incomplete.');
  }
  const lastStand = game.battlefield.last_stand;
  if (lastStand.final_territory_control_required || lastStand.final_territory_capture_required || !lastStand.separate_movement_sequence_required) {
    throw new Error('Clean v0.6.3 Last Stand metadata does not match authority.');
  }
}

export function loadCleanV063Content(): CleanV063ContentIndex {
  const raw: unknown = canonicalAuthorityJson;
  assertCleanV063Authority(raw);
  const game = raw.gameplay;
  const factionsById = uniqueMap(game.factions, (faction) => faction.id, 'faction id');
  const cardsById = uniqueMap(game.cards, (card) => card.id, 'card id');
  const territoriesById = uniqueMap(game.territories, (territory) => territory.id, 'Territory id');

  if (game.cards.filter((card) => card.allegiance === 'Neutral').length !== 50) throw new Error('Clean v0.6.3 must contain 50 Neutral cards.');
  for (const faction of game.factions) {
    if (game.cards.filter((card) => card.allegiance === faction.name).length !== 13) throw new Error(`Clean v0.6.3 must contain 13 ${faction.name} cards.`);
  }
  const smugglersRun = territoriesById.get('territory-smuggler-s-pass');
  if (smugglersRun?.name !== "Smuggler's Run") throw new Error("Stable Territory ID territory-smuggler-s-pass must resolve to Smuggler's Run.");
  if (cardsById.get('neutral-reserves')?.name !== 'Second Line') throw new Error('Stable card ID neutral-reserves must resolve to Second Line.');

  const marginLoan = cardsById.get('financiers-margin-loan');
  if (!cardEffect(marginLoan, 'Asset').includes('While this remains banked, you may not draw at the start of your turn.')) {
    throw new Error('Margin Loan must retain the persistent start-of-turn draw restriction.');
  }
  const armistice = cardsById.get('neutral-armistice');
  if (armistice?.cost !== 4 || cardEffect(armistice, 'Asset') !== 'Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.') {
    throw new Error('Armistice authority mismatch.');
  }
  const contingency = cardsById.get('neutral-contingency-plan');
  if (contingency?.cost !== 1 || cardEffect(contingency, 'Asset') !== 'If this card is Removed, +1 Card.' || cardEffect(contingency, 'Gambit/Tactic') !== 'If your opponent controls more Territories than you, +2 Battle Total.') {
    throw new Error('Contingency Plan authority mismatch.');
  }
  const manifest = cardsById.get('neutral-manifest-destiny');
  if (manifest?.cost !== 5 || !manifest.rules_notes?.includes('After entering the Gauntlet, this card is a normal Territory with a normal Deed.')) {
    throw new Error('Manifest Destiny authority mismatch.');
  }

  return { rulesVersion: CLEAN_V063_RULES_VERSION, authorityTarget: CLEAN_V063_AUTHORITY_TARGET, content: game, factionsById, cardsById, territoriesById };
}

export const cleanV063Content = loadCleanV063Content();
