import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const fail = (m) => { console.error(`v0.6.2 historical-release validation failed: ${m}`); process.exit(1); };
const assert = (c, m) => { if (!c) fail(m); };

for (const file of [
  'releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json',
  'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',
  'releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json',
  'releases/v0.6.2/deployment-status.json',
  'v0.6.2/index.html',
  'v0.6.2/rulebook/index.html',
  'v0.6.2/deckbuilder/index.html',
  'v0.6.2/reference/index.html',
  'rules-assistant/v062-published-corpus.js',
  'rules-assistant/worker-v062.js',
]) assert(exists(file), `missing ${file}`);

const manifest = JSON.parse(read('releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json'));
const canonical = JSON.parse(read('releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json'));
const starters = JSON.parse(read('releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json'));
assert(manifest.version === 'v0.6.2' && manifest.status === 'published', 'immutable v0.6.2 manifest changed');
assert(canonical.version === 'v0.6.2' && canonical.cards?.length === 128 && canonical.territories?.length === 25 && canonical.proposals?.length === 9, 'immutable v0.6.2 canonical data changed');
const decks = Array.isArray(starters) ? starters : (starters.decks ?? starters.starters);
assert(Array.isArray(decks) && decks.length === 12, 'immutable v0.6.2 starter package changed');
assert(read('rules-assistant/v062-published-corpus.js').includes('releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md'), 'v0.6.2 published corpus no longer cites immutable release');
assert(read('rules-assistant/worker-v062.js').includes('const RULES_VERSION = "v0.6.2"'), 'historical v0.6.2 worker version changed');
console.log('Historical Gauntlet v0.6.2 validation passed: immutable package, versioned browser release, published corpus, and explicit worker remain preserved without asserting v0.6.2 is still the public default.');
