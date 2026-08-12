import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const current = JSON.parse(read('config/current-release.json'));
const fail = (message) => { console.error(`Current-release integrity failed: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };
const requireAll = (file, needles) => {
  assert(exists(file), `missing ${file}`);
  const text = read(file);
  for (const needle of needles) assert(text.includes(needle), `${file} is missing ${JSON.stringify(needle)}`);
  return text;
};

assert(current.status === 'published', 'config/current-release.json does not identify a published release');
assert(/^v\d+\.\d+\.\d+$/.test(current.version), `invalid current version ${current.version}`);
assert(exists(current.manifest), `missing current manifest ${current.manifest}`);
const manifest = JSON.parse(read(current.manifest));
assert(manifest.version === current.version || manifest.release_version === current.version, 'current release config and immutable manifest disagree on version');
assert(manifest.status === 'published', 'immutable current manifest is not published');
assert(manifest.previous_version === current.previousVersion, 'current release config and immutable manifest disagree on previous version');
assert(manifest.public_defaults?.website === current.version, 'immutable manifest website default disagrees with current release');
assert(manifest.public_defaults?.browser_tools === current.version, 'immutable manifest browser-tools default disagrees with current release');
assert(manifest.public_defaults?.rules_arbiter === current.version, 'immutable manifest Rules Arbiter default disagrees with current release');
assert(manifest.public_defaults?.digital_rules === current.version, 'immutable manifest digital rules default disagrees with current release');
for (const p of [current.canonicalData, current.rulebookMarkdown, current.rulebookPdf, current.starterDecks]) assert(exists(p), `missing current artifact ${p}`);

const rootReadme = requireAll('README.md', [
  `**Current canonical version:** ${current.version} — ${current.name}`,
  `releases/${current.version}/`,
  `${current.version}/start/`,
  `${current.version}/rulebook/`,
  `${current.version}/deckbuilder/`,
  `${current.version}/reference/`,
  `Capture the opponent's final Territory`,
  `win the opponent's Last Stand`
]);
assert(!rootReadme.includes('capture the opponent’s final Territory, advance beyond the Territory column, force a Last Stand'), 'README retains retired sequential Last Stand victory rule');

requireAll('docs/README.md', [`**Current playable release:** ${current.version} — ${current.name}`, `../releases/${current.version}/`]);
requireAll('docs/Gauntlet_Development_Status.md', [`**Current canonical version:** ${current.version} — ${current.name}`, '**Release status:** Published']);
requireAll('docs/Gauntlet_Digital_Roadmap.md', [`**Current rules authority:** ${current.version} — ${current.name}`, `../releases/${current.version}/`]);
const prototypeRoadmap = requireAll('docs/Gauntlet_Digital_Prototype_Roadmap.md', ['**Status:** Superseded historical audit snapshot']);
assert(!prototypeRoadmap.includes('**Status:** Active development roadmap and audit snapshot'), 'Digital Prototype Roadmap still claims active status');
requireAll('docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md', ['**Status:** Completed historical pre-publication closeout gate']);
requireAll('docs/Gauntlet_Release_Integrity_Standard.md', ['Single current-release authority', 'Production UI ownership', 'Formal playtest integrity']);

requireAll('index.html', [`Current canonical playtest edition · ${current.version}`, `${current.version}/start/`, `${current.version}/rulebook/`, `${current.version}/deckbuilder/`]);
for (const faction of ['military','diplomats','financiers','intelligence','mystics','inquisition']) requireAll(`factions/${faction}/index.html`, [current.version]);
requireAll('src/content/current.ts', [`export * from './v063'`, `CURRENT_RULES_VERSION = '${current.version}'`]);

requireAll('start/index.html', [`canonical ${current.version}`]);
requireAll('rulebook/index.html', [`Gauntlet ${current.version} Browser Rulebook`, `../releases/${current.version}/Gauntlet_${current.version}_Rulebook.pdf`]);
requireAll('rulebook/app.js', [`releases/${current.version}/Gauntlet_${current.version}_Rulebook.md`, `Canonical ${current.version}`]);
requireAll('deckbuilder/index.html', [current.version]);
requireAll('deckbuilder/app.js', [`releases/${current.version}/Gauntlet_${current.version}_Canonical_Data.json`]);
requireAll('card-reference/app.js', [`releases/${current.version}/Gauntlet_${current.version}_Canonical_Data.json`]);

const handoffs = [
  [`${current.version}/start/index.html`, '/start/'],
  [`${current.version}/rulebook/index.html`, '/rulebook/'],
  [`${current.version}/deckbuilder/index.html`, '/deckbuilder/'],
  [`${current.version}/reference/index.html`, '/card-reference/']
];
for (const [file, target] of handoffs) requireAll(file, [target, 'location.replace']);

requireAll('rules-assistant/widget.js', [current.version]);
requireAll('rules-assistant/worker-current.js', [current.version]);

requireAll('playtest/index.html', [`Gauntlet ${current.version} Playtest Sheet`, `Official ${current.version} human-playtest questionnaire`, `${current.version}/print/`]);
requireAll('playtest/README.md', [`# Gauntlet ${current.version} Playtest Tools`, current.serialPrefix]);
requireAll('playtest/batch/index.html', [`Gauntlet ${current.version} formal playtest sheets`]);
requireAll('playtest/batch/app.js', [`rulesVersion: "${current.version}"`, `health.version !== "${current.version}"`, `gauntlet-v063-playtest-batch-`]);
requireAll('playtest/host/create-event.js', [`health.version !== "${current.version}"`, `rulesVersion: "${current.version}"`]);
requireAll('playtest/session/index.html', [`Gauntlet ${current.version} formal playtest session`, `Formal ${current.version} playtest`, `<dd id="rulesVersion">${current.version}</dd>`]);
requireAll('workers/playtest-sessions/wrangler.toml', ['main = "src/current-release.js"']);
requireAll('workers/playtest-sessions/src/current-release.js', [`CURRENT_RULES_VERSION = "${current.version}"`, `CURRENT_SERIAL_PREFIX = "${current.serialPrefix}"`, 'LEGACY_ENGINE_VERSION = "v0.6.1"']);
requireAll('workers/playtest-sessions/README.md', [`New sessions are created as **${current.version}**`, current.serialPrefix]);

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts?.['test:release-integrity'] === 'node scripts/validate-current-release-integrity.mjs', 'package.json is missing test:release-integrity');
assert(String(packageJson.scripts?.test || '').includes('test:release-integrity'), 'main npm test does not run release-integrity validation');
assert(exists('.github/workflows/current-release-integrity.yml'), 'missing dedicated current-release integrity workflow');

console.log(`Current-release integrity passed for ${current.version} (${current.name}).`);
