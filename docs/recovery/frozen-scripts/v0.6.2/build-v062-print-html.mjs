import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { isWithdrawn, validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
const check = process.argv.includes('--check');

if (isWithdrawn('v0.6.2', lifecycle)) {
  if (!check) {
    console.error('Refusing to rebuild v0.6.2 print HTML: v0.6.2 is withdrawn and the versioned print package is immutable recovery evidence.');
    process.exit(2);
  }
  execFileSync(process.execPath, ['scripts/validate-v062-withdrawn-release.mjs'], { stdio: 'inherit' });
  process.exit(0);
}

await import('./build-v062-print-html.pre-recovery.mjs');
