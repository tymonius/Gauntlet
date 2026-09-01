import { describe, expect, it } from 'vitest';
import { imposedPlacementForLogicalPage } from '../scripts/generate-tts-rulebook-reader.mjs';

describe('TTS Rulebook reader de-imposition', () => {
  it('reconstructs logical reading order from booklet imposition', () => {
    expect(imposedPlacementForLogicalPage(8, 0)).toEqual({ imposedPageIndex: 0, slot: 'right' });
    expect(imposedPlacementForLogicalPage(8, 1)).toEqual({ imposedPageIndex: 1, slot: 'left' });
    expect(imposedPlacementForLogicalPage(8, 2)).toEqual({ imposedPageIndex: 2, slot: 'right' });
    expect(imposedPlacementForLogicalPage(8, 3)).toEqual({ imposedPageIndex: 3, slot: 'left' });
    expect(imposedPlacementForLogicalPage(8, 4)).toEqual({ imposedPageIndex: 3, slot: 'right' });
    expect(imposedPlacementForLogicalPage(8, 5)).toEqual({ imposedPageIndex: 2, slot: 'left' });
    expect(imposedPlacementForLogicalPage(8, 6)).toEqual({ imposedPageIndex: 1, slot: 'right' });
    expect(imposedPlacementForLogicalPage(8, 7)).toEqual({ imposedPageIndex: 0, slot: 'left' });
  });

  it('maps every v0.7.1 logical page to one unique imposed half-page', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 100; index += 1) {
      const placement = imposedPlacementForLogicalPage(100, index);
      seen.add(`${placement.imposedPageIndex}:${placement.slot}`);
    }
    expect(seen.size).toBe(100);
  });
});
