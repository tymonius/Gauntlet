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
} from '../packages/rendering/production-surface.mjs';

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
      let relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!relativePath) relativePath = 'index.html';
      if (relativePath.endsWith('/')) relativePath += 'index.html';

      const filePath = resolve(ROOT, relativePath);
      const relativeToRoot = relative(ROOT, filePath);
      if (relativeToRoot.startsWith('..') || relativeToRoot.split(sep).includes('..')) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const info = await stat(filePath).catch(() => null);
      if (!info?.isFile()) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      response.writeHead(200, { 'Content-Type': contentType(filePath) });
      response.end(await readFile(filePath));
    } catch (error) {
      response.writeHead(500);
      response.end(String(error?.stack || error));
    }
  });

  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to resolve local render server address.');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolvePromise, reject) => server.close(error => error ? reject(error) : resolvePromise())),
  };
}

async function launchBrowser() {
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true });
}

function playableCardFaces(catalog) {
  return catalog.cards.map(card => ({
    ...card,
    canonicalFaceId: `card:${card.id}`,
  }));
}

function cardBackFaces(catalog) {
  return PLAYABLE_BACK_FACTIONS.map(faction => ({
    id: faction,
    name: `${faction} card back`,
    faction,
    canonicalFaceId: `back:${faction}`,
  }));
}

function cardRenderUrl(baseUrl, canonicalFaceId, printArtwork) {
  const url = new URL('/card-design/face-render.html', baseUrl);
  url.searchParams.set('id', canonicalFaceId);
  if (printArtwork) url.searchParams.set('printArtwork', 'true');
  return url.href;
}

async function renderFace(page, url, outputPath) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('[data-canonical-face]').waitFor({ state: 'visible' });
  await page.locator('[data-canonical-face]').screenshot({ path: outputPath });
}

async function ensureDirectory(path) {
  await mkdir(path, { recursive: true });
}

function sheetFileName(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(2, '0')}.png`;
}

async function renderCardFaces({ browser, baseUrl, faces, outputRoot, printArtwork }) {
  const pages = [];
  const page = await browser.newPage({
    viewport: { width: CSS_CARD_WIDTH, height: CSS_CARD_HEIGHT },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  try {
    for (const face of faces) {
      const file = `${face.id}.png`;
      const outputPath = join(outputRoot, file);
      await renderFace(page, cardRenderUrl(baseUrl, face.canonicalFaceId, printArtwork), outputPath);
      pages.push({ ...face, file });
    }
  } finally {
    await page.close();
  }
  return pages;
}

async function compositeSheet({ browser, baseUrl, faces, outputPath }) {
  const page = await browser.newPage({
    viewport: {
      width: CSS_CARD_WIDTH * SHEET_COLUMNS,
      height: CSS_CARD_HEIGHT * SHEET_ROWS,
    },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });

  try {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      html, body { margin: 0; padding: 0; background: transparent; }
      .sheet { display: grid; grid-template-columns: repeat(${SHEET_COLUMNS}, ${CSS_CARD_WIDTH}px); grid-template-rows: repeat(${SHEET_ROWS}, ${CSS_CARD_HEIGHT}px); }
      .slot { width: ${CSS_CARD_WIDTH}px; height: ${CSS_CARD_HEIGHT}px; overflow: hidden; }
      img { display: block; width: ${CSS_CARD_WIDTH}px; height: ${CSS_CARD_HEIGHT}px; }
    </style></head><body><div class="sheet">${faces.map(face => `<div class="slot"><img src="${face.src}" alt=""></div>`).join('')}</div></body></html>`;
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outputPath, omitBackground: true });
  } finally {
    await page.close();
  }
}

async function renderSheets({ browser, baseUrl, faces, outputRoot, prefix }) {
  const sheets = [];
  for (const [index, group] of chunk(faces, CARDS_PER_SHEET).entries()) {
    const slots = [...group];
    while (slots.length < CARDS_PER_SHEET) slots.push(null);
    slots.push(null);
    const renderFaces = slots.map(face => face
      ? { src: new URL(face.file, `${baseUrl}/tts/generated/cards/`).href }
      : { src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' });
    const file = sheetFileName(prefix, index);
    await compositeSheet({ browser, baseUrl, faces: renderFaces, outputPath: join(outputRoot, file) });
    sheets.push({ file, count: group.length });
  }
  return sheets;
}

export async function generateTtsCardAssets({ strictArtwork = false } = {}) {
  const catalog = await buildCatalog({ strictArtwork });
  const release = await resolveCurrentTtsRelease();
  const outputRoot = resolve(ROOT, 'tts/generated');
  const cardsRoot = join(outputRoot, 'cards');
  const backsRoot = join(outputRoot, 'backs');
  const sheetsRoot = join(outputRoot, 'sheets');

  await rm(cardsRoot, { recursive: true, force: true });
  await rm(backsRoot, { recursive: true, force: true });
  await rm(sheetsRoot, { recursive: true, force: true });
  await ensureDirectory(cardsRoot);
  await ensureDirectory(backsRoot);
  await ensureDirectory(sheetsRoot);

  const server = await startStaticServer();
  const browser = await launchBrowser();
  try {
    const cards = await renderCardFaces({
      browser,
      baseUrl: server.baseUrl,
      faces: playableCardFaces(catalog),
      outputRoot: cardsRoot,
      printArtwork: true,
    });
    const backs = await renderCardFaces({
      browser,
      baseUrl: server.baseUrl,
      faces: cardBackFaces(catalog),
      outputRoot: backsRoot,
      printArtwork: false,
    });

    const cardSheets = await renderSheets({
      browser,
      baseUrl: server.baseUrl,
      faces: cards.map(card => ({ ...card, file: `cards/${card.file}` })),
      outputRoot: sheetsRoot,
      prefix: 'cards',
    });
    const backSheets = await renderSheets({
      browser,
      baseUrl: server.baseUrl,
      faces: backs.map(back => ({ ...back, file: `backs/${back.file}` })),
      outputRoot: sheetsRoot,
      prefix: 'backs',
    });

    const componentContract = await loadTtsComponentContract();
    const manifest = {
      schemaVersion: 1,
      gameVersion: catalog.version,
      releaseTag: release.tag,
      generatedAt: new Date().toISOString(),
      dimensions: {
        card: { width: CARD_WIDTH, height: CARD_HEIGHT },
        sheet: { width: CARD_WIDTH * SHEET_COLUMNS, height: CARD_HEIGHT * SHEET_ROWS },
      },
      cards,
      backs,
      sheets: { cards: cardSheets, backs: backSheets },
      fallbackBack: resolveStandardBackFile(componentContract, FALLBACK_BACK_FACTION) || FALLBACK_BACK_FILE,
    };

    await writeFile(join(outputRoot, 'card-assets-manifest.json'), jsonText(manifest));
    await writeCatalog(catalog, outputRoot);
    return manifest;
  } finally {
    await browser.close();
    await server.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const strictArtwork = process.argv.includes('--strict-art');
  const manifest = await generateTtsCardAssets({ strictArtwork });
  console.log(`Generated ${manifest.cards.length} cards, ${manifest.backs.length} backs, ${manifest.sheets.cards.length} card sheet(s), and ${manifest.sheets.backs.length} back sheet(s) for ${manifest.gameVersion}.`);
}
