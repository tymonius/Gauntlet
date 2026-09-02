import { createServer } from 'node:http';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  CURRENT_ALIAS_ROOT,
  resolveCurrentTtsRelease,
  ROOT,
} from './tts-current-catalog.mjs';
import { loadCurrentGameAuthority } from './current-game-authority.mjs';
import {
  loadTtsComponentContract,
  resolveFactionBackFile,
} from './tts-component-contract.mjs';
import { LANDSCAPE_TTS_CELL_ROTATION_DEGREES } from './tts-supplemental-geometry.mjs';

const PORTRAIT_CSS = Object.freeze({ width: 240, height: 336 });
const LANDSCAPE_CSS = Object.freeze({ width: 336, height: 240 });
const DEVICE_SCALE = 400 / PORTRAIT_CSS.width;
const SUPPORTED_FAMILIES = new Set(['proposal-treaty-card', 'ledger', 'deed-card']);

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
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function proposalIdForComponent(component) {
  return String(component.id || '').replace(/^diplomats-proposal-/, '');
}

export async function buildFinalizedExportPlan(componentContract = null) {
  const contract = componentContract || await loadTtsComponentContract();
  const release = await resolveCurrentTtsRelease();
  const authority = await loadCurrentGameAuthority();
  const proposals = new Map((authority.proposals || []).map(proposal => [proposal.id, proposal]));
  const components = [];

  for (const component of contract.components || []) {
    if ((component.designStatus || 'final') !== 'final' || component.productionStatus !== 'export-pending') continue;
    if (!SUPPORTED_FAMILIES.has(component.family)) continue;

    if (!component.cardLike || component.tts?.representation !== 'card' && component.family !== 'ledger') {
      throw new Error(`Finalized supplemental ${component.id} must resolve to a card-like TTS object.`);
    }

    if (component.family === 'proposal-treaty-card') {
      if (component.backPolicy !== 'twoSided') throw new Error(`${component.id} Proposal/Treaty card must be two-sided.`);
      const proposalId = proposalIdForComponent(component);
      const proposal = proposals.get(proposalId);
      if (!proposal) throw new Error(`Finalized Proposal component ${component.id} has no current Proposal source record ${proposalId}.`);
      if (proposal.name !== component.name) throw new Error(`Proposal source mismatch for ${component.id}: ${proposal.name} != ${component.name}.`);
      components.push({ component, renderer: 'proposal-card', orientation: 'portrait', proposalId, backPolicy: 'twoSided' });
      continue;
    }

    if (component.family === 'ledger') {
      components.push({
        component,
        renderer: 'capital-ledger',
        orientation: 'portrait',
        backPolicy: 'twoSided',
        contractBackPolicy: component.backPolicy,
      });
      continue;
    }

    if (component.family === 'deed-card') {
      if (component.backPolicy !== 'standardBack') throw new Error(`${component.id} Deed must use the standard faction-component back.`);
      components.push({ component, renderer: 'deed-card', orientation: 'landscape', backPolicy: 'standardBack' });
    }
  }

  const proposalCount = components.filter(item => item.component.family === 'proposal-treaty-card').length;
  const ledgers = components.filter(item => item.component.family === 'ledger');
  const deeds = components.filter(item => item.component.family === 'deed-card');
  if (proposalCount !== proposals.size) {
    throw new Error(`Finalized TTS Proposal plan covers ${proposalCount} components but current Proposal authority contains ${proposals.size}.`);
  }
  if (ledgers.length !== 1) throw new Error(`Expected exactly one finalized Capital Ledger export; found ${ledgers.length}.`);
  if (deeds.length !== 1 || deeds[0].component.quantity !== 8) {
    throw new Error('Expected exactly one finalized eight-copy Financier Deed definition.');
  }

  return Object.freeze({ release, contract, components: Object.freeze(components) });
}

async function readGeneratedJson(release, filename) {
  return JSON.parse(await readFile(join(release.outputRoot, filename), 'utf8').catch(error => {
    if (error.code === 'ENOENT') {
      throw new Error(`Finalized supplemental export requires ${filename}. Run npm run tts:supplementals first.`);
    }
    throw error;
  }));
}

function maxExistingDeckId(manifest) {
  return Math.max(199, ...(manifest.ready || []).map(record => Number(record.tts?.deckId) || 0));
}

function productionComponentRequest(item) {
  const component = item.component;
  if (component.family === 'proposal-treaty-card') {
    return { kind: 'proposal', id: item.proposalId };
  }
  if (component.family === 'ledger' || component.family === 'deed-card') {
    return { kind: 'supplemental', id: component.id };
  }
  throw new Error(`No card-design production component request for ${component.id} (${component.family}).`);
}

async function captureComponent(page, baseUrl, item, side, outputPath, displayVersion) {
  const request = productionComponentRequest(item);
  const url = new URL('/card-design/component-render.html', baseUrl);
  url.searchParams.set('kind', request.kind);
  url.searchParams.set('id', request.id);
  url.searchParams.set('side', side);
  url.searchParams.set('orientation', item.orientation);
  if (displayVersion) url.searchParams.set('version', displayVersion);

  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForSelector('#renderTarget > .gauntlet-card');
  await page.waitForFunction(() => document.body.dataset.renderReady === 'true' || document.body.dataset.renderError === 'true');
  const state = await page.evaluate(() => ({
    error: document.body.dataset.renderError === 'true',
    message: document.body.dataset.renderErrorMessage || '',
  }));
  if (state.error) {
    throw new Error(`Card-design production renderer failed for ${item.component.id} (${side}): ${state.message || 'unspecified renderer error'}`);
  }

  const card = page.locator('#renderTarget > .gauntlet-card');
  const expected = item.orientation === 'landscape' ? LANDSCAPE_CSS : PORTRAIT_CSS;
  const metrics = await card.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
    };
  });
  if (Math.abs(metrics.width - expected.width) > 0.25 || Math.abs(metrics.height - expected.height) > 0.25) {
    throw new Error(`Unexpected card-design ${item.orientation} geometry for ${item.component.id}: ${metrics.width} × ${metrics.height}.`);
  }
  if (metrics.scrollWidth > metrics.clientWidth + 1 || metrics.scrollHeight > metrics.clientHeight + 1) {
    throw new Error(`Card-design production content overflows ${item.component.id} (${side}).`);
  }

  if (item.orientation === 'landscape') {
    // Rendering authority stops at the approved 3.5 x 2.5 card face. TTS
    // packaging alone quarter-turns that exact raster into the standard
    // portrait Custom Card cell. The sign is shared with Territories so no
    // component can quietly acquire an opposite inspection orientation.
    await card.evaluate((element, rotationDegrees) => {
      const wrapper = document.createElement('div');
      wrapper.id = 'tts-portrait-card-cell';
      Object.assign(wrapper.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: '240px',
        height: '336px',
        overflow: 'hidden',
        background: 'transparent',
      });
      element.parentNode.insertBefore(wrapper, element);
      wrapper.appendChild(element);
      Object.assign(element.style, {
        position: 'absolute',
        left: '50%',
        top: '50%',
        margin: '0',
        transform: `translate(-50%, -50%) rotate(${rotationDegrees}deg)`,
        transformOrigin: 'center center',
      });
      document.documentElement.style.width = '240px';
      document.documentElement.style.height = '336px';
      document.documentElement.style.background = 'transparent';
      document.body.style.width = '240px';
      document.body.style.height = '336px';
      document.body.style.margin = '0';
      document.body.style.background = 'transparent';
    }, LANDSCAPE_TTS_CELL_ROTATION_DEGREES);
    await page.locator('#tts-portrait-card-cell').screenshot({ path: outputPath, omitBackground: true });
    return;
  }

  await card.screenshot({ path: outputPath, omitBackground: true });
}

function manifestRecord(item, deckId, frontFile, reverseFile) {
  const component = item.component;
  return {
    id: component.id,
    name: component.name,
    faction: component.faction,
    family: component.family,
    quantity: component.quantity,
    productionStatus: 'ready',
    contractProductionStatus: component.productionStatus,
    designStatus: component.designStatus || 'final',
    backPolicy: item.backPolicy,
    contractBackPolicy: item.contractBackPolicy || component.backPolicy,
    reverse: component.reverse || (component.family === 'ledger' ? 'Capital Ledger' : null),
    representation: 'card',
    source: component.source,
    renderer: item.renderer,
    orientation: item.orientation,
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
      cellOrientation: 'portrait',
      sidewaysCard: item.orientation === 'landscape',
    },
  };
}

function replaceRecords(collection, additions) {
  const ids = new Set(additions.map(record => record.id));
  return [...(collection || []).filter(record => !ids.has(record.id)), ...additions];
}

function removePending(collection, additions) {
  const ids = new Set(additions.map(record => record.id));
  return (collection || []).filter(record => !ids.has(record.id));
}

export async function renderFinalizedSupplementals(plan) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  const { release, contract, components } = plan;
  const [manifest, catalog] = await Promise.all([
    readGeneratedJson(release, 'supplemental-manifest.json'),
    readGeneratedJson(release, 'supplemental-catalog.json'),
  ]);
  if (manifest.gameVersion !== release.version || catalog.gameVersion !== release.version) {
    throw new Error(`Generated supplemental sources do not target ${release.version}.`);
  }

  await mkdir(join(release.outputRoot, 'supplementals', 'fronts'), { recursive: true });
  await mkdir(join(release.outputRoot, 'supplementals', 'reverses'), { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 420 },
    deviceScaleFactor: DEVICE_SCALE,
  });
  const page = await context.newPage();

  try {
    let nextDeckId = maxExistingDeckId(manifest) + 1;
    const additions = [];

    for (const item of components) {
      const component = item.component;
      const frontFile = `supplementals/fronts/${component.id}.png`;
      await captureComponent(page, baseUrl, item, 'front', join(release.outputRoot, frontFile), release.displayVersion || release.version);

      let reverseFile;
      if (item.backPolicy === 'twoSided') {
        reverseFile = `supplementals/reverses/${component.id}.png`;
        await captureComponent(page, baseUrl, item, 'reverse', join(release.outputRoot, reverseFile), release.displayVersion || release.version);
      } else {
        reverseFile = resolveFactionBackFile(contract, component.faction);
        await access(join(release.outputRoot, reverseFile));
      }

      additions.push(manifestRecord(item, nextDeckId, frontFile, reverseFile));
      nextDeckId += 1;
    }

    manifest.ready = replaceRecords(manifest.ready, additions);
    manifest.pending = removePending(manifest.pending, additions);
    manifest.readyCount = manifest.ready.length;
    manifest.pendingCount = manifest.pending.length;
    manifest.finalizedExportBridge = {
      componentCount: additions.length,
      families: [...new Set(additions.map(record => record.family))],
      note: 'Final physical designs still marked export-pending in the component contract are captured from the card-design production authority and promoted to ready in the generated TTS manifest. Landscape cards are normalized into standard portrait TTS image cells using the same +90 degree packaging orientation as Territories before SidewaysCard presentation.',
    };

    catalog.ready = replaceRecords(catalog.ready, additions);
    catalog.pending = removePending(catalog.pending, additions);
    catalog.readyCount = catalog.ready.length;
    catalog.pendingCount = catalog.pending.length;
    catalog.sourcePolicy = `${catalog.sourcePolicy}; final export-pending Proposal/Ledger/Deed designs are captured from card-design and promoted by the finalized supplemental export bridge`;

    const manifestText = jsonText(manifest);
    const catalogText = jsonText(catalog);
    await Promise.all([
      writeFile(join(release.outputRoot, 'supplemental-manifest.json'), manifestText),
      writeFile(join(CURRENT_ALIAS_ROOT, 'supplemental-manifest.json'), manifestText),
      writeFile(join(release.outputRoot, 'supplemental-catalog.json'), catalogText),
      writeFile(join(CURRENT_ALIAS_ROOT, 'supplemental-catalog.json'), catalogText),
    ]);

    return { manifest, catalog, additions };
  } finally {
    await context.close();
    await browser.close();
    await new Promise(done => server.close(done));
  }
}

function githubErrorAnnotation(message) {
  const escaped = String(message || '').replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  return `::error title=TTS finalized supplemental export::${escaped}`;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const plan = await buildFinalizedExportPlan();
  if (checkOnly) {
    console.log(`Current TTS finalized supplemental source check passed for ${plan.release.version}: ${plan.components.length} final export-pending components have production render paths.`);
    return;
  }
  const result = await renderFinalizedSupplementals(plan);
  console.log(`Rendered and promoted ${result.additions.length} finalized supplemental component definitions for ${plan.release.version}; generated manifest now has ${result.manifest.readyCount} ready and ${result.manifest.pendingCount} pending components.`);
  console.log(`Finalized supplemental output: ${relative(ROOT, plan.release.outputRoot)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    const message = error.stack || error.message || String(error);
    console.error(message);
    if (process.env.GITHUB_ACTIONS === 'true') console.error(githubErrorAnnotation(message));
    process.exitCode = 1;
  });
}
