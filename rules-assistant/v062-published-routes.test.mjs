import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import dispatcher from './worker-entry.js';

const lifecycle = JSON.parse(readFileSync(new URL('../config/release-lifecycle.json', import.meta.url), 'utf8'));
const stagedCurrentVersion = 'v0.7.1';

async function health(path) {
  const response = await dispatcher.fetch(new Request(`https://gauntlet.run${path}`), {}, {});
  expect(response.status).toBe(200);
  return response.json();
}

describe('Rules Arbiter current and historical release routing', () => {
  test('routes the unversioned public health endpoint to the lifecycle current release', async () => {
    expect(lifecycle.current_release).toBe(stagedCurrentVersion);
    const payload = await health('/api/health');
    expect(payload.version).toBe(stagedCurrentVersion);
    expect(payload.currentPublicRelease).toBe(stagedCurrentVersion);
    expect(payload.published).toBe(true);
  });

  test('preserves explicit historical v0.6.1, withdrawn v0.6.2, and candidate routes without making them the public default', async () => {
    const publishedV062 = await health('/api/v062/health');
    expect(publishedV062.version).toBe('v0.6.2');
    expect(publishedV062.candidate).toBe(false);
    expect(publishedV062.publishedVersion).toBe('v0.6.2');

    const historicalV063 = await health('/api/v063/health');
    expect(historicalV063.version).toBe('v0.6.3');
    expect(historicalV063.currentPublicRelease).toBe('v0.6.3');

    const historicalV061 = await health('/api/v061/health');
    expect(historicalV061.version).toBe('v0.6.1');

    const explicitV070 = await health('/api/v070/health');
    expect(explicitV070.version).toBe('v0.7.0');
    expect(explicitV070.currentPublicRelease).toBe('v0.7.0');

    const candidate = await health('/api/v062-candidate/health');
    expect(candidate.version).toBe('v0.6.2-candidate');
    expect(candidate.candidate).toBe(true);
  });
});
