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
  resolveStandardBackFile,
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

async function validateLeader(page, leader, version) {
  const selector = leaderSelector(leader);
  const card = page.locator(selector);
  await card.waitFor();

  const metrics = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const title = element.querySelector('.card-title')?.textContent?.trim() || '';
    const image = element.querySelector('.card-art img');
    const footer = Array.from(element.querySelectorAll('.card-footer span')).map((node) => node.textContent?.trim() || '');
    return {
      width: rect.width,
      height: rect.height,
      faction: element.dataset.faction,
      title,
      fitWarning: element.classList.contains('fit-warning'),
      imageLoaded: Boolean(image?.complete && image?.naturalWidth > 0 && image?.naturalHeight > 0),
      footer,
    };
  });

  if (Math.abs(metrics.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(metrics.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected Leader geometry for ${leader.faction}:${leader.id}: ${metrics.width} × ${metrics.height}.`);
  }
  if (metrics.faction !== leader.faction || metrics.title !== leader.name) {
    throw new Error(`Production Leader surface does not match canonical ${leader.faction}:${leader.id}: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.fitWarning) throw new Error(`Leader content does not fit the approved frame: ${leader.faction}:${leader.id}.`);
  if (!metrics.imageLoaded) throw new Error(`Leader portrait failed to load: ${leader.faction}:${leader.id}.`);
  if (metrics.footer.at(-1) !== version) {
    throw new Error(`Leader ${leader.faction}:${leader.id} renders ${metrics.footer.at(-1) || 'no version'} but current release is ${version}.`);
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

    const records = [];
    for (let index = 0; index < leaders.length; index += 1) {
      const leader = leaders[index];
      await validateLeader(page, leader, release.version);
      const deckId = FIRST_LEADER_DECK_ID + index;
      const faceFile = `leaders/${leader.faction}-${leader.id}.png`;
      const backFile = resolveStandardBackFile(componentContract, leader.faction);
      await captureLeader(page, leader, join(outputRoot, faceFile));

      records.push({
        id: leader.id,
        name: leader.name,
        faction: leader.faction,
        factionLabel: leader.factionLabel,
        canonicalImage: leader.canonicalImage,
        source: leader.source,
        backPolicy: 'standardBack',
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
      schemaVersion: 2,
      gameVersion: release.version,
      release: {
        lifecycleSource: release.lifecycleSource,
        githubReleaseContractSource: release.githubReleaseContractSource,
        canonicalDataSource: release.canonicalDataSource,
        releasePackageRoot: release.releasePackageRoot,
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
        policy: 'standardBack',
        ...componentContract.standardBack,
        backIsHidden: true,
        uniqueBack: false,
        note: 'Leader cards resolve the same standard-back policy used by playable cards and Territories.',
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
    for (const leader of leaders) resolveStandardBackFile(componentContract, leader.faction);
    console.log(`Current TTS Leader source check passed for ${release.version}: ${leaders.length} Leaders across ${new Set(leaders.map((leader) => leader.faction)).size} factions using ${componentContract.standardBack.mode} standard backs.`);
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

export { renderLeaderAssets };
