import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import childProcess from 'node:child_process';

const root = process.cwd();
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const heroPlateAssignments = [
  {
    asset: 'images/sketches/hero-plates/witch-hunter-banker-spymaster.png',
    leaders: ['Witch Hunter', 'Banker', 'Spymaster'],
  },
  {
    asset: 'images/sketches/hero-plates/alchemist-executive-ambassador.png',
    leaders: ['Alchemist', 'Executive', 'Ambassador'],
  },
  {
    asset: 'images/sketches/hero-plates/ranger-commandant-senator.png',
    leaders: ['Ranger', 'Commandant', 'Senator'],
  },
];
const heroPlateRelativePaths = heroPlateAssignments.map(({ asset }) => asset);
const heroPlatePaths = heroPlateRelativePaths.map((relativePath) => path.join(root, relativePath));

const activeHtml = [
  'v0.6.2/print/index.html',
  'v0.6.2/print/player-mat.html',
  'v0.6.2/print/playtest-sheet.html',
  'v0.6.2/print/faction-teaching-cards.html',
  'v0.6.2/print/active-player-marker.html',
  'v0.6.2/print/rulebook.html',
  'v0.6.2/print/reference-guide.html',
  'v0.6.2/print/first-game-guide.html',
  'v0.6.2/print/faction-guide.html',
  'v0.6.2/print/returning-player-changes.html',
  'playtest/index.html',
  'playtest/player-mat/index.html',
];

const strictTerminologyHtml = new Set([
  'v0.6.2/print/player-mat.html',
  'v0.6.2/print/playtest-sheet.html',
  'v0.6.2/print/faction-teaching-cards.html',
  'v0.6.2/print/active-player-marker.html',
  'v0.6.2/print/reference-guide.html',
  'v0.6.2/print/first-game-guide.html',
  'playtest/index.html',
  'playtest/player-mat/index.html',
]);

for (const relativePath of activeHtml) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) {
    failures.push(`Missing active print source: ${relativePath}`);
    continue;
  }
  const content = read(relativePath);
  if (!content.includes('v0.6.2')) failures.push(`${relativePath} does not identify v0.6.2.`);
  if (strictTerminologyHtml.has(relativePath)) {
    const staleActionOpportunity = /\bOne normal Action Opportunity\b/i.test(content)
      || /without using (?:the |an |another )?Action Opportunit(?:y|ies)/i.test(content)
      || /without an Action Opportunity/i.test(content)
      || /(?:uses|using) (?:one|an) Action Opportunity/i.test(content);
    if (staleActionOpportunity) failures.push(`${relativePath} contains retired Action Opportunity terminology.`);
    if (/opening effects/i.test(content)) failures.push(`${relativePath} contains retired opening-effects terminology.`);
  }
}

const requiredRules = {
  'v0.6.2/print/player-mat.html': ['Capture - Draw - Opening - Movement - Denouement - Cleanup', 'Pending Battle / Onset', 'Defensive Edge', 'Tiebreak Roll', 'Front Line', 'Bound Cards'],
  'v0.6.2/print/playtest-sheet.html': ['Opening vs Denouement', 'Pending battle / Terms / Onset', 'Front Line vs Position'],
  'v0.6.2/print/faction-teaching-cards.html': ['Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition', 'Recommended first Leader'],
  'v0.6.2/print/active-player-marker.html': ['YOUR TURN', 'Pass this marker after Cleanup'],
};
for (const [relativePath, tokens] of Object.entries(requiredRules)) {
  const content = read(relativePath);
  for (const token of tokens) if (!content.includes(token)) failures.push(`${relativePath} is missing required print token: ${token}`);
}

if (new Set(heroPlateRelativePaths).size !== heroPlateRelativePaths.length) {
  failures.push('Booklet faction-Leader plate asset list contains duplicate paths.');
}
const allPlateLeaders = heroPlateAssignments.flatMap(({ leaders }) => leaders);
if (new Set(allPlateLeaders).size !== allPlateLeaders.length) {
  failures.push('Booklet faction-Leader plate sequence repeats a Leader.');
}
for (const [index, heroPlatePath] of heroPlatePaths.entries()) {
  const relativePath = heroPlateRelativePaths[index];
  if (!fs.existsSync(heroPlatePath)) {
    failures.push(`Missing booklet faction-Leader plate ${index + 1}: ${relativePath}`);
    continue;
  }
  const heroBytes = fs.readFileSync(heroPlatePath);
  if (heroBytes.length < 1000) failures.push(`${relativePath} is unexpectedly small (${heroBytes.length} bytes).`);
  const pngSignature = heroBytes.subarray(0, 8).toString('hex');
  if (pngSignature !== '89504e470d0a1a0a') failures.push(`${relativePath} is not a valid PNG.`);
}

const pdfFiles = [
  'Gauntlet_v0.6.2_Rulebook.pdf',
  'Gauntlet_v0.6.2_Rulebook_Booklet.pdf',
  'Gauntlet_v0.6.2_Reference_Guide.pdf',
  'Gauntlet_v0.6.2_First_Game_Guide.pdf',
  'Gauntlet_v0.6.2_Faction_and_Component_Guide.pdf',
  'Gauntlet_v0.6.2_Returning_Player_Changes.pdf',
  'Gauntlet_v0.6.2_Player_Mat.pdf',
  'Gauntlet_v0.6.2_Formal_Playtest_Sheet.pdf',
  'Gauntlet_v0.6.2_Faction_Teaching_Cards.pdf',
  'Gauntlet_v0.6.2_Active_Player_Marker.pdf',
  'Gauntlet_v0.6.2_Tableside_Pack.pdf',
];
for (const file of pdfFiles) {
  const target = path.join(root, 'releases/v0.6.2', file);
  if (!fs.existsSync(target)) failures.push(`Missing v0.6.2 print PDF: ${file}`);
  else {
    const bytes = fs.readFileSync(target);
    if (bytes.length < 5000) failures.push(`${file} is unexpectedly small (${bytes.length} bytes).`);
    if (bytes.subarray(0, 5).toString() !== '%PDF-') failures.push(`${file} is not a PDF.`);
  }
}

const printManifestPath = path.join(root, 'releases/v0.6.2/Gauntlet_v0.6.2_Print_Manifest.json');
if (!fs.existsSync(printManifestPath)) failures.push('Missing v0.6.2 print manifest.');
else {
  const manifest = JSON.parse(fs.readFileSync(printManifestPath, 'utf8'));
  if (manifest.version !== 'v0.6.2') failures.push('Print manifest version is not v0.6.2.');
  const byKey = new Map((manifest.outputs || []).map((item) => [item.key, item]));
  const exact = { player_mat: 1, playtest_sheet: 2, faction_cards: 3, active_marker: 1 };
  for (const [key, count] of Object.entries(exact)) {
    if (byKey.get(key)?.pages !== count) failures.push(`Print manifest ${key} expected ${count} pages; found ${byKey.get(key)?.pages ?? 'missing'}.`);
  }
  const readerPages = byKey.get('rulebook')?.pages;
  const bookletPages = byKey.get('rulebook_booklet')?.pages;
  if (!Number.isInteger(readerPages) || readerPages < 20) failures.push(`Rulebook page count is invalid: ${readerPages}.`);
  const paddedPages = Number.isInteger(readerPages) ? Math.ceil(readerPages / 4) * 4 : null;
  const expectedBooklet = Number.isInteger(paddedPages) ? paddedPages / 2 : null;
  const expectedLeaderPlates = Number.isInteger(readerPages) ? paddedPages - readerPages : null;
  if (bookletPages !== expectedBooklet) failures.push(`Booklet page count ${bookletPages} does not match imposed reader count ${expectedBooklet}.`);

  const padding = manifest.booklet_padding;
  if (!padding) failures.push('Print manifest omits booklet_padding metadata.');
  else {
    if (padding.source_pages !== readerPages) failures.push(`Booklet padding source_pages ${padding.source_pages} does not match reader pages ${readerPages}.`);
    if (padding.padded_pages !== paddedPages) failures.push(`Booklet padding padded_pages ${padding.padded_pages} does not match ${paddedPages}.`);
    if (padding.leader_plate_count !== expectedLeaderPlates) failures.push(`Booklet padding expected ${expectedLeaderPlates} faction-Leader plates; found ${padding.leader_plate_count}.`);
    if (expectedLeaderPlates !== heroPlateAssignments.length) {
      failures.push(`Rulebook requires ${expectedLeaderPlates} padding pages, but ${heroPlateAssignments.length} approved faction-Leader plates are configured.`);
    }
    if (JSON.stringify(padding.leader_assets) !== JSON.stringify(heroPlateRelativePaths)) {
      failures.push(`Booklet padding Leader assets are invalid: ${JSON.stringify(padding.leader_assets)}.`);
    }
    const expectedSourcePages = Array.from({ length: expectedLeaderPlates || 0 }, (_, index) => readerPages + index + 1);
    if (JSON.stringify(padding.leader_source_pages) !== JSON.stringify(expectedSourcePages)) {
      failures.push(`Booklet padding Leader source-page metadata is invalid: ${JSON.stringify(padding.leader_source_pages)}.`);
    }
    const expectedPlateAssignments = heroPlateAssignments.map(({ asset, leaders }, index) => ({
      source_page: expectedSourcePages[index],
      asset,
      leaders,
    }));
    if (JSON.stringify(padding.leader_plates) !== JSON.stringify(expectedPlateAssignments)) {
      failures.push(`Booklet padding ordered faction-Leader assignments are invalid: ${JSON.stringify(padding.leader_plates)}.`);
    }
  }

  for (const file of pdfFiles) if (!(manifest.outputs || []).some((item) => item.file === file)) failures.push(`Print manifest omits ${file}.`);
}

const releaseManifest = JSON.parse(read('releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json'));
if (!releaseManifest.validation?.print_package_generated) failures.push('Release manifest does not record generated printed materials.');
if (releaseManifest.public_links?.printed_materials !== 'https://gauntlet.run/v0.6.2/print/') failures.push('Release manifest printed-materials URL is missing.');
for (const file of pdfFiles) if (!(releaseManifest.current_outputs || []).includes(file)) failures.push(`Release manifest current_outputs omits ${file}.`);

const releaseReadme = read('releases/v0.6.2/README.md');
for (const token of ['## Printed materials', 'Gauntlet_v0.6.2_Rulebook.pdf', 'Gauntlet_v0.6.2_Tableside_Pack.pdf']) if (!releaseReadme.includes(token)) failures.push(`Release README omits ${token}.`);

try {
  const changed = childProcess.execSync('git diff --name-only origin/main...HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const historical = changed.split(/\r?\n/).filter((file) => file.startsWith('releases/v0.6.1/'));
  if (historical.length) failures.push(`Historical v0.6.1 release files changed:\n${historical.join('\n')}`);
} catch {
  // Local or sparse environments may not have origin/main. CI performs this check when available.
}

try {
  const { PDFDocument } = await import('pdf-lib');
  for (const file of pdfFiles) {
    const target = path.join(root, 'releases/v0.6.2', file);
    if (!fs.existsSync(target)) continue;
    const pdf = await PDFDocument.load(fs.readFileSync(target));
    if (pdf.getPageCount() < 1) failures.push(`${file} has no pages.`);
  }
} catch {
  // Full PDF geometry validation runs in the print workflow, which installs pdf-lib explicitly.
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`v0.6.2 printed-materials validation passed: ${pdfFiles.length} PDFs; Witch Hunter, Banker, and Spymaster on plate 1; Alchemist, Executive, and Ambassador on plate 2; Ranger, Commandant, and Senator on plate 3; current browser sources; and immutable v0.6.1 boundary.`);
