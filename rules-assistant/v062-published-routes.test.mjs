import { describe, expect, test } from 'vitest';
import dispatcher from './worker-entry.js';

async function health(path) {
  const response = await dispatcher.fetch(new Request(`https://gauntlet.run${path}`), {}, {});
  expect(response.status).toBe(200);
  return response.json();
}

describe('Rules Arbiter release routing during recovery', () => {
  test('pins the unversioned public health route to v0.6.1', async () => {
    const payload = await health('/api/health');
    expect(payload.version).toBe('v0.6.1');
  });

  test('preserves explicit withdrawn v0.6.2 and candidate routes without making either the public default', async () => {
    const publishedV062 = await health('/api/v062/health');
    expect(publishedV062.version).toBe('v0.6.2');
    expect(publishedV062.candidate).toBe(false);
    expect(publishedV062.publishedVersion).toBe('v0.6.2');

    const historicalV061 = await health('/api/v061/health');
    expect(historicalV061.version).toBe('v0.6.1');

    const candidate = await health('/api/v062-candidate/health');
    expect(candidate.version).toBe('v0.6.2-candidate');
    expect(candidate.candidate).toBe(true);
  });
});
