import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrentGameAuthority } from './current-game-authority.mjs';
import { resolveAllFaceSpecs } from '../card-design/face-spec.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'materialized-art-direction.json');
const CAPTURE_ISSUES = new Set([
  'artwork-composition-not-explicit',
  'artwork-composition-not-final',
]);

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

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const requestedPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const requested = resolve(ROOT, requestedPath || 'index.html');
      if (!requested.startsWith(`${ROOT}${sep}`) && requested !== join(ROOT, 'index.html')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const body = await readFile(requested);
      response.writeHead(200, { 'Content-Type': contentType(requested) });
      response.end(body);
    } catch (error) {
      if (!response.headersSent) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      }
      response.end(error.message);
    }
  });
  await new Promise(resolveDone => server.listen(0, '127.0.0.1', resolveDone));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function runtimeGame(authority) {
  const contract = authority.componentContract || {};
  return Object.freeze({
    authorityUrl: '/game-data/current-game.json',
    visualAuthorityUrl: '/game-data/current-game.json',
    version: authority.version,
    displayVersion: authority.displayVersion,
    visualPolicy: authority.visualPolicy || {},
    artDirection: authority.artDirection || {},
    cards: authority.gameplay?.cards || [],
    territories: authority.gameplay?.territories || [],
    leaders: authority.leaders || [],
    proposals: authority.proposals || [],
    mystics: authority.mystics || {},
    components: contract.components || [],
    sharedComponents: contract.sharedComponents || [],
  });
}

function legacyRoute(spec) {
  const params = new URLSearchParams();

  if (spec.template === 'playable') {
    params.set('fit', 'production');
    params.set('card', spec.content.card.id);
    return `/card-design/card-review-render.html?${params}`;
  }

  if (spec.template === 'territory') {
    params.set('territory', spec.content.territory.id);
    return `/card-design/territory-review-render.html?${params}`;
  }

  if (spec.template === 'leader') {
    params.set('kind', 'leader');
    params.set('id', `${spec.content.leader.faction}-${spec.content.leader.id}`);
    params.set('side', 'front');
    return `/card-design/component-render.html?${params}`;
  }

  if (spec.template === 'proposal') {
    params.set('kind', 'proposal');
    params.set('id', spec.content.proposal.id);
    params.set('side', spec.side === 'reverse' ? 'reverse' : 'front');
    return `/card-design/component-render.html?${params}`;
  }

  if (spec.template === 'rite') {
    params.set('kind', 'rite');
    params.set('id', spec.content.rite.id);
    params.set('side', spec.side === 'reverse' ? 'reverse' : 'front');
    return `/card-design/component-render.html?${params}`;
  }

  if (spec.template === 'ritual') {
    params.set('kind', 'ritual');
    params.set('id', spec.content.ritual.id);
    params.set('side', spec.side === 'reverse' ? 'reverse' : 'front');
    return `/card-design/component-render.html?${params}`;
  }

  throw new Error(`No legacy crop-capture route for template ${spec.template} (${spec.id}).`);
}

async function waitForRender(page) {
  await page.waitForFunction(() => {
    const state = document.body?.dataset.renderReady;
    return state === 'true' || state === 'error';
  }, null, { timeout: 30000 });

  const state = await page.evaluate(() => ({
    ready: document.body.dataset.renderReady || '',
    error: document.body.dataset.renderErrorMessage || document.body.dataset.renderError || '',
  }));
  if (state.ready !== 'true') throw new Error(`Legacy render failed: ${state.error || 'unknown error'}`);
}

function isCaptureTarget(spec) {
  return spec.artwork?.role === 'crop'
    && spec.readiness.issues.some(issue => CAPTURE_ISSUES.has(issue));
}

async function captureDirection(page, spec, baseUrl) {
  await page.goto(`${baseUrl}${legacyRoute(spec)}`, { waitUntil: 'load' });
  await waitForRender(page);

  const captured = await page.evaluate(() => {
    const image = document.querySelector('.card-art img:not([hidden]), .territory-art img:not([hidden])');
    if (!(image instanceof HTMLImageElement)) return null;
    const style = getComputedStyle(image);
    return {
      fit: style.objectFit || 'cover',
      focusX: Number(image.dataset.artFocusX),
      focusY: Number(image.dataset.artFocusY),
      zoom: Number(image.dataset.artZoom || '1'),
      cropMode: image.dataset.artCrop || '',
      cropX: image.dataset.artCropX || '',
      cropY: image.dataset.artCropY || '',
      source: new URL(image.currentSrc || image.src, location.href).pathname,
    };
  });

  if (!captured) throw new Error(`No rendered artwork image found for ${spec.id}.`);
  if (![captured.focusX, captured.focusY, captured.zoom].every(Number.isFinite)) {
    throw new Error(`Legacy crop did not expose finite composition for ${spec.id}: ${JSON.stringify(captured)}`);
  }

  return {
    fit: captured.fit === 'contain' ? 'contain' : 'cover',
    focusX: Number((captured.focusX / 100).toFixed(4)),
    focusY: Number((captured.focusY / 100).toFixed(4)),
    smart: false,
    zoom: Number(captured.zoom.toFixed(4)),
    _capture: {
      faceId: spec.id,
      source: captured.source,
      legacyCropMode: captured.cropMode,
      legacyCropX: captured.cropX,
      legacyCropY: captured.cropY,
    },
  };
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required to materialize art direction.'); }

  const authority = await loadCurrentGameAuthority();
  const game = runtimeGame(authority);
  const targets = resolveAllFaceSpecs(game).filter(isCaptureTarget);

  const { server, baseUrl } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const materialized = {};
  const conflicts = [];

  try {
    for (const spec of targets) {
      const key = spec.artwork?.composition?.id;
      if (!key) throw new Error(`Face ${spec.id} has no art-direction key.`);
      const direction = await captureDirection(page, spec, baseUrl);
      const prior = materialized[key];
      if (prior) {
        const comparablePrior = { ...prior, _capture: undefined };
        const comparableNext = { ...direction, _capture: undefined };
        if (JSON.stringify(comparablePrior) !== JSON.stringify(comparableNext)) {
          conflicts.push({ key, first: prior, second: direction });
        }
        continue;
      }
      materialized[key] = direction;
    }
  } finally {
    await page.close();
    await browser.close();
    await new Promise(resolveDone => server.close(resolveDone));
  }

  if (conflicts.length) {
    throw new Error(`Materialized art direction produced ${conflicts.length} conflicting shared key(s): ${JSON.stringify(conflicts.slice(0, 10), null, 2)}`);
  }

  const entries = Object.entries(materialized).sort(([a], [b]) => a.localeCompare(b));
  const output = {
    schemaVersion: 1,
    gameVersion: authority.version,
    generatedFrom: 'current legacy production crop output',
    faceCount: targets.length,
    directionCount: entries.length,
    directions: Object.fromEntries(entries),
  };

  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({
    faceCount: output.faceCount,
    directionCount: output.directionCount,
    output: OUTPUT,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
