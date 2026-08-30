import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const architecturePath = path.join(root, 'docs', 'Repository_Architecture.md');
const source = fs.readFileSync(architecturePath, 'utf8').replace(/\r\n/g, '\n');

const startMarker = '## Current path classification';
const endMarker = '## Target architecture';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Repository Architecture is missing a valid current-classification section.');
}

const classification = source.slice(start, end);
const classified = new Set(
  [...classification.matchAll(/\|\s+`([^`]+)\/`\s+\|/g)]
    .map(([, value]) => value)
    .filter(value => !value.includes('/')),
);

const ignoredRootDirectories = new Set(['.git', 'node_modules']);
const actual = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && !ignoredRootDirectories.has(entry.name))
  .map(entry => entry.name)
  .sort();

const missing = actual.filter(directory => !classified.has(directory));
const stale = [...classified].filter(directory => !actual.includes(directory)).sort();

const failures = [];
if (missing.length) {
  failures.push(
    `Unclassified top-level director${missing.length === 1 ? 'y' : 'ies'}: ${missing.join(', ')}. ` +
    'Add each current root directory to the Current path classification tables in docs/Repository_Architecture.md.',
  );
}
if (stale.length) {
  failures.push(
    `Stale top-level classification${stale.length === 1 ? '' : 's'}: ${stale.join(', ')}. ` +
    'Remove or update classifications for root directories that no longer exist.',
  );
}

if (failures.length) {
  throw new Error(`Repository architecture validation failed:\n- ${failures.join('\n- ')}`);
}

console.log(
  `Repository architecture classification passed: ${actual.length} top-level directories are explicitly classified.`,
);
