import { createServer } from 'node:http';
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  CURRENT_ALIAS_ROOT,
  resolveCurrentTtsRelease,
  ROOT,
} from './tts-current-catalog.mjs';
import { loadTtsComponentContract } from './tts-component-contract.mjs';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 560;
const CSS_CARD_WIDTH = 240;
const CSS_CARD_HEIGHT = 336;
const FIRST_SUPPLEMENTAL_DECK_ID = 200;
const SUPPORTED_RENDERERS = new Map([
  ['rite-card', 'rite-card'],
]);

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

function cleanInlineMarkdown(value) {
  return String(value || '')
    .replace(/^>\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

function sectionLines(markdown, heading) {
  const lines = String(markdown || '').split(/\r?\n/);
  const marker = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === marker);
  if (start < 0) throw new Error(`Canonical supplemental source is missing heading ${JSON.stringify(marker)}.`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function parseRiteBlocks(markdown, heading) {
  const blocks = [];
  let activeList = null;

  const flushList = () => {
    if (activeList?.items.length) blocks.push(activeList);
    activeList = null;
  };

  for (const sourceLine of sectionLines(markdown, heading)) {
    let line = sourceLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    line = line.replace(/^>\s*/, '').trim();

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      if (!activeList) activeList = { type: 'list', items: [] };
      activeList.items.push(cleanInlineMarkdown(listMatch[1]));
      continue;
    }
    flushList();

    const labeled = line.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
    if (labeled) {
      blocks.push({
        type: 'rule',
        label: cleanInlineMarkdown(labeled[1]),
        text: cleanInlineMarkdown(labeled[2]),
      });
      continue;
    }

    const headingOnly = line.match(/^([A-Z][A-Za-z ]+):$/);
    if (headingOnly) {
      blocks.push({ type: 'rule', label: headingOnly[1], text: '' });
      continue;
    }

    const text = cleanInlineMarkdown(line);
    const previous = blocks.at(-1);
    if (previous?.type === 'paragraph') previous.text = `${previous.text} ${text}`;
    else blocks.push({ type: 'paragraph', text });
  }
  flushList();

  if (!blocks.length) throw new Error(`No printable rules were extracted for ${heading}.`);
  return blocks;
}

function pendingRecord(component) {
  return {
    id: component.id,
    name: component.name,
    faction: component.faction,
    family: component.family,
    quantity: component.quantity,
    productionStatus: component.productionStatus,
    representation: component.tts?.representation || null,
    source: component.source,
  };
}

async function readyRecord(component, sourceCache) {
  const renderer = SUPPORTED_RENDERERS.get(component.family);
  if (!renderer) {
    throw new Error(`Ready supplemental component ${component.id} has no supported exporter for family ${component.family}.`);
  }
  if (!component.cardLike || component.tts?.representation !== 'card') {
    throw new Error(`Ready supplemental component ${component.id} cannot use ${renderer}: expected a card-like TTS card.`);
  }
  if (component.backPolicy !== 'twoSided') {
    throw new Error(`Ready supplemental component ${component.id} must be explicitly two-sided before export; found ${component.backPolicy || 'missing'}.`);
  }
  if (!component.reverseArtwork) {
    throw new Error(`Ready supplemental component ${component.id} is two-sided but has no reverseArtwork.`);
  }
  await access(join(ROOT, component.reverseArtwork));

  let markdown = sourceCache.get(component.source);
  if (!markdown) {
    markdown = await readFile(join(ROOT, component.source), 'utf8');
    sourceCache.set(component.source, markdown);
  }

  return {
    id: component.id,
    name: component.name,
    faction: component.faction,
    family: component.family,
    quantity: component.quantity,
    productionStatus: component.productionStatus,
    backPolicy: component.backPolicy,
    reverse: component.reverse,
    reverseArtwork: component.reverseArtwork,
    representation: component.tts.representation,
    source: component.source,
    renderer,
    front: {
      sourceHeading: component.name,
      blocks: parseRiteBlocks(markdown, component.name),
    },
  };
}

export async function buildSupplementalCatalog(componentContract = null) {
  const contract = componentContract || await loadTtsComponentContract();
  const release = await resolveCurrentTtsRelease();
  const sourceCache = new Map();
  const ready = [];
  const pending = [];

  for (const component of contract.components || []) {
    if (component.productionStatus === 'ready') ready.push(await readyRecord(component, sourceCache));
    else pending.push(pendingRecord(component));
  }

  return {
    release,
    catalog: {
      schemaVersion: 1,
      gameVersion: release.version,
      componentContract: 'config/tts-component-contract.json',
      sourcePolicy: 'ready components export; pending components remain cataloged but produce no TTS objects',
      readyCount: ready.length,
      pendingCount: pending.length,
      ready,
      pending,
    },
  };
}

async function writeSupplementalCatalog(release, catalog) {
  await mkdir(release.outputRoot, { recursive: true });
  await mkdir(CURRENT_ALIAS_ROOT, { recursive: true });
  const text = jsonText(catalog);
  await writeFile(join(release.outputRoot, 'supplemental-catalog.json'), text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'supplemental-catalog.json'), text);
}

function reverseFileFor(record) {
  const extension = extname(record.reverseArtwork);
  const stem = basename(record.reverseArtwork, extension).replace(/[^a-z0-9_-]+/gi, '-');
  return `supplementals/reverses/${stem}.png`;
}

async function captureCard(page, baseUrl, record, side, outputPath) {
  await page.goto(`${baseUrl}/tts/supplemental-renderer/?component=${encodeURIComponent(record.id)}&side=${encodeURIComponent(side)}`, { waitUntil: 'load' });
  await page.waitForSelector('.supplemental-card');
  await page.waitForFunction(() => document.body.dataset.renderReady === 'true' || document.body.dataset.renderError === 'true');
  const error = await page.evaluate(() => document.body.dataset.renderError === 'true');
  if (error) throw new Error(`Supplemental renderer failed for ${record.id} (${side}).`);

  const metrics = await page.locator('.supplemental-card').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  if (Math.abs(metrics.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(metrics.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected supplemental geometry for ${record.id} (${side}): ${metrics.width} × ${metrics.height}.`);
  }

  await page.locator('.supplemental-card').screenshot({ path: outputPath, omitBackground: true });
}

export async function renderSupplementalAssets(release, catalog) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  const outputRoot = release.outputRoot;
  await rm(join(outputRoot, 'supplementals'), { recursive: true, force: true });
  await mkdir(join(outputRoot, 'supplementals', 'fronts'), { recursive: true });
  await mkdir(join(outputRoot, 'supplementals', 'reverses'), { recursive: true });
  await writeSupplementalCatalog(release, catalog);

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 320, height: 420 },
    deviceScaleFactor: CARD_WIDTH / CSS_CARD_WIDTH,
  });
  const page = await context.newPage();

  try {
    const renderedReverses = new Map();
    const records = [];
    for (let index = 0; index < catalog.ready.length; index += 1) {
      const record = catalog.ready[index];
      const deckId = FIRST_SUPPLEMENTAL_DECK_ID + index;
      const frontFile = `supplementals/fronts/${record.id}.png`;
      const reverseFile = reverseFileFor(record);

      await captureCard(page, baseUrl, record, 'front', join(outputRoot, frontFile));
      if (!renderedReverses.has(record.reverseArtwork)) {
        await captureCard(page, baseUrl, record, 'reverse', join(outputRoot, reverseFile));
        renderedReverses.set(record.reverseArtwork, reverseFile);
      }

      records.push({
        ...record,
        frontFile,
        reverseFile: renderedReverses.get(record.reverseArtwork),
        tts: {
          cardId: deckId * 100,
          deckId,
          index: 0,
          faceFile: frontFile,
          backFile: renderedReverses.get(record.reverseArtwork),
          numWidth: 1,
          numHeight: 1,
          backIsHidden: true,
          uniqueBack: false,
        },
      });
    }

    const manifest = {
      schemaVersion: 1,
      gameVersion: release.version,
      componentContract: catalog.componentContract,
      output: {
        cardPixels: { width: CARD_WIDTH, height: CARD_HEIGHT },
        firstDeckId: FIRST_SUPPLEMENTAL_DECK_ID,
      },
      readyCount: records.length,
      pendingCount: catalog.pending.length,
      ready: records,
      pending: catalog.pending,
      placement: {
        includedInReviewSave: false,
        note: 'Ready supplemental assets are exported and hosted here; table/save placement is intentionally deferred to the component-assembly layer.',
      },
    };

    const text = jsonText(manifest);
    await writeFile(join(outputRoot, 'supplemental-manifest.json'), text);
    await writeFile(join(CURRENT_ALIAS_ROOT, 'supplemental-manifest.json'), text);
    return manifest;
  } finally {
    await context.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const componentContract = await loadTtsComponentContract();
  const { release, catalog } = await buildSupplementalCatalog(componentContract);

  if (checkOnly) {
    console.log(`Current TTS supplemental source check passed for ${release.version}: ${catalog.readyCount} ready components exportable, ${catalog.pendingCount} pending components excluded from output.`);
    return;
  }

  const manifest = await renderSupplementalAssets(release, catalog);
  console.log(`Rendered ${manifest.readyCount} ready supplemental components to ${relative(ROOT, release.outputRoot)}; ${manifest.pendingCount} pending components remain catalog-only.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
