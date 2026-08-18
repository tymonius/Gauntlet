import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'v064-card-candidates');
const SOURCE_PATH = join(ROOT, 'docs', 'v0.6.4-card-additions.json');
const CARD_WIDTH = 240;
const CARD_HEIGHT = 336;
const EXPECTED_CANDIDATE_COUNT = 14;
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

function validateSource(source) {
  if (source.version !== 'v0.6.4-candidate' || source.base_version !== 'v0.6.3') {
    throw new Error('Card render validation requires the v0.6.4 candidate overlay on v0.6.3.');
  }
  if (source.ready_for_game_data !== false) {
    throw new Error('Card candidate source must remain outside canonical game data.');
  }
  if (!Array.isArray(source.cards) || source.cards.length !== EXPECTED_CANDIDATE_COUNT) {
    throw new Error(`Expected ${EXPECTED_CANDIDATE_COUNT} card candidates.`);
  }
  if (source.target_pool_sizes?.total_playable_cards !== EXPECTED_CATALOG_COUNT) {
    throw new Error(`Expected catalog target ${EXPECTED_CATALOG_COUNT}.`);
  }
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required.'); }

  const source = JSON.parse(await readFile(SOURCE_PATH, 'utf8'));
  validateSource(source);
  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  const metrics = [];

  try {
    const catalogPage = await context.newPage();
    await catalogPage.goto(`${baseUrl}/card-design/#playable-cards`, { waitUntil: 'load' });
    await catalogPage.waitForFunction(() => document.body.dataset.v064Cards === 'ready');
    const catalogState = await catalogPage.evaluate(() => ({
      candidates: document.querySelectorAll('[data-v064-candidate-card]').length,
      playableFrames: document.querySelectorAll('.full-card-review-frame').length,
      playableCounts: [...document.querySelectorAll('[data-playable-count]')].map(node => node.textContent?.trim()),
      allegianceCounts: Object.fromEntries(
        ['neutral', 'military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']
          .map(allegiance => [allegiance, document.querySelectorAll(`#playable-${allegiance} .specimen-column`).length]),
      ),
    }));
    const allegianceCountsCorrect = catalogState.allegianceCounts.neutral === 52
      && ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']
        .every(allegiance => catalogState.allegianceCounts[allegiance] === 15);
    if (catalogState.candidates !== EXPECTED_CANDIDATE_COUNT
      || catalogState.playableFrames !== EXPECTED_CATALOG_COUNT
      || catalogState.playableCounts.some(value => value !== String(EXPECTED_CATALOG_COUNT))
      || !allegianceCountsCorrect) {
      throw new Error(`Candidate catalog integration is incomplete: ${JSON.stringify(catalogState)}.`);
    }
    await catalogPage.close();

    for (const sourceCard of source.cards) {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/card-design/card-review-render.html?fit=production&card=${encodeURIComponent(sourceCard.id)}`, { waitUntil: 'load' });
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
          gameVersion: window.GAUNTLET_TTS_CATALOG?.gameVersion,
          sourceHierarchy: window.GAUNTLET_TTS_CATALOG?.sourceHierarchy,
        };
      });

      if (metric.title !== sourceCard.name) {
        throw new Error(`Candidate title mismatch for ${sourceCard.id}: ${JSON.stringify(metric)}.`);
      }
      if (Math.abs(metric.width - CARD_WIDTH) > 0.25 || Math.abs(metric.height - CARD_HEIGHT) > 0.25) {
        throw new Error(`Unexpected candidate dimensions for ${sourceCard.name}: ${metric.width} × ${metric.height}.`);
      }
      if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') {
        throw new Error(`Candidate card does not fit or load correctly: ${JSON.stringify(metric)}.`);
      }
      if (!Number.isFinite(metric.rulesScale) || metric.rulesScale <= 0) {
        throw new Error(`Invalid rules scale for ${sourceCard.name}: ${JSON.stringify(metric)}.`);
      }
      if (metric.gameVersion !== 'v0.6.4 candidate'
        || metric.sourceHierarchy?.[0] !== '/docs/v0.6.4-card-additions.json') {
        throw new Error(`Candidate render is not using the staged v0.6.4 source: ${JSON.stringify(metric)}.`);
      }
      if (metric.arcaneMarkerCount !== (sourceCard.trait === 'Arcane' ? 1 : 0)) {
        throw new Error(`Arcane title marker mismatch for ${sourceCard.name}: ${JSON.stringify(metric)}.`);
      }

      const expectedLabels = sourceCard.effects.map(effect => effect.label);
      if (JSON.stringify(metric.labels) !== JSON.stringify(expectedLabels)) {
        throw new Error(`Candidate effect headings drifted for ${sourceCard.name}: ${JSON.stringify(metric.labels)}.`);
      }

      await page.locator('.gauntlet-card').screenshot({
        path: join(OUTPUT, `${slugify(sourceCard.id)}.png`),
        omitBackground: true,
      });
      metrics.push({ id: sourceCard.id, ...metric });
      await page.close();
    }

    await writeFile(join(OUTPUT, 'metrics.json'), `${JSON.stringify({
      candidateCount: EXPECTED_CANDIDATE_COUNT,
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
