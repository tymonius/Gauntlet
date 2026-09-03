import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildCatalog,
  PLAYABLE_BACK_FACTIONS,
  resolveCurrentTtsRelease,
  ROOT,
  writeCatalog,
} from './tts-current-catalog.mjs';
import {
  loadTtsComponentContract,
  resolveStandardBackFile,
} from './tts-component-contract.mjs';
import {
  surfaceCssPixels,
  surfaceDeviceScale,
  surfaceRasterPixels,
} from '../card-design/production-surface.mjs';

const { width: CARD_WIDTH, height: CARD_HEIGHT } = surfaceRasterPixels('portrait');
const { width: CSS_CARD_WIDTH, height: CSS_CARD_HEIGHT } = surfaceCssPixels('portrait');
const DEVICE_SCALE_FACTOR = surfaceDeviceScale('portrait');
const SHEET_COLUMNS = 10;
const SHEET_ROWS = 7;
const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1;
const CARDS_PER_SHEET = HIDDEN_SLOT;
const FALLBACK_BACK_FACTION = 'intelligence';
const FALLBACK_BACK_FILE = `backs/${FALLBACK_BACK_FACTION}.png`;

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function contentType(path) {
  const extension = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }[extension] || 'application/octet-stream';
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const requestPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const requested = resolve(ROOT, requestPath || 'index.html');
      if (!requested.startsWith(`${ROOT}${sep}`) && requested !== join(ROOT, 'index.html')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const file = (await stat(requested)).isDirectory() ? join(requested, 'index.html') : requested;
      response.writeHead(200, { 'Content-Type': contentType(file) });
      response.end(await readFile(file));
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message);
    }
  });

  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function sheetHtml(baseUrl, version, sheetCards) {
  const slots = Array.from({ length: SHEET_COLUMNS * SHEET_ROWS }, (_, index) => {
    if (index === HIDDEN_SLOT) {
      return `<img src="${baseUrl}/tts/generated/${version}/${FALLBACK_BACK_FILE}" alt="fallback hidden-card image">`;
    }
    const card = sheetCards[index];
    return card
      ? `<img src="${baseUrl}/tts/generated/${version}/cards/${card.id}.png" alt="${card.id}">`
      : '<div class="empty"></div>';
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:transparent}
    .sheet{display:grid;grid-template-columns:repeat(${SHEET_COLUMNS},${CSS_CARD_WIDTH}px);grid-template-rows:repeat(${SHEET_ROWS},${CSS_CARD_HEIGHT}px);width:${SHEET_COLUMNS * CSS_CARD_WIDTH}px;height:${SHEET_ROWS * CSS_CARD_HEIGHT}px}
    .sheet>*{display:block;width:${CSS_CARD_WIDTH}px;height:${CSS_CARD_HEIGHT}px}.empty{background:transparent}
  </style></head><body><div class="sheet">${slots}</div></body></html>`;
}

async function validateRenderedCard(page, card) {
  const result = await page.evaluate(() => {
    const element = document.querySelector('.gauntlet-card');
    const rect = element?.getBoundingClientRect();
    return {
      ready: document.body.dataset.renderReady,
      width: rect?.width,
      height: rect?.height,
      fitWarning: element?.classList.contains('fit-warning'),
      parchment: element?.dataset.parchmentLoaded,
    };
  });

  if (result.ready !== 'true') throw new Error(`Renderer did not become ready for ${card.id}.`);
  if (Math.abs(result.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(result.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected CSS card dimensions for ${card.id}: ${result.width} × ${result.height}.`);
  }
  if (result.fitWarning) throw new Error(`Card content does not fit the approved frame: ${card.id}.`);
  if (result.parchment !== 'true') throw new Error(`Parchment failed to load for ${card.id}.`);
}

async function renderProductionBack(page, baseUrl, outputRoot, faction) {
  await page.setViewportSize({ width: 520, height: 700 });
  await page.goto(`${baseUrl}/card-design/face-render.html?id=${encodeURIComponent(`back:${faction}`)}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.renderReady === 'true' || document.body.dataset.renderReady === 'error');
  const back = page.locator('.gauntlet-card-back');
  await back.waitFor();
  await page.waitForFunction(
    (expectedFaction) => document.querySelector('.gauntlet-card-back')?.dataset.cardBackFaction === expectedFaction,
    faction,
  );
  await page.waitForTimeout(100);

  const metrics = await back.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const wordmark = element.querySelector('.gauntlet-card-back__wordmark');
    const pattern = element.querySelector('.gauntlet-card-back__pattern');
    const wordmarkStyle = wordmark ? getComputedStyle(wordmark) : null;
    const patternRect = pattern?.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      faction: element.dataset.cardBackFaction,
      wordmarkMask: wordmarkStyle ? (wordmarkStyle.maskImage || wordmarkStyle.webkitMaskImage) : 'none',
      patternTransform: pattern ? getComputedStyle(pattern).transform : 'none',
      patternSource: pattern?.currentSrc || pattern?.src || '',
      patternComplete: Boolean(pattern?.complete),
      patternNaturalWidth: Number(pattern?.naturalWidth || 0),
      patternNaturalHeight: Number(pattern?.naturalHeight || 0),
      patternWidth: patternRect?.width || 0,
      patternHeight: patternRect?.height || 0,
    };
  });

  if (metrics.faction !== faction || Math.abs(metrics.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(metrics.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Production ${faction} back rendered with unexpected geometry: ${JSON.stringify(metrics)}.`);
  }
  if (
    metrics.wordmarkMask === 'none'
    || !metrics.patternComplete
    || metrics.patternNaturalWidth <= 0
    || metrics.patternNaturalHeight <= 0
    || !metrics.patternSource.includes('/card-design/card-back-pattern.svg')
    || metrics.patternTransform !== 'none'
    || Math.abs(metrics.patternWidth - (CSS_CARD_WIDTH - 16.4)) > 0.5
    || Math.abs(metrics.patternHeight - (CSS_CARD_HEIGHT - 16.4)) > 0.5
  ) {
    throw new Error(`Production ${faction} back did not load the flattened shared wordmark/pattern treatment: ${JSON.stringify(metrics)}.`);
  }

  const file = `backs/${faction}.png`;
  await back.screenshot({ path: join(outputRoot, file), omitBackground: true });
  return { faction, file, pixels: { width: CARD_WIDTH, height: CARD_HEIGHT } };
}

async function renderAssets(catalog, componentContract) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  const release = await resolveCurrentTtsRelease();
  const outputRoot = release.outputRoot;
  await rm(join(outputRoot, 'cards'), { recursive: true, force: true });
  await rm(join(outputRoot, 'sheets'), { recursive: true, force: true });
  await rm(join(outputRoot, 'backs'), { recursive: true, force: true });
  await mkdir(join(outputRoot, 'cards'), { recursive: true });
  await mkdir(join(outputRoot, 'sheets'), { recursive: true });
  await mkdir(join(outputRoot, 'backs'), { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 520, height: 700 },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();

  try {
    let fontsValidated = false;
    for (const card of catalog.playableCards) {
      await page.setViewportSize({ width: 520, height: 700 });
      await page.goto(`${baseUrl}/card-design/face-render.html?id=${encodeURIComponent(`card:${card.id}`)}`, { waitUntil: 'load' });
      await page.waitForFunction(() => document.body.dataset.renderReady === 'true' || document.body.dataset.renderReady === 'error');
      const renderState = await page.evaluate(() => ({
        ready: document.body.dataset.renderReady || '',
        message: document.body.dataset.renderErrorMessage || '',
      }));
      if (renderState.ready !== 'true') {
        throw new Error(`Canonical face renderer failed for playable card ${card.id}: ${renderState.message || 'unspecified render error'}`);
      }
      await page.waitForSelector('.gauntlet-card', { state: 'attached' });

      if (!fontsValidated) {
        const fonts = await page.evaluate(async () => {
          await document.fonts.ready;
          return {
            title: document.fonts.check('12px "p22-1722-pro"'),
            rules: document.fonts.check('12px "adobe-caslon-pro"'),
          };
        });
        if (!fonts.title || !fonts.rules) {
          throw new Error(`Required card fonts failed to load: ${JSON.stringify(fonts)}`);
        }
        fontsValidated = true;
      }

      await validateRenderedCard(page, card);
      await page.locator('.gauntlet-card').screenshot({
        path: join(outputRoot, 'cards', `${card.id}.png`),
        omitBackground: true,
      });
    }

    const backVariants = {};
    for (const faction of PLAYABLE_BACK_FACTIONS) {
      backVariants[faction] = await renderProductionBack(page, baseUrl, outputRoot, faction);
    }

    const sheets = chunk(catalog.playableCards, CARDS_PER_SHEET);
    const sheetRecords = [];
    for (let index = 0; index < sheets.length; index += 1) {
      const cards = sheets[index];
      const sheetNumber = index + 1;
      const deckId = sheetNumber;
      await page.setViewportSize({
        width: SHEET_COLUMNS * CSS_CARD_WIDTH,
        height: SHEET_ROWS * CSS_CARD_HEIGHT,
      });
      await page.setContent(sheetHtml(baseUrl, release.version, cards), { waitUntil: 'load' });
      await page.waitForFunction(() => Array.from(document.images).every(
        (image) => image.complete && image.naturalWidth > 0,
      ));

      const file = `sheets/gauntlet-${release.version.replaceAll('.', '')}-sheet-${String(sheetNumber).padStart(2, '0')}.png`;
      await page.locator('.sheet').screenshot({
        path: join(outputRoot, file),
        omitBackground: true,
      });
      sheetRecords.push({
        sheetNumber,
        deckId,
        faceFile: file,
        fallbackHiddenFile: FALLBACK_BACK_FILE,
        numWidth: SHEET_COLUMNS,
        numHeight: SHEET_ROWS,
        backIsHidden: true,
        uniqueBack: false,
        cards: cards.map((card, cardIndex) => ({
          id: card.id,
          name: card.name,
          faction: card.faction,
          index: cardIndex,
          ttsCardId: deckId * 100 + cardIndex,
        })),
      });
    }

    await writeFile(join(outputRoot, 'manifest.json'), jsonText({
      schemaVersion: 4,
      gameVersion: release.version,
      release: catalog.release,
      output: {
        cardPixels: { width: CARD_WIDTH, height: CARD_HEIGHT },
        sheetPixels: {
          width: CARD_WIDTH * SHEET_COLUMNS,
          height: CARD_HEIGHT * SHEET_ROWS,
        },
        columns: SHEET_COLUMNS,
        rows: SHEET_ROWS,
        cardsPerSheet: CARDS_PER_SHEET,
        hiddenSlotIndex: HIDDEN_SLOT,
      },
      prototypeBack: false,
      componentContract: 'config/tts-component-contract.json',
      backPolicy: {
        policy: 'standardBack',
        ...componentContract.standardBack,
        neutralCardsUseSameStandardBack: true,
        backIsHidden: true,
        uniqueBack: false,
        fallbackHiddenFile: FALLBACK_BACK_FILE,
        note: 'All ordinary playable cards use standardBack. The current mode chooses either the player faction variant or the universal black variant; Neutral cards never reveal allegiance while face down.',
      },
      backVariants,
      sheets: sheetRecords,
      missingArtwork: catalog.missingArtwork,
    }));
  } finally {
    await context.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

async function main() {
  const options = new Set(process.argv.slice(2));
  const checkOnly = options.has('--check');
  const catalogOnly = options.has('--catalog-only') || checkOnly;
  const strictArt = options.has('--strict-art');
  const [catalog, componentContract] = await Promise.all([
    buildCatalog(),
    loadTtsComponentContract(),
  ]);

  if (strictArt && catalog.missingArtwork.length) {
    throw new Error(`Missing artwork for ${catalog.missingArtwork.length} cards:\n${catalog.missingArtwork.join('\n')}`);
  }
  for (const faction of PLAYABLE_BACK_FACTIONS) resolveStandardBackFile(componentContract, faction);

  if (checkOnly) {
    console.log(`Current TTS source check passed for ${catalog.gameVersion}: ${catalog.playableCards.length} playable cards, ${catalog.territories.length} Territories, ${catalog.missingArtwork.length} cards without artwork, standard backs=${componentContract.standardBack.mode}.`);
    return;
  }

  const release = await writeCatalog(catalog);
  if (!catalogOnly) await renderAssets(catalog, componentContract);
  console.log(catalogOnly
    ? `Wrote current TTS catalog for ${release.version} to ${relative(ROOT, release.outputRoot)} and tts/generated/current/.`
    : `Rendered ${catalog.playableCards.length} card images, ${PLAYABLE_BACK_FACTIONS.length} production backs, and ${Math.ceil(catalog.playableCards.length / CARDS_PER_SHEET)} TTS sheets to ${relative(ROOT, release.outputRoot)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { renderAssets };
