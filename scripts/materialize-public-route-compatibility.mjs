import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const historicalRoot = path.join(root, 'legacy', 'public-versions');

if (!fs.existsSync(historicalRoot)) {
  throw new Error('Historical public-version route sources are missing.');
}

const versions = fs.readdirSync(historicalRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^v\d+\.\d+\.\d+$/.test(entry.name))
  .map(entry => entry.name)
  .sort();

if (!versions.length) throw new Error('No historical public-version route sources were found.');

for (const version of versions) {
  const source = path.join(historicalRoot, version, 'index.html');
  if (!fs.existsSync(source)) throw new Error(`Historical route source is missing: legacy/public-versions/${version}/index.html.`);
  const destinationDir = path.join(root, version);
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.copyFileSync(source, path.join(destinationDir, 'index.html'));
}

console.log(`Materialized ${versions.length} historical public-version compatibility route(s): ${versions.join(', ')}.`);
