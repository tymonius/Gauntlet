import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const factions = [
  ['military', 'Military', '⚔'],
  ['diplomats', 'Diplomats', '§'],
  ['financiers', 'Financiers', '◆'],
  ['intelligence', 'Intelligence', '◉'],
  ['mystics', 'Mystics', '✦'],
  ['inquisition', 'Inquisition', '✠'],
];

for (const [slug] of factions) {
  assert(exists(`images/faction-symbols/${slug}.svg`), `Missing canonical faction-symbol asset: ${slug}.svg`);
}

const publicUiFiles = [
  'index.html',
  'start/index.html',
  'factions/index.html',
  ...factions.map(([slug]) => `factions/${slug}/index.html`),
];
for (const relative of publicUiFiles) {
  const text = read(relative);
  for (const [, name, unicode] of factions) {
    assert(!text.includes(unicode), `${relative} still exposes Unicode ${name} faction placeholder ${unicode}.`);
  }
}

const homepage = read('index.html');
const start = read('start/index.html');
const hub = read('factions/index.html');
for (const [slug, name] of factions) {
  assert(homepage.includes(`images/faction-symbols/${slug}.svg`), `Homepage missing ${name} faction-symbol asset.`);
  assert(start.includes(`../images/faction-symbols/${slug}.svg`), `Start Playing missing ${name} faction-symbol asset.`);
  assert(hub.includes(`../images/faction-symbols/${slug}.svg`), `Factions hub missing ${name} faction-symbol asset.`);
  const factionPage = read(`factions/${slug}/index.html`);
  assert(factionPage.includes(`../../images/faction-symbols/${slug}.svg`), `${name} guide missing its faction-symbol asset.`);
  assert(factionPage.includes('faction-eyebrow-symbol'), `${name} guide lacks asset-backed hero-symbol treatment.`);
}

const startStyles = read('start/styles.css');
assert(startStyles.startsWith('@import url("../design-tokens.css");'), 'Start Playing does not import shared typography roles.');
assert(!startStyles.includes('var(--font-display,Georgia,serif)'), 'Start Playing still contains the legacy bold-Georgia display treatment.');
assert(startStyles.includes('font-family:var(--font-display-historical);font-weight:400;'), 'Start Playing does not use the historical display face at normal weight.');
assert(startStyles.includes('choice-mark.faction-symbol-asset'), 'Start Playing lacks asset-backed faction-symbol styling.');
assert(read('factions/homepage.css').includes('faction-symbol.faction-symbol-asset'), 'Homepage lacks asset-backed faction-symbol styling.');
const factionCss = read('factions/factions.css');
assert(factionCss.includes('hub-symbol.faction-symbol-asset'), 'Factions hub lacks asset-backed faction-symbol styling.');
assert(factionCss.includes('faction-eyebrow-symbol.faction-symbol-asset'), 'Faction guide headers lack asset-backed faction-symbol styling.');

const rulebook = read('rulebook/index.html');
const bookletHref = '../releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook_Booklet.pdf';
assert(rulebook.includes(bookletHref), 'Browser Rulebook does not expose the printable booklet.');
assert(!rulebook.includes('>Reader PDF<'), 'Browser Rulebook still exposes Reader PDF.');
assert(!rulebook.includes('>Markdown<'), 'Browser Rulebook still exposes Markdown.');
assert(!rulebook.includes('data-print-rulebook'), 'Browser Rulebook still exposes browser printing.');

const releaseManifest = JSON.parse(read('releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Manifest.json'));
const booklet = releaseManifest.pdf_outputs.find((item) => item.key === 'rulebook-booklet');
assert(booklet, 'Release manifest does not include printable booklet.');
assert.equal(booklet.path, 'Gauntlet_v0.6.3_Rulebook_Booklet.pdf');
assert.equal(booklet.pages, 32);
assert(exists('releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook_Booklet.pdf'), 'Release booklet PDF is missing.');

console.log('Validated v0.6.3 public UI invariants: real faction symbols, Start typography, and booklet-only rulebook print path.');
