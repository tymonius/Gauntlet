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

function collectHtmlFiles(directory, collected = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectHtmlFiles(absolute, collected);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      collected.push(path.relative(root, absolute).replaceAll(path.sep, '/'));
    }
  }
  return collected;
}

const homepage = read('index.html');
const readme = read('README.md');

const activeLinkPatterns = [
  /href=["'][^"']*faction-sheets\//i,
  /\]\([^)]*faction-sheets\/[^)]*\)/i,
  /https:\/\/gauntlet\.run\/faction-sheets\//i,
];

const activeHtmlPaths = ['index.html'];
for (const directory of [
  'factions',
  'rulebook',
  'card-reference',
  'deckbuilder',
  'deckbuilder-v0.6',
  'playtest',
  'typography',
  'card-design',
  'rules-assistant',
]) {
  const absolute = path.join(root, directory);
  if (fs.existsSync(absolute)) collectHtmlFiles(absolute, activeHtmlPaths);
}

for (const relativePath of activeHtmlPaths) {
  const source = read(relativePath);
  for (const pattern of activeLinkPatterns) {
    requireCondition(
      !pattern.test(source),
      `${relativePath} still actively links to the retired faction sheets.`,
    );
  }
}

for (const pattern of activeLinkPatterns) {
  requireCondition(!pattern.test(readme), 'README.md still actively links to the retired faction sheets.');
}

requireCondition(
  !homepage.includes('<h3>Faction Sheets</h3>'),
  'The homepage still advertises Faction Sheets as an active tool.',
);
const homepagePromotesCompletePackage =
  homepage.includes('required faction components') ||
  homepage.includes('complete playtest package');
const homepageDeckbuilderLink = /href=["'](?:v\d+\.\d+\.\d+\/)?deckbuilder\/["']/i.test(homepage);
requireCondition(
  homepageDeckbuilderLink && homepagePromotesCompletePackage,
  'The homepage must direct complete-package printing to the current Deckbuilder.',
);

const readmeDeckbuilderLink = /https:\/\/gauntlet\.run\/(?:v\d+\.\d+\.\d+\/)?deckbuilder\//i.test(readme);
requireCondition(
  readmeDeckbuilderLink && readme.includes('required faction components'),
  'The root README must identify the current Deckbuilder as the supported complete-package printer.',
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

console.log(
  `Printable faction sheets remain as legacy pages and are absent from ${activeHtmlPaths.length} active HTML surfaces; complete-package printing routes to the current Deckbuilder.`,
);