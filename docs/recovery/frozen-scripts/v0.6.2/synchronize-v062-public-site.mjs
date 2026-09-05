import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { isWithdrawn, validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
const check = process.argv.includes('--check');

if (isWithdrawn('v0.6.2', lifecycle)) {
  if (!check) {
    console.error('Refusing to synchronize v0.6.2 onto public/current surfaces: v0.6.2 is withdrawn. Reconstruct a clean candidate instead of rewriting the v0.6.1 recovery baseline.');
    process.exit(2);
  }
  execFileSync(process.execPath, ['scripts/validate-v062-withdrawn-release.mjs'], { stdio: 'inherit' });
  process.exit(0);
}

await import('./synchronize-v062-public-site.pre-recovery.mjs');
