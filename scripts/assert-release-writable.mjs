import process from 'node:process';
import { validateReleaseLifecycle } from './release-lifecycle.mjs';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/assert-release-writable.mjs <version>');
  process.exit(2);
}

const lifecycle = validateReleaseLifecycle();
const release = lifecycle.releases?.[version];
if (!release) {
  console.error(`Refusing write: ${version} is not declared in config/release-lifecycle.json.`);
  process.exit(2);
}
if (release.status === 'withdrawn') {
  console.error(`Refusing write: ${version} is withdrawn. Historical artifacts are immutable recovery evidence; reconstruct into a new clean candidate path instead of overwriting them.`);
  process.exit(2);
}
if (release.status === 'historical') {
  console.error(`Refusing write: ${version} is historical and immutable.`);
  process.exit(2);
}

console.log(`${version} lifecycle=${release.status}; write operation permitted.`);
