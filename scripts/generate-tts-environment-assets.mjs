import { mkdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const TABLE_SOURCE = join(ROOT, 'tts', 'assets', 'environment', 'campaign-map-table.jpg');
const PANORAMA_SOURCE = join(ROOT, 'images', 'artwork', 'site', 'gauntlet-command-tent-gameplay-painting.webp');

async function assertPng(destination) {
  const output = await readFile(destination);
  if (output.length < 8 || output[0] !== 0x89 || output[1] !== 0x50 || output[2] !== 0x4e || output[3] !== 0x47) {
    throw new Error(`Environment normalization did not produce PNG bytes: ${relative(ROOT, destination)}`);
  }
}

async function normalizeTable(page, destination) {
  const bytes = await readFile(TABLE_SOURCE);
  const dataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;

  await page.setContent('<!doctype html><html><body style="margin:0"><img id="source" style="display:block"></body></html>');
  const dimensions = await page.evaluate(async (url) => {
    const image = document.getElementById('source');
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Decoded table image has no dimensions.');
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, dataUrl);

  await page.setViewportSize(dimensions);
  await page.locator('#source').screenshot({ path: destination, type: 'png', animations: 'disabled' });
  await assertPng(destination);
  return dimensions;
}

async function normalizePanorama(destination) {
  const bytes = await readFile(PANORAMA_SOURCE);
  await sharp(bytes)
    .resize({ width: 2048, height: 1024, fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(destination);
  await assertPng(destination);
  return { width: 2048, height: 1024 };
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const outputDir = join(release.outputRoot, 'environment');
  await mkdir(outputDir, { recursive: true });

  const tableDestination = join(outputDir, 'campaign-map-table.png');
  const panoramaDestination = join(outputDir, 'command-tent-panorama.png');

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const tableDimensions = await normalizeTable(page, tableDestination);
    console.log(`Normalized ${relative(ROOT, TABLE_SOURCE)} -> ${relative(ROOT, tableDestination)} (${tableDimensions.width}x${tableDimensions.height}).`);
  } finally {
    await browser.close();
  }

  const panoramaDimensions = await normalizePanorama(panoramaDestination);
  console.log(`Derived ${relative(ROOT, PANORAMA_SOURCE)} -> ${relative(ROOT, panoramaDestination)} (${panoramaDimensions.width}x${panoramaDimensions.height}).`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
