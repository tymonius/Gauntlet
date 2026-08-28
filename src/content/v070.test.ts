import { describe, expect, test } from 'vitest';
import {
  V070_CANONICAL_DATA_SOURCE,
  V070_RELEASE_MANIFEST_SOURCE,
  V070_RULES_VERSION,
  v070CanonicalContent,
} from './v070';

const addedCardIds = [
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

describe('published v0.7.0 engine content authority', () => {
  test('binds the engine content layer to the published v0.7.0 release package', () => {
    expect(V070_RULES_VERSION).toBe('v0.7.0');
    expect(V070_CANONICAL_DATA_SOURCE).toBe('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json');
    expect(V070_RELEASE_MANIFEST_SOURCE).toBe('releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json');
    expect(v070CanonicalContent.rulesVersion).toBe('v0.7.0');
    expect(v070CanonicalContent.releaseName).toBe('Illustrated Cards & Tabletop Simulator');
  });

  test('loads the complete released identity set', () => {
    expect(v070CanonicalContent.content.cards).toHaveLength(142);
    expect(v070CanonicalContent.content.territories).toHaveLength(25);
    expect(v070CanonicalContent.content.factions).toHaveLength(6);
    expect(v070CanonicalContent.content.cards.filter(card => card.allegiance === 'Neutral')).toHaveLength(52);

    for (const faction of v070CanonicalContent.content.factions) {
      expect(v070CanonicalContent.content.cards.filter(card => card.allegiance === faction.name)).toHaveLength(15);
    }
  });

  test('contains every v0.7.0 card addition and excludes the retired No Martyrs card', () => {
    for (const id of addedCardIds) expect(v070CanonicalContent.cardsById.has(id)).toBe(true);
    expect(v070CanonicalContent.cardsById.has('inquisition-no-martyrs')).toBe(false);
  });

  test('locks the released Onset and Diplomat timing contract', () => {
    const battle = v070CanonicalContent.content.battle;
    expect(battle.sequence[0]).toBe('onset');
    expect(battle.onset_steps).toHaveLength(5);
    expect(battle.battle_fought).toContain('proceeds to Gambits');
    expect(battle.terms).toContain('Terms are resolved during Onset');

    const diplomats = v070CanonicalContent.content.faction_rules.diplomats;
    expect(diplomats.peace_treaty_threshold).toBe(6);
    expect(diplomats.terms_timing).toBe('During Onset');
  });

  test('retains the current setup and Last Stand structural baseline', () => {
    expect(v070CanonicalContent.content.deck_construction).toMatchObject({
      opening_draw: 4,
      opening_discard: 1,
      opening_hand: 3,
      opening_discard_face_up: true,
      territories_per_player: 3,
      territory_arrangement_after_opening_selection: true,
      first_player_after_territory_arrangement: true,
    });

    expect(v070CanonicalContent.content.battlefield.last_stand).toMatchObject({
      defensive_edge: true,
      defender_bonus: 1,
      final_territory_control_required: false,
      final_territory_capture_required: false,
      separate_movement_sequence_required: true,
    });
  });
});
