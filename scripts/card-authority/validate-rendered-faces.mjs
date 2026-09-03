#!/usr/bin/env node
import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { ROOT, loadCurrentGameAuthority } from '../current-game-authority.mjs';
import { resolveAllFaceSpecs } from '../../card-design/face-spec.mjs';
import { runtimeGameFromAuthority, validateFaceCatalogContract } from './model.mjs';

const OUTPUT = resolve(ROOT, 'artifacts/card-authority');
const FAILURES = join(OUTPUT, 'render-failures');
const DIMENSION_TOLERANCE = 0.3;

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
    '.avif': 'image/avif',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
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
      response.writeHead(200, {
        'Content-Type': contentType(file),
        'Cache-Control': 'no-store',
      });
      response.end(await readFile(file));
    } catch (error) {
      response.writeHead(error?.code === 'ENOENT' ? 404 : 500).end(error?.message || String(error));
    }
  });

  await new Promise(resolveDone => server.listen(0, '127.0.0.1', resolveDone));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function safeFilename(id) {
  return String(id).replace(/[^a-z0-9_.-]+/gi, '__');
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

  if (state.ready !== 'true') throw new Error(state.error || 'Canonical renderer entered an unknown error state.');
}

async function browserMetrics(page) {
  return page.evaluate(() => {
    const roots = [...document.querySelectorAll('#renderTarget > *')];
    const root = roots[0];
    const rect = root?.getBoundingClientRect();
    const visibleImages = root
      ? [...root.querySelectorAll('img')].filter(image => {
        const style = getComputedStyle(image);
        return !image.hidden && style.display !== 'none' && style.visibility !== 'hidden';
      })
      : [];

    return {
      faceId: document.body.dataset.faceId || '',
      template: document.body.dataset.faceTemplate || '',
      orientation: document.body.dataset.renderOrientation || '',
      gameplayAuthority: document.body.dataset.gameplayAuthority || '',
      visualAuthority: document.body.dataset.visualAuthority || '',
      productionReady: document.body.dataset.faceProductionReady || '',
      rootCount: roots.length,
      width: rect?.width || 0,
      height: rect?.height || 0,
      fitWarning: Boolean(
        root?.classList.contains('fit-warning')
        || root?.dataset.fitWarning === 'true'
        || root?.querySelector('.fit-warning')
      ),
      placeholder: Boolean(root?.matches('.supplemental-placeholder-card') || root?.querySelector('.supplemental-placeholder-card')),
      visibleImages: visibleImages.length,
      failedImages: visibleImages
        .filter(image => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0)
        .map(image => image.currentSrc || image.src),
      artworkLoaded: root?.dataset.artworkLoaded || '',
      artworkSource: root?.dataset.artworkSource || '',
      fontStatus: document.fonts?.status || 'unsupported',
    };
  });
}

function validateMetrics(spec, metric, pageErrors) {
  const failures = [];
  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };

  expect(metric.faceId === spec.id, `renderer reported face id ${metric.faceId || '(missing)'}`);
  expect(metric.template === spec.template, `renderer reported template ${metric.template || '(missing)'}`);
  expect(metric.orientation === spec.orientation, `renderer reported orientation ${metric.orientation || '(missing)'}`);
  expect(metric.gameplayAuthority === spec.provenance.gameplay, `gameplay provenance drifted to ${metric.gameplayAuthority || '(missing)'}`);
  expect(metric.visualAuthority === spec.provenance.visual, `visual provenance drifted to ${metric.visualAuthority || '(missing)'}`);
  expect(metric.productionReady === 'true', 'renderer did not mark the FaceSpec production-ready');
  expect(metric.rootCount === 1, `renderer mounted ${metric.rootCount} physical roots`);
  expect(Math.abs(metric.width - spec.surface.widthCssPx) <= DIMENSION_TOLERANCE, `width ${metric.width} != ${spec.surface.widthCssPx}`);
  expect(Math.abs(metric.height - spec.surface.heightCssPx) <= DIMENSION_TOLERANCE, `height ${metric.height} != ${spec.surface.heightCssPx}`);
  expect(!metric.fitWarning, 'rendered face has a fit warning');
  expect(!metric.placeholder, 'rendered face contains a production placeholder');
  expect(metric.failedImages.length === 0, `visible image load failure: ${metric.failedImages.join(', ')}`);
  expect(metric.fontStatus === 'loaded', `document font status is ${metric.fontStatus}`);

  if (spec.artwork?.role === 'crop' || spec.artwork?.role === 'full-face') {
    expect(metric.artworkLoaded === 'true', 'canonical artwork did not finish loading');
    expect(Boolean(metric.artworkSource), 'canonical artwork source was not recorded');
  }

  if (pageErrors.length) failures.push(...pageErrors.map(error => `page error: ${error}`));
  return failures;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required for the rendered-face card authority contract.');
  }

  const authority = await loadCurrentGameAuthority();
  validateFaceCatalogContract(authority);
  const specs = resolveAllFaceSpecs(runtimeGameFromAuthority(authority));

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(FAILURES, { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const results = [];
  let pageErrors = [];

  page.on('pageerror', error => {
    pageErrors.push(error?.message || String(error));
  });

  try {
    for (const spec of specs) {
      pageErrors = [];
      const url = `${baseUrl}/card-design/face-render.html?id=${encodeURIComponent(spec.id)}`;
      let metric = null;
      let failures = [];

      try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        await waitForRender(page);
        await page.evaluate(async () => document.fonts?.ready);
        metric = await browserMetrics(page);
        failures = validateMetrics(spec, metric, pageErrors);
      } catch (error) {
        failures.push(error?.stack || error?.message || String(error));
      }

      if (failures.length) {
        try {
          const root = page.locator('#renderTarget > *').first();
          if (await root.count()) {
            await root.screenshot({
              path: join(FAILURES, `${safeFilename(spec.id)}.png`),
              omitBackground: false,
            });
          }
        } catch {
          // The structured failure report is authoritative; screenshots are best-effort diagnostics.
        }
      }

      results.push({
        id: spec.id,
        template: spec.template,
        orientation: spec.orientation,
        passed: failures.length === 0,
        failures,
        metric,
      });
    }
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    await new Promise(resolveDone => server.close(resolveDone));
  }

  const failures = results.filter(result => !result.passed);
  const report = {
    schemaVersion: 1,
    authority: '/game-data/current-game.json',
    version: authority.version,
    totalFaces: specs.length,
    passedFaces: results.length - failures.length,
    failedFaces: failures.length,
    byTemplate: Object.fromEntries(
      [...new Set(specs.map(spec => spec.template))]
        .sort()
        .map(template => [template, {
          total: results.filter(result => result.template === template).length,
          failed: failures.filter(result => result.template === template).length,
        }]),
    ),
    results,
  };

  await writeFile(join(OUTPUT, 'render-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    version: report.version,
    totalFaces: report.totalFaces,
    passedFaces: report.passedFaces,
    failedFaces: report.failedFaces,
    byTemplate: report.byTemplate,
  }, null, 2));

  if (failures.length) {
    const summary = failures.slice(0, 30)
      .map(result => `${result.id}: ${result.failures.join('; ')}`)
      .join('\n');
    throw new Error(`Canonical rendered-face contract failed for ${failures.length} face(s).\n${summary}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
