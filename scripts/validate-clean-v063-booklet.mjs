import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const generatedDir = 'artifacts/reconstruction/clean-v0.6.3/booklet/generated';
const manifestPath = `${generatedDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Manifest.json`;
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative));
const manifest = JSON.parse(read(manifestPath).toString('utf8'));

assert.equal(manifest.target, 'gauntlet-v0.6.3-rulebook-booklet');
assert.equal(manifest.schema_version, 2);
assert.equal(manifest.authority_set_id, '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49');
assert.equal(manifest.source.publication_transform_verified_exact, true);
assert.equal(manifest.source.player_facing_editorial_layer_applied_after_verification, true);
assert.equal(manifest.source.certified_rulebook.sha256, '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643');
assert.equal(manifest.source.published_rulebook.sha256, '9bbde08376daea4558581ef598a07b0d3a8fc21666809890d846114229bc44c2');
assert.equal(manifest.source.player_facing_chapter_11.path, 'rulebook/player-facing/chapter-11.md');
assert.equal(manifest.source.player_facing_chapter_11.sha256, hash(read(manifest.source.player_facing_chapter_11.path)));
assert.match(manifest.source.player_facing_rulebook_sha256, /^[0-9a-f]{64}$/);

assert.equal(manifest.design.pipeline, 'approved-rulebook-production');
assert.equal(manifest.design.approved_design_pr, 357);
assert.equal(manifest.design.production_pr, 434);
assert.equal(manifest.design.adapter, 'scripts/build-v063-rulebook-production.py');
assert.equal(manifest.design.fidelity_gate_passed, true);
assert.equal(manifest.design.leader_portraits, 12);
assert.equal(manifest.design.missing_source_tokens, 0);
assert.equal(manifest.design.isolated_headings, 0);
assert(manifest.design.typography.title.includes('Georgia'), `Unexpected title face: ${manifest.design.typography.title}`);
assert(manifest.design.typography.reading.toLowerCase().includes('adobe-caslon-pro'), `Unexpected reading face: ${manifest.design.typography.reading}`);
assert(manifest.design.typography.utility.includes('Inter'), `Unexpected utility face: ${manifest.design.typography.utility}`);
for (const required of ['legacy/v0.6.1-rulebook-publication/rulebook-design/build_proofs.py','legacy/v0.6.1-rulebook-publication/rulebook-design/proof.css','legacy/v0.6.1-rulebook-publication/rulebook-design/render_proofs.mjs']) {
  assert(manifest.design.approved_design_sources.includes(required), `Missing approved design source binding: ${required}`);
}
for (const required of ['legacy/v0.6.1-rulebook-publication/rulebook-production/build_rulebook.py','legacy/v0.6.1-rulebook-publication/rulebook-production/build_complete_rulebook.py','legacy/v0.6.1-rulebook-publication/rulebook-production/paginate_rulebook.mjs','legacy/v0.6.1-rulebook-publication/rulebook-production/production.css','legacy/v0.6.1-rulebook-publication/rulebook-production/render_rulebook.mjs']) {
  assert(manifest.design.production_sources.includes(required), `Missing production source binding: ${required}`);
}

assert.equal(manifest.artwork.cover.path, 'images/sketches/hero-sketches/hero sketch.png');
assert(manifest.counts.content_pages > 1);
assert(manifest.counts.padding_pages >= 0 && manifest.counts.padding_pages <= 11);
assert.equal(manifest.counts.logical_pages, manifest.counts.content_pages + manifest.counts.padding_pages);
assert.equal(manifest.counts.logical_pages % 4, 0);
assert.equal(manifest.counts.imposed_sides, manifest.counts.logical_pages / 2);
assert.equal(manifest.counts.physical_sheets, manifest.counts.logical_pages / 4);
assert.equal(manifest.imposition.duplex_flip, 'short-edge');
assert.equal(manifest.imposition.pairs.length, manifest.counts.imposed_sides);

const expectedPairs = [];
for (let sheet = 0; sheet < manifest.counts.logical_pages / 4; sheet += 1) {
  expectedPairs.push([manifest.counts.logical_pages - (sheet * 2), 1 + (sheet * 2)]);
  expectedPairs.push([2 + (sheet * 2), manifest.counts.logical_pages - 1 - (sheet * 2)]);
}
assert.deepEqual(manifest.imposition.pairs, expectedPairs, 'Booklet imposition order drifted.');

for (const output of manifest.outputs) {
  const data = read(output.path);
  assert.equal(hash(data), output.sha256, `${output.role} hash mismatch.`);
  assert.equal(data.length, output.bytes, `${output.role} byte count mismatch.`);
  const pdf = await PDFDocument.load(data);
  assert.equal(pdf.getPageCount(), output.pages, `${output.role} page count mismatch.`);
  const expectedSize = output.role === 'printable-booklet' ? [792, 612] : [396, 612];
  for (const [index, page] of pdf.getPages().entries()) {
    const { width, height } = page.getSize();
    assert(Math.abs(width - expectedSize[0]) < 1 && Math.abs(height - expectedSize[1]) < 1, `${output.role} page ${index + 1} geometry mismatch: ${width} x ${height}.`);
  }
}

const report = JSON.parse(read(manifest.review.production_report).toString('utf8'));
assert.equal(report.reader.report.missing.length, 0);
assert.equal(report.reader.isolatedHeadings.length, 0);
assert.equal(report.reader.leaderImages.length, 12);
assert.equal(report.outputs.readerPages, manifest.counts.logical_pages);
assert.equal(report.outputs.bookletSides, manifest.counts.imposed_sides);
assert.equal(report.outputs.physicalSheets, manifest.counts.physical_sheets);

const sourceHtml = read(`${generatedDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Source.html`).toString('utf8');
for (const marker of ['Gauntlet v0.6.3 Official Rulebook','Version 0.6.3','rulebook-design/proof-runtime.css','production.css','pagination-reserve.css','chapter-compaction.css','supplemental-reference.css','publication-corrections.css','approved-cover','approved-back-cover']) {
  assert(sourceHtml.includes(marker), `Approved-design booklet source HTML missing ${marker}.`);
}
for (const forbidden of ['Clean Reconstruction Candidate','Authority candidate, not current/public rules','Inherited interaction rules','Adopted v0.6.3 card procedures','v0.6.3 no longer uses','Cards therefore do not need','Do not print <code>from Reserve</code>']) {
  assert(!sourceHtml.includes(forbidden), `Approved-design booklet still contains internal player-inappropriate language: ${forbidden}`);
}
assert(sourceHtml.includes('Simultaneous effects and choices'), 'Approved-design booklet is missing self-contained Chapter 11 timing rules.');
assert(sourceHtml.includes('Assets, banking, and bound cards'), 'Approved-design booklet is missing integrated Chapter 11 Asset rules.');
assert(sourceHtml.includes('Battles ending without a winner'), 'Approved-design booklet is missing integrated Chapter 11 no-winner rules.');
assert(!sourceHtml.includes('<article class="rulebook">'), 'Booklet has regressed to the discarded generic inline renderer.');
assert(!sourceHtml.includes('body { font-family: Georgia, "Times New Roman", serif; font-size: 9.25pt;'), 'Booklet has regressed to the discarded generic Georgia-body stylesheet.');

console.log(`Validated approved-design v0.6.3 booklet with player-facing Chapter 11: ${manifest.counts.logical_pages} logical pages, ${manifest.counts.physical_sheets} sheets, ${manifest.counts.padding_pages} padding page(s).`);
