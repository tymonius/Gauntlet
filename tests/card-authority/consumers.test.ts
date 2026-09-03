import { describe, expect, it } from 'vitest';
import {
  CARD_AUTHORITY_CONSUMERS,
  validateConsumerContract,
  validateConsumerSource,
} from '../../scripts/card-authority/validate-consumers.mjs';

describe('canonical physical-face consumers', () => {
  it('routes every declared live consumer through face-render.html with canonical identity only', async () => {
    const summary = await validateConsumerContract();
    expect(summary.consumers).toBe(CARD_AUTHORITY_CONSUMERS.length);
    expect(summary.routes).toBeGreaterThanOrEqual(summary.consumers);
  });

  it('rejects caller-selected renderer behavior', () => {
    expect(() => validateConsumerSource(
      'synthetic-consumer.js',
      "const url = '/card-design/face-render.html?id=card:test&orientation=landscape';",
    )).toThrow(/renderer behavior parameter orientation/);
  });

  it('rejects legacy renderer routes even when a canonical route is also present', () => {
    expect(() => validateConsumerSource(
      'synthetic-consumer.js',
      "const next = '/card-design/face-render.html?id=card:test'; const old = '/card-design/card-review-render.html?card=test';",
    )).toThrow(/retired renderer route/);
  });
});
