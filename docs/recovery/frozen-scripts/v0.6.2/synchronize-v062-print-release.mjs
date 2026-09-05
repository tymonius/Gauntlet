import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { isWithdrawn, validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
const check = process.argv.includes('--check');

if (isWithdrawn('v0.6.2', lifecycle)) {
  if (!check) {
    console.error('Refusing to synchronize v0.6.2 print-release outputs: v0.6.2 is withdrawn and its published package is immutable recovery evidence.');
    process.exit(2);
  }
  execFileSync(process.execPath, ['scripts/validate-v062-withdrawn-release.mjs'], { stdio: 'inherit' });
  process.exit(0);
}

await import('./synchronize-v062-print-release.pre-recovery.mjs');
