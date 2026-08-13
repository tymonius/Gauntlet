import { isWithdrawn, validateReleaseLifecycle } from './release-lifecycle.mjs';

const lifecycle = validateReleaseLifecycle();
if (isWithdrawn('v0.6.2', lifecycle)) {
  await import('./validate-v062-withdrawn-release.mjs');
} else {
  await import('./validate-v062-published-release.pre-recovery.mjs');
}
