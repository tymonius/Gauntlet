import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const names = [
  'validate-v063-advantage-stacking.mjs',
  'validate-v063-browser-site-conventions.mjs',
  'validate-v063-canonical-promotion-boundary.mjs',
  'validate-v063-card-rendering-conventions.mjs',
  'validate-v063-finalized-tracker.mjs',
  'validate-v063-long-card-review.mjs',
  'validate-v063-print-visual-regressions.mjs',
  'validate-v063-shared-rules.mjs',
  'validate-v063-starter-guidance.mjs',
  'materialize-v063-finalized-tracker-snapshot.mjs',
  'sync-v063-rulebook-card-text.mjs',
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

describe('orphaned v0.6.3 editorial tooling boundary', () => {
  it('keeps uncalled candidate utilities out of active scripts', () => {
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
});
