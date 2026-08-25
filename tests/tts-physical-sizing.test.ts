import { describe, expect, it } from 'vitest';
import {
  CUSTOM_TILE_CARD_LINEAR_SCALE,
  ROUNDED_RECTANGLE_TILE_TYPE,
  STANDARD_CARD_LONG_EDGE,
  STANDARD_CARD_SHORT_EDGE,
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
      snapPoints: [
        { value: 0, offset: 0 },
        { value: 1, offset: 0.35 },
        { value: 2, offset: 1.05 },
      ],
    },
  };
}

describe('TTS physical component sizing', () => {
  it('defines card-sized tracker presentation once for generation and validation', () => {
    const presentation = trackerPresentation(trackerComponent());

    expect(STANDARD_CARD_SHORT_EDGE).toBe(2.5);
    expect(STANDARD_CARD_LONG_EDGE).toBe(3.5);
    expect(CUSTOM_TILE_CARD_LINEAR_SCALE).toBe(1.5);
    expect(ROUNDED_RECTANGLE_TILE_TYPE).toBe(3);

    expect(presentation.widthScale).toBe(STANDARD_CARD_SHORT_EDGE);
    expect(presentation.transformScale).toBe(CUSTOM_TILE_CARD_LINEAR_SCALE);
    expect(presentation.tileType).toBe(ROUNDED_RECTANGLE_TILE_TYPE);
    expect(presentation.stretch).toBe(true);
    expect(presentation.snapPoints).toHaveLength(3);
    expect(presentation.snapPoints[0].Position.z).toBe(0);
    expect(presentation.snapPoints[1].Position.z).toBeCloseTo(-(0.35 / CUSTOM_TILE_CARD_LINEAR_SCALE), 6);
    expect(presentation.snapPoints[2].Position.z).toBeCloseTo(-(1.05 / CUSTOM_TILE_CARD_LINEAR_SCALE), 6);
    expect(presentation.luaScript).toContain('self.setSnapPoints({');
    expect(presentation.luaScript).toContain('gauntlet-tracker-influence');
    expect(presentation.luaScript).toContain('registerGauntletTrackerSnaps()');
    expect(presentation.luaScript).not.toContain('getBoundsNormalized');
    expect(presentation.luaScript).not.toContain('Wait.frames');
  });

  it('fails closed when tracker metadata drifts away from standard card dimensions', () => {
    const component = trackerComponent();
    component.tts.widthScale = 2.2;

    expect(() => trackerPresentation(component)).toThrow(/expected 2\.5 x 3\.5/);
  });
});
