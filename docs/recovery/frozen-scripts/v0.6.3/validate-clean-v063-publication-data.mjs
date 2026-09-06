import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { validateReleaseLifecycle } from './release-lifecycle.mjs';
import {
  AUTHORITY_SET_ID as authoritySetId, RULEBOOK_SHA256 as rulebookSha,
  CANONICAL_SHA256 as canonicalSha, STARTERS_SHA256 as startersSha,
  RELEASE_DIR as releaseDir, CLEAN as clean, readBytes, read, readJson, hashBytes as hash, hashFile, exists, factionGuides
} from './publication-utils.mjs';

const lifecycle = validateReleaseLifecycle();
assert.equal(lifecycle.current_release, 'v0.6.3');
assert.equal(lifecycle.releases['v0.6.1'].status, 'historical');
assert.equal(lifecycle.releases['v0.6.2'].status, 'withdrawn');
assert.equal(lifecycle.releases['v0.6.2'].artifacts_preserved, true);
assert.equal(lifecycle.releases['v0.6.2'].public_cutover, false);
assert.equal(lifecycle.releases['v0.6.3'].status, 'current');
assert.equal(lifecycle.releases['v0.6.3'].artifacts_preserved, true);
assert.equal(lifecycle.releases['v0.6.3'].public_cutover, true);
assert.equal(lifecycle.releases['v0.6.3'].historical_package_path, 'releases/v0.6.3/');
assert.equal(lifecycle.releases['v0.6.3'].current_reconstructed_package_path, `${releaseDir}/`);
assert.equal(lifecycle.releases['v0.6.3'].authority_set_id, authoritySetId);

const candidate = readJson(`${clean}/current-release-metadata/release-candidate.json`);
const registry = readJson(`${clean}/current-release-metadata/surface-registry.json`);
assert.equal(candidate.status, 'candidate_not_current');
assert.equal(candidate.authority_set_id, authoritySetId);
assert.equal(candidate.publication_gates.authorized_publication_merge_required, true);
assert.equal(registry.surface_count, 10);
assert(registry.surfaces.every((surface) => readJson(surface.manifest)[surface.authority_field] === authoritySetId));

assert.equal(hashFile(`${clean}/rulebook/Gauntlet_v0.6.3_Rulebook.md`), rulebookSha);
assert.equal(hashFile(`${clean}/downstream/canonical-data.json`), canonicalSha);
assert.equal(hashFile(`${clean}/downstream/starter-decks.json`), startersSha);
assert.equal(hashFile(`${releaseDir}/Gauntlet_v0.6.3_Canonical_Data.json`), canonicalSha);
assert.equal(hashFile(`${releaseDir}/Gauntlet_v0.6.3_Starter_Decks.json`), startersSha);

const canonical = readJson(`${releaseDir}/Gauntlet_v0.6.3_Canonical_Data.json`);
const starters = readJson(`${releaseDir}/Gauntlet_v0.6.3_Starter_Decks.json`);
assert.equal(canonical.authority_set_id, authoritySetId);
assert.equal(canonical.cards.length, 128);
assert.equal(canonical.territories.length, 25);
assert.equal(canonical.factions.length, 6);
assert.equal(canonical.factions.reduce((sum, faction) => sum + faction.leaders.length, 0), 12);
assert.equal(canonical.cards.find((card) => card.id === 'neutral-reserves')?.name, 'Second Line');
assert.equal(canonical.territories.find((territory) => territory.id === 'territory-smuggler-s-pass')?.name, "Smuggler's Run");
assert.equal(starters.authority_set_id, authoritySetId);
assert.equal(starters.decks.length, 12);
assert(starters.decks.every((deck) => deck.cardCount === 30 && deck.deckbuildingValue === 60));
const deckSchema = readJson(`${releaseDir}/Gauntlet_v0.6.3_Deck_Export_Schema.json`);
assert.equal(deckSchema.version, 'v0.6.3-deck-export');
assert.equal(deckSchema.authority_set_id, authoritySetId);
assert.equal(deckSchema.publication_unlocked, true);
assert.equal(deckSchema.current_public_release, 'v0.6.3');

function publicRulebookSource(source) {
  return source.replace('**Version 0.6.3 — Clean Reconstruction Candidate**', '**Version 0.6.3**')
    .replace(/^> \*\*Authority candidate, not current\/public rules\.\*\*[^\n]*\n\n/m, '');
}
function publicFactionGuide(source) { return source.replace(/^> \*\*Clean v0\.6\.3[^\n]*\n\n/m, ''); }
assert.equal(read(`${releaseDir}/Gauntlet_v0.6.3_Rulebook.md`), publicRulebookSource(read(`${clean}/rulebook/Gauntlet_v0.6.3_Rulebook.md`)));
for (const [, route, authorityDir, file] of factionGuides) {
  assert.equal(read(`${releaseDir}/faction-guides/${route}/${file}`), publicFactionGuide(read(`${clean}/faction-guides/${authorityDir}/${file}`)), `${route} published guide drifted from certified source beyond preamble removal.`);
}

const releaseManifest = readJson(`${releaseDir}/Gauntlet_v0.6.3_Manifest.json`);
assert.equal(releaseManifest.release_version, 'v0.6.3');
assert.equal(releaseManifest.status, 'current_pending_live_verification');
assert.equal(releaseManifest.authority_set_id, authoritySetId);
assert.equal(releaseManifest.historical_withdrawn_package_preserved_at, 'releases/v0.6.3/');
assert.equal(releaseManifest.current_package_path, `${releaseDir}/`);
assert.equal(releaseManifest.binding_sources.rulebook.sha256, rulebookSha);
assert.equal(releaseManifest.binding_sources.canonical_data.sha256, canonicalSha);
assert.equal(releaseManifest.binding_sources.approved_starters.sha256, startersSha);
assert.deepEqual(releaseManifest.counts, { playable_cards: 128, territories: 25, factions: 6, leaders: 12, starter_decks: 12, print_pdfs: 9, json_exports: 3 });
assert.equal(releaseManifest.pdf_outputs.length, 9);
assert.equal(new Set(releaseManifest.pdf_outputs.map((item) => item.path)).size, 9);
assert.equal(releaseManifest.post_merge_verification.gauntlet_run, 'pending_after_merge');
assert.equal(releaseManifest.post_merge_verification.production_workers, 'pending_after_merge');
assert.equal(releaseManifest.post_merge_verification.publication_complete_only_after_both_pass, true);
for (const item of releaseManifest.pdf_outputs) {
  const relative = `${releaseDir}/${item.path}`;
  assert(exists(relative), `Missing publication PDF: ${relative}`);
  const bytes = readBytes(relative);
  assert.equal(hash(bytes), item.sha256, `${relative} hash drifted from manifest.`);
  assert.equal(bytes.length, item.bytes);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), item.pages);
  assert(item.pages > 0);
}
assert(Array.isArray(releaseManifest.payload_files) && releaseManifest.payload_files.length >= 20);
for (const item of releaseManifest.payload_files) {
  const relative = `${releaseDir}/${item.path}`;
  assert(exists(relative), `Manifest payload missing: ${relative}`);
  assert.equal(hashFile(relative), item.sha256, `Manifest payload hash drift: ${relative}`);
  assert.equal(readBytes(relative).length, item.bytes);
}
console.log('Validated v0.6.3 lifecycle, authority parity, release package source semantics, data exports, and nine PDFs.');
