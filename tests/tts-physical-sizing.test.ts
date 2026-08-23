import { describe, expect, it } from 'vitest';
import { finalizeSupplementalObjectPresentation } from '../scripts/finalize-tts-save.mjs';

const LANDSCAPE_SCALE = 2.5 / 3.5;

function card(nickname: string, sideways: boolean, gmNotes = '') {
  return {
    Name: 'CardCustom',
    Nickname: nickname,
    GMNotes: gmNotes,
    SidewaysCard: sideways,
    Transform: {
      posX: 0,
      posY: 1,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    },
  };
}

describe('TTS physical card sizing', () => {
  it('keeps every landscape card the same physical size as a normal card rotated 90 degrees', () => {
    const territory = card('Supply Depot', true);
    const deed = card('Deed Card', false, 'gauntlet:supplemental:financiers-deed');
    const portrait = card('Ambassador', false);
    const tracker = {
      Name: 'Custom_Tile',
      Nickname: 'Influence Tracker',
      GMNotes: 'gauntlet:supplemental:diplomats-influence-tracker',
      CustomImage: {
        WidthScale: 2.5,
        CustomTile: {
          Type: 0,
          Thickness: 0.05,
          Stackable: false,
          Stretch: true,
        },
      },
    };
    const save = {
      ObjectStates: [
        { Name: 'Bag', ContainedObjects: [territory, deed, portrait, tracker] },
      ],
    };
    const supplementalManifest = {
      ready: [
        {
          id: 'financiers-deed',
          quantity: 1,
          representation: 'card',
          tts: { sidewaysCard: true },
        },
        {
          id: 'diplomats-influence-tracker',
          quantity: 1,
          representation: 'sliding-tracker',
          physicalScale: { cardWidth: 2.5, cardHeight: 3.5 },
          tts: { widthScale: 2.5, heightScale: 3.5 },
        },
      ],
    };

    const result = finalizeSupplementalObjectPresentation(save, supplementalManifest);

    expect(result.sidewaysCount).toBe(1);
    expect(result.landscapeCardCount).toBe(2);
    expect(result.trackerCount).toBe(1);

    expect(territory.Transform.scaleX).toBeCloseTo(LANDSCAPE_SCALE, 8);
    expect(territory.Transform.scaleY).toBe(1);
    expect(territory.Transform.scaleZ).toBeCloseTo(LANDSCAPE_SCALE, 8);

    expect(deed.SidewaysCard).toBe(true);
    expect(deed.Transform.scaleX).toBeCloseTo(LANDSCAPE_SCALE, 8);
    expect(deed.Transform.scaleZ).toBeCloseTo(LANDSCAPE_SCALE, 8);

    expect(portrait.Transform.scaleX).toBe(1);
    expect(portrait.Transform.scaleY).toBe(1);
    expect(portrait.Transform.scaleZ).toBe(1);

    expect(tracker.CustomImage.WidthScale).toBe(2.5);
    expect(tracker.CustomImage.CustomTile.Stretch).toBe(false);
  });
});
