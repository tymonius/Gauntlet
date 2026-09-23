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

assert.equal(transition.schemaVersion, 2, 'Legacy Rulebook transition record must use schemaVersion 2.');
assert.equal(transition.status, 'cutover-complete', 'Rules publication transition must be complete once v0.7.2 is current.');
assert.equal(transition.cutoverModel, 'retain-browser-shell-replace-released-document-set', 'v0.7.2 must retain the Browser Rulebook shell rather than redirecting /rulebook/.');
assert.equal(transition.legacySource, coverage.legacySource, 'Transition record must identify the source proven by the coverage crosswalk.');
assert.equal(coverage.retirementReadiness, 'coverage-proven', 'Legacy Rulebook retirement requires a coverage-proven crosswalk.');
assert.equal(coverage.routeRetirementIncluded, false, 'Coverage proof and public-route migration must remain separate review steps.');

assert.equal(lifecycle.current_release, transition.cutoverRelease, 'The completed transition must track v0.7.2 as the current rules release.');
assert.equal(transition.releasedVersion, transition.cutoverRelease, 'The transition record must identify the released modular rules version.');
assert.equal(lifecycle.releases?.[transition.cutoverRelease]?.status, 'current', 'The cutover release must be current.');
assert.equal(lifecycle.releases?.[transition.cutoverRelease]?.public_cutover, true, 'The cutover release must have public_cutover=true.');
assert.equal(lifecycle.releases?.[transition.releasedVersionUntilCutover]?.status, 'historical', 'The pre-cutover released version must be historical after cutover.');

const primaryRoute = boundary.materializedRoutes.find(route => route.publicPath === transition.primaryPublicRoute);
assert(primaryRoute, `Primary rules route ${transition.primaryPublicRoute} must remain explicitly materialized.`);
assert.equal(primaryRoute.source, transition.currentPublicSource, 'The primary rules route must materialize from the Browser Rulebook shell.');
assert.equal(primaryRoute.source, transition.browserSource, 'The Browser Rulebook source must remain the deployed rules publication shell.');
assert.equal(primaryRoute.kind, 'current-rules-publication', 'After v0.7.2 cutover, /rulebook/ must be the current modular rules publication.');
assert.equal(primaryRoute.manageIndexRoutes, true, 'The live /rulebook/ surface must remain in the managed route graph.');

const compatibilityRoute = boundary.materializedRoutes.find(route => route.publicPath === transition.compatibilityRoute);
assert(compatibilityRoute, `Compatibility route ${transition.compatibilityRoute} must remain materialized.`);
assert.equal(compatibilityRoute.source, transition.compatibilitySource, 'The /rules/ compatibility route must materialize from apps/rules.');
assert.equal(compatibilityRoute.kind, 'compatibility-route', 'The old standalone /rules/ surface must be compatibility-only.');
assert.equal(compatibilityRoute.manageIndexRoutes, true, 'Compatibility subroutes must remain explicitly managed.');

for (const alias of transition.transitionalPublicSourceAliases || []) {
  const mapping = (boundary.materializedFiles || []).find(file => file.publicPath === alias.publicPath);
  assert(mapping, `Release-transition source alias is missing: ${alias.publicPath}`);
  assert.equal(mapping.source, alias.source, `Release-transition source alias points at the wrong source: ${alias.publicPath}`);
}
assert(boundary.managedRoutes.includes('/rulebook/'), 'Browser Rulebook route must remain managed after cutover.');
assert(boundary.managedRoutes.includes('/rulebook/player-guide-review/'), 'Browser Rulebook review subroute must remain explicitly managed while retained.');
assert(boundary.managedRoutes.includes('/rules/'), 'Compatibility /rules/ route must remain managed.');
assert(!(boundary.materializedFiles || []).some(file => file.publicPath.startsWith('/rules/sources/')), 'Retired standalone /rules/ readers must not stage duplicate Markdown sources.');

assert(!repositoryPathExists('apps/rulebook'), 'Browser Rulebook source should no longer live under active apps/.');
assert(repositoryPathExists(transition.browserSource), 'Browser Rulebook source is missing.');
assert(repositoryPathExists(`${transition.browserSource}/index.html`), 'Browser Rulebook entrypoint is missing.');
assert(repositoryPathExists(`${transition.browserSource}/app.js`), 'Browser Rulebook application logic is missing.');
assert(!repositoryPathExists('legacy/public-compatibility/rulebook'), 'Obsolete plan to redirect /rulebook/ into /rules/ must not remain in the repository.');
assert(repositoryPathExists(transition.historicalRelease.rulebookSource), 'Frozen historical Rulebook source is missing.');
assert(repositoryPathExists(transition.historicalRelease.booklet), 'Frozen historical Rulebook booklet is missing.');

const browserHtml = fs.readFileSync(`${transition.browserSource}/index.html`, 'utf8');
const browserApp = fs.readFileSync(`${transition.browserSource}/app.js`, 'utf8');
assert(browserHtml.includes('data-ruleset="released"'), 'Browser Rulebook must retain its released-ruleset control.');
assert(browserHtml.includes('data-ruleset="candidate"'), 'Browser Rulebook may retain its future-candidate ruleset control while no distinct candidate is active.');
assert(browserHtml.includes('data-candidate-document-switch'), 'Browser Rulebook must expose the modular document selector.');
assert(browserHtml.includes('<option value="player-guide">Player\'s Guide</option>'), 'Modular document selector must default to the Player\'s Guide.');
assert(browserHtml.includes('<option value="complete-rules">Complete Rules</option>'), 'Modular document selector must expose the Complete Rules.');
assert(browserApp.includes("const PUBLISHED_VERSION = 'v0.7.2';"), 'Browser Rulebook must publish v0.7.2 after cutover.');
assert(browserApp.includes("const DEFAULT_CANDIDATE_DOCUMENT = 'player-guide';"), 'Browser Rulebook must default the modular publication to the Player\'s Guide.');
assert(browserApp.includes("sourceUrl: './sources/player-guide.md'"), 'Browser Rulebook candidate view must load the maintained Player\'s Guide source.');
assert(browserApp.includes("sourceUrl: './sources/complete-rules.md'"), 'Browser Rulebook candidate view must load the maintained Complete Rules source.');
for (const faction of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
  assert(browserApp.includes(`sourceUrl: './sources/factions/${faction}.md'`), `Browser Rulebook candidate view must load the maintained ${faction} guide source.`);
}

const candidateAliases = new Map((boundary.materializedFiles || []).map(file => [file.publicPath, file.source]));
assert.equal(candidateAliases.get('/rulebook/sources/player-guide.md'), 'packages/rules/player-guide/player-guide.md', 'Player\'s Guide must be staged inside the Browser Rulebook route.');
assert.equal(candidateAliases.get('/rulebook/sources/complete-rules.md'), 'packages/rules/comprehensive/comprehensive-rules.md', 'Complete Rules must be staged inside the Browser Rulebook route.');
for (const faction of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
  assert.equal(candidateAliases.get(`/rulebook/sources/factions/${faction}.md`), `packages/rules/faction-guides/${faction}.md`, `${faction} guide must be staged inside the Browser Rulebook route.`);
}

const compatibility = JSON.parse(fs.readFileSync('apps/rules/routes.json', 'utf8'));
assert.equal(compatibility.schemaVersion, 2, 'Rules compatibility routes must use schemaVersion 2.');
assert.equal(compatibility.status, 'compatibility-only', 'The standalone rules app must be retired to compatibility-only status.');
assert.equal(compatibility.primaryRulesRoute, transition.primaryPublicRoute, 'Compatibility routes must point back to the primary Browser Rulebook publication.');

const expectedRedirects = new Map([
  ['/rules/', ['apps/rules/index.html', '/rulebook/?doc=player-guide']],
  ['/rules/player-guide/', ['apps/rules/player-guide/index.html', '/rulebook/?doc=player-guide']],
  ['/rules/comprehensive/', ['apps/rules/comprehensive/index.html', '/rulebook/?doc=complete-rules']],
  ['/rules/factions/', ['apps/rules/factions/index.html', '/rulebook/?doc=player-guide#9-the-six-factions']],
  ['/rules/factions/military/', ['apps/rules/factions/military/index.html', '/rulebook/?doc=military']],
  ['/rules/factions/diplomats/', ['apps/rules/factions/diplomats/index.html', '/rulebook/?doc=diplomats']],
  ['/rules/factions/financiers/', ['apps/rules/factions/financiers/index.html', '/rulebook/?doc=financiers']],
  ['/rules/factions/intelligence/', ['apps/rules/factions/intelligence/index.html', '/rulebook/?doc=intelligence']],
  ['/rules/factions/mystics/', ['apps/rules/factions/mystics/index.html', '/rulebook/?doc=mystics']],
  ['/rules/factions/inquisition/', ['apps/rules/factions/inquisition/index.html', '/rulebook/?doc=inquisition']],
]);

assert.deepEqual(new Map(Object.entries(compatibility.redirects || {})), new Map([...expectedRedirects].map(([route, [, target]]) => [route, target])), 'Compatibility redirect manifest does not match the reviewed route map.');
for (const [route, [source, target]] of expectedRedirects) {
  const html = fs.readFileSync(source, 'utf8');
  const escapedTarget = target.replaceAll('&', '&amp;');
  assert(html.includes('name="robots" content="noindex, follow"'), `${route} compatibility page must be noindex.`);
  assert(html.includes(`content="0; url=${escapedTarget}"`), `${route} compatibility page must meta-refresh to ${target}.`);
  assert(html.includes(`href="https://gauntlet.run${escapedTarget}"`), `${route} compatibility page must canonicalize to the Browser Rulebook target.`);
  assert(html.includes('window.location.replace(target);'), `${route} compatibility page must preserve client-side redirect behavior.`);
  assert(!html.includes('data-rules-source='), `${route} must not remain a standalone rules reader.`);
  assert(!html.includes('data-guide-source='), `${route} must not remain a standalone faction-guide reader.`);
}

console.log('Rules publication cutover valid: /rulebook/ is the current modular v0.7.2 publication, v0.7.1 is historical, and /rules/ remains compatibility-only.');
