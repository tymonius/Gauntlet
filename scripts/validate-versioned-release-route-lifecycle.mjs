import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lifecycle = JSON.parse(fs.readFileSync(path.join(root, 'config', 'release-lifecycle.json'), 'utf8'));

function versionDirectories() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^v\d+\.\d+\.\d+$/.test(entry.name))
    .map(entry => entry.name)
    .filter(version => fs.existsSync(path.join(root, version, 'index.html')))
    .sort();
}

function htmlFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...htmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(target);
  }
  return result;
}

const staleCurrentClaims = [
  /current canonical public playtest release/i,
  /current canonical playtest release/i,
  /current canonical playtest edition/i,
  /the current public playtest edition/i,
  /current playtest release/i,
  /everything points to the current game/i,
  /for current playtesting/i,
  /current rule documents/i,
  /files linked above are the current package/i,
];

const versions = versionDirectories();
assert(versions.length > 0, 'No versioned public landing routes were found.');

for (const version of versions) {
  const release = lifecycle.releases?.[version];
  assert(release, `Versioned public route ${version}/ has no release-lifecycle entry.`);
  assert(['current', 'historical', 'withdrawn'].includes(release.status), `${version} has unsupported lifecycle status ${release.status}.`);

  const landingPath = path.join(root, version, 'index.html');
  const landing = fs.readFileSync(landingPath, 'utf8');
  assert(
    landing.includes(`data-release-version="${version}"`),
    `${version}/ landing does not declare its release version.`,
  );
  assert(
    landing.includes(`data-release-status="${release.status}"`),
    `${version}/ landing does not match lifecycle status ${release.status}.`,
  );

  if (release.status !== 'current') {
    for (const pagePath of htmlFiles(path.join(root, version))) {
      const page = fs.readFileSync(pagePath, 'utf8');
      for (const pattern of staleCurrentClaims) {
        assert(
          !pattern.test(page),
          `${path.relative(root, pagePath)} still presents ${version} as current: ${pattern}`,
        );
      }
    }
  }
}

const current = lifecycle.current_release;
assert(current, 'Release lifecycle does not declare current_release.');
assert.equal(lifecycle.releases?.[current]?.status, 'current', `current_release ${current} is not marked current.`);
assert(versions.includes(current), `Current release ${current} has no versioned public landing route.`);

console.log(`Versioned release-route lifecycle semantics passed: ${versions.map(version => `${version}=${lifecycle.releases[version].status}`).join(', ')}.`);
