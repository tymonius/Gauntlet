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
const heroPlateEmbedPaths = heroPlateRelativePaths.map((_, index) => path.join('/tmp', `gauntlet-v062-leader-plate-${index + 1}.png`));
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

// Governing and migration documents may quote superseded v0.6.1 phrases to
// explain a change. Operational aids must contain only current terminology.
const strictTerminologyKeys = new Set([
  'reference',
  'first_game',
  'player_mat',
  'playtest_sheet',
  'faction_cards',
  'active_marker',
]);

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

// Run Chromium through a BrowserServer so teardown can force-terminate the
// browser process if a normal Playwright connection shutdown would hang. This
// keeps CI from burning the entire job timeout after all pages have rendered.
const browserServer = await chromium.launchServer({ headless: true });
const browser = await chromium.connect(browserServer.wsEndpoint());
const results = [];
try {
  for (const output of outputs) {
    console.log(`[print] ${output.key}: opening ${output.url}`);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.fulfill({ status: 204, contentType: 'application/javascript', body: '' }));
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    const response = await page.goto(`${base}${output.url}`, { waitUntil: 'load', timeout: 90000 });
    if (!response?.ok()) throw new Error(`${output.url} returned HTTP ${response?.status()}`);
    const fontStatus = await page.evaluate(async () => {
      if (!document.fonts) return 'unsupported';
      const status = await Promise.race([
        document.fonts.ready.then(() => 'ready'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 15000)),
      ]);
      if (status === 'timeout') {
        for (const link of document.querySelectorAll('link[href*="typekit.net"], link[href*="use.typekit"]')) {
          link.remove();
        }
        document.fonts.clear?.();
      }
      return status;
    });
    console.log(`[print] ${output.key}: fonts ${fontStatus}`);
    const geometry = await page.evaluate(() => {
      const bodyText = document.body.innerText;
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
        versionText: bodyText.includes('v0.6.2'),
        staleActionOpportunity: /\bOne normal Action Opportunity\b/i.test(bodyText)
          || /without using (?:the |an |another )?Action Opportunit(?:y|ies)/i.test(bodyText)
          || /without an Action Opportunity/i.test(bodyText)
          || /(?:uses|using) (?:one|an) Action Opportunity/i.test(bodyText),
        staleOpeningEffects: /opening effects/i.test(bodyText),
      };
    });
    if (browserErrors.length) throw new Error(`${output.url} browser errors:\n${browserErrors.join('\n')}`);
    if (geometry.width > geometry.clientWidth + 2) throw new Error(`${output.url} has horizontal overflow (${geometry.width} > ${geometry.clientWidth}).`);
    for (const item of geometry.fixedPages) {
      if (item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1) {
        throw new Error(`${output.url} fixed page ${item.index} overflows: ${JSON.stringify(item)}`);
      }
    }
    if (!geometry.versionText) throw new Error(`${output.url} does not identify v0.6.2.`);
    if (strictTerminologyKeys.has(output.key) && (geometry.staleActionOpportunity || geometry.staleOpeningEffects)) {
      throw new Error(`${output.url} contains retired terminology in a current play instruction.`);
    }

    const filePath = path.join(releaseDir, output.file);
    console.log(`[print] ${output.key}: rendering PDF`);
    await page.pdf({ path: filePath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    console.log(`[print] ${output.key}: rendering browser preview`);
    await page.screenshot({
      path: path.join(previewDir, `${output.key}-browser.png`),
      fullPage: geometry.fixedPages.length > 0,
      timeout: 30000,
    });
    await page.close();

    const pdfInfo = await inspectPdf(filePath);
    if (output.exactPages && pdfInfo.pages !== output.exactPages) {
      throw new Error(`${output.file}: expected ${output.exactPages} pages; found ${pdfInfo.pages}.`);
    }
    if (output.minimumPages && pdfInfo.pages < output.minimumPages) {
      throw new Error(`${output.file}: expected at least ${output.minimumPages} pages; found ${pdfInfo.pages}.`);
    }
    console.log(`[print] ${output.key}: complete (${pdfInfo.pages} pages)`);
    results.push({ ...output, path: filePath, ...pdfInfo, sha256: sha256(filePath) });
  }

  const heroPlatePage = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
  await heroPlatePage.goto(base, { waitUntil: 'load', timeout: 90000 });
  for (const [index, relativePath] of heroPlateRelativePaths.entries()) {
    console.log(`[print] Leader plate ${index + 1}: preparing PDF raster`);
    const dataUrl = await heroPlatePage.evaluate(async ({ url, maxWidth, maxHeight }) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    }, { url: `${base}/${relativePath}`, maxWidth: 1104, maxHeight: 1360 });
    fs.writeFileSync(heroPlateEmbedPaths[index], Buffer.from(dataUrl.split(',', 2)[1], 'base64'));
  }
  await heroPlatePage.close();
} finally {
  console.log('[print] browser teardown: starting');
  try {
    await Promise.race([
      browser.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timed out.')), 3000)),
    ]);
  } catch (error) {
    console.warn(`[print] browser close fallback: ${error.message}`);
  }
  const browserProcess = browserServer.process();
  if (browserProcess.exitCode === null && !browserProcess.killed) {
    browserProcess.kill('SIGKILL');
  }
  console.log('[print] browser teardown: complete');
}

async function imposeBooklet(readerPath, bookletPath) {
  for (const [index, heroPlatePath] of heroPlatePaths.entries()) {
    if (!fs.existsSync(heroPlatePath)) {
      throw new Error(`Missing booklet Leader-plate asset ${index + 1}: ${heroPlateRelativePaths[index]}`);
    }
  }

  const source = await PDFDocument.load(fs.readFileSync(readerPath));
  const sourceCount = source.getPageCount();
  const total = Math.ceil(sourceCount / 4) * 4;
  const paddingCount = total - sourceCount;
  if (paddingCount !== heroPlateAssignments.length) {
    throw new Error(`Rulebook requires ${paddingCount} padding pages, but ${heroPlateAssignments.length} approved Leader plates are configured.`);
  }

  const booklet = await PDFDocument.create();
  const heroPlates = [];
  for (const [index, heroPlatePath] of heroPlateEmbedPaths.entries()) {
    console.log(`[print] booklet: embedding Leader plate ${index + 1}`);
    const image = await booklet.embedPng(fs.readFileSync(heroPlatePath));
    const scale = Math.min(276 / image.width, 340 / image.height);
    heroPlates.push({
      image,
      width: image.width * scale,
      height: image.height * scale,
    });
  }

  const drawHeroPlate = (destination, sourceIndex, x) => {
    const paddingIndex = sourceIndex - sourceCount;
    const heroPlate = heroPlates[paddingIndex];
    if (!heroPlate) {
      throw new Error(`No approved Leader plate is assigned to logical source page ${sourceIndex + 1}.`);
    }
    destination.drawImage(heroPlate.image, {
      x: x + ((396 - heroPlate.width) / 2),
      y: (612 - heroPlate.height) / 2,
      width: heroPlate.width,
      height: heroPlate.height,
      opacity: 0.92,
    });
  };

  const drawSourcePage = async (destination, sourceIndex, x) => {
    if (sourceIndex < 0 || sourceIndex >= sourceCount) {
      drawHeroPlate(destination, sourceIndex, x);
      return;
    }
    const embedded = await booklet.embedPage(source.getPage(sourceIndex));
    destination.drawPage(embedded, { x, y: 0, width: 396, height: 612 });
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

  const heroSourcePages = Array.from({ length: paddingCount }, (_, index) => sourceCount + index + 1);
  return {
    source_pages: sourceCount,
    padded_pages: total,
    leader_plate_count: paddingCount,
    leader_assets: [...heroPlateRelativePaths],
    leader_source_pages: heroSourcePages,
    leader_plates: heroPlateAssignments.map(({ asset, leaders }, index) => ({
      source_page: heroSourcePages[index],
      asset,
      leaders: [...leaders],
    })),
  };
}

const reader = results.find((item) => item.key === 'rulebook');
const bookletPath = path.join(releaseDir, 'Gauntlet_v0.6.2_Rulebook_Booklet.pdf');
console.log('[print] booklet: imposing');
const bookletPadding = await imposeBooklet(reader.path, bookletPath);
console.log('[print] booklet: imposed');
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
console.log('[print] tableside: merging');
await mergePdfs(tablesideOrder.map((key) => results.find((item) => item.key === key).path), tablesidePath);
console.log('[print] tableside: merged');
const tablesideInfo = await inspectPdf(tablesidePath);
results.push({ key: 'tableside_pack', file: path.basename(tablesidePath), path: tablesidePath, ...tablesideInfo, sha256: sha256(tablesidePath) });

const manifest = {
  version: 'v0.6.2',
  generated_at: new Date().toISOString(),
  source_package: 'releases/v0.6.2/',
  print_source: 'v0.6.2/print/',
  booklet_padding: bookletPadding,
  outputs: results.map(({ key, file, pages, sizes, sha256 }) => ({ key, file, pages, sizes, sha256 })),
  printing: {
    reader_rulebook: 'Half-Letter portrait, actual size',
    imposed_booklet: 'Letter landscape, duplex, flip on short edge, actual size; three distinct faction-Leader plates fill unavoidable padding pages',
    tableside_materials: 'Letter; respect portrait or landscape orientation shown in each file',
  },
};
console.log('[print] manifest: writing');
fs.writeFileSync(path.join(releaseDir, 'Gauntlet_v0.6.2_Print_Manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Rendered ${results.length} v0.6.2 print outputs.`);
