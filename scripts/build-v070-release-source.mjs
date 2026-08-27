import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROOT, loadCurrentGameAuthority } from './current-game-authority.mjs';

const RELEASE_VERSION = 'v0.7.0';
const RELEASE_NAME = 'Illustrated Cards & Tabletop Simulator';
const RELEASE_DIR = join(ROOT, 'releases', RELEASE_VERSION);
const PUBLIC_DIR = join(ROOT, RELEASE_VERSION);
const CURRENT_GAME_SOURCE = 'game-data/current-game.json';
const CURRENT_RULEBOOK_SOURCE = 'rulebook/player-facing/current-rulebook.md';

const jsonText = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const readText = relative => readFile(join(ROOT, relative), 'utf8').then(text => text.replace(/\r\n/g, '\n'));
const writeText = async (path, value) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value);
};
const clone = value => JSON.parse(JSON.stringify(value));

function addCardAnatomyFigure(markdown) {
  const source = String(markdown || '').replace(/\r\n/g, '\n');
  if (!source.includes('**Version 0.7.0**')) {
    throw new Error('Current Rulebook authority is not natively v0.7.0.');
  }
  if (/Release candidate|GENERATED CLEAN V0\.6\.3/u.test(source)) {
    throw new Error('Current Rulebook authority still contains transitional publication markers.');
  }
  const marker = "Most ordinary playable cards use the same frame. Read these elements when constructing a Deck and resolving a card in play:\n\n";
  if (!source.includes(marker)) {
    throw new Error('Card Anatomy introduction marker is missing from the current Rulebook authority.');
  }
  const figure = '![Card anatomy diagram](</releases/v0.7.0/Gauntlet_v0.7.0_Card_Anatomy.png>)\n\n';
  return source.replace(marker, marker + figure);
}

function validateAuthority(authority) {
  if (authority.schemaVersion !== 2 || authority.authority !== 'current-game' || authority.version !== RELEASE_VERSION) {
    throw new Error('v0.7.0 publication requires the complete v0.7.0 current-game authority.');
  }
  for (const forbidden of ['sources', 'resolution', 'baseVersion', 'factionOverrides']) {
    if (Object.prototype.hasOwnProperty.call(authority, forbidden)) {
      throw new Error(`Publication authority still contains transitional field ${forbidden}.`);
    }
  }
  if (authority.gameplay?.cards?.length !== 142) throw new Error('v0.7.0 requires 142 playable cards.');
  if (authority.gameplay?.territories?.length !== 25) throw new Error('v0.7.0 requires 25 Territories.');
  if (authority.gameplay?.factions?.length !== 6) throw new Error('v0.7.0 requires six factions.');
  if (authority.leaders?.length !== 12) throw new Error('v0.7.0 requires 12 structured Leaders.');
  if (authority.proposals?.length !== 9) throw new Error('v0.7.0 requires nine Proposals.');
  if (authority.starterDecks?.decks?.length !== 12) throw new Error('v0.7.0 requires 12 starter Decks.');
  if (!authority.factionFeatureTaxonomy || !authority.factionFeatures) {
    throw new Error('v0.7.0 requires current Faction Feature authority.');
  }

  const active = JSON.stringify({
    gameplay: authority.gameplay,
    proposals: authority.proposals,
    arcaneSymbol: authority.arcaneSymbol,
    factionFeatureTaxonomy: authority.factionFeatureTaxonomy,
    factionFeatures: authority.factionFeatures,
    leaders: authority.leaders,
    mystics: authority.mystics,
  });
  const retired = active.match(/\bpending(?:-|\s+)battles?\b|\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/iu);
  if (retired) throw new Error(`Published authority still contains retired terminology: ${retired[0]}.`);
}

const [authority, currentRulebookSource] = await Promise.all([
  loadCurrentGameAuthority(),
  readText(CURRENT_RULEBOOK_SOURCE),
]);
validateAuthority(authority);

const rulebook = addCardAnatomyFigure(currentRulebookSource);
const canonicalData = {
  schema_version: 2,
  release_version: RELEASE_VERSION,
  source_version: authority.version,
  source_authority: `/${CURRENT_GAME_SOURCE}`,
  status: 'published',
  provenance: {
    current_game_authority: CURRENT_GAME_SOURCE,
    current_rulebook_authority: CURRENT_RULEBOOK_SOURCE,
    historical_derivation: clone(authority.provenance),
    note: 'The v0.7.0 release is copied from complete current authorities. Historical derivation inputs are provenance only and are not layered during publication.',
  },
  gameplay: clone(authority.gameplay),
  proposals: clone(authority.proposals),
  arcane_symbol: clone(authority.arcaneSymbol),
  component_contract: clone(authority.componentContract),
  faction_feature_taxonomy: clone(authority.factionFeatureTaxonomy),
  faction_features: clone(authority.factionFeatures),
  leaders: clone(authority.leaders),
  mystics: clone(authority.mystics),
};

const starterDecks = {
  ...clone(authority.starterDecks),
  version: RELEASE_VERSION,
  release_version: RELEASE_VERSION,
  source_version: authority.version,
  source_authority: `/${CURRENT_GAME_SOURCE}`,
};

const canonicalText = jsonText(canonicalData);
const starterText = jsonText(starterDecks);
const authoritySetId = sha256(Buffer.from(`${rulebook}\n${canonicalText}\n${starterText}`, 'utf8'));
const sourceProvenance = {
  schema_version: 2,
  release_version: RELEASE_VERSION,
  source_version: authority.version,
  authority_set_id: authoritySetId,
  current_game_authority: CURRENT_GAME_SOURCE,
  current_rulebook_authority: CURRENT_RULEBOOK_SOURCE,
  historical_derivation: clone(authority.provenance),
  publication_derived_assets: {
    card_anatomy_figure: 'releases/v0.7.0/Gauntlet_v0.7.0_Card_Anatomy.png',
  },
  counts: {
    playable_cards: authority.gameplay.cards.length,
    territories: authority.gameplay.territories.length,
    factions: authority.gameplay.factions.length,
    leaders: authority.leaders.length,
    proposals: authority.proposals.length,
    starter_decks: authority.starterDecks.decks.length,
  },
};

await mkdir(RELEASE_DIR, { recursive: true });
await mkdir(PUBLIC_DIR, { recursive: true });
await Promise.all([
  writeText(join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Rulebook.md`), rulebook),
  writeText(join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Canonical_Data.json`), canonicalText),
  writeText(join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Starter_Decks.json`), starterText),
  writeText(join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Source_Provenance.json`), jsonText(sourceProvenance)),
]);

const landing = `<!doctype html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8YYYZJGGPE"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-8YYYZJGGPE');
  </script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gauntlet ${RELEASE_VERSION}</title>
  <meta name="description" content="Gauntlet ${RELEASE_VERSION} — ${RELEASE_NAME}">
  <link rel="stylesheet" href="../site.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Gauntlet home"><span class="brand-mark" aria-hidden="true">G</span><span>Gauntlet</span></a>
    <nav aria-label="Primary navigation">
      <a href="/start/">Start</a><a href="/#game">Game</a><a href="/rulebook/">Rules</a><a href="/factions/">Factions</a><a href="/deckbuilder/">Deckbuilder</a><a href="/card-reference/">Card Reference</a><a href="/rules-arbiter/">Rules Arbiter</a>
    </nav>
  </header>
  <main class="page-shell">
    <p class="eyebrow">Published playtest release</p>
    <h1>Gauntlet ${RELEASE_VERSION}</h1>
    <p><strong>${RELEASE_NAME}</strong></p>
    <p>This release freezes the complete v0.7.0 gameplay and Rulebook authorities, with the fully illustrated production card set and the Tabletop Simulator package.</p>
    <p><a href="../start/">Start playing</a> · <a href="../rulebook/">Rulebook</a> · <a href="../deckbuilder/">Deckbuilder</a> · <a href="../card-reference/">Card reference</a></p>
    <p><a href="../releases/${RELEASE_VERSION}/Gauntlet_${RELEASE_VERSION}_Rulebook_Booklet.pdf">Download the printable Rulebook booklet</a></p>
  </main>
</body>
</html>
`;
await writeText(join(PUBLIC_DIR, 'index.html'), landing);

console.log(`Materialized ${RELEASE_VERSION} directly from complete current authorities.`);
console.log(`Authority set: ${authoritySetId}`);
console.log(`Cards: ${authority.gameplay.cards.length}; Territories: ${authority.gameplay.territories.length}; Starter Decks: ${authority.starterDecks.decks.length}.`);
