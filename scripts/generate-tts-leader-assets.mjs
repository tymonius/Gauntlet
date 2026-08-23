import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  CURRENT_ALIAS_ROOT,
  loadCurrentLeaders,
  ROOT,
} from './tts-current-catalog.mjs';
import {
  loadTtsComponentContract,
  resolveFactionBackFile,
} from './tts-component-contract.mjs';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 560;
const CSS_CARD_WIDTH = 240;
const CSS_CARD_HEIGHT = 336;
const FIRST_LEADER_DECK_ID = 100;

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function contentType(path) {
  const extension = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
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

  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function leaderSelector(leader) {
  return `#${leader.faction}-${leader.id} .gauntlet-card`;
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Leader export did not produce a valid PNG.');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function applyReleaseVersion(page, displayVersion) {
  const updated = await page.evaluate((version) => {
    const cards = Array.from(document.querySelectorAll('#leaderReviewSections .leader-card'));
    for (const card of cards) {
      const footer = card.querySelectorAll('.card-footer span');
      const versionNode = footer.item(footer.length - 1);
      if (versionNode) versionNode.textContent = version;
    }
    return cards.length;
  }, displayVersion);
  if (!updated) throw new Error('Production Leader surface contained no cards to stamp with the TTS release version.');
}

async function prepareLeaderSurface(page, expectedCount) {
  await page.evaluate(() => window.dispatchEvent(new Event('load')));
  await page.waitForFunction((count) => {
    const cards = Array.from(document.querySelectorAll('#leaderReviewSections .leader-card'));
    if (cards.length !== count) return false;
    return cards.every(card => {
      const interior = card.querySelector('.card-interior');
      return card.dataset.parchmentLoaded === 'true'
        && card.dataset.titleFit !== undefined
        && Boolean(interior?.style.getPropertyValue('--art-height'));
    });
  }, expectedCount, { timeout: 10000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function applyLeaderCrop(page, leader) {
  const result = await page.locator(leaderSelector(leader)).evaluate((element, payload) => {
    const image = element.querySelector('.card-art img');
    if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error(`Leader portrait is not loaded for ${payload.label}.`);
    }
    if (!window.GauntletArtworkCrop?.apply) throw new Error('Shared artwork crop engine is unavailable on the Leader production surface.');
    const applied = window.GauntletArtworkCrop.apply(
      image,
      payload.direction || null,
      { id: payload.key, label: payload.label },
    );
    return {
      applied: Boolean(applied),
      mode: image.dataset.artCrop || '',
      focusX: image.dataset.artFocusX || '',
      focusY: image.dataset.artFocusY || '',
    };
  }, {
    key: `${leader.faction}-${leader.id}`,
    label: leader.name,
    direction: leader.artDirection || null,
  });
  if (!result.applied || !result.mode) {
    throw new Error(`Production Leader artwork crop was not applied for ${leader.faction}:${leader.id}.`);
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return result;
}

async function validateLeader(page, leader, displayVersion) {
  const selector = leaderSelector(leader);
  const card = page.locator(selector);
  await card.waitFor();

  const metrics = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const titleNode = element.querySelector('.card-title');
    const rulesNode = element.querySelector('.card-rules');
    const interior = element.querySelector('.card-interior');
    const footerNode = element.querySelector('.card-footer');
    const image = element.querySelector('.card-art img');
    const footer = Array.from(element.querySelectorAll('.card-footer span')).map((node) => node.textContent?.trim() || '');
    const overflows = node => Boolean(node) && (
      node.scrollWidth > node.clientWidth + 0.5 || node.scrollHeight > node.clientHeight + 0.5
    );
    return {
      width: rect.width,
      height: rect.height,
      faction: element.dataset.faction,
      title: titleNode?.textContent?.trim() || '',
      fitWarning: element.classList.contains('fit-warning'),
      titleOverflow: overflows(titleNode),
      rulesOverflow: overflows(rulesNode),
      interiorOverflow: overflows(interior),
      footerOverflow: Boolean(interior && footerNode && footerNode.getBoundingClientRect().bottom > interior.getBoundingClientRect().bottom + 0.5),
      imageLoaded: Boolean(image?.complete && image?.naturalWidth > 0 && image?.naturalHeight > 0),
      artCrop: image?.dataset.artCrop || '',
      footer,
    };
  });

  if (Math.abs(metrics.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(metrics.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected Leader geometry for ${leader.faction}:${leader.id}: ${metrics.width} × ${metrics.height}.`);
  }
  if (metrics.faction !== leader.faction || metrics.title !== leader.name) {
    throw new Error(`Production Leader surface does not match current-game ${leader.faction}:${leader.id}: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.fitWarning || metrics.titleOverflow || metrics.rulesOverflow || metrics.interiorOverflow || metrics.footerOverflow) {
    throw new Error(`Leader content does not fit the approved frame: ${leader.faction}:${leader.id} ${JSON.stringify(metrics)}.`);
  }
  if (!metrics.imageLoaded) throw new Error(`Leader portrait failed to load: ${leader.faction}:${leader.id}.`);
  if (!metrics.artCrop) throw new Error(`Leader portrait has no applied artwork crop: ${leader.faction}:${leader.id}.`);
  if (metrics.footer.at(-1) !== displayVersion) {
    throw new Error(`Leader ${leader.faction}:${leader.id} renders ${metrics.footer.at(-1) || 'no version'} but TTS package displays ${displayVersion}.`);
  }
}

async function captureLeader(page, leader, outputPath) {
  const card = page.locator(leaderSelector(leader));
  const previousStyle = await card.evaluate((element) => {
    const keys = ['position', 'left', 'top', 'margin', 'zIndex', 'boxShadow'];
    const values = Object.fromEntries(keys.map((key) => [key, element.style[key]]));
    Object.assign(element.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      margin: '0px',
      zIndex: '2147483647',
      boxShadow: 'none',
    });
    return values;
  });

  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: outputPath,
      omitBackground: true,
      scale: 'device',
      clip: {
        x: 0,
        y: 0,
        width: CSS_CARD_WIDTH,
        height: CSS_CARD_HEIGHT,
      },
    });
  } finally {
    await card.evaluate((element, values) => {
      for (const [key, value] of Object.entries(values)) element.style[key] = value;
    }, previousStyle);
  }

  const dimensions = pngDimensions(await readFile(outputPath));
  if (dimensions.width !== CARD_WIDTH || dimensions.height !== CARD_HEIGHT) {
    throw new Error(`Leader raster has unexpected dimensions for ${leader.faction}:${leader.id}: ${dimensions.width} × ${dimensions.height}; expected ${CARD_WIDTH} × ${CARD_HEIGHT}.`);
  }
}

async function renderLeaderAssets(release, leaders, componentContract) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  const outputRoot = release.outputRoot;
  await rm(join(outputRoot, 'leaders'), { recursive: true, force: true });
  await mkdir(join(outputRoot, 'leaders'), { recursive: true });
  await mkdir(CURRENT_ALIAS_ROOT, { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: CARD_WIDTH / CSS_CARD_WIDTH,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/card-design/`, { waitUntil: 'load' });
    await page.waitForSelector('#leaderReviewSections .leader-card');
    await page.evaluate(async () => document.fonts.ready);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('#leaderReviewSections .card-art img')).every(
      (image) => image.complete && image.naturalWidth > 0,
    ));
    await page.waitForTimeout(100);

    const fonts = await page.evaluate(() => ({
      title: document.fonts.check('12px "p22-1722-pro"'),
      rules: document.fonts.check('12px "adobe-caslon-pro"'),
    }));
    if (!fonts.title || !fonts.rules) throw new Error(`Required Leader fonts failed to load: ${JSON.stringify(fonts)}.`);

    const displayVersion = release.displayVersion || release.version;
    await applyReleaseVersion(page, displayVersion);
    await prepareLeaderSurface(page, leaders.length);

    const records = [];
    for (let index = 0; index < leaders.length; index += 1) {
      const leader = leaders[index];
      await applyLeaderCrop(page, leader);
      await validateLeader(page, leader, displayVersion);
      const deckId = FIRST_LEADER_DECK_ID + index;
      const faceFile = `leaders/${leader.faction}-${leader.id}.png`;
      const backFile = resolveFactionBackFile(componentContract, leader.faction);
      await captureLeader(page, leader, join(outputRoot, faceFile));

      records.push({
        id: leader.id,
        name: leader.name,
        faction: leader.faction,
        factionLabel: leader.factionLabel,
        canonicalImage: leader.canonicalImage,
        source: leader.source,
        backPolicy: 'factionComponentBack',
        tts: {
          cardId: deckId * 100,
          deckId,
          index: 0,
          faceFile,
          backFile,
          numWidth: 1,
          numHeight: 1,
          backIsHidden: true,
          uniqueBack: false,
        },
      });
    }

    const manifest = {
      schemaVersion: 3,
      gameVersion: release.version,
      displayVersion,
      authority: release.currentGameSource || release.canonicalDataSource,
      release: {
        lifecycleSource: release.lifecycleSource,
        githubReleaseContractSource: release.githubReleaseContractSource,
        canonicalDataSource: release.canonicalDataSource,
        canonicalDataVersion: release.sourceVersion || release.version,
        releasePackageRoot: release.releasePackageRoot,
        publishedVersion: release.publishedVersion || release.version,
      },
      sourceSurface: 'card-design/',
      componentContract: 'config/tts-component-contract.json',
      output: {
        cardPixels: { width: CARD_WIDTH, height: CARD_HEIGHT },
        numWidth: 1,
        numHeight: 1,
        firstDeckId: FIRST_LEADER_DECK_ID,
      },
      backPolicy: {
        policy: 'factionComponentBack',
        mode: 'faction',
        variants: componentContract.standardBack.variants,
        backIsHidden: true,
        uniqueBack: false,
        note: 'Leader cards are persistent public faction components and therefore use the matching faction-color Gauntlet back. Playable cards and Territories use the universal black standard back.',
      },
      leaderCount: records.length,
      leaders: records,
    };

    const text = jsonText(manifest);
    await writeFile(join(outputRoot, 'leader-manifest.json'), text);
    await writeFile(join(CURRENT_ALIAS_ROOT, 'leader-manifest.json'), text);
    return manifest;
  } finally {
    await context.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const [currentLeaders, componentContract] = await Promise.all([
    loadCurrentLeaders(),
    loadTtsComponentContract(),
  ]);
  const { release, leaders } = currentLeaders;

  if (checkOnly) {
    for (const leader of leaders) resolveFactionBackFile(componentContract, leader.faction);
    console.log(`Current TTS Leader source check passed for ${release.version}: ${leaders.length} Leaders across ${new Set(leaders.map((leader) => leader.faction)).size} factions using faction-color component backs.`);
    return;
  }

  const manifest = await renderLeaderAssets(release, leaders, componentContract);
  console.log(`Rendered ${manifest.leaderCount} current Leader cards to ${relative(ROOT, release.outputRoot)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { applyLeaderCrop, applyReleaseVersion, prepareLeaderSurface, renderLeaderAssets };
