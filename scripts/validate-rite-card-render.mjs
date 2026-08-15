import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');
const CARD_WIDTH = 240;
const CARD_HEIGHT = 336;
const EXPECTED_RITES = ['Rite of Echoes', 'Rite of Blood', 'Rite of Crossing'];
const EXPECTED_RITUAL = 'Ritual of Ascendance';
const COMPLETED_RITE_ART_PATH = '/images/artwork/supplemental/mystics/rite-completed.webp';
const COMPLETED_RITE_ART_WIDTH = 1448;
const COMPLETED_RITE_ART_HEIGHT = 1086;

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

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required.'); }

  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/card-design/#rite-cards`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.rite-card').length === 7);
    await page.waitForFunction(() => [...document.querySelectorAll('.rite-card')].every(card => (
      card.dataset.parchmentLoaded === 'true'
      && card.dataset.titleFit === 'true'
      && card.querySelector('.card-interior')?.style.getPropertyValue('--art-height')
    )));
    await page.waitForFunction(() => [...document.querySelectorAll('.completed-rite-card .rite-completed-panel > img')].every(image => (
      image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    )));
    await page.evaluate(async () => document.fonts?.ready);
    await page.waitForTimeout(150);

    const metrics = await page.locator('.rite-card').evaluateAll(cards => cards.map(card => {
      const rect = card.getBoundingClientRect();
      const art = card.querySelector('.card-art')?.getBoundingClientRect();
      const completed = card.classList.contains('completed-rite-card');
      const ritual = card.classList.contains('ritual-card');
      const abilityNames = [...card.querySelectorAll('.rite-unlock-section strong')].map(node => node.textContent?.trim());
      const completedImage = card.querySelector('.rite-completed-panel > img');
      const completedImageRect = completedImage?.getBoundingClientRect();
      return {
        name: card.querySelector('.card-title')?.textContent?.trim(),
        type: card.querySelector('.card-footer span:nth-child(2)')?.textContent?.trim(),
        width: rect.width,
        height: rect.height,
        artWidth: art?.width || 0,
        artHeight: art?.height || 0,
        fitWarning: card.classList.contains('fit-warning'),
        titleFit: card.dataset.titleFit,
        parchmentLoaded: card.dataset.parchmentLoaded,
        rulesScale: Number.parseFloat(getComputedStyle(card).getPropertyValue('--rules-scale')) || 1,
        completed,
        ritual,
        standardCardBack: card.dataset.cardBack,
        artworkPending: Boolean(card.querySelector('.ritual-art-pending')),
        ruleLabels: [...card.querySelectorAll('.rule-section h4')].map(node => node.textContent?.trim()),
        ruleText: [...card.querySelectorAll('.rule-section p')].map(node => node.textContent?.trim()).join(' '),
        abilityNames,
        completedImageWidth: completedImageRect?.width || 0,
        completedImageHeight: completedImageRect?.height || 0,
        completedImageNaturalWidth: completedImage?.naturalWidth || 0,
        completedImageNaturalHeight: completedImage?.naturalHeight || 0,
        completedImagePath: completedImage ? new URL(completedImage.currentSrc || completedImage.src).pathname : '',
      };
    }));

    if (metrics.length !== 7) throw new Error(`Expected 6 Rite faces plus the Ritual, found ${metrics.length} cards.`);
    for (const name of EXPECTED_RITES) {
      const faces = metrics.filter(metric => metric.name === name);
      if (faces.length !== 2 || !faces.some(face => face.type === 'Rite') || !faces.some(face => face.type === 'Completed Rite')) {
        throw new Error(`Rite pair is incomplete for ${name}: ${JSON.stringify(faces)}.`);
      }
    }

    const ritual = metrics.find(metric => metric.name === EXPECTED_RITUAL);
    if (!ritual || !ritual.ritual || ritual.type !== 'Ritual') {
      throw new Error(`Ritual of Ascendance card is missing or mislabeled: ${JSON.stringify(ritual)}.`);
    }
    if (ritual.standardCardBack !== 'standard') {
      throw new Error(`Ritual of Ascendance is not marked for the standard playable-card back: ${JSON.stringify(ritual)}.`);
    }
    if (!ritual.artworkPending) {
      throw new Error(`Ritual of Ascendance must visibly retain its artwork-pending state until approved art is committed: ${JSON.stringify(ritual)}.`);
    }
    const expectedRitualRules = ['Begin', 'Convergence', 'Complete', 'Interrupted'];
    if (expectedRitualRules.some(label => !ritual.ruleLabels.includes(label))) {
      throw new Error(`Ritual of Ascendance is missing a required rules section: ${JSON.stringify(ritual)}.`);
    }
    for (const phrase of ['Hand', 'Discard Pile', 'Graveyard', 'add +1', 'immediately win the game', 'Withdrawal neither completes nor interrupts']) {
      if (!ritual.ruleText.includes(phrase)) {
        throw new Error(`Ritual of Ascendance is missing canonical rule text (${phrase}): ${JSON.stringify(ritual)}.`);
      }
    }
    const ritualReview = await page.locator('#ritual-ascendance').evaluate(section => ({
      standardCardBack: section.dataset.standardCardBack,
      completedFaces: section.querySelectorAll('.completed-rite-card').length,
      faces: section.querySelectorAll('.rite-face').length,
    }));
    if (ritualReview.standardCardBack !== 'true' || ritualReview.completedFaces !== 0 || ritualReview.faces !== 1) {
      throw new Error(`Ritual review must be a single front using the standard card back, not a completed-state pair: ${JSON.stringify(ritualReview)}.`);
    }

    for (const metric of metrics) {
      if (Math.abs(metric.width - CARD_WIDTH) > 0.25 || Math.abs(metric.height - CARD_HEIGHT) > 0.25) {
        throw new Error(`Unexpected Mystics component dimensions: ${JSON.stringify(metric)}.`);
      }
      if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') {
        throw new Error(`Mystics component does not fit or load correctly: ${JSON.stringify(metric)}.`);
      }
      if (metric.rulesScale < 0.82 - 0.001) throw new Error(`Mystics component typography fell below the readability floor: ${JSON.stringify(metric)}.`);
      if (metric.artWidth <= 0 || metric.artHeight <= 0) throw new Error(`Mystics component artwork field collapsed: ${JSON.stringify(metric)}.`);
      if (metric.completed) {
        const expected = ['Invocation', 'Transmutation', 'Convergence', 'Ritual of Ascendance'];
        if (expected.some(name => !metric.abilityNames.includes(name))) throw new Error(`Completed Rite reference is incomplete: ${JSON.stringify(metric)}.`);
        if (metric.completedImageWidth <= 0 || metric.completedImageHeight <= 0 || metric.completedImageNaturalWidth <= 0 || metric.completedImageNaturalHeight <= 0) {
          throw new Error(`Completed Rite artwork did not render: ${JSON.stringify(metric)}.`);
        }
        if (metric.completedImageNaturalWidth !== COMPLETED_RITE_ART_WIDTH || metric.completedImageNaturalHeight !== COMPLETED_RITE_ART_HEIGHT) {
          throw new Error(`Completed Rite artwork was downsampled: ${JSON.stringify(metric)}.`);
        }
        if (metric.completedImagePath !== COMPLETED_RITE_ART_PATH) {
          throw new Error(`Completed Rite uses the wrong artwork: ${JSON.stringify(metric)}.`);
        }
      }
    }

    await page.locator('#rite-cards').screenshot({ path: join(OUTPUT, 'mystics-rite-card-review.png') });
    await page.locator('#ritual-ascendance').screenshot({ path: join(OUTPUT, 'ritual-of-ascendance-review.png') });
    console.log(JSON.stringify(metrics, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
