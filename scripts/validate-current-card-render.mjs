import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrentGameAuthority, validateCurrentGameAuthority, CURRENT_GAME_AUTHORITY_SOURCE } from './current-game-authority.mjs';
import { surfaceCssPixels } from '../card-design/production-surface.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'current-card-candidates');
const { width: CARD_WIDTH, height: CARD_HEIGHT } = surfaceCssPixels('portrait');
const EXPECTED_CATALOG_COUNT = 142;

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

function validateAuthority(authority) {
  const cards = authority.gameplay?.cards;
  validateCurrentGameAuthority(authority);
  if (!Array.isArray(cards) || cards.length !== EXPECTED_CATALOG_COUNT) {
    throw new Error(`Card render validation expected ${EXPECTED_CATALOG_COUNT} current playable cards; found ${Array.isArray(cards) ? cards.length : 0}.`);
  }
  if (cards.some(card => card.id === 'inquisition-no-martyrs')) {
    throw new Error('Retired No Martyrs remains in the current playable-card pool.');
  }
  if (!cards.some(card => card.id === 'inquisition-malleus-maleficarum')) {
    throw new Error('Malleus Maleficarum is missing from the current playable-card pool.');
  }
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required.'); }

  const authority = await loadCurrentGameAuthority();
  validateAuthority(authority);
  const sourcePath = CURRENT_GAME_AUTHORITY_SOURCE;
  const source = { cards: authority.gameplay.cards };
  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  const metrics = [];

  try {
    const catalogPage = await context.newPage();
    await catalogPage.goto(`${baseUrl}/card-design/?type=playable#playable-cards`, { waitUntil: 'load' });
    await catalogPage.waitForFunction(() => document.body.dataset.currentGameCards === 'ready');
    const catalogState = await catalogPage.evaluate(() => ({
      playableFrames: document.querySelectorAll('.full-card-review-frame').length,
      playableCounts: [...document.querySelectorAll('[data-playable-count]')].map(node => node.textContent?.trim()),
      retiredNoMartyrsPresent: [...document.querySelectorAll('#playableReviewSections .full-card-review-frame')]
        .some(frame => new URL(frame.src, window.location.href).searchParams.get('card') === 'inquisition-no-martyrs'),
      allegianceCounts: Object.fromEntries(
        ['neutral', 'military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']
          .map(allegiance => [allegiance, document.querySelectorAll(`#playable-${allegiance} .specimen-column`).length]),
      ),
      authority: document.body.dataset.currentGameAuthority,
    }));
    const allegianceCountsCorrect = catalogState.allegianceCounts.neutral === 52
      && ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']
        .every(allegiance => catalogState.allegianceCounts[allegiance] === 15);
    if (catalogState.playableFrames !== EXPECTED_CATALOG_COUNT
      || catalogState.playableCounts.some(value => value !== String(EXPECTED_CATALOG_COUNT))
      || catalogState.retiredNoMartyrsPresent
      || !allegianceCountsCorrect
      || catalogState.authority !== '/game-data/current-game.json') {
      throw new Error(`Current-game catalog integration is incomplete: ${JSON.stringify(catalogState)}.`);
    }
    await catalogPage.close();

    for (const sourceCard of source.cards) {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/card-design/face-render.html?id=${encodeURIComponent(`card:${sourceCard.id}`)}`, { waitUntil: 'load' });
      await page.waitForSelector('.gauntlet-card');
      await page.waitForFunction(() => document.body.dataset.renderReady === 'true');
      await page.evaluate(async () => document.fonts?.ready);
      await page.waitForTimeout(100);

      const metric = await page.locator('.gauntlet-card').evaluate(card => {
        const rect = card.getBoundingClientRect();
        const rulesScaleText = getComputedStyle(card).getPropertyValue('--rules-scale').trim() || '1';
        const labels = [...card.querySelectorAll('.rule-section h4')].map(node => node.textContent?.trim().replace(/\s+/g, ' '));
        return {
          title: card.querySelector('.card-title')?.textContent?.trim(),
          width: rect.width,
          height: rect.height,
          fitWarning: card.classList.contains('fit-warning'),
          titleFit: card.dataset.titleFit,
          productionFit: card.dataset.productionFit,
          parchmentLoaded: card.dataset.parchmentLoaded,
          rulesScale: Number(rulesScaleText),
          labels,
          arcaneMarkerCount: card.querySelectorAll('.card-title .arcane-trait-marker').length,
          version: card.querySelector('.card-footer span:nth-child(3)')?.textContent?.trim() || '',
          gameplayAuthority: document.body.dataset.gameplayAuthority || '',
          visualAuthority: document.body.dataset.visualAuthority || '',
        };
      });

      if (metric.title !== sourceCard.name) {
        throw new Error(`Current card title mismatch for ${sourceCard.id}: ${JSON.stringify(metric)}.`);
      }
      if (Math.abs(metric.width - CARD_WIDTH) > 0.25 || Math.abs(metric.height - CARD_HEIGHT) > 0.25) {
        throw new Error(`Unexpected current card dimensions for ${sourceCard.name}: ${metric.width} × ${metric.height}.`);
      }
      if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') {
        throw new Error(`Current card does not fit or load correctly: ${JSON.stringify(metric)}.`);
      }
      if (!Number.isFinite(metric.rulesScale) || metric.rulesScale <= 0) {
        throw new Error(`Invalid rules scale for ${sourceCard.name}: ${JSON.stringify(metric)}.`);
      }
      if (
        metric.version !== authority.displayVersion
        || metric.gameplayAuthority !== '/game-data/current-game.json'
        || metric.visualAuthority !== '/game-data/current-game.json'
      ) {
        throw new Error(`Current card render is not using the current-game authority: ${JSON.stringify(metric)}.`);
      }
      if (metric.arcaneMarkerCount !== (sourceCard.trait === 'Arcane' ? 1 : 0)) {
        throw new Error(`Arcane title marker mismatch for ${sourceCard.name}: ${JSON.stringify(metric)}.`);
      }

      const expectedLabels = sourceCard.effects.map(effect => effect.label);
      if (JSON.stringify(metric.labels) !== JSON.stringify(expectedLabels)) {
        throw new Error(`Current card effect headings drifted for ${sourceCard.name}: ${JSON.stringify(metric.labels)}.`);
      }

      await page.locator('.gauntlet-card').screenshot({
        path: join(OUTPUT, `${slugify(sourceCard.id)}.png`),
        omitBackground: true,
      });
      metrics.push({ id: sourceCard.id, ...metric });
      await page.close();
    }

    await writeFile(join(OUTPUT, 'metrics.json'), `${JSON.stringify({
      authority: CURRENT_GAME_AUTHORITY_SOURCE,
      source: sourcePath,
      catalogCount: EXPECTED_CATALOG_COUNT,
      cards: metrics,
    }, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
