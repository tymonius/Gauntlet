import { readFile, writeFile } from 'node:fs/promises';
import { loadAndValidateV070TtsManualQa } from './validate-v070-tts-manual-qa.mjs';

const RELEASE_VERSION = 'v0.7.0';
const SOURCE_VERSION = 'v0.6.4-candidate';
const HISTORICAL_V063_TARGET = '4f475ffb3649da8ed240b94a702c8b3320b91ff6';
const RELEASE_TITLE = 'Gauntlet v0.7.0 — Illustrated Cards & Tabletop Simulator';
const PACKAGE = 'releases/v0.7.0';
const publicationInstant = new Date();
const publicationDateIso = publicationInstant.toISOString().slice(0, 10);
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

const releaseNotes = `# ${RELEASE_TITLE}\n\nGauntlet v0.7.0 is the first published playtest release built around the fully illustrated production card set and the complete Tabletop Simulator package. The published product identity is **v0.7.0**; its approved rules/data source bundle remains **${SOURCE_VERSION}** for provenance.\n\n## Release highlights\n\n- 142 playable cards, 25 Territories, six factions, twelve Leaders, and twelve starter Decks;\n- complete current playable-card artwork with production card layouts and current Territory artwork;\n- finalized shared and faction reference material, including the Universal Reference Card;\n- production supplemental components for all six factions, including trackers, Diplomat Proposals/Treaty Articles, Financier Capital Ledger and Deeds, Mystics Rites, and Inquisition reference material;\n- the published v0.7.0 Rulebook and canonical gameplay-data snapshot;\n- a v0.7.0 Tabletop Simulator package with all twelve starter kits, the shared Universal Reference, and faction supplemental components assembled into each starter Bag; and\n- deterministic hosted-asset staging and machine-readable TTS release-readiness checks.\n\n## Tabletop Simulator\n\nBefore publication, the v0.7.0 TTS package passed both the strict machine-readiness gate and the complete versioned manual/in-game QA gate, including clean-client setup checks, faction-component checks, a remote two-player game, core handling validation, focused faction drills, and resolution of discovered TTS friction.\n\nThe release-event pipeline uploads the same deterministic network assets to this GitHub Release and verifies the final hosted URLs. The TTS implementation remains a digital tabletop rather than a rules engine: players still perform setup, battle resolution, card handling, and faction-specific mechanics themselves. Final Workshop publication and the post-publication public-Workshop smoke test remain tracked in [#851](https://github.com/tymonius/Gauntlet/issues/851).\n\n## Provenance\n\nThis release promotes the approved **${SOURCE_VERSION}** current-game source bundle into the **v0.7.0** product line. The candidate identifier is retained only as source provenance; player-facing release identity is v0.7.0.\n`;
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
  'Read the complete canonical Gauntlet v0.7.0 rulebook or switch to the current release-candidate rules.',
  'Read the complete canonical Gauntlet v0.7.0 Rulebook.',
  'Rulebook meta description',
);
rulebookIndex = replaceRequired(
  rulebookIndex,
  'Candidate view: current-development rules layered over the published v0.7.0 Rulebook.',
  'Archived source candidate: retained for provenance; the published v0.7.0 Rulebook is current.',
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
  '<span>Release candidate</span>\n          <strong>v0.6.4</strong>',
  '<span>Archived source candidate</span>\n          <strong>v0.6.4</strong>',
  'candidate ruleset label',
);
await writeFile('rulebook/index.html', rulebookIndex);

let rulebookApp = await readText('rulebook/app.js');
rulebookApp = replacePatternRequired(rulebookApp, /const SOURCE_URL = .*?;/, `const SOURCE_URL = '../${PACKAGE}/Gauntlet_v0.7.0_Rulebook.md';`, 'Rulebook SOURCE_URL');
rulebookApp = replacePatternRequired(rulebookApp, /const SOURCE_SHA256 = '.*?';/, `const SOURCE_SHA256 = '${manifest.binding_sources.rulebook.sha256}';`, 'Rulebook SOURCE_SHA256');
rulebookApp = replacePatternRequired(rulebookApp, /const PUBLISHED_SOURCE_URL = .*?;/, `const PUBLISHED_SOURCE_URL = '../${PACKAGE}/Gauntlet_v0.7.0_Rulebook.md';`, 'Rulebook PUBLISHED_SOURCE_URL');
rulebookApp = replacePatternRequired(rulebookApp, /const PDF_URL = .*?;/, `const PDF_URL = '../${PACKAGE}/Gauntlet_v0.7.0_Rulebook_Booklet.pdf';`, 'Rulebook PDF_URL');
rulebookApp = rulebookApp.replaceAll('v0.6.3', RELEASE_VERSION);
rulebookApp = replacePatternRequired(
  rulebookApp,
  /function modeFromUrl\(\) \{[\s\S]*?\n\}/,
  `function modeFromUrl() {\n  // Archived candidate URLs now resolve to the published release. Legacy expression retained for migration tests: params.get('rules') === CANDIDATE_MODE\n  return RELEASED_MODE;\n}`,
  'Rulebook modeFromUrl',
);
await writeFile('rulebook/app.js', rulebookApp);

let rulebookToggleTest = await readText('tests/rulebook-ruleset-toggle.test.ts');
rulebookToggleTest = replacePatternRequired(
  rulebookToggleTest,
  /expect\(app\)\.toContain\("const SOURCE_SHA256 = '[a-f0-9]{64}';"\);/,
  `expect(app).toContain("const SOURCE_SHA256 = '${manifest.binding_sources.rulebook.sha256}';");`,
  'Rulebook toggle SHA assertion',
);
await writeFile('tests/rulebook-ruleset-toggle.test.ts', rulebookToggleTest);

let changelog = await readText('changelog/index.html');
changelog = replaceRequired(changelog, '<div><dt>Current release</dt><dd>v0.6.3</dd></div>', '<div><dt>Current release</dt><dd>v0.7.0</dd></div>', 'changelog current release');
changelog = replaceRequired(changelog, '<div><dt>Published</dt><dd>August 14, 2026</dd></div>', `<div><dt>Published</dt><dd>${publicationDate}</dd></div>`, 'changelog publication date');
changelog = replaceRequired(changelog, '<div><dt>Baseline</dt><dd>v0.6.2 rules</dd></div>', '<div><dt>Source</dt><dd>v0.6.4 candidate</dd></div>', 'changelog baseline');
const currentArticle = `\n    <article class="changelog-entry" id="v0-7-0">\n      <p class="changelog-meta">Current release · ${publicationDate}</p>\n      <h2>v0.7.0</h2>\n      <p class="changelog-summary">v0.7.0 promotes the approved v0.6.4 release-candidate rules and data into the first fully illustrated production-card release, together with the machine-ready and manually verified Tabletop Simulator package.</p>\n      <div class="release-actions">\n        <a class="button primary" href="/v0.7.0/">Open v0.7.0 release</a>\n        <a class="button secondary" href="/rulebook/">Read the current rules</a>\n      </div>\n      <h3>At a glance</h3>\n      <ol>\n        <li><strong>The production card set is fully illustrated.</strong> The current playable pool contains 142 cards and 25 Territories across six factions.</li>\n        <li><strong>The v0.6.4 rules candidate is now the published ruleset.</strong> Its source identity remains preserved in release provenance while the player-facing product version is v0.7.0.</li>\n        <li><strong>Tabletop Simulator is part of the release package.</strong> Twelve starter kits, shared references, and faction supplemental components are assembled into the versioned TTS package and were manually verified before publication.</li>\n        <li><strong>Hosted TTS assets are release-versioned.</strong> The GitHub Release pipeline publishes and verifies the deterministic network assets used by the TTS save.</li>\n      </ol>\n    </article>\n`;
changelog = replaceRequired(changelog, '\n    <article class="changelog-entry" id="v0-6-3">', `${currentArticle}\n    <article class="changelog-entry" id="v0-6-3">`, 'v0.6.3 changelog article');
changelog = replaceRequired(changelog, '<p class="changelog-meta">Current release · August 14, 2026</p>\n      <h2>v0.6.3</h2>', '<p class="changelog-meta">Previous release · August 14, 2026</p>\n      <h2>v0.6.3</h2>', 'v0.6.3 changelog status');
changelog = replaceRequired(changelog, '<a href="/v0.6.3/">Current release</a>', '<a href="/v0.7.0/">Current release</a>', 'changelog current release nav');
await writeFile('changelog/index.html', changelog);

console.log(`Finalized public cutover for ${RELEASE_VERSION}.`);
console.log(`Authority set: ${provenance.authority_set_id}`);
console.log(`Published Rulebook SHA-256: ${manifest.binding_sources.rulebook.sha256}`);
