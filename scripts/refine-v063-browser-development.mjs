import fs from 'node:fs';

const indexPath = 'v0.6.3/deckbuilder/index.html';
const appPath = 'v0.6.3/deckbuilder/app.js';
const rulebookPath = 'v0.6.3/rulebook/index.html';
const completePages = [
  'v0.6.3/index.html',
  'v0.6.3/rulebook/index.html',
  'v0.6.3/start/index.html',
  'v0.6.3/quick-reference/index.html',
  'v0.6.3/changes/index.html',
  'v0.6.3/reference/index.html',
  'v0.6.3/deckbuilder/index.html',
];

const canonicalFaviconLinks = [
  ['<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32">', '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />'],
  ['<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any">', '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />'],
  ['<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1">', '<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />'],
];

function replaceAllRequired(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing link-refinement marker: ${label ?? from}`);
  return text.replaceAll(from, to);
}

function normalizeGeneratedDocLinks(file, rootPage = false) {
  let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const replacements = rootPage
    ? [
        ['href="/"', 'href="../"'],
        ['href="/v0.6.3/"', 'href="./"'],
        ['href="/v0.6.3/start/"', 'href="start/"'],
        ['href="/v0.6.3/rulebook/"', 'href="rulebook/"'],
        ['href="/v0.6.3/quick-reference/"', 'href="quick-reference/"'],
        ['href="/v0.6.3/deckbuilder/"', 'href="deckbuilder/"'],
        ['href="/v0.6.3/reference/"', 'href="reference/"'],
        ['href="/v0.6.3/changes/"', 'href="changes/"'],
        ['href="/v0.6.2/"', 'href="../v0.6.2/"'],
        ['href="/v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json"', 'href="data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json"'],
        ['href="/v0.6.3/styles.css"', 'href="styles.css"'],
      ]
    : [
        ['href="/"', 'href="../../"'],
        ['href="/v0.6.3/"', 'href="../"'],
        ['href="/v0.6.3/start/"', 'href="../start/"'],
        ['href="/v0.6.3/rulebook/"', 'href="../rulebook/"'],
        ['href="/v0.6.3/quick-reference/"', 'href="../quick-reference/"'],
        ['href="/v0.6.3/deckbuilder/"', 'href="../deckbuilder/"'],
        ['href="/v0.6.3/reference/"', 'href="../reference/"'],
        ['href="/v0.6.3/changes/"', 'href="../changes/"'],
        ['href="/v0.6.2/"', 'href="../../v0.6.2/"'],
        ['href="/v0.6.3/styles.css"', 'href="../styles.css"'],
      ];

  for (const [from, to] of replacements) {
    text = replaceAllRequired(text, from, to, `${file}: ${from}`);
  }

  fs.writeFileSync(file, text.replace(/\s+$/, '') + '\n', 'utf8');
}

function normalizeFaviconMarkup(file) {
  let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const [nonCanonical, canonical] of canonicalFaviconLinks) {
    if (text.includes(nonCanonical)) text = text.replaceAll(nonCanonical, canonical);
  }
  fs.writeFileSync(file, text.replace(/\s+$/, '') + '\n', 'utf8');
}

let index = fs.readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');
index = index
  .replace('load the approved starter, or customize', 'load an inherited starter list, or customize')
  .replace('Load approved starter', 'Load inherited starter')
  .replace(
    '<div id="territories" class="choice-grid"></div>',
    '<p class="muted">Choose the three Territory cards that belong to the Deck. A loaded starter may recommend their order from your own end toward the opponent, but that order is strategy guidance, not a setup lock. After opening selection, you may keep the recommendation or rearrange the three Territories.</p><div id="territories" class="choice-grid"></div>'
  )
  .replace('<ol id="selectedTerritories"></ol>', '<ul id="selectedTerritories"></ul>');
fs.writeFileSync(indexPath, index.replace(/\s+$/, '') + '\n', 'utf8');

let app = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
if (!app.startsWith('import { migrateV063StarterCatalog }')) {
  app = `import { migrateV063StarterCatalog } from './starter-adapter.js';\n\n${app}`;
}
app = app
  .replace('Published release load failed.', 'Candidate load failed.')
  .replace('state.starters = starterData.decks ?? [];', 'state.starters = migrateV063StarterCatalog(starterData).decks ?? [];')
  .replace('No approved starter matches this faction and Leader.', 'No inherited starter matches this faction and Leader.')
  .replace(
    '<strong>${escapeHtml(territory.name)}${selectedIndex >= 0 ? ` · ${selectedIndex + 1}` : ""}</strong>',
    '<strong>${escapeHtml(territory.name)}</strong>'
  )
  .replace(
    '<p><strong>Territories:</strong> ${deck.territories.map(escapeHtml).join(", ")}. Arrange these three after opening selection.</p>',
    '<p><strong>Recommended Territory order (own end → opponent end):</strong> ${(deck.recommendedTerritoryOrder ?? deck.territories).map(escapeHtml).join(" → ")}</p><p><strong>Setup:</strong> After choosing your opening discard, keep this order or rearrange these three Territories to fit your opening Hand and discard. Initiative is not yet known.</p>'
  )
  .replace('validation.valid ? "Ready to print"', 'validation.valid ? "Candidate valid"')
  .replace('Legal v0.6.2 Deck.', 'Legal v0.6.3 candidate Deck.')
  .replace('Starter card missing from effective data:', 'Inherited starter card missing from candidate data:');
fs.writeFileSync(appPath, app.replace(/\s+$/, '') + '\n', 'utf8');

let rulebook = fs.readFileSync(rulebookPath, 'utf8').replace(/\r\n/g, '\n');
rulebook = rulebook
  .replace(
    '<li><strong>Part IV — Factions and Components</strong> contains the complete v0.6.2 faction, Proposal, card-revision, and Territory-revision rules.</li>',
    '<li><strong>Part IV — Factions and Components</strong> contains the inherited v0.6.2 faction/component baseline, with duplicated card excerpts synchronized to the final v0.6.3 card candidate.</li>'
  )
  .replace(
    'The First Game Guide and compact Reference Guide are player aids; this rulebook and specific component text remain authoritative.',
    'The First Game Guide and compact Reference Guide are player aids. During development, the governing v0.6.3 source documents control candidate changes; v0.6.2 remains authoritative for published play.'
  )
  .replaceAll('<hr>\n<hr>', '<hr>');
fs.writeFileSync(rulebookPath, rulebook.replace(/\s+$/, '') + '\n', 'utf8');

normalizeGeneratedDocLinks('v0.6.3/index.html', true);
for (const file of [
  'v0.6.3/rulebook/index.html',
  'v0.6.3/start/index.html',
  'v0.6.3/quick-reference/index.html',
  'v0.6.3/changes/index.html',
]) {
  normalizeGeneratedDocLinks(file, false);
}

for (const file of completePages) normalizeFaviconMarkup(file);

// The candidate Rules Arbiter is an additive development surface. Apply its
// portal refinement after the normal browser regeneration so the standard
// v0.6.3 browser build cannot erase the Arbiter link.
await import('./refine-v063-rules-arbiter-portal.mjs');

console.log('Refined v0.6.3 development browser surfaces: starter title migration and strategic Territory-order guidance, Deckbuilder setup semantics, Rulebook development-source boundary, repository-safe relative navigation, canonical favicon markup, and candidate Rules Arbiter portal link.');
