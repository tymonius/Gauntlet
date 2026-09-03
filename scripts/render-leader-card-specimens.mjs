import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrentGameAuthority } from './current-game-authority.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');
const CARD_WIDTH = 240;
const CARD_HEIGHT = 336;
const TERRITORY_WIDTH = 336;
const TERRITORY_HEIGHT = 240;

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

async function startServer() {
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
  await new Promise(resolveDone => server.listen(0, '127.0.0.1', resolveDone));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required.'); }

  const current = await loadCurrentGameAuthority();
  const expectedVersion = String(current.displayVersion || current.version || '').trim();
  const expectedLeaderNames = (current.leaders || []).map(leader => leader.name);
  if (!expectedVersion || !expectedLeaderNames.length) throw new Error('Current-game authority is missing displayVersion or Leaders.');

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/card-design/?type=leader#leader-cards`, { waitUntil: 'load' });
    await page.waitForFunction(count => document.querySelectorAll('#leader-cards .component-review-frame').length === count, expectedLeaderNames.length);
    await page.waitForFunction(() => [...document.querySelectorAll('#leader-cards .component-review-frame')].every(frame => (
      frame.contentDocument?.body?.dataset.renderReady === 'true'
    )));

    const catalogLayout = await page.evaluate(() => {
      const bodyStyles = getComputedStyle(document.body);
      const gridMetrics = selector => {
        const grid = document.querySelector(selector);
        const children = [...(grid?.children || [])];
        const rows = children.slice(0, 6).map(child => child.getBoundingClientRect().top);
        const distinctRows = rows.filter((top, index) => rows.findIndex(other => Math.abs(other - top) < 0.5) === index);
        return {
          childCount: children.length,
          firstSixRows: distinctRows.length,
          columns: getComputedStyle(grid).gridTemplateColumns,
        };
      };
      return {
        cardWidth: bodyStyles.getPropertyValue('--catalog-card-width').trim(),
        territoryWidth: bodyStyles.getPropertyValue('--catalog-territory-width').trim(),
        deedWidth: bodyStyles.getPropertyValue('--catalog-deed-width').trim(),
        leaders: gridMetrics('.leader-review-grid'),
      };
    });
    if (!catalogLayout.cardWidth || !catalogLayout.territoryWidth || !catalogLayout.deedWidth) {
      throw new Error(`Catalog production-size variables are undefined: ${JSON.stringify(catalogLayout)}.`);
    }
    for (const [name, metrics] of Object.entries({
      leaders: catalogLayout.leaders,
    })) {
      if (metrics.childCount > 1 && metrics.firstSixRows >= Math.min(6, metrics.childCount)) {
        throw new Error(`Catalog ${name} grid collapsed to one item per row: ${JSON.stringify(metrics)}.`);
      }
    }

    const leaderPage = await context.newPage();
    const leaders = [];
    let fonts = null;
    for (const sourceLeader of current.leaders || []) {
      const renderId = `${sourceLeader.faction}-${slugify(sourceLeader.name)}`;
      await leaderPage.goto(`${baseUrl}/card-design/face-render.html?kind=leader&id=${encodeURIComponent(renderId)}&side=front`, { waitUntil: 'load' });
      await leaderPage.waitForFunction(() => document.body.dataset.renderReady === 'true');
      if (!fonts) {
        await leaderPage.evaluate(async () => document.fonts?.ready);
        fonts = await leaderPage.evaluate(() => ({
          title: document.fonts.check('12px "p22-1722-pro"'),
          rules: document.fonts.check('12px "adobe-caslon-pro"'),
        }));
        if (!fonts.title || !fonts.rules) throw new Error(`Required card fonts failed to load: ${JSON.stringify(fonts)}.`);
      }

      const leader = await leaderPage.locator('.leader-card').evaluate(card => {
        const rect = card.getBoundingClientRect();
        const portrait = card.querySelector('.card-art img');
        return {
          name: card.querySelector('.card-title')?.textContent?.trim() || '',
          faction: card.dataset.faction || '',
          width: rect.width,
          height: rect.height,
          fitWarning: card.classList.contains('fit-warning'),
          titleFit: card.dataset.titleFit,
          parchmentLoaded: card.dataset.parchmentLoaded,
          portraitLoaded: Boolean(portrait?.complete && portrait?.naturalWidth > 0),
          portraitPath: portrait ? new URL(portrait.src).pathname : '',
        };
      });
      leaders.push(leader);
      await leaderPage.locator('.leader-card').screenshot({
        path: join(OUTPUT, `${slugify(sourceLeader.name)}.png`),
        omitBackground: true,
      });
    }

    const readBankerComposition = () => leaderPage.locator('.leader-card').evaluate(card => {
      const image = card.querySelector('.card-art img');
      return {
        applied: card.dataset.artDirectionApplied || '',
        objectPosition: image?.style.objectPosition || '',
        transform: image?.style.transform || '',
        transformOrigin: image?.style.transformOrigin || '',
        focusX: image?.dataset.artFocusX || '',
        focusY: image?.dataset.artFocusY || '',
        zoom: image?.dataset.artZoom || '',
      };
    });

    await leaderPage.goto(`${baseUrl}/card-design/face-render.html?kind=leader&id=financiers-banker&side=front&rules=candidate`, { waitUntil: 'load' });
    await leaderPage.waitForFunction(() => document.body.dataset.renderReady === 'true');
    const bankerCandidateComposition = await readBankerComposition();

    await leaderPage.goto(`${baseUrl}/card-design/face-render.html?kind=leader&id=financiers-banker&side=front&rules=released`, { waitUntil: 'load' });
    await leaderPage.waitForFunction(() => document.body.dataset.renderReady === 'true');
    const bankerReleasedComposition = await readBankerComposition();

    if (
      bankerCandidateComposition.applied !== 'financiers-banker'
      || bankerReleasedComposition.applied !== 'financiers-banker'
      || JSON.stringify(bankerReleasedComposition) !== JSON.stringify(bankerCandidateComposition)
    ) {
      throw new Error(`Released Deckbuilder Banker composition drifted from Card Design: ${JSON.stringify({ bankerCandidateComposition, bankerReleasedComposition })}.`);
    }

    await leaderPage.close();

    const names = leaders.map(record => record.name);
    if (expectedLeaderNames.some(name => !names.includes(name))) throw new Error(`Leader catalog is incomplete: ${JSON.stringify(names)}.`);
    if (new Set(leaders.map(record => record.faction)).size !== 6) throw new Error('Leader catalog does not contain all six factions.');
    for (const leader of leaders) {
      if (Math.abs(leader.width - CARD_WIDTH) > 0.25 || Math.abs(leader.height - CARD_HEIGHT) > 0.25) throw new Error(`Unexpected Leader geometry: ${JSON.stringify(leader)}.`);
      if (leader.fitWarning || leader.titleFit !== 'true' || leader.parchmentLoaded !== 'true' || !leader.portraitLoaded) throw new Error(`Leader face failed production validation: ${JSON.stringify(leader)}.`);
      if (!leader.portraitPath.startsWith('/images/') || leader.portraitPath.includes('/sketches/')) throw new Error(`Leader portrait is not using the production image source: ${JSON.stringify(leader)}.`);
    }

    await page.locator('#leader-cards').screenshot({ path: join(OUTPUT, 'leader-card-review-page.png') });

    const playablePage = await context.newPage();
    const readPlayableMetrics = () => playablePage.locator('.gauntlet-card').evaluate(card => {
      const rect = card.getBoundingClientRect();
      const art = card.querySelector('.card-art img');
      const interior = card.querySelector('.card-interior');
      return {
        title: card.querySelector('.card-title')?.textContent?.trim(),
        width: rect.width,
        height: rect.height,
        fitWarning: card.classList.contains('fit-warning'),
        titleFit: card.dataset.titleFit,
        parchmentLoaded: card.dataset.parchmentLoaded,
        rulesScale: card.style.getPropertyValue('--rules-scale'),
        artHeight: interior?.style.getPropertyValue('--art-height') || '',
        artworkSource: art?.currentSrc || art?.src || '',
        artObjectPosition: art?.style.objectPosition || '',
        artTransform: art?.style.transform || '',
        artTransformOrigin: art?.style.transformOrigin || '',
        artCrop: art?.dataset.artCrop || '',
        artCropX: art?.dataset.artCropX || '',
        artCropY: art?.dataset.artCropY || '',
        artFocusX: art?.dataset.artFocusX || '',
        artFocusY: art?.dataset.artFocusY || '',
        artZoom: art?.dataset.artZoom || '',
        normalizedArtwork: document.body.dataset.printArtworkNormalized || '',
        normalizedArtworkSource: document.body.dataset.printArtworkSource || '',
      };
    });

    await playablePage.goto(`${baseUrl}/card-design/card-review-render.html?fit=production&card=neutral-rallying-cry`, { waitUntil: 'load' });
    await playablePage.waitForFunction(() => document.body.dataset.renderReady === 'true');
    const canonicalPlayable = await readPlayableMetrics();

    await playablePage.goto(`${baseUrl}/card-design/card-review-render.html?fit=production&printArtwork=normalized&card=neutral-rallying-cry`, { waitUntil: 'load' });
    await playablePage.waitForFunction(() => document.body.dataset.renderReady === 'true');
    const playable = await readPlayableMetrics();

    const parityFields = [
      'title', 'width', 'height', 'fitWarning', 'titleFit', 'parchmentLoaded',
      'rulesScale', 'artHeight', 'artObjectPosition', 'artTransform', 'artTransformOrigin',
      'artCrop', 'artCropX', 'artCropY', 'artFocusX', 'artFocusY', 'artZoom',
    ];
    const parityMismatch = parityFields.find(field => playable[field] !== canonicalPlayable[field]);
    if (
      playable.title !== 'Rallying Cry'
      || Math.abs(playable.width - CARD_WIDTH) > 0.25
      || Math.abs(playable.height - CARD_HEIGHT) > 0.25
      || playable.fitWarning
      || playable.titleFit !== 'true'
      || playable.parchmentLoaded !== 'true'
      || playable.normalizedArtwork !== 'true'
      || !playable.artworkSource.startsWith('blob:')
      || !playable.normalizedArtworkSource.includes('/images/artwork/cards/')
      || parityMismatch
    ) {
      throw new Error(`Current playable-card print parity failed: ${JSON.stringify({ canonicalPlayable, playable, parityMismatch })}.`);
    }
    await playablePage.locator('.gauntlet-card').screenshot({ path: join(OUTPUT, 'playable-card-review-smoke.png'), omitBackground: true });
    await playablePage.close();

    const territoryPage = await context.newPage();
    await territoryPage.goto(`${baseUrl}/card-design/territory-review-render.html?territory=territory-smuggler-s-pass`, { waitUntil: 'load' });
    await territoryPage.waitForFunction(() => document.body.dataset.renderReady === 'true');
    const territory = await territoryPage.locator('.territory-card').evaluate(card => {
      const rect = card.getBoundingClientRect();
      return {
        title: card.querySelector('.territory-title')?.textContent?.trim(),
        width: rect.width,
        height: rect.height,
        fitWarning: card.classList.contains('fit-warning'),
        titleFit: card.dataset.titleFit,
        parchmentLoaded: card.dataset.parchmentLoaded,
        version: card.querySelector('.territory-footer span:last-child')?.textContent?.trim(),
      };
    });
    if (
      territory.title !== "Smuggler's Run"
      || Math.abs(territory.width - TERRITORY_WIDTH) > 0.25
      || Math.abs(territory.height - TERRITORY_HEIGHT) > 0.25
      || territory.fitWarning
      || territory.titleFit !== 'true'
      || territory.parchmentLoaded !== 'true'
      || territory.version !== expectedVersion
    ) {
      throw new Error(`Current Territory renderer failed smoke validation: ${JSON.stringify(territory)}; expected ${expectedVersion}.`);
    }
    await territoryPage.locator('.territory-card').screenshot({ path: join(OUTPUT, 'territory-review-smoke.png'), omitBackground: true });
    await territoryPage.close();

    await writeFile(join(OUTPUT, 'metrics.json'), `${JSON.stringify({ currentVersion: current.version, displayVersion: expectedVersion, fonts, leaders, bankerCandidateComposition, bankerReleasedComposition, playable, territory }, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise(resolveDone => server.close(resolveDone));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
