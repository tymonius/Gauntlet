import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VERSION = 'v0.6.1';
const OUTPUT_ROOT = join(ROOT, 'tts', 'generated', VERSION);
const CATALOG_FILE = join(OUTPUT_ROOT, 'catalog.json');
const MANIFEST_FILE = join(OUTPUT_ROOT, 'manifest.json');
const TERRITORY_SOURCE = join(ROOT, 'docs', 'Gauntlet_v0.6.1_Territory_Pool.md');

const TERRITORY_WIDTH = 560;
const TERRITORY_HEIGHT = 400;
const CSS_TERRITORY_WIDTH = 336;
const CSS_TERRITORY_HEIGHT = 240;
const SHEET_COLUMNS = 5;
const SHEET_ROWS = 6;
const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1;
const TERRITORIES_PER_SHEET = HIDDEN_SLOT;
const TERRITORY_DECK_ID = 3;
const EXPECTED_TERRITORIES = 25;

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function contentType(path) {
  const extension = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
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
  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

async function orderedTerritories(catalog) {
  const markdown = (await readFile(TERRITORY_SOURCE, 'utf8')).replace(/\r/g, '');
  const canonicalOrder = new Map(
    [...markdown.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)]
      .map((match) => [match[2].trim(), Number(match[1])]),
  );

  const territories = catalog.territories.map((territory) => ({
    ...territory,
    number: canonicalOrder.get(territory.name),
  }));

  const missingNumbers = territories.filter((territory) => !Number.isInteger(territory.number));
  if (missingNumbers.length) {
    throw new Error(`Territory numbers could not be resolved: ${missingNumbers.map((item) => item.name).join(', ')}`);
  }

  territories.sort((left, right) => left.number - right.number);
  if (territories.length !== EXPECTED_TERRITORIES) {
    throw new Error(`Canonical Territory count is ${territories.length}; expected ${EXPECTED_TERRITORIES}.`);
  }
  if (territories.filter((territory) => territory.arena).length !== 4) {
    throw new Error('Canonical Territory catalog must contain exactly four Arenas.');
  }

  return territories;
}

async function writeBrowserCatalog(territories) {
  const browserCatalog = {
    schemaVersion: 1,
    gameVersion: VERSION,
    territories,
  };
  await writeFile(join(OUTPUT_ROOT, 'territories.json'), jsonText(browserCatalog));
  await writeFile(
    join(OUTPUT_ROOT, 'territories.js'),
    `window.GAUNTLET_TERRITORY_CATALOG = ${JSON.stringify(browserCatalog)};\n`,
  );
}

function sheetHtml(baseUrl, territories) {
  const slots = Array.from({ length: SHEET_COLUMNS * SHEET_ROWS }, (_, index) => {
    if (index === HIDDEN_SLOT) {
      return `<img src="${baseUrl}/tts/generated/${VERSION}/territory-back.png" alt="hidden Territory image">`;
    }
    const territory = territories[index];
    return territory
      ? `<img src="${baseUrl}/tts/generated/${VERSION}/territories/${territory.id}.png" alt="${territory.id}">`
      : '<div class="empty"></div>';
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:transparent}
    .sheet{display:grid;grid-template-columns:repeat(${SHEET_COLUMNS},${CSS_TERRITORY_WIDTH}px);grid-template-rows:repeat(${SHEET_ROWS},${CSS_TERRITORY_HEIGHT}px);width:${SHEET_COLUMNS * CSS_TERRITORY_WIDTH}px;height:${SHEET_ROWS * CSS_TERRITORY_HEIGHT}px}
    .sheet>*{display:block;width:${CSS_TERRITORY_WIDTH}px;height:${CSS_TERRITORY_HEIGHT}px}.empty{background:transparent}
  </style></head><body><div class="sheet">${slots}</div></body></html>`;
}

async function validateTerritory(page, territory) {
  const result = await page.evaluate(() => {
    const element = document.querySelector('.territory-card');
    const rect = element?.getBoundingClientRect();
    return {
      ready: document.body.dataset.renderReady,
      width: rect?.width,
      height: rect?.height,
      fitWarning: element?.classList.contains('fit-warning'),
      rulesScale: element?.dataset.rulesScale,
    };
  });

  if (result.ready !== 'true') throw new Error(`Territory renderer did not become ready for ${territory.id}.`);
  if (Math.abs(result.width - CSS_TERRITORY_WIDTH) > 0.25 || Math.abs(result.height - CSS_TERRITORY_HEIGHT) > 0.25) {
    throw new Error(`Unexpected Territory dimensions for ${territory.id}: ${result.width} × ${result.height}.`);
  }
  if (result.fitWarning) {
    throw new Error(`Territory text does not fit the dedicated frame: ${territory.id} at scale ${result.rulesScale}.`);
  }
}

async function updateManifest(territories, sheetFile) {
  const manifest = JSON.parse(await readFile(MANIFEST_FILE, 'utf8'));
  const territorySheet = {
    family: 'territories',
    sheetNumber: 1,
    deckId: TERRITORY_DECK_ID,
    faceFile: sheetFile,
    backFile: 'territory-back.png',
    numWidth: SHEET_COLUMNS,
    numHeight: SHEET_ROWS,
    backIsHidden: true,
    uniqueBack: false,
    cards: territories.map((territory, index) => ({
      id: territory.id,
      name: territory.name,
      number: territory.number,
      arena: territory.arena,
      index,
      ttsCardId: TERRITORY_DECK_ID * 100 + index,
    })),
  };

  const updated = {
    ...manifest,
    schemaVersion: Math.max(Number(manifest.schemaVersion) || 1, 2),
    territoryOutput: {
      cardPixels: { width: TERRITORY_WIDTH, height: TERRITORY_HEIGHT },
      sheetPixels: {
        width: TERRITORY_WIDTH * SHEET_COLUMNS,
        height: TERRITORY_HEIGHT * SHEET_ROWS,
      },
      columns: SHEET_COLUMNS,
      rows: SHEET_ROWS,
      territoriesPerSheet: TERRITORIES_PER_SHEET,
      hiddenSlotIndex: HIDDEN_SLOT,
      standardTerritories: territories.filter((territory) => !territory.arena).length,
      arenas: territories.filter((territory) => territory.arena).length,
    },
    territoryPrototypeBack: true,
    territorySheets: [territorySheet],
  };

  await writeFile(MANIFEST_FILE, jsonText(updated));
}

async function renderTerritoryAssets() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  const catalog = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
  const territories = await orderedTerritories(catalog);
  await writeBrowserCatalog(territories);

  await rm(join(OUTPUT_ROOT, 'territories'), { recursive: true, force: true });
  await mkdir(join(OUTPUT_ROOT, 'territories'), { recursive: true });
  await mkdir(join(OUTPUT_ROOT, 'sheets'), { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 520, height: 420 },
    deviceScaleFactor: TERRITORY_WIDTH / CSS_TERRITORY_WIDTH,
  });
  const page = await context.newPage();

  try {
    let fontsValidated = false;
    for (const territory of territories) {
      await page.setViewportSize({ width: 520, height: 420 });
      await page.goto(`${baseUrl}/tts/territory-renderer/?territory=${encodeURIComponent(territory.id)}`, { waitUntil: 'load' });
      await page.waitForSelector('.territory-card');
      await page.waitForFunction(() => document.body.dataset.renderReady === 'true');

      if (!fontsValidated) {
        const fonts = await page.evaluate(async () => {
          await document.fonts.ready;
          return {
            title: document.fonts.check('12px "p22-1722-pro"'),
            rules: document.fonts.check('12px "adobe-caslon-pro"'),
          };
        });
        if (!fonts.title || !fonts.rules) {
          throw new Error(`Required Territory fonts failed to load: ${JSON.stringify(fonts)}`);
        }
        fontsValidated = true;
      }

      await validateTerritory(page, territory);
      await page.locator('.territory-card').screenshot({
        path: join(OUTPUT_ROOT, 'territories', `${territory.id}.png`),
        omitBackground: true,
      });
    }

    await page.setViewportSize({ width: 520, height: 420 });
    await page.goto(`${baseUrl}/tts/territory-renderer/?back=1`, { waitUntil: 'load' });
    await page.waitForSelector('.territory-card.back');
    await page.waitForFunction(() => document.body.dataset.renderReady === 'true');
    await page.locator('.territory-card.back').screenshot({
      path: join(OUTPUT_ROOT, 'territory-back.png'),
      omitBackground: true,
    });

    await page.setViewportSize({
      width: SHEET_COLUMNS * CSS_TERRITORY_WIDTH,
      height: SHEET_ROWS * CSS_TERRITORY_HEIGHT,
    });
    await page.setContent(sheetHtml(baseUrl, territories), { waitUntil: 'load' });
    await page.waitForFunction(() => Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    ));

    const sheetFile = `sheets/gauntlet-${VERSION.replaceAll('.', '')}-territories.png`;
    await page.locator('.sheet').screenshot({
      path: join(OUTPUT_ROOT, sheetFile),
      omitBackground: true,
    });
    await updateManifest(territories, sheetFile);
  } finally {
    await context.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }

  console.log(`Rendered ${territories.length} landscape Territory cards and one ${SHEET_COLUMNS} × ${SHEET_ROWS} TTS sheet to ${relative(ROOT, OUTPUT_ROOT)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  renderTerritoryAssets().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { orderedTerritories, renderTerritoryAssets };
