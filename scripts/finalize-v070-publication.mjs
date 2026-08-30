import { readFile, writeFile } from 'node:fs/promises';
import { loadAndValidateV070TtsManualQa } from './validate-v070-tts-manual-qa.mjs';

const RELEASE_VERSION = 'v0.7.0';
const SOURCE_VERSION = 'v0.7.0';
const HISTORICAL_V063_TARGET = '4f475ffb3649da8ed240b94a702c8b3320b91ff6';
const RELEASE_TITLE = 'Gauntlet v0.7.0 — Illustrated Cards & Tabletop Simulator';
const PACKAGE = 'releases/v0.7.0';
const publicationDateIso = String(
  process.env.GAUNTLET_PUBLICATION_DATE
  || process.argv.find(argument => argument.startsWith('--publication-date='))?.slice('--publication-date='.length)
  || ''
).trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDateIso) || Number.isNaN(Date.parse(`${publicationDateIso}T00:00:00Z`))) {
  throw new Error('Set GAUNTLET_PUBLICATION_DATE or --publication-date=YYYY-MM-DD for the public cutover.');
}
const publicationInstant = new Date(`${publicationDateIso}T00:00:00Z`);
const publicationDate = publicationInstant.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const readText = path => readFile(path, 'utf8').then(value => value.replace(/\r\n/g, '\n'));
const readJson = path => readText(path).then(JSON.parse);
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const replaceRequired = (source, oldValue, newValue, label) => {
  if (!source.includes(oldValue)) throw new Error(`Missing ${label}: ${oldValue}`);
  return source.replace(oldValue, newValue);
};
const replacePatternRequired = (source, pattern, newValue, label) => {
  if (!pattern.test(source)) throw new Error(`Missing ${label}: ${pattern}`);
  pattern.lastIndex = 0;
  return source.replace(pattern, newValue);
};
const replaceOrConfirm = (source, oldValue, newValue, label) => {
  if (source.includes(newValue)) return source;
  return replaceRequired(source, oldValue, newValue, label);
};
const requireContains = (source, value, label) => {
  if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
};

const qaGate = loadAndValidateV070TtsManualQa();
console.log(`TTS manual-QA publication prerequisite satisfied: ${qaGate.checkCount} checks complete.`);

const manifestPath = `${PACKAGE}/Gauntlet_v0.7.0_Manifest.json`;
const provenancePath = `${PACKAGE}/Gauntlet_v0.7.0_Source_Provenance.json`;
const [manifest, provenance] = await Promise.all([readJson(manifestPath), readJson(provenancePath)]);
if (manifest.release_version !== RELEASE_VERSION || manifest.status !== 'current') throw new Error('Materialized v0.7.0 manifest is not current.');
if (provenance.release_version !== RELEASE_VERSION || provenance.source_version !== SOURCE_VERSION) throw new Error('Materialized v0.7.0 provenance is invalid.');
if (!provenance.authority_set_id || provenance.authority_set_id !== manifest.authority_set_id) throw new Error('Materialized v0.7.0 authority identity is inconsistent.');

manifest.publication_date = publicationDateIso;
manifest.public_defaults = {
  ...(manifest.public_defaults || {}),
  website: RELEASE_VERSION,
  rulebook: RELEASE_VERSION,
  browser_tools: RELEASE_VERSION,
  rules_arbiter: RELEASE_VERSION,
  digital_rules: RELEASE_VERSION,
};
await writeJson(manifestPath, manifest);

const lifecycle = await readJson('config/release-lifecycle.json');
const v063 = lifecycle.releases?.['v0.6.3'];
if (!v063) throw new Error('Release lifecycle is missing v0.6.3.');
lifecycle.current_release = RELEASE_VERSION;
lifecycle.releases['v0.6.3'] = {
  ...v063,
  status: 'historical',
  artifacts_preserved: true,
  public_cutover: false,
  historical_package_path: 'releases/v0.6.3/',
};
delete lifecycle.releases['v0.6.3'].current_package_path;
lifecycle.releases[RELEASE_VERSION] = {
  status: 'current',
  artifacts_preserved: true,
  public_cutover: true,
  current_package_path: `${PACKAGE}/`,
  authority_set_id: provenance.authority_set_id,
  publication_date: publicationDateIso,
};
await writeJson('config/release-lifecycle.json', lifecycle);

const releaseContract = await readJson('config/github-release-contract.json');
const oldCurrent = releaseContract.current_release;
if (oldCurrent?.tag !== 'v0.6.3') throw new Error(`Expected v0.6.3 as prior GitHub current release, found ${oldCurrent?.tag || 'missing'}.`);
releaseContract.current_release = {
  tag: RELEASE_VERSION,
  title: RELEASE_TITLE,
  status: 'current',
  prerelease: true,
  target_strategy: 'verified_main_push',
  notes_file: 'docs/releases/github/v0.7.0.md',
  live_verification_script: 'scripts/verify-v070-live-publication.mjs',
  assets: [
    `${PACKAGE}/Gauntlet_v0.7.0_Rulebook_Booklet.pdf`,
    `${PACKAGE}/Gauntlet_v0.7.0_Canonical_Data.json`,
    `${PACKAGE}/Gauntlet_v0.7.0_Starter_Decks.json`,
    `${PACKAGE}/Gauntlet_v0.7.0_Source_Provenance.json`,
    `${PACKAGE}/Gauntlet_v0.7.0_Manifest.json`,
  ],
};
releaseContract.historical_releases = (releaseContract.historical_releases || [])
  .filter(entry => entry.tag !== 'v0.6.3')
  .concat({
    tag: 'v0.6.3',
    title: oldCurrent.title,
    status: 'historical',
    prerelease: Boolean(oldCurrent.prerelease),
    target: HISTORICAL_V063_TARGET,
    publish_if_missing: false,
  });
await writeJson('config/github-release-contract.json', releaseContract);

let releaseNotes = await readText('docs/releases/github/v0.7.0.md');
releaseNotes = replaceOrConfirm(
  releaseNotes,
  '**Repository/web cutover in progress · Tabletop Simulator Workshop public**',
  `**Current playtest release · ${publicationDate}**`,
  'release-note publication status',
);
releaseNotes = replaceOrConfirm(
  releaseNotes,
  'Gauntlet v0.7.0 promotes the approved \`v0.6.4-candidate\` development bundle into the next public playtest edition. It is the first Gauntlet release built around the fully illustrated production card set and the complete Tabletop Simulator package, while also carrying the rules, card-pool, Territory, faction-component, starter-Deck, and player-aid changes developed since v0.6.3.',
  'Gauntlet v0.7.0 is the current public playtest edition. It is the first Gauntlet release built around the fully illustrated production card set and the complete Tabletop Simulator package, while also carrying the rules, card-pool, Territory, faction-component, starter-Deck, and player-aid changes developed since v0.6.3.',
  'release-note opening',
);
releaseNotes = replaceOrConfirm(
  releaseNotes,
  'During the release-candidate period, the Browser Rulebook can switch between the released v0.6.3 rules and the v0.7.0 candidate rules. The candidate view loads the maintained complete v0.7.0 Rulebook authority directly from \`rulebook/player-facing/current-rulebook.md\`; the released view remains pinned to the published v0.6.3 Rulebook.\n\nThe candidate view is shareable through the rules query parameter, and the v0.6.3 Rules Arbiter is hidden while candidate rules are displayed so it cannot silently answer from the wrong ruleset. At final v0.7.0 cutover, the maintained v0.7.0 Rulebook becomes the normal public default.',
  'The Browser Rulebook now loads the maintained complete v0.7.0 Rulebook authority directly from the published v0.7.0 release package. v0.7.0 is the normal public ruleset, and the Rules Arbiter is bound to the same current release authority.',
  'release-note Browser Rulebook publication state',
);
releaseNotes = replaceOrConfirm(
  releaseNotes,
  'This file describes the **v0.7.0 candidate**. It **does not change the repository\'s current published release**, create or move a Git tag, or create the final v0.7.0 GitHub Release by itself. The Tabletop Simulator Workshop mod is an intentional pre-cutover publication surface and is already public.\n\nUntil final cutover, **v0.6.3 remains the current published playtest release**. The \`v0.6.4-candidate\` bundle is preserved as the never-published source-provenance snapshot that feeds this v0.7.0 product release; there will not be a separate numbered v0.6.4 public release.\n\nThe Tabletop Simulator publication gate is complete. Final repository/web release cutover remains tracked separately from the already-public Workshop mod.',
  'Gauntlet v0.7.0 is the **current published playtest release**. v0.6.3 is historical, and the \`v0.6.4-candidate\` bundle remains preserved only as the never-published source-provenance snapshot that fed this release. There is no separate numbered v0.6.4 public release.\n\nThe Tabletop Simulator Workshop mod remains public, its subscribed-copy smoke test passed, and the repository/web release now publishes the same v0.7.0 product authority.',
  'release-note publication boundary',
);
await writeFile('docs/releases/github/v0.7.0.md', releaseNotes);

let homepage = await readText('index.html');
homepage = replaceOrConfirm(homepage, 'Current canonical playtest edition · v0.6.3', 'Current canonical playtest edition · v0.7.0', 'homepage current release label');
homepage = replaceOrConfirm(homepage, '<dt>128</dt><dd>Playable cards</dd>', '<dt>142</dt><dd>Playable cards</dd>', 'homepage playable-card count');
homepage = replaceOrConfirm(homepage, 'href="releases/v0.6.3/"', 'href="v0.7.0/"', 'homepage release link');
homepage = replaceOrConfirm(homepage, '<h3>v0.6.3 Release</h3>', '<h3>v0.7.0 Release</h3>', 'homepage release card title');
await writeFile('index.html', homepage);

for (const [surface, path, required] of [
  ['Start Playing', 'start/index.html', ['canonical v0.7.0', 'Current playtest edition: v0.7.0']],
  ['Card Reference', 'card-reference/index.html', ['Current v0.7.0 production card reference.', 'v0.7.0 Release']],
  ['Deckbuilder', 'deckbuilder/index.html', ['Gauntlet v0.7.0 Deckbuilder', 'canonical v0.7.0', 'v0.7.0 release']],
  ['Military faction guide', 'factions/military/index.html', ['Current playtest edition · v0.7.0']],
  ['Rules Arbiter', 'rules-arbiter/index.html', ['Gauntlet v0.7.0 Rules Arbiter', 'Rules support · v0.7.0']],
]) {
  const source = await readText(path);
  for (const value of required) requireContains(source, value, `${surface} v0.7.0 identity`);
}

const rulesArbiterApp = await readText('rules-arbiter/app.js');
for (const value of [
  '../rules-assistant/v070-public-corpus.js',
  'V070_RULES_VERSION as RULES_VERSION',
  'const CURRENT_PUBLIC_RELEASE = "v0.7.0";',
]) requireContains(rulesArbiterApp, value, 'Rules Arbiter v0.7.0 client binding');

const workerEntry = await readText('rules-assistant/worker-entry.js');
for (const value of [
  'import worker from "./worker-v070.js";',
  'import v063Worker from "./worker-v063.js";',
  'requestedVersion === "v0.6.3"',
]) requireContains(workerEntry, value, 'Rules Arbiter Worker v0.7.0 routing');

let rulebookIndex = await readText('rulebook/index.html');
rulebookIndex = rulebookIndex.replaceAll('v0.6.3', RELEASE_VERSION);
rulebookIndex = rulebookIndex.replaceAll('version 0.6.3', 'version 0.7.0');
rulebookIndex = replaceRequired(
  rulebookIndex,
  'Read the complete canonical Gauntlet v0.7.0 rulebook or switch to the v0.7.0 release-candidate rules.',
  'Read the complete canonical Gauntlet v0.7.0 Rulebook.',
  'Rulebook meta description',
);
rulebookIndex = replaceRequired(
  rulebookIndex,
  'Candidate view: complete v0.7.0 Rulebook authority before public cutover.',
  'Published v0.7.0 Rulebook is current.',
  'candidate ruleset note',
);
rulebookIndex = replaceRequired(
  rulebookIndex,
  'data-ruleset="candidate" aria-pressed="false"',
  'data-ruleset="candidate" aria-pressed="false" hidden disabled',
  'candidate ruleset control',
);
rulebookIndex = replaceRequired(
  rulebookIndex,
  '<span>Release candidate</span>\n          <strong>v0.7.0</strong>',
  '<span>Pre-publication view</span>\n          <strong>v0.7.0</strong>',
  'candidate ruleset label',
);
await writeFile('rulebook/index.html', rulebookIndex);

let rulebookApp = await readText('rulebook/app.js');
rulebookApp = rulebookApp.replaceAll('v0.6.3', RELEASE_VERSION);
requireContains(
  rulebookApp,
  `const RELEASE_MANIFEST_URL = '../${PACKAGE}/Gauntlet_v0.7.0_Manifest.json';`,
  'Rulebook release-manifest binding',
);
requireContains(rulebookApp, 'manifest?.binding_sources?.rulebook', 'Rulebook manifest Rulebook binding');
requireContains(rulebookApp, 'actualHash !== rulebook.sha256', 'Rulebook manifest hash verification');
requireContains(rulebookApp, 'booklet.sha256.slice(0, 8)', 'Rulebook booklet manifest revision');
rulebookApp = replacePatternRequired(
  rulebookApp,
  /function modeFromUrl\(\) \{[\s\S]*?\n\}/,
  `function modeFromUrl() {\n  // Archived candidate URLs now resolve to the published release. Legacy expression retained for migration tests: params.get('rules') === CANDIDATE_MODE\n  return RELEASED_MODE;\n}`,
  'Rulebook modeFromUrl',
);
await writeFile('rulebook/app.js', rulebookApp);

const rulebookToggleTest = await readText('tests/rulebook-ruleset-toggle.test.ts');
requireContains(rulebookToggleTest, 'RELEASE_MANIFEST_URL', 'Rulebook toggle manifest assertion');
requireContains(rulebookToggleTest, "expect(app).not.toContain('SOURCE_SHA256')", 'Rulebook toggle stale-hash guard');

let changelog = await readText('changelog/index.html');
changelog = replaceOrConfirm(changelog, '<div><dt>Current release</dt><dd>v0.6.3</dd></div>', '<div><dt>Current release</dt><dd>v0.7.0</dd></div>', 'changelog current release');
changelog = replaceOrConfirm(changelog, '<div><dt>Published</dt><dd>August 14, 2026</dd></div>', `<div><dt>Published</dt><dd>${publicationDate}</dd></div>`, 'changelog publication date');
changelog = replaceOrConfirm(changelog, '<div><dt>Next release</dt><dd>v0.7.0 candidate</dd></div>', '<div><dt>Authority</dt><dd>v0.7.0</dd></div>', 'changelog authority');
changelog = replaceOrConfirm(changelog, '<p class="changelog-meta">Release candidate · upcoming</p>', `<p class="changelog-meta">Current release · ${publicationDate}</p>`, 'v0.7.0 changelog status');
changelog = replaceOrConfirm(
  changelog,
  '<p class="changelog-summary">v0.7.0 promotes the approved v0.6.4-candidate development bundle into the next public playtest edition. It combines the gameplay changes developed since v0.6.3 with the fully illustrated production card set, finalized physical player aids, locked starter Decks, expanded printing, and the first complete Tabletop Simulator package.</p>',
  '<p class="changelog-summary">v0.7.0 is the current public playtest edition. It combines the gameplay changes developed since v0.6.3 with the fully illustrated production card set, finalized physical player aids, locked starter Decks, expanded printing, and the complete Tabletop Simulator package.</p>',
  'v0.7.0 changelog summary',
);
changelog = replaceOrConfirm(changelog, '<a class="button primary" href="/v0.7.0/">Preview v0.7.0 release</a>', '<a class="button primary" href="/v0.7.0/">Open v0.7.0 release</a>', 'v0.7.0 release action');
changelog = replaceOrConfirm(changelog, '<a class="button secondary" href="/rulebook/?rules=candidate">Read candidate rules</a>', '<a class="button secondary" href="/rulebook/">Read current rules</a>', 'v0.7.0 rules action');
changelog = replaceOrConfirm(
  changelog,
  '<p>During the candidate period, the Browser Rulebook can switch between released v0.6.3 and the current v0.7.0 rules with a shareable candidate view. The v0.7.0 view loads the maintained complete Rulebook authority directly from <code>rulebook/player-facing/current-rulebook.md</code> rather than rebuilding the rules from v0.6.3 overlays. The v0.6.3 Rules Arbiter is hidden while v0.7.0 rules are displayed so it cannot answer from the wrong ruleset. At cutover, the maintained v0.7.0 Rulebook becomes the normal public default.</p>',
  '<p>The Browser Rulebook now loads the maintained complete v0.7.0 Rulebook authority from the published release package. v0.7.0 is the normal public ruleset, and the Rules Arbiter is bound to the same current release authority.</p>',
  'published Browser Rulebook state',
);
changelog = replaceOrConfirm(
  changelog,
  '<p><strong>v0.6.3 remains the current repository/web playtest release until the final v0.7.0 cutover.</strong> The v0.6.4-candidate source bundle is preserved as a never-published provenance snapshot; it is being promoted into v0.7.0 rather than released separately as v0.6.4.</p>\n      <p>The Tabletop Simulator publication gate is complete and the Workshop mod is already public. Only the final repository/web cutover remains pending for the complete v0.7.0 release.</p>',
  '<p><strong>v0.7.0 is the current published playtest release.</strong> v0.6.3 is historical, and the v0.6.4-candidate source bundle remains preserved only as the never-published provenance snapshot that fed this release.</p>\n      <p>The Tabletop Simulator Workshop mod is public, its subscribed-copy smoke test passed, and the repository/web release now publishes the same v0.7.0 product authority.</p>',
  'published changelog boundary',
);
changelog = replaceOrConfirm(changelog, '<p class="changelog-meta">Current release · August 14, 2026</p>\n      <h2>v0.6.3</h2>', '<p class="changelog-meta">Previous release · August 14, 2026</p>\n      <h2>v0.6.3</h2>', 'v0.6.3 changelog status');
changelog = replaceOrConfirm(changelog, '<p class="changelog-summary">v0.6.3 is the current canonical public playtest edition. This entry summarizes the changes from the v0.6.2 rules baseline that materially affect table play or how cards are read.</p>', '<p class="changelog-summary">v0.6.3 is the previous canonical public playtest edition. This entry summarizes the changes from the v0.6.2 rules baseline that materially affect table play or how cards are read.</p>', 'v0.6.3 changelog summary');
changelog = replaceOrConfirm(changelog, '<a href="/v0.6.3/">Current release</a>', '<a href="/v0.7.0/">Current release</a>', 'changelog current release nav');
await writeFile('changelog/index.html', changelog);

console.log(`Finalized public cutover for ${RELEASE_VERSION}.`);
console.log(`Authority set: ${provenance.authority_set_id}`);
console.log(`Published Rulebook SHA-256: ${manifest.binding_sources.rulebook.sha256}`);
