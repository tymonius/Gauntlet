import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const names = [
  'build-v063-browser-development.mjs',
  'refine-v063-browser-development.mjs',
  'refine-v063-rules-arbiter-portal.mjs',
  'validate-v063-browser-development.mjs',
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

describe('retired v0.6.3 browser-development boundary', () => {
  it('keeps the removed-site pipeline out of active scripts', () => {
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
