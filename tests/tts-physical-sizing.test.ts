import { describe, expect, it } from 'vitest';
import { PRODUCTION_SURFACES } from '../card-design/production-surface.mjs';
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
    physicalScale: {
      cardWidth: PRODUCTION_SURFACES.portrait.widthIn,
      cardHeight: PRODUCTION_SURFACES.portrait.heightIn,
    },
    tts: {
      widthScale: PRODUCTION_SURFACES.portrait.widthIn,
      heightScale: PRODUCTION_SURFACES.portrait.heightIn,
      snapTag: 'gauntlet-tracker-influence',
      // These are actual bottom-to-line fractions from the rendered tracker.
      // The first gap is intentionally larger than subsequent scale spacing.
      snapPoints: [
        { value: 0, rendererTravelPx: 0, registrationFraction: 0 },
        { value: 1, rendererTravelPx: 51.54688, registrationFraction: 51.54688 / PRODUCTION_SURFACES.portrait.heightCssPx },
        { value: 2, rendererTravelPx: 74.65625, registrationFraction: 74.65625 / PRODUCTION_SURFACES.portrait.heightCssPx },
        { value: 3, rendererTravelPx: 97.76563, registrationFraction: 97.76563 / PRODUCTION_SURFACES.portrait.heightCssPx },
      ],
    },
  };
}

describe('TTS physical component sizing', () => {
  it('carries actual rendered line fractions directly into live TTS bounds mapping', () => {
    const component = trackerComponent();
    const presentation = trackerPresentation(component);

    expect(STANDARD_CARD_SHORT_EDGE).toBe(PRODUCTION_SURFACES.portrait.widthIn);
    expect(STANDARD_CARD_LONG_EDGE).toBe(PRODUCTION_SURFACES.portrait.heightIn);
    expect(CUSTOM_TILE_CARD_LINEAR_SCALE).toBe(1.5);
    expect(ROUNDED_RECTANGLE_TILE_TYPE).toBe(3);

    expect(presentation.widthScale).toBe(STANDARD_CARD_SHORT_EDGE);
    expect(presentation.transformScale).toBe(CUSTOM_TILE_CARD_LINEAR_SCALE);
    expect(presentation.tileType).toBe(ROUNDED_RECTANGLE_TILE_TYPE);
    expect(presentation.stretch).toBe(true);
    expect(presentation.registrations.map(point => point.registrationFraction)).toEqual(
      component.tts.snapPoints.map(point => point.registrationFraction),
    );

    const gaps = presentation.registrations.slice(1).map((point, index) => (
      point.registrationFraction - presentation.registrations[index].registrationFraction
    ));
    expect(gaps[0]).toBeGreaterThan(gaps[1]);
    expect(gaps[1]).toBeCloseTo(gaps[2], 5);

    expect(presentation.luaScript).toContain('self.getBoundsNormalized()');
    expect(presentation.luaScript).toContain('local localLength = bounds.size.z / scaleZ');
    expect(presentation.luaScript).toContain('-localLength * registration.fraction');
    expect(presentation.luaScript).toContain('Wait.condition(');
    expect(presentation.luaScript).not.toContain('3.06');
    expect(presentation.luaScript).not.toContain('value / max');
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
