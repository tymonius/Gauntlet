import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');
const TERRITORY_ID = 'territory-smuggler-s-pass';
const CARD_WIDTH = 336;
const CARD_HEIGHT = 240;
const MINIMUM_ART_HEIGHT = 0.55 * 96;

function contentType(path) {
  const extension = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
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
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function waitForTerritoryReady(frame) {
  await frame.waitForSelector('.territory-card');
  await frame.waitForFunction(() => document.body.dataset.renderReady === 'true');
  await frame.evaluate(async () => document.fonts?.ready);
}

async function territoryMetrics(frame) {
  return frame.locator('.territory-card').evaluate(card => {
    const cardRect = card.getBoundingClientRect();
    const art = card.querySelector('.territory-art');
    const artRect = art?.getBoundingClientRect();
    const effect = card.querySelector('.territory-effect p');
    const effectStyle = effect ? getComputedStyle(effect) : null;
    const rootStyle = getComputedStyle(document.documentElement);
    const interior = card.querySelector('.territory-interior');
    const body = card.querySelector('.territory-body');
    return {
      title: card.querySelector('.territory-title')?.textContent?.trim(),
      width: cardRect.width,
      height: cardRect.height,
      artWidth: artRect?.width || 0,
      artHeight: artRect?.height || 0,
      effectFontSize: effectStyle ? Number.parseFloat(effectStyle.fontSize) : 0,
      effectLineHeight: effectStyle ? Number.parseFloat(effectStyle.lineHeight) : 0,
      effectScale: card.dataset.effectScale,
      fitWarning: card.classList.contains('fit-warning'),
      titleFit: card.dataset.titleFit,
      parchmentLoaded: card.dataset.parchmentLoaded,
      textSizeAdjust: rootStyle.webkitTextSizeAdjust || rootStyle.textSizeAdjust || '',
      interiorScrollExcess: interior ? interior.scrollHeight - interior.clientHeight : 0,
      bodyScrollExcess: body ? body.scrollHeight - body.clientHeight : 0,
    };
  });
}

async function renderMetrics(browser, baseUrl, contextOptions, screenshotPath) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/card-design/territory-review-render.html?territory=${TERRITORY_ID}`, { waitUntil: 'load' });
    await waitForTerritoryReady(page);
    await page.waitForTimeout(150);
    const metrics = await territoryMetrics(page);
    if (screenshotPath) await page.locator('.territory-card').screenshot({ path: screenshotPath, omitBackground: true });
    return metrics;
  } finally {
    await context.close();
  }
}

async function renderInspectionLifecycle(browser, baseUrl, contextOptions, screenshotPath) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/card-design/`, { waitUntil: 'load' });
    const sourceSelector = `iframe.territory-review-frame[src*="territory=${TERRITORY_ID}"]`;
    const sourceElement = await page.waitForSelector(sourceSelector, { state: 'attached', timeout: 30000 });
    const sourceFrame = await sourceElement.contentFrame();
    if (!sourceFrame) throw new Error('Territory review iframe did not expose a content frame.');
    await waitForTerritoryReady(sourceFrame);

    await sourceFrame.locator('.territory-card').click();

    const inspectionElement = await page.waitForSelector(
      'iframe.territory-inspection-frame',
      { state: 'attached', timeout: 10000 },
    );
    const inspectionFrame = await inspectionElement.contentFrame();
    if (!inspectionFrame) throw new Error('Territory inspection iframe did not expose a content frame.');
    await waitForTerritoryReady(inspectionFrame);

    const settled = await territoryMetrics(inspectionFrame);
    await page.waitForTimeout(500);
    const afterDelay = await territoryMetrics(inspectionFrame);

    if (screenshotPath) {
      await page.locator('.territory-inspection-dialog').screenshot({
        path: screenshotPath,
        omitBackground: false,
      });
    }
    return { settled, afterDelay };
  } finally {
    await context.close();
  }
}

function assertClose(label, a, b, tolerance = 0.5) {
  if (Math.abs(a - b) > tolerance) {
    throw new Error(`${label} differs between reference and mobile render: ${a} vs ${b}.`);
  }
}

function validateRender(label, metric) {
  if (Math.abs(metric.width - CARD_WIDTH) > 0.25 || Math.abs(metric.height - CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected ${label} Territory geometry: ${JSON.stringify(metric)}.`);
  }
  if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') {
    throw new Error(`${label} Territory render does not fit or load correctly: ${JSON.stringify(metric)}.`);
  }
  if (!metric.artWidth || !metric.artHeight || metric.artHeight <= MINIMUM_ART_HEIGHT + 1) {
    throw new Error(`${label} Territory artwork window collapsed toward the fitting floor: ${JSON.stringify(metric)}.`);
  }
  if (metric.textSizeAdjust !== 'none') {
    throw new Error(`${label} Territory render did not disable browser text inflation: ${JSON.stringify(metric)}.`);
  }
}

function validateInspectionLifecycle(label, lifecycle, reference) {
  validateRender(`${label} inspection after renderReady`, lifecycle.settled);
  validateRender(`${label} inspection after settling`, lifecycle.afterDelay);
  assertClose(`${label} inspection artwork stability`, lifecycle.settled.artHeight, lifecycle.afterDelay.artHeight, 0.25);
  assertClose(`${label} inspection typography stability`, lifecycle.settled.effectFontSize, lifecycle.afterDelay.effectFontSize, 0.05);
  assertClose(`${label} inspection artwork vs desktop`, reference.artHeight, lifecycle.afterDelay.artHeight, 1);
  if (lifecycle.settled.effectScale !== lifecycle.afterDelay.effectScale) {
    throw new Error(`${label} inspection changed effect scale after opening: ${JSON.stringify(lifecycle)}.`);
  }
}

async function main() {
  let chromium;
  let webkit;
  let devices;
  try { ({ chromium, webkit, devices } = await import('playwright')); }
  catch { throw new Error('Playwright is required. Run npm install, then npx playwright install chromium webkit.'); }

  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const chromiumBrowser = await chromium.launch({ headless: true });
  const webkitBrowser = await webkit.launch({ headless: true });

  try {
    const desktop = await renderMetrics(chromiumBrowser, baseUrl, {
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    });
    const mobileChromium = await renderMetrics(chromiumBrowser, baseUrl, {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    }, join(OUTPUT, 'territory-mobile-chromium-render-smoke.png'));
    const mobileWebKit = await renderMetrics(
      webkitBrowser,
      baseUrl,
      devices['iPhone 13'],
      join(OUTPUT, 'territory-mobile-webkit-render-smoke.png'),
    );

    for (const [label, metric] of [
      ['desktop Chromium', desktop],
      ['mobile Chromium', mobileChromium],
      ['mobile WebKit', mobileWebKit],
    ]) validateRender(label, metric);

    for (const [label, metric] of [
      ['mobile Chromium', mobileChromium],
      ['mobile WebKit', mobileWebKit],
    ]) {
      assertClose(`${label} artwork height`, desktop.artHeight, metric.artHeight, 1);
      assertClose(`${label} artwork width`, desktop.artWidth, metric.artWidth, 1);
      assertClose(`${label} effect font size`, desktop.effectFontSize, metric.effectFontSize, 0.1);
      assertClose(`${label} effect line height`, desktop.effectLineHeight, metric.effectLineHeight, 0.1);
      if (desktop.effectScale !== metric.effectScale) {
        throw new Error(`${label} effect fitting differs from desktop: ${desktop.effectScale} vs ${metric.effectScale}.`);
      }
    }

    const inspectionChromium = await renderInspectionLifecycle(
      chromiumBrowser,
      baseUrl,
      {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
      join(OUTPUT, 'territory-mobile-chromium-inspection.png'),
    );
    const inspectionWebKit = await renderInspectionLifecycle(
      webkitBrowser,
      baseUrl,
      devices['iPhone 13'],
      join(OUTPUT, 'territory-mobile-webkit-inspection.png'),
    );

    validateInspectionLifecycle('mobile Chromium', inspectionChromium, desktop);
    validateInspectionLifecycle('mobile WebKit', inspectionWebKit, desktop);

    await writeFile(join(OUTPUT, 'territory-mobile-render-metrics.json'), `${JSON.stringify({
      desktop,
      mobileChromium,
      mobileWebKit,
      inspectionChromium,
      inspectionWebKit,
    }, null, 2)}\n`);
  } finally {
    await chromiumBrowser.close();
    await webkitBrowser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
