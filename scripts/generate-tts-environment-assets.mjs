import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const ENVIRONMENT_SOURCE_ROOT = join(ROOT, 'tts', 'assets', 'environment');
const TABLE_SOURCE = join(ENVIRONMENT_SOURCE_ROOT, 'command-map-table.png');
const PANORAMA_SOURCE = join(ENVIRONMENT_SOURCE_ROOT, 'command-tent-panorama.png');

async function assertPng(source) {
  const bytes = await readFile(source);
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    throw new Error(`TTS environment source is not a PNG file: ${relative(ROOT, source)}`);
  }
}

async function copyEnvironmentSource(source, destination) {
  await assertPng(source);
  await copyFile(source, destination);
  await assertPng(destination);
  console.log(`Copied ${relative(ROOT, source)} -> ${relative(ROOT, destination)} without image re-encoding.`);
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const outputDir = join(release.outputRoot, 'environment');
  await mkdir(outputDir, { recursive: true });

  await copyEnvironmentSource(
    TABLE_SOURCE,
    join(outputDir, 'campaign-map-table.png'),
  );
  await copyEnvironmentSource(
    PANORAMA_SOURCE,
    join(outputDir, 'command-tent-panorama.png'),
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
