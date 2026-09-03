import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadCurrentGameAuthority } from './current-game-authority.mjs';
import { resolveAllFaceSpecs } from '../card-design/face-spec.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'face-parity');
const PIXEL_CHANNEL_TOLERANCE = 12;
const MAX_CHANGED_PIXEL_RATIO = 0.0025;

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

async function startServer() {
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
  const base = new URLSearchParams();

  if (spec.template === 'playable') {
    base.set('fit', 'production');
    base.set('card', spec.content.card.id);
    return { path: `/card-design/card-review-render.html?${base}`, selector: '.gauntlet-card' };
  }

  if (spec.template === 'territory') {
    base.set('territory', spec.content.territory.id);
    return { path: `/card-design/territory-review-render.html?${base}`, selector: '.territory-card' };
  }

  if (spec.template === 'leader') {
    base.set('kind', 'leader');
    base.set('id', `${spec.content.leader.faction}-${spec.content.leader.id}`);
    base.set('side', 'front');
    return { path: `/card-design/component-render.html?${base}`, selector: '#renderTarget > *' };
  }

  if (spec.template === 'proposal') {
    base.set('kind', 'proposal');
    base.set('id', spec.content.proposal.id);
    base.set('side', spec.side === 'reverse' ? 'reverse' : 'front');
    return { path: `/card-design/component-render.html?${base}`, selector: '#renderTarget > *' };
  }

  if (spec.template === 'rite') {
    base.set('kind', 'rite');
    base.set('id', spec.content.rite.id);
    base.set('side', spec.side === 'reverse' ? 'reverse' : 'front');
    return { path: `/card-design/component-render.html?${base}`, selector: '#renderTarget > *' };
  }

  if (spec.template === 'ritual') {
    base.set('kind', 'ritual');
    base.set('id', spec.content.ritual.id);
    base.set('side', spec.side === 'reverse' ? 'reverse' : 'front');
    return { path: `/card-design/component-render.html?${base}`, selector: '#renderTarget > *' };
  }

  if (spec.template === 'tracker') {
    base.set('kind', 'tracker');
    base.set('id', spec.content.component.renderSource?.componentId || spec.content.component.id);
    base.set('side', 'front');
    return { path: `/card-design/component-render.html?${base}`, selector: '#renderTarget > *' };
  }

  if (spec.template === 'ledger' || spec.template === 'deed') {
    base.set('kind', 'supplemental');
    base.set('id', spec.content.component.id);
    base.set('side', spec.side === 'reverse' ? 'reverse' : 'front');
    if (spec.orientation === 'landscape') base.set('orientation', 'landscape');
    return { path: `/card-design/component-render.html?${base}`, selector: '#renderTarget > *' };
  }

  if (spec.template === 'standard-back') {
    base.set('faction', spec.content.faction);
    return {
      path: `/card-design/card-back-render.html?${base}`,
      selector: '.gauntlet-card-back',
      readiness: 'card-back',
    };
  }

  return null;
}

function safeFilename(id) {
  return id.replace(/[^a-z0-9_.-]+/gi, '__');
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
  if (state.ready !== 'true') throw new Error(`Render failed: ${state.error || 'unknown error'}`);
}

async function waitForLegacyRender(page, legacy) {
  if (legacy.readiness === 'card-back') {
    await page.waitForFunction(() => {
      const back = document.querySelector('.gauntlet-card-back');
      const pattern = back?.querySelector('.gauntlet-card-back__pattern');
      return Boolean(
        back
        && pattern
        && pattern.complete
        && pattern.naturalWidth > 0
        && pattern.naturalHeight > 0
      );
    }, null, { timeout: 30000 });
    return;
  }
  await waitForRender(page);
}

async function metrics(locator) {
  return locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const images = [...element.querySelectorAll('img')].filter(image => !image.hidden);
    const title = element.querySelector('.card-title, .territory-title, .reference-face-title');
    const footer = element.querySelector('.card-footer, .territory-footer');
    const artwork = element.querySelector('.card-art img:not([hidden]), .territory-art img:not([hidden])');
    return {
      width: rect.width,
      height: rect.height,
      text: String(element.innerText || '').replace(/\s+/g, ' ').trim(),
      title: title?.textContent?.replace(/\s+/g, ' ').trim() || '',
      footer: footer?.textContent?.replace(/\s+/g, ' ').trim() || '',
      fitWarning: element.classList.contains('fit-warning'),
      imagePaths: images.map(image => new URL(image.currentSrc || image.src, location.href).pathname),
      imageLoaded: images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
      artObjectPosition: artwork?.style.objectPosition || '',
      artTransform: artwork?.style.transform || '',
      artFocusX: artwork?.dataset.artFocusX || '',
      artFocusY: artwork?.dataset.artFocusY || '',
      artZoom: artwork?.dataset.artZoom || '',
    };
  });
}

async function pixelDiff(leftBuffer, rightBuffer) {
  const left = await sharp(leftBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const right = await sharp(rightBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (left.info.width !== right.info.width || left.info.height !== right.info.height || left.info.channels !== right.info.channels) {
    return {
      comparable: false,
      left: left.info,
      right: right.info,
      changedPixelRatio: 1,
      changedPixels: left.info.width * left.info.height,
    };
  }

  const channels = left.info.channels;
  const pixelCount = left.info.width * left.info.height;
  let changedPixels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * channels;
    let changed = false;
    for (let channel = 0; channel < channels; channel += 1) {
      if (Math.abs(left.data[offset + channel] - right.data[offset + channel]) > PIXEL_CHANNEL_TOLERANCE) {
        changed = true;
        break;
      }
    }
    if (changed) changedPixels += 1;
  }

  return {
    comparable: true,
    width: left.info.width,
    height: left.info.height,
    changedPixels,
    changedPixelRatio: changedPixels / pixelCount,
  };
}

function groupBlockers(specs) {
  const grouped = {};
  for (const spec of specs.filter(item => !item.readiness.productionReady)) {
    for (const issue of spec.readiness.issues) {
      if (!grouped[issue]) grouped[issue] = [];
      grouped[issue].push(spec.id);
    }
  }
  return grouped;
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required for unified face parity validation.'); }

  const authority = await loadCurrentGameAuthority();
  const game = runtimeGame(authority);
  const specs = resolveAllFaceSpecs(game);
  if (specs.length !== 242) throw new Error(`Expected 242 canonical faces, found ${specs.length}.`);

  const ready = specs.filter(spec => spec.readiness.productionReady);
  const blocked = specs.filter(spec => !spec.readiness.productionReady);
  const blockerGroups = groupBlockers(specs);

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(join(OUTPUT, 'clean'), { recursive: true });
  await mkdir(join(OUTPUT, 'legacy'), { recursive: true });

  const { server, baseUrl } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
  });
  const cleanPage = await context.newPage();
  const legacyPage = await context.newPage();
  const comparisons = [];
  const failures = [];

  try {
    for (const spec of ready) {
      const legacy = legacyRoute(spec);
      if (!legacy) {
        failures.push({ id: spec.id, template: spec.template, reason: `No legacy parity route for template ${spec.template}.` });
        continue;
      }

      const cleanUrl = `${baseUrl}/card-design/face-render.html?id=${encodeURIComponent(spec.id)}`;
      const legacyUrl = `${baseUrl}${legacy.path}`;

      try {
        await cleanPage.goto(cleanUrl, { waitUntil: 'load' });
        await waitForRender(cleanPage);
        const cleanRoot = cleanPage.locator('#renderTarget > *').first();
        await cleanRoot.waitFor();
        const cleanMetrics = await metrics(cleanRoot);

        await legacyPage.goto(legacyUrl, { waitUntil: 'load' });
        await waitForLegacyRender(legacyPage, legacy);
        const legacyRoot = legacyPage.locator(legacy.selector).first();
        await legacyRoot.waitFor();
        const legacyMetrics = await metrics(legacyRoot);

        const expectedWidth = spec.surface.widthCssPx;
        const expectedHeight = spec.surface.heightCssPx;
        const geometryOkay = Math.abs(cleanMetrics.width - expectedWidth) <= 0.25
          && Math.abs(cleanMetrics.height - expectedHeight) <= 0.25
          && Math.abs(legacyMetrics.width - expectedWidth) <= 0.25
          && Math.abs(legacyMetrics.height - expectedHeight) <= 0.25;

        const filename = safeFilename(spec.id);
        const cleanBuffer = await cleanRoot.screenshot({
          path: join(OUTPUT, 'clean', `${filename}.png`),
          omitBackground: false,
        });
        const legacyBuffer = await legacyRoot.screenshot({
          path: join(OUTPUT, 'legacy', `${filename}.png`),
          omitBackground: false,
        });
        const diff = await pixelDiff(cleanBuffer, legacyBuffer);

        const textParity = cleanMetrics.text === legacyMetrics.text;
        const imageParity = JSON.stringify(cleanMetrics.imagePaths) === JSON.stringify(legacyMetrics.imagePaths);
        const cropParity = ['artObjectPosition', 'artTransform', 'artFocusX', 'artFocusY', 'artZoom']
          .every(field => cleanMetrics[field] === legacyMetrics[field]);
        const passes = geometryOkay
          && cleanMetrics.imageLoaded
          && legacyMetrics.imageLoaded
          && !cleanMetrics.fitWarning
          && !legacyMetrics.fitWarning
          && textParity
          && imageParity
          && cropParity
          && diff.comparable
          && diff.changedPixelRatio <= MAX_CHANGED_PIXEL_RATIO;

        const comparison = {
          id: spec.id,
          template: spec.template,
          cleanUrl,
          legacyUrl,
          passes,
          geometryOkay,
          textParity,
          imageParity,
          cropParity,
          pixelDiff: diff,
          clean: cleanMetrics,
          legacy: legacyMetrics,
        };
        comparisons.push(comparison);
        if (!passes) failures.push(comparison);
      } catch (error) {
        const failure = {
          id: spec.id,
          template: spec.template,
          cleanUrl,
          legacyUrl,
          reason: error?.stack || error?.message || String(error),
        };
        comparisons.push({ ...failure, passes: false });
        failures.push(failure);
      }
    }
  } finally {
    await cleanPage.close();
    await legacyPage.close();
    await browser.close();
    await new Promise(resolveDone => server.close(resolveDone));
  }

  const report = {
    schemaVersion: 1,
    gameVersion: authority.version,
    displayVersion: authority.displayVersion,
    totalFaces: specs.length,
    readyFaces: ready.length,
    blockedFaces: blocked.length,
    blockerCounts: Object.fromEntries(Object.entries(blockerGroups).map(([issue, ids]) => [issue, ids.length])),
    blockers: blockerGroups,
    comparedReadyFaces: comparisons.length,
    parityFailures: failures.length,
    thresholds: {
      pixelChannelTolerance: PIXEL_CHANNEL_TOLERANCE,
      maxChangedPixelRatio: MAX_CHANGED_PIXEL_RATIO,
    },
    comparisons,
  };

  await writeFile(join(OUTPUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    totalFaces: report.totalFaces,
    readyFaces: report.readyFaces,
    blockedFaces: report.blockedFaces,
    blockerCounts: report.blockerCounts,
    comparedReadyFaces: report.comparedReadyFaces,
    parityFailures: report.parityFailures,
  }, null, 2));

  if (failures.length) {
    const summary = failures.slice(0, 20).map(failure => {
      if (failure.reason) return `${failure.id}: ${failure.reason}`;
      return `${failure.id}: pixel=${failure.pixelDiff?.changedPixelRatio ?? 'n/a'}, geometry=${failure.geometryOkay}, text=${failure.textParity}, images=${failure.imageParity}, crop=${failure.cropParity}`;
    }).join('\n');
    throw new Error(`Unified face parity failed for ${failures.length} ready face(s).\n${summary}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
