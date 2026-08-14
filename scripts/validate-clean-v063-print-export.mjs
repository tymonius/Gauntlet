import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/print-export';
const generatedDir = `${outputDir}/generated`;
const authorityPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const downstreamManifestPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/manifest.json';
const canonicalPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
const startersPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json';
const rulebookPath = 'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const rendererPath = 'artifacts/reconstruction/clean-v0.6.3/browser-rulebook/markdown.js';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const canonicalSha256 = '641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c';
const startersSha256 = '4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64';
const rulebookSha256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const rendererSha256 = '8cfea16f3176ff999e7e5242f7328d6f90391584fa388091285170c4600364ce';
const factionGuides = [
  ['Military', 'military', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/military/Gauntlet_v0.6.3_Military_Faction_Guide.md', '23a4260f793ebf5c09d6a62fc2d36d51290ca9ca28c03e3bfe349170eae1c91c'],
  ['Diplomats', 'diplomats', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md', '99788e5aead16a06e8fc026929e3b362930ebba91a55d40881890a85ae8d4412'],
  ['Financiers', 'financiers', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/financier/Gauntlet_v0.6.3_Financier_Faction_Guide.md', 'f5d07550bdc76db7c2ba6c5243e5539dadef1c27986250d6b89f4cdec6700f6b'],
  ['Intelligence', 'intelligence', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/intelligence/Gauntlet_v0.6.3_Intelligence_Faction_Guide.md', '103d5bd4a6758ef3127fa71f19694b5ba428216b1d6c28b9db74fdb8e86d2328'],
  ['Mystics', 'mystics', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md', 'b47623ba7a7537e0df5326ccd69967dee4bb7016b2a3b5c2a8d05d1c899e5f1a'],
  ['Inquisition', 'inquisition', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/inquisition/Gauntlet_v0.6.3_Inquisition_Faction_Guide.md', 'a489e08ec1daf094e521bc45acc43e119c137fe566cfd8bef2f4d2455e38e3bd'],
];

const readBuffer = (relative) => fs.readFileSync(path.join(root, relative));
const read = (relative) => readBuffer(relative).toString('utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const hashFile = (relative) => crypto.createHash('sha256').update(readBuffer(relative)).digest('hex');
const normalized = (relative) => read(relative).replace(/\s+$/, '') + '\n';
const slugify = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const authority = readJson(authorityPath);
const downstream = readJson(downstreamManifestPath);
const canonical = readJson(canonicalPath);
const starters = readJson(startersPath);
const manifest = readJson(`${outputDir}/manifest.json`);
const generatedManifestPath = `${generatedDir}/Gauntlet_clean-v0.6.3_Print_Export_Manifest.json`;
const generated = readJson(generatedManifestPath);
const lifecycle = readJson('config/release-lifecycle.json');
const plan = readJson('config/reconstruction-version-plan.json');
const currentPointer = read('src/content/current.ts');
const builder = read('scripts/build-clean-v063-print-export.mjs');
const renderer = read('scripts/render-clean-v063-print-export.mjs');
const boundary = read(`${outputDir}/source-boundary.md`);
const status = read(`${outputDir}/validation-status.md`);

assert.equal(authority.target, 'clean-v0.6.3-complete');
assert.equal(authority.status, 'certified_on_manual_merge');
assert.equal(authority.authority_set_id, authoritySetId);
assert.equal(authority.publication_unlocked, false);
assert.equal(authority.public_current_release, 'v0.6.1');
assert.equal(hashFile(rulebookPath), rulebookSha256);
assert.equal(hashFile(rendererPath), rendererSha256);
for (const [, , source, sha256] of factionGuides) {
  assert.equal(hashFile(source), sha256, `Certified faction guide hash drifted: ${source}`);
  const bound = authority.authority_files.find((item) => item.path === source);
  assert(bound, `Complete authority does not bind ${source}.`);
  assert.equal(bound.sha256, sha256);
}
const boundRulebook = authority.authority_files.find((item) => item.path === rulebookPath);
assert(boundRulebook, 'Complete authority does not bind the clean Rulebook.');
assert.equal(boundRulebook.sha256, rulebookSha256);

assert.equal(downstream.authority_set_id, authoritySetId);
const canonicalOutput = downstream.outputs.find((item) => item.path === canonicalPath);
const starterOutput = downstream.outputs.find((item) => item.path === startersPath);
assert(canonicalOutput && starterOutput, 'Downstream manifest does not bind canonical/starter outputs.');
assert.equal(canonicalOutput.sha256, canonicalSha256);
assert.equal(starterOutput.sha256, startersSha256);
assert.equal(hashFile(canonicalPath), canonicalSha256);
assert.equal(hashFile(startersPath), startersSha256);
assert.equal(canonical.version, 'clean-v0.6.3-downstream');
assert.equal(canonical.authority_set_id, authoritySetId);
assert.equal(canonical.cards.length, 128);
assert.equal(canonical.territories.length, 25);
assert.equal(canonical.factions.length, 6);
assert.equal(starters.version, 'clean-v0.6.3-downstream');
assert.equal(starters.authority_set_id, authoritySetId);
assert.equal(starters.decks.length, 12);
assert.equal(canonical.cards.find((card) => card.id === 'neutral-reserves')?.name, 'Second Line');
assert.equal(canonical.territories.find((territory) => territory.id === 'territory-smuggler-s-pass')?.name, "Smuggler's Run");

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.target, 'clean-v0.6.3-print-export');
assert.equal(manifest.status, 'downstream_candidate_pending_merge_review');
assert.equal(manifest.authority_set_id, authoritySetId);
assert.equal(manifest.binding_sources.rulebook.path, rulebookPath);
assert.equal(manifest.binding_sources.rulebook.sha256, rulebookSha256);
assert.equal(manifest.binding_sources.canonical_data.path, canonicalPath);
assert.equal(manifest.binding_sources.canonical_data.sha256, canonicalSha256);
assert.equal(manifest.binding_sources.approved_starters.path, startersPath);
assert.equal(manifest.binding_sources.approved_starters.sha256, startersSha256);
assert.equal(manifest.binding_sources.faction_guides.length, 6);
for (const [name, , source, sha256] of factionGuides) {
  const item = manifest.binding_sources.faction_guides.find((entry) => entry.name === name);
  assert(item, `Print/export manifest missing ${name} guide.`);
  assert.equal(item.path, source);
  assert.equal(item.sha256, sha256);
}
assert.equal(manifest.renderer.path, rendererPath);
assert.equal(manifest.renderer.sha256, rendererSha256);
assert.equal(manifest.renderer.role, 'renderer_only_not_rules_authority');
assert.equal(manifest.generated_bundle.print_documents, 9);
assert.equal(manifest.generated_bundle.pdf_count, 9);
assert.equal(manifest.generated_bundle.json_exports, 3);
assert.equal(manifest.generated_bundle.committed_generated_payloads, false);
assert.equal(manifest.public_print_center_modified, false);
assert.equal(manifest.public_deckbuilder_modified, false);
assert.equal(manifest.public_start_modified, false);
assert.equal(manifest.release_directory_modified, false);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');
for (const excluded of ['First Game Guide', 'Returning-player Changes', 'Player Mat', 'Formal Playtest Sheet', 'Faction Teaching Cards', 'Active-Player Marker', 'Rulebook Booklet', 'Tableside Pack']) {
  assert(manifest.excluded_withdrawn_candidate_materials.includes(excluded), `Missing excluded withdrawn print material: ${excluded}`);
}

assert.equal(generated.schema_version, 1);
assert.equal(generated.target, 'clean-v0.6.3-print-export-generated');
assert.equal(generated.status, 'generated_reconstruction_bundle_not_published');
assert.equal(generated.authority_set_id, authoritySetId);
assert.equal(generated.materials.length, 9);
assert.equal(generated.json_exports.length, 3);
assert.equal(generated.pdf_outputs.length, 9);
assert.equal(generated.rendered_with, 'playwright-chromium');
assert.equal(generated.publication_unlocked, false);
assert.equal(generated.public_current_release, 'v0.6.1');

const expectedSourceHashes = new Map([
  [rulebookPath, rulebookSha256],
  ...factionGuides.map(([, , source, sha256]) => [source, sha256]),
  [canonicalPath, canonicalSha256],
  [startersPath, startersSha256],
]);
assert.equal(generated.sources.length, expectedSourceHashes.size);
for (const source of generated.sources) assert.equal(source.sha256, expectedSourceHashes.get(source.path), `Generated manifest source mismatch: ${source.path}`);

const markdownDir = path.join(root, generatedDir, 'markdown');
const htmlDir = path.join(root, generatedDir, 'html');
const pdfDir = path.join(root, generatedDir, 'pdf');
const jsonDir = path.join(root, generatedDir, 'json');
assert.equal(fs.readdirSync(markdownDir).filter((file) => file.endsWith('.md')).length, 9);
assert.equal(fs.readdirSync(htmlDir).filter((file) => file.endsWith('.html')).length, 9);
assert.equal(fs.readdirSync(pdfDir).filter((file) => file.endsWith('.pdf')).length, 9);
assert.equal(fs.readdirSync(jsonDir).filter((file) => file.endsWith('.json')).length, 3);

const rulebookMaterial = generated.materials.find((item) => item.key === 'rulebook');
assert(rulebookMaterial, 'Generated bundle missing Rulebook material.');
assert.equal(read(rulebookMaterial.markdown), normalized(rulebookPath), 'Generated Rulebook Markdown is not normalized-text identical to certified Rulebook.');
for (const [name, slug, source] of factionGuides) {
  const material = generated.materials.find((item) => item.key === `${slug}_guide`);
  assert(material, `Generated bundle missing ${name} guide.`);
  assert.equal(read(material.markdown), normalized(source), `Generated ${name} guide is not normalized-text identical to certified source.`);
}

const canonicalExportPath = `${generatedDir}/json/Gauntlet_clean-v0.6.3_Canonical_Data.json`;
const starterExportPath = `${generatedDir}/json/Gauntlet_clean-v0.6.3_Starter_Decks.json`;
const schemaPath = `${generatedDir}/json/Gauntlet_clean-v0.6.3_Deck_Export_Schema.json`;
assert.equal(hashFile(canonicalExportPath), canonicalSha256, 'Canonical JSON export is not byte-identical to clean downstream source.');
assert.equal(hashFile(starterExportPath), startersSha256, 'Starter JSON export is not byte-identical to approved downstream source.');
const schema = readJson(schemaPath);
assert.equal(schema.schema_version, 1);
assert.equal(schema.version, 'clean-v0.6.3-deck-export');
assert.equal(schema.authority_set_id, authoritySetId);
assert.equal(schema.canonical_data_sha256, canonicalSha256);
assert.equal(schema.starter_decks_sha256, startersSha256);
assert.equal(schema.construction.minimum_cards, 30);
assert.equal(schema.construction.maximum_deckbuilding_value, 60);
assert.equal(schema.construction.territories_per_player, 3);
assert.equal(schema.construction.maximum_arenas, 1);
assert.equal(schema.construction.factions_per_deck, 1);
assert.equal(schema.construction.leaders_per_deck, 1);
assert.equal(schema.construction.unique_copy_limit, 1);
assert.equal(schema.publication_unlocked, false);

const referenceMaterial = generated.materials.find((item) => item.key === 'card_reference');
const reference = read(referenceMaterial.markdown);
for (const card of canonical.cards) {
  assert(reference.includes(`## ${card.name}`), `Print reference missing card ${card.name}.`);
  assert(reference.includes(`\`${card.id}\``), `Print reference missing card ID ${card.id}.`);
  for (const effect of card.effects || []) assert(reference.includes(`**${effect.label}:** ${effect.text}`), `Print reference drifted effect text for ${card.name}/${effect.label}.`);
}
for (const territory of canonical.territories) {
  assert(reference.includes(`\`${territory.id}\``), `Print reference missing Territory ID ${territory.id}.`);
  const effects = territory.effects?.length ? territory.effects : [{ label: 'Text', text: territory.text || '' }];
  for (const effect of effects) assert(reference.includes(`**${effect.label}:** ${effect.text}`), `Print reference drifted Territory text for ${territory.name}.`);
}
assert(reference.includes('Second Line'));
assert(reference.includes("Smuggler's Run"));

const starterMaterial = generated.materials.find((item) => item.key === 'starter_catalog');
const starterCatalog = read(starterMaterial.markdown);
const cardsByName = new Map(canonical.cards.map((card) => [card.name, card]));
const territoryByName = new Map(canonical.territories.map((territory) => [territory.name, territory]));
const factionById = new Map(canonical.factions.map((faction) => [faction.id, faction]));
for (const deck of starters.decks) {
  assert(starterCatalog.includes(`## ${deck.name}`), `Starter catalog missing ${deck.name}.`);
  assert(starterCatalog.includes(deck.summary), `Starter catalog summary drifted for ${deck.name}.`);
  for (const signature of deck.signatureCards || []) assert(starterCatalog.includes(signature), `Starter catalog missing signature ${signature}.`);
  for (const territory of deck.recommendedTerritoryOrder || deck.territories || []) assert(starterCatalog.includes(territory), `Starter catalog missing Territory ${territory}.`);
  let count = 0;
  let value = 0;
  const faction = factionById.get(deck.factionId);
  assert(faction, `Unknown starter faction ${deck.factionId}.`);
  assert(faction.leaders.some((leader) => slugify(leader.name) === deck.leaderId), `Unknown starter Leader ${deck.factionId}:${deck.leaderId}.`);
  for (const item of deck.cards) {
    const card = cardsByName.get(item.name);
    assert(card, `${deck.name} references missing card ${item.name}.`);
    assert(card.allegiance === 'Neutral' || card.allegiance === faction.name, `${deck.name} contains illegal card ${card.name}.`);
    if (card.unique) assert.equal(Number(item.quantity), 1, `${deck.name} duplicates Unique card ${card.name}.`);
    count += Number(item.quantity);
    value += Number(item.quantity) * Number(card.cost);
    assert(starterCatalog.includes(`| ${item.name.replaceAll('|', '\\|')} | ${Number(item.quantity)} | ${Number(card.cost)} | ${Number(item.quantity) * Number(card.cost)} |`), `Starter catalog row drifted for ${deck.name}/${item.name}.`);
  }
  assert.equal(count, 30, `${deck.name} recomputed count drifted.`);
  assert.equal(value, 60, `${deck.name} recomputed value drifted.`);
  const territoryNames = deck.recommendedTerritoryOrder || deck.territories || [];
  assert.equal(territoryNames.length, 3);
  assert.equal(new Set(territoryNames).size, 3);
  const resolved = territoryNames.map((name) => territoryByName.get(name));
  assert(resolved.every(Boolean), `${deck.name} has missing Territory.`);
  assert(resolved.filter((territory) => territory.arena === true || territory.name.startsWith('Arena:')).length <= 1, `${deck.name} exceeds one Arena.`);
}

for (const material of generated.materials) {
  const html = read(material.html);
  assert(html.includes('<meta name="robots" content="noindex,nofollow">'), `${material.key} HTML is not noindex.`);
  assert(html.includes(authoritySetId), `${material.key} HTML missing authority set.`);
  assert(html.includes('not published'), `${material.key} HTML missing publication boundary.`);
  for (const forbidden of ['googletagmanager.com', 'G-8YYYZJGGPE', 'gtag(']) assert(!html.includes(forbidden), `${material.key} HTML loads production analytics.`);
}

for (const output of generated.pdf_outputs) {
  assert(fs.existsSync(path.join(root, output.path)), `Missing rendered PDF ${output.path}.`);
  const bytes = readBuffer(output.path);
  assert(bytes.subarray(0, 4).toString('ascii') === '%PDF', `${output.path} is not a PDF.`);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), output.sha256, `${output.path} hash does not match generated manifest.`);
  assert.equal(bytes.length, output.bytes, `${output.path} byte count does not match generated manifest.`);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), output.pages, `${output.path} page count does not match generated manifest.`);
  assert(output.pages >= 1, `${output.path} has no pages.`);
}

for (const marker of [
  'Binding sources', rulebookPath, rulebookSha256, canonicalPath, canonicalSha256, startersPath, startersSha256, rendererPath, rendererSha256,
  'normalized-text identical', 'byte-identical JSON exports', 'CI review artifacts only', 'not release publication',
  'First Game Guide', 'Player Mat', 'Tableside Pack', 'v0.6.1 remains current/public',
]) assert(boundary.includes(marker), `Print/export source boundary missing marker: ${marker}`);
assert(status.includes('Status before merge: **candidate**.'));
assert(status.includes('nine print-ready PDFs'));
assert(status.includes('three JSON exports'));
assert(status.includes('Publication remains locked'));

for (const script of [builder, renderer]) {
  assert(script.includes(authoritySetId), 'Print/export generator missing authority-set binding.');
  for (const forbidden of ['artifacts/v0.6.3/print-candidate', 'artifacts/v0.6.3/release-candidate', 'releases/v0.6.3/', 'v0.6.3/print/']) assert(!script.includes(forbidden), `Print/export generator retained withdrawn/release dependency: ${forbidden}`);
}
assert(builder.includes("renderMarkdown } from '../artifacts/reconstruction/clean-v0.6.3/browser-rulebook/markdown.js'"));
assert(builder.includes('canonical.cards?.length !== 128'));
assert(builder.includes('canonical.territories?.length !== 25'));
assert(builder.includes('starters.decks?.length !== 12'));
assert(renderer.includes("import { chromium } from 'playwright'"));
assert(renderer.includes("import { PDFDocument } from 'pdf-lib'"));

assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(plan.publication_unlocked, false);
assert(currentPointer.includes("export * from './v061';"));
assert(currentPointer.includes("CURRENT_RULES_VERSION = 'v0.6.1'"));

const expectedDiff = [
  '.github/workflows/build-clean-v063-print-export.yml',
  `${outputDir}/manifest.json`,
  `${outputDir}/source-boundary.md`,
  `${outputDir}/validation-status.md`,
  'scripts/build-clean-v063-print-export.mjs',
  'scripts/render-clean-v063-print-export.mjs',
  'scripts/validate-clean-v063-print-export.mjs',
].sort();
try {
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
  const reconstructionTouched = changed.some((file) => file.startsWith(`${outputDir}/`) || expectedDiff.includes(file));
  if (reconstructionTouched) {
    assert.deepEqual(changed, expectedDiff, `Clean print/export reconstruction diff escaped the seven-file boundary.\n${changed.join('\n')}`);
  } else {
    assert(!changed.includes('.github/workflows/build-clean-v063-print-export.yml'), 'Dependency-only validation must not modify the print/export workflow.');
  }
  for (const forbiddenPrefix of ['deckbuilder/', 'start/', 'releases/v0.6.3/', 'v0.6.3/']) assert(!changed.some((file) => file.startsWith(forbiddenPrefix)), `Protected public/historical surface changed: ${forbiddenPrefix}`);
  for (const forbiddenFile of ['src/content/current.ts', 'config/release-lifecycle.json', 'scripts/sync-google-analytics.mjs']) assert(!changed.includes(forbiddenFile), `Protected publication file changed: ${forbiddenFile}`);
} catch (error) {
  if (error instanceof assert.AssertionError) throw error;
  console.warn('Diff-boundary check skipped because HEAD^1 is unavailable in this checkout.');
}

console.log('Clean v0.6.3 print/export validated: certified Rulebook + six faction guides, canonical card/Territory reference, 12 approved starters, nine rendered PDFs, three JSON exports, publication still locked.');
