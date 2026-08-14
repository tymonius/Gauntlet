import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/faction-pages';
const authorityPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const factionManifestPath = 'artifacts/reconstruction/clean-v0.6.3/faction-guides/authority-manifest.json';
const browserDir = 'artifacts/reconstruction/clean-v0.6.3/browser-rulebook';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';

const rendererBaselines = {
  [`${browserDir}/markdown.js`]: '8cfea16f3176ff999e7e5242f7328d6f90391584fa388091285170c4600364ce',
  [`${browserDir}/styles.css`]: '48488759254c776eec79c39bc381cce3ec9c8200c5370c2556808582ab0531f9',
  [`${browserDir}/publication.css`]: 'a03d50f64995455db8c62eb06a097a15a5168fac521a06b87262af6bfa8fe54f',
};

const guides = [
  {
    route: 'military', label: 'Military', sourceTitle: 'Military', authorityFaction: 'military',
    source: 'artifacts/reconstruction/clean-v0.6.3/faction-guides/military/Gauntlet_v0.6.3_Military_Faction_Guide.md',
    sha256: '23a4260f793ebf5c09d6a62fc2d36d51290ca9ca28c03e3bfe349170eae1c91c', leaders: ['General', 'Commandant'],
  },
  {
    route: 'diplomats', label: 'Diplomats', sourceTitle: 'Diplomat', authorityFaction: 'diplomat',
    source: 'artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md',
    sha256: '99788e5aead16a06e8fc026929e3b362930ebba91a55d40881890a85ae8d4412', leaders: ['Ambassador', 'Senator'],
  },
  {
    route: 'financiers', label: 'Financiers', sourceTitle: 'Financier', authorityFaction: 'financier',
    source: 'artifacts/reconstruction/clean-v0.6.3/faction-guides/financier/Gauntlet_v0.6.3_Financier_Faction_Guide.md',
    sha256: 'f5d07550bdc76db7c2ba6c5243e5539dadef1c27986250d6b89f4cdec6700f6b', leaders: ['Banker', 'Executive'],
  },
  {
    route: 'intelligence', label: 'Intelligence', sourceTitle: 'Intelligence', authorityFaction: 'intelligence',
    source: 'artifacts/reconstruction/clean-v0.6.3/faction-guides/intelligence/Gauntlet_v0.6.3_Intelligence_Faction_Guide.md',
    sha256: '103d5bd4a6758ef3127fa71f19694b5ba428216b1d6c28b9db74fdb8e86d2328', leaders: ['Ranger', 'Spymaster'],
  },
  {
    route: 'mystics', label: 'Mystics', sourceTitle: 'Mystics', authorityFaction: 'mystics',
    source: 'artifacts/reconstruction/clean-v0.6.3/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md',
    sha256: 'b47623ba7a7537e0df5326ccd69967dee4bb7016b2a3b5c2a8d05d1c899e5f1a', leaders: ['Alchemist', 'Spirit Walker'],
  },
  {
    route: 'inquisition', label: 'Inquisition', sourceTitle: 'Inquisition', authorityFaction: 'inquisition',
    source: 'artifacts/reconstruction/clean-v0.6.3/faction-guides/inquisition/Gauntlet_v0.6.3_Inquisition_Faction_Guide.md',
    sha256: 'a489e08ec1daf094e521bc45acc43e119c137fe566cfd8bef2f4d2455e38e3bd', leaders: ['Grand Inquisitor', 'Witch Hunter'],
  },
];

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const hashFile = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const authority = readJson(authorityPath);
const factionManifest = readJson(factionManifestPath);
const manifest = readJson(`${outputDir}/manifest.json`);
const lifecycle = readJson('config/release-lifecycle.json');
const plan = readJson('config/reconstruction-version-plan.json');
const currentPointer = read('src/content/current.ts');
const app = read(`${outputDir}/app.js`);
const index = read(`${outputDir}/index.html`);
const boundary = read(`${outputDir}/source-boundary.md`);
const validationStatus = read(`${outputDir}/validation-status.md`);
const analytics = read('scripts/sync-google-analytics.mjs');

assert.equal(authority.target, 'clean-v0.6.3-complete');
assert.equal(authority.status, 'certified_on_manual_merge');
assert.equal(authority.authority_set_id, authoritySetId);
assert.equal(authority.publication_unlocked, false);
assert.equal(authority.public_current_release, 'v0.6.1');
assert.equal(factionManifest.target, 'clean-v0.6.3');
assert.equal(factionManifest.publication_unlocked, false);

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.target, 'clean-v0.6.3-faction-pages');
assert.equal(manifest.status, 'downstream_candidate_pending_merge_review');
assert.equal(manifest.authority_set_id, authoritySetId);
assert.equal(manifest.authority_certification, authorityPath);
assert.equal(manifest.faction_authority_manifest, factionManifestPath);
assert.equal(manifest.runtime_semantics, 'verbatim_certified_markdown_after_raw_byte_sha256_verification');
assert.equal(manifest.guides.length, 6);
assert.equal(manifest.public_faction_pages_modified, false);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');

for (const [rendererPath, expectedHash] of Object.entries(rendererBaselines)) {
  assert.equal(hashFile(rendererPath), expectedHash, `Clean Browser Rulebook renderer baseline drifted: ${rendererPath}`);
}
assert.equal(manifest.renderer_baseline.markdown.sha256, rendererBaselines[`${browserDir}/markdown.js`]);
assert.equal(manifest.renderer_baseline.styles.sha256, rendererBaselines[`${browserDir}/styles.css`]);
assert.equal(manifest.renderer_baseline.publication.sha256, rendererBaselines[`${browserDir}/publication.css`]);

const rendererUrl = `${pathToFileURL(path.join(root, browserDir, 'markdown.js')).href}?faction-page-validation=1`;
const { renderMarkdown } = await import(rendererUrl);

for (const guide of guides) {
  const certified = authority.authority_files.find((item) => item.path === guide.source);
  assert(certified, `Complete authority set does not bind ${guide.label}.`);
  assert.equal(certified.sha256, guide.sha256, `Complete authority hash drifted for ${guide.label}.`);
  assert.equal(hashFile(guide.source), guide.sha256, `Faction source hash drifted for ${guide.label}.`);

  const factionRecord = factionManifest.guides.find((item) => item.faction === guide.authorityFaction);
  assert(factionRecord, `Faction authority manifest does not bind ${guide.label}.`);
  assert.equal(factionRecord.path, guide.source);
  assert.equal(factionRecord.sha256, guide.sha256);

  const manifestGuide = manifest.guides.find((item) => item.route === guide.route);
  assert(manifestGuide, `Faction-page manifest missing route ${guide.route}.`);
  assert.equal(manifestGuide.source_path, guide.source);
  assert.equal(manifestGuide.sha256, guide.sha256);

  const source = read(guide.source);
  assert(source.startsWith(`# Gauntlet v0.6.3 ${guide.sourceTitle} Faction Guide`));
  assert(source.includes('## How it works'), `${guide.label} authority lacks How it works.`);
  assert(source.includes('## Complete rules'), `${guide.label} authority lacks Complete rules.`);
  for (const leader of guide.leaders) assert(source.includes(leader), `${guide.label} authority missing Leader ${leader}.`);

  const rendered = renderMarkdown(source);
  assert(rendered.html.length > 5000, `${guide.label} rendered output is unexpectedly small.`);
  assert(rendered.headings.length >= 10, `${guide.label} rendered output has too few headings.`);
  assert(rendered.headings.some((item) => item.label.includes(`${guide.sourceTitle} overview`)), `${guide.label} overview heading missing after rendering.`);
  for (const leader of guide.leaders) assert(rendered.html.includes(leader), `${guide.label} rendered output missing Leader ${leader}.`);

  const pagePath = `${outputDir}/${guide.route}/index.html`;
  const page = read(pagePath);
  for (const marker of [
    '<meta name="robots" content="noindex,nofollow" />',
    'Clean v0.6.3 reconstruction candidate',
    'not the current public release',
    'publication remains locked',
    `data-faction="${guide.route}"`,
    guide.label,
    'Clean Rulebook',
    'Clean Card Reference',
    'Current public',
    'v0.6.1',
    authoritySetId,
  ]) assert(page.includes(marker), `${guide.label} page missing reconstruction marker: ${marker}`);
  for (const forbidden of ['googletagmanager.com', 'G-8YYYZJGGPE', 'rules-assistant/widget.js', 'artifacts/v0.6.3/release-candidate']) {
    assert(!page.includes(forbidden), `${guide.label} page retained forbidden dependency: ${forbidden}`);
  }
}

for (const marker of [
  '<meta name="robots" content="noindex,nofollow" />',
  'Six searchable reconstruction pages',
  'guide Markdown remains the gameplay source',
  'Current public factions (v0.6.1)',
  authoritySetId,
]) assert(index.includes(marker), `Faction index missing boundary marker: ${marker}`);
assert(!index.includes('G-8YYYZJGGPE'));
assert(!index.includes('googletagmanager.com'));

for (const marker of [
  "import { renderMarkdown } from '../browser-rulebook/markdown.js';",
  `const AUTHORITY_SET_ID = '${authoritySetId}';`,
  'response.arrayBuffer()',
  "crypto.subtle.digest('SHA-256', bytes)",
  'actualHash !== faction.sha256',
  'renderMarkdown(source)',
  ...guides.map((guide) => guide.sha256),
]) assert(app.includes(marker), `Faction adapter missing certified-source guard: ${marker}`);
for (const forbidden of [
  'releases/v0.6.3/Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
  'artifacts/v0.6.3/release-candidate',
  '../../../../../factions/military/index.html',
]) assert(!app.includes(forbidden), `Faction adapter retained forbidden content source: ${forbidden}`);

for (const marker of [
  'Binding gameplay sources',
  authoritySetId,
  'raw bytes',
  'does not synthesize, summarize, normalize, or replace gameplay prose',
  'renderer/presentation infrastructure',
  'not faction content authority',
  'public `factions/` routes',
  'v0.6.1 remains current/public',
]) assert(boundary.includes(marker), `Faction-page source boundary missing: ${marker}`);
assert(validationStatus.includes('Status before merge: **candidate**.'));

for (const output of manifest.outputs) {
  assert(fs.existsSync(path.join(root, output)), `Missing faction-page reconstruction output: ${output}`);
}

const analyticsPages = [
  `${outputDir}/index.html`,
  ...guides.map((guide) => `${outputDir}/${guide.route}/index.html`),
];
for (const page of analyticsPages) {
  assert(analytics.includes(`"${page}"`), `Analytics synchronization does not exclude noindex faction page: ${page}`);
}

assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(plan.publication_unlocked, false);
assert(currentPointer.includes("export * from './v061';"));
assert(currentPointer.includes("CURRENT_RULES_VERSION = 'v0.6.1'"));

const expectedDiff = [
  '.github/workflows/build-clean-v063-faction-pages.yml',
  `${outputDir}/app.js`,
  `${outputDir}/index.html`,
  `${outputDir}/styles.css`,
  `${outputDir}/military/index.html`,
  `${outputDir}/diplomats/index.html`,
  `${outputDir}/financiers/index.html`,
  `${outputDir}/intelligence/index.html`,
  `${outputDir}/mystics/index.html`,
  `${outputDir}/inquisition/index.html`,
  `${outputDir}/manifest.json`,
  `${outputDir}/source-boundary.md`,
  `${outputDir}/validation-status.md`,
  'scripts/sync-google-analytics.mjs',
  'scripts/validate-clean-v063-card-reference.mjs',
  'scripts/validate-clean-v063-faction-pages.mjs',
].sort();

try {
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, expectedDiff, `Faction-page reconstruction diff escaped the 16-file boundary.\n${changed.join('\n')}`);
  assert(!changed.some((file) => file.startsWith('factions/')), 'Public v0.6.1 faction routes changed in faction-page reconstruction.');
  assert(!changed.includes('src/content/current.ts'), 'Current release pointer changed in faction-page reconstruction.');
  assert(!changed.includes('config/release-lifecycle.json'), 'Release lifecycle changed in faction-page reconstruction.');
} catch (error) {
  if (error instanceof assert.AssertionError) throw error;
  console.warn('Diff-boundary check skipped because HEAD^1 is unavailable in this checkout.');
}

console.log(`Clean v0.6.3 Faction Pages validated: six certified guides, raw-byte hash verification, shared clean renderer pinned, seven noindex routes isolated, public v0.6.1 factions untouched.`);
