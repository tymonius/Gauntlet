import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VERSION = 'v0.6.1';
const OUTPUT_ROOT = join(ROOT, 'tts', 'generated', VERSION);
const CARD_WIDTH = 400;
const CARD_HEIGHT = 560;
const SHEET_COLUMNS = 10;
const SHEET_ROWS = 7;
const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1;
const CARDS_PER_SHEET = HIDDEN_SLOT;
const EXPECTED_COUNTS = Object.freeze({
  neutral: 50,
  military: 12,
  diplomats: 12,
  financiers: 12,
  intelligence: 12,
  mystics: 12,
  inquisition: 12,
  territories: 25,
});
const GROUP_ORDER = Object.freeze([
  'neutral',
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);
const SOURCE_CONFIG = Object.freeze({
  neutral: {
    label: 'Neutral',
    path: 'docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md',
    headingLevel: 2,
  },
  military: {
    label: 'Military',
    path: 'releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md',
    start: '# 6. Canonical Military card pool',
    end: '# 7. Card-pool summary',
    headingLevel: 2,
  },
  diplomats: {
    label: 'Diplomats',
    path: 'releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md',
    start: '# 6. Canonical card pool',
    end: '# 7. Card-pool summary',
    headingLevel: 2,
  },
  financiers: {
    label: 'Financiers',
    path: 'releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md',
    start: '# 6. Canonical Financier card pool',
    end: '# 7. Quick reference',
    headingLevel: 2,
  },
  intelligence: {
    label: 'Intelligence',
    path: 'releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md',
    start: '# 6. Canonical Intelligence card pool',
    end: '# 7. Card-pool summary',
    headingLevel: 2,
  },
  mystics: {
    label: 'Mystics',
    path: 'releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md',
    start: '# 8. Canonical Mystics card pool',
    end: '# 9. Quick reference',
    headingLevel: 2,
  },
  inquisition: {
    label: 'Inquisition',
    path: 'releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md',
    start: '# 6. Canonical Inquisition card pool',
    end: '# 7. Quick reference',
    headingLevel: 2,
  },
});
const TERRITORY_SOURCE = 'docs/Gauntlet_v0.6.1_Territory_Pool.md';
const ART_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg']);

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanInlineMarkdown(text) {
  return text
    .replace(/^[-*]\s+/, '• ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

function parseQuotedSections(block) {
  const result = {};
  let current = 'Text';

  for (const rawLine of block.split('\n')) {
    if (!rawLine.trim().startsWith('>')) continue;
    let line = rawLine.trim().replace(/^>\s?/, '').trim();
    if (!line) continue;

    const label = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    if (label) {
      current = label[1].trim();
      line = label[2].trim();
      if (!result[current]) result[current] = [];
      if (line) result[current].push(cleanInlineMarkdown(line));
      continue;
    }

    if (!result[current]) result[current] = [];
    result[current].push(cleanInlineMarkdown(line));
  }

  return Object.fromEntries(
    Object.entries(result).map(([key, lines]) => [key, lines.join('\n')]),
  );
}

function parseCardPool(markdown, faction, source) {
  let section = markdown.replace(/\r/g, '');
  if (source.start) {
    const start = section.indexOf(source.start);
    if (start < 0) throw new Error(`Missing start marker in ${source.path}: ${source.start}`);
    section = section.slice(start + source.start.length);
  }
  if (source.end) {
    const end = section.indexOf(source.end);
    if (end < 0) throw new Error(`Missing end marker in ${source.path}: ${source.end}`);
    section = section.slice(0, end);
  }

  const headingLevel = source.headingLevel || 2;
  const headings = [...section.matchAll(new RegExp(`^#{${headingLevel}}\\s+(.+)$`, 'gm'))];
  const cards = [];

  headings.forEach((match, index) => {
    const name = match[1].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : section.length;
    const block = section.slice(start, end);
    const costMatch = block.match(/\*\*Cost:\*\*\s*(\d+)/i);
    if (!costMatch) return;

    const complexity = block.match(/\*\*Complexity:\*\*\s*([^\n]+)/i)?.[1].trim() || 'Unspecified';
    const trait = block.match(/\*\*Trait:\*\*\s*([^\n]+)/i)?.[1].trim() || '';
    const form = block.match(/\*\*Card form:\*\*\s*([^\n]+)/i)?.[1].trim() || '';
    const unique = /\*\*Unique:\*\*/i.test(block);

    cards.push({
      id: `${faction}-${slugify(name)}`,
      kind: 'playable',
      name,
      faction,
      factionLabel: source.label,
      cost: Number(costMatch[1]),
      complexity,
      trait,
      form,
      unique,
      sections: parseQuotedSections(block),
      source: source.path,
    });
  });

  return cards;
}

function parseTerritoryPool(markdown) {
  const source = markdown.replace(/\r/g, '');
  const headings = [...source.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)];

  return headings.map((match, index) => {
    const name = match[2].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : source.length;
    const block = source.slice(start, end);
    const complexity = block.match(/\*\*Complexity:\*\*\s*([^\n]+)/i)?.[1].trim() || 'Unspecified';
    const watchlist = block.match(/\*\*Watchlist:\*\*\s*([^\n]+)/i)?.[1].trim() || 'None';
    const status = block.match(/\*\*Status:\*\*\s*([^\n]+)/i)?.[1].trim() || 'Approved';
    const text = block
      .split('\n')
      .filter((line) => line.trim().startsWith('>'))
      .map((line) => cleanInlineMarkdown(line.trim().replace(/^>\s?/, '')))
      .filter(Boolean)
      .join('\n');

    return {
      id: `territory-${slugify(name)}`,
      kind: 'territory',
      name,
      arena: name.startsWith('Arena:'),
      complexity,
      watchlist,
      status,
      text,
      source: TERRITORY_SOURCE,
    };
  });
}

async function walkImages(directory, files = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return files;
    throw error;
  }

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) await walkImages(fullPath, files);
    else if (ART_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

async function buildArtworkIndex() {
  const root = join(ROOT, 'images', 'artwork', 'cards');
  const files = await walkImages(root);
  const index = new Map();
  for (const file of files) {
    const key = slugify(file.slice(0, -extname(file).length).split(sep).at(-1));
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(file);
  }
  return index;
}

function chooseArtwork(card, artworkIndex) {
  const matches = artworkIndex.get(slugify(card.name)) || [];
  if (!matches.length) return null;
  const factionFolder = `${sep}${card.faction}${sep}`;
  const preferred = matches.find((path) => path.includes(factionFolder)) || matches[0];
  return relative(ROOT, preferred).split(sep).join('/');
}

function stableCardSort(a, b) {
  const groupDifference = GROUP_ORDER.indexOf(a.faction) - GROUP_ORDER.indexOf(b.faction);
  return groupDifference || a.name.localeCompare(b.name, 'en-US');
}

async function buildCatalog() {
  const pools = [];
  for (const [faction, config] of Object.entries(SOURCE_CONFIG)) {
    const markdown = await readFile(join(ROOT, config.path), 'utf8');
    pools.push(...parseCardPool(markdown, faction, config));
  }
  pools.sort(stableCardSort);

  const territories = parseTerritoryPool(
    await readFile(join(ROOT, TERRITORY_SOURCE), 'utf8'),
  ).sort((a, b) => a.name.localeCompare(b.name, 'en-US'));

  const artworkIndex = await buildArtworkIndex();
  const cards = pools.map((card) => ({
    ...card,
    artwork: chooseArtwork(card, artworkIndex),
  }));

  const counts = Object.fromEntries(
    GROUP_ORDER.map((faction) => [faction, cards.filter((card) => card.faction === faction).length]),
  );
  counts.territories = territories.length;

  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[key] !== expected) {
      throw new Error(`Canonical ${key} count is ${counts[key]}; expected ${expected}.`);
    }
  }

  const ids = [...cards, ...territories].map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate canonical card IDs detected.');

  return {
    schemaVersion: 1,
    gameVersion: VERSION,
    sourceHierarchy: [
      'releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md',
      'releases/v0.6.1/faction-guides/',
      'docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md',
      'docs/Gauntlet_v0.6.1_Territory_Pool.md',
    ],
    counts,
    playableCards: cards,
    territories,
    missingArtwork: cards.filter((card) => !card.artwork).map((card) => card.id),
  };
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeCatalog(catalog) {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  await writeFile(join(OUTPUT_ROOT, 'catalog.json'), jsonText(catalog));
  await writeFile(
    join(OUTPUT_ROOT, 'catalog.js'),
    `window.GAUNTLET_TTS_CATALOG = ${JSON.stringify(catalog)};\n`,
  );
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
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.b64': 'text/plain; charset=utf-8',
  }[extension] || 'application/octet-stream';
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const requestPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const path = resolve(ROOT, requestPath || 'index.html');
      if (!path.startsWith(`${ROOT}${sep}`) && path !== join(ROOT, 'index.html')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const file = (await stat(path)).isDirectory() ? join(path, 'index.html') : path;
      response.writeHead(200, { 'Content-Type': contentType(file) });
      response.end(await readFile(file));
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message);
    }
  });

  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

function prototypeBackHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:transparent}.back{position:relative;width:240px;height:336px;overflow:hidden;border:1px solid #241c15;border-radius:12px;background:#7e2027;color:#f3ead7;font-family:Georgia,serif}.back:before{position:absolute;inset:7px;border:2px solid #d0ae6a;border-radius:8px;content:""}.back:after{position:absolute;inset:17px;border:1px solid rgba(243,234,215,.5);content:""}.mark{position:absolute;inset:0;display:grid;place-items:center;font-size:95px;line-height:1}.title{position:absolute;left:0;right:0;bottom:35px;text-align:center;font-size:20px;letter-spacing:.2em;text-transform:uppercase}.edition{position:absolute;left:0;right:0;bottom:18px;text-align:center;font:700 7px Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase}</style></head><body><div class="back"><div class="mark">G</div><div class="title">Gauntlet</div><div class="edition">v0.6.1 prototype back</div></div></body></html>`;
}

function sheetHtml(baseUrl, sheetCards) {
  const slots = Array.from({ length: SHEET_COLUMNS * SHEET_ROWS }, (_, index) => {
    if (index === HIDDEN_SLOT) return `<img src="${baseUrl}/tts/generated/${VERSION}/card-back.png" alt="hidden-card image">`;
    const card = sheetCards[index];
    return card
      ? `<img src="${baseUrl}/tts/generated/${VERSION}/cards/${card.id}.png" alt="${card.id}">`
      : '<div class="empty"></div>';
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:transparent}.sheet{display:grid;grid-template-columns:repeat(${SHEET_COLUMNS},240px);grid-template-rows:repeat(${SHEET_ROWS},336px);width:${SHEET_COLUMNS * 240}px;height:${SHEET_ROWS * 336}px}.sheet>*{width:240px;height:336px;display:block}.empty{background:transparent}</style></head><body><div class="sheet">${slots}</div></body></html>`;
}

async function renderAssets(catalog) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required for raster output. Run npm install, then npx playwright install chromium.');
  }

  await rm(join(OUTPUT_ROOT, 'cards'), { recursive: true, force: true });
  await rm(join(OUTPUT_ROOT, 'sheets'), { recursive: true, force: true });
  await mkdir(join(OUTPUT_ROOT, 'cards'), { recursive: true });
  await mkdir(join(OUTPUT_ROOT, 'sheets'), { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 520, height: 700 },
    deviceScaleFactor: CARD_WIDTH / (2.5 * 96),
  });
  const page = await context.newPage();

  try {
    let fontsValidated = false;
    for (const card of catalog.playableCards) {
      await page.goto(`${baseUrl}/tts/renderer/?card=${encodeURIComponent(card.id)}`, { waitUntil: 'load' });
      await page.waitForSelector('.gauntlet-card');
      await page.waitForFunction(() => document.body.dataset.renderReady === 'true');
      if (!fontsValidated) {
        const fonts = await page.evaluate(() => ({
          title: document.fonts.check('12px "p22-1722-pro"'),
          rules: document.fonts.check('12px "adobe-caslon-pro"'),
        }));
        if (!fonts.title || !fonts.rules) {
          throw new Error(`Required card fonts failed to load: ${JSON.stringify(fonts)}`);
        }
        fontsValidated = true;
      }
      const cardElement = page.locator('.gauntlet-card');
      await cardElement.screenshot({
        path: join(OUTPUT_ROOT, 'cards', `${card.id}.png`),
        omitBackground: true,
      });
    }

    await page.setContent(prototypeBackHtml(), { waitUntil: 'load' });
    await page.locator('.back').screenshot({
      path: join(OUTPUT_ROOT, 'card-back.png'),
      omitBackground: true,
    });

    const sheets = chunk(catalog.playableCards, CARDS_PER_SHEET);
    const sheetRecords = [];
    for (let index = 0; index < sheets.length; index += 1) {
      const cards = sheets[index];
      const sheetNumber = index + 1;
      const deckId = sheetNumber;
      await page.setContent(sheetHtml(baseUrl, cards), { waitUntil: 'load' });
      await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
      const file = `sheets/gauntlet-${VERSION.replaceAll('.', '')}-sheet-${String(sheetNumber).padStart(2, '0')}.png`;
      await page.locator('.sheet').screenshot({
        path: join(OUTPUT_ROOT, file),
        omitBackground: true,
      });
      sheetRecords.push({
        sheetNumber,
        deckId,
        faceFile: file,
        backFile: 'card-back.png',
        numWidth: SHEET_COLUMNS,
        numHeight: SHEET_ROWS,
        backIsHidden: true,
        uniqueBack: false,
        cards: cards.map((card, cardIndex) => ({
          id: card.id,
          name: card.name,
          index: cardIndex,
          ttsCardId: deckId * 100 + cardIndex,
        })),
      });
    }

    const manifest = {
      schemaVersion: 1,
      gameVersion: VERSION,
      output: {
        cardPixels: { width: CARD_WIDTH, height: CARD_HEIGHT },
        sheetPixels: { width: CARD_WIDTH * SHEET_COLUMNS, height: CARD_HEIGHT * SHEET_ROWS },
        columns: SHEET_COLUMNS,
        rows: SHEET_ROWS,
        cardsPerSheet: CARDS_PER_SHEET,
        hiddenSlotIndex: HIDDEN_SLOT,
      },
      prototypeBack: true,
      sheets: sheetRecords,
      missingArtwork: catalog.missingArtwork,
    };
    await writeFile(join(OUTPUT_ROOT, 'manifest.json'), jsonText(manifest));
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
}

async function main() {
  const options = new Set(process.argv.slice(2));
  const checkOnly = options.has('--check');
  const catalogOnly = options.has('--catalog-only') || checkOnly;
  const strictArt = options.has('--strict-art');

  const catalog = await buildCatalog();
  if (strictArt && catalog.missingArtwork.length) {
    throw new Error(`Missing artwork for ${catalog.missingArtwork.length} cards:\n${catalog.missingArtwork.join('\n')}`);
  }

  if (checkOnly) {
    console.log(`TTS source check passed: ${catalog.playableCards.length} playable cards, ${catalog.territories.length} Territories, ${catalog.missingArtwork.length} cards without artwork.`);
    return;
  }

  await writeCatalog(catalog);
  if (!catalogOnly) await renderAssets(catalog);

  console.log(catalogOnly
    ? `Wrote canonical TTS catalog to ${relative(ROOT, OUTPUT_ROOT)}.`
    : `Rendered ${catalog.playableCards.length} card images and ${Math.ceil(catalog.playableCards.length / CARDS_PER_SHEET)} TTS sheets to ${relative(ROOT, OUTPUT_ROOT)}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { buildCatalog, parseCardPool, parseTerritoryPool, slugify };
