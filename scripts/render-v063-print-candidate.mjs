import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

await import('./build-v063-print-candidate-html.mjs');

const root = process.cwd();
const base = process.env.GAUNTLET_PRINT_BASE_URL || 'http://127.0.0.1:8000';
const candidateRoot = path.join(root, 'artifacts/v0.6.3/print-candidate');
const pdfDir = path.join(candidateRoot, 'pdf');
const previewDir = process.env.GAUNTLET_PRINT_PREVIEW_DIR || '/tmp/gauntlet-v063-print-previews';
const htmlBase = '/artifacts/v0.6.3/print-candidate/html';
fs.mkdirSync(pdfDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const outputs = [
  { key: 'rulebook', url: `${htmlBase}/rulebook.html`, file: 'Gauntlet_v0.6.3_Rulebook.pdf', minimumPages: 20 },
  { key: 'reference', url: `${htmlBase}/reference-guide.html`, file: 'Gauntlet_v0.6.3_Reference_Guide.pdf', exactPages: 4, trimPrintBottomPadding: true },
  { key: 'first_game', url: `${htmlBase}/first-game-guide.html`, file: 'Gauntlet_v0.6.3_First_Game_Guide.pdf', minimumPages: 4 },
  { key: 'faction_guide', url: `${htmlBase}/faction-guide.html`, file: 'Gauntlet_v0.6.3_Faction_and_Component_Guide.pdf', minimumPages: 10 },
  { key: 'returning_changes', url: `${htmlBase}/returning-player-changes.html`, file: 'Gauntlet_v0.6.3_Returning_Player_Changes.pdf', minimumPages: 2 },
  { key: 'player_mat', url: `${htmlBase}/player-mat.html`, file: 'Gauntlet_v0.6.3_Player_Mat.pdf', exactPages: 1 },
  { key: 'playtest_sheet', url: `${htmlBase}/playtest-sheet.html`, file: 'Gauntlet_v0.6.3_Formal_Playtest_Sheet.pdf', exactPages: 2 },
  { key: 'faction_cards', url: `${htmlBase}/faction-teaching-cards.html`, file: 'Gauntlet_v0.6.3_Faction_Teaching_Cards.pdf', exactPages: 3 },
  { key: 'active_marker', url: `${htmlBase}/active-player-marker.html`, file: 'Gauntlet_v0.6.3_Active_Player_Marker.pdf', exactPages: 1 },
];

const strictTerminologyKeys = new Set(['reference', 'first_game', 'player_mat', 'playtest_sheet', 'faction_cards', 'active_marker']);
const heroPlateAssignments = [
  {
    assets: ['images/sketches/witch hunter.png', 'images/sketches/banker.png', 'images/sketches/spymaster.png'],
    leaders: ['Witch Hunter', 'Banker', 'Spymaster'],
  },
  {
    assets: ['images/sketches/alchemist.png', 'images/sketches/executive.png', 'images/sketches/ambassador.png'],
    leaders: ['Alchemist', 'Executive', 'Ambassador'],
  },
  {
    assets: ['images/sketches/ranger.png', 'images/sketches/commandant.png', 'images/sketches/senator.png'],
    leaders: ['Ranger', 'Commandant', 'Senator'],
  },
];

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

const browserServer = await chromium.launchServer({ headless: true });
const browser = await chromium.connect(browserServer.wsEndpoint());
const results = [];
try {
  for (const output of outputs) {
    console.log(`[v063-print] ${output.key}: opening ${output.url}`);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.fulfill({ status: 204, contentType: 'application/javascript', body: '' }));
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
    const response = await page.goto(`${base}${output.url}`, { waitUntil: 'load', timeout: 90000 });
    if (!response?.ok()) throw new Error(`${output.url} returned HTTP ${response?.status()}`);

    await page.evaluate(async () => {
      if (!document.fonts) return;
      await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 12000))]);
    });

    const geometry = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const documentText = document.body.textContent || '';
      return {
        width: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        fixedPages: [...document.querySelectorAll('.page')].map((item, index) => ({
          index: index + 1,
          scrollWidth: item.scrollWidth,
          clientWidth: item.clientWidth,
          scrollHeight: item.scrollHeight,
          clientHeight: item.clientHeight,
        })),
        versionText: documentText.includes('v0.6.3'),
        retiredPlayableDeck: /\bPlayable Deck\b/.test(bodyText),
        retiredActionOpportunities: /\bAction Opportunit(?:y|ies)\b/.test(bodyText),
      };
    });

    if (browserErrors.length) throw new Error(`${output.url} browser errors:\n${browserErrors.join('\n')}`);
    if (geometry.width > geometry.clientWidth + 2) throw new Error(`${output.url} has horizontal overflow (${geometry.width} > ${geometry.clientWidth}).`);
    for (const item of geometry.fixedPages) {
      if (item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1) {
        throw new Error(`${output.url} fixed page ${item.index} overflows: ${JSON.stringify(item)}`);
      }
    }
    if (!geometry.versionText) throw new Error(`${output.url} does not identify v0.6.3.`);
    if (strictTerminologyKeys.has(output.key) && (geometry.retiredPlayableDeck || geometry.retiredActionOpportunities)) {
      throw new Error(`${output.url} contains retired v0.6.3 terminology in an operational aid.`);
    }

    if (output.trimPrintBottomPadding) {
      await page.addStyleTag({ content: '@media print { .document-shell { padding-bottom: 0 !important; } }' });
    }

    const filePath = path.join(pdfDir, output.file);
    await page.pdf({ path: filePath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    await page.screenshot({ path: path.join(previewDir, `${output.key}-browser.png`), fullPage: geometry.fixedPages.length > 0, timeout: 30000 });
    await page.close();

    const pdfInfo = await inspectPdf(filePath);
    if (output.exactPages && pdfInfo.pages !== output.exactPages) throw new Error(`${output.file}: expected ${output.exactPages} pages; found ${pdfInfo.pages}.`);
    if (output.minimumPages && pdfInfo.pages < output.minimumPages) throw new Error(`${output.file}: expected at least ${output.minimumPages} pages; found ${pdfInfo.pages}.`);
    console.log(`[v063-print] ${output.key}: complete (${pdfInfo.pages} pages)`);
    results.push({ key: output.key, file: output.file, pages: pdfInfo.pages, sizes: pdfInfo.sizes });
  }

  const readerResult = results.find((item) => item.key === 'rulebook');
  const readerPath = path.join(pdfDir, readerResult.file);
  const bookletPath = path.join(pdfDir, 'Gauntlet_v0.6.3_Rulebook_Booklet.pdf');
  const bookletPadding = await imposeBooklet(readerPath, bookletPath);
  const bookletInfo = await inspectPdf(bookletPath);
  results.push({ key: 'rulebook_booklet', file: path.basename(bookletPath), pages: bookletInfo.pages, sizes: bookletInfo.sizes });

  const tablesideOrder = ['reference', 'first_game', 'player_mat', 'playtest_sheet', 'faction_cards', 'active_marker', 'returning_changes'];
  const tablesidePath = path.join(pdfDir, 'Gauntlet_v0.6.3_Tableside_Pack.pdf');
  await mergePdfs(tablesideOrder.map((key) => path.join(pdfDir, results.find((item) => item.key === key).file)), tablesidePath);
  const tablesideInfo = await inspectPdf(tablesidePath);
  results.push({ key: 'tableside_pack', file: path.basename(tablesidePath), pages: tablesideInfo.pages, sizes: tablesideInfo.sizes });

  const manifest = {
    version: 'v0.6.3-print-candidate',
    release_version: 'v0.6.3',
    status: 'candidate-not-published',
    prepared_date: '2026-08-11',
    source_package: 'artifacts/v0.6.3/release-candidate',
    html_root: 'artifacts/v0.6.3/print-candidate/html',
    pdf_root: 'artifacts/v0.6.3/print-candidate/pdf',
    outputs: results,
    booklet_padding: bookletPadding,
    tableside_order: tablesideOrder,
    publication_boundary: {
      published_version: 'v0.6.2',
      releases_v063_materialized: false,
      public_print_center_cutover: false,
      public_current_release_cutover: false,
    },
  };
  fs.writeFileSync(path.join(candidateRoot, 'Gauntlet_v0.6.3_Print_Manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
} finally {
  try {
    await Promise.race([browser.close(), new Promise((_, reject) => setTimeout(() => reject(new Error('browser close timeout')), 3000))]);
  } catch (error) {
    console.warn(`[v063-print] browser close fallback: ${error.message}`);
  }
  const browserProcess = browserServer.process();
  if (browserProcess.exitCode === null && !browserProcess.killed) browserProcess.kill('SIGKILL');
}

async function imposeBooklet(readerPath, bookletPath) {
  const source = await PDFDocument.load(fs.readFileSync(readerPath));
  const sourceCount = source.getPageCount();
  const total = Math.ceil(sourceCount / 4) * 4;
  const paddingCount = total - sourceCount;
  if (paddingCount > heroPlateAssignments.length) throw new Error(`Rulebook requires ${paddingCount} padding pages; only ${heroPlateAssignments.length} Leader-sketch groups are configured.`);

  const booklet = await PDFDocument.create();
  const heroPlates = [];
  for (let index = 0; index < paddingCount; index += 1) {
    const assignment = heroPlateAssignments[index];
    const portraits = [];
    for (const asset of assignment.assets) {
      const assetPath = path.join(root, asset);
      if (!fs.existsSync(assetPath)) throw new Error(`Missing booklet Leader portrait asset: ${asset}`);
      const bytes = fs.readFileSync(assetPath);
      if (bytes.length < 100000) throw new Error(`Booklet Leader portrait asset is unexpectedly small: ${asset} (${bytes.length} bytes).`);
      const image = await booklet.embedPng(bytes);
      const scale = Math.min(108 / image.width, 300 / image.height);
      portraits.push({ image, width: image.width * scale, height: image.height * scale, asset });
    }
    heroPlates.push({ assignment, portraits });
  }

  const drawSourcePage = async (destination, sourceIndex, x) => {
    if (sourceIndex >= 0 && sourceIndex < sourceCount) {
      const embedded = await booklet.embedPage(source.getPage(sourceIndex));
      destination.drawPage(embedded, { x, y: 0, width: 396, height: 612 });
      return;
    }
    const paddingIndex = sourceIndex - sourceCount;
    const plate = heroPlates[paddingIndex];
    if (!plate) return;
    const cellWidth = 116;
    const gap = 4;
    const totalWidth = (cellWidth * 3) + (gap * 2);
    const startX = x + ((396 - totalWidth) / 2);
    for (let index = 0; index < plate.portraits.length; index += 1) {
      const portrait = plate.portraits[index];
      const cellX = startX + (index * (cellWidth + gap));
      destination.drawImage(portrait.image, {
        x: cellX + ((cellWidth - portrait.width) / 2),
        y: (612 - portrait.height) / 2,
        width: portrait.width,
        height: portrait.height,
        opacity: 0.9,
      });
    }
  };

  const drawPair = async (leftIndex, rightIndex) => {
    const page = booklet.addPage([792, 612]);
    await drawSourcePage(page, leftIndex, 0);
    await drawSourcePage(page, rightIndex, 396);
  };

  for (let sheet = 0; sheet < total / 4; sheet += 1) {
    await drawPair(total - 1 - (sheet * 2), sheet * 2);
    await drawPair(1 + (sheet * 2), total - 2 - (sheet * 2));
  }
  fs.writeFileSync(bookletPath, await booklet.save());

  return {
    source_pages: sourceCount,
    padded_pages: total,
    padding_pages: paddingCount,
    leader_plates: heroPlates.map(({ assignment }, index) => ({
      source_page: sourceCount + index + 1,
      assets: assignment.assets,
      leaders: assignment.leaders,
    })),
  };
}

async function mergePdfs(inputPaths, outputPath) {
  const combined = await PDFDocument.create();
  for (const inputPath of inputPaths) {
    const source = await PDFDocument.load(fs.readFileSync(inputPath));
    const pages = await combined.copyPages(source, source.getPageIndices());
    for (const page of pages) combined.addPage(page);
  }
  fs.writeFileSync(outputPath, await combined.save());
}

console.log(`Rendered v0.6.3 print candidate: ${results.length} PDF outputs including booklet and tableside pack.`);
