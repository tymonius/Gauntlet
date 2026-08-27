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
    source: join(ROOT, 'tts', 'assets', 'environment', 'command-tent-panorama.jpg'),
    outputName: 'command-tent-panorama.png',
  },
]);

async function normalizePng(source, destination) {
  const bytes = await readFile(source);
  const image = sharp(bytes, { failOn: 'none' });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Environment image has no decodable dimensions: ${relative(ROOT, source)}`);
  }

  await sharp(bytes, { failOn: 'none' })
    .png({ compressionLevel: 9 })
    .toFile(destination);

  const output = await readFile(destination);
  if (output.length < 8 || output[0] !== 0x89 || output[1] !== 0x50 || output[2] !== 0x4e || output[3] !== 0x47) {
    throw new Error(`Environment normalization did not produce PNG bytes: ${relative(ROOT, destination)}`);
  }

  return { width: metadata.width, height: metadata.height };
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const outputDir = join(release.outputRoot, 'environment');
  await mkdir(outputDir, { recursive: true });

  for (const entry of SOURCES) {
    const destination = join(outputDir, entry.outputName);
    const dimensions = await normalizePng(entry.source, destination);
    console.log(`Normalized ${relative(ROOT, entry.source)} -> ${relative(ROOT, destination)} (${dimensions.width}x${dimensions.height}).`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
