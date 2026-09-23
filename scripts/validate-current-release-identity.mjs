import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateCurrentReleaseIdentity(lifecycle, authority) {
  const publishedVersion = String(lifecycle?.current_release || '').trim();
  const published = lifecycle?.releases?.[publishedVersion];
  assert(publishedVersion && published?.status === 'current' && published?.public_cutover === true,
    'Release lifecycle must identify an approved current public release.');

  const sourceVersion = String(authority?.version || '').trim();
  const displayVersion = String(authority?.displayVersion || '').trim();
  const status = String(authority?.status || '').trim();
  const sourceBaseVersion = sourceVersion.replace(/-candidate$/, '');

  assert(sourceVersion && displayVersion, 'Canonical current-game authority must declare version and displayVersion.');
  assert(['current-release', 'active-development'].includes(status),
    `Unsupported current-game release status: ${status || 'missing'}.`);

  if (sourceBaseVersion === publishedVersion || status === 'current-release') {
    assert.equal(sourceVersion, publishedVersion,
      `The official ${publishedVersion} cutover cannot leave the live current-game source as ${sourceVersion}.`);
    assert.equal(displayVersion, publishedVersion,
      `The live current-game displayVersion must be ${publishedVersion} after cutover.`);
    assert.equal(status, 'current-release',
      `The live current-game status must be current-release after ${publishedVersion} cutover.`);
    assert.equal(authority?.starterDecks?.version, publishedVersion,
      `Starter Deck metadata must be promoted to ${publishedVersion}.`);
    const starterMetadata = [
      authority?.starterDecks?.status,
      authority?.starterDecks?.purpose,
      authority?.starterDecks?.optimizationPolicy?.status,
      authority?.starterDecks?.approval?.status,
    ].join(' ');
    assert(!starterMetadata.includes(`${publishedVersion}-candidate`),
      `Starter Deck release metadata still names ${publishedVersion} as a candidate.`);
  } else {
    // A newly started candidate may be the current development source while
    // the preceding published release remains immutable and publicly current.
    assert.equal(status, 'active-development',
      'Only active development may have a live source version different from the published release.');
    assert.equal(displayVersion, sourceVersion,
      'Active-development source and display versions must agree.');
  }

  return Object.freeze({ publishedVersion, sourceVersion, displayVersion, status });
}

const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const lifecycle = JSON.parse(fs.readFileSync('config/release-lifecycle.json', 'utf8'));
  const authority = JSON.parse(fs.readFileSync('packages/game-data/current-game.json', 'utf8'));
  const identity = validateCurrentReleaseIdentity(lifecycle, authority);
  console.log(`Current-release identity passed: public ${identity.publishedVersion}; canonical ${identity.sourceVersion} (${identity.status}).`);
}
