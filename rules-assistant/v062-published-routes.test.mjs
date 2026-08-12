import { describe, expect, test } from 'vitest';
import dispatcher from './worker-entry.js';
import { V063_RULES_VERSION } from './v063-development-corpus.js';

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
  test('routes the public default and explicit v0.6.3 health paths to published v0.6.3', async () => {
    for (const path of ['/api/health', '/api/v063/health']) {
      const payload = await health(path);
      expect(payload.service).toBe('gauntlet-rules-assistant');
      expect(payload.version).toBe('v0.6.3');
      expect(payload.candidate).toBe(false);
      expect(payload.publishedVersion).toBe('v0.6.3');
    }
  });

  test('preserves explicit historical v0.6.2 routing after the public cutover', async () => {
    const payload = await health('/api/v062/health');
    expect(payload.service).toBe('gauntlet-rules-assistant');
    expect(payload.version).toBe('v0.6.2');
    expect(payload.candidate).toBe(false);
    expect(payload.publishedVersion).toBe('v0.6.2');
  });

  test('preserves historical and candidate routes without mixing them into the public default', async () => {
    const historical = await health('/api/v061/health');
    expect(historical.version).toBe('v0.6.1');

    const v062Candidate = await health('/api/v062-candidate/health');
    expect(v062Candidate.version).toBe('v0.6.2-candidate');
    expect(v062Candidate.candidate).toBe(true);

    const v063Candidate = await health('/api/v063-candidate/health');
    expect(v063Candidate.version).toBe(V063_RULES_VERSION);
    expect(v063Candidate.candidate).toBe(true);
  });
});
