import { mkdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import sharp from 'sharp';
import { resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const SOURCES = Object.freeze([
  {
    source: join(ROOT, 'tts', 'assets', 'environment', 'campaign-map-table.jpg'),
    outputName: 'campaign-map-table.png',
  },
  {
    source: join(ROOT, 'images', 'artwork', 'site', 'gauntlet-command-tent-gameplay-painting.webp'),
    outputName: 'command-tent-panorama.png',
    resize: { width: 2048, height: 1024, fit: 'cover', position: 'centre' },
  },
]);

async function normalizePng(source, destination, resize = null) {
  const bytes = await readFile(source);
  const image = sharp(bytes, { failOn: 'none' });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Environment image has no decodable dimensions: ${relative(ROOT, source)}`);
  }

  let pipeline = sharp(bytes, { failOn: 'none' });
  if (resize) pipeline = pipeline.resize(resize);
  await pipeline.png({ compressionLevel: 9 }).toFile(destination);

  const output = await readFile(destination);
  if (output.length < 8 || output[0] !== 0x89 || output[1] !== 0x50 || output[2] !== 0x4e || output[3] !== 0x47) {
    throw new Error(`Environment normalization did not produce PNG bytes: ${relative(ROOT, destination)}`);
  }

  return resize
    ? { width: resize.width, height: resize.height }
    : { width: metadata.width, height: metadata.height };
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const outputDir = join(release.outputRoot, 'environment');
  await mkdir(outputDir, { recursive: true });

  for (const entry of SOURCES) {
    const destination = join(outputDir, entry.outputName);
    const dimensions = await normalizePng(entry.source, destination, entry.resize || null);
    console.log(`Normalized ${relative(ROOT, entry.source)} -> ${relative(ROOT, destination)} (${dimensions.width}x${dimensions.height}).`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
