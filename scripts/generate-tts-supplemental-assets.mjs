import { createServer } from 'node:http';
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  CURRENT_ALIAS_ROOT,
  resolveCurrentTtsRelease,
  ROOT,
} from './tts-current-catalog.mjs';
import {
  loadTtsComponentContract,
  TTS_COMPONENT_CONTRACT_AUTHORITY,
} from './tts-component-contract.mjs';
import { loadCurrentGameAuthority } from './current-game-authority.mjs';
import {
  buildReadyTrackerRecord,
  captureProductionTracker,
} from './tts-sliding-trackers.mjs';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 560;
const CSS_CARD_WIDTH = 240;
const CSS_CARD_HEIGHT = 336;
const FIRST_SUPPLEMENTAL_DECK_ID = 200;
const SUPPORTED_RENDERERS = new Map([
  ['rite-card', 'rite-card'],
  ['ritual-card', 'ritual-card'],
  ['reference-card', 'reference-card'],
  ['tracker', 'sliding-tracker'],
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
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function headingLines(markdown, heading, depth = 2) {
  const level = Number(depth);
  if (!Number.isInteger(level) || level < 1 || level > 6) {
    throw new Error(`Invalid supplemental source heading depth ${depth} for ${heading}.`);
  }
  const lines = String(markdown || '').split(/\r?\n/);
  const marker = `${'#'.repeat(level)} ${heading}`;
  const start = lines.findIndex((line) => line.trim() === marker);
  if (start < 0) {
    throw new Error(`Canonical supplemental source is missing heading ${JSON.stringify(marker)}.`);
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].trim().match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function parseTableRow(line) {
  const text = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return text.split('|').map((cell) => cleanInlineMarkdown(cell));
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
}

function parseMarkdownBlocks(sourceLines, sourceName) {
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: cleanInlineMarkdown(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list?.items.length) blocks.push(list);
    list = null;
  };
  const flushText = () => {
    flushParagraph();
    flushList();
  };

  for (let index = 0; index < sourceLines.length; index += 1) {
    let line = sourceLines[index].trim();

    if (!line) {
      flushText();
      continue;
    }
    if (/^---+$/.test(line)) {
      flushText();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushText();
      blocks.push({
        type: 'subheading',
        level: heading[1].length,
        text: cleanInlineMarkdown(heading[2]),
      });
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      flushText();
      const rows = [];
      while (index < sourceLines.length && /^\s*\|.*\|\s*$/.test(sourceLines[index])) {
        rows.push(parseTableRow(sourceLines[index]));
        index += 1;
      }
      index -= 1;

      const headers = rows.shift() || [];
      if (rows.length && isSeparatorRow(rows[0])) rows.shift();
      if (!headers.length || !rows.length) {
        throw new Error(`Malformed Markdown table while extracting ${sourceName}.`);
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    line = line.replace(/^>\s*/, '').trim();

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const orderedList = Boolean(ordered);
      if (!list || list.ordered !== orderedList) {
        flushList();
        list = { type: 'list', ordered: orderedList, items: [] };
      }
      list.items.push(cleanInlineMarkdown((ordered || unordered)[1]));
      continue;
    }
    flushList();

    const labeled = line.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
    if (labeled) {
      flushParagraph();
      blocks.push({
        type: 'rule',
        label: cleanInlineMarkdown(labeled[1]),
        text: cleanInlineMarkdown(labeled[2]),
      });
      continue;
    }

    paragraph.push(line);
  }
  flushText();

  if (!blocks.length) throw new Error(`No printable rules were extracted for ${sourceName}.`);
  return blocks;
}

function parseRiteBlocks(markdown, heading) {
  return parseMarkdownBlocks(headingLines(markdown, heading, 2), heading);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseReferenceSection(markdown, selector, componentName) {
  const heading = String(selector?.heading || '').trim();
  const depth = Number(selector?.depth);
  if (!heading || !Number.isInteger(depth)) {
    throw new Error(`${componentName} reference selector must declare heading and depth.`);
  }

  let lines = headingLines(markdown, heading, depth);
  if (selector.ruleLabel) {
    const label = String(selector.ruleLabel).trim();
    const matcher = new RegExp(`^>?\\s*\\*\\*${escapeRegExp(label)}:\\*\\*`, 'i');
    const start = lines.findIndex((line) => matcher.test(line.trim()));
    if (start < 0) {
      throw new Error(`${componentName} reference selector ${heading} is missing rule label ${label}.`);
    }
    lines = lines.slice(start);
  }

  return {
    heading: String(selector.title || heading),
    sourceHeading: heading,
    blocks: parseMarkdownBlocks(lines, `${componentName} — ${heading}`),
  };
}

function parseReferenceFace(markdown, face, componentName, side) {
  if (!face || !String(face.title || '').trim() || !Array.isArray(face.sections) || !face.sections.length) {
    throw new Error(`${componentName} reference ${side} face must declare a title and source sections.`);
  }
  return {
    title: String(face.title).trim(),
    sections: face.sections.map((selector) => parseReferenceSection(markdown, selector, componentName)),
  };
}

function parseBespokeReferenceFace(markdown, face, componentName, side) {
  const title = String(face?.title || '').trim();
  if (!title) throw new Error(`${componentName} bespoke reference ${side} face must declare a title.`);

  const sideLabel = side === 'reverse' ? 'Reverse' : 'Front';
  const faceHeading = `${sideLabel} — ${title}`;
  const lines = headingLines(markdown, faceHeading, 2);
  const sections = [];
  let current = null;

  const flushSection = () => {
    if (!current) return;
    sections.push({
      heading: current.heading,
      sourceHeading: current.heading,
      blocks: parseMarkdownBlocks(current.lines, `${componentName} — ${current.heading}`),
    });
    current = null;
  };

  for (const line of lines) {
    const heading = line.trim().match(/^###\s+(.+)$/);
    if (heading) {
      flushSection();
      current = { heading: cleanInlineMarkdown(heading[1]), lines: [] };
      continue;
    }
    if (!current) {
      if (line.trim()) throw new Error(`${componentName} bespoke ${side} face has copy before its first section.`);
      continue;
    }
    current.lines.push(line);
  }
  flushSection();

  if (!sections.length) throw new Error(`${componentName} bespoke ${side} face has no printable sections.`);
  return { title, sections };
}

function normalizedSupplementalComponent(component, shared = false) {
  return {
    ...component,
    faction: component.faction || 'neutral',
    quantity: Number(component.quantity ?? component.quantityPerPlayer),
    deckInclusion: component.deckInclusion || (shared ? 'every-deck' : ''),
  };
}

function pendingRecord(component) {
  return {
    id: component.id,
    name: component.name,
    faction: component.faction,
    family: component.family,
    quantity: component.quantity,
    deckInclusion: component.deckInclusion || '',
    productionStatus: component.productionStatus,
    representation: component.tts?.representation || null,
    source: component.source,
  };
}

function readyCardBase(component, renderer) {
  if (!component.cardLike || component.tts?.representation !== 'card') {
    throw new Error(`Ready supplemental component ${component.id} cannot use ${renderer}: expected a card-like TTS card.`);
  }
  if (!['twoSided', 'specialBack'].includes(component.backPolicy)) {
    throw new Error(`Ready supplemental component ${component.id} must declare an intrinsic reverse before card export; found ${component.backPolicy || 'missing'}.`);
  }

  return {
    id: component.id,
    name: component.name,
    faction: component.faction,
    family: component.family,
    quantity: component.quantity,
    deckInclusion: component.deckInclusion || '',
    productionStatus: component.productionStatus,
    backPolicy: component.backPolicy,
    reverse: component.reverse,
    representation: component.tts.representation,
    source: component.source,
    renderer,
  };
}

function currentRiteBlocks(rite) {
  const lines = [
    `**Begin:** ${rite.begin}`,
    '',
    `**Complete:** ${rite.complete}`,
  ];
  if (rite.reminder?.text) lines.push('', `*${rite.reminder.text}*`);
  lines.push('', `**Interrupted:** ${rite.interrupted}`);
  return parseMarkdownBlocks(lines, rite.name);
}

async function readyRiteRecord(component, renderer, currentGame) {
  if (!component.reverseArtwork) {
    throw new Error(`Ready supplemental component ${component.id} is two-sided but has no reverseArtwork.`);
  }
  await access(join(ROOT, component.reverseArtwork));
  const riteId = String(component.id || '').replace(/^mystics-rite-/, '');
  const rite = (currentGame.mystics?.rites || []).find(item => item.id === riteId);
  if (!rite) throw new Error(`Current-game authority has no Rite matching ${component.id}.`);
  if (rite.name !== component.name) {
    throw new Error(`Rite component ${component.id} does not match current-game name ${rite.name}.`);
  }
  return {
    ...readyCardBase(component, renderer),
    reverseArtwork: component.reverseArtwork,
    front: {
      sourceHeading: rite.name,
      blocks: currentRiteBlocks(rite),
    },
  };
}

async function readyRitualRecord(component, renderer, currentGame) {
  const ritual = currentGame.mystics?.ritual;
  if (!ritual?.id || component.id !== `mystics-ritual-of-${ritual.id}`) {
    throw new Error(`Current-game authority has no Ritual matching ${component.id}.`);
  }
  if (ritual.name !== component.name) {
    throw new Error(`Ritual component ${component.id} does not match current-game name ${ritual.name}.`);
  }
  if (!component.specialBackFile) {
    throw new Error(`Ready Ritual component ${component.id} has no specialBackFile.`);
  }
  await access(join(ROOT, component.specialBackFile));
  return {
    ...readyCardBase(component, renderer),
    specialBackFile: component.specialBackFile,
  };
}

async function readyReferenceRecord(component, renderer, markdown) {
  const faces = component.referenceFaces;
  if (!faces?.front || !faces?.reverse) {
    throw new Error(`Ready reference card ${component.id} must declare referenceFaces.front and referenceFaces.reverse.`);
  }
  const parseFace = component.copyMode === 'bespoke' ? parseBespokeReferenceFace : parseReferenceFace;
  return {
    ...readyCardBase(component, renderer),
    faces: {
      front: parseFace(markdown, faces.front, component.name, 'front'),
      reverse: parseFace(markdown, faces.reverse, component.name, 'reverse'),
    },
  };
}

async function readyRecord(component, sourceCache, currentGame) {
  const renderer = SUPPORTED_RENDERERS.get(component.family);
  if (!renderer) {
    throw new Error(`Ready supplemental component ${component.id} has no supported exporter for family ${component.family}.`);
  }

  if (component.family === 'tracker') return buildReadyTrackerRecord(component, renderer);
  if (component.family === 'rite-card') return readyRiteRecord(component, renderer, currentGame);
  if (component.family === 'ritual-card') return readyRitualRecord(component, renderer, currentGame);

  let markdown = sourceCache.get(component.source);
  if (!markdown) {
    markdown = await readFile(join(ROOT, component.source), 'utf8');
    sourceCache.set(component.source, markdown);
  }

  if (component.family === 'reference-card') return readyReferenceRecord(component, renderer, markdown);
  throw new Error(`Ready supplemental component ${component.id} reached unsupported exporter ${renderer}.`);
}

export async function buildSupplementalCatalog(componentContract = null) {
  const contract = componentContract || await loadTtsComponentContract();
  const [release, currentGame] = await Promise.all([
    resolveCurrentTtsRelease(),
    loadCurrentGameAuthority(),
  ]);
  const sourceCache = new Map();
  const ready = [];
  const pending = [];
  const sharedSupplementals = (contract.sharedComponents || [])
    .filter((component) => SUPPORTED_RENDERERS.has(component.family))
    .map((component) => normalizedSupplementalComponent(component, true));
  const factionSupplementals = (contract.components || []).map((component) => normalizedSupplementalComponent(component));

  for (const component of [...sharedSupplementals, ...factionSupplementals]) {
    if (component.productionStatus === 'ready') ready.push(await readyRecord(component, sourceCache, currentGame));
    else pending.push(pendingRecord(component));
  }

  return {
    release,
    catalog: {
      schemaVersion: 3,
      gameVersion: release.version,
      componentContract: TTS_COMPONENT_CONTRACT_AUTHORITY,
      sourcePolicy: 'card faces are captured only from card-design production render authority; pending components remain cataloged but produce no TTS objects',
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

function artworkReverseFileFor(record) {
  const extension = extname(record.reverseArtwork);
  const stem = basename(record.reverseArtwork, extension).replace(/[^a-z0-9_-]+/gi, '-');
  return `supplementals/reverses/${stem}.png`;
}

function generatedReverseFileFor(record) {
  return `supplementals/reverses/${record.id}.png`;
}

function productionComponentRequest(record) {
  if (record.renderer === 'reference-card') {
    return { kind: 'reference', id: record.id };
  }
  if (record.renderer === 'rite-card') {
    return { kind: 'rite', id: String(record.id).replace(/^mystics-rite-/, '') };
  }
  if (record.renderer === 'ritual-card') {
    return { kind: 'ritual', id: String(record.id).replace(/^mystics-ritual-of-/, '') };
  }
  throw new Error(`No card-design production component request for ${record.id} (${record.renderer}).`);
}

async function captureCard(page, baseUrl, record, side, outputPath, displayVersion) {
  const request = productionComponentRequest(record);
  const url = new URL('/card-design/component-render.html', baseUrl);
  url.searchParams.set('kind', request.kind);
  url.searchParams.set('id', request.id);
  url.searchParams.set('side', side);
  url.searchParams.set('orientation', 'portrait');
  if (displayVersion) url.searchParams.set('version', displayVersion);

  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForSelector('#renderTarget > .gauntlet-card');
  await page.waitForFunction(() => document.body.dataset.renderReady === 'true' || document.body.dataset.renderError === 'true');
  const renderState = await page.evaluate(() => ({
    error: document.body.dataset.renderError === 'true',
    message: document.body.dataset.renderErrorMessage || '',
  }));
  if (renderState.error) {
    throw new Error(`Card-design production renderer failed for ${record.id} (${side}): ${renderState.message || 'browser renderer reported an unspecified error'}`);
  }

  const card = page.locator('#renderTarget > .gauntlet-card');
  const metrics = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      overflowWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      overflowHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  });
  if (Math.abs(metrics.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(metrics.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected production supplemental geometry for ${record.id} (${side}): ${metrics.width} × ${metrics.height}.`);
  }
  if (metrics.overflowWidth > metrics.clientWidth + 1 || metrics.overflowHeight > metrics.clientHeight + 1) {
    throw new Error(`Production supplemental content overflows ${record.id} (${side}).`);
  }

  await card.screenshot({ path: outputPath, omitBackground: true });
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
  await mkdir(join(outputRoot, 'supplementals', 'trackers'), { recursive: true });
  await writeSupplementalCatalog(release, catalog);

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 320, height: 420 },
    deviceScaleFactor: CARD_WIDTH / CSS_CARD_WIDTH,
  });
  const page = await context.newPage();

  try {
    const records = [];
    let nextDeckId = FIRST_SUPPLEMENTAL_DECK_ID;

    for (const record of catalog.ready) {
      if (record.renderer === 'sliding-tracker') {
        const frontFile = `supplementals/trackers/${record.id}.png`;
        const geometry = await captureProductionTracker(page, baseUrl, record, join(outputRoot, frontFile), release.displayVersion || release.version);
        records.push({
          ...record,
          frontFile,
          physicalScale: geometry.physicalScale,
          snapPoints: geometry.snapPoints,
          tts: {
            faceFile: frontFile,
            widthScale: geometry.physicalScale.cardWidth,
            heightScale: geometry.physicalScale.cardHeight,
            thickness: 0.05,
            stackable: false,
            assembly: record.tracker.assembly,
            axis: record.tracker.axis,
            layer: record.tracker.layer,
            snapTag: record.tracker.snapTag,
            snapPoints: geometry.snapPoints,
          },
        });
        continue;
      }

      const deckId = nextDeckId;
      nextDeckId += 1;
      const frontFile = `supplementals/fronts/${record.id}.png`;
      let reverseFile;

      await captureCard(page, baseUrl, record, 'front', join(outputRoot, frontFile), release.displayVersion || release.version);

      reverseFile = generatedReverseFileFor(record);
      await captureCard(page, baseUrl, record, 'reverse', join(outputRoot, reverseFile), release.displayVersion || release.version);

      records.push({
        ...record,
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
        },
      });
    }

    const manifest = {
      schemaVersion: 3,
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
        assembly: 'starter-faction',
        note: 'Ready shared and faction card and sliding-tracker supplementals are hosted here and assembled into the appropriate starter Bags by the generic supplemental save-assembly layer.',
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

function githubErrorAnnotation(message) {
  const escaped = String(message || '')
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
  return `::error title=TTS supplemental export::${escaped}`;
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
    const message = error.stack || error.message || String(error);
    console.error(message);
    if (process.env.GITHUB_ACTIONS === 'true') console.error(githubErrorAnnotation(message));
    process.exitCode = 1;
  });
}
