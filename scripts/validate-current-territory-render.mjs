import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrentGameAuthority, validateCurrentGameAuthority, CURRENT_GAME_AUTHORITY_SOURCE } from './current-game-authority.mjs';
import {
  CSS_PIXELS_PER_INCH,
  surfaceCssPixels,
  surfaceDeviceScale,
  surfaceRasterPixels,
} from '../card-design/production-surface.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'current-territories');
const { width: CSS_WIDTH, height: CSS_HEIGHT } = surfaceCssPixels('landscape');
const { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT } = surfaceRasterPixels('landscape');
const DEVICE_SCALE = surfaceDeviceScale('landscape');
const MINIMUM_READABLE_EFFECT_SCALE = 0.78;
const MINIMUM_ARTWORK_HEIGHT = 0.78 * CSS_PIXELS_PER_INCH;

function contentType(path) {
  const extension = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.avif': 'image/avif',
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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required.'); }

  const authority = await loadCurrentGameAuthority();
  const sourcePath = CURRENT_GAME_AUTHORITY_SOURCE;
  const source = { territories: authority.gameplay?.territories || [] };
  validateCurrentGameAuthority(authority);
  if (source.territories.length !== 25) {
    throw new Error(`Territory render validation expected 25 current Territories; found ${source.territories.length}.`);
  }

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 620, height: 500 },
    deviceScaleFactor: DEVICE_SCALE,
  });
  const page = await context.newPage();
  const metrics = [];

  try {
    for (const territory of source.territories) {
      await page.goto(
        `${baseUrl}/card-design/face-render.html?id=${encodeURIComponent(`territory:${territory.id}`)}`,
        { waitUntil: 'load' },
      );
      await page.waitForFunction(() => document.body.dataset.renderReady === 'true');
      await page.evaluate(async () => document.fonts?.ready);
      await page.waitForTimeout(75);

      const metric = await page.locator('.territory-card').evaluate(card => {
        const rect = card.getBoundingClientRect();
        const art = card.querySelector('.territory-art')?.getBoundingClientRect();
        const effect = card.querySelector('.territory-effect');
        const version = card.querySelector('.territory-footer span:nth-child(3)')?.textContent?.trim() || '';
        return {
          width: rect.width,
          height: rect.height,
          fitWarning: card.classList.contains('fit-warning'),
          titleFit: card.dataset.titleFit,
          effectScale: Number.parseFloat(card.dataset.effectScale || '0'),
          artHeight: Number.parseFloat(card.dataset.artHeight || '0'),
          artWidth: Number.parseFloat(card.dataset.artWidth || '0'),
          artSpansBody: card.dataset.artSpansBody,
          parchmentLoaded: card.dataset.parchmentLoaded,
          artworkLoaded: card.dataset.artworkLoaded,
          artworkSource: card.dataset.artworkSource || '',
          renderedText: [...(effect?.querySelectorAll('p') || [])]
            .map(paragraph => paragraph.textContent?.trim() || '')
            .filter(Boolean)
            .join('\n'),
          version,
          artRectHeight: art?.height || 0,
          artRectWidth: art?.width || 0,
          sourceHierarchy: window.GAUNTLET_TTS_CATALOG?.sourceHierarchy,
        };
      });
      metrics.push({ id: territory.id, name: territory.name, ...metric });

      if (Math.abs(metric.width - CSS_WIDTH) > 0.25 || Math.abs(metric.height - CSS_HEIGHT) > 0.25) {
        throw new Error(`Unexpected Territory dimensions for ${territory.name}: ${metric.width} × ${metric.height}.`);
      }
      if (metric.renderedText !== territory.text) {
        throw new Error(`Rendered Territory text drifted for ${territory.name}.`);
      }
      if (metric.version !== authority.displayVersion || metric.sourceHierarchy?.[0] !== '/game-data/current-game.json') {
        throw new Error(`Territory render is not using the current-game authority for ${territory.name}: ${JSON.stringify(metric)}.`);
      }
      if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') {
        throw new Error(`Territory does not fit or load correctly: ${JSON.stringify({ territory: territory.name, ...metric })}.`);
      }
      if (metric.effectScale < MINIMUM_READABLE_EFFECT_SCALE - 0.001) {
        throw new Error(`Territory typography fell below the readability floor: ${JSON.stringify({ territory: territory.name, ...metric })}.`);
      }
      if (metric.artworkLoaded !== 'true' || !metric.artworkSource) {
        throw new Error(`Territory artwork did not resolve: ${territory.name}.`);
      }
      if (metric.artHeight < MINIMUM_ARTWORK_HEIGHT - 0.5
        || metric.artWidth <= 0
        || metric.artSpansBody !== 'true') {
        throw new Error(`Territory artwork frame is too small or collapsed: ${JSON.stringify({ territory: territory.name, ...metric })}.`);
      }

      await page.locator('.territory-card').screenshot({
        path: join(OUTPUT, `${String(territory.number).padStart(2, '0')}-${slugify(territory.name)}.png`),
        omitBackground: true,
      });
    }

    await writeFile(join(OUTPUT, 'render-metrics.json'), `${JSON.stringify({
      authority: CURRENT_GAME_AUTHORITY_SOURCE,
      source: sourcePath,
      sourceIssue: source.source_issue,
      sourceVersion: source.version,
      cssPixels: { width: CSS_WIDTH, height: CSS_HEIGHT },
      outputPixels: { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT },
      minimumReadableEffectScale: MINIMUM_READABLE_EFFECT_SCALE,
      minimumArtworkHeight: MINIMUM_ARTWORK_HEIGHT,
      metrics,
    }, null, 2)}\n`);
    console.log(JSON.stringify({ authority: CURRENT_GAME_AUTHORITY_SOURCE, sourceIssue: source.source_issue, count: metrics.length, metrics }, null, 2));
  } finally {
    await context.close();
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
