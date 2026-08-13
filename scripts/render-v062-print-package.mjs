import process from 'node:process';
import { isWithdrawn, validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
if (isWithdrawn('v0.6.2', lifecycle)) {
  console.error('Refusing to render v0.6.2 PDFs: v0.6.2 is withdrawn and its published print package is immutable recovery evidence.');
  process.exit(2);
}

await import('./render-v062-print-package.pre-recovery.mjs');
