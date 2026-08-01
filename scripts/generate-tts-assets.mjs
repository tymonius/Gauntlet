import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const forwardedArguments = process.argv.slice(2);

function run(script, argumentsList = []) {
  const result = spawnSync(process.execPath, [script, ...argumentsList], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('scripts/generate-tts-card-assets.mjs', forwardedArguments);
run('scripts/generate-tts-territory-assets.mjs');
