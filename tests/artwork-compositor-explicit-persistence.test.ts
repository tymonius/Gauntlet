import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const compositor = readFileSync('card-design/artwork-compositor.js', 'utf8');
const localFormat = readFileSync('scripts/art-direction-overrides.mjs', 'utf8');
const workerFormat = readFileSync('workers/artwork-authoring/src/format.js', 'utf8');

describe('artwork compositor production persistence', () => {
  it('materializes auto/smart authoring controls before saving or copying', () => {
    expect(compositor).toContain('function resolveExplicitDirection()');
    expect(compositor).toContain('const result = window.GauntletArtworkCrop.apply(previewImage, directionFromControls()');
    expect(compositor).toContain('fit: ui.fit.value === \'contain\' ? \'contain\' : \'cover\'');
    expect(compositor).toContain('focusX: round(Number(result.focusX) / 100, 4)');
    expect(compositor).toContain('focusY: round(Number(result.focusY) / 100, 4)');
    expect(compositor).toContain('smart: false');
    expect(compositor).toContain('zoom: round(clamp(Number.parseFloat(ui.zoomNumber.value) || 1');
  });

  it('persists and copies the materialized direction rather than partial control state', () => {
    const copyBlock = compositor.slice(
      compositor.indexOf('async function copyOverride()'),
      compositor.indexOf('async function savePosition()'),
    );
    const saveBlock = compositor.slice(
      compositor.indexOf('async function savePosition()'),
      compositor.indexOf('function cropMetrics()'),
    );

    expect(copyBlock).toContain('const direction = resolveExplicitDirection()');
    expect(copyBlock).not.toContain('overrideLine(state.id, directionFromControls())');
    expect(saveBlock).toContain('direction = resolveExplicitDirection()');
    expect(saveBlock).not.toContain('const direction = directionFromControls()');
  });

  it('keeps complete explicit defaults intact through both persistence normalizers', () => {
    for (const source of [localFormat, workerFormat]) {
      expect(source).toContain('const completeExplicit = source.smart === false');
      expect(source).toContain("source.fit === 'cover' || source.fit === 'contain'");
      expect(source).toContain('focusX,');
      expect(source).toContain('focusY,');
      expect(source).toContain('smart: false');
      expect(source).toContain('zoom: round(clamp(zoom, 1, 1.8), 4)');
    }
  });
});
