import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VERSION = 'v0.6.3';
const CANDIDATE_SOURCE = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';
const PUBLISHED_METADATA_SOURCE = 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const OUTPUT_ROOT = join(ROOT, 'artifacts', VERSION, 'production-render');
const CARD_WIDTH = 400;
const CARD_HEIGHT = 560;
const CSS_CARD_WIDTH = 240;
const CSS_CARD_HEIGHT = 336;
const CSS_PIXELS_PER_INCH = 96;
const ART_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const FACTIONS = ['neutral', 'military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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

async function buildCatalog() {
  const candidate = JSON.parse(await readFile(join(ROOT, CANDIDATE_SOURCE), 'utf8'));
  const published = JSON.parse(await readFile(join(ROOT, PUBLISHED_METADATA_SOURCE), 'utf8'));
  const metadataById = new Map((published.cards ?? []).map((card) => [card.id, card]));
  const artworkIndex = await buildArtworkIndex();

  const playableCards = (candidate.cards ?? []).map((card) => {
    const metadata = metadataById.get(card.id) ?? {};
    const faction = slugify(card.allegiance ?? metadata.allegiance);
    if (!FACTIONS.includes(faction)) throw new Error(`Unknown allegiance for ${card.id}: ${card.allegiance}.`);
    const preview = {
      id: card.id,
      kind: 'playable',
      name: card.name,
      faction,
      factionLabel: card.allegiance ?? metadata.allegiance,
      cost: Number(card.cost ?? metadata.cost),
      complexity: metadata.complexity ?? 'Unspecified',
      trait: card.trait ?? metadata.trait ?? '',
      form: card.card_form ?? metadata.card_form ?? '',
      unique: Boolean(card.unique ?? metadata.unique),
      sections: sectionsFromEffects(card.effects),
      source: card.source ?? CANDIDATE_SOURCE,
    };
    return { ...preview, artwork: chooseArtwork(preview, artworkIndex) };
  });

  if (playableCards.length !== 128) {
    throw new Error(`Expected 128 v0.6.3 candidate cards; found ${playableCards.length}.`);
  }
  if (new Set(playableCards.map((card) => card.id)).size !== playableCards.length) {
    throw new Error('Duplicate candidate card IDs detected.');
  }

  return {
    schemaVersion: 1,
    gameVersion: VERSION,
    sourceHierarchy: [CANDIDATE_SOURCE, `${PUBLISHED_METADATA_SOURCE} (metadata/artwork only)`],
    playableCards,
    missingArtwork: playableCards.filter((card) => !card.artwork).map((card) => card.id),
  };
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function previewHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="/card-design/">
  <link rel="preconnect" href="https://use.typekit.net">
  <link rel="preconnect" href="https://p.typekit.net" crossorigin>
  <link rel="stylesheet" href="https://use.typekit.net/vgm6nwi.css">
  <link rel="stylesheet" href="/design-tokens.css">
  <link rel="stylesheet" href="/card-design/card-design.css">
  <link rel="stylesheet" href="/card-design/card-design-refinement.css">
  <link rel="stylesheet" href="/card-design/faction-specimens.css">
  <link rel="stylesheet" href="/card-design/playable-card-renderer.css">
</head>
<body class="faction-specimen-page">
  <main id="renderTarget" aria-live="polite"></main>
  <script src="/artifacts/v0.6.3/production-render/catalog.js"></script>
  <script src="/card-design/artwork-crop.js"></script>
  <script src="/artifacts/v0.6.3/production-render/renderer-production.js"></script>
  <script src="/card-design/card-design.js"></script>
</body>
</html>\n`;
}

async function writePreviewSurface(catalog) {
  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(join(OUTPUT_ROOT, 'cards'), { recursive: true });
  await writeFile(join(OUTPUT_ROOT, 'catalog.json'), jsonText(catalog));
  await writeFile(
    join(OUTPUT_ROOT, 'catalog.js'),
    `window.GAUNTLET_TTS_CATALOG = ${JSON.stringify(catalog)};\n`,
  );
  await writeFile(join(OUTPUT_ROOT, 'renderer.html'), previewHtml());

  const productionRendererPath = join(ROOT, 'card-design', 'playable-card-renderer.js');
  const rendererSource = await readFile(productionRendererPath, 'utf8');
  await writeFile(join(OUTPUT_ROOT, 'renderer-production.js'), rendererSource);
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

function pxToInches(value) {
  return Number((Number(value || 0) / CSS_PIXELS_PER_INCH).toFixed(3));
}

function pxToPoints(value) {
  return Number((Number(value || 0) * 72 / CSS_PIXELS_PER_INCH).toFixed(2));
}

async function measureCard(page, card) {
  await page.setViewportSize({ width: 520, height: 700 });
  await page.goto(
    `${page.__baseUrl}/artifacts/v0.6.3/production-render/renderer.html?card=${encodeURIComponent(card.id)}&fit=production`,
    { waitUntil: 'load' },
  );
  await page.waitForSelector('.gauntlet-card');
  await page.waitForFunction(() => document.body.dataset.renderReady === 'true');

  const measurement = await page.evaluate(() => {
    const element = document.querySelector('.gauntlet-card');
    const interior = element?.querySelector('.card-interior');
    const art = element?.querySelector('.card-art');
    const rules = element?.querySelector('.card-rules');
    const footer = element?.querySelector('.card-footer');
    const firstParagraph = element?.querySelector('.rule-section p');
    const title = element?.querySelector('.card-title');
    const interiorRect = interior?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const artRect = art?.getBoundingClientRect();
    const cardRect = element?.getBoundingClientRect();
    const rulesScale = Number.parseFloat(element?.style.getPropertyValue('--rules-scale')) || 1;
    const artHeight = Number.parseFloat(interior?.style.getPropertyValue('--art-height')) || artRect?.height || 0;
    const computedParagraph = firstParagraph ? getComputedStyle(firstParagraph) : null;
    const computedTitle = title ? getComputedStyle(title) : null;

    return {
      width: cardRect?.width ?? 0,
      height: cardRect?.height ?? 0,
      fitWarning: Boolean(element?.classList.contains('fit-warning')),
      productionFit: element?.dataset.productionFit ?? null,
      titleFit: element?.dataset.titleFit ?? null,
      overlayTitleFit: element?.dataset.overlayTitleFit ?? null,
      rulesScale,
      artHeightPx: artHeight,
      actualArtHeightPx: artRect?.height ?? 0,
      ruleFontPx: Number.parseFloat(computedParagraph?.fontSize) || 0,
      titleFontPx: Number.parseFloat(computedTitle?.fontSize) || 0,
      rulesOverflowPx: Math.max(0, (rules?.scrollHeight ?? 0) - (rules?.clientHeight ?? 0)),
      frameOverflowPx: Math.max(0, (interior?.scrollHeight ?? 0) - (interior?.clientHeight ?? 0)),
      footerOverflowPx: interiorRect && footerRect ? Math.max(0, footerRect.bottom - interiorRect.bottom) : 0,
      parchmentLoaded: element?.dataset.parchmentLoaded ?? null,
    };
  });

  if (Math.abs(measurement.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(measurement.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected production card geometry for ${card.id}: ${measurement.width}x${measurement.height}.`);
  }

  await page.locator('.gauntlet-card').screenshot({
    path: join(OUTPUT_ROOT, 'cards', `${card.id}.png`),
    omitBackground: true,
  });

  return {
    id: card.id,
    name: card.name,
    faction: card.factionLabel,
    fit: measurement.fitWarning ? 'WARNING' : 'PASS',
    artHeightPx: Number(measurement.artHeightPx.toFixed(2)),
    artHeightIn: pxToInches(measurement.artHeightPx),
    rulesScale: Number(measurement.rulesScale.toFixed(2)),
    ruleFontPt: pxToPoints(measurement.ruleFontPx),
    titleFontPt: pxToPoints(measurement.titleFontPx),
    titleFit: measurement.titleFit,
    overlayTitleFit: measurement.overlayTitleFit,
    rulesOverflowPx: Number(measurement.rulesOverflowPx.toFixed(2)),
    frameOverflowPx: Number(measurement.frameOverflowPx.toFixed(2)),
    footerOverflowPx: Number(measurement.footerOverflowPx.toFixed(2)),
    parchmentLoaded: measurement.parchmentLoaded,
  };
}

function buildReport(measurements, catalog) {
  const warnings = measurements.filter((entry) => entry.fit === 'WARNING');
  const ranked = [...measurements].sort((a, b) => {
    if (a.fit !== b.fit) return a.fit === 'WARNING' ? -1 : 1;
    return a.artHeightIn - b.artHeightIn || a.rulesScale - b.rulesScale || a.name.localeCompare(b.name);
  });

  const rows = ranked.map((entry) =>
    `| ${entry.name} | ${entry.faction} | ${entry.fit} | ${entry.artHeightIn.toFixed(3)} | ${(entry.rulesScale * 100).toFixed(0)}% | ${entry.ruleFontPt.toFixed(2)} | ${entry.rulesOverflowPx.toFixed(1)} | ${entry.frameOverflowPx.toFixed(1)} | ${entry.footerOverflowPx.toFixed(1)} |`
  );

  return `${[
    '# Gauntlet v0.6.3 Production Card Render Audit',
    '',
    `**Candidate:** \`${CANDIDATE_SOURCE}\`  `,
    `**Renderer:** current production 2.5 × 3.5 inch card geometry; TTS emergency fitting disabled  `,
    `**Cards rendered:** ${measurements.length}  `,
    `**Production fit warnings:** ${warnings.length}  `,
    `**Missing artwork:** ${catalog.missingArtwork.length}`,
    '',
    'The production fitter preserves the largest possible illustration down to its normal 0.62 inch floor, then permits rules typography to contract only to the normal 93% print-legibility floor. A WARNING means the card still overflows after both limits are reached.',
    '',
    '## Production measurements',
    '',
    '| Card | Faction | Fit | Art height (in) | Rules scale | Rules font (pt) | Rules overflow px | Frame overflow px | Footer overflow px |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    '',
  ].join('\n')}\n`;
}

async function main() {
  const catalog = await buildCatalog();
  await writePreviewSurface(catalog);

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 520, height: 700 },
    deviceScaleFactor: CARD_WIDTH / CSS_CARD_WIDTH,
  });
  const page = await context.newPage();
  page.__baseUrl = baseUrl;

  try {
    const measurements = [];
    for (const card of catalog.playableCards) {
      measurements.push(await measureCard(page, card));
    }
    await writeFile(join(OUTPUT_ROOT, 'measurements.json'), jsonText(measurements));
    await writeFile(join(OUTPUT_ROOT, 'Production_Render_Audit.md'), buildReport(measurements, catalog));

    const warnings = measurements.filter((entry) => entry.fit === 'WARNING');
    console.log(`Rendered ${measurements.length} v0.6.3 candidate cards at ${CARD_WIDTH}x${CARD_HEIGHT}px.`);
    console.log(`Production fit warnings: ${warnings.length}.`);
    for (const warning of warnings) {
      console.log(`WARNING ${warning.name}: art ${warning.artHeightIn.toFixed(3)}in, rules ${(warning.rulesScale * 100).toFixed(0)}%, overflow rules/frame/footer ${warning.rulesOverflowPx}/${warning.frameOverflowPx}/${warning.footerOverflowPx}px.`);
    }
  } finally {
    await context.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

await main();

