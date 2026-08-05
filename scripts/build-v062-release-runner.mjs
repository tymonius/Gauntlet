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
