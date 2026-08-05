import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(directory, 'build-v062-release.mjs');
const temporaryPath = path.join(directory, '.build-v062-release-runtime.mjs');
let source = fs.readFileSync(sourcePath, 'utf8');

const start = source.indexOf('const publishedCorpus =');
const marker = "expectedFile('rules-assistant/v062-published-corpus.js', publishedCorpus);";
const end = source.indexOf(marker, start);
if (start < 0 || end < 0) {
  throw new Error('Could not locate the published-corpus generation block.');
}

source = `${source.slice(0, start)}const publishedCorpus = read('rules-assistant/v062-published-corpus.js');\n${marker}${source.slice(end + marker.length)}`;
source = source.replace(
  "section(sharedReferenceSource, '# Turn')",
  "section(sharedReferenceSource, '# Your Turn')"
);
source = source.replace(
  "const starterSource = read('docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json');",
  "const starterData = JSON.parse(read('docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json'));\nstarterData.version = 'v0.6.2';\nstarterData.status = 'published';\nconst starterSource = JSON.stringify(starterData, null, 2);"
);
source = source
  .replaceAll(
    '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32">',
    '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />'
  )
  .replaceAll(
    '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any">',
    '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />'
  )
  .replaceAll(
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />'
  );
source = source.replace(
  "  .replace('Entering the opponent\\'s position begins a battle', 'Entering the opponent\\'s Position creates a pending battle');",
  "  .replace('Entering the opponent\\'s position begins a battle', 'Entering the opponent\\'s Position creates a pending battle')\n  .replaceAll('complete v0.6.1 rules', 'complete v0.6.2 rules')\n  .replaceAll('v0.6.1 Deckbuilder', 'v0.6.2 Deckbuilder')\n  .replaceAll('href=\"releases/v0.6.1/\"', 'href=\"releases/v0.6.2/\"')\n  .replaceAll('v0.6.1 Release', 'v0.6.2 Release')\n  .replace('build a deck of at least 30 cards within 60 value', 'build a 30-card Deck totaling 60 value')\n  .replace('href=\"releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf\">Rulebook PDF', 'href=\"releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md\">Rulebook source');"
);
fs.writeFileSync(temporaryPath, source, 'utf8');

try {
  const result = spawnSync(process.execPath, [temporaryPath, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
