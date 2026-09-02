import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrentGameAuthority } from './current-game-authority.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');
const CARD_WIDTH = 240;
const CARD_HEIGHT = 336;
const EXPECTED_RITUAL = 'Ritual of Ascension';
const RITUAL_CARD_BACK_ID = 'ritual-ascension';
const RITUAL_FRONT_ART_PATH = '/images/artwork/cards/mystics/rites-and-rituals/ritual-of-ascension.png';
const RITUAL_CARD_BACK_ART_PATH = '/images/artwork/cardbacks/mystics/ritual-of-ascension.png';
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

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required.'); }

  const authority = await loadCurrentGameAuthority();
  const expectedRites = (authority.mystics?.rites || []).map(rite => rite.name);
  if (!expectedRites.length) throw new Error('Current-game authority has no Mystics Rite pool.');
  const expectedCardFaces = expectedRites.length * 2 + 1;

  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/card-design/?type=rite#rite-cards`, { waitUntil: 'load' });
    const expectedFrames = expectedRites.length * 2 + 2;
    await page.waitForFunction(expected => (
      document.querySelectorAll('#rite-cards .component-review-frame').length === expected
    ), expectedFrames);
    await page.locator('#rite-cards .component-review-frame').evaluateAll(frames => {
      frames.forEach(frame => { frame.loading = 'eager'; });
    });
    await page.waitForFunction(() => [...document.querySelectorAll('#rite-cards .component-review-frame')].every(frame => (
      frame.contentDocument?.body?.dataset.renderReady === 'true'
    )));
    await page.evaluate(async () => document.fonts?.ready);
    await page.waitForTimeout(150);

    const metrics = await page.locator('#rite-cards .component-review-frame').evaluateAll(frames => frames.flatMap(frame => {
      const doc = frame.contentDocument;
      const card = doc?.querySelector('.rite-card');
      if (!card) return [];
      const view = doc.defaultView;
      const rect = card.getBoundingClientRect();
      const art = card.querySelector('.card-art')?.getBoundingClientRect();
      const completed = card.classList.contains('completed-rite-card');
      const ritual = card.classList.contains('ritual-card');
      const abilityNames = [...card.querySelectorAll('.rite-unlock-section strong')].map(node => node.textContent?.trim());
      const completedImage = card.querySelector('.rite-completed-panel > img');
      const completedImageRect = completedImage?.getBoundingClientRect();
      const ritualImage = ritual ? card.querySelector('.card-art > img') : null;
      return [{
        name: card.querySelector('.card-title')?.textContent?.trim(),
        type: card.querySelector('.card-footer span:nth-child(2)')?.textContent?.trim(),
        width: rect.width,
        height: rect.height,
        artWidth: art?.width || 0,
        artHeight: art?.height || 0,
        fitWarning: card.classList.contains('fit-warning'),
        titleFit: card.dataset.titleFit,
        parchmentLoaded: card.dataset.parchmentLoaded,
        rulesScale: Number.parseFloat(view?.getComputedStyle(card).getPropertyValue('--rules-scale')) || 1,
        completed,
        ritual,
        cardBack: card.dataset.cardBack,
        artworkPending: Boolean(card.querySelector('.ritual-art-pending')),
        ruleLabels: [...card.querySelectorAll('.rule-section h4')].map(node => node.textContent?.trim()),
        ruleText: [...card.querySelectorAll('.rule-section p')].map(node => node.textContent?.trim()).join(' '),
        version: card.querySelector('.card-footer span:last-child')?.textContent?.trim() || '',
        abilityNames,
        completedImageWidth: completedImageRect?.width || 0,
        completedImageHeight: completedImageRect?.height || 0,
        completedImageNaturalWidth: completedImage?.naturalWidth || 0,
        completedImageNaturalHeight: completedImage?.naturalHeight || 0,
        completedImagePath: completedImage ? new URL(completedImage.currentSrc || completedImage.src).pathname : '',
        ritualImageNaturalWidth: ritualImage?.naturalWidth || 0,
        ritualImageNaturalHeight: ritualImage?.naturalHeight || 0,
        ritualImagePath: ritualImage ? new URL(ritualImage.currentSrc || ritualImage.src).pathname : '',
      }];
    }));

    if (metrics.length !== expectedCardFaces) throw new Error(`Expected ${expectedRites.length * 2} Rite faces plus the Ritual, found ${metrics.length} cards.`);
    for (const name of expectedRites) {
      const faces = metrics.filter(metric => metric.name === name);
      if (faces.length !== 2 || !faces.some(face => face.type === 'Rite') || !faces.some(face => face.type === 'Completed Rite')) {
        throw new Error(`Rite pair is incomplete for ${name}: ${JSON.stringify(faces)}.`);
      }
    }

    const ritual = metrics.find(metric => metric.name === EXPECTED_RITUAL);
    if (!ritual || !ritual.ritual || ritual.type !== 'Ritual') {
      throw new Error(`Ritual of Ascension card is missing or mislabeled: ${JSON.stringify(ritual)}.`);
    }
    if (ritual.cardBack !== RITUAL_CARD_BACK_ID) {
      throw new Error(`Ritual of Ascension is not marked for its dedicated card back: ${JSON.stringify(ritual)}.`);
    }
    if (ritual.artworkPending) {
      throw new Error(`Ritual of Ascension must use its approved front artwork rather than the pending state: ${JSON.stringify(ritual)}.`);
    }
    if (ritual.ritualImageNaturalWidth <= 0 || ritual.ritualImageNaturalHeight <= 0) {
      throw new Error(`Ritual of Ascension front artwork did not load: ${JSON.stringify(ritual)}.`);
    }
    if (ritual.ritualImagePath !== RITUAL_FRONT_ART_PATH) {
      throw new Error(`Ritual of Ascension uses the wrong front artwork: ${JSON.stringify(ritual)}.`);
    }
    const expectedRitualRules = ['Begin', 'Convergence', 'Complete', 'Interrupted'];
    if (expectedRitualRules.some(label => !ritual.ruleLabels.includes(label))) {
      throw new Error(`Ritual of Ascension is missing a required rules section: ${JSON.stringify(ritual)}.`);
    }
    for (const phrase of ['Hand', 'Discard Pile', 'Graveyard', 'add +1', 'immediately win the game', 'Withdrawal neither completes nor interrupts']) {
      if (!ritual.ruleText.includes(phrase)) {
        throw new Error(`Ritual of Ascension is missing canonical rule text (${phrase}): ${JSON.stringify(ritual)}.`);
      }
    }

    const ritualReview = await page.locator('#ritual-ascension').evaluate(section => {
      const frames = [...section.querySelectorAll('.component-review-frame')];
      const backFrame = frames.find(frame => new URL(frame.src).searchParams.get('side') === 'reverse') || frames[1];
      const backDocument = backFrame?.contentDocument;
      const back = backDocument?.querySelector('.ritual-card-back');
      const backRect = back?.getBoundingClientRect();
      const image = back?.querySelector('.ritual-card-back__image-window > img');
      return {
        standardCardBack: section.dataset.standardCardBack,
        completedFaces: frames.reduce((count, frame) => count + (frame.contentDocument?.querySelectorAll('.completed-rite-card').length || 0), 0),
        faces: section.querySelectorAll('.rite-face').length,
        dedicatedBacks: frames.reduce((count, frame) => count + (frame.contentDocument?.querySelectorAll('.ritual-card-back').length || 0), 0),
        backWidth: backRect?.width || 0,
        backHeight: backRect?.height || 0,
        backImageNaturalWidth: image?.naturalWidth || 0,
        backImageNaturalHeight: image?.naturalHeight || 0,
        backImagePath: image ? new URL(image.currentSrc || image.src).pathname : '',
      };
    });
    if (ritualReview.standardCardBack !== undefined || ritualReview.completedFaces !== 0 || ritualReview.faces !== 2 || ritualReview.dedicatedBacks !== 1) {
      throw new Error(`Ritual review must contain one front and one dedicated card back, not a completed-state pair or standard back: ${JSON.stringify(ritualReview)}.`);
    }
    if (Math.abs(ritualReview.backWidth - CARD_WIDTH) > 0.25 || Math.abs(ritualReview.backHeight - CARD_HEIGHT) > 0.25) {
      throw new Error(`Ritual card back has unexpected dimensions: ${JSON.stringify(ritualReview)}.`);
    }
    if (ritualReview.backImageNaturalWidth <= 0 || ritualReview.backImageNaturalHeight <= 0) {
      throw new Error(`Ritual card-back artwork did not load: ${JSON.stringify(ritualReview)}.`);
    }
    if (ritualReview.backImagePath !== RITUAL_CARD_BACK_ART_PATH) {
      throw new Error(`Ritual of Ascension uses the wrong card-back artwork: ${JSON.stringify(ritualReview)}.`);
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
      if (metric.version !== authority.displayVersion) {
        throw new Error(`Mystics component footer version ${JSON.stringify(metric.version)} does not match current authority ${JSON.stringify(authority.displayVersion)}: ${JSON.stringify(metric)}.`);
      }
      if (metric.completed) {
        const expected = ['Invocation', 'Transmutation', 'Convergence', 'Ritual of Ascension'];
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
    await page.locator('#ritual-ascension').screenshot({ path: join(OUTPUT, 'ritual-of-ascension-review.png') });
    console.log(JSON.stringify({ metrics, ritualReview }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
