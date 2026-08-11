import canonicalCandidateJson from '../../v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json';

export const V063_RULES_VERSION = 'v0.6.3-candidate' as const;

export interface V063CanonicalCardEffect {
  label: string;
  text: string;
}

export interface V063CanonicalCard {
  id: string;
  name: string;
  allegiance: string;
  cost: number;
  effects: V063CanonicalCardEffect[];
}

export interface V063CanonicalTerritory {
  id: string;
  name: string;
  text: string;
}

export interface V063CanonicalFaction {
  id: string;
  name: string;
  leaders: Array<{ name: string; image: string }>;
}

export interface V063CanonicalData {
  version: string;
  name: string;
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
      final_territory_control_required: boolean;
      final_territory_capture_required: boolean;
      separate_movement_sequence_required: boolean;
    };
  };
  factions: V063CanonicalFaction[];
  cards: V063CanonicalCard[];
  territories: V063CanonicalTerritory[];
}

export interface V063CanonicalContentIndex {
  rulesVersion: typeof V063_RULES_VERSION;
  releaseName: string;
  content: V063CanonicalData;
  factionsById: ReadonlyMap<string, V063CanonicalFaction>;
  cardsById: ReadonlyMap<string, V063CanonicalCard>;
  territoriesById: ReadonlyMap<string, V063CanonicalTerritory>;
}

function uniqueMap<T>(items: readonly T[], keyFor: (item: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const key = keyFor(item);
    if (result.has(key)) throw new Error(`Duplicate v0.6.3 ${label}: ${key}`);
    result.set(key, item);
  }
  return result;
}

function assertV063CanonicalData(value: unknown): asserts value is V063CanonicalData {
  if (!value || typeof value !== 'object') throw new Error('v0.6.3 canonical content must be an object.');
  const data = value as Partial<V063CanonicalData>;
  if (data.version !== V063_RULES_VERSION) {
    throw new Error(`Expected ${V063_RULES_VERSION}, received ${String(data.version)}.`);
  }
  if (!Array.isArray(data.factions) || data.factions.length !== 6) {
    throw new Error('v0.6.3 canonical content must include exactly six factions.');
  }
  if (!Array.isArray(data.cards) || data.cards.length !== 128) {
    throw new Error('v0.6.3 canonical content must include exactly 128 playable card titles.');
  }
  if (!Array.isArray(data.territories) || data.territories.length !== 25) {
    throw new Error('v0.6.3 canonical content must include exactly 25 Territories.');
  }
  const deck = data.deck_construction;
  if (!deck || deck.opening_draw !== 4 || deck.opening_discard !== 1 || deck.opening_hand !== 3) {
    throw new Error('v0.6.3 canonical opening selection must be draw four, discard one, keep three.');
  }
  if (!deck.opening_discard_face_up || !deck.territory_arrangement_after_opening_selection || !deck.first_player_after_territory_arrangement) {
    throw new Error('v0.6.3 canonical setup ordering metadata is incomplete.');
  }
  const lastStand = data.battlefield?.last_stand;
  if (!lastStand || lastStand.final_territory_control_required || lastStand.final_territory_capture_required || !lastStand.separate_movement_sequence_required) {
    throw new Error('v0.6.3 Last Stand access metadata does not match the adopted candidate.');
  }
}

export function loadV063CanonicalContent(): V063CanonicalContentIndex {
  const raw: unknown = canonicalCandidateJson;
  assertV063CanonicalData(raw);

  const factionsById = uniqueMap(raw.factions, (faction) => faction.id, 'faction id');
  const cardsById = uniqueMap(raw.cards, (card) => card.id, 'card id');
  const territoriesById = uniqueMap(raw.territories, (territory) => territory.id, 'Territory id');

  const neutralCount = raw.cards.filter((card) => card.allegiance === 'Neutral').length;
  if (neutralCount !== 50) throw new Error(`Expected 50 Neutral cards, received ${neutralCount}.`);
  for (const faction of raw.factions) {
    const count = raw.cards.filter((card) => card.allegiance === faction.name).length;
    if (count !== 13) throw new Error(`Expected 13 ${faction.name} cards, received ${count}.`);
  }

  const smugglersRun = territoriesById.get('territory-smuggler-s-pass');
  if (smugglersRun?.name !== "Smuggler's Run" || smugglersRun.text.includes("Smuggler's Pass")) {
    throw new Error("Stable Territory ID territory-smuggler-s-pass must resolve to Smuggler's Run in v0.6.3.");
  }
  if (cardsById.get('neutral-reserves')?.name !== 'Second Line') {
    throw new Error('Stable card ID neutral-reserves must resolve to Second Line in v0.6.3.');
  }
  const marginLoan = cardsById.get('financiers-margin-loan');
  const marginLoanAsset = marginLoan?.effects.find((effect) => effect.label === 'Asset')?.text ?? '';
  if (!marginLoanAsset.includes('While this remains banked, you may not draw at the start of your turn.')) {
    throw new Error('Margin Loan must use the persistent v0.6.3 start-of-turn draw restriction.');
  }

  return {
    rulesVersion: V063_RULES_VERSION,
    releaseName: raw.name,
    content: raw,
    factionsById,
    cardsById,
    territoriesById,
  };
}

export const v063CanonicalContent = loadV063CanonicalContent();
