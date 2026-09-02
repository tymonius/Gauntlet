import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { buildCatalog } from './tts-current-catalog.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_OUTPUT_ROOT = join(ROOT, 'images', 'print-artwork');
const SHORT_EDGE = 960;
const LONG_EDGE = 1800;
const JPEG_QUALITY = 95;
const ART_WINDOW_BACKGROUND = Object.freeze({ r: 138, g: 122, b: 103 });

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function requestedOutput(args) {
  const entry = args.find(argument => argument.startsWith('--output='));
  return entry ? resolve(entry.slice('--output='.length)) : DEFAULT_OUTPUT_ROOT;
}

function sourcePath(artwork) {
  return resolve(ROOT, String(artwork || '').replace(/^\/+/, ''));
}

function targetDimensions(width, height) {
  const sourceWidth = Number(width) || 0;
  const sourceHeight = Number(height) || 0;
  if (!sourceWidth || !sourceHeight) throw new Error(`Invalid artwork dimensions: ${width} × ${height}.`);

  const scale = Math.min(
    1,
    SHORT_EDGE / Math.min(sourceWidth, sourceHeight),
    LONG_EDGE / Math.max(sourceWidth, sourceHeight),
  );
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

async function normalizeArtwork(card, outputRoot) {
  if (!card.artwork) throw new Error(`Playable card ${card.id} has no canonical artwork source.`);
  const source = sourcePath(card.artwork);
  const metadata = await sharp(source, { failOn: 'error' }).metadata();
  const dimensions = targetDimensions(metadata.width, metadata.height);
  const output = join(outputRoot, 'cards', `${card.id}.jpg`);

  await sharp(source, { failOn: 'error' })
    .rotate()
    .resize(dimensions.width, dimensions.height, {
      fit: 'fill',
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .flatten({ background: ART_WINDOW_BACKGROUND })
    .toColourspace('srgb')
    .jpeg({
      quality: JPEG_QUALITY,
      chromaSubsampling: '4:4:4',
      mozjpeg: true,
      force: true,
    })
    .toFile(output);

  const outputStat = await stat(output);
  return {
    id: card.id,
    name: card.name,
    faction: card.faction,
    source: String(card.artwork),
    file: `cards/${card.id}.jpg`,
    sourcePixels: {
      width: Number(metadata.width),
      height: Number(metadata.height),
    },
    pixels: dimensions,
    bytes: outputStat.size,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const outputRoot = requestedOutput(args);
  const catalog = await buildCatalog();

  if (catalog.missingArtwork?.length) {
    throw new Error(`Print artwork normalization requires complete playable artwork. Missing: ${catalog.missingArtwork.join(', ')}`);
  }

  if (checkOnly) {
    for (const card of catalog.playableCards) {
      if (!card.artwork) throw new Error(`Playable card ${card.id} has no canonical artwork source.`);
      const metadata = await sharp(sourcePath(card.artwork), { failOn: 'error' }).metadata();
      targetDimensions(metadata.width, metadata.height);
    }
    console.log(`Print artwork source check passed for ${catalog.playableCards.length} playable cards at ${SHORT_EDGE}px short edge / ${LONG_EDGE}px long-edge cap.`);
    return;
  }

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(join(outputRoot, 'cards'), { recursive: true });

  const records = [];
  for (const card of catalog.playableCards) records.push(await normalizeArtwork(card, outputRoot));

  await writeFile(join(outputRoot, 'manifest.json'), jsonText({
    schemaVersion: 1,
    gameVersion: catalog.gameVersion,
    generatedFrom: 'canonical playable-card artwork sources',
    mediaPolicy: {
      purpose: 'Deckbuilder direct-print artwork only; card typography/layout remain live canonical Card Design output',
      shortEdge: SHORT_EDGE,
      longEdgeCap: LONG_EDGE,
      format: 'jpeg',
      quality: JPEG_QUALITY,
      chromaSubsampling: '4:4:4',
      colorSpace: 'sRGB',
      alpha: 'flattened against canonical card-art background',
    },
    cardCount: records.length,
    cards: records,
  }));

  const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0);
  console.log(`Generated ${records.length} normalized print artwork derivatives (${totalBytes} bytes) in ${outputRoot}.`);
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

export { ART_WINDOW_BACKGROUND, JPEG_QUALITY, LONG_EDGE, SHORT_EDGE, targetDimensions };
