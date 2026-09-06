import { describe, expect, it } from 'vitest';
import {
  normalizeArtDirection,
  parseArtDirectionSource,
  serializeArtDirectionMap,
  updateArtDirectionMap,
} from '../scripts/art-direction-overrides.mjs';

describe('art direction override source', () => {
  it('normalizes focus percentages and preserves partial axes', () => {
    expect(normalizeArtDirection({ focusX: 62.5, zoom: 1.087, fit: 'contain' })).toEqual({
      focusX: 0.625,
      zoom: 1.09,
      fit: 'contain',
    });
    expect(normalizeArtDirection({ focus: [0.42, 0.31] })).toEqual({ focus: [0.42, 0.31] });
  });

  it('preserves complete explicit production directions without compacting defaults', () => {
    const direction = {
      fit: 'cover',
      focusX: 0.5,
      focusY: 0.4182,
      smart: false,
      zoom: 1,
    };
    expect(normalizeArtDirection(direction)).toEqual(direction);
    expect(updateArtDirectionMap({}, 'territory-example', direction)).toEqual({
      'territory-example': direction,
    });
  });

  it('round-trips the source file and sorts ids for stable diffs', () => {
    const source = serializeArtDirectionMap({
      'z-card': { focusY: 0.4 },
      'a-card': { focus: [0.61, 0.37], zoom: 1.08 },
    });
    expect(source.indexOf('"a-card"')).toBeLessThan(source.indexOf('"z-card"'));
    expect(parseArtDirectionSource(source)).toEqual({
      'a-card': { focus: [0.61, 0.37], zoom: 1.08 },
      'z-card': { focusY: 0.4 },
    });
  });

  it('removes an override when the compositor returns to the smart baseline', () => {
    expect(updateArtDirectionMap({ 'a-card': { focusX: 0.6 } }, 'a-card', {})).toEqual({});
  });
});
