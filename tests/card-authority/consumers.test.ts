import { describe, expect, it } from 'vitest';
import {
  discoverPhysicalFaceConsumers,
  validateConsumerContract,
  validateConsumerSource,
} from '../../scripts/card-authority/validate-consumers.mjs';

describe('canonical physical-face consumers', () => {
  it('discovers live physical-face consumers and routes all of them through face-render.html with canonical identity only', async () => {
    const discovered = await discoverPhysicalFaceConsumers();
    const summary = await validateConsumerContract();

    expect(summary.consumers).toBe(discovered.length);
    expect(summary.routes).toBeGreaterThanOrEqual(summary.consumers);
    expect(summary.paths).toContain('homepage-card-showcase.js');
    expect(summary.paths).toContain('deckbuilder/production-print.js');
    expect(summary.paths).toContain('card-reference/app.js');
  });

  it('rejects caller-selected renderer behavior', () => {
    expect(() => validateConsumerSource(
      'synthetic-consumer.js',
      "const url = '/card-design/face-render.html?id=card:test&orientation=landscape';",
    )).toThrow(/renderer behavior parameter orientation/);
  });

  it('rejects executable legacy renderer routes even when a canonical route is also present', () => {
    expect(() => validateConsumerSource(
      'synthetic-consumer.js',
      "const next = '/card-design/face-render.html?id=card:test'; frame.src = '/card-design/card-review-render.html?card=test';",
    )).toThrow(/retired renderer route card-review-render\.html/);
  });

  it('does not mistake passive filename registries for physical-face consumers', async () => {
    const discovered = await discoverPhysicalFaceConsumers();
    expect(discovered.map(item => item.path)).not.toContain('scripts/sync-google-analytics.mjs');
  });

  it('rejects the retired homepage showcase shim that escaped the Stage 6 cutover', () => {
    expect(() => validateConsumerSource(
      'synthetic-homepage.js',
      "frame.src = '/card-design/card-showcase-embed.html?card=test&fit=production&releaseTarget=tts';",
    )).toThrow(/retired renderer route card-showcase-embed\.html/);
  });
});
