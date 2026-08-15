import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  PLAYER_CHAPTER_11,
  RULEBOOK_SHA256,
  RULEBOOK_SOURCE,
  publicAuthorityNote,
} from './publication-utils.mjs';

const root = process.cwd();
const releaseManifestPath = 'releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Manifest.json';
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative));
const manifest = JSON.parse(read(releaseManifestPath).toString('utf8'));

assert.equal(manifest.release_version, 'v0.6.3');
const provenance = manifest.rulebook_booklet_provenance;
assert(provenance, 'Current release manifest is missing Rulebook booklet provenance. Materialize the approved booklet before publishing.');

const certifiedRulebook = read(RULEBOOK_SOURCE);
assert.equal(hash(certifiedRulebook), RULEBOOK_SHA256, 'Certified Rulebook authority hash drifted.');
assert.equal(provenance.certified_rulebook_sha256, RULEBOOK_SHA256, 'Published booklet provenance points to a different certified Rulebook authority.');

const chapter11 = read(PLAYER_CHAPTER_11);
assert.equal(hash(chapter11), provenance.player_facing_chapter_11_sha256, 'Published booklet predates the current reviewed player-facing Chapter 11.');

const playerFacingRulebook = publicAuthorityNote(certifiedRulebook.toString('utf8'));
assert.equal(
  hash(Buffer.from(playerFacingRulebook, 'utf8')),
  provenance.player_facing_rulebook_sha256,
  'Published printable Rulebook predates the current player-facing Rulebook text. Rebuild and materialize the approved booklet.',
);

assert.equal(provenance.approved_design_pr, 357, 'Published booklet is not tied to the approved Rulebook design system.');
assert.equal(provenance.production_pr, 434, 'Published booklet is not tied to the approved Rulebook production system.');
assert.equal(provenance.duplex_flip, 'short-edge', 'Published booklet has the wrong duplex imposition contract.');
assert(provenance.logical_pages > 1 && provenance.logical_pages % 4 === 0, 'Published booklet has an invalid logical page count.');
assert.equal(provenance.imposed_sides, provenance.logical_pages / 2, 'Published booklet imposed-side count disagrees with logical pagination.');
assert.equal(provenance.physical_sheets, provenance.logical_pages / 4, 'Published booklet sheet count disagrees with logical pagination.');
assert(provenance.padding_pages >= 0 && provenance.padding_pages <= 11, 'Published booklet has an unexpected filler-page count.');

const booklet = manifest.pdf_outputs?.find((item) => item.key === 'rulebook-booklet');
assert(booklet, 'Current release manifest is missing the printable Rulebook booklet.');
assert.equal(booklet.pages, provenance.imposed_sides, 'Published booklet PDF page count disagrees with its approved imposition provenance.');

console.log(`Current Rulebook booklet provenance passed: ${provenance.logical_pages} logical pages, ${provenance.imposed_sides} imposed sides, ${provenance.physical_sheets} sheets.`);
