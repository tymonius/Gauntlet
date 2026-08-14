import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/start';
const authorityPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const rulebookPath = 'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const startersPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json';
const downstreamManifestPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/manifest.json';
const browserRendererPath = 'artifacts/reconstruction/clean-v0.6.3/browser-rulebook/markdown.js';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const rulebookSha256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const startersSha256 = '4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64';
const rendererSha256 = '8cfea16f3176ff999e7e5242f7328d6f90391584fa388091285170c4600364ce';

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const hashFile = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const authority = readJson(authorityPath);
const downstream = readJson(downstreamManifestPath);
const starters = readJson(startersPath);
const manifest = readJson(`${outputDir}/manifest.json`);
const lifecycle = readJson('config/release-lifecycle.json');
const plan = readJson('config/reconstruction-version-plan.json');
const currentPointer = read('src/content/current.ts');
const index = read(`${outputDir}/index.html`);
const app = read(`${outputDir}/app.js`);
const boundary = read(`${outputDir}/source-boundary.md`);
const validationStatus = read(`${outputDir}/validation-status.md`);
const analytics = read('scripts/sync-google-analytics.mjs');
const rulebook = read(rulebookPath);

assert.equal(authority.target, 'clean-v0.6.3-complete');
assert.equal(authority.status, 'certified_on_manual_merge');
assert.equal(authority.authority_set_id, authoritySetId);
assert.equal(authority.publication_unlocked, false);
assert.equal(authority.public_current_release, 'v0.6.1');
const boundRulebook = authority.authority_files.find((item) => item.path === rulebookPath);
assert(boundRulebook, 'Complete authority does not bind the Start Rulebook source.');
assert.equal(boundRulebook.sha256, rulebookSha256);
assert.equal(hashFile(rulebookPath), rulebookSha256);

assert.equal(downstream.authority_set_id, authoritySetId);
const starterOutput = downstream.outputs.find((item) => item.path === startersPath);
assert(starterOutput, 'Downstream manifest does not bind starter-decks.json.');
assert.equal(starterOutput.sha256, startersSha256);
assert.equal(hashFile(startersPath), startersSha256);
assert.equal(starters.version, 'clean-v0.6.3-downstream');
assert.equal(starters.decks.length, 12);
assert(starters.decks.every((deck) => deck.cardCount === 30 && deck.deckbuildingValue === 60));
assert.equal(new Set(starters.decks.map((deck) => deck.factionId)).size, 6);
assert.equal(new Set(starters.decks.map((deck) => `${deck.factionId}:${deck.leaderId}`)).size, 12);
assert(starters.decks.some((deck) => deck.cards.some((card) => card.name === 'Second Line')));

assert.equal(hashFile(browserRendererPath), rendererSha256);
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.target, 'clean-v0.6.3-start');
assert.equal(manifest.status, 'downstream_candidate_pending_merge_review');
assert.equal(manifest.authority_set_id, authoritySetId);
assert.equal(manifest.certified_rulebook.path, rulebookPath);
assert.equal(manifest.certified_rulebook.sha256, rulebookSha256);
assert.equal(manifest.approved_starters.path, startersPath);
assert.equal(manifest.approved_starters.sha256, startersSha256);
assert.equal(manifest.approved_starters.count, 12);
assert.equal(manifest.renderer_baseline.path, browserRendererPath);
assert.equal(manifest.renderer_baseline.sha256, rendererSha256);
assert.equal(manifest.public_start_modified, false);
assert.equal(manifest.clean_deckbuilder_integrated, true);
assert.equal(manifest.clean_print_export_integrated, false);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');
assert.equal(read(`${outputDir}/site.css`), read('site.css'), 'Start site.css UI baseline drifted.');
assert.equal(read(`${outputDir}/styles.css`), read('start/styles.css'), 'Start styles.css UI baseline drifted.');

function extractTopLevel(source, heading) {
  const marker = `# ${heading}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `Rulebook missing Start heading: ${heading}`);
  const next = source.indexOf('\n# ', start + marker.length);
  return source.slice(start, next < 0 ? source.length : next).trim();
}
function extractPartOneHowItWorks(source) {
  const partStart = source.indexOf('# Part I — Learn to Play');
  const partEnd = source.indexOf('# Part II', partStart + 1);
  assert(partStart >= 0 && partEnd > partStart, 'Rulebook Part I boundary missing.');
  const part = source.slice(partStart, partEnd);
  const chapterMatches = [...part.matchAll(/^# (\d+\.\s+[^\n]+)$/gm)];
  const excerpts = [];
  chapterMatches.forEach((match, index) => {
    const bodyStart = match.index + match[0].length;
    const bodyEnd = chapterMatches[index + 1]?.index ?? part.length;
    const body = part.slice(bodyStart, bodyEnd);
    const howMarker = '## How it works';
    const howStart = body.indexOf(howMarker);
    if (howStart < 0) return;
    const afterHeading = howStart + howMarker.length;
    const nextSecondLevel = body.indexOf('\n## ', afterHeading);
    excerpts.push(`# ${match[1].trim()}\n\n${body.slice(afterHeading, nextSecondLevel < 0 ? body.length : nextSecondLevel).trim()}`);
  });
  return excerpts;
}
const partOneExcerpts = extractPartOneHowItWorks(rulebook);
const learningSource = [extractTopLevel(rulebook, 'Welcome to Gauntlet'), extractTopLevel(rulebook, 'Game at a Glance'), extractTopLevel(rulebook, 'How to Win'), ...partOneExcerpts].join('\n\n---\n\n');
assert(partOneExcerpts.length >= 8, `Expected at least eight Part I How it works excerpts; found ${partOneExcerpts.length}.`);
for (const marker of ['Draw four','opening Hand',"player's own end",'Capture → Draw → Opening → Movement → Denouement → Cleanup','Advance','Hold','Fall Back','Gambit','Reserve','Tactic','capture the Territory at your opponent','Last Stand']) {
  assert(learningSource.includes(marker), `Start learning source missing certified marker: ${marker}`);
}
const rendererUrl = `${pathToFileURL(path.join(root, browserRendererPath)).href}?start-validation=3`;
const { renderMarkdown } = await import(rendererUrl);
const rendered = renderMarkdown(learningSource);
assert(rendered.html.length > 3000, 'Rendered Start learning material is unexpectedly small.');
assert(rendered.headings.length >= 10, 'Rendered Start learning material has too few headings.');

for (const marker of [
  '<meta name="robots" content="noindex,nofollow" />',
  'Clean v0.6.3 reconstruction candidate',
  'not the current public release',
  'publication remains locked',
  'First-game rules, directly from authority.',
  'twelve approved competitive starter Decks',
  'Deckbuilder is rebuilt. Print/export remains next.',
  'Open clean Deckbuilder',
  'Current public Start (v0.6.1)',
  'Current public Deckbuilder (v0.6.1)',
  authoritySetId,
]) assert(index.includes(marker), `Start HTML missing reconstruction marker: ${marker}`);
for (const forbidden of ['googletagmanager.com', 'G-8YYYZJGGPE', 'playtest/tracked', 'v0.6.3/start/index.html']) {
  assert(!index.includes(forbidden), `Start HTML retained forbidden dependency: ${forbidden}`);
}
for (const marker of [
  "import { renderMarkdown } from '../browser-rulebook/markdown.js';",
  `const AUTHORITY_SET_ID = '${authoritySetId}';`,
  `const RULEBOOK_SHA256 = '${rulebookSha256}';`,
  `const STARTERS_SHA256 = '${startersSha256}';`,
  'response.arrayBuffer()',
  "crypto.subtle.digest('SHA-256', bytes)",
  'buildLearningSource(rulebookSource)',
  'chapterMatches',
  'starters.decks.length !== 12',
  'deck.cardCount === 30 && deck.deckbuildingValue === 60',
  "const cleanDeckbuilder = document.querySelector('[data-clean-deckbuilder]');",
  "new URL('../deckbuilder/', window.location.href)",
  "url.searchParams.set('faction', deck.factionId)",
  "url.searchParams.set('leader', deck.leaderId)",
  "url.searchParams.set('starter', '1')",
  "url.searchParams.set('source', 'start')",
]) assert(app.includes(marker), `Start runtime missing clean-source/handoff guard: ${marker}`);
for (const forbidden of ['v0.6.3/start/', 'releases/v0.6.3/', 'artifacts/v0.6.3/release-candidate', '../deckbuilder/starter-decks.json', 'gauntlet_standalone_onboarding_v1']) {
  assert(!app.includes(forbidden), `Start runtime retained historical/public content dependency: ${forbidden}`);
}
for (const marker of [
  'Binding sources', rulebookPath, rulebookSha256, startersPath, startersSha256, authoritySetId, 'raw bytes',
  'does not synthesize, summarize, normalize, or replace gameplay prose', 'UX evidence only',
  'The clean Start handoff now targets `artifacts/reconstruction/clean-v0.6.3/deckbuilder/`',
  'Clean Deckbuilder integration is present; print/export handoff remains intentionally absent',
  'v0.6.1 remains current/public',
]) assert(boundary.includes(marker), `Start source boundary missing: ${marker}`);
assert(validationStatus.includes('Status before merge: **candidate**.'));
assert(validationStatus.includes('The Deckbuilder is now integrated into Start. Print/export remains locked.'));
for (const output of manifest.outputs) assert(fs.existsSync(path.join(root, output)), `Missing Start output: ${output}`);
assert(analytics.includes(`"${outputDir}/index.html"`), 'Analytics synchronization does not exclude noindex Start reconstruction.');
assert(!index.includes('gtag('), 'Noindex Start reconstruction must not load production analytics.');

assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(plan.publication_unlocked, false);
assert(currentPointer.includes("export * from './v061';"));
assert(currentPointer.includes("CURRENT_RULES_VERSION = 'v0.6.1'"));

const originalFullDiff = [
  '.github/workflows/build-clean-v063-start.yml',
  `${outputDir}/app.js`, `${outputDir}/index.html`, `${outputDir}/manifest.json`, `${outputDir}/reconstruction.css`, `${outputDir}/site.css`, `${outputDir}/source-boundary.md`, `${outputDir}/styles.css`, `${outputDir}/validation-status.md`,
  'scripts/sync-google-analytics.mjs', 'scripts/validate-clean-v063-faction-pages.mjs', 'scripts/validate-clean-v063-start.mjs',
].sort();
const integrationStartFiles = [
  `${outputDir}/app.js`, `${outputDir}/index.html`, `${outputDir}/manifest.json`, `${outputDir}/source-boundary.md`, `${outputDir}/validation-status.md`,
].sort();

try {
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
  const changedStartFiles = changed.filter((file) => file.startsWith(`${outputDir}/`)).sort();
  const fullStartRebuild = changed.includes('.github/workflows/build-clean-v063-start.yml') || changed.includes(`${outputDir}/site.css`) || changed.includes(`${outputDir}/styles.css`) || changed.includes(`${outputDir}/reconstruction.css`);
  if (fullStartRebuild) {
    assert.deepEqual(changed, originalFullDiff, `Full Start reconstruction diff escaped the original 12-file boundary.\n${changed.join('\n')}`);
  } else if (changedStartFiles.length) {
    assert.deepEqual(changedStartFiles, integrationStartFiles, `Start integration changed an unexpected Start artifact.\n${changedStartFiles.join('\n')}`);
    assert(changed.includes('scripts/validate-clean-v063-start.mjs'), 'Start integration must update its validator in the same commit.');
  } else {
    assert(!changed.includes('.github/workflows/build-clean-v063-start.yml'), 'Shared-dependency run must not modify the Start workflow.');
  }
  assert(!changed.some((file) => file.startsWith('start/')), 'Public v0.6.1 Start changed.');
  assert(!changed.some((file) => file.startsWith('deckbuilder/')), 'Public v0.6.1 Deckbuilder changed.');
  assert(!changed.includes('src/content/current.ts'), 'Current release pointer changed.');
  assert(!changed.includes('config/release-lifecycle.json'), 'Release lifecycle changed.');
} catch (error) {
  if (error instanceof assert.AssertionError) throw error;
  console.warn('Diff-boundary check skipped because HEAD^1 is unavailable in this checkout.');
}

console.log(`Clean v0.6.3 Start validated: ${partOneExcerpts.length} certified Part I teaching excerpts, Rulebook/starter hashes pinned, clean Deckbuilder handoff integrated, print/export still locked.`);
