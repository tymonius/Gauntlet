import canonicalReleaseJson from '../../releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json';
import releaseManifestJson from '../../releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json';

export const V063_RULES_VERSION = 'v0.6.3' as const;
export const V063_CANONICAL_DATA_SOURCE = 'releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json' as const;
export const V063_RELEASE_MANIFEST_SOURCE = 'releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json' as const;

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
  rules_notes?: string[];
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

export interface V063ReleaseManifest {
  schema_version: number;
  release_version: typeof V063_RULES_VERSION;
  name: string;
  status: 'current';
  current_package_path: 'releases/v0.6.3/';
  binding_sources: {
    canonical_data: {
      path: string;
      sha256: string;
    };
  };
  counts: {
    playable_cards: number;
    territories: number;
    factions: number;
    leaders: number;
  };
  public_defaults: {
    digital_rules: typeof V063_RULES_VERSION;
  };
  json_exports: string[];
}

export interface V063CanonicalContentIndex {
  rulesVersion: typeof V063_RULES_VERSION;
  releaseName: string;
  canonicalDataSource: typeof V063_CANONICAL_DATA_SOURCE;
  releaseManifestSource: typeof V063_RELEASE_MANIFEST_SOURCE;
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

function assertV063ReleaseManifest(value: unknown): asserts value is V063ReleaseManifest {
  if (!value || typeof value !== 'object') throw new Error('v0.6.3 release manifest must be an object.');
  const manifest = value as Partial<V063ReleaseManifest>;
  if (manifest.release_version !== V063_RULES_VERSION || manifest.status !== 'current') {
    throw new Error(`Expected current ${V063_RULES_VERSION} release manifest.`);
  }
  if (manifest.current_package_path !== 'releases/v0.6.3/') {
    throw new Error('v0.6.3 engine content must remain bound to the published release package.');
  }
  if (manifest.public_defaults?.digital_rules !== V063_RULES_VERSION) {
    throw new Error('Published release manifest does not identify v0.6.3 as the digital-rules default.');
  }
  if (manifest.counts?.playable_cards !== 128 || manifest.counts?.territories !== 25 || manifest.counts?.factions !== 6 || manifest.counts?.leaders !== 12) {
    throw new Error('Published v0.6.3 release counts do not match the engine migration baseline.');
  }
  if (!manifest.json_exports?.includes('Gauntlet_v0.6.3_Canonical_Data.json')) {
    throw new Error('Published v0.6.3 manifest must declare the canonical-data export.');
  }
  if (!manifest.binding_sources?.canonical_data?.path || !manifest.binding_sources.canonical_data.sha256) {
    throw new Error('Published v0.6.3 manifest must identify its binding canonical-data source.');
  }
}

function assertV063CanonicalData(value: unknown): asserts value is V063CanonicalData {
  if (!value || typeof value !== 'object') throw new Error('v0.6.3 canonical content must be an object.');
  const data = value as Partial<V063CanonicalData>;
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
    throw new Error('v0.6.3 Last Stand access metadata does not match the published release.');
  }
}

function cardEffect(card: V063CanonicalCard | undefined, label: string): string {
  return card?.effects.find((effect) => effect.label === label)?.text ?? '';
}

export function loadV063CanonicalContent(): V063CanonicalContentIndex {
  const manifest: unknown = releaseManifestJson;
  assertV063ReleaseManifest(manifest);

  const raw: unknown = canonicalReleaseJson;
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
  const marginLoanAsset = cardEffect(marginLoan, 'Asset');
  if (!marginLoanAsset.includes('While this remains banked, you may not draw at the start of your turn.')) {
    throw new Error('Margin Loan must use the persistent v0.6.3 start-of-turn draw restriction.');
  }

  const armistice = cardsById.get('neutral-armistice');
  if (armistice?.cost !== 4 || cardEffect(armistice, 'Asset') !== 'Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.') {
    throw new Error('Armistice must retain cost 4 and resolve upkeep at the start of Opening.');
  }

  const contingencyPlan = cardsById.get('neutral-contingency-plan');
  if (contingencyPlan?.cost !== 1 || cardEffect(contingencyPlan, 'Asset') !== 'If this card is Removed, +1 Card.' || cardEffect(contingencyPlan, 'Gambit/Tactic') !== 'If your opponent controls more Territories than you, +2 Battle Total.') {
    throw new Error('Contingency Plan must retain cost 1, trigger on any defined Removal, and grant +2 Battle Total while behind on Territories.');
  }

  const manifestDestiny = cardsById.get('neutral-manifest-destiny');
  if (manifestDestiny?.cost !== 5 || !manifestDestiny.rules_notes?.includes('After entering the Gauntlet, this card is a normal Territory with a normal Deed.')) {
    throw new Error('Manifest Destiny must retain cost 5 and become a normal Territory with a normal Deed.');
  }

  return {
    rulesVersion: V063_RULES_VERSION,
    releaseName: manifest.name,
    canonicalDataSource: V063_CANONICAL_DATA_SOURCE,
    releaseManifestSource: V063_RELEASE_MANIFEST_SOURCE,
    content: raw,
    factionsById,
    cardsById,
    territoriesById,
  };
}

export const v063CanonicalContent = loadV063CanonicalContent();
