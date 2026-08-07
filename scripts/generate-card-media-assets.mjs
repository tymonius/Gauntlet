import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildCatalog } from './generate-tts-card-assets.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VERSION = 'v0.6.2';
const OUTPUT_ROOT = join(ROOT, 'media', 'generated', VERSION);
const CSS_CARD_WIDTH = 240;
const CSS_CARD_HEIGHT = 336;
const MASTER_PROFILE = Object.freeze({
  id: 'publication',
  width: 1500,
  height: 2100,
  formats: ['png'],
});
const PROFILES = Object.freeze({
  thumbnail: Object.freeze({
    id: 'thumbnail',
    width: 300,
    height: 420,
    formats: ['png', 'webp'],
    webpQuality: 86,
  }),
  website: Object.freeze({
    id: 'website',
    width: 800,
    height: 1120,
    formats: ['png', 'webp'],
    webpQuality: 90,
  }),
  publication: MASTER_PROFILE,
});

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
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.b64': 'text/plain; charset=utf-8',
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
  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

function requestedProfiles(args) {
  const profileArgument = args.find((argument) => argument.startsWith('--profile='));
  if (!profileArgument) return Object.values(PROFILES);

  const requested = profileArgument.slice('--profile='.length).trim();
  if (requested === 'all') return Object.values(PROFILES);
  if (!PROFILES[requested]) {
    throw new Error(`Unknown media profile "${requested}". Use thumbnail, website, publication, or all.`);
  }
  return [PROFILES[requested]];
}

function validateProfiles(profiles) {
  for (const profile of profiles) {
    if (profile.width / profile.height !== CSS_CARD_WIDTH / CSS_CARD_HEIGHT) {
      throw new Error(`${profile.id} does not preserve the approved 5:7 card aspect ratio.`);
    }
    if (!profile.formats.length) throw new Error(`${profile.id} has no output formats.`);
    for (const format of profile.formats) {
      if (!['png', 'webp'].includes(format)) {
        throw new Error(`${profile.id} uses unsupported format ${format}.`);
      }
    }
  }
}

async function validateRenderedCard(page, card) {
  const result = await page.evaluate(() => {
    const element = document.querySelector('.gauntlet-card');
    const rect = element?.getBoundingClientRect();
    return {
      ready: document.body.dataset.renderReady,
      width: rect?.width,
      height: rect?.height,
      fitWarning: element?.classList.contains('fit-warning'),
      parchment: element?.dataset.parchmentLoaded,
    };
  });

  if (result.ready !== 'true') throw new Error(`Renderer did not become ready for ${card.id}.`);
  if (Math.abs(result.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(result.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected CSS card dimensions for ${card.id}: ${result.width} × ${result.height}.`);
  }
  if (result.fitWarning) throw new Error(`Card content does not fit the approved frame: ${card.id}.`);
  if (result.parchment !== 'true') throw new Error(`Parchment failed to load for ${card.id}.`);
}

async function validateFonts(page) {
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      title: document.fonts.check('12px "p22-1722-pro"'),
      rules: document.fonts.check('12px "adobe-caslon-pro"'),
    };
  });
  if (!fonts.title || !fonts.rules) {
    throw new Error(`Required card fonts failed to load: ${JSON.stringify(fonts)}`);
  }
}

async function deriveRasterOutputs(page, masterPng, profiles) {
  const encoded = await page.evaluate(async ({ masterBase64, requested }) => {
    const source = new Image();
    source.src = `data:image/png;base64,${masterBase64}`;
    await source.decode();

    const toBase64 = async (canvas, mimeType, quality) => {
      const blob = await new Promise((resolveBlob, rejectBlob) => {
        canvas.toBlob(
          (value) => value ? resolveBlob(value) : rejectBlob(new Error(`Unable to encode ${mimeType}.`)),
          mimeType,
          quality,
        );
      });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    };

    const outputs = {};
    for (const profile of requested) {
      if (profile.id === 'publication') continue;
      const canvas = document.createElement('canvas');
      canvas.width = profile.width;
      canvas.height = profile.height;
      const context = canvas.getContext('2d', { alpha: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.clearRect(0, 0, profile.width, profile.height);
      context.drawImage(source, 0, 0, profile.width, profile.height);

      outputs[profile.id] = {};
      if (profile.formats.includes('png')) {
        outputs[profile.id].png = await toBase64(canvas, 'image/png');
      }
      if (profile.formats.includes('webp')) {
        outputs[profile.id].webp = await toBase64(canvas, 'image/webp', profile.webpQuality / 100);
      }
    }
    return outputs;
  }, {
    masterBase64: masterPng.toString('base64'),
    requested: profiles,
  });

  return Object.fromEntries(
    Object.entries(encoded).map(([profile, formats]) => [
      profile,
      Object.fromEntries(
        Object.entries(formats).map(([format, base64]) => [format, Buffer.from(base64, 'base64')]),
      ),
    ]),
  );
}

function outputPath(profile, format, cardId) {
  return join(OUTPUT_ROOT, profile.id, format, `${cardId}.${format}`);
}

function manifestPath(profile, format, cardId) {
  return `${profile.id}/${format}/${cardId}.${format}`;
}

async function prepareOutput(profiles) {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  for (const profile of profiles) {
    await rm(join(OUTPUT_ROOT, profile.id), { recursive: true, force: true });
    for (const format of profile.formats) {
      await mkdir(join(OUTPUT_ROOT, profile.id, format), { recursive: true });
    }
  }
}

async function renderMedia(catalog, profiles) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  await prepareOutput(profiles);
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 520, height: 700 },
    deviceScaleFactor: MASTER_PROFILE.width / CSS_CARD_WIDTH,
  });
  const page = await context.newPage();
  const cardRecords = [];

  try {
    let fontsValidated = false;
    for (const card of catalog.playableCards) {
      await page.goto(`${baseUrl}/tts/renderer/?card=${encodeURIComponent(card.id)}`, { waitUntil: 'load' });
      await page.waitForSelector('.gauntlet-card');
      await page.waitForFunction(() => document.body.dataset.renderReady === 'true');
      if (!fontsValidated) {
        await validateFonts(page);
        fontsValidated = true;
      }
      await validateRenderedCard(page, card);

      const masterPng = await page.locator('.gauntlet-card').screenshot({ omitBackground: true });
      const derivatives = await deriveRasterOutputs(page, masterPng, profiles);
      const files = {};

      for (const profile of profiles) {
        files[profile.id] = {};
        for (const format of profile.formats) {
          const bytes = profile.id === 'publication' && format === 'png'
            ? masterPng
            : derivatives[profile.id]?.[format];
          if (!bytes) throw new Error(`Missing ${profile.id}/${format} output for ${card.id}.`);
          await writeFile(outputPath(profile, format, card.id), bytes);
          files[profile.id][format] = manifestPath(profile, format, card.id);
        }
      }

      cardRecords.push({
        id: card.id,
        name: card.name,
        faction: card.faction,
        factionLabel: card.factionLabel,
        cost: card.cost,
        complexity: card.complexity,
        trait: card.trait,
        form: card.form,
        unique: card.unique,
        artwork: card.artwork,
        source: card.source,
        files,
      });
    }
  } finally {
    await context.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }

  return cardRecords;
}

async function main() {
  const args = process.argv.slice(2);
  const options = new Set(args);
  const checkOnly = options.has('--check');
  const strictArt = options.has('--strict-art');
  const profiles = requestedProfiles(args);
  validateProfiles(profiles);

  const catalog = await buildCatalog();
  if (strictArt && catalog.missingArtwork.length) {
    throw new Error(`Missing artwork for ${catalog.missingArtwork.length} cards:\n${catalog.missingArtwork.join('\n')}`);
  }

  if (checkOnly) {
    console.log(`Card media source check passed: ${catalog.playableCards.length} playable cards, ${catalog.missingArtwork.length} cards without artwork, profiles ${profiles.map((profile) => profile.id).join(', ')}.`);
    return;
  }

  const cards = await renderMedia(catalog, profiles);
  await writeFile(join(OUTPUT_ROOT, 'catalog.json'), jsonText(catalog));
  await writeFile(join(OUTPUT_ROOT, 'manifest.json'), jsonText({
    schemaVersion: 1,
    gameVersion: VERSION,
    generatedFrom: 'canonical card sources through the shared card renderer',
    profiles: Object.fromEntries(profiles.map((profile) => [profile.id, {
      width: profile.width,
      height: profile.height,
      formats: profile.formats,
      webpQuality: profile.webpQuality || null,
    }])),
    cardCount: cards.length,
    missingArtwork: catalog.missingArtwork,
    cards,
  }));

  console.log(`Rendered ${cards.length} playable cards in ${profiles.map((profile) => profile.id).join(', ')} profiles to ${relative(ROOT, OUTPUT_ROOT)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { PROFILES, requestedProfiles, validateProfiles };
