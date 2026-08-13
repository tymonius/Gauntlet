import { execFileSync } from 'node:child_process';
import { isWithdrawn, validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
const run = (script, args = []) => execFileSync(process.execPath, [script, ...args], { stdio: 'inherit' });

if (isWithdrawn('v0.6.2', lifecycle)) {
  run('scripts/validate-v062-withdrawn-release.mjs');
  process.exit(0);
}

run('scripts/build-v062-release-runner.mjs', ['--check']);
run('scripts/synchronize-v062-public-site.mjs', ['--check']);
run('scripts/synchronize-v062-print-release.mjs', ['--check']);
run('scripts/validate-v062-published-release.mjs');
