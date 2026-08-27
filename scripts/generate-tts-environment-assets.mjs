import { mkdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';
import { resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const SOURCES = Object.freeze([
  {
    source: join(ROOT, 'tts', 'assets', 'environment', 'campaign-map-table.jpg'),
    outputName: 'campaign-map-table.png',
  },
  {
    source: join(ROOT, 'tts', 'assets', 'environment', 'command-tent-panorama.jpg'),
    outputName: 'command-tent-panorama.png',
  },
]);

async function renderPng(page, source, destination) {
  const bytes = await readFile(source);
  const dataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;

  await page.setContent('<!doctype html><html><body style="margin:0"><img id="source" style="display:block"></body></html>');
  const dimensions = await page.evaluate(async (url) => {
    const image = document.getElementById('source');
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Decoded environment image has no dimensions.');
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, dataUrl);

  await page.setViewportSize(dimensions);
  const image = page.locator('#source');
  await image.screenshot({ path: destination, type: 'png', animations: 'disabled' });

  const screenshot = await readFile(destination);
  if (screenshot.length < 8 || screenshot[0] !== 0x89 || screenshot[1] !== 0x50 || screenshot[2] !== 0x4e || screenshot[3] !== 0x47) {
    throw new Error(`Environment normalization did not produce PNG bytes: ${relative(ROOT, destination)}`);
  }

  return dimensions;
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const outputDir = join(release.outputRoot, 'environment');
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    for (const entry of SOURCES) {
      const destination = join(outputDir, entry.outputName);
      const dimensions = await renderPng(page, entry.source, destination);
      console.log(`Normalized ${relative(ROOT, entry.source)} -> ${relative(ROOT, destination)} (${dimensions.width}x${dimensions.height}).`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
