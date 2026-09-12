import { spawn } from 'node:child_process';
import { cp, lstat, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const GAME_DATA_SOURCE = resolve(ROOT, 'packages/game-data');
const GAME_DATA_ROUTE = resolve(ROOT, 'game-data');

function runNode(script, args = []) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (signal) rejectRun(new Error(`${script} was terminated by ${signal}.`));
      else if (code !== 0) rejectRun(new Error(`${script} exited with code ${code}.`));
      else resolveRun();
    });
  });
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function withGameDataCompatibilityRoute(callback) {
  if (await pathExists(GAME_DATA_ROUTE)) {
    throw new Error('Refusing to overwrite an existing root game-data path while materializing the TTS browser compatibility route.');
  }

  await cp(GAME_DATA_SOURCE, GAME_DATA_ROUTE, { recursive: true });
  try {
    return await callback();
  } finally {
    await rm(GAME_DATA_ROUTE, { recursive: true, force: true });
  }
}

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
