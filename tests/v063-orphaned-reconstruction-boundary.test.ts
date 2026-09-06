import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const names = [
  'build-clean-v063-faction-authority.mjs',
  'build-clean-v063-rulebook.mjs',
  'certify-clean-v063-authority.mjs',
  'validate-clean-v063-certification.mjs',
  'validate-clean-v063-complete-authority.mjs',
  'validate-clean-v063-current-release-metadata.mjs',
  'validate-clean-v063-deckbuilder.mjs',
  'validate-clean-v063-digital.mjs',
  'validate-clean-v063-faction-authority.mjs',
  'validate-clean-v063-rulebook.mjs',
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

describe('orphaned clean-v0.6.3 reconstruction boundary', () => {
  it('keeps uncalled reconstruction commands out of active scripts', () => {
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
