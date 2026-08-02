import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

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

async function main() {
  const args = process.argv.slice(2);
  await runNode('scripts/generate-tts-card-assets.mjs', ['--catalog-only']);
  await runNode('scripts/generate-card-media-assets.mjs', args);
  await runNode('scripts/generate-card-media-compositions.mjs', args);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { runNode };
