import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');
const TERRITORY_ID = 'territory-smuggler-s-pass';
const CARD_WIDTH = 336;
const CARD_HEIGHT = 240;

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

async function renderMetrics(browser, baseUrl, contextOptions, screenshotPath) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/card-design/territory-review-render.html?territory=${TERRITORY_ID}`, { waitUntil: 'load' });
    await page.waitForSelector('.territory-card');
    await page.waitForFunction(() => document.body.dataset.renderReady === 'true');
    await page.evaluate(async () => document.fonts?.ready);
    await page.waitForTimeout(100);

    const metrics = await page.locator('.territory-card').evaluate(card => {
      const cardRect = card.getBoundingClientRect();
      const art = card.querySelector('.territory-art');
      const artRect = art?.getBoundingClientRect();
      const effect = card.querySelector('.territory-effect p');
      const effectStyle = effect ? getComputedStyle(effect) : null;
      const rootStyle = getComputedStyle(document.documentElement);
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
        textSizeAdjust: rootStyle.textSizeAdjust || rootStyle.webkitTextSizeAdjust || '',
      };
    });

    if (screenshotPath) await page.locator('.territory-card').screenshot({ path: screenshotPath, omitBackground: true });
    return metrics;
  } finally {
    await context.close();
  }
}

function assertClose(label, a, b, tolerance = 0.5) {
  if (Math.abs(a - b) > tolerance) {
    throw new Error(`${label} differs between desktop and mobile renders: ${a} vs ${b}.`);
  }
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.'); }

  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await renderMetrics(browser, baseUrl, {
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    });
    const mobile = await renderMetrics(browser, baseUrl, {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    }, join(OUTPUT, 'territory-mobile-render-smoke.png'));

    for (const [label, metric] of [['desktop', desktop], ['mobile', mobile]]) {
      if (Math.abs(metric.width - CARD_WIDTH) > 0.25 || Math.abs(metric.height - CARD_HEIGHT) > 0.25) {
        throw new Error(`Unexpected ${label} Territory geometry: ${JSON.stringify(metric)}.`);
      }
      if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') {
        throw new Error(`${label} Territory render does not fit or load correctly: ${JSON.stringify(metric)}.`);
      }
      if (!metric.artWidth || !metric.artHeight) {
        throw new Error(`${label} Territory artwork window collapsed: ${JSON.stringify(metric)}.`);
      }
    }

    if (mobile.textSizeAdjust !== '100%') {
      throw new Error(`Mobile Territory render did not lock browser text sizing: ${JSON.stringify(mobile)}.`);
    }

    assertClose('Artwork height', desktop.artHeight, mobile.artHeight);
    assertClose('Artwork width', desktop.artWidth, mobile.artWidth);
    assertClose('Effect font size', desktop.effectFontSize, mobile.effectFontSize, 0.05);
    assertClose('Effect line height', desktop.effectLineHeight, mobile.effectLineHeight, 0.05);
    if (desktop.effectScale !== mobile.effectScale) {
      throw new Error(`Effect fitting differs between desktop and mobile renders: ${desktop.effectScale} vs ${mobile.effectScale}.`);
    }

    await writeFile(join(OUTPUT, 'territory-mobile-render-metrics.json'), `${JSON.stringify({ desktop, mobile }, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
