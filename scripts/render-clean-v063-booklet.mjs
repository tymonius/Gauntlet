import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { publicAuthorityNote } from './publication-utils.mjs';
import { normalizeV063LastStandOnlyText } from '../rules-assistant/v063-last-stand-language.js';

const root = process.cwd();
const cleanRulebookPath = 'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const publishedRulebookPath = 'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md';
const playerChapter11Path = 'rulebook/player-facing/chapter-11.md';
const publicationRoot = 'legacy/v0.6.1-rulebook-publication';
const publicationUrlPath = 'legacy/v0.6.1-rulebook-publication';
const productionSourceDir = `${publicationRoot}/rulebook-production`;
const playerProductionInputPath = `${productionSourceDir}/.v063-player-facing-input.md`;
const outDir = 'artifacts/reconstruction/clean-v0.6.3/booklet/generated';
const sourceHtmlPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Source.html`;
const readingPdfPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Reading_Order.pdf`;
const imposedPdfPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Booklet.pdf`;
const productionReportPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Production_Report.json`;
const manifestPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Manifest.json`;
const cleanRulebookSha256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const publishedRulebookSha256 = '9bbde08376daea4558581ef598a07b0d3a8fc21666809890d846114229bc44c2';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const approvedDesignPr = 357;
const productionPr = 434;
const coverAsset = 'images/sketches/hero-sketches/hero sketch.png';
const productionDir = '/tmp/rulebook-production';

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const bytes = (relative) => fs.readFileSync(path.join(root, relative));
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fileHash = (relative) => hash(bytes(relative));
const write = (relative, data) => { const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, data); };

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env: options.env || process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.`);
}
async function waitForServer(url) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { const response = await fetch(url); if (response.ok) return; lastError = new Error(`HTTP ${response.status}`); }
    catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Rulebook review server did not become ready: ${lastError?.message || 'unknown error'}`);
}

const cleanRulebook = read(cleanRulebookPath);
assert.equal(hash(cleanRulebook), cleanRulebookSha256, 'Certified clean Rulebook hash drifted.');
const derivedPublished = normalizeV063LastStandOnlyText(cleanRulebook)
  .replace('**Version 0.6.3 — Clean Reconstruction Candidate**', '**Version 0.6.3**')
  .replace(/^> \*\*Authority candidate, not current\/public rules\.\*\*[^\n]*\n\n/m, '');
const publishedRulebook = read(publishedRulebookPath);
assert.equal(hash(publishedRulebook), publishedRulebookSha256, 'Published v0.6.3 Rulebook hash drifted.');
assert.equal(derivedPublished, publishedRulebook, 'Published Rulebook is no longer the exact Last Stand publication transform of certified clean authority.');
assert(fs.existsSync(path.join(root, playerChapter11Path)), `Missing reviewed player-facing Chapter 11 source: ${playerChapter11Path}`);
const playerChapter11 = read(playerChapter11Path).trim();
const playerRulebook = publicAuthorityNote(cleanRulebook);
const chapter11StartMarker = '# 11. Detailed Card and Timing Rules';
const chapter12StartMarker = '# 12. Overlays and Other Shared Card Rules';
const chapter11Start = playerRulebook.indexOf(chapter11StartMarker);
const chapter12Start = playerRulebook.indexOf(chapter12StartMarker, chapter11Start + chapter11StartMarker.length);
assert(chapter11Start >= 0 && chapter12Start > chapter11Start, 'Player-facing Rulebook lost the Chapter 11 publication boundary.');
const renderedChapter11 = playerRulebook.slice(chapter11Start, chapter12Start).trim();
assert.equal(renderedChapter11, playerChapter11, 'Rendered Rulebook Chapter 11 is not the exact reviewed player-facing Chapter 11 source.');
for (const forbidden of ['## Inherited interaction rules', '## Adopted v0.6.3 card procedures', 'v0.6.3 no longer uses', 'Cards therefore do not need', 'Do not print `from Reserve`']) {
  assert(!renderedChapter11.includes(forbidden), `Player-facing Rulebook Chapter 11 still contains internal language: ${forbidden}`);
}
assert(fs.existsSync(path.join(root, coverAsset)), `Missing booklet artwork: ${coverAsset}`);

fs.rmSync(path.join(root, outDir), { recursive: true, force: true });
fs.rmSync(productionDir, { recursive: true, force: true });
run('python', [`${publicationRoot}/rulebook-design/build_proofs.py`]);
run('python', [`${productionSourceDir}/build_fidelity_gate.py`]);

// Verify immutable recovered evidence first. Then hand the complete reviewed
// player-facing Rulebook to the approved production adapter through a dedicated
// transient input. The checked-in current release source is never mutated.
write(playerProductionInputPath, playerRulebook);
try {
  assert.equal(read(playerProductionInputPath), playerRulebook, 'Transient player-facing Rulebook input changed before production.');
  run('python', ['scripts/build-v063-rulebook-production.py']);
} finally {
  fs.rmSync(path.join(root, playerProductionInputPath), { force: true });
}

const server = spawn('python', ['-m', 'http.server', '8000'], { cwd: root, env: process.env, stdio: ['ignore', 'ignore', 'inherit'] });
try {
  await waitForServer(`http://127.0.0.1:8000/${publicationUrlPath}/rulebook-production/full-rulebook.html`);
  const publicationEnv = { ...process.env, GAUNTLET_PUBLICATION_PATH: publicationUrlPath };
  run('node', [`${productionSourceDir}/render_fidelity_gate.mjs`], { env: publicationEnv });
  run('node', ['scripts/run-v063-rulebook-renderer.mjs'], { env: publicationEnv });
} finally { server.kill('SIGTERM'); }

const reportFile = path.join(productionDir, 'production-report.json');
assert(fs.existsSync(reportFile), 'Approved Rulebook production renderer did not emit production-report.json.');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const readerSource = path.join(productionDir, 'Gauntlet_v0.6.1_Rulebook.pdf');
const bookletSource = path.join(productionDir, 'Gauntlet_v0.6.1_Rulebook_Booklet.pdf');
assert(fs.existsSync(readerSource), 'Approved Rulebook production renderer did not emit its reader PDF.');
assert(fs.existsSync(bookletSource), 'Approved Rulebook production renderer did not emit its booklet PDF.');
assert.equal(report.reader?.report?.missing?.length, 0, 'Approved production renderer omitted player-facing Rulebook source tokens.');
assert.equal(report.reader?.isolatedHeadings?.length, 0, 'Approved production renderer stranded Rulebook headings.');
assert.equal(report.reader?.leaderImages?.length, 12, 'Approved production renderer did not produce all 12 Leader portraits.');
assert(report.reader?.titleFamily?.includes('Georgia'), `Approved title typography drifted: ${report.reader?.titleFamily}`);
assert(report.reader?.bodyFamily?.toLowerCase().includes('adobe-caslon-pro'), `Approved reading typography drifted: ${report.reader?.bodyFamily}`);
assert(report.reader?.utilityFamily?.includes('Inter'), `Approved utility typography drifted: ${report.reader?.utilityFamily}`);

const logicalPages = Number(report.outputs.readerPages);
const imposedSides = Number(report.outputs.bookletSides);
const physicalSheets = Number(report.outputs.physicalSheets);
const paddingPages = Number(report.reader?.report?.intentionalBlanks || 0);
assert(logicalPages > 1 && logicalPages % 4 === 0, `Approved production renderer emitted invalid booklet page count ${logicalPages}.`);
assert.equal(imposedSides, logicalPages / 2);
assert.equal(physicalSheets, logicalPages / 4);
assert(paddingPages >= 0 && paddingPages <= 11, `Unexpected booklet padding count ${paddingPages}.`);

const readingBytes = fs.readFileSync(readerSource);
const imposedBytes = fs.readFileSync(bookletSource);
write(readingPdfPath, readingBytes);
write(imposedPdfPath, imposedBytes);
write(sourceHtmlPath, fs.readFileSync(path.join(root, productionSourceDir, 'full-rulebook.html')));
write(productionReportPath, `${JSON.stringify(report, null, 2)}\n`);

const impositionPairs = (report.booklet?.geometry || []).map(item => item.pages);
assert.equal(impositionPairs.length, imposedSides, 'Approved production report is missing imposed booklet sides.');
const manifest = {
  schema_version: 2,
  target: 'gauntlet-v0.6.3-rulebook-booklet',
  authority_set_id: authoritySetId,
  source: {
    certified_rulebook: { path: cleanRulebookPath, sha256: cleanRulebookSha256 },
    published_rulebook: { path: publishedRulebookPath, sha256: publishedRulebookSha256 },
    player_facing_chapter_11: { path: playerChapter11Path, sha256: fileHash(playerChapter11Path) },
    player_facing_rulebook_sha256: hash(playerRulebook),
    publication_transform_verified_exact: true,
    player_facing_editorial_layer_applied_after_verification: true,
  },
  design: {
    pipeline: 'approved-rulebook-production', approved_design_pr: approvedDesignPr, production_pr: productionPr,
    adapter: 'scripts/build-v063-rulebook-production.py', renderer_adapter: 'scripts/run-v063-rulebook-renderer.mjs',
    approved_design_sources: [`${publicationRoot}/rulebook-design/build_proofs.py`,`${publicationRoot}/rulebook-design/proof.css`,`${publicationRoot}/rulebook-design/render_proofs.mjs`],
    production_sources: [`${productionSourceDir}/build_rulebook.py`,`${productionSourceDir}/build_complete_rulebook.py`,`${productionSourceDir}/paginate_rulebook.mjs`,`${productionSourceDir}/production.css`,`${productionSourceDir}/render_rulebook.mjs`],
    fidelity_gate_passed: true,
    typography: { title: report.reader.titleFamily, reading: report.reader.bodyFamily, utility: report.reader.utilityFamily },
    leader_portraits: report.reader.leaderImages.length,
    missing_source_tokens: report.reader.report.missing.length,
    isolated_headings: report.reader.isolatedHeadings.length,
  },
  artwork: { cover: { path: coverAsset, sha256: fileHash(coverAsset) } },
  geometry_points: { logical_page: [396, 612], imposed_side: [792, 612] },
  counts: { content_pages: logicalPages - paddingPages, padding_pages: paddingPages, logical_pages: logicalPages, imposed_sides: imposedSides, physical_sheets: physicalSheets },
  imposition: { duplex_flip: 'short-edge', pairs: impositionPairs },
  review: {
    production_report: productionReportPath,
    reader_pages_directory: `${productionDir}/reader-pages`, reader_spreads_directory: `${productionDir}/reader-spreads`,
    booklet_color_directory: `${productionDir}/booklet-color`, booklet_grayscale_directory: `${productionDir}/booklet-grayscale`,
  },
  outputs: [
    { role: 'reading-order', path: readingPdfPath, sha256: hash(readingBytes), bytes: readingBytes.length, pages: logicalPages },
    { role: 'printable-booklet', path: imposedPdfPath, sha256: hash(imposedBytes), bytes: imposedBytes.length, pages: imposedSides },
  ],
};
write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Approved-design v0.6.3 booklet: ${logicalPages} logical pages, ${imposedSides} imposed sides, ${physicalSheets} physical sheets.`);
