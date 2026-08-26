import { describe, expect, it } from 'vitest';
import {
  CARD_MATCHED_TRACKER_WORLD_LONG_EDGE,
  CUSTOM_TILE_CARD_LINEAR_SCALE,
  ROUNDED_RECTANGLE_TILE_TYPE,
  STANDARD_CARD_LONG_EDGE,
  STANDARD_CARD_SHORT_EDGE,
  TRACKER_LOCAL_LONG_EDGE,
  trackerPresentation,
} from '../scripts/tts-supplemental-geometry.mjs';

function trackerComponent() {
  return {
    id: 'diplomats-influence-tracker',
    physicalScale: { cardWidth: 2.5, cardHeight: 3.5 },
    tts: {
      widthScale: 2.5,
      heightScale: 3.5,
      snapTag: 'gauntlet-tracker-influence',
      // Fractions are measured from the fully-covered card bottom to the
      // actual rendered registration lines. The first gap is intentionally
      // much larger than the later scale spacing.
      snapPoints: [
        { value: 0, rendererTravelPx: 0, registrationFraction: 0 },
        { value: 1, rendererTravelPx: 51.54688, registrationFraction: 51.54688 / 336 },
        { value: 2, rendererTravelPx: 74.65625, registrationFraction: 74.65625 / 336 },
        { value: 3, rendererTravelPx: 97.76563, registrationFraction: 97.76563 / 336 },
      ],
    },
  };
}

describe('TTS physical component sizing', () => {
  it('moves the cover card by each actual rendered bottom-to-line fraction', () => {
    const component = trackerComponent();
    const presentation = trackerPresentation(component);

    expect(STANDARD_CARD_SHORT_EDGE).toBe(2.5);
    expect(STANDARD_CARD_LONG_EDGE).toBe(3.5);
    expect(CARD_MATCHED_TRACKER_WORLD_LONG_EDGE).toBe(3.06);
    expect(CUSTOM_TILE_CARD_LINEAR_SCALE).toBe(1.5);
    expect(TRACKER_LOCAL_LONG_EDGE).toBeCloseTo(3.06 / 1.5, 8);
    expect(ROUNDED_RECTANGLE_TILE_TYPE).toBe(3);

    expect(presentation.widthScale).toBe(STANDARD_CARD_SHORT_EDGE);
    expect(presentation.transformScale).toBe(CUSTOM_TILE_CARD_LINEAR_SCALE);
    expect(presentation.tileType).toBe(ROUNDED_RECTANGLE_TILE_TYPE);
    expect(presentation.stretch).toBe(true);
    expect(presentation.snapPoints).toHaveLength(4);
    expect(presentation.snapPoints[0].Position.z).toBe(0);

    const fractions = component.tts.snapPoints.map(point => point.registrationFraction);
    const worldTravel = presentation.snapPoints.map(point => Math.abs(point.Position.z) * presentation.transformScale);
    worldTravel.forEach((travel, index) => {
      expect(travel).toBeCloseTo(fractions[index] * CARD_MATCHED_TRACKER_WORLD_LONG_EDGE, 6);
      // Starting from full coverage, moving both card centers by this fraction
      // moves the Leader card's bottom edge to the same fraction measured from
      // the tracker bottom — i.e. exactly onto the rendered line.
      const bottomEdgeFromTrackerTop = CARD_MATCHED_TRACKER_WORLD_LONG_EDGE - travel;
      expect(bottomEdgeFromTrackerTop / CARD_MATCHED_TRACKER_WORLD_LONG_EDGE)
        .toBeCloseTo(1 - fractions[index], 6);
    });

    expect(worldTravel[1] - worldTravel[0]).toBeGreaterThan(worldTravel[2] - worldTravel[1]);
    expect(worldTravel[2] - worldTravel[1]).toBeCloseTo(worldTravel[3] - worldTravel[2], 5);

    expect(presentation.luaScript).toContain('self.setSnapPoints({');
    expect(presentation.luaScript).toContain('gauntlet-tracker-influence');
    expect(presentation.luaScript).toContain('registerGauntletTrackerSnaps()');
    expect(presentation.luaScript).not.toContain('getBoundsNormalized');
    expect(presentation.luaScript).not.toContain('Wait.frames');
  });

  it('fails closed if manifests do not contain actual rendered line fractions', () => {
    const component = trackerComponent();
    delete component.tts.snapPoints[1].registrationFraction;

    expect(() => trackerPresentation(component)).toThrow(/invalid renderer line fraction/);
  });

  it('fails closed when tracker metadata drifts away from standard card dimensions', () => {
    const component = trackerComponent();
    component.tts.widthScale = 2.2;

    expect(() => trackerPresentation(component)).toThrow(/expected 2\.5 x 3\.5/);
  });
});
