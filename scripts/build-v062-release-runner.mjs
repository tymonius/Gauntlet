import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { isWithdrawn, validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
const check = process.argv.includes('--check');

if (isWithdrawn('v0.6.2', lifecycle)) {
  if (!check) {
    console.error('Refusing to build/materialize the published v0.6.2 package: v0.6.2 is withdrawn and preserved as immutable recovery evidence.');
    process.exit(2);
  }
  execFileSync(process.execPath, ['scripts/validate-v062-withdrawn-release.mjs'], { stdio: 'inherit' });
  process.exit(0);
}

await import('./build-v062-release-runner.pre-recovery.mjs');
