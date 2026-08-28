import canonicalReleaseJson from '../../releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json';
import releaseManifestJson from '../../releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json';

export const V070_RULES_VERSION = 'v0.7.0' as const;
export const V070_CANONICAL_DATA_SOURCE = 'releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json' as const;
export const V070_RELEASE_MANIFEST_SOURCE = 'releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json' as const;

export interface V070CanonicalCardEffect {
  label: string;
  text: string;
}

export interface V070CanonicalCard {
  id: string;
  name: string;
  allegiance: string;
  cost: number;
  trait?: string | null;
  card_form?: string | null;
  effects: V070CanonicalCardEffect[];
  rules_notes?: string[];
}

export interface V070CanonicalTerritory {
  id: string;
  name: string;
  text: string;
  effects?: V070CanonicalCardEffect[];
}

export interface V070CanonicalProposal {
  id: string;
  name: string;
  stake: number;
  requirement: string;
  accepted: string;
  refused: string;
}

export interface V070CanonicalFaction {
  id: string;
  name: string;
  leaders: Array<{ name: string; image: string }>;
}

export interface V070Gameplay {
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
  battle: {
    normal_reserve_size: number;
    normal_gambits: number;
    normal_tactics: number;
    sequence: string[];
    onset: string;
    onset_steps: string[];
    battle_fought: string;
    terms: string;
    withdrawal: string;
    [key: string]: unknown;
  };
  faction_rules: {
    diplomats: {
      peace_treaty_threshold: number;
      terms_timing: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  factions: V070CanonicalFaction[];
  cards: V070CanonicalCard[];
  territories: V070CanonicalTerritory[];
}

export interface V070CanonicalData {
  schema_version: number;
  release_version: typeof V070_RULES_VERSION;
  source_version: typeof V070_RULES_VERSION;
  status: 'published';
  gameplay: V070Gameplay;
  proposals: V070CanonicalProposal[];
}

export interface V070ReleaseManifest {
  schema_version: number;
  release_version: typeof V070_RULES_VERSION;
  name: string;
  status: 'current';
  current_package_path: 'releases/v0.7.0/';
  binding_sources: {
    canonical_data: {
      path: typeof V070_CANONICAL_DATA_SOURCE;
      sha256: string;
    };
  };
  counts: {
    playable_cards: 142;
    territories: 25;
    factions: 6;
    leaders: 12;
  };
  public_defaults: {
    digital_rules: typeof V070_RULES_VERSION;
  };
  json_exports: string[];
}

export interface V070CanonicalContentIndex {
  rulesVersion: typeof V070_RULES_VERSION;
  releaseName: string;
  canonicalDataSource: typeof V070_CANONICAL_DATA_SOURCE;
  releaseManifestSource: typeof V070_RELEASE_MANIFEST_SOURCE;
  content: V070Gameplay;
  factionsById: ReadonlyMap<string, V070CanonicalFaction>;
  cardsById: ReadonlyMap<string, V070CanonicalCard>;
  territoriesById: ReadonlyMap<string, V070CanonicalTerritory>;
  proposalsById: ReadonlyMap<string, V070CanonicalProposal>;
}

function uniqueMap<T>(items: readonly T[], keyFor: (item: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const key = keyFor(item);
    if (result.has(key)) throw new Error(`Duplicate v0.7.0 ${label}: ${key}`);
    result.set(key, item);
  }
  return result;
}

function assertV070ReleaseManifest(value: unknown): asserts value is V070ReleaseManifest {
  if (!value || typeof value !== 'object') throw new Error('v0.7.0 release manifest must be an object.');
  const manifest = value as Partial<V070ReleaseManifest>;
  if (manifest.release_version !== V070_RULES_VERSION || manifest.status !== 'current') {
    throw new Error(`Expected current ${V070_RULES_VERSION} release manifest.`);
  }
  if (manifest.current_package_path !== 'releases/v0.7.0/') {
    throw new Error('v0.7.0 engine content must remain bound to the published release package.');
  }
  if (manifest.public_defaults?.digital_rules !== V070_RULES_VERSION) {
    throw new Error('Published release manifest does not identify v0.7.0 as the digital-rules default.');
  }
  if (manifest.counts?.playable_cards !== 142
    || manifest.counts?.territories !== 25
    || manifest.counts?.factions !== 6
    || manifest.counts?.leaders !== 12) {
    throw new Error('Published v0.7.0 release counts do not match the engine migration baseline.');
  }
  if (manifest.binding_sources?.canonical_data?.path !== V070_CANONICAL_DATA_SOURCE
    || !manifest.binding_sources.canonical_data.sha256) {
    throw new Error('Published v0.7.0 manifest must bind the engine to the released canonical-data export.');
  }
  if (!manifest.json_exports?.includes('Gauntlet_v0.7.0_Canonical_Data.json')) {
    throw new Error('Published v0.7.0 manifest must declare the canonical-data export.');
  }
}

function assertV070CanonicalData(value: unknown): asserts value is V070CanonicalData {
  if (!value || typeof value !== 'object') throw new Error('v0.7.0 canonical content must be an object.');
  const data = value as Partial<V070CanonicalData>;
  if (data.release_version !== V070_RULES_VERSION || data.source_version !== V070_RULES_VERSION || data.status !== 'published') {
    throw new Error('v0.7.0 canonical content must identify the current released rules version.');
  }
  const gameplay = data.gameplay as Partial<V070Gameplay> | undefined;
  if (!gameplay || !Array.isArray(gameplay.factions) || gameplay.factions.length !== 6) {
    throw new Error('v0.7.0 canonical content must include exactly six factions.');
  }
  if (!Array.isArray(gameplay.cards) || gameplay.cards.length !== 142) {
    throw new Error('v0.7.0 canonical content must include exactly 142 playable card titles.');
  }
  if (!Array.isArray(gameplay.territories) || gameplay.territories.length !== 25) {
    throw new Error('v0.7.0 canonical content must include exactly 25 Territories.');
  }

  const deck = gameplay.deck_construction;
  if (!deck || deck.opening_draw !== 4 || deck.opening_discard !== 1 || deck.opening_hand !== 3) {
    throw new Error('v0.7.0 canonical opening selection must be draw four, discard one, keep three.');
  }
  if (!deck.opening_discard_face_up || !deck.territory_arrangement_after_opening_selection || !deck.first_player_after_territory_arrangement) {
    throw new Error('v0.7.0 canonical setup ordering metadata is incomplete.');
  }

  const battle = gameplay.battle;
  if (!battle
    || battle.sequence?.[0] !== 'onset'
    || !Array.isArray(battle.onset_steps)
    || battle.onset_steps.length < 4
    || !battle.battle_fought
    || !battle.terms) {
    throw new Error('v0.7.0 canonical battle metadata must include the released Onset procedure.');
  }

  const diplomats = gameplay.faction_rules?.diplomats;
  if (!diplomats || diplomats.peace_treaty_threshold !== 6 || diplomats.terms_timing !== 'During Onset') {
    throw new Error('v0.7.0 Diplomat rules must use six ratified Proposals and Terms during Onset.');
  }
  if (!Array.isArray(data.proposals) || data.proposals.length !== 9) {
    throw new Error('v0.7.0 canonical content must include exactly nine Diplomat Proposals.');
  }
}

export function loadV070CanonicalContent(): V070CanonicalContentIndex {
  const manifest: unknown = releaseManifestJson;
  assertV070ReleaseManifest(manifest);

  const raw: unknown = canonicalReleaseJson;
  assertV070CanonicalData(raw);

  const gameplay = raw.gameplay;
  const factionsById = uniqueMap(gameplay.factions, faction => faction.id, 'faction id');
  const cardsById = uniqueMap(gameplay.cards, card => card.id, 'card id');
  const territoriesById = uniqueMap(gameplay.territories, territory => territory.id, 'Territory id');
  const proposalsById = uniqueMap(raw.proposals, proposal => proposal.id, 'Proposal id');

  const neutralCount = gameplay.cards.filter(card => card.allegiance === 'Neutral').length;
  if (neutralCount !== 52) throw new Error(`Expected 52 Neutral cards, received ${neutralCount}.`);
  for (const faction of gameplay.factions) {
    const count = gameplay.cards.filter(card => card.allegiance === faction.name).length;
    if (count !== 15) throw new Error(`Expected 15 ${faction.name} cards, received ${count}.`);
  }

  const requiredAdditions = [
    'neutral-phantom-passage',
    'neutral-battlefield-plunder',
    'military-high-command',
    'military-war-witch',
    'diplomats-plenipotentiary',
    'diplomats-diplomatic-divination',
    'financiers-war-bonds',
    'financiers-actuarial-alchemy',
    'intelligence-regime-change',
    'intelligence-spectral-surveillance',
    'mystics-sacrifice-recovery',
    'mystics-threefold-vision',
    'inquisition-retribution',
    'inquisition-anathema',
    'inquisition-malleus-maleficarum',
  ] as const;
  for (const id of requiredAdditions) {
    if (!cardsById.has(id)) throw new Error(`Published v0.7.0 card addition is missing from canonical content: ${id}`);
  }
  if (cardsById.has('inquisition-no-martyrs')) {
    throw new Error('Retired card inquisition-no-martyrs must not remain in v0.7.0 canonical content.');
  }

  return {
    rulesVersion: V070_RULES_VERSION,
    releaseName: manifest.name,
    canonicalDataSource: V070_CANONICAL_DATA_SOURCE,
    releaseManifestSource: V070_RELEASE_MANIFEST_SOURCE,
    content: gameplay,
    factionsById,
    cardsById,
    territoriesById,
    proposalsById,
  };
}

export const v070CanonicalContent = loadV070CanonicalContent();
