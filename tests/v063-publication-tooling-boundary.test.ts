import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const names = [
  'build-clean-v063-publication.mjs',
  'build-clean-v063-publication-arbiter-web.mjs',
  'build-clean-v063-publication-arbiter-worker.mjs',
  'build-clean-v063-publication-core-web.mjs',
  'build-clean-v063-publication-navigation.mjs',
  'build-clean-v063-publication-release.mjs',
  'render-clean-v063-publication.mjs',
  'validate-clean-v063-publication.mjs',
  'validate-clean-v063-publication-data.mjs',
  'validate-clean-v063-publication-surfaces.mjs',
  'verify-clean-v063-live-publication.mjs',
];
const frozenRoot = 'docs/recovery/frozen-scripts/v0.6.3';
const locks = JSON.parse(fs.readFileSync('config/release-locks.json', 'utf8'));
const lockedBlobs = new Map(
  locks.historical_evidence.map((entry: { path: string; git_object: string }) => [entry.path, entry.git_object]),
);

function gitBlobId(bytes: Buffer) {
  const normalized = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  return crypto.createHash('sha1').update(`blob ${normalized.length}\0`).update(normalized).digest('hex');
}

describe('historical v0.6.3 publication tooling boundary', () => {
  it('keeps the superseded publication pipeline out of active scripts', () => {
    for (const name of names) {
      expect(fs.existsSync(`scripts/${name}`), name).toBe(false);
      expect(fs.existsSync(`${frozenRoot}/${name}`), name).toBe(true);
    }
  });

  it('locks every preserved script to its historical Git blob', () => {
    for (const name of names) {
      const path = `${frozenRoot}/${name}`;
      expect(lockedBlobs.get(path), path).toBe(gitBlobId(fs.readFileSync(path)));
    }
  });

  it('keeps maintained checks dependent only on selected frozen evidence', () => {
    const workflow = fs.readFileSync('.github/workflows/current-publication-contract.yml', 'utf8');
    const terminologyWorkflow = fs.readFileSync('.github/workflows/validate-v063-last-stand-language.yml', 'utf8');

    expect(workflow).not.toContain('verify-clean-v063-live-publication.mjs');
    expect(terminologyWorkflow).toContain(`${frozenRoot}/build-clean-v063-publication-core-web.mjs`);
    expect(terminologyWorkflow).toContain(`${frozenRoot}/build-clean-v063-publication-arbiter-web.mjs`);
    expect(terminologyWorkflow).toContain(`${frozenRoot}/build-clean-v063-publication-release.mjs`);
  });
});
