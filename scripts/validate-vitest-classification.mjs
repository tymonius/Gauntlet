import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifestPath = 'tests/vitest-quarantine.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const testPattern = /(?:^|\/)[^/]+\.(?:test|spec)\.(?:ts|tsx|js|mjs)$/;

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);
const trackedTests = trackedFiles.filter((file) => testPattern.test(file));
const trackedTestSet = new Set(trackedTests);
const legacyTests = trackedTests.filter((file) => file.startsWith('legacy/'));

const errors = [];
if (manifest.schemaVersion !== 1) {
  errors.push(`Unsupported ${manifestPath} schemaVersion: ${String(manifest.schemaVersion)}`);
}
if (!Array.isArray(manifest.groups) || manifest.groups.length === 0) {
  errors.push(`${manifestPath} must contain at least one quarantine group.`);
}

const quarantined = [];
const groupIds = new Set();
for (const group of manifest.groups || []) {
  if (!group || typeof group !== 'object') {
    errors.push('Every quarantine group must be an object.');
    continue;
  }
  if (typeof group.id !== 'string' || !group.id.trim()) {
    errors.push('Every quarantine group must have a non-empty id.');
  } else if (groupIds.has(group.id)) {
    errors.push(`Duplicate quarantine group id: ${group.id}`);
  } else {
    groupIds.add(group.id);
  }
  if (typeof group.reason !== 'string' || !group.reason.trim()) {
    errors.push(`Quarantine group ${group.id || '<missing id>'} must explain why its tests are excluded.`);
  }
  if (!Array.isArray(group.files) || group.files.length === 0) {
    errors.push(`Quarantine group ${group.id || '<missing id>'} must list at least one file.`);
    continue;
  }
  quarantined.push(...group.files);
}

const seen = new Set();
for (const file of quarantined) {
  if (typeof file !== 'string' || !file.trim()) {
    errors.push('Quarantine file entries must be non-empty strings.');
    continue;
  }
  if (seen.has(file)) errors.push(`Duplicate quarantine file: ${file}`);
  seen.add(file);
  if (!testPattern.test(file)) errors.push(`Quarantine entry is not a Vitest test path: ${file}`);
  if (file.startsWith('legacy/')) {
    errors.push(`Do not quarantine legacy tests individually; legacy/ is retired as a class: ${file}`);
  }
  if (!trackedTestSet.has(file)) {
    errors.push(`Quarantine entry is not a tracked test file: ${file}`);
  }
}

const quarantineSet = new Set(quarantined);
const maintainedTests = trackedTests.filter(
  (file) => !file.startsWith('legacy/') && !quarantineSet.has(file),
);

if (errors.length) {
  console.error('Vitest classification is invalid:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log([
  'Vitest classification valid.',
  `tracked=${trackedTests.length}`,
  `maintained=${maintainedTests.length}`,
  `legacy=${legacyTests.length}`,
  `quarantined=${quarantineSet.size}`,
].join(' '));
