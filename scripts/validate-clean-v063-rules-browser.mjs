import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/rules-browser';
const rulebookPath = 'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const certificationPath = 'artifacts/reconstruction/clean-v0.6.3/certification/authority-set.json';
const downstreamManifestPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/manifest.json';
const authoritySetId = '2da05383c10fe3e784c64b26fd2d9837913011cad996966f49a7ae3a92af8ed9';
const rulebookSha256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const downstreamCanonicalSha256 = 'fa42934af929e04628449ac34863a3422cd673d862fc9c1f6772b35edeaac5d8';

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const hashFile = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const manifest = readJson(`${outputDir}/manifest.json`);
const certification = readJson(certificationPath);
const downstream = readJson(downstreamManifestPath);
const lifecycle = readJson('config/release-lifecycle.json');
const source = read(rulebookPath);
const index = read(`${outputDir}/index.html`);
const app = read(`${outputDir}/app.js`);
const markdown = read(`${outputDir}/markdown.js`);
const styles = read(`${outputDir}/styles.css`);
const publication = read(`${outputDir}/publication.css`);
const boundary = read(`${outputDir}/source-boundary.md`);

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.target, 'clean-v0.6.3-rules-browser');
assert.equal(manifest.status, 'downstream_candidate_pending_merge_review');
assert.equal(manifest.authority_set_id, authoritySetId);
assert.equal(manifest.certified_rulebook.path, rulebookPath);
assert.equal(manifest.certified_rulebook.sha256, rulebookSha256);
assert.equal(manifest.downstream_prerequisite.canonical_data_sha256, downstreamCanonicalSha256);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');
assert.equal(manifest.rules_arbiter_integrated, false);
assert.equal(manifest.pdf_links_integrated, false);
assert.equal(manifest.historical_v063_browser_role, 'ux_evidence_only_not_authority');
assert.equal(certification.status, 'certified_on_merge');
assert.equal(certification.authority_set_id, authoritySetId);
assert.equal(hashFile(rulebookPath), rulebookSha256);
assert.equal(downstream.authority_set_id, authoritySetId);
assert(downstream.outputs.some((item) => item.path.endsWith('/canonical-data.json') && item.sha256 === downstreamCanonicalSha256));
assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.public_cutover, false);

assert.equal(manifest.outputs.length, 7);
for (const output of manifest.outputs) {
  assert(fs.existsSync(path.join(root, output.path)), `Missing Rules Browser output: ${output.path}`);
  assert.equal(hashFile(output.path), output.sha256, `Hash drift: ${output.path}`);
}

for (const baseline of ['rulebook/app.js', 'rulebook/markdown.js', 'rulebook/styles.css', 'rulebook/publication.css']) {
  assert(manifest.ui_baseline[baseline], `Missing UI-baseline record: ${baseline}`);
  assert.equal(manifest.ui_baseline[baseline].sha256, hashFile(baseline), `Public UI baseline drifted after Browser generation: ${baseline}`);
}
assert.equal(publication, read('rulebook/publication.css'), 'Publication CSS should be inherited from the public browser UI baseline.');
assert(styles.startsWith(read('rulebook/styles.css').trimEnd()), 'Rules Browser base styles drifted from the public UI baseline.');
assert(markdown.includes('../../../../images/'), 'Reconstruction Markdown renderer must resolve repository image paths from the reconstruction directory.');

for (const marker of [
  '<meta name="robots" content="noindex,nofollow" />',
  '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />',
  'Clean v0.6.3 reconstruction candidate',
  'not the current public release',
  'publication remains locked',
  'Certified clean rules · version 0.6.3 · reconstruction only',
  'Certified Markdown',
  'Current public rules (v0.6.1)',
  'PDF and Rules Arbiter surfaces are intentionally absent',
  authoritySetId,
]) assert(index.includes(marker), `Rules Browser HTML missing boundary marker: ${marker}`);
for (const forbidden of [
  '../rules-assistant/widget.js',
  'data-open-rules-assistant',
  'Reader PDF',
  'Print booklet',
  'Canonical rules · version 0.6.1',
  'Official Browser Rulebook',
  'Gauntlet_v0.6.1_Rulebook.md',
  'Gauntlet_v0.6.1_Rulebook.pdf',
]) assert(!index.includes(forbidden), `Rules Browser HTML retained unreconstructed/public dependency: ${forbidden}`);

assert(app.includes("const SOURCE_URL = '../rulebook/Gauntlet_v0.6.3_Rulebook.md';"));
assert(app.includes(`const AUTHORITY_SET_ID = '${authoritySetId}';`));
assert(app.includes('Clean v0.6.3 reconstruction'));
assert(app.includes('certified clean-v0.6.3 Markdown source'));
for (const forbidden of ['PDF_URL', 'data-open-rules-assistant', 'ga-rules-launcher', 'Gauntlet_v0.6.1_Rulebook', 'Canonical v0.6.1']) {
  assert(!app.includes(forbidden), `Rules Browser app retained stale dependency: ${forbidden}`);
}

for (const marker of [
  'Binding rules source',
  rulebookPath,
  authoritySetId,
  'UI/renderer baseline only',
  'not content authority',
  'Public lifecycle remains v0.6.1 current',
]) assert(boundary.includes(marker), `Source-boundary record missing: ${marker}`);

const sourceState = source.replace(/<!--[\s\S]*?-->/g, '');
for (const marker of [
  'Draw four cards',
  'face up in your Discard Pile',
  'After seeing your opening Hand and opening discard',
  'first player',
  'own end of the Gauntlet',
  'Run the Gauntlet',
  'Last Stand',
  'separate legal movement sequence',
  'Gambit/Tactic',
  'Bank:',
  'Asset',
  'Sanction',
  'Removed',
  'bound cards',
  'Manifest Destiny',
  'normal Deed',
]) assert(sourceState.includes(marker), `Certified Rulebook source missing expected clean-v0.6.3 semantic marker: ${marker}`);
for (const stale of [
  'Playable Deck',
  "Each Player Token begins immediately before that player's end of the Gauntlet.",
  "Capture the opponent's final Territory, advance beyond it, begin a Last Stand battle, and win that battle.",
]) assert(!sourceState.includes(stale), `Certified Rulebook source contains stale wording: ${stale}`);

const rendererUrl = `${pathToFileURL(path.join(root, outputDir, 'markdown.js')).href}?validation=1`;
const { renderMarkdown } = await import(rendererUrl);
const rendered = renderMarkdown(source);
assert(rendered.html.length > 50000, 'Rendered clean Rulebook is unexpectedly small.');
assert(rendered.headings.length > 100, 'Rendered clean Rulebook has too few headings.');
for (const heading of ['Part I — Learn to Play', 'Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition']) {
  assert(rendered.headings.some((item) => item.label.includes(heading)), `Rendered browser contents missing heading: ${heading}`);
}
assert(rendered.html.includes('Gambit/Tactic'));
assert(rendered.html.includes('Manifest Destiny'));

console.log(`Clean v0.6.3 Rules Browser validated: certified Rulebook ${rulebookSha256.slice(0, 12)}…, searchable renderer/TOC baseline preserved, reconstruction/publication boundary explicit, no stale Rules Arbiter or PDF dependency.`);
