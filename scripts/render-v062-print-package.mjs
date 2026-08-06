import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

await import('./build-v062-print-html.mjs');

const root = process.cwd();
const base = process.env.GAUNTLET_PRINT_BASE_URL || 'http://127.0.0.1:8000';
const releaseDir = path.join(root, 'releases/v0.6.2');
const previewDir = process.env.GAUNTLET_PRINT_PREVIEW_DIR || '/tmp/gauntlet-v062-print-previews';
fs.mkdirSync(releaseDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const outputs = [
  { key: 'rulebook', url: '/v0.6.2/print/rulebook.html', file: 'Gauntlet_v0.6.2_Rulebook.pdf', minimumPages: 20 },
  { key: 'reference', url: '/v0.6.2/print/reference-guide.html', file: 'Gauntlet_v0.6.2_Reference_Guide.pdf', minimumPages: 2 },
  { key: 'first_game', url: '/v0.6.2/print/first-game-guide.html', file: 'Gauntlet_v0.6.2_First_Game_Guide.pdf', minimumPages: 4 },
  { key: 'faction_guide', url: '/v0.6.2/print/faction-guide.html', file: 'Gauntlet_v0.6.2_Faction_and_Component_Guide.pdf', minimumPages: 10 },
  { key: 'returning_changes', url: '/v0.6.2/print/returning-player-changes.html', file: 'Gauntlet_v0.6.2_Returning_Player_Changes.pdf', minimumPages: 4 },
  { key: 'player_mat', url: '/v0.6.2/print/player-mat.html', file: 'Gauntlet_v0.6.2_Player_Mat.pdf', exactPages: 1 },
  { key: 'playtest_sheet', url: '/v0.6.2/print/playtest-sheet.html', file: 'Gauntlet_v0.6.2_Formal_Playtest_Sheet.pdf', exactPages: 2 },
  { key: 'faction_cards', url: '/v0.6.2/print/faction-teaching-cards.html', file: 'Gauntlet_v0.6.2_Faction_Teaching_Cards.pdf', exactPages: 3 },
  { key: 'active_marker', url: '/v0.6.2/print/active-player-marker.html', file: 'Gauntlet_v0.6.2_Active_Player_Marker.pdf', exactPages: 1 },
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function inspectPdf(filePath) {
  const pdf = await PDFDocument.load(fs.readFileSync(filePath));
  return {
    pages: pdf.getPageCount(),
    sizes: pdf.getPages().map((page) => {
      const { width, height } = page.getSize();
      return { width: Math.round(width * 100) / 100, height: Math.round(height * 100) / 100 };
    }),
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const output of outputs) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    const response = await page.goto(`${base}${output.url}`, { waitUntil: 'networkidle', timeout: 90000 });
    if (!response?.ok()) throw new Error(`${output.url} returned HTTP ${response?.status()}`);
    await page.evaluate(async () => { await document.fonts?.ready; });
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      fixedPages: [...document.querySelectorAll('.page')].map((item, index) => ({
        index: index + 1,
        scrollWidth: item.scrollWidth,
        clientWidth: item.clientWidth,
        scrollHeight: item.scrollHeight,
        clientHeight: item.clientHeight,
      })),
      versionText: document.body.innerText.includes('v0.6.2'),
      staleActionOpportunity: /Action Opportunit(?:y|ies)/i.test(document.body.innerText),
      staleOpeningEffects: /opening effects/i.test(document.body.innerText),
    }));
    if (browserErrors.length) throw new Error(`${output.url} browser errors:\n${browserErrors.join('\n')}`);
    if (geometry.width > geometry.clientWidth + 2) throw new Error(`${output.url} has horizontal overflow (${geometry.width} > ${geometry.clientWidth}).`);
    for (const item of geometry.fixedPages) {
      if (item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1) {
        throw new Error(`${output.url} fixed page ${item.index} overflows: ${JSON.stringify(item)}`);
      }
    }
    if (!geometry.versionText) throw new Error(`${output.url} does not identify v0.6.2.`);
    if (geometry.staleActionOpportunity || geometry.staleOpeningEffects) throw new Error(`${output.url} contains retired player-facing terminology.`);

    const filePath = path.join(releaseDir, output.file);
    await page.pdf({ path: filePath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    await page.screenshot({
      path: path.join(previewDir, `${output.key}-browser.png`),
      fullPage: geometry.fixedPages.length > 0,
    });
    await page.close();

    const pdfInfo = await inspectPdf(filePath);
    if (output.exactPages && pdfInfo.pages !== output.exactPages) {
      throw new Error(`${output.file}: expected ${output.exactPages} pages; found ${pdfInfo.pages}.`);
    }
    if (output.minimumPages && pdfInfo.pages < output.minimumPages) {
      throw new Error(`${output.file}: expected at least ${output.minimumPages} pages; found ${pdfInfo.pages}.`);
    }
    results.push({ ...output, path: filePath, ...pdfInfo, sha256: sha256(filePath) });
  }
} finally {
  await browser.close();
}

async function imposeBooklet(readerPath, bookletPath) {
  const source = await PDFDocument.load(fs.readFileSync(readerPath));
  while (source.getPageCount() % 4 !== 0) source.addPage([396, 612]);
  const total = source.getPageCount();
  const booklet = await PDFDocument.create();
  const drawPair = async (leftIndex, rightIndex) => {
    const page = booklet.addPage([792, 612]);
    const left = await booklet.embedPage(source.getPage(leftIndex));
    const right = await booklet.embedPage(source.getPage(rightIndex));
    page.drawPage(left, { x: 0, y: 0, width: 396, height: 612 });
    page.drawPage(right, { x: 396, y: 0, width: 396, height: 612 });
  };
  for (let sheet = 0; sheet < total / 4; sheet += 1) {
    await drawPair(total - 1 - (sheet * 2), sheet * 2);
    await drawPair(1 + (sheet * 2), total - 2 - (sheet * 2));
  }
  fs.writeFileSync(bookletPath, await booklet.save());
}

const reader = results.find((item) => item.key === 'rulebook');
const bookletPath = path.join(releaseDir, 'Gauntlet_v0.6.2_Rulebook_Booklet.pdf');
await imposeBooklet(reader.path, bookletPath);
const bookletInfo = await inspectPdf(bookletPath);
results.push({
  key: 'rulebook_booklet',
  file: path.basename(bookletPath),
  path: bookletPath,
  ...bookletInfo,
  sha256: sha256(bookletPath),
});

async function mergePdfs(inputPaths, outputPath) {
  const combined = await PDFDocument.create();
  for (const inputPath of inputPaths) {
    const source = await PDFDocument.load(fs.readFileSync(inputPath));
    const pages = await combined.copyPages(source, source.getPageIndices());
    for (const page of pages) combined.addPage(page);
  }
  fs.writeFileSync(outputPath, await combined.save());
}

const tablesideOrder = ['reference', 'first_game', 'player_mat', 'playtest_sheet', 'faction_cards', 'active_marker', 'returning_changes'];
const tablesidePath = path.join(releaseDir, 'Gauntlet_v0.6.2_Tableside_Pack.pdf');
await mergePdfs(tablesideOrder.map((key) => results.find((item) => item.key === key).path), tablesidePath);
const tablesideInfo = await inspectPdf(tablesidePath);
results.push({ key: 'tableside_pack', file: path.basename(tablesidePath), path: tablesidePath, ...tablesideInfo, sha256: sha256(tablesidePath) });

const manifest = {
  version: 'v0.6.2',
  generated_at: new Date().toISOString(),
  source_package: 'releases/v0.6.2/',
  print_source: 'v0.6.2/print/',
  outputs: results.map(({ key, file, pages, sizes, sha256 }) => ({ key, file, pages, sizes, sha256 })),
  printing: {
    reader_rulebook: 'Half-Letter portrait, actual size',
    imposed_booklet: 'Letter landscape, duplex, flip on short edge, actual size',
    tableside_materials: 'Letter; respect portrait or landscape orientation shown in each file',
  },
};
fs.writeFileSync(path.join(releaseDir, 'Gauntlet_v0.6.2_Print_Manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Rendered ${results.length} v0.6.2 print outputs.`);
