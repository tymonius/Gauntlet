import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as canonicalGeometry from '../tools/tts/tts-supplemental-geometry.mjs';
import * as compatibilityGeometry from '../scripts/tts-supplemental-geometry.mjs';
import * as canonicalTrackers from '../tools/tts/tts-sliding-trackers.mjs';
import * as compatibilityTrackers from '../scripts/tts-sliding-trackers.mjs';

describe('TTS tracker tooling source boundary', () => {
  it('preserves the exact geometry and renderer capture functions through established import paths', () => {
    expect(Object.keys(compatibilityGeometry).sort()).toEqual(Object.keys(canonicalGeometry).sort());
    for (const [key, value] of Object.entries(canonicalGeometry)) {
      expect(compatibilityGeometry[key]).toBe(value);
    }
    expect(Object.keys(compatibilityTrackers).sort()).toEqual(Object.keys(canonicalTrackers).sort());
    for (const [key, value] of Object.entries(canonicalTrackers)) {
      expect(compatibilityTrackers[key]).toBe(value);
    }
  });

  it('retains only forwarding logic in the script compatibility entrypoints', () => {
    const geometryShim = readFileSync('scripts/tts-supplemental-geometry.mjs', 'utf8');
    const trackerShim = readFileSync('scripts/tts-sliding-trackers.mjs', 'utf8');
    expect(geometryShim).toContain("export * from '../tools/tts/tts-supplemental-geometry.mjs'");
    expect(trackerShim).toContain("from '../tools/tts/tts-sliding-trackers.mjs'");
    expect(geometryShim).not.toContain('function trackerPresentation');
    expect(trackerShim).not.toContain('function captureProductionTracker');
  });

  it('keeps both maintained files in the TTS workflow path filter', () => {
    const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
    expect(workflow).toContain("'tools/tts/tts-supplemental-geometry.mjs'");
    expect(workflow).toContain("'tools/tts/tts-sliding-trackers.mjs'");
    expect(workflow).toContain('scripts/tts-supplemental-geometry.mjs|tools/tts/tts-supplemental-geometry.mjs');
    expect(workflow).toContain('scripts/tts-sliding-trackers.mjs|tools/tts/tts-sliding-trackers.mjs');
  });
});
