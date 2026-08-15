import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const manifestPath = 'artifacts/reconstruction/clean-v0.6.3/booklet/generated/Gauntlet_v0.6.3_Rulebook_Booklet_Manifest.json';
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative));
const manifest = JSON.parse(read(manifestPath).toString('utf8'));

assert.equal(manifest.target, 'gauntlet-v0.6.3-rulebook-booklet');
assert.equal(manifest.authority_set_id, '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49');
assert.equal(manifest.source.publication_transform_verified_exact, true);
assert.equal(manifest.source.certified_rulebook.sha256, '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643');
assert.equal(manifest.source.published_rulebook.sha256, '9bbde08376daea4558581ef598a07b0d3a8fc21666809890d846114229bc44c2');
assert.equal(manifest.artwork.cover.path, 'images/sketches/hero-sketches/hero sketch.png');
const expectedPaddingOrder = [
  'images/sketches/hero-sketches/hero sketch 2.png',
  'images/sketches/hero-sketches/hero sketch 3.png',
  'images/sketches/hero-sketches/hero sketch 4.png',
];
assert.deepEqual(manifest.artwork.padding_preference, expectedPaddingOrder);
assert.deepEqual(manifest.artwork.padding.map((item) => item.path), expectedPaddingOrder.slice(0, manifest.counts.padding_pages));
assert(manifest.counts.padding_pages >= 0 && manifest.counts.padding_pages <= 3);
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

const sourceHtml = read('artifacts/reconstruction/clean-v0.6.3/booklet/generated/Gauntlet_v0.6.3_Rulebook_Booklet_Source.html').toString('utf8');
for (const marker of ['Official Rulebook', 'Version 0.6.3', 'Welcome to Gauntlet', 'How to Win', 'Part III', 'Copyright']) {
  assert(sourceHtml.includes(marker), `Booklet source HTML missing ${marker}.`);
}
assert(!sourceHtml.includes('Clean Reconstruction Candidate'));
assert(!sourceHtml.includes('Authority candidate, not current/public rules'));
assert(!sourceHtml.includes('images/sketches/hero sketch.png'), 'Booklet cover references the retired hero-sketch path.');

console.log(`Validated clean v0.6.3 booklet: ${manifest.counts.logical_pages} logical pages, ${manifest.counts.physical_sheets} sheets, ${manifest.counts.padding_pages} padding page(s).`);
