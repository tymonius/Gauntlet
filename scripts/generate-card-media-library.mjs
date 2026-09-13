import { pathToFileURL } from 'node:url';
import { runNode, withGameDataCompatibilityRoute } from './run-with-game-data-route.mjs';

async function main() {
  const args = process.argv.slice(2);
  await runNode('scripts/generate-tts-card-assets.mjs', ['--catalog-only']);
  await withGameDataCompatibilityRoute(async () => {
    await runNode('scripts/generate-card-media-assets.mjs', args);
    await runNode('scripts/generate-card-media-compositions.mjs', args);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
