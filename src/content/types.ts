export type CanonicalComplexity = 'Basic' | 'Advanced' | string | null;

export interface CanonicalDeckConstruction {
  minimum_playable_cards: number;
  maximum_deckbuilding_value: number;
  opening_hand: number;
  hand_limit: number;
  territories_per_player: number;
  maximum_arenas: number;
  factions_per_deck: number;
  leaders_per_deck: number;
}

export interface CanonicalLastStandRules {
  defender_advantage: boolean;
  defender_bonus: number;
}

export interface CanonicalBattlefieldRules {
  gauntlet: string;
  starting_position: string;
  capture: string;
  victory: string;
  last_stand: CanonicalLastStandRules;
}

export interface CanonicalBattleRules {
  normal_battle_hand_size: number;
  normal_hand_commitments: number;
  normal_battle_hand_choices: number;
  hand_commitment_destination: string;
  battle_hand_destination: string;
  defender_advantage: string;
}

export interface CanonicalLeader {
  name: string;
  image: string;
}

export interface CanonicalFaction {
  id: string;
  name: string;
  color: string;
  resource: string | null;
  leaders: CanonicalLeader[];
  victory: string;
  card_count: number;
  source: string;
}

export interface CanonicalCardEffect {
  label: string;
  text: string;
}

export interface CanonicalCard {
  id: string;
  name: string;
  allegiance: string;
  cost: number;
  complexity: CanonicalComplexity;
  trait: string | null;
  card_form: string | null;
  unique: boolean;
  unique_rule: string | null;
  effects: CanonicalCardEffect[];
  action: string | null;
  battle: string | null;
  mission: string | null;
  source: string;
}

export interface CanonicalTerritory {
  id: string;
  number: number;
  name: string;
  arena: boolean;
  complexity: CanonicalComplexity;
  text: string;
  source: string;
}

export interface CanonicalSourceFiles {
  rulebook: string;
  neutral: string;
  territories: string;
  factions: Record<string, string>;
}

export interface CanonicalGauntletContent {
  version: string;
  name: string;
  date: string;
  status: string;
  deck_construction: CanonicalDeckConstruction;
  battlefield: CanonicalBattlefieldRules;
  battle: CanonicalBattleRules;
  factions: CanonicalFaction[];
  card_pool_summary: Record<string, unknown>;
  cards: CanonicalCard[];
  territories: CanonicalTerritory[];
  source_files: CanonicalSourceFiles;
}

export interface CanonicalContentIndex {
  rulesVersion: string;
  releaseName: string;
  content: CanonicalGauntletContent;
  factionsById: ReadonlyMap<string, CanonicalFaction>;
  leadersByName: ReadonlyMap<string, CanonicalLeader & { factionId: string }>;
  cardsById: ReadonlyMap<string, CanonicalCard>;
  territoriesById: ReadonlyMap<string, CanonicalTerritory>;
}
