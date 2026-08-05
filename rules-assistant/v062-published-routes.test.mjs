import { describe, expect, test } from 'vitest';
import dispatcher from './worker-entry.js';

async function health(path) {
  const response = await dispatcher.fetch(
    new Request(`https://gauntlet.run${path}`),
    {},
    {},
  );
  expect(response.status).toBe(200);
  return response.json();
}

describe('published Rules Arbiter routing', () => {
  test('routes both public and versioned v0.6.2 health paths to the published worker', async () => {
    for (const path of ['/api/health', '/api/v062/health']) {
      const payload = await health(path);
      expect(payload.version).toBe('v0.6.2');
      expect(payload.candidate).toBe(false);
      expect(payload.publishedVersion).toBe('v0.6.2');
    }
  });

  test('preserves explicit historical and candidate routes without mixing them into the public default', async () => {
    const historical = await health('/api/v061/health');
    expect(historical.version).toBe('v0.6.1');

    const candidate = await health('/api/v062-candidate/health');
    expect(candidate.version).toBe('v0.6.2-candidate');
    expect(candidate.candidate).toBe(true);
  });
});
