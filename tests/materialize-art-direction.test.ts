import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const script = readFileSync('scripts/materialize-art-direction.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/materialize-art-direction.yml', 'utf8');

describe('art-direction materialization migration', () => {
  it('captures only artwork faces blocked by missing or non-final composition authority', () => {
    expect(script).toContain("'artwork-composition-not-explicit'");
    expect(script).toContain("'artwork-composition-not-final'");
    expect(script).toContain("spec.artwork?.role === 'crop'");
    expect(script).toContain('if (targets.length !== 210)');
  });

  it('materializes the currently rendered crop outcome as explicit non-smart authority', () => {
    expect(script).toContain('Number(image.dataset.artFocusX)');
    expect(script).toContain('Number(image.dataset.artFocusY)');
    expect(script).toContain("Number(image.dataset.artZoom || '1')");
    expect(script).toContain('smart: false');
    expect(script).toContain("generatedFrom: 'current legacy production crop output'");
  });

  it('fails on ambiguous shared art-direction keys rather than silently choosing one', () => {
    expect(script).toContain('conflicts.push');
    expect(script).toContain('Materialized art direction produced');
  });

  it('runs in CI and publishes only a candidate artifact, not a production mutation', () => {
    expect(workflow).toContain('node scripts/materialize-art-direction.mjs');
    expect(workflow).toContain('materialized-art-direction');
    expect(script).not.toContain('writeFile(' + JSON.stringify('game-data/current-game.json'));
  });
});
