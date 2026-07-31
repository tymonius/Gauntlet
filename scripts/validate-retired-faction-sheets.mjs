import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

const homepage = read('index.html');
const readme = read('README.md');

const activeLinkPatterns = [
  /href=["'][^"']*faction-sheets\//i,
  /\]\([^)]*faction-sheets\/[^)]*\)/i,
  /https:\/\/gauntlet\.run\/faction-sheets\//i,
];

for (const [name, source] of [
  ['index.html', homepage],
  ['README.md', readme],
]) {
  for (const pattern of activeLinkPatterns) {
    requireCondition(!pattern.test(source), `${name} still actively links to the retired faction sheets.`);
  }
}

requireCondition(
  !homepage.includes('<h3>Faction Sheets</h3>'),
  'The homepage still advertises Faction Sheets as an active tool.',
);
requireCondition(
  homepage.includes('href="deckbuilder/"') && homepage.includes('required faction components'),
  'The homepage must direct complete-package printing to the Deckbuilder.',
);
requireCondition(
  readme.includes('https://gauntlet.run/deckbuilder/') && readme.includes('required faction components'),
  'The root README must identify the Deckbuilder as the supported complete-package printer.',
);

for (const legacyPath of [
  'faction-sheets/index.html',
  'faction-sheets/military.html',
  'faction-sheets/diplomat.html',
  'faction-sheets/financier.html',
  'faction-sheets/intelligence.html',
  'faction-sheets/mystics.html',
  'faction-sheets/inquisition.html',
]) {
  requireCondition(
    fs.existsSync(path.join(root, legacyPath)),
    `Legacy compatibility page is missing: ${legacyPath}`,
  );
}

requireCondition(
  !fs.existsSync(path.join(root, '.github/workflows/sync-v061-faction-sheets.yml')),
  'The retired faction-sheet synchronization workflow must remain removed.',
);

console.log('Printable faction sheets are retained as legacy pages and retired from active promotion and synchronization.');
