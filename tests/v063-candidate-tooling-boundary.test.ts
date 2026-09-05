import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const names = [
  'build-clean-v063-complete-authority.mjs',
  'build-v063-card-normalization.mjs',
  'finalize-v063-card-conventions.mjs',
  'apply-v063-general-card-rules.mjs',
  'apply-v063-numeric-shorthand.mjs',
  'apply-v063-compact-shorthand.mjs',
  'apply-v063-natural-advantage-wording.mjs',
  'apply-v063-advantage-capitalization.mjs',
  'apply-v063-asset-language.mjs',
  'apply-v063-gambit-tactic-headings.mjs',
  'apply-v063-poolwide-card-refinements.mjs',
  'apply-v063-final-artifact-audit.mjs',
  'finalize-v063-poolwide-integrity.mjs',
  'apply-v063-finalized-forward-conventions.mjs',
  'sync-v063-final-card-mirrors.mjs',
  'generate-v063-canonical-data-candidate.mjs',
  'generate-v063-player-facing-candidates.mjs',
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

describe('retired v0.6.3 candidate tooling boundary', () => {
  it('keeps the closed candidate-authority pipeline out of active scripts', () => {
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

  it('keeps active terminology validation pointed at historical evidence', () => {
    const frozenCandidate = `${frozenRoot}/generate-v063-canonical-data-candidate.mjs`;
    const validator = fs.readFileSync('scripts/validate-v063-last-stand-language.mjs', 'utf8');
    const workflow = fs.readFileSync('.github/workflows/validate-v063-last-stand-language.yml', 'utf8');

    expect(validator).toContain(frozenCandidate);
    expect(workflow).toContain(frozenCandidate);
  });
});
