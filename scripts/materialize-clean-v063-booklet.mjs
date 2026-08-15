import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedDir = 'artifacts/reconstruction/clean-v0.6.3/booklet/generated';
const generatedManifestPath = `${generatedDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Manifest.json`;
const generatedPdfPath = `${generatedDir}/Gauntlet_v0.6.3_Rulebook_Booklet.pdf`;
const releaseDir = 'releases/v0.6.3-reconstructed';
const releasePdfName = 'Gauntlet_v0.6.3_Rulebook_Booklet.pdf';
const releasePdfPath = `${releaseDir}/${releasePdfName}`;
const releaseManifestPath = `${releaseDir}/Gauntlet_v0.6.3_Manifest.json`;
const rulebookIndexPath = 'rulebook/index.html';
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const generated = readJson(generatedManifestPath);
assert.equal(generated.target, 'gauntlet-v0.6.3-rulebook-booklet');
assert.equal(generated.authority_set_id, '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49');
assert.equal(generated.source.publication_transform_verified_exact, true);
assert.equal(generated.source.player_facing_editorial_layer_applied_after_verification, true);
assert.match(generated.source.player_facing_rulebook_sha256, /^[0-9a-f]{64}$/);
assert.equal(generated.design.pipeline, 'approved-rulebook-production');
assert.equal(generated.design.approved_design_pr, 357);
assert.equal(generated.design.production_pr, 434);
assert.equal(generated.design.fidelity_gate_passed, true);
assert.equal(generated.design.leader_portraits, 12);
assert.equal(generated.design.missing_source_tokens, 0);
assert.equal(generated.design.isolated_headings, 0);
assert(generated.counts.content_pages > 1);
assert(generated.counts.padding_pages >= 0 && generated.counts.padding_pages <= 11);
assert.equal(generated.counts.logical_pages, generated.counts.content_pages + generated.counts.padding_pages);
assert.equal(generated.counts.logical_pages % 4, 0);
assert.equal(generated.counts.imposed_sides, generated.counts.logical_pages / 2);
assert.equal(generated.counts.physical_sheets, generated.counts.logical_pages / 4);
assert.equal(generated.imposition.duplex_flip, 'short-edge');

const printable = generated.outputs.find((item) => item.role === 'printable-booklet');
assert(printable, 'Generated booklet manifest lacks printable-booklet output.');
const pdfBytes = fs.readFileSync(path.join(root, generatedPdfPath));
assert.equal(hash(pdfBytes), printable.sha256);
assert.equal(pdfBytes.length, printable.bytes);
assert.equal(printable.pages, generated.counts.imposed_sides);
fs.copyFileSync(path.join(root, generatedPdfPath), path.join(root, releasePdfPath));

const manifest = readJson(releaseManifestPath);
assert.equal(manifest.release_version, 'v0.6.3');
assert.equal(manifest.authority_set_id, generated.authority_set_id);
manifest.counts.print_pdfs = 10;
manifest.pdf_outputs = manifest.pdf_outputs.filter((item) => item.key !== 'rulebook-booklet');
const rulebookIndex = manifest.pdf_outputs.findIndex((item) => item.key === 'rulebook');
assert(rulebookIndex >= 0);
manifest.pdf_outputs.splice(rulebookIndex + 1, 0, { key: 'rulebook-booklet', path: releasePdfName, pages: printable.pages, sha256: printable.sha256, bytes: printable.bytes });
manifest.payload_files = manifest.payload_files.filter((item) => item.path !== releasePdfName);
const readerIndex = manifest.payload_files.findIndex((item) => item.path === 'Gauntlet_v0.6.3_Rulebook.pdf');
assert(readerIndex >= 0);
manifest.payload_files.splice(readerIndex + 1, 0, { path: releasePdfName, sha256: printable.sha256, bytes: printable.bytes });
manifest.rulebook_booklet_provenance = {
  player_facing_rulebook_sha256: generated.source.player_facing_rulebook_sha256,
  certified_rulebook_sha256: generated.source.certified_rulebook.sha256,
  published_rulebook_sha256: generated.source.published_rulebook.sha256,
  player_facing_chapter_11_sha256: generated.source.player_facing_chapter_11.sha256,
  approved_design_pr: generated.design.approved_design_pr,
  production_pr: generated.design.production_pr,
  logical_pages: generated.counts.logical_pages,
  imposed_sides: generated.counts.imposed_sides,
  physical_sheets: generated.counts.physical_sheets,
  padding_pages: generated.counts.padding_pages,
  duplex_flip: generated.imposition.duplex_flip,
};
fs.writeFileSync(path.join(root, releaseManifestPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const rulebookIndexHtml = fs.readFileSync(path.join(root, rulebookIndexPath), 'utf8');
assert(rulebookIndexHtml.includes(`../${releasePdfPath}`), 'Browser Rulebook does not link the printable booklet.');
assert(!rulebookIndexHtml.includes('>Reader PDF<'), 'Browser Rulebook still exposes Reader PDF as a competing print/download action.');
assert(!rulebookIndexHtml.includes('>Markdown<'), 'Browser Rulebook still exposes Markdown as a competing download action.');
assert(!rulebookIndexHtml.includes('data-print-rulebook'), 'Browser Rulebook still exposes browser printing as a competing print action.');

console.log(`Materialized approved-design v0.6.3 booklet: ${printable.pages} imposed sides, ${generated.counts.physical_sheets} physical sheets, SHA-256 ${printable.sha256}.`);
