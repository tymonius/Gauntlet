import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const CSS_CARD_WIDTH = 240;
const CSS_CARD_HEIGHT = 336;
const DEVICE_SCALE = 400 / CSS_CARD_WIDTH;
const RITUAL_ID = 'mystics-ritual-of-ascension';

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function contentType(path) {
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
  }[extname(path).toLowerCase()] || 'application/octet-stream';
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
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function settleCard(locator, label) {
  const count = await locator.count();
  if (count !== 1) throw new Error(`${label} expected exactly one production card; found ${count}.`);

  await locator.evaluate(async card => {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = [...card.querySelectorAll('img')];
    await Promise.all(images.map(image => {
      if (image.complete) {
        if (image.naturalWidth > 0) return Promise.resolve();
        return Promise.reject(new Error(`Failed to load ${image.currentSrc || image.src}`));
      }
      return new Promise((resolveImage, rejectImage) => {
        const timeout = setTimeout(() => rejectImage(new Error(`Timed out loading ${image.currentSrc || image.src}`)), 15000);
        image.addEventListener('load', () => {
          clearTimeout(timeout);
          resolveImage();
        }, { once: true });
        image.addEventListener('error', () => {
          clearTimeout(timeout);
          rejectImage(new Error(`Failed to load ${image.currentSrc || image.src}`));
        }, { once: true });
      });
    }));
    await new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
  });

  const geometry = await locator.evaluate(card => {
    const rect = card.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  if (Math.abs(geometry.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(geometry.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`${label} production geometry is ${geometry.width} × ${geometry.height}; expected ${CSS_CARD_WIDTH} × ${CSS_CARD_HEIGHT}.`);
  }
}

async function captureCard(page, selector, outputPath, label) {
  const locator = page.locator(selector);
  await settleCard(locator, label);
  await locator.screenshot({ path: outputPath, omitBackground: true });
}

function maxDeckId(manifest) {
  return Math.max(199, ...(manifest.ready || []).map(record => Number(record.tts?.deckId) || 0));
}

function replaceById(records, replacement) {
  return [...(records || []).filter(record => record.id !== replacement.id), replacement];
}

function updateRiteRecord(record, rite, frontFile, reverseFile) {
  if (!record) throw new Error(`Current supplemental manifest is missing mystics-rite-${rite.id}.`);
  return {
    ...record,
    name: rite.name,
    source: 'game-data/current-game.json',
    renderer: 'production-rite-card',
    frontFile,
    reverseFile,
    tts: {
      ...record.tts,
      faceFile: frontFile,
      backFile: reverseFile,
      numWidth: 1,
      numHeight: 1,
      backIsHidden: true,
      uniqueBack: false,
      sidewaysCard: false,
    },
  };
}

function ritualRecord(ritual, deckId, frontFile, reverseFile) {
  return {
    id: RITUAL_ID,
    name: ritual.name,
    faction: 'mystics',
    family: 'ritual-card',
    quantity: 1,
    deckInclusion: '',
    productionStatus: 'ready',
    designStatus: 'final',
    backPolicy: 'twoSided',
    reverse: 'Ritual working sheet',
    representation: 'card',
    source: 'game-data/current-game.json',
    renderer: 'production-rite-card',
    orientation: 'portrait',
    frontFile,
    reverseFile,
    tts: {
      cardId: deckId * 100,
      deckId,
      index: 0,
      faceFile: frontFile,
      backFile: reverseFile,
      numWidth: 1,
      numHeight: 1,
      backIsHidden: true,
      uniqueBack: false,
      sidewaysCard: false,
    },
  };
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const outputRoot = release.outputRoot;
  const [currentGame, manifest, catalog] = await Promise.all([
    readFile(join(ROOT, 'game-data/current-game.json'), 'utf8').then(JSON.parse),
    readFile(join(outputRoot, 'supplemental-manifest.json'), 'utf8').then(JSON.parse),
    readFile(join(outputRoot, 'supplemental-catalog.json'), 'utf8').then(JSON.parse),
  ]);

  const rites = currentGame.mystics?.rites || [];
  const ritual = currentGame.mystics?.ritual;
  if (!rites.length || !ritual?.id || !ritual?.name) {
    throw new Error('Current-game Mystics authority must expose a Rite pool and one Ritual.');
  }

  const riteByComponentId = new Map(rites.map(rite => [`mystics-rite-${rite.id}`, rite]));
  const packagedRiteComponents = (currentGame.componentContract?.components || [])
    .filter(component => component.family === 'rite-card' && component.productionStatus === 'ready');
  if (!packagedRiteComponents.length) {
    throw new Error('Current component contract exposes no production-ready Mystics Rite components.');
  }
  const packagedRites = packagedRiteComponents.map(component => {
    const rite = riteByComponentId.get(component.id);
    if (!rite) throw new Error(`Production Rite component ${component.id} is not present in the current Rite pool.`);
    return rite;
  });

  await mkdir(join(outputRoot, 'supplementals/fronts'), { recursive: true });
  await mkdir(join(outputRoot, 'supplementals/reverses'), { recursive: true });

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required to render current Mystics production cards.');
  }

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1200 },
    deviceScaleFactor: DEVICE_SCALE,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/card-design/?type=rite`, { waitUntil: 'load' });
    await page.waitForSelector(`#riteReviewSections[data-rite-count="${rites.length}"][data-ritual-count="1"]`, { timeout: 15000 });

    for (const rite of packagedRites) {
      const componentId = `mystics-rite-${rite.id}`;
      const frontFile = `supplementals/fronts/${componentId}.png`;
      const reverseFile = `supplementals/reverses/${componentId}-completed.png`;
      await captureCard(
        page,
        `#rite-${rite.id} .rite-face:nth-of-type(1) .rite-card`,
        join(outputRoot, frontFile),
        `${rite.name} incomplete face`,
      );
      await captureCard(
        page,
        `#rite-${rite.id} .rite-face:nth-of-type(2) .completed-rite-card`,
        join(outputRoot, reverseFile),
        `${rite.name} completed face`,
      );

      const existingManifest = (manifest.ready || []).find(record => record.id === componentId);
      const updated = updateRiteRecord(existingManifest, rite, frontFile, reverseFile);
      manifest.ready = replaceById(manifest.ready, updated);

      const existingCatalog = (catalog.ready || []).find(record => record.id === componentId) || existingManifest;
      catalog.ready = replaceById(catalog.ready, updateRiteRecord(existingCatalog, rite, frontFile, reverseFile));
    }

    const ritualFront = `supplementals/fronts/${RITUAL_ID}.png`;
    const ritualBack = `supplementals/reverses/${RITUAL_ID}.png`;
    await captureCard(
      page,
      '#ritual-ascension .rite-face:nth-of-type(1) .ritual-card',
      join(outputRoot, ritualFront),
      `${ritual.name} face`,
    );
    await captureCard(
      page,
      '#ritual-ascension .rite-face:nth-of-type(2) .ritual-card-back',
      join(outputRoot, ritualBack),
      `${ritual.name} back`,
    );

    const existingRitual = (manifest.ready || []).find(record => record.id === RITUAL_ID);
    const deckId = Number(existingRitual?.tts?.deckId) || maxDeckId(manifest) + 1;
    const ritualComponent = ritualRecord(ritual, deckId, ritualFront, ritualBack);
    manifest.ready = replaceById(manifest.ready, ritualComponent);
    manifest.pending = (manifest.pending || []).filter(record => record.id !== RITUAL_ID);
    catalog.ready = replaceById(catalog.ready, ritualComponent);
    catalog.pending = (catalog.pending || []).filter(record => record.id !== RITUAL_ID);

    manifest.readyCount = manifest.ready.length;
    manifest.pendingCount = manifest.pending.length;
    catalog.readyCount = catalog.ready.length;
    catalog.pendingCount = catalog.pending.length;
    manifest.currentMysticsProductionBridge = {
      ritePoolCount: rites.length,
      packagedRiteCount: packagedRites.length,
      ritualCount: 1,
      source: 'card-design/rite-card.js + game-data/current-game.json + componentContract',
    };
    catalog.currentMysticsProductionBridge = manifest.currentMysticsProductionBridge;

    const manifestText = jsonText(manifest);
    const catalogText = jsonText(catalog);
    await Promise.all([
      writeFile(join(outputRoot, 'supplemental-manifest.json'), manifestText),
      writeFile(join(CURRENT_ALIAS_ROOT, 'supplemental-manifest.json'), manifestText),
      writeFile(join(outputRoot, 'supplemental-catalog.json'), catalogText),
      writeFile(join(CURRENT_ALIAS_ROOT, 'supplemental-catalog.json'), catalogText),
    ]);

    console.log(`Re-rendered ${packagedRites.length} production-ready Mystics Rite pairs from a ${rites.length}-Rite pool and added ${ritual.name} to the TTS supplemental package.`);
  } finally {
    await context.close();
    await browser.close();
    await new Promise(done => server.close(done));
  }
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
