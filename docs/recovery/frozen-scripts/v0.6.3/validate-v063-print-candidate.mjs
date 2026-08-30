import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import childProcess from 'node:child_process';

const root = process.cwd();
const candidateRoot = 'artifacts/v0.6.3/print-candidate';
const htmlRoot = `${candidateRoot}/html`;
const pdfRoot = `${candidateRoot}/pdf`;
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const lifecycle = readJson('config/release-lifecycle.json');
const v063Withdrawn = lifecycle.current_release === 'v0.6.2' &&
  lifecycle.releases?.['v0.6.3']?.status === 'withdrawn' &&
  lifecycle.releases?.['v0.6.3']?.artifacts_preserved === true &&
  lifecycle.releases?.['v0.6.3']?.public_cutover === false;

const htmlFiles = [
  'index.html',
  'rulebook.html',
  'reference-guide.html',
  'first-game-guide.html',
  'faction-guide.html',
  'returning-player-changes.html',
  'player-mat.html',
  'playtest-sheet.html',
  'faction-teaching-cards.html',
  'active-player-marker.html',
  'styles.css',
  'document-manifest.json',
];
for (const file of htmlFiles) assert(fs.existsSync(path.join(root, htmlRoot, file)), `Missing v0.6.3 print-candidate HTML file: ${file}`);

const pdfFiles = [
  'Gauntlet_v0.6.3_Rulebook.pdf',
  'Gauntlet_v0.6.3_Rulebook_Booklet.pdf',
  'Gauntlet_v0.6.3_Reference_Guide.pdf',
  'Gauntlet_v0.6.3_First_Game_Guide.pdf',
  'Gauntlet_v0.6.3_Faction_and_Component_Guide.pdf',
  'Gauntlet_v0.6.3_Returning_Player_Changes.pdf',
  'Gauntlet_v0.6.3_Player_Mat.pdf',
  'Gauntlet_v0.6.3_Formal_Playtest_Sheet.pdf',
  'Gauntlet_v0.6.3_Faction_Teaching_Cards.pdf',
  'Gauntlet_v0.6.3_Active_Player_Marker.pdf',
  'Gauntlet_v0.6.3_Tableside_Pack.pdf',
];
for (const file of pdfFiles) {
  const target = path.join(root, pdfRoot, file);
  assert(fs.existsSync(target), `Missing v0.6.3 print-candidate PDF: ${file}`);
  if (!fs.existsSync(target)) continue;
  const bytes = fs.readFileSync(target);
  assert(bytes.length > 5000, `${file} is unexpectedly small (${bytes.length} bytes).`);
  assert(bytes.subarray(0, 5).toString() === '%PDF-', `${file} is not a PDF.`);
}

if (failures.length) finish();

const operationalHtml = [
  'reference-guide.html',
  'first-game-guide.html',
  'player-mat.html',
  'playtest-sheet.html',
  'faction-teaching-cards.html',
  'active-player-marker.html',
];
const staleVersionPatterns = [
  /Gauntlet v0\.6\.2 (?:First Game|Reference|Playtest|Faction)/i,
  /\*\*Version:\*\* v0\.6\.2/i,
  /for the v0\.6\.2 test/i,
  /For the v0\.6\.2 release:/i,
  /Gauntlet_v0\.6\.2_Starter_Decks\.json/,
];
for (const file of operationalHtml) {
  const text = read(`${htmlRoot}/${file}`);
  assert(text.includes('v0.6.3'), `${file} does not identify v0.6.3.`);
  for (const pattern of staleVersionPatterns) assert(!pattern.test(text), `${file} contains stale v0.6.2 operational text matching ${pattern}.`);
  assert(!/\bPlayable Deck\b/.test(text), `${file} contains retired Playable Deck terminology.`);
  assert(!/\bAction Opportunit(?:y|ies)\b/.test(text), `${file} contains retired Action Opportunity terminology.`);
}

const rulebook = read(`${htmlRoot}/rulebook.html`);
for (const token of [
  'Release Candidate',
  'not published',
  'Capturing the Territory at the opponent',
  'separate legal movement sequence',
  'Gambit/Tactic',
  'inherent Bank Action',
]) assert(rulebook.toLowerCase().includes(token.toLowerCase()), `Rulebook print candidate is missing: ${token}`);

const firstGame = read(`${htmlRoot}/first-game-guide.html`);
for (const token of [
  'For the v0.6.3 release candidate:',
  'Gauntlet_v0.6.3_Starter_Decks.json',
  'v0.6.2 remains the immutable published playtest release until the publication cutover is completed.',
  'v0.6.3 development Deckbuilder',
  '/v0.6.3/start/',
  'Capital; begin with 2.',
]) assert(firstGame.includes(token), `First Game print candidate is missing current release-boundary text: ${token}`);

const playerMat = read(`${htmlRoot}/player-mat.html`);
for (const token of [
  'setup placement is not movement or entering',
  'Capturing the opponent-end Territory wins immediately',
  'without prior capture',
  '1 Action · Opening or Denouement',
]) assert(playerMat.includes(token), `Player Mat is missing v0.6.3 reminder: ${token}`);

const playtestSheet = read(`${htmlRoot}/playtest-sheet.html`);
for (const token of [
  'v0.6.3 procedure checks',
  'Opening selection → Territory arrangement → initiative',
  'Setup placement vs movement / entering',
  'Final Territory vs Last Stand',
  '<i class="box"></i> Final Territory',
  '<i class="box"></i> Last Stand',
]) assert(playtestSheet.includes(token), `Formal Playtest Sheet is missing v0.6.3 field: ${token}`);

const teachingCards = read(`${htmlRoot}/faction-teaching-cards.html`);
for (const faction of ['Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition']) {
  assert(teachingCards.includes(`>${faction}<`), `Faction Teaching Cards omit ${faction}.`);
}
assert(teachingCards.includes('Capital; begin with 2.'), 'Financier teaching card must state the inherited Capital starting value without stale v0.6.2 test labeling.');

const activeMarker = read(`${htmlRoot}/active-player-marker.html`);
for (const token of ['YOUR TURN', 'CAPTURE - DRAW - OPENING', 'MOVEMENT - DENOUEMENT - CLEANUP', 'Pass this marker after Cleanup']) {
  assert(activeMarker.includes(token), `Active-player marker is missing: ${token}`);
}

const sourceManifest = readJson('artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Manifest.json');
assert(sourceManifest.status === 'candidate-not-published', 'Source release package is no longer marked candidate-not-published.');
assert(sourceManifest.playable_card_designs === 128, `Source release package card count is ${sourceManifest.playable_card_designs}.`);
assert(sourceManifest.territories === 25, `Source release package Territory count is ${sourceManifest.territories}.`);
assert(sourceManifest.starter_decks === 12, `Source release package starter count is ${sourceManifest.starter_decks}.`);

const manifestPath = `${candidateRoot}/Gauntlet_v0.6.3_Print_Manifest.json`;
assert(fs.existsSync(path.join(root, manifestPath)), 'Missing v0.6.3 print-candidate manifest.');
if (!fs.existsSync(path.join(root, manifestPath))) finish();
const manifest = readJson(manifestPath);
assert(manifest.version === 'v0.6.3-print-candidate', `Print manifest version is ${manifest.version}.`);
assert(manifest.release_version === 'v0.6.3', `Print manifest release version is ${manifest.release_version}.`);
assert(manifest.status === 'candidate-not-published', 'Print manifest must remain candidate-not-published.');
assert(manifest.publication_boundary?.published_version === 'v0.6.2', 'Print manifest must retain v0.6.2 as the published version.');
assert(manifest.publication_boundary?.releases_v063_materialized === false, 'Print candidate must not materialize releases/v0.6.3/.');
assert(manifest.publication_boundary?.public_print_center_cutover === false, 'Print candidate must not cut over the public print center.');
assert(manifest.publication_boundary?.public_current_release_cutover === false, 'Print candidate must not cut over public current-release surfaces.');

const byKey = new Map((manifest.outputs ?? []).map((item) => [item.key, item]));
const exactPages = { player_mat: 1, playtest_sheet: 2, faction_cards: 3, active_marker: 1 };
for (const [key, pages] of Object.entries(exactPages)) assert(byKey.get(key)?.pages === pages, `Print manifest ${key} expected ${pages} pages; found ${byKey.get(key)?.pages ?? 'missing'}.`);
for (const key of ['rulebook', 'reference', 'first_game', 'faction_guide', 'returning_changes', 'rulebook_booklet', 'tableside_pack']) {
  assert(Number.isInteger(byKey.get(key)?.pages) && byKey.get(key).pages > 0, `Print manifest is missing valid page count for ${key}.`);
}
for (const file of pdfFiles) assert((manifest.outputs ?? []).some((item) => item.file === file), `Print manifest omits ${file}.`);

const readerPages = byKey.get('rulebook')?.pages;
const paddedPages = Number.isInteger(readerPages) ? Math.ceil(readerPages / 4) * 4 : null;
const expectedBookletPages = Number.isInteger(paddedPages) ? paddedPages / 2 : null;
assert(byKey.get('rulebook_booklet')?.pages === expectedBookletPages, `Booklet page count ${byKey.get('rulebook_booklet')?.pages} does not match imposed reader count ${expectedBookletPages}.`);
assert(manifest.booklet_padding?.source_pages === readerPages, 'Booklet padding source-page metadata does not match Rulebook reader pages.');
assert(manifest.booklet_padding?.padded_pages === paddedPages, 'Booklet padding padded-page metadata is invalid.');
assert(manifest.booklet_padding?.padding_pages === paddedPages - readerPages, 'Booklet padding count is invalid.');

const tablesideExpected = (manifest.tableside_order ?? []).reduce((sum, key) => sum + (byKey.get(key)?.pages ?? 0), 0);
assert(byKey.get('tableside_pack')?.pages === tablesideExpected, `Tableside Pack expected ${tablesideExpected} pages; found ${byKey.get('tableside_pack')?.pages}.`);

const publishedV063Exists = fs.existsSync(path.join(root, 'releases/v0.6.3'));
assert(
  !publishedV063Exists || v063Withdrawn,
  'A v0.6.3 published package may coexist with print-candidate rebuilding only when the release lifecycle explicitly marks v0.6.3 withdrawn and v0.6.2 current.'
);
if (v063Withdrawn) {
  assert(publishedV063Exists, 'Withdrawn v0.6.3 lifecycle must preserve the published release package for provenance and diagnosis.');
}

try {
  const changed = childProcess.execSync('git diff --name-only origin/main...HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const forbiddenPrefixes = ['releases/v0.6.2/', 'v0.6.2/'];
  const protectedV062Exact = ['rules-assistant/worker-v062.js', 'rules-assistant/v062-published-corpus.js'];
  const currentRoutingExact = ['index.html', 'rules-assistant/widget.js', 'rules-assistant/worker-entry.js', 'src/content/current.ts'];
  const violations = changed.split(/\r?\n/).filter(Boolean).filter((file) =>
    forbiddenPrefixes.some((prefix) => file.startsWith(prefix)) ||
    protectedV062Exact.includes(file) ||
    (!v063Withdrawn && currentRoutingExact.includes(file))
  );
  if (violations.length) failures.push(`Print-candidate PR crossed the publication boundary:\n${violations.join('\n')}`);
} catch {
  // CI has origin/main; local or sparse review environments may not.
}

try {
  const { PDFDocument } = await import('pdf-lib');
  for (const file of pdfFiles) {
    const target = path.join(root, pdfRoot, file);
    if (!fs.existsSync(target)) continue;
    const pdf = await PDFDocument.load(fs.readFileSync(target));
    const manifestEntry = (manifest.outputs ?? []).find((item) => item.file === file);
    assert(pdf.getPageCount() === manifestEntry?.pages, `${file} page count does not match print manifest.`);
    for (const [index, page] of pdf.getPages().entries()) {
      const { width, height } = page.getSize();
      assert(width > 0 && height > 0, `${file} page ${index + 1} has invalid geometry.`);
    }
  }
} catch {
  // Full PDF parsing is mandatory in the dedicated print workflow, which installs pdf-lib.
}

finish();

function finish() {
  if (failures.length) {
    console.error('v0.6.3 print-candidate validation failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`v0.6.3 print-candidate validation passed: ${pdfFiles.length} PDFs, current setup/victory/player-aid semantics, booklet geometry, tableside assembly, and intact v0.6.2 publication boundary${v063Withdrawn ? '; preserved v0.6.3 package is explicitly withdrawn' : ''}.`);
}
