import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const candidateRoot = 'artifacts/v0.6.3/print-candidate';
const htmlRoot = `${candidateRoot}/html`;
const manifestPath = `${candidateRoot}/Gauntlet_v0.6.3_Print_Manifest.json`;
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const assert = (condition, message) => { if (!condition) failures.push(message); };

const faviconLinks = [
  '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />',
  '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />',
];
const analyticsLoader = 'https://www.googletagmanager.com/gtag/js?id=G-8YYYZJGGPE';
const analyticsMarker = "gtag('config', 'G-8YYYZJGGPE');";

const manifest = JSON.parse(read(manifestPath));
const byKey = new Map((manifest.outputs ?? []).map((item) => [item.key, item]));

// Lock the visually reviewed release-candidate pagination. The Rulebook reader
// is 46 half-letter pages; imposition pads it to 48 logical pages and therefore
// produces 24 landscape booklet sheets.
assert(byKey.get('rulebook')?.pages === 46, `Rulebook must remain exactly 46 reader pages; found ${byKey.get('rulebook')?.pages ?? 'missing'}.`);
assert(byKey.get('rulebook_booklet')?.pages === 24, `Rulebook booklet must remain exactly 24 imposed sheets; found ${byKey.get('rulebook_booklet')?.pages ?? 'missing'}.`);

// Visual audit found that the compact Reference could gain a completely blank
// trailing fifth page even while geometry checks remained green.
assert(byKey.get('reference')?.pages === 4, `Reference Guide must remain exactly 4 pages; found ${byKey.get('reference')?.pages ?? 'missing'}.`);
assert(byKey.get('tableside_pack')?.pages === 22, `Tableside Pack must remain exactly 22 pages after the 4-page Reference; found ${byKey.get('tableside_pack')?.pages ?? 'missing'}.`);

// Long-form candidate HTML once printed a generator comment and repeated the
// document title through a wrapper H1. Keep the wrapper as a compact banner and
// let the source document provide the sole visible document heading.
const longForms = [
  ['rulebook.html', 'Gauntlet v0.6.3 Rulebook'],
  ['reference-guide.html', 'Gauntlet v0.6.3 Reference Guide'],
  ['first-game-guide.html', 'Gauntlet v0.6.3 First Game and Tableside Guide'],
  ['faction-guide.html', 'Gauntlet v0.6.3 Faction and Component Guide'],
  ['returning-player-changes.html', 'What Changed in Gauntlet v0.6.3'],
];
for (const [file, title] of longForms) {
  const html = read(`${htmlRoot}/${file}`);
  assert(!html.includes('&lt;!-- Generated'), `${file} exposes the escaped generator comment.`);
  assert(!html.includes('<!-- Generated'), `${file} exposes the generator comment.`);
  assert(!/<header class="document-header"><h1\b/.test(html), `${file} reintroduced a duplicate wrapper H1.`);
  assert(/<header class="document-header"><p\b/.test(html), `${file} is missing the compact release-candidate banner.`);
  assert(html.includes(title), `${file} is missing its source document title: ${title}`);
  for (const link of faviconLinks) assert(html.includes(link), `${file} is missing print-candidate favicon metadata: ${link}`);
}

const indexHtml = read(`${htmlRoot}/index.html`);
for (const link of faviconLinks) assert(indexHtml.includes(link), `index.html is missing print-candidate favicon metadata: ${link}`);

// Every complete HTML review page is subject to the repository-wide analytics
// convention. The fixed-layout pages inherit the published print snippet; the
// new long-form pages and local index receive the same tag from their generator.
const completeHtmlPages = [
  'rulebook.html',
  'reference-guide.html',
  'first-game-guide.html',
  'faction-guide.html',
  'returning-player-changes.html',
  'player-mat.html',
  'playtest-sheet.html',
  'faction-teaching-cards.html',
  'active-player-marker.html',
  'index.html',
];
for (const file of completeHtmlPages) {
  const html = read(`${htmlRoot}/${file}`);
  const loaderCount = html.split(analyticsLoader).length - 1;
  const configCount = html.split(analyticsMarker).length - 1;
  assert(loaderCount === 1, `${file} must contain exactly one Gauntlet Google Analytics loader; found ${loaderCount}.`);
  assert(configCount === 1, `${file} must contain exactly one Gauntlet Google Analytics configuration; found ${configCount}.`);
}

// The legacy combined hero-plate PNGs are truncated files. The booklet must be
// composed from the valid individual approved Leader sketches instead.
const expectedLeaderPlates = [
  {
    leaders: ['Witch Hunter', 'Banker', 'Spymaster'],
    assets: ['images/sketches/witch hunter.png', 'images/sketches/banker.png', 'images/sketches/spymaster.png'],
  },
  {
    leaders: ['Alchemist', 'Executive', 'Ambassador'],
    assets: ['images/sketches/alchemist.png', 'images/sketches/executive.png', 'images/sketches/ambassador.png'],
  },
];
const actualLeaderPlates = manifest.booklet_padding?.leader_plates ?? [];
assert(actualLeaderPlates.length === expectedLeaderPlates.length, `Expected ${expectedLeaderPlates.length} booklet Leader plates; found ${actualLeaderPlates.length}.`);
for (let index = 0; index < expectedLeaderPlates.length; index += 1) {
  const expected = expectedLeaderPlates[index];
  const actual = actualLeaderPlates[index] ?? {};
  assert(JSON.stringify(actual.leaders) === JSON.stringify(expected.leaders), `Booklet Leader plate ${index + 1} has wrong Leader order: ${JSON.stringify(actual.leaders)}.`);
  assert(JSON.stringify(actual.assets) === JSON.stringify(expected.assets), `Booklet Leader plate ${index + 1} has wrong source assets: ${JSON.stringify(actual.assets)}.`);
}
for (const plate of actualLeaderPlates) {
  for (const asset of plate.assets ?? []) {
    assert(!asset.startsWith('images/sketches/hero-plates/'), `Booklet still uses corrupt combined hero-plate asset: ${asset}`);
    const target = path.join(root, asset);
    assert(fs.existsSync(target), `Missing booklet Leader sketch: ${asset}`);
    if (fs.existsSync(target)) {
      const bytes = fs.readFileSync(target);
      assert(bytes.length > 100000, `Booklet Leader sketch is unexpectedly small: ${asset} (${bytes.length} bytes).`);
      assert(bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', `Booklet Leader sketch is not a PNG: ${asset}`);
    }
  }
}

if (failures.length) {
  console.error('v0.6.3 print visual-regression validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('v0.6.3 print visual regressions locked: 46-page Rulebook, 24-sheet booklet, 4-page Reference, 22-page Tableside Pack, clean long-form banners, single favicon/analytics metadata, and valid individual-sketch booklet plates.');
