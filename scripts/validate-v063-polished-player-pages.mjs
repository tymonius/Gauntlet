import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (message) => {
  console.error(`v0.6.3 polished-player-page validation failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

for (const file of [
  'start/index.html',
  'start/app.js',
  'rulebook/index.html',
  'rulebook/app.js',
  'v0.6.3/start/index.html',
  'v0.6.3/rulebook/index.html',
]) assert(fs.existsSync(path.join(root, file)), `missing ${file}`);

const start = read('start/index.html');
assert(start.includes('start-hero') && start.includes('faction-choice-grid') && start.includes('intro-grid') && start.includes('print-action-card'), 'current Start page no longer uses the established polished production UI');
assert(start.includes('canonical v0.6.3') && !start.includes('canonical v0.6.1'), 'current Start page does not identify v0.6.3');
assert(start.includes('Draw four cards, discard one face up, and keep three as your opening Hand.'), 'current Start page does not teach opening draw 4 / discard 1 / keep 3');
assert(start.includes('With that Hand and opening discard known, secretly arrange your three Territories.'), 'current Start page does not teach Territory arrangement after opening selection');
assert(start.includes('Advance, Hold, or Fall Back') && start.includes('withdraws'), 'current Start page does not teach v0.6.3 movement terminology');
assert(start.includes('Defensive Edge') && start.includes('Tiebreak Roll'), 'current Start page does not teach the v0.6.3 tie procedure');
assert(start.includes("capturing the Territory at your opponent's end") && start.includes("winning your opponent's Last Stand"), 'current Start page does not teach both normal victory routes');
assert(start.includes('You do not need to capture the final Territory first.'), 'current Start page implies final-Territory capture is required before Last Stand');
assert(!start.includes("The normal victory is to capture the opponent's final territory, advance beyond the battlefield, and win the resulting Last Stand"), 'current Start page retains the retired sequential victory explanation');
assert(read('start/app.js').includes('../deckbuilder/starter-decks.json'), 'current Start page no longer loads the published starter catalog through the polished Deckbuilder');

const startHandoff = read('v0.6.3/start/index.html');
assert(startHandoff.includes('https://gauntlet.run/start/') && startHandoff.includes("location.replace('/start/'"), 'versioned v0.6.3 Start route does not hand off to the polished current page');

const rulebookIndex = read('rulebook/index.html');
const rulebookApp = read('rulebook/app.js');
assert(rulebookIndex.includes('rulebook-hero') && rulebookIndex.includes('rulebook-sidebar') && rulebookIndex.includes('rulebook-search'), 'current Rulebook no longer uses the established polished production UI');
assert(rulebookIndex.includes('Gauntlet v0.6.3 Browser Rulebook') && !rulebookIndex.includes('Gauntlet v0.6.1 Browser Rulebook'), 'current Rulebook shell does not identify v0.6.3');
assert(rulebookIndex.includes('../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.pdf') && rulebookIndex.includes('../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook_Booklet.pdf'), 'current Rulebook download links are not v0.6.3');
assert(rulebookApp.includes("const SOURCE_URL = '../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md';"), 'polished Rulebook is not rendering the immutable v0.6.3 Markdown source');
assert(rulebookApp.includes('Canonical v0.6.3'), 'polished Rulebook runtime does not identify v0.6.3');
assert(!rulebookApp.includes('v0.6.1/Gauntlet_v0.6.1_Rulebook'), 'polished Rulebook runtime retains v0.6.1 source links');

const rulebookHandoff = read('v0.6.3/rulebook/index.html');
assert(rulebookHandoff.includes('https://gauntlet.run/rulebook/') && rulebookHandoff.includes("location.replace('/rulebook/'"), 'versioned v0.6.3 Rulebook route does not hand off to the polished current page');

for (const file of ['v0.6.3/start/index.html', 'v0.6.3/rulebook/index.html']) {
  const text = read(file);
  for (const icon of ['/favicon-32.png?v=20260804-1', '/favicon.ico?v=20260804-1', '/apple-touch-icon.png?v=20260804-1']) {
    assert(text.includes(icon), `${file} is missing ${icon}`);
  }
  assert(text.includes('G-8YYYZJGGPE'), `${file} is missing the Google Analytics tag`);
}

console.log('Polished v0.6.3 Start and Rulebook validation passed.');
