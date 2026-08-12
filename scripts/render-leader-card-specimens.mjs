import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');
const CARD_WIDTH = 240;
const CARD_HEIGHT = 336;
const EXPECTED_LEADERS = [
  'General', 'Commandant', 'Ambassador', 'Senator', 'Banker', 'Executive',
  'Ranger', 'Spymaster', 'Alchemist', 'Spirit Walker', 'Grand Inquisitor', 'Witch Hunter',
];

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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
        response.writeHead(403).end('Forbidden'); return;
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

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.'); }

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/card-design/#leader-cards`, { waitUntil: 'load' });
    await page.waitForSelector('.leader-card');
    await page.waitForFunction(expected => {
      const cards = [...document.querySelectorAll('.leader-card')];
      return cards.length === expected
        && cards.every(card => card.dataset.parchmentLoaded === 'true')
        && cards.every(card => card.dataset.titleFit === 'true')
        && cards.every(card => card.querySelector('.card-interior')?.style.getPropertyValue('--art-height'))
        && cards.every(card => {
          const image = card.querySelector('.card-art img');
          return image?.complete && image.naturalWidth > 0;
        });
    }, EXPECTED_LEADERS.length);
    await page.evaluate(async () => document.fonts?.ready);
    await page.waitForTimeout(150);

    const fonts = await page.evaluate(() => ({
      title: document.fonts.check('12px "p22-1722-pro"'),
      rules: document.fonts.check('12px "adobe-caslon-pro"'),
    }));
    if (!fonts.title || !fonts.rules) throw new Error(`Required Leader fonts failed to load: ${JSON.stringify(fonts)}`);

    const metrics = await page.locator('.leader-card').evaluateAll(cards => cards.map(card => {
      const interior = card.querySelector('.card-interior');
      const portrait = card.querySelector('.card-art img');
      const footer = card.querySelector('.card-footer');
      const footerRect = footer?.getBoundingClientRect();
      const footerSpans = [...(footer?.querySelectorAll('span') || [])];
      const footerClipped = Boolean(footerRect) && footerSpans.some(span => {
        const rect = span.getBoundingClientRect();
        return rect.top < footerRect.top - 0.5 || rect.bottom > footerRect.bottom + 0.5;
      });
      const rect = card.getBoundingClientRect();
      const symbol = card.querySelector('.leader-faction-emblem');
      const symbolStyle = symbol ? getComputedStyle(symbol) : null;
      const tintStyle = interior ? getComputedStyle(interior, '::after') : null;
      return {
        name: card.querySelector('.card-title')?.textContent?.trim(),
        faction: card.dataset.faction,
        width: rect.width, height: rect.height,
        artHeight: interior?.style.getPropertyValue('--art-height'),
        rulesScale: getComputedStyle(card).getPropertyValue('--rules-scale').trim() || '1',
        fitWarning: card.classList.contains('fit-warning'), titleFit: card.dataset.titleFit,
        parchmentLoaded: card.dataset.parchmentLoaded,
        portraitPath: portrait ? new URL(portrait.src).pathname : '', portraitNaturalWidth: portrait?.naturalWidth || 0,
        portraitFilter: portrait ? getComputedStyle(portrait).filter : '',
        symbolMask: symbolStyle?.maskImage || symbolStyle?.webkitMaskImage || 'none',
        tintBackground: tintStyle?.backgroundImage || 'none', footerClipped,
      };
    }));

    const names = metrics.map(metric => metric.name);
    if (metrics.length !== EXPECTED_LEADERS.length || EXPECTED_LEADERS.some(name => !names.includes(name))) {
      throw new Error(`Leader catalog is incomplete: ${JSON.stringify(names)}.`);
    }
    if (new Set(metrics.map(metric => metric.faction)).size !== 6) {
      throw new Error(`Expected all six Leader factions: ${JSON.stringify(metrics.map(metric => metric.faction))}.`);
    }

    for (const metric of metrics) {
      if (Math.abs(metric.width - CARD_WIDTH) > 0.25 || Math.abs(metric.height - CARD_HEIGHT) > 0.25) throw new Error(`Unexpected Leader dimensions for ${metric.name}: ${metric.width} × ${metric.height}.`);
      if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') throw new Error(`Leader face does not fit or load correctly: ${JSON.stringify(metric)}.`);
      if (!metric.portraitPath.startsWith('/images/') || metric.portraitPath.includes('/sketches/')) throw new Error(`Leader portrait is not using the full-color /images source: ${JSON.stringify(metric)}.`);
      if (!metric.portraitNaturalWidth || metric.portraitFilter !== 'none') throw new Error(`Leader portrait failed full-color validation: ${JSON.stringify(metric)}.`);
      if (metric.symbolMask === 'none' || metric.tintBackground === 'none') throw new Error(`Leader faction identity treatment failed: ${JSON.stringify(metric)}.`);
      if (metric.footerClipped) throw new Error(`Leader metadata footer is clipped: ${JSON.stringify(metric)}.`);
    }

    await page.locator('#leader-cards').screenshot({ path: join(OUTPUT, 'leader-card-review-page.png') });
    for (const metric of metrics) {
      const locator = page.locator('.leader-card').filter({ has: page.locator('.card-title', { hasText: metric.name }) }).first();
      await locator.screenshot({ path: join(OUTPUT, `${slugify(metric.name)}.png`), omitBackground: true });
    }
    await writeFile(join(OUTPUT, 'metrics.json'), `${JSON.stringify({ fonts, cards: metrics }, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
