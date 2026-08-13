import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
const locks = JSON.parse(fs.readFileSync('config/release-locks.json', 'utf8'));
const failures = [];

function gitObject(path) {
  try {
    return execFileSync('git', ['rev-parse', `HEAD:${path}`], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function checkLock(lock, group) {
  const actual = gitObject(lock.path);
  if (!actual) {
    failures.push(`${group}: locked path is missing: ${lock.path}`);
    return;
  }
  if (actual !== lock.git_object) {
    failures.push(`${group}: ${lock.path} changed; expected ${lock.git_object}, found ${actual}`);
  }
}

for (const lock of locks.historical_evidence ?? []) checkLock(lock, 'historical evidence');

if (lifecycle.current_release === locks.recovery_baseline) {
  for (const lock of locks.current_v061_surfaces ?? []) checkLock(lock, 'v0.6.1 current surface');
}

for (const version of ['v0.6.2', 'v0.6.3']) {
  const release = lifecycle.releases?.[version];
  if (release?.status === 'withdrawn') {
    if (release.artifacts_preserved !== true || release.public_cutover !== false) {
      failures.push(`${version} withdrawal must preserve artifacts and disable public cutover`);
    }
  }
}

if (failures.length) {
  console.error('Release recovery integrity validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Release recovery integrity passed: current=${lifecycle.current_release}; ${locks.historical_evidence.length} evidence locks and ${lifecycle.current_release === locks.recovery_baseline ? locks.current_v061_surfaces.length : 0} current-surface locks verified.`);
