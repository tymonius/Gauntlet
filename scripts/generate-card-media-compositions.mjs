import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildCatalog } from './tts-current-catalog.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VERSION = 'v0.6.2';
const CONFIG_PATH = join(ROOT, 'media', 'compositions.json');
const GENERATED_ROOT = join(ROOT, 'media', 'generated', VERSION);
const CARD_MANIFEST_PATH = join(GENERATED_ROOT, 'manifest.json');
const COMPOSITION_ROOT = join(GENERATED_ROOT, 'compositions');
const COMPOSITION_MANIFEST_PATH = join(GENERATED_ROOT, 'compositions-manifest.json');
const CARD_ASPECT_RATIO = 5 / 7;
const ALLOWED_FORMATS = new Set(['png', 'webp']);

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function requestedProfile(args) {
  const argument = args.find((value) => value.startsWith('--profile='));
  return argument ? argument.slice('--profile='.length).trim() : 'all';
}

function validateCompositionConfig(config, catalog) {
  const errors = [];
  if (config?.schemaVersion !== 1) errors.push('Composition config schemaVersion must be 1.');
  if (config?.gameVersion !== VERSION) errors.push(`Composition config gameVersion must be ${VERSION}.`);
  if (!Array.isArray(config?.compositions) || !config.compositions.length) {
    errors.push('Composition config must contain at least one composition.');
  }

  const canonicalCards = new Map(catalog.playableCards.map((card) => [card.id, card]));
  const compositionIds = new Set();

  for (const composition of config.compositions || []) {
    if (!composition?.id || typeof composition.id !== 'string') {
      errors.push('Every composition requires a string id.');
      continue;
    }
    if (compositionIds.has(composition.id)) errors.push(`Duplicate composition id: ${composition.id}.`);
    compositionIds.add(composition.id);

    if (!finiteNumber(composition.canvas?.width) || composition.canvas.width <= 0
      || !finiteNumber(composition.canvas?.height) || composition.canvas.height <= 0) {
      errors.push(`${composition.id} requires positive canvas dimensions.`);
    }

    const profileEntries = Object.entries(composition.profiles || {});
    if (!profileEntries.length) errors.push(`${composition.id} requires at least one output profile.`);
    for (const [profileId, profile] of profileEntries) {
      if (!finiteNumber(profile.width) || profile.width <= 0
        || !finiteNumber(profile.height) || profile.height <= 0) {
        errors.push(`${composition.id}/${profileId} requires positive dimensions.`);
      }
      if (!Array.isArray(profile.formats) || !profile.formats.length) {
        errors.push(`${composition.id}/${profileId} requires at least one format.`);
      }
      for (const format of profile.formats || []) {
        if (!ALLOWED_FORMATS.has(format)) {
          errors.push(`${composition.id}/${profileId} uses unsupported format ${format}.`);
        }
      }
      if (profile.formats?.includes('webp')
        && (!finiteNumber(profile.webpQuality) || profile.webpQuality < 1 || profile.webpQuality > 100)) {
        errors.push(`${composition.id}/${profileId} requires webpQuality from 1 to 100.`);
      }
    }

    if (!Array.isArray(composition.cards) || composition.cards.length < 2) {
      errors.push(`${composition.id} requires at least two cards.`);
    }
    const usedCardIds = new Set();
    for (const placement of composition.cards || []) {
      const card = canonicalCards.get(placement.id);
      if (!card) errors.push(`${composition.id} references unknown card ${placement.id}.`);
      else if (!card.artwork) errors.push(`${composition.id} references card without approved artwork: ${placement.id}.`);
      if (usedCardIds.has(placement.id)) errors.push(`${composition.id} repeats card ${placement.id}.`);
      usedCardIds.add(placement.id);

      for (const field of ['x', 'y', 'width', 'rotation', 'z']) {
        if (!finiteNumber(placement[field])) errors.push(`${composition.id}/${placement.id} requires numeric ${field}.`);
      }
      if (finiteNumber(placement.width) && placement.width <= 0) {
        errors.push(`${composition.id}/${placement.id} requires positive width.`);
      }
    }
  }

  if (errors.length) throw new Error(`Invalid card-media composition config:\n${errors.join('\n')}`);
  return config;
}

function selectedProfiles(composition, profileRequest) {
  const entries = Object.entries(composition.profiles || {});
  if (profileRequest === 'all') return entries;
  return entries.filter(([profileId]) => profileId === profileRequest);
}

function filePath(profileId, format, compositionId) {
  return join(COMPOSITION_ROOT, profileId, format, `${compositionId}.${format}`);
}

function manifestPath(profileId, format, compositionId) {
  return `compositions/${profileId}/${format}/${compositionId}.${format}`;
}

async function prepareOutput(compositions, profileRequest) {
  await rm(COMPOSITION_ROOT, { recursive: true, force: true });
  await rm(COMPOSITION_MANIFEST_PATH, { force: true });
  for (const composition of compositions) {
    for (const [profileId, profile] of selectedProfiles(composition, profileRequest)) {
      for (const format of profile.formats) {
        await mkdir(dirname(filePath(profileId, format, composition.id)), { recursive: true });
      }
    }
  }
}

async function imageDataUri(path) {
  const bytes = await readFile(path);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function compositionHtml(composition, profile, images) {
  const scaleX = profile.width / composition.canvas.width;
  const scaleY = profile.height / composition.canvas.height;
  const cards = composition.cards
    .slice()
    .sort((a, b) => a.z - b.z)
    .map((placement) => {
      const width = placement.width * scaleX;
      const height = width / CARD_ASPECT_RATIO;
      const shadowY = Math.max(5, 24 * scaleY);
      const shadowBlur = Math.max(6, 22 * Math.min(scaleX, scaleY));
      return `<img
        class="card"
        src="${images.get(placement.id)}"
        alt=""
        style="left:${placement.x * scaleX}px;top:${placement.y * scaleY}px;width:${width}px;height:${height}px;z-index:${placement.z};transform:rotate(${placement.rotation}deg);filter:drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(20,14,9,.30));"
      />`;
    })
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${profile.width}px; height: ${profile.height}px; overflow: hidden; background: transparent; }
  .stage { position: relative; width: ${profile.width}px; height: ${profile.height}px; overflow: hidden; background: transparent; }
  .card { position: absolute; display: block; transform-origin: 50% 100%; user-select: none; -webkit-user-drag: none; }
</style>
</head>
<body>
  <div class="stage" role="img" aria-label="${composition.name}">${cards}</div>
</body>
</html>`;
}

async function webpFromPng(page, png, quality) {
  const base64 = await page.evaluate(async ({ pngBase64, qualityValue }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${pngBase64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { alpha: true });
    context.drawImage(image, 0, 0);
    const blob = await new Promise((resolveBlob, rejectBlob) => {
      canvas.toBlob(
        (value) => value ? resolveBlob(value) : rejectBlob(new Error('Unable to encode WebP.')),
        'image/webp',
        qualityValue,
      );
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }, {
    pngBase64: png.toString('base64'),
    qualityValue: quality / 100,
  });
  return Buffer.from(base64, 'base64');
}

async function renderCompositions(config, cardManifest, profileRequest) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  const cardRecords = new Map(cardManifest.cards.map((card) => [card.id, card]));
  const records = [];
  await prepareOutput(config.compositions, profileRequest);
  const browser = await chromium.launch({ headless: true });

  try {
    for (const composition of config.compositions) {
      const files = {};
      for (const [profileId, profile] of selectedProfiles(composition, profileRequest)) {
        const images = new Map();
        for (const placement of composition.cards) {
          const card = cardRecords.get(placement.id);
          const source = card?.files?.[profileId]?.png;
          if (!source) {
            throw new Error(`Card-media profile ${profileId} is missing for ${placement.id}.`);
          }
          images.set(placement.id, await imageDataUri(join(GENERATED_ROOT, source)));
        }

        const context = await browser.newContext({
          viewport: { width: profile.width, height: profile.height },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await page.setContent(compositionHtml(composition, profile, images), { waitUntil: 'load' });
        await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
        const png = await page.locator('.stage').screenshot({ type: 'png', omitBackground: true });

        files[profileId] = {};
        for (const format of profile.formats) {
          const bytes = format === 'png' ? png : await webpFromPng(page, png, profile.webpQuality);
          await writeFile(filePath(profileId, format, composition.id), bytes);
          files[profileId][format] = manifestPath(profileId, format, composition.id);
        }
        await context.close();
      }

      records.push({
        id: composition.id,
        name: composition.name,
        description: composition.description || '',
        canvas: composition.canvas,
        cards: composition.cards,
        files,
      });
    }
  } finally {
    await browser.close();
  }

  return records;
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const profileRequest = requestedProfile(args);
  const catalog = await buildCatalog();
  const config = validateCompositionConfig(
    JSON.parse(await readFile(CONFIG_PATH, 'utf8')),
    catalog,
  );

  const availableProfiles = new Set(
    config.compositions.flatMap((composition) => Object.keys(composition.profiles || {})),
  );
  if (profileRequest !== 'all' && !availableProfiles.has(profileRequest)) {
    console.log(`No configured card-media compositions use profile ${profileRequest}; nothing to do.`);
    return;
  }

  if (checkOnly) {
    console.log(`Card-media composition source check passed: ${config.compositions.length} composition(s), profiles ${[...availableProfiles].join(', ')}.`);
    return;
  }

  const cardManifest = JSON.parse(await readFile(CARD_MANIFEST_PATH, 'utf8'));
  if (cardManifest.gameVersion !== VERSION) {
    throw new Error(`Card media manifest version ${cardManifest.gameVersion} does not match ${VERSION}.`);
  }

  const compositions = await renderCompositions(config, cardManifest, profileRequest);
  await writeFile(COMPOSITION_MANIFEST_PATH, jsonText({
    schemaVersion: 1,
    gameVersion: VERSION,
    generatedFrom: 'canonical card-media renders through deterministic composition configuration',
    profileRequest,
    compositionCount: compositions.length,
    compositions,
  }));

  console.log(`Rendered ${compositions.length} card-media composition(s) to ${relative(ROOT, COMPOSITION_ROOT)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export {
  requestedProfile,
  selectedProfiles,
  validateCompositionConfig,
};
