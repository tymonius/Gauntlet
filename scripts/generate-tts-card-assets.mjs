import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VERSION = 'v0.6.2';
const CANONICAL_DATA_SOURCE = 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const OUTPUT_ROOT = join(ROOT, 'tts', 'generated', VERSION);
const CARD_WIDTH = 400;
const CARD_HEIGHT = 560;
const CSS_CARD_WIDTH = 240;
const CSS_CARD_HEIGHT = 336;
const SHEET_COLUMNS = 10;
const SHEET_ROWS = 7;
const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1;
const CARDS_PER_SHEET = HIDDEN_SLOT;
const EXPECTED_COUNTS = Object.freeze({
  neutral: 50,
  military: 13,
  diplomats: 13,
  financiers: 13,
  intelligence: 13,
  mystics: 13,
  inquisition: 13,
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
const ART_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg']);

function slugify(value) {
  return String(value ?? '')
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

function canonicalCardSection(markdown, source) {
  const normalized = markdown.replace(/\r/g, '');
  if (!source?.factionGuide) return normalized;

  const marker = normalized.match(/^#\s+\d+\.\s+Canonical[^\n]*card pool\s*$/mi);
  if (!marker || marker.index === undefined) {
    throw new Error(`Canonical card-pool heading not found in ${source.path}.`);
  }

  let section = normalized.slice(marker.index + marker[0].length);
  const nextTopLevelHeading = section.search(/^#\s+/m);
  if (nextTopLevelHeading >= 0) section = section.slice(0, nextTopLevelHeading);
  return section;
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

// Retained for compatibility with parser unit tests and historical tooling.
// The production catalog below reads the published canonical JSON instead.
function parseCardPool(markdown, faction, source) {
  const section = canonicalCardSection(markdown, source);
  const headings = [...section.matchAll(/^##\s+(.+)$/gm)];
  const cards = [];

  headings.forEach((match, index) => {
    const name = match[1].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : section.length;
    const block = section.slice(start, end);
    const costMatch = block.match(/\*\*Cost:\*\*\s*(\d+)/i);
    if (!costMatch) return;

    cards.push({
      id: `${faction}-${slugify(name)}`,
      kind: 'playable',
      name,
      faction,
      factionLabel: source.label,
      cost: Number(costMatch[1]),
      complexity: block.match(/\*\*Complexity:\*\*\s*([^\n]+)/i)?.[1].trim() || 'Unspecified',
      trait: block.match(/\*\*Trait:\*\*\s*([^\n]+)/i)?.[1].trim() || '',
      form: block.match(/\*\*Card form:\*\*\s*([^\n]+)/i)?.[1].trim() || '',
      unique: /\*\*Unique:\*\*/i.test(block),
      sections: parseQuotedSections(block),
      source: source.path,
    });
  });

  return cards;
}

function parseTerritoryPool(markdown, sourcePath = 'legacy-territory-pool') {
  const source = markdown.replace(/\r/g, '');
  const headings = [...source.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)];

  return headings.map((match, index) => {
    const name = match[2].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : source.length;
    const block = source.slice(start, end);
    return {
      id: `territory-${slugify(name)}`,
      kind: 'territory',
      name,
      arena: name.startsWith('Arena:'),
      complexity: block.match(/\*\*Complexity:\*\*\s*([^\n]+)/i)?.[1].trim() || 'Unspecified',
      watchlist: block.match(/\*\*Watchlist:\*\*\s*([^\n]+)/i)?.[1].trim() || 'None',
      status: block.match(/\*\*Status:\*\*\s*([^\n]+)/i)?.[1].trim() || 'Approved',
      text: block
        .split('\n')
        .filter((line) => line.trim().startsWith('>'))
        .map((line) => cleanInlineMarkdown(line.trim().replace(/^>\s?/, '')))
        .filter(Boolean)
        .join('\n'),
      source: sourcePath,
    };
  });
}

function sectionsFromEffects(effects) {
  const sections = {};
  for (const effect of effects || []) {
    const label = String(effect?.label || '').trim();
    const text = String(effect?.text || '').trim();
    if (!label || !text) continue;
    sections[label] = sections[label] ? `${sections[label]}\n${text}` : text;
  }
  return sections;
}

function playableCardFromCanonical(card) {
  const faction = slugify(card.allegiance);
  if (!GROUP_ORDER.includes(faction)) {
    throw new Error(`Unknown canonical allegiance for ${card.id}: ${card.allegiance}.`);
  }
  return {
    id: card.id,
    kind: 'playable',
    name: card.name,
    faction,
    factionLabel: card.allegiance,
    cost: Number(card.cost),
    complexity: 'Unspecified',
    trait: card.trait || '',
    form: card.card_form || '',
    unique: Boolean(card.unique),
    sections: sectionsFromEffects(card.effects),
    source: card.source || CANONICAL_DATA_SOURCE,
  };
}

function territoryFromCanonical(territory) {
  return {
    id: territory.id,
    kind: 'territory',
    name: territory.name,
    arena: Boolean(territory.arena),
    complexity: territory.complexity || 'Unspecified',
    watchlist: territory.watchlist || 'None',
    status: territory.status || 'Approved',
    text: String(territory.text || '').trim(),
    source: territory.source || CANONICAL_DATA_SOURCE,
  };
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

function artworkKeys(file) {
  const base = slugify(file.slice(0, -extname(file).length).split(sep).at(-1));
  const keys = new Set([base]);
  keys.add(base.replace(/-(?:alt|alternate|v\d+|\d+)$/, ''));
  return [...keys].filter(Boolean);
}

async function buildArtworkIndex() {
  const files = await walkImages(join(ROOT, 'images', 'artwork', 'cards'));
  const index = new Map();
  for (const file of files) {
    for (const key of artworkKeys(file)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(file);
    }
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
  const canonical = JSON.parse(await readFile(join(ROOT, CANONICAL_DATA_SOURCE), 'utf8'));
  if (canonical.version !== VERSION) {
    throw new Error(`Canonical data version is ${canonical.version}; expected ${VERSION}.`);
  }
  if (!Array.isArray(canonical.cards) || !Array.isArray(canonical.territories)) {
    throw new Error(`Canonical data is missing cards or territories: ${CANONICAL_DATA_SOURCE}.`);
  }

  const playableCards = canonical.cards.map(playableCardFromCanonical).sort(stableCardSort);
  const territories = canonical.territories
    .map(territoryFromCanonical)
    .sort((a, b) => a.name.localeCompare(b.name, 'en-US'));

  const artworkIndex = await buildArtworkIndex();
  const cardsWithArtwork = playableCards.map((card) => ({
    ...card,
    artwork: chooseArtwork(card, artworkIndex),
  }));
  const counts = Object.fromEntries(
    GROUP_ORDER.map((faction) => [
      faction,
      cardsWithArtwork.filter((card) => card.faction === faction).length,
    ]),
  );
  counts.territories = territories.length;

  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[key] !== expected) {
      throw new Error(`Canonical ${key} count is ${counts[key]}; expected ${expected}.`);
    }
  }

  const ids = [...cardsWithArtwork, ...territories].map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate canonical card IDs detected.');

  return {
    schemaVersion: 1,
    gameVersion: VERSION,
    sourceHierarchy: [CANONICAL_DATA_SOURCE],
    counts,
    playableCards: cardsWithArtwork,
    territories,
    missingArtwork: cardsWithArtwork.filter((card) => !card.artwork).map((card) => card.id),
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

function prototypeBackHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:transparent}.back{position:relative;width:${CSS_CARD_WIDTH}px;height:${CSS_CARD_HEIGHT}px;overflow:hidden;border:1px solid #241c15;border-radius:12px;background:#7e2027;color:#f3ead7;font-family:Georgia,serif}.back:before{position:absolute;inset:7px;border:2px solid #d0ae6a;border-radius:8px;content:""}.back:after{position:absolute;inset:17px;border:1px solid rgba(243,234,215,.5);content:""}.mark{position:absolute;inset:0;display:grid;place-items:center;font-size:95px;line-height:1}.title{position:absolute;left:0;right:0;bottom:35px;text-align:center;font-size:20px;letter-spacing:.2em;text-transform:uppercase}.edition{position:absolute;left:0;right:0;bottom:18px;text-align:center;font:700 7px Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase}</style></head><body><div class="back"><div class="mark">G</div><div class="title">Gauntlet</div><div class="edition">v0.6.2 prototype back</div></div></body></html>`;
}

function sheetHtml(baseUrl, sheetCards) {
  const slots = Array.from({ length: SHEET_COLUMNS * SHEET_ROWS }, (_, index) => {
    if (index === HIDDEN_SLOT) {
      return `<img src="${baseUrl}/tts/generated/${VERSION}/card-back.png" alt="hidden-card image">`;
    }
    const card = sheetCards[index];
    return card
      ? `<img src="${baseUrl}/tts/generated/${VERSION}/cards/${card.id}.png" alt="${card.id}">`
      : '<div class="empty"></div>';
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:transparent}.sheet{display:grid;grid-template-columns:repeat(${SHEET_COLUMNS},${CSS_CARD_WIDTH}px);grid-template-rows:repeat(${SHEET_ROWS},${CSS_CARD_HEIGHT}px);width:${SHEET_COLUMNS * CSS_CARD_WIDTH}px;height:${SHEET_ROWS * CSS_CARD_HEIGHT}px}.sheet>*{display:block;width:${CSS_CARD_WIDTH}px;height:${CSS_CARD_HEIGHT}px}.empty{background:transparent}</style></head><body><div class="sheet">${slots}</div></body></html>`;
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

async function renderAssets(catalog) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  await rm(join(OUTPUT_ROOT, 'cards'), { recursive: true, force: true });
  await rm(join(OUTPUT_ROOT, 'sheets'), { recursive: true, force: true });
  await mkdir(join(OUTPUT_ROOT, 'cards'), { recursive: true });
  await mkdir(join(OUTPUT_ROOT, 'sheets'), { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 520, height: 700 },
    deviceScaleFactor: CARD_WIDTH / CSS_CARD_WIDTH,
  });
  const page = await context.newPage();

  try {
    let fontsValidated = false;
    for (const card of catalog.playableCards) {
      await page.setViewportSize({ width: 520, height: 700 });
      await page.goto(`${baseUrl}/tts/renderer/?card=${encodeURIComponent(card.id)}`, { waitUntil: 'load' });
      await page.waitForSelector('.gauntlet-card');
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
          throw new Error(`Required card fonts failed to load: ${JSON.stringify(fonts)}`);
        }
        fontsValidated = true;
      }

      await validateRenderedCard(page, card);
      await page.locator('.gauntlet-card').screenshot({
        path: join(OUTPUT_ROOT, 'cards', `${card.id}.png`),
        omitBackground: true,
      });
    }

    await page.setViewportSize({ width: 520, height: 700 });
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
      await page.setViewportSize({
        width: SHEET_COLUMNS * CSS_CARD_WIDTH,
        height: SHEET_ROWS * CSS_CARD_HEIGHT,
      });
      await page.setContent(sheetHtml(baseUrl, cards), { waitUntil: 'load' });
      await page.waitForFunction(() => Array.from(document.images).every(
        (image) => image.complete && image.naturalWidth > 0,
      ));
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

    await writeFile(join(OUTPUT_ROOT, 'manifest.json'), jsonText({
      schemaVersion: 1,
      gameVersion: VERSION,
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
      prototypeBack: true,
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export {
  buildCatalog,
  parseCardPool,
  parseTerritoryPool,
  playableCardFromCanonical,
  slugify,
  territoryFromCanonical,
};
