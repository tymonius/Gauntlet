import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');
const CARD_WIDTH = 240;
const CARD_HEIGHT = 336;
const TERRITORY_WIDTH = 336;
const TERRITORY_HEIGHT = 240;
const EXPECTED_PLAYABLE_CARDS = 128;
const EXPECTED_TERRITORIES = 25;
const EXPECTED_PROPOSALS = [
  'De-escalation', 'Orderly Withdrawal', 'Capitulation', 'Open Channels',
  'Mutual Disarmament', 'Prisoner Exchange', 'Rebuilding Pact', 'Ultimatum',
  'Diplomatic Recognition',
];
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
    await page.waitForFunction(expected => document.querySelectorAll('.full-card-review-frame').length === expected, EXPECTED_PLAYABLE_CARDS);
    await page.waitForFunction(expected => document.querySelectorAll('.territory-review-frame').length === expected, EXPECTED_TERRITORIES);
    await page.waitForFunction(expected => document.querySelectorAll('.proposal-review-pair').length === expected, EXPECTED_PROPOSALS.length);
    await page.waitForFunction(expected => {
      const cards = [...document.querySelectorAll('.proposal-card')];
      return cards.length === expected * 2
        && cards.every(card => card.dataset.parchmentLoaded === 'true')
        && cards.every(card => card.dataset.titleFit === 'true')
        && cards.every(card => card.querySelector('.card-interior')?.style.getPropertyValue('--art-height'))
        && [...document.querySelectorAll('.proposal-ratified-panel .proposal-wax-seal')].every(image => image.complete && image.naturalWidth > 0);
    }, EXPECTED_PROPOSALS.length);
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

    const territoryFrameMetrics = await page.locator('.territory-review-frame').evaluateAll(frames => frames.map(frame => {
      const rect = frame.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    if (territoryFrameMetrics.some(metric => Math.abs(metric.width - TERRITORY_WIDTH) > 0.25 || Math.abs(metric.height - TERRITORY_HEIGHT) > 0.25)) {
      throw new Error(`Unexpected Territory review frame geometry: ${JSON.stringify(territoryFrameMetrics)}.`);
    }

    const proposalMetrics = await page.locator('.proposal-card').evaluateAll(cards => cards.map(card => {
      const interior = card.querySelector('.card-interior');
      const rect = card.getBoundingClientRect();
      const seal = card.querySelector('.proposal-wax-seal');
      return {
        name: card.querySelector('.card-title')?.textContent?.trim(),
        type: card.querySelector('.card-footer span:nth-child(2)')?.textContent?.trim(),
        width: rect.width,
        height: rect.height,
        artHeight: interior?.style.getPropertyValue('--art-height'),
        rulesScale: getComputedStyle(card).getPropertyValue('--rules-scale').trim() || '1',
        fitWarning: card.classList.contains('fit-warning'),
        titleFit: card.dataset.titleFit,
        parchmentLoaded: card.dataset.parchmentLoaded,
        sealNaturalWidth: seal?.naturalWidth || 0,
      };
    }));
    const proposalCount = await page.locator('#proposalReviewSections').getAttribute('data-proposal-count');
    if (proposalCount !== String(EXPECTED_PROPOSALS.length)) {
      throw new Error(`Proposal catalog count marker is incorrect: ${proposalCount}.`);
    }
    if (proposalMetrics.length !== EXPECTED_PROPOSALS.length * 2) {
      throw new Error(`Expected ${EXPECTED_PROPOSALS.length * 2} Proposal faces, found ${proposalMetrics.length}.`);
    }
    for (const name of EXPECTED_PROPOSALS) {
      const faces = proposalMetrics.filter(metric => metric.name === name);
      if (faces.length !== 2 || !faces.some(face => face.type === 'Proposal') || !faces.some(face => face.type === 'Treaty Article')) {
        throw new Error(`Proposal pair is incomplete for ${name}: ${JSON.stringify(faces)}.`);
      }
    }
    for (const metric of proposalMetrics) {
      if (Math.abs(metric.width - CARD_WIDTH) > 0.25 || Math.abs(metric.height - CARD_HEIGHT) > 0.25) throw new Error(`Unexpected Proposal dimensions for ${metric.name} ${metric.type}: ${metric.width} × ${metric.height}.`);
      if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') throw new Error(`Proposal face does not fit or load correctly: ${JSON.stringify(metric)}.`);
      if (metric.type === 'Treaty Article' && !metric.sealNaturalWidth) throw new Error(`Ratified Proposal seal failed to load: ${JSON.stringify(metric)}.`);
    }

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
    await page.locator('#proposal-diplomatic-recognition').screenshot({ path: join(OUTPUT, 'proposal-diplomatic-recognition-pair.png') });

    const playablePage = await context.newPage();
    await playablePage.goto(`${baseUrl}/card-design/card-review-render.html?fit=production&card=neutral-rallying-cry`, { waitUntil: 'load' });
    await playablePage.waitForSelector('.gauntlet-card');
    await playablePage.waitForFunction(() => document.body.dataset.renderReady === 'true');
    const playableSmoke = await playablePage.locator('.gauntlet-card').evaluate(card => ({
      title: card.querySelector('.card-title')?.textContent?.trim(),
      fitWarning: card.classList.contains('fit-warning'),
      titleFit: card.dataset.titleFit,
      productionFit: card.dataset.productionFit,
      parchmentLoaded: card.dataset.parchmentLoaded,
    }));
    if (playableSmoke.title !== 'Rallying Cry' || playableSmoke.fitWarning || playableSmoke.titleFit !== 'true' || playableSmoke.parchmentLoaded !== 'true') {
      throw new Error(`Canonical playable-card review renderer failed smoke test: ${JSON.stringify(playableSmoke)}.`);
    }
    await playablePage.locator('.gauntlet-card').screenshot({ path: join(OUTPUT, 'playable-card-review-smoke.png'), omitBackground: true });
    await playablePage.close();

    const territoryPage = await context.newPage();
    await territoryPage.goto(`${baseUrl}/card-design/territory-review-render.html?territory=territory-smuggler-s-pass`, { waitUntil: 'load' });
    await territoryPage.waitForSelector('.territory-card');
    await territoryPage.waitForFunction(() => document.body.dataset.renderReady === 'true');
    const territorySmoke = await territoryPage.locator('.territory-card').evaluate(card => ({
      title: card.querySelector('.territory-title')?.textContent?.trim(),
      fitWarning: card.classList.contains('fit-warning'),
      titleFit: card.dataset.titleFit,
      effectScale: card.dataset.effectScale,
      parchmentLoaded: card.dataset.parchmentLoaded,
      version: card.querySelector('.territory-footer span:last-child')?.textContent?.trim(),
    }));
    if (territorySmoke.title !== "Smuggler's Run" || territorySmoke.fitWarning || territorySmoke.titleFit !== 'true' || territorySmoke.parchmentLoaded !== 'true' || territorySmoke.version !== 'v0.6.4-candidate') {
      throw new Error(`v0.6.4 candidate Territory review renderer failed smoke test: ${JSON.stringify(territorySmoke)}.`);
    }
    await territoryPage.locator('.territory-card').screenshot({ path: join(OUTPUT, 'territory-review-smoke.png'), omitBackground: true });
    await territoryPage.close();

    await writeFile(join(OUTPUT, 'metrics.json'), `${JSON.stringify({
      fonts,
      playableCardCount: EXPECTED_PLAYABLE_CARDS,
      territoryCardCount: EXPECTED_TERRITORIES,
      proposalCount: EXPECTED_PROPOSALS.length,
      playableSmoke,
      territorySmoke,
      proposals: proposalMetrics,
      cards: metrics,
    }, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
