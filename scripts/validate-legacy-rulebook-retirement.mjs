import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const transition = JSON.parse(fs.readFileSync('config/legacy-rulebook-retirement.json', 'utf8'));
const coverage = JSON.parse(fs.readFileSync(transition.coverageProof, 'utf8'));
const boundary = JSON.parse(fs.readFileSync('config/publication-boundary.json', 'utf8'));
const lifecycle = JSON.parse(fs.readFileSync('config/release-lifecycle.json', 'utf8'));

function repositoryPathExists(relative) {
  if (fs.existsSync(path.join(ROOT, relative))) return true;
  try {
    return Boolean(execFileSync('git', ['ls-tree', '-r', 'HEAD', '--', relative], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim());
  } catch {
    return false;
  }
}

assert.equal(transition.schemaVersion, 1, 'Legacy Rulebook transition record must use schemaVersion 1.');
assert.equal(transition.status, 'cutover-pending', 'Legacy Rulebook must remain cutover-pending until the v0.7.2 release cutover.');
assert.equal(transition.legacySource, coverage.legacySource, 'Transition record must identify the source proven by the coverage crosswalk.');
assert.equal(coverage.retirementReadiness, 'coverage-proven', 'Legacy Rulebook retirement requires a coverage-proven crosswalk.');
assert.equal(coverage.routeRetirementIncluded, false, 'Coverage proof and route retirement must remain separate review steps.');

assert.equal(lifecycle.current_release, transition.releasedVersionUntilCutover, 'The transition contract must track the currently released rules version.');
assert.equal(lifecycle.releases?.[transition.releasedVersionUntilCutover]?.status, 'current', 'The released version preserved by /rulebook/ must remain current until cutover.');
assert.notEqual(lifecycle.current_release, transition.cutoverRelease, 'When the cutover release becomes current, this pending transition contract must be completed rather than silently retained.');

const legacyRoute = boundary.materializedRoutes.find(route => route.publicPath === transition.publicRoute);
assert(legacyRoute, `Transition route ${transition.publicRoute} must remain explicitly materialized.`);
assert.equal(legacyRoute.source, transition.currentPublicSource, 'Until cutover, /rulebook/ must materialize from the archived Browser Rulebook source rather than the redirect landing.');
assert.equal(legacyRoute.source, transition.archivedBrowserSource, 'The archived Browser Rulebook must be the deployed release-transition source.');
assert.equal(legacyRoute.kind, 'release-transition-app', 'Until v0.7.2 cutover, /rulebook/ must remain a release-transition application.');
assert.equal(legacyRoute.manageIndexRoutes, true, 'The live /rulebook/ transition surface must remain in the managed route graph.');
assert(!boundary.materializedRoutes.some(route => route.source === transition.postCutoverCompatibilitySource), 'The post-cutover /rulebook/ redirect must be prepared but not yet published.');

const successorRoute = boundary.materializedRoutes.find(route => route.publicPath === transition.successorRoute);
assert(successorRoute, `Successor route ${transition.successorRoute} is not materialized.`);
assert.equal(successorRoute.source, 'apps/rules', 'The new rules architecture must remain apps/rules.');
assert.equal(successorRoute.kind, 'current-app', 'The new rules architecture must remain a current application.');

for (const alias of transition.transitionalPublicSourceAliases || []) {
  const mapping = (boundary.materializedFiles || []).find(file => file.publicPath === alias.publicPath);
  assert(mapping, `Release-transition source alias is missing: ${alias.publicPath}`);
  assert.equal(mapping.source, alias.source, `Release-transition source alias points at the wrong source: ${alias.publicPath}`);
}
assert(boundary.managedRoutes.includes('/rulebook/'), 'Released Browser Rulebook route must remain managed until cutover.');
assert(boundary.managedRoutes.includes('/rulebook/player-guide-review/'), 'Browser Rulebook review subroute must remain managed while its source tree is publicly staged.');

assert(!repositoryPathExists('apps/rulebook'), 'Browser Rulebook source should no longer live under active apps/.');
assert(repositoryPathExists(transition.archivedBrowserSource), 'Archived Browser Rulebook source is missing.');
assert(repositoryPathExists(`${transition.archivedBrowserSource}/index.html`), 'Archived Browser Rulebook entrypoint is missing.');
assert(repositoryPathExists(`${transition.archivedBrowserSource}/app.js`), 'Archived Browser Rulebook application logic is missing.');
assert(repositoryPathExists(`${transition.postCutoverCompatibilitySource}/index.html`), 'Prepared post-cutover /rulebook/ compatibility landing is missing.');
assert(repositoryPathExists(transition.historicalRelease.rulebookSource), 'Frozen historical Rulebook source is missing.');
assert(repositoryPathExists(transition.historicalRelease.booklet), 'Frozen historical Rulebook booklet is missing.');

const browserHtml = fs.readFileSync(`${transition.archivedBrowserSource}/index.html`, 'utf8');
const browserApp = fs.readFileSync(`${transition.archivedBrowserSource}/app.js`, 'utf8');
assert(browserHtml.includes('data-ruleset="released"'), 'Live Browser Rulebook must retain the Released ruleset control until cutover.');
assert(browserHtml.includes('data-ruleset="candidate"'), 'Live Browser Rulebook must retain the release-candidate ruleset control until cutover.');
assert(browserApp.includes("const PUBLISHED_VERSION = 'v0.7.1';"), 'Live Browser Rulebook must keep v0.7.1 as its released ruleset until cutover.');
assert(browserApp.includes("const CURRENT_SOURCE_URL = './player-facing/current-rulebook.md';"), 'Live Browser Rulebook candidate view must continue loading the maintained current Rulebook source.');
assert(browserApp.includes("const RELEASED_MODE = 'released';"), 'Live Browser Rulebook released mode contract is missing.');
assert(browserApp.includes("const CANDIDATE_MODE = 'candidate';"), 'Live Browser Rulebook candidate mode contract is missing.');

const compatibilityHtml = fs.readFileSync(`${transition.postCutoverCompatibilitySource}/index.html`, 'utf8');
assert(compatibilityHtml.includes('url=/rules/'), 'Prepared post-cutover /rulebook/ compatibility landing must redirect to /rules/.');
assert(compatibilityHtml.includes('/releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf'), 'Prepared compatibility landing must preserve a path to the frozen v0.7.1 Rulebook booklet.');

console.log('Legacy Rulebook transition valid: v0.7.1 remains the released /rulebook/ view with its candidate toggle, /rules/ is available in parallel, and the redirect cutover is prepared but dormant until v0.7.2.');
