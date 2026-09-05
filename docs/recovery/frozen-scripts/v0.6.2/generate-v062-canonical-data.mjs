import process from 'node:process';
import { isWithdrawn, validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
if (process.argv.includes('--write') && isWithdrawn('v0.6.2', lifecycle)) {
  console.error('Refusing to write v0.6.2 canonical data: v0.6.2 is withdrawn and its versioned data is immutable recovery evidence.');
  process.exit(2);
}

await import('./generate-v062-canonical-data.pre-recovery.mjs');
