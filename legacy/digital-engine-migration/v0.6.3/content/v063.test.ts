import { describe, expect, test } from 'vitest';
import {
  V063_CANONICAL_DATA_SOURCE,
  V063_RELEASE_MANIFEST_SOURCE,
  V063_RULES_VERSION,
  v063CanonicalContent,
} from './v063';

describe('published v0.6.3 engine content authority', () => {
  test('identifies the released rules version and published package sources', () => {
    expect(V063_RULES_VERSION).toBe('v0.6.3');
    expect(V063_CANONICAL_DATA_SOURCE).toBe('releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json');
    expect(V063_RELEASE_MANIFEST_SOURCE).toBe('releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json');
    expect(V063_CANONICAL_DATA_SOURCE).not.toContain('candidate');
    expect(V063_CANONICAL_DATA_SOURCE).not.toContain('reconstruction');
    expect(v063CanonicalContent.rulesVersion).toBe('v0.6.3');
    expect(v063CanonicalContent.releaseName).toBe('Third Playtest Revision — Clean Reconstruction');
    expect(v063CanonicalContent.canonicalDataSource).toBe(V063_CANONICAL_DATA_SOURCE);
    expect(v063CanonicalContent.releaseManifestSource).toBe(V063_RELEASE_MANIFEST_SOURCE);
  });

  test('loads the complete published gameplay identity set', () => {
    expect(v063CanonicalContent.content.cards).toHaveLength(128);
    expect(v063CanonicalContent.content.territories).toHaveLength(25);
    expect(v063CanonicalContent.content.factions).toHaveLength(6);
    expect(v063CanonicalContent.content.cards.filter((card) => card.allegiance === 'Neutral')).toHaveLength(50);

    for (const faction of v063CanonicalContent.content.factions) {
      expect(v063CanonicalContent.content.cards.filter((card) => card.allegiance === faction.name)).toHaveLength(13);
    }

    expect(v063CanonicalContent.cardsById.get('neutral-reserves')?.name).toBe('Second Line');
    expect(v063CanonicalContent.territoriesById.get('territory-smuggler-s-pass')?.name).toBe("Smuggler's Run");
  });

  test('uses the published v0.6.3 setup and Last Stand baseline', () => {
    const deck = v063CanonicalContent.content.deck_construction;
    expect(deck).toMatchObject({
      opening_draw: 4,
      opening_discard: 1,
      opening_hand: 3,
      opening_discard_face_up: true,
      territories_per_player: 3,
      territory_arrangement_after_opening_selection: true,
      first_player_after_territory_arrangement: true,
    });

    expect(v063CanonicalContent.content.battlefield.last_stand).toMatchObject({
      defensive_edge: true,
      defender_bonus: 1,
      final_territory_control_required: false,
      final_territory_capture_required: false,
      separate_movement_sequence_required: true,
    });
  });
});
