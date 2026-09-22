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
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative));

const lifecycle = JSON.parse(read('config/release-lifecycle.json').toString('utf8'));
const version = lifecycle.current_release;
assert(version, 'Release lifecycle does not define current_release.');
const release = lifecycle.releases?.[version];
assert(release, `Release lifecycle is missing ${version}.`);
assert.equal(release.status, 'current', `${version} is not marked current.`);
assert(release.current_package_path, `${version} has no current package path.`);

const releaseRoot = String(release.current_package_path).replace(/\\/g, '/').replace(/\/+$/, '');
const releaseManifestPath = `${releaseRoot}/Gauntlet_${version}_Manifest.json`;
const manifest = JSON.parse(read(releaseManifestPath).toString('utf8'));
assert.equal(manifest.release_version, version, 'Current Rulebook provenance manifest disagrees with release lifecycle.');

const modularDocuments = manifest.modular_rules?.documents;
if (Array.isArray(modularDocuments) && modularDocuments.length > 0) {
  const requiredIds = [
    'player-guide',
    'military',
    'diplomats',
    'financiers',
    'intelligence',
    'mystics',
    'inquisition',
    'complete-rules',
  ];
  assert.equal(manifest.modular_rules?.default_document, 'player-guide', 'Modular rules provenance must identify the Player Guide as the default document.');
  const byId = new Map(modularDocuments.map((document) => [document?.id, document]));
  assert.equal(byId.size, requiredIds.length, 'Modular rules provenance must contain eight uniquely identified documents.');

  const pdfOutputs = new Map((manifest.pdf_outputs || []).map((output) => [output?.key, output]));
  for (const id of requiredIds) {
    const document = byId.get(id);
    assert(document, `Modular rules provenance is missing ${id}.`);
    assert(document.maintained_source, `Modular rules provenance is missing the maintained source for ${id}.`);
    assert(document.source?.path && document.source?.sha256, `Modular rules provenance is missing the frozen source binding for ${id}.`);
    assert(document.booklet?.path && document.booklet?.sha256, `Modular rules provenance is missing the booklet binding for ${id}.`);

    const maintained = read(document.maintained_source);
    const frozenSourcePath = String(document.source.path).replace(/^\/+/, '');
    const frozenSource = read(frozenSourcePath);
    assert.equal(hash(maintained), document.source.sha256, `Maintained modular rules source drifted after freeze: ${id}.`);
    assert.equal(hash(frozenSource), document.source.sha256, `Frozen modular rules source hash drifted: ${id}.`);
    assert.equal(maintained.length, frozenSource.length, `Frozen modular rules source byte count drifted: ${id}.`);

    const bookletPath = `${releaseRoot}/${document.booklet.path}`;
    const booklet = read(bookletPath);
    assert.equal(hash(booklet), document.booklet.sha256, `Frozen modular rules booklet hash drifted: ${id}.`);

    const pdfOutput = pdfOutputs.get(`${id}-booklet`);
    assert(pdfOutput, `Modular rules provenance is missing PDF output ${id}-booklet.`);
    assert.equal(pdfOutput.path, document.booklet.path, `Modular rules PDF path drifted: ${id}.`);
    assert.equal(pdfOutput.sha256, document.booklet.sha256, `Modular rules PDF hash drifted: ${id}.`);
    assert.equal(pdfOutput.bytes, document.booklet.bytes, `Modular rules PDF byte count drifted: ${id}.`);
    assert.equal(pdfOutput.pages, document.booklet.pages, `Modular rules PDF page count drifted: ${id}.`);
  }

  const completeRules = byId.get('complete-rules');
  assert.equal(
    manifest.binding_sources?.complete_rules?.sha256,
    completeRules.source.sha256,
    'Complete Rules frozen publication source no longer matches the Rules Arbiter binding.',
  );
  console.log(`Current modular rules provenance passed for ${version}: ${requiredIds.length} frozen sources and ${requiredIds.length} booklet PDFs.`);
  process.exit(0);
}

const provenance = manifest.rulebook_booklet_provenance;
assert(provenance, 'Current release manifest is missing Rulebook booklet provenance. Materialize the approved booklet before publishing.');

assert.equal(provenance.duplex_flip, 'short-edge', 'Published booklet has the wrong duplex imposition contract.');
assert(provenance.logical_pages > 1 && provenance.logical_pages % 4 === 0, 'Published booklet has an invalid logical page count.');
assert.equal(provenance.imposed_sides, provenance.logical_pages / 2, 'Published booklet imposed-side count disagrees with logical pagination.');
assert.equal(provenance.physical_sheets, provenance.logical_pages / 4, 'Published booklet sheet count disagrees with logical pagination.');
assert(provenance.padding_pages >= 0 && provenance.padding_pages <= 11, 'Published booklet has an unexpected filler-page count.');

const booklet = manifest.pdf_outputs?.find((item) => item.key === 'rulebook-booklet');
assert(booklet, 'Current release manifest is missing the printable Rulebook booklet.');
assert.equal(booklet.pages, provenance.imposed_sides, 'Published booklet PDF page count disagrees with its approved imposition provenance.');

if (version === 'v0.6.3') {
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
} else {
  assert.equal(provenance.source_version, version, 'Published booklet provenance source version disagrees with the current release.');
  const rulebookBinding = manifest.binding_sources?.rulebook;
  assert(rulebookBinding?.path, 'Current release manifest is missing the published Rulebook binding.');
  assert(rulebookBinding?.sha256, 'Current release Rulebook binding is missing its authority hash.');
}

console.log(`Current Rulebook booklet provenance passed for ${version}: ${provenance.logical_pages} logical pages, ${provenance.imposed_sides} imposed sides, ${provenance.physical_sheets} sheets.`);
