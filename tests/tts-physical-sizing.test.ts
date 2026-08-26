import { describe, expect, it } from 'vitest';
import {
  CUSTOM_TILE_CARD_LINEAR_SCALE,
  ROUNDED_RECTANGLE_TILE_TYPE,
  STANDARD_CARD_LONG_EDGE,
  STANDARD_CARD_SHORT_EDGE,
  TRACKER_RENDER_PX_PER_IN,
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
      // Deliberately irregular renderer positions: the first registration has
      // the large covered-card/header gap; later values use the actual scale
      // spacing. The snapper must preserve these measurements exactly.
      snapPoints: [
        { value: 0, rendererTravelPx: 0, offset: 0 },
        { value: 1, rendererTravelPx: 86.4, offset: 0.9 },
        { value: 2, rendererTravelPx: 144, offset: 1.5 },
        { value: 3, rendererTravelPx: 201.6, offset: 2.1 },
      ],
    },
  };
}

describe('TTS physical component sizing', () => {
  it('uses exact renderer line travel instead of distributing values over the tracker card', () => {
    const presentation = trackerPresentation(trackerComponent());

    expect(STANDARD_CARD_SHORT_EDGE).toBe(2.5);
    expect(STANDARD_CARD_LONG_EDGE).toBe(3.5);
    expect(TRACKER_RENDER_PX_PER_IN).toBe(96);
    expect(CUSTOM_TILE_CARD_LINEAR_SCALE).toBe(1.5);
    expect(ROUNDED_RECTANGLE_TILE_TYPE).toBe(3);

    expect(presentation.widthScale).toBe(STANDARD_CARD_SHORT_EDGE);
    expect(presentation.transformScale).toBe(CUSTOM_TILE_CARD_LINEAR_SCALE);
    expect(presentation.tileType).toBe(ROUNDED_RECTANGLE_TILE_TYPE);
    expect(presentation.stretch).toBe(true);
    expect(presentation.snapPoints).toHaveLength(4);
    expect(presentation.snapPoints[0].Position.z).toBe(0);
    expect(presentation.snapPoints[1].Position.z).toBeCloseTo(-(0.9 / 1.5), 6);
    expect(presentation.snapPoints[2].Position.z).toBeCloseTo(-(1.5 / 1.5), 6);
    expect(presentation.snapPoints[3].Position.z).toBeCloseTo(-(2.1 / 1.5), 6);

    const worldTravel = presentation.snapPoints.map(point => Math.abs(point.Position.z) * presentation.transformScale);
    expect(worldTravel).toEqual([0, 0.9, 1.5, 2.1]);
    expect(worldTravel[1] - worldTravel[0]).toBeCloseTo(0.9, 6);
    expect(worldTravel[2] - worldTravel[1]).toBeCloseTo(0.6, 6);
    expect(worldTravel[3] - worldTravel[2]).toBeCloseTo(0.6, 6);

    expect(presentation.luaScript).toContain('self.setSnapPoints({');
    expect(presentation.luaScript).toContain('gauntlet-tracker-influence');
    expect(presentation.luaScript).toContain('registerGauntletTrackerSnaps()');
    expect(presentation.luaScript).not.toContain('getBoundsNormalized');
    expect(presentation.luaScript).not.toContain('Wait.frames');
  });

  it('fails closed if old manifests do not contain exact renderer registration positions', () => {
    const component = trackerComponent();
    delete component.tts.snapPoints[1].rendererTravelPx;

    expect(() => trackerPresentation(component)).toThrow(/invalid renderer travel/);
  });

  it('fails closed when tracker metadata drifts away from standard card dimensions', () => {
    const component = trackerComponent();
    component.tts.widthScale = 2.2;

    expect(() => trackerPresentation(component)).toThrow(/expected 2\.5 x 3\.5/);
  });
});
