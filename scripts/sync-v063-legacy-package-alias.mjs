import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lifecycle = JSON.parse(fs.readFileSync(path.join(root, 'config/release-lifecycle.json'), 'utf8'));
const currentVersion = lifecycle.current_release;
const release = lifecycle.releases?.[currentVersion];

assert.equal(currentVersion, 'v0.6.3', 'Legacy package alias synchronizer is scoped to current v0.6.3.');
assert.equal(release?.status, 'current');
assert.equal(release?.current_package_path, 'releases/v0.6.3/');

const canonicalDir = String(release.current_package_path).replace(/\/+$/, '');
const aliases = release.legacy_package_aliases ?? [];
assert(aliases.length > 0, 'v0.6.3 declares no legacy package aliases to synchronize.');

const canonicalAbsolute = path.join(root, canonicalDir);
assert(fs.statSync(canonicalAbsolute).isDirectory(), `Canonical package is missing: ${canonicalDir}`);

for (const aliasValue of aliases) {
  const aliasDir = String(aliasValue).replace(/\/+$/, '');
  assert.notEqual(aliasDir, canonicalDir, 'Legacy package alias cannot equal the canonical package path.');
  const aliasAbsolute = path.join(root, aliasDir);
  fs.rmSync(aliasAbsolute, { recursive: true, force: true });
  fs.cpSync(canonicalAbsolute, aliasAbsolute, { recursive: true });
  console.log(`Synchronized legacy package alias ${aliasDir}/ from ${canonicalDir}/.`);
}
