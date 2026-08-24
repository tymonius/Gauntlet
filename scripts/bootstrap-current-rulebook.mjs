import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyReleaseCandidateRulebook } from '../rulebook/release-candidate.js';
import { applyFactionFeatureTerminology } from '../rulebook/faction-feature-terminology.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readText = relative => readFile(resolve(ROOT, relative), 'utf8').then(text => text.replace(/\r\n/g, '\n'));
const readJson = relative => readText(relative).then(JSON.parse);

function replaceChapter11(source, chapter11) {
  const startMarker = '# 11. Detailed Card and Timing Rules';
  const endMarker = '# 12. Overlays and Other Shared Card Rules';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error('Current Rulebook bootstrap could not locate Chapter 11 boundaries.');
  const replacement = chapter11.trim();
  if (!replacement.startsWith(startMarker)) throw new Error('Player-facing Chapter 11 source has the wrong heading.');
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

function insertCardAnatomy(source, anatomy) {
  const marker = '## Printed card effects';
  if (!source.includes(marker)) throw new Error('Current Rulebook bootstrap could not locate Printed card effects.');
  if (source.includes('## Card anatomy')) throw new Error('Current Rulebook bootstrap found Card anatomy already inserted.');
  return source.replace(marker, `${anatomy.trim()}\n\n${marker}`);
}

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Current Rulebook bootstrap could not locate ${label}.`);
  return source.replace(search, replacement);
}

function adoptCommittedCurrentSource(appSource) {
  if (appSource.includes("const CURRENT_SOURCE_URL = './player-facing/current-rulebook.md';")) return appSource;
  let app = appSource;
  app = replaceRequired(
    app,
    "import { applyReleaseCandidateRulebook } from './release-candidate.js';\n",
    '',
    'runtime release-candidate import',
  );
  app = replaceRequired(
    app,
    "const CHAPTER_11_URL = './player-facing/chapter-11.md';",
    "const CHAPTER_11_URL = './player-facing/chapter-11.md';\nconst CURRENT_SOURCE_URL = './player-facing/current-rulebook.md';",
    'current Rulebook source declaration',
  );
  app = replaceRequired(
    app,
    'let sourcePromise = null;',
    'let sourcePromise = null;\nlet currentSourcePromise = null;',
    'Rulebook source promise',
  );
  app = replaceRequired(
    app,
    "Candidate view: current-development rules layered over the published v0.6.3 Rulebook. The Rules Arbiter currently follows released v0.6.3 and is hidden in this view.",
    'Candidate view: current-development rules from the maintained current Rulebook source. The Rules Arbiter currently follows released v0.6.3 and is hidden in this view.',
    'candidate source note',
  );
  app = replaceRequired(
    app,
    "No candidate booklet has been published. Switch to Released v0.6.3 for the official printable booklet.",
    'The current-development Rulebook source is loaded directly. Switch to Released v0.6.3 for the currently published printable booklet.',
    'candidate print note',
  );

  const loader = `async function loadCurrentRulebookSource() {
  if (!currentSourcePromise) {
    currentSourcePromise = fetch(CURRENT_SOURCE_URL, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(\`Current Rulebook source returned \${response.status}\`);
        const markdown = await response.text();
        if (!markdown.includes('**Version 0.6.4 — Release Candidate**')) throw new Error('Current Rulebook source has the wrong version marker.');
        if (!markdown.includes('# 5. Actions, Faction Features, Leader Abilities, and Assets')) throw new Error('Current Rulebook source is missing the Faction Feature chapter.');
        if (!markdown.includes('## Card anatomy')) throw new Error('Current Rulebook source is missing Card anatomy.');
        if (/\\bFaction Actions?\\b|\\bFaction Abilit(?:y|ies)\\b|\\bfaction procedure\\b/iu.test(markdown)) {
          throw new Error('Current Rulebook source contains retired faction terminology.');
        }
        return markdown;
      })
      .catch((error) => {
        currentSourcePromise = null;
        throw error;
      });
  }
  return currentSourcePromise;
}

`;
  app = replaceRequired(
    app,
    'async function renderRulebook(mode) {',
    `${loader}async function renderRulebook(mode) {`,
    'renderRulebook boundary',
  );

  app = replaceRequired(
    app,
    `    const releasedMarkdown = await loadVerifiedReleasedSource();
    let currentGame = null;
    let markdown = releasedMarkdown;
    if (activeMode === CANDIDATE_MODE) {
      currentGame = await loadCurrentGame();
      markdown = applyReleaseCandidateRulebook(releasedMarkdown, currentGame);
    }`,
    `    let currentGame = null;
    let markdown = null;
    if (activeMode === CANDIDATE_MODE) {
      [currentGame, markdown] = await Promise.all([
        loadCurrentGame(),
        loadCurrentRulebookSource(),
      ]);
    } else {
      markdown = await loadVerifiedReleasedSource();
    }`,
    'runtime Rulebook projection',
  );
  return app;
}

const [baseRulebook, manifest, proposals, arcaneSymbol, ruleChanges, chapter11, cardAnatomy, rulebookApp] = await Promise.all([
  readText('releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md'),
  readJson('game-data/current-game.json'),
  readJson('docs/v0.6.4-diplomat-proposals.json'),
  readJson('docs/v0.6.4-arcane-symbol.json'),
  readJson('docs/v0.6.4-rules.json'),
  readText('rulebook/player-facing/chapter-11.md'),
  readText('rulebook/player-facing/card-anatomy.md'),
  readText('rulebook/app.js'),
]);

const currentGame = {
  ...manifest,
  proposals: proposals.proposals || [],
  arcaneSymbol,
  ruleChanges,
};

let currentRulebook = applyReleaseCandidateRulebook(baseRulebook, currentGame);

// #903 was authored before the Terms rule source itself adopted Faction Feature.
// Normalize this one already-migrated sentence only for the one-time bootstrap;
// the committed current Rulebook becomes the maintained source after this script.
currentRulebook = currentRulebook.replace(
  'Terms are a Diplomat Faction Feature marked No Action, resolved during Onset',
  'Terms are a Diplomat faction procedure resolved during Onset',
);
currentRulebook = applyFactionFeatureTerminology(currentRulebook);
currentRulebook = replaceChapter11(currentRulebook, chapter11);
currentRulebook = insertCardAnatomy(currentRulebook, cardAnatomy);

const forbidden = [
  /\bFaction Actions?\b/u,
  /\bFaction Abilit(?:y|ies)\b/u,
  /\bfaction procedure\b/iu,
  /\bpending(?:-|\s+)battle\b/iu,
];
for (const pattern of forbidden) {
  if (pattern.test(currentRulebook)) throw new Error(`Current Rulebook bootstrap left retired terminology: ${pattern}.`);
}
if (!currentRulebook.includes('# 5. Actions, Faction Features, Leader Abilities, and Assets')) {
  throw new Error('Current Rulebook bootstrap did not install the Faction Feature chapter.');
}
if (!currentRulebook.includes('## Card anatomy')) {
  throw new Error('Current Rulebook bootstrap did not install Card anatomy.');
}

await Promise.all([
  writeFile(resolve(ROOT, 'rulebook/player-facing/current-rulebook.md'), `${currentRulebook.trim()}\n`),
  writeFile(resolve(ROOT, 'rulebook/app.js'), adoptCommittedCurrentSource(rulebookApp)),
]);
console.log('Materialized the maintained current Rulebook source and pointed the browser Rulebook at it.');
