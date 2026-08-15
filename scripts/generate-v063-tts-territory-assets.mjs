import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildCatalog, OUTPUT_ROOT, ROOT, VERSION } from './tts-v063-catalog.mjs';

const TERRITORY_WIDTH = 560;
const TERRITORY_HEIGHT = 400;
const CSS_TERRITORY_WIDTH = 336;
const CSS_TERRITORY_HEIGHT = 240;
const SHEET_COLUMNS = 7;
const SHEET_ROWS = 4;
const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1;
const DECK_ID = 50;

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function validateCatalog(catalog) {
  if (catalog.territories.length !== 25) {
    throw new Error(`Expected 25 canonical Territories; found ${catalog.territories.length}.`);
  }
  if (catalog.territories.filter((territory) => territory.arena).length !== 4) {
    throw new Error('Expected four canonical Arenas.');
  }
  if (catalog.territories.some((territory) => !territory.text.trim())) {
    throw new Error('Every canonical Territory must have player-facing text.');
  }
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

async function writeCatalog(catalog) {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  await writeFile(join(OUTPUT_ROOT, 'catalog.json'), jsonText(catalog));
  await writeFile(
    join(OUTPUT_ROOT, 'catalog.js'),
    `window.GAUNTLET_TTS_CATALOG = ${JSON.stringify(catalog)};\n`,
  );
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

function temporaryTerritoryBackHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:transparent}
    .back{position:relative;width:${CSS_TERRITORY_WIDTH}px;height:${CSS_TERRITORY_HEIGHT}px;overflow:hidden;border:1px solid #241c15;border-radius:12px;background:#282827;color:#fff9f1;font-family:Georgia,serif}
    .back:before{position:absolute;inset:7px;border:1px solid #d7b783;border-radius:8px;content:""}
    .mark{position:absolute;inset:0;display:grid;place-items:center;font-size:38px;letter-spacing:.12em;text-transform:uppercase}
    .edition{position:absolute;left:0;right:0;bottom:18px;text-align:center;font:700 7px Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#d7b783}
  </style></head><body><div class="back"><div class="mark">Gauntlet</div><div class="edition">v0.6.3 temporary Territory back</div></div></body></html>`;
}

function territorySheetHtml(baseUrl, territories) {
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

async function validateRenderedTerritory(page, territory) {
  const result = await page.evaluate(() => {
    const element = document.querySelector('.territory-card');
    const rect = element?.getBoundingClientRect();
    return {
      ready: document.body.dataset.renderReady,
      width: rect?.width,
      height: rect?.height,
      fitWarning: element?.classList.contains('fit-warning'),
      titleFit: element?.dataset.titleFit,
      effectScale: element?.dataset.effectScale,
      parchment: element?.dataset.parchmentLoaded,
    };
  });

  if (result.ready !== 'true') throw new Error(`Territory renderer did not become ready for ${territory.id}.`);
  if (Math.abs(result.width - CSS_TERRITORY_WIDTH) > 0.25 || Math.abs(result.height - CSS_TERRITORY_HEIGHT) > 0.25) {
    throw new Error(`Unexpected Territory dimensions for ${territory.id}: ${result.width} × ${result.height}.`);
  }
  if (result.fitWarning || result.titleFit !== 'true') {
    throw new Error(`Territory text does not fit the approved landscape frame: ${territory.id}.`);
  }
  if (!result.effectScale) throw new Error(`Territory fitting metadata is missing for ${territory.id}.`);
  if (result.parchment !== 'true') throw new Error(`Territory parchment failed to load for ${territory.id}.`);
}

async function renderTerritories(catalog) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  await rm(join(OUTPUT_ROOT, 'territories'), { recursive: true, force: true });
  await rm(join(OUTPUT_ROOT, 'territory-sheets'), { recursive: true, force: true });
  await mkdir(join(OUTPUT_ROOT, 'territories'), { recursive: true });
  await mkdir(join(OUTPUT_ROOT, 'territory-sheets'), { recursive: true });
  await writeCatalog(catalog);

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 620, height: 500 },
    deviceScaleFactor: TERRITORY_WIDTH / CSS_TERRITORY_WIDTH,
  });
  const page = await context.newPage();

  try {
    let fontsValidated = false;
    for (const territory of catalog.territories) {
      await page.setViewportSize({ width: 620, height: 500 });
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

      await validateRenderedTerritory(page, territory);
      await page.locator('.territory-card').screenshot({
        path: join(OUTPUT_ROOT, 'territories', `${territory.id}.png`),
        omitBackground: true,
      });
    }

    await page.setViewportSize({ width: 620, height: 500 });
    await page.setContent(temporaryTerritoryBackHtml(), { waitUntil: 'load' });
    await page.locator('.back').screenshot({
      path: join(OUTPUT_ROOT, 'territory-back.png'),
      omitBackground: true,
    });

    await page.setViewportSize({
      width: SHEET_COLUMNS * CSS_TERRITORY_WIDTH,
      height: SHEET_ROWS * CSS_TERRITORY_HEIGHT,
    });
    await page.setContent(territorySheetHtml(baseUrl, catalog.territories), { waitUntil: 'load' });
    await page.waitForFunction(() => Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    ));

    const faceFile = `territory-sheets/gauntlet-${VERSION.replaceAll('.', '')}-territories.png`;
    await page.locator('.sheet').screenshot({
      path: join(OUTPUT_ROOT, faceFile),
      omitBackground: true,
    });

    const cards = catalog.territories.map((territory, index) => ({
      id: territory.id,
      name: territory.name,
      arena: territory.arena,
      complexity: territory.complexity,
      index,
      ttsCardId: DECK_ID * 100 + index,
    }));

    await writeFile(join(OUTPUT_ROOT, 'territory-manifest.json'), jsonText({
      schemaVersion: 2,
      gameVersion: VERSION,
      component: 'territories',
      output: {
        cardPixels: { width: TERRITORY_WIDTH, height: TERRITORY_HEIGHT },
        sheetPixels: {
          width: TERRITORY_WIDTH * SHEET_COLUMNS,
          height: TERRITORY_HEIGHT * SHEET_ROWS,
        },
        columns: SHEET_COLUMNS,
        rows: SHEET_ROWS,
        hiddenSlotIndex: HIDDEN_SLOT,
      },
      sheet: {
        deckId: DECK_ID,
        faceFile,
        backFile: 'territory-back.png',
        numWidth: SHEET_COLUMNS,
        numHeight: SHEET_ROWS,
        backIsHidden: true,
        uniqueBack: false,
        cards,
      },
      counts: {
        territories: cards.filter((card) => !card.arena).length,
        arenas: cards.filter((card) => card.arena).length,
        total: cards.length,
      },
      temporaryBack: true,
    }));
  } finally {
    await context.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const catalog = await buildCatalog();
  validateCatalog(catalog);

  if (checkOnly) {
    console.log(`TTS v0.6.3 Territory source check passed: ${catalog.territories.length} Territories, including ${catalog.territories.filter((territory) => territory.arena).length} Arenas.`);
    return;
  }

  await renderTerritories(catalog);
  console.log(`Rendered ${catalog.territories.length} v0.6.3 landscape Territories to ${relative(ROOT, OUTPUT_ROOT)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { renderTerritories, validateCatalog };
