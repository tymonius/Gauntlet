import fs from 'node:fs';

const indexPath = 'v0.6.3/deckbuilder/index.html';
const appPath = 'v0.6.3/deckbuilder/app.js';
const rulebookPath = 'v0.6.3/rulebook/index.html';

let index = fs.readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');
index = index
  .replace('load the approved starter, or customize', 'load an inherited starter list, or customize')
  .replace('Load approved starter', 'Load inherited starter')
  .replace(
    '<div id="territories" class="choice-grid"></div>',
    '<p class="muted">Choose the three Territory cards that belong to the Deck. Their selection order here is not their setup order; arrange them after opening selection.</p><div id="territories" class="choice-grid"></div>'
  )
  .replace('<ol id="selectedTerritories"></ol>', '<ul id="selectedTerritories"></ul>');
fs.writeFileSync(indexPath, index.replace(/\s+$/, '') + '\n', 'utf8');

let app = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
app = app
  .replace('Published release load failed.', 'Candidate load failed.')
  .replace('No approved starter matches this faction and Leader.', 'No inherited starter matches this faction and Leader.')
  .replace(
    '<strong>${escapeHtml(territory.name)}${selectedIndex >= 0 ? ` · ${selectedIndex + 1}` : ""}</strong>',
    '<strong>${escapeHtml(territory.name)}</strong>'
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

console.log('Refined v0.6.3 development browser surfaces: Deckbuilder setup semantics and Rulebook development-source boundary.');
