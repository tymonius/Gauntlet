import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  loadPublicationBoundary,
  materializePublicRoutes,
} from './publication-boundary.mjs';

const destinationRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!destinationRoot) throw new Error('Usage: node scripts/stage-pages-publication.mjs <destination-directory>');
if (destinationRoot === ROOT) throw new Error('Pages staging destination must not be the repository root.');

const contract = loadPublicationBoundary();
fs.rmSync(destinationRoot, { recursive: true, force: true });
fs.mkdirSync(destinationRoot, { recursive: true });

for (const directory of contract.pages?.publishedDirectories || []) {
  const source = path.join(ROOT, directory);
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new Error(`Declared public directory is missing: ${directory}`);
  }
  fs.cpSync(source, path.join(destinationRoot, directory), { recursive: true });
}

const rootFileContract = contract.pages?.rootFiles || {};
const required = new Set(rootFileContract.required || []);
const allowedExtensions = new Set(rootFileContract.allowedExtensions || []);
for (const requiredFile of required) {
  const source = path.join(ROOT, requiredFile);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`Required public root file is missing: ${requiredFile}`);
  }
}

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const extension = path.extname(entry.name).toLowerCase();
  if (!required.has(entry.name) && !allowedExtensions.has(extension)) continue;
  fs.copyFileSync(path.join(ROOT, entry.name), path.join(destinationRoot, entry.name));
}

const materialized = materializePublicRoutes({ destinationRoot, contract });
console.log(
  `Staged ${contract.pages.publishedDirectories.length} direct public director${contract.pages.publishedDirectories.length === 1 ? 'y' : 'ies'} ` +
  `and ${materialized.length} source-separated public route(s) into ${destinationRoot}.`,
);
