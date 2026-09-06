import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(directory);
const sourcePath = path.join(directory, 'build-v062-release.mjs');
const temporaryPath = path.join(directory, '.build-v062-release-runtime.mjs');
const check = process.argv.includes('--check');
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
source = source.replace(
  "let sharedBody = section(sharedRulesSource, '# 1. Turn Structure', '# 8. Compact Shared Reference');",
  "chapters123 = chapters123\n  .replace('construction requirements for a custom Deck appear in Chapter 10', 'construction requirements for a custom Deck appear in Chapter 11')\n  .replace('Faction packages and their starting states appear in Part III', 'Faction packages and their starting states appear in Part IV')\n  .replace('Part III explains each faction\\'s exact arrangement', 'Part IV explains each faction\\'s exact arrangement')\n  .replace('Chapter 8 explains how control changes', 'Chapter 9 explains how control changes');\n\nlet sharedBody = section(sharedRulesSource, '# 1. Turn Structure', '# 8. Compact Shared Reference');"
);
source = source.replace(
  "  .replace('implemented in Wave B', 'listed in the Faction and Component Guide');",
  "  .replace('implemented in Wave B', 'listed in the Faction and Component Guide')\n  .replace('under the v0.6.1 positioning rules', 'under the positioning rules in this rulebook');"
);
source = source.replace(
  "  .replaceAll('Wave B', 'the v0.6.2 release');",
  "  .replaceAll('Wave B', 'the v0.6.2 release')\n  .replace('under the shared candidate', 'under the shared v0.6.2 rules')\n  .replace('Intelligence retains its v0.6.1 resource, Mission, Leader, and victory systems.', 'Intelligence retains its existing resource, Mission, Leader, and victory systems.')\n  .replace('The inherited v0.6.1 wording does not grant that permission.', 'Those cards do not grant that permission.')\n  .replace('Existing the v0.6.2 release Territory replacements', 'Existing Territory replacements')\n  .replace('The primary candidate already supplies exact v0.6.2 text for:', 'This guide supplies exact v0.6.2 text for:')\n  .replace('Source-level interaction requirements', 'Consolidated interaction rules')\n  .replace('The following behavior is fixed for later executable implementation:', 'The following interaction rules apply:')\n  .replace('18. published v0.6.1 sources remain unchanged.', '');"
);
source = source.replace(
  "${factionBody}\\n\\n---\\n\\n# Compatibility Audit\\n\\n${section(compatibilitySource, '# 1.')}\\n`;",
  "${factionBody}\\n`;"
);
source = source.replace(
  "  .replaceAll('Published v0.6.1 remains canonical until v0.6.2 is released.', 'v0.6.2 is the current canonical playtest release.');\n\nconst rulebook",
  "  .replaceAll('Published v0.6.1 remains canonical until v0.6.2 is released.', 'v0.6.2 is the current canonical playtest release.')\n  .replace('The Deckbuilder and `/start/` flow remain on the published v0.6.1 catalog until Wave D propagates this release into structured data and browser tools.', 'The published Deckbuilder and `/start/` flow use this release\\'s canonical data and starter catalog.')\n  .replace('1. Waves A and B govern rules and component behavior.\\n2. `Gauntlet_v0.6.2_Starter_Decks_Candidate.json` governs the twelve starter compositions.\\n3. This document governs first-game and tableside presentation.\\n4. The Wave C test matrix governs source-level acceptance.\\n5. Published v0.6.1 files remain canonical for current play until v0.6.2 is released.', '1. The Official Rulebook and specific component text govern play.\\n2. `Gauntlet_v0.6.2_Starter_Decks.json` governs the twelve recommended starter compositions.\\n3. This document governs first-game and tableside presentation.\\n4. v0.6.1 remains available as an immutable historical release package.');\n\nconst rulebook"
);
source = source.replace(
  "let returningGuide = returningSource\n  .replace('**Status:** Release-candidate source for returning v0.6.1 players'",
  "let returningGuide = returningSource\n  .replace('The Peace Treaty threshold remains unresolved unless separately adopted before publication.', 'The Peace Treaty still requires five different ratified Proposals in v0.6.2. Any later threshold change remains unresolved.')\n  .replace('A constructed Deck remains 30 cards with a total deckbuilding value of 60.', 'A constructed Deck still requires at least 30 cards and no more than 60 total deckbuilding value. The recommended starter Decks are exact 30-card, 60-value lists.')\n  .replace('**Status:** Release-candidate source for returning v0.6.1 players'"
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
  'This release revises turn timing, battles, Territory control, all six faction systems, starter Decks, browser tools, the Rules Arbiter, and the executable digital rules layer.',
  'This release revises turn timing, battles, Territory control, all six faction systems, starter Decks, the 128-card pool, browser tools, the Rules Arbiter, and the executable digital rules layer.'
);
source = source.replace(
  "  .replace('Entering the opponent\\'s position begins a battle', 'Entering the opponent\\'s Position creates a pending battle');",
  "  .replace('Entering the opponent\\'s position begins a battle', 'Entering the opponent\\'s Position creates a pending battle')\n  .replaceAll('complete v0.6.1 rules', 'complete v0.6.2 rules')\n  .replaceAll('v0.6.1 Deckbuilder', 'v0.6.2 Deckbuilder')\n  .replaceAll('href=\"releases/v0.6.1/\"', 'href=\"releases/v0.6.2/\"')\n  .replaceAll('v0.6.1 Release', 'v0.6.2 Release')\n  .replace('build a deck of at least 30 cards within 60 value', 'build a Deck of at least 30 cards with no more than 60 total value')\n  .replace('href=\"releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf\">Rulebook PDF', 'href=\"releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md\">Rulebook source');"
);
fs.writeFileSync(temporaryPath, source, 'utf8');

function synchronize(relativePath, transform) {
  const target = path.join(root, relativePath);
  const before = fs.readFileSync(target, 'utf8');
  const after = transform(before);
  if (after === before) return;
  if (check) {
    throw new Error(`Stale published player surface: ${relativePath}`);
  }
  fs.writeFileSync(target, after, 'utf8');
}

function publishBanner(html) {
  return html
    .replace(
      /<div class="candidate-banner"><strong>v0\.6\.2 candidate<\/strong>[^<]*<\/div>/,
      '<div class="release-banner"><strong>v0.6.2</strong> · current canonical playtest edition</div>'
    )
    .replaceAll('published v0.6.1 remains canonical', 'v0.6.2 is the current canonical playtest edition');
}

function publishStartHtml(html) {
  return publishBanner(html)
    .replaceAll('Loading the v0.6.2 candidate data…', 'Loading published v0.6.2 data…');
}

function publishStartApp(app) {
  return app
    .replace('import { loadV062CanonicalData } from "../data/canonical-data.js";\n\n', '')
    .replace('Unable to load the v0.6.2 candidate:', 'Unable to load the published v0.6.2 release:')
    .replace(
      'loadV062CanonicalData("../../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json"),\n    fetch("../../docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json", { cache: "no-store" }).then(assertJson)',
      'fetch("../../releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json", { cache: "no-store" }).then(assertJson),\n    fetch("../../releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json", { cache: "no-store" }).then(assertJson)'
    );
}

function publishDeckbuilderHtml(html) {
  return publishBanner(html)
    .replace('Build and print a Gauntlet v0.6.2 candidate Deck.', 'Build and print a legal Gauntlet v0.6.2 Deck.')
    .replace('Published v0.6.1 tool', 'Historical v0.6.1 tool')
    .replace('Candidate Deckbuilder', 'Published Deckbuilder');
}

function publishDeckbuilderApp(app) {
  return app
    .replace('import { loadV062CanonicalData, V062_VERSION } from "../data/canonical-data.js";', 'const V062_VERSION = "v0.6.2";')
    .replace('Candidate load failed.', 'Published release load failed.')
    .replace(
      'loadV062CanonicalData("../../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json"),\n    fetch("../../docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json", { cache: "no-store" }).then(assertJson)',
      'fetch("../../releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json", { cache: "no-store" }).then(assertJson),\n    fetch("../../releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json", { cache: "no-store" }).then(assertJson)'
    )
    .replaceAll('Approved Wave C starter', 'Approved v0.6.2 starter')
    .replaceAll('Legal v0.6.2 candidate Deck.', 'Legal v0.6.2 Deck.');
}

function publishReferenceHtml(html) {
  return publishBanner(html)
    .replaceAll('Generated candidate reference', 'Published canonical reference')
    .replace('This page materializes the complete v0.6.2 rules data from immutable v0.6.1 plus the merged Wave A–C candidate sources.', 'This page reads the published v0.6.2 canonical data and component reference.')
    .replaceAll('Loading candidate data…', 'Loading published v0.6.2 data…');
}

function publishReferenceApp(app) {
  let result = app
    .replace('import { loadV062CanonicalData, V062_VERSION } from "../data/canonical-data.js";', 'const V062_VERSION = "v0.6.2";')
    .replace('state.data = await loadV062CanonicalData("../../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json");', 'state.data = await fetch("../../releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json", { cache: "no-store" }).then(assertJson);')
    .replace('`<strong class="status-good">${escapeHtml(SURFACE_VERSION)} · ${escapeHtml(V062_VERSION)}</strong>', '`<strong class="status-good">Published ${escapeHtml(SURFACE_VERSION)}</strong>');
  if (!result.includes('async function assertJson(response)')) {
    result = result.replace(
      '\nfunction renderCards() {',
      '\nasync function assertJson(response) {\n  if (!response.ok) throw new Error(`Canonical data returned ${response.status}`);\n  return response.json();\n}\n\nfunction renderCards() {'
    );
  }
  return result;
}

function publishStyles(css) {
  return css.replaceAll('.candidate-banner', '.release-banner');
}

try {
  const result = spawnSync(process.execPath, [temporaryPath, ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit'
  });
  if ((result.status ?? 1) !== 0) {
    process.exitCode = result.status ?? 1;
  } else {
    synchronize('v0.6.2/start/index.html', publishStartHtml);
    synchronize('v0.6.2/start/app.js', publishStartApp);
    synchronize('v0.6.2/deckbuilder/index.html', publishDeckbuilderHtml);
    synchronize('v0.6.2/deckbuilder/app.js', publishDeckbuilderApp);
    synchronize('v0.6.2/reference/index.html', publishReferenceHtml);
    synchronize('v0.6.2/reference/app.js', publishReferenceApp);
    synchronize('v0.6.2/styles.css', publishStyles);
  }
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
