import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const retirement = JSON.parse(fs.readFileSync('config/legacy-rulebook-retirement.json', 'utf8'));
const coverage = JSON.parse(fs.readFileSync(retirement.coverageProof, 'utf8'));
const boundary = JSON.parse(fs.readFileSync('config/publication-boundary.json', 'utf8'));

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

assert.equal(retirement.schemaVersion, 1, 'Legacy Rulebook retirement record must use schemaVersion 1.');
assert.equal(retirement.status, 'retired', 'Legacy Rulebook retirement record must explicitly declare status=retired.');
assert.equal(retirement.legacySource, coverage.legacySource, 'Retirement record must identify the source proven by the coverage crosswalk.');
assert.equal(coverage.retirementReadiness, 'coverage-proven', 'Legacy Rulebook retirement requires a coverage-proven crosswalk.');
assert.equal(coverage.routeRetirementIncluded, false, 'Coverage proof and route retirement must remain separate review steps.');

const legacyRoute = boundary.materializedRoutes.find(route => route.publicPath === retirement.retiredRoute);
assert(legacyRoute, `Retired route ${retirement.retiredRoute} must retain an explicit compatibility mapping.`);
assert.equal(legacyRoute.source, retirement.compatibilitySource, 'Retired /rulebook/ route must materialize from the declared compatibility source.');
assert.equal(legacyRoute.kind, 'retired-compatibility', 'Retired /rulebook/ route must not remain a current-app publication surface.');
assert.equal(legacyRoute.manageIndexRoutes, true, 'Retired /rulebook/ compatibility landing must remain in the managed route graph.');

const successorRoute = boundary.materializedRoutes.find(route => route.publicPath === retirement.successorRoute);
assert(successorRoute, `Successor route ${retirement.successorRoute} is not materialized.`);
assert.equal(successorRoute.source, 'apps/rules', 'The active rules successor must remain apps/rules.');
assert.equal(successorRoute.kind, 'current-app', 'The active rules successor must remain a current application.');

for (const mapping of boundary.materializedFiles || []) {
  assert(!mapping.publicPath.startsWith('/rulebook/'), `Retired Rulebook namespace still publishes source file ${mapping.publicPath}.`);
}
for (const retiredAlias of retirement.retiredPublicSourceAliases || []) {
  assert(!boundary.managedRoutes.includes(retiredAlias), `Retired Rulebook alias remains managed: ${retiredAlias}`);
}

assert(!repositoryPathExists('apps/rulebook'), 'Retired Browser Rulebook source must not remain under active apps/.');
assert(repositoryPathExists(retirement.retiredBrowserSource), 'Retired Browser Rulebook source archive is missing.');
assert(repositoryPathExists(`${retirement.compatibilitySource}/index.html`), 'Retired /rulebook/ compatibility landing is missing.');
assert(repositoryPathExists(retirement.historicalRelease.rulebookSource), 'Frozen historical Rulebook source is missing.');
assert(repositoryPathExists(retirement.historicalRelease.booklet), 'Frozen historical Rulebook booklet is missing.');

const compatibilityHtml = fs.readFileSync(`${retirement.compatibilitySource}/index.html`, 'utf8');
assert(compatibilityHtml.includes('url=/rules/'), 'Retired /rulebook/ compatibility landing must redirect to /rules/.');
assert(compatibilityHtml.includes('/releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf'), 'Compatibility landing must preserve a path to the frozen v0.7.1 Rulebook booklet.');

console.log('Legacy Rulebook retirement valid: /rulebook/ is compatibility-only, /rules/ is active, legacy source aliases are unpublished, and v0.7.1 artifacts remain preserved.');
