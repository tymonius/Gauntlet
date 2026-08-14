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

const guides = [
  ['military','Military','military','artifacts/reconstruction/clean-v0.6.3/faction-guides/military/Gauntlet_v0.6.3_Military_Faction_Guide.md','23a4260f793ebf5c09d6a62fc2d36d51290ca9ca28c03e3bfe349170eae1c91c',['General','Commandant']],
  ['diplomats','Diplomats','diplomat','artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md','99788e5aead16a06e8fc026929e3b362930ebba91a55d40881890a85ae8d4412',['Ambassador','Senator']],
  ['financiers','Financiers','financier','artifacts/reconstruction/clean-v0.6.3/faction-guides/financier/Gauntlet_v0.6.3_Financier_Faction_Guide.md','f5d07550bdc76db7c2ba6c5243e5539dadef1c27986250d6b89f4cdec6700f6b',['Banker','Executive']],
  ['intelligence','Intelligence','intelligence','artifacts/reconstruction/clean-v0.6.3/faction-guides/intelligence/Gauntlet_v0.6.3_Intelligence_Faction_Guide.md','103d5bd4a6758ef3127fa71f19694b5ba428216b1d6c28b9db74fdb8e86d2328',['Ranger','Spymaster']],
  ['mystics','Mystics','mystics','artifacts/reconstruction/clean-v0.6.3/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md','b47623ba7a7537e0df5326ccd69967dee4bb7016b2a3b5c2a8d05d1c899e5f1a',['Alchemist','Spirit Walker']],
  ['inquisition','Inquisition','inquisition','artifacts/reconstruction/clean-v0.6.3/faction-guides/inquisition/Gauntlet_v0.6.3_Inquisition_Faction_Guide.md','a489e08ec1daf094e521bc45acc43e119c137fe566cfd8bef2f4d2455e38e3bd',['Grand Inquisitor','Witch Hunter']],
];

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const json = (relative) => JSON.parse(read(relative));
const hash = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const authority = json(authorityPath);
const factionManifest = json(factionManifestPath);
const manifest = json(`${outputDir}/manifest.json`);
const lifecycle = json('config/release-lifecycle.json');
const plan = json('config/reconstruction-version-plan.json');
const current = read('src/content/current.ts');
const app = read(`${outputDir}/app.js`);
const index = read(`${outputDir}/index.html`);
const analytics = read('scripts/sync-google-analytics.mjs');

assert.equal(authority.authority_set_id, authoritySetId);
assert.equal(authority.publication_unlocked, false);
assert.equal(factionManifest.publication_unlocked, false);
assert.equal(manifest.target, 'clean-v0.6.3-faction-pages');
assert.equal(manifest.authority_set_id, authoritySetId);
assert.equal(manifest.guides.length, 6);
assert.equal(manifest.public_faction_pages_modified, false);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');

const rendererPath = `${browserDir}/markdown.js`;
assert.equal(hash(rendererPath), '8cfea16f3176ff999e7e5242f7328d6f90391584fa388091285170c4600364ce');
const { renderMarkdown } = await import(`${pathToFileURL(path.join(root, rendererPath)).href}?faction-page-validation=2`);

for (const [route,label,authorityFaction,source,sha,leaders] of guides) {
  assert.equal(hash(source), sha, `${label} authority hash drifted.`);
  assert.equal(authority.authority_files.find((item) => item.path === source)?.sha256, sha);
  const factionRecord = factionManifest.guides.find((item) => item.faction === authorityFaction);
  assert.equal(factionRecord?.path, source);
  assert.equal(factionRecord?.sha256, sha);
  const manifestGuide = manifest.guides.find((item) => item.route === route);
  assert.equal(manifestGuide?.source_path, source);
  assert.equal(manifestGuide?.sha256, sha);
  const sourceText = read(source);
  const rendered = renderMarkdown(sourceText);
  assert(rendered.html.length > 5000);
  for (const leader of leaders) assert(rendered.html.includes(leader), `${label} rendered output missing ${leader}.`);
  const page = read(`${outputDir}/${route}/index.html`);
  assert(page.includes('<meta name="robots" content="noindex,nofollow" />'));
  assert(page.includes(authoritySetId));
  assert(!page.includes('G-8YYYZJGGPE'));
  assert(analytics.includes(`"${outputDir}/${route}/index.html"`));
}

assert(index.includes('<meta name="robots" content="noindex,nofollow" />'));
assert(index.includes(authoritySetId));
assert(!index.includes('G-8YYYZJGGPE'));
assert(analytics.includes(`"${outputDir}/index.html"`));
assert(app.includes('response.arrayBuffer()'));
assert(app.includes("crypto.subtle.digest('SHA-256', bytes)"));
assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(plan.publication_unlocked, false);
assert(current.includes("CURRENT_RULES_VERSION = 'v0.6.1'"));

const originalRebuildDiff = [
  '.github/workflows/build-clean-v063-faction-pages.yml',
  `${outputDir}/app.js`, `${outputDir}/index.html`, `${outputDir}/styles.css`,
  ...guides.map(([route]) => `${outputDir}/${route}/index.html`),
  `${outputDir}/manifest.json`, `${outputDir}/source-boundary.md`, `${outputDir}/validation-status.md`,
  'scripts/sync-google-analytics.mjs',
  'scripts/validate-clean-v063-card-reference.mjs',
  'scripts/validate-clean-v063-faction-pages.mjs',
].sort();

try {
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean).sort();
  const surfaceChanged = changed.some((file) => file.startsWith(`${outputDir}/`));
  if (surfaceChanged) {
    assert.deepEqual(changed, originalRebuildDiff, `Faction-page reconstruction diff escaped the 16-file boundary.\n${changed.join('\n')}`);
  } else {
    assert(!changed.some((file) => file.startsWith('factions/')), 'Dependency-triggered faction-page validation observed a public faction-page change.');
    assert(!changed.includes('.github/workflows/build-clean-v063-faction-pages.yml'), 'Dependency-triggered validation must not modify the faction-page workflow.');
  }
  assert(!changed.includes('src/content/current.ts'));
  assert(!changed.includes('config/release-lifecycle.json'));
} catch (error) {
  if (error instanceof assert.AssertionError) throw error;
  console.warn('Diff-boundary check skipped because HEAD^1 is unavailable in this checkout.');
}

console.log('Clean v0.6.3 Faction Pages validated: certified guide hashes/rendering intact; dependency-only triggers preserve public/current boundaries.');
