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
import {
  surfaceCssPixels,
  surfaceDeviceScale,
  surfaceRasterPixels,
} from '../card-design/production-surface.mjs';

const { width: CARD_WIDTH, height: CARD_HEIGHT } = surfaceRasterPixels('portrait');
const { width: CSS_CARD_WIDTH, height: CSS_CARD_HEIGHT } = surfaceCssPixels('portrait');
const DEVICE_SCALE_FACTOR = surfaceDeviceScale('portrait');
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

function leaderSelector() {
  return '#renderTarget > .leader-card';
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Leader export did not produce a valid PNG.');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
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
      node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1
    );
    return {
      width: rect.width,
      height: rect.height,
      faction: element.dataset.faction,
      title: titleNode?.textContent?.trim() || '',
      titleFit: element.dataset.titleFit === 'true',
      fitWarning: element.classList.contains('fit-warning'),
      titleOverflow: overflows(titleNode),
      rulesOverflow: overflows(rulesNode),
      interiorOverflow: overflows(interior),
      footerOverflow: Boolean(interior && footerNode && footerNode.getBoundingClientRect().bottom > interior.getBoundingClientRect().bottom + 1),
      imageLoaded: Boolean(image?.complete && image?.naturalWidth > 0 && image?.naturalHeight > 0),
      artPosition: image ? window.getComputedStyle(image).objectPosition : '',
      footer,
    };
  });

  if (Math.abs(metrics.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(metrics.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected Leader geometry for ${leader.faction}:${leader.id}: ${metrics.width} × ${metrics.height}.`);
  }
  if (metrics.faction !== leader.faction || metrics.title !== leader.name) {
    throw new Error(`Production Leader surface does not match current-game ${leader.faction}:${leader.id}: ${JSON.stringify(metrics)}.`);
  }
  if (!metrics.titleFit || metrics.fitWarning || metrics.titleOverflow || metrics.rulesOverflow || metrics.interiorOverflow || metrics.footerOverflow) {
    throw new Error(`Leader content does not fit the approved frame: ${leader.faction}:${leader.id} ${JSON.stringify(metrics)}.`);
  }
  if (!metrics.imageLoaded) throw new Error(`Leader portrait failed to load: ${leader.faction}:${leader.id}.`);
  if (!metrics.artPosition) {
    throw new Error(`Leader portrait has no Card Design artwork composition: ${leader.faction}:${leader.id}.`);
  }
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
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();

  try {
    const displayVersion = release.displayVersion || release.version;
    let fontsValidated = false;
    const records = [];

    for (let index = 0; index < leaders.length; index += 1) {
      const leader = leaders[index];
      const url = new URL('/card-design/face-render.html', baseUrl);
      url.searchParams.set('id', `leader:${leader.faction}-${leader.id}`);

      await page.goto(url.toString(), { waitUntil: 'load' });
      await page.waitForFunction(() => (
        document.body.dataset.renderReady === 'true'
        || document.body.dataset.renderError === 'true'
      ));

      const state = await page.evaluate(() => ({
        error: document.body.dataset.renderError === 'true',
        message: document.body.dataset.renderErrorMessage || '',
      }));
      if (state.error) {
        throw new Error(`Card-design production renderer failed for Leader ${leader.faction}:${leader.id}: ${state.message || 'unspecified renderer error'}`);
      }

      if (!fontsValidated) {
        const fonts = await page.evaluate(async () => {
          await document.fonts.ready;
          return {
            title: document.fonts.check('12px "p22-1722-pro"'),
            rules: document.fonts.check('12px "adobe-caslon-pro"'),
          };
        });
        if (!fonts.title || !fonts.rules) {
          throw new Error(`Required Leader fonts failed to load: ${JSON.stringify(fonts)}.`);
        }
        fontsValidated = true;
      }

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
      sourceSurface: 'card-design/face-render.html',
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

export { renderLeaderAssets };
