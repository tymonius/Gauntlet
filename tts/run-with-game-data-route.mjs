import { runNode, withGameDataCompatibilityRoute } from '../scripts/run-with-game-data-route.mjs';

async function main() {
  const [script, ...args] = process.argv.slice(2);
  if (!script) throw new Error('Usage: node tts/run-with-game-data-route.mjs <script> [...args]');
  await withGameDataCompatibilityRoute(() => runNode(script, args));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

export { runNode, withGameDataCompatibilityRoute };
