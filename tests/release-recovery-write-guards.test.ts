import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('withdrawn-release tooling boundary', () => {
  test('keeps v0.6.2 release tooling frozen outside active scripts', () => {
    const active = readdirSync('scripts').filter((name) => /v062|v0\.6\.2/.test(name));
    expect(active).toEqual([]);

    const frozen = readdirSync('docs/recovery/frozen-scripts/v0.6.2');
    for (const name of [
      'build-v062-release.mjs',
      'build-v062-release-runner.mjs',
      'generate-v062-canonical-data.mjs',
      'render-v062-print-package.mjs',
      'synchronize-v062-print-release.mjs',
      'synchronize-v062-public-site.mjs',
      'validate-v062-withdrawn-release.mjs',
    ]) {
      expect(frozen).toContain(name);
      expect(existsSync(`docs/recovery/frozen-scripts/v0.6.2/${name}`)).toBe(true);
    }
  });
});
