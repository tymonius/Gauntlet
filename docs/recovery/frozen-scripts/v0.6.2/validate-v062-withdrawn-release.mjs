import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
const failures = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(read(path));
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(lifecycle.current_release === 'v0.6.1', `withdrawn v0.6.2 recovery expects v0.6.1 current; found ${lifecycle.current_release}`);
const v062 = lifecycle.releases?.['v0.6.2'];
assert(v062?.status === 'withdrawn', `v0.6.2 lifecycle must be withdrawn; found ${String(v062?.status)}`);
assert(v062?.artifacts_preserved === true, 'withdrawn v0.6.2 must preserve artifacts');
assert(v062?.public_cutover === false, 'withdrawn v0.6.2 must disable public cutover');

try {
  execFileSync(process.execPath, ['scripts/validate-release-recovery-state.mjs'], { stdio: 'inherit' });
} catch {
  failures.push('release recovery Git-object locks failed');
}

const manifest = readJson('releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Manifest.json');
assert(manifest.version === 'v0.6.2', `preserved v0.6.2 manifest version is ${String(manifest.version)}`);
assert(manifest.status === 'published', `historical v0.6.2 manifest must retain its original published status; found ${String(manifest.status)}`);
assert(manifest.publication_date === '2026-08-05', `historical v0.6.2 publication date drifted: ${String(manifest.publication_date)}`);
assert(manifest.previous_version === 'v0.6.1', `historical v0.6.2 previous_version is ${String(manifest.previous_version)}`);
assert(manifest.playable_card_designs === 128, `historical v0.6.2 manifest expected 128 cards; found ${String(manifest.playable_card_designs)}`);
assert(manifest.territories === 25, `historical v0.6.2 manifest expected 25 Territories; found ${String(manifest.territories)}`);
assert(manifest.proposals === 9, `historical v0.6.2 manifest expected 9 Proposals; found ${String(manifest.proposals)}`);
assert(manifest.factions === 6 && manifest.leaders === 12, 'historical v0.6.2 manifest must retain six factions and twelve Leaders');

const canonical = readJson('releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Canonical_Data.json');
assert(canonical.version === 'v0.6.2', `historical v0.6.2 canonical version is ${String(canonical.version)}`);
assert(canonical.cards?.length === 128, `historical v0.6.2 canonical data expected 128 cards; found ${canonical.cards?.length}`);
assert(canonical.territories?.length === 25, `historical v0.6.2 canonical data expected 25 Territories; found ${canonical.territories?.length}`);
assert(canonical.proposals?.length === 9, `historical v0.6.2 canonical data expected 9 Proposals; found ${canonical.proposals?.length}`);
assert(canonical.factions?.length === 6, `historical v0.6.2 canonical data expected six factions; found ${canonical.factions?.length}`);

const printManifest = readJson('releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Print_Manifest.json');
assert(printManifest.version === 'v0.6.2', `historical v0.6.2 print manifest version is ${String(printManifest.version)}`);
const printFiles = new Set((printManifest.outputs ?? []).map((output) => output.file));
for (const file of [
  'Gauntlet_v0.6.2_Rulebook.pdf',
  'Gauntlet_v0.6.2_Rulebook_Booklet.pdf',
  'Gauntlet_v0.6.2_Reference_Guide.pdf',
  'Gauntlet_v0.6.2_Player_Mat.pdf',
  'Gauntlet_v0.6.2_Formal_Playtest_Sheet.pdf',
  'Gauntlet_v0.6.2_Tableside_Pack.pdf',
]) assert(printFiles.has(file), `historical v0.6.2 print manifest omits ${file}`);

const homepage = read('index.html');
const currentContent = read('src/content/current.ts');
const publicWidget = read('rules-assistant/widget.js');
const publishedWorker = read('rules-assistant/worker-v062.js');
assert(homepage.includes('Current canonical playtest edition · v0.6.1'), 'root homepage is not pinned to v0.6.1 during v0.6.2 withdrawal');
assert(!homepage.includes('Current canonical playtest edition · v0.6.2'), 'root homepage still identifies withdrawn v0.6.2 as current');
assert(currentContent.includes("CURRENT_RULES_VERSION = 'v0.6.1'"), 'src/content/current.ts is not pinned to v0.6.1');
assert(publicWidget.includes('version: "v0.6.1"'), 'public Rules Arbiter widget is not pinned to v0.6.1');
assert(publishedWorker.includes('const RULES_VERSION = "v0.6.2"'), 'explicit historical v0.6.2 Rules Arbiter worker is no longer identifiable');
assert(fs.existsSync('legacy/public-versions/v0.6.2/reference/index.html'), 'preserved historical v0.6.2 browser source is missing');

if (failures.length) {
  console.error('Withdrawn v0.6.2 validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Withdrawn v0.6.2 validation passed: original published package and print evidence are immutable, explicit historical access remains, and all unversioned current surfaces are pinned to v0.6.1.');
