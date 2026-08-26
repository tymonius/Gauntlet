import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveCards, resolveCardTextOverrides, resolveRuleSection } from '../game-data/current-game.mjs';
import { ROOT, loadCurrentGameManifest, readCurrentJsonSource } from './current-game-authority.mjs';

const RELEASE_VERSION = 'v0.7.0';
const SOURCE_VERSION = 'v0.6.4-candidate';
const RELEASE_NAME = 'Illustrated Cards & Tabletop Simulator';
const RELEASE_DIR = join(ROOT, 'releases', RELEASE_VERSION);
const PUBLIC_DIR = join(ROOT, RELEASE_VERSION);
// Publication consumes the maintained current Rulebook and current-game authorities directly.

const jsonText = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const readText = relative => readFile(join(ROOT, relative), 'utf8').then(text => text.replace(/\r\n/g, '\n'));
const writeText = async (path, value) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value);
};

function resolveFactions(baseFactions, manifest) {
  return (baseFactions || []).map(source => {
    const faction = structuredClone(source);
    const override = manifest.factionOverrides?.[faction.id] || {};
    return {
      ...faction,
      ...structuredClone(override),
      leaders: (manifest.leaders || [])
        .filter(leader => leader.faction === faction.id)
        .map(leader => structuredClone(leader)),
    };
  });
}

function resolveFactionRules(baseRules, manifest) {
  const rules = structuredClone(baseRules || {});
  for (const [factionId, override] of Object.entries(manifest.factionOverrides || {})) {
    if (!override?.factionRules) continue;
    rules[factionId] = { ...(rules[factionId] || {}), ...structuredClone(override.factionRules) };
  }
  return rules;
}

function stripInternalAuditMetadata(value) {
  if (Array.isArray(value)) return value.map(stripInternalAuditMetadata);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'auditHeadings')
    .map(([key, child]) => [key, stripInternalAuditMetadata(child)]));
}

function promoteRulebookVersion(markdown) {
  let result = String(markdown || '').replace(/\r\n/g, '\n');
  result = result.replace('**Version 0.6.4 — Release Candidate**', '**Version 0.7.0**');
  result = result.replace(/\*\*Version\s+v?0\.6\.4(?:-candidate)?\*\*/u, '**Version 0.7.0**');
  for (const notice of [
    /^>\s*\*\*Release candidate\.\*\* This is the maintained current-development Rulebook source\. Switch back to \*\*Released v0\.6\.3\*\* for the published ruleset\.\s*$/gmu,
    /^>\s*\*\*Release candidate\.\*\* This view layers the current-development rules over the published v0\.6\.3 Rulebook\. Switch back to \*\*Released v0\.6\.3\*\* for the published ruleset\.\s*$/gmu,
  ]) result = result.replace(notice, '');
  if (!result.includes('**Version 0.7.0**')) throw new Error('Promoted Rulebook is missing the v0.7.0 version marker.');
  for (const [label, pattern] of [
    ['pending-battle terminology', /\bpending(?:-|\s+)battles?\b/iu],
    ['Faction Action terminology', /\bFaction Actions?\b/iu],
    ['Faction Ability terminology', /\bFaction Abilit(?:y|ies)\b/iu],
    ['faction procedure terminology', /\bfaction procedure\b/iu],
  ]) {
    if (pattern.test(result)) throw new Error('Promoted Rulebook still contains retired ' + label + '.');
  }
  if (!result.includes('## Card anatomy')) throw new Error('Promoted Rulebook is missing Card Anatomy.');
  if (!result.includes('Terms occur during Onset')) throw new Error('Promoted Rulebook is missing current Onset timing.');
  return result.replace(/\n{4,}/g, '\n\n\n');
}

function addCardAnatomyFigure(markdown) {
  const marker = "Most ordinary playable cards use the same frame. Read these elements when constructing a Deck and resolving a card in play:\n\n";
  if (!markdown.includes(marker)) throw new Error('Card Anatomy introduction marker is missing from the maintained Rulebook.');
  const figure = '![Card anatomy diagram](</releases/v0.7.0/Gauntlet_v0.7.0_Card_Anatomy.png>)\n\n';
  return markdown.replace(marker, marker + figure);
}

const manifest = await loadCurrentGameManifest();
if (manifest.version !== SOURCE_VERSION || manifest.baseVersion !== 'v0.6.3') {
  throw new Error(`v0.7.0 publication expected ${SOURCE_VERSION} over v0.6.3, found ${manifest.version}/${manifest.baseVersion}.`);
}
if (!manifest.factionFeatureTaxonomy || !manifest.factionFeatures || !Array.isArray(manifest.leaders) || manifest.leaders.length !== 12) {
  throw new Error('v0.7.0 publication requires the current Faction Feature taxonomy and all 12 structured Leaders.');
}
for (const leader of manifest.leaders) {
  if (!Array.isArray(leader.sections) || !leader.sections.length || leader.sections.some(section => Array.isArray(section) || !section?.classification || !section?.name)) {
    throw new Error('Leader ' + (leader.id || leader.name || 'unknown') + ' is not using structured current-game sections.');
  }
}

const [baseSource, cardChanges, territorySource, proposalSource, arcaneSource, rulesSource, componentContract, starterDeckSource, currentRulebookSource] = await Promise.all([
  readCurrentJsonSource('baseGameplay'),
  readCurrentJsonSource('cardChanges'),
  readCurrentJsonSource('territories'),
  readCurrentJsonSource('proposals'),
  readCurrentJsonSource('arcaneSymbol'),
  readCurrentJsonSource('rules'),
  readCurrentJsonSource('componentContract'),
  readCurrentJsonSource('starterDecks'),
  readText('rulebook/player-facing/current-rulebook.md'),
]);

const baseGameplay = baseSource.data?.gameplay;
if (!baseGameplay || !Array.isArray(baseGameplay.cards)) throw new Error('Current base gameplay source is incomplete.');
if (!Array.isArray(territorySource.data?.territories) || territorySource.data.territories.length !== 25) {
  throw new Error('v0.7.0 publication requires the approved 25-Territory source.');
}
if (!Array.isArray(starterDeckSource.data?.decks) || starterDeckSource.data.decks.length !== 12) {
  throw new Error('v0.7.0 publication requires the approved 12 starter Decks.');
}

const cards = resolveCardTextOverrides(
  resolveCards(baseGameplay.cards, cardChanges.data, manifest),
  rulesSource.data,
);
if (cards.length !== 142) throw new Error(`v0.7.0 publication expected 142 playable cards, found ${cards.length}.`);

const gameplay = structuredClone(baseGameplay);
gameplay.cards = cards;
gameplay.territories = structuredClone(territorySource.data.territories);
gameplay.battle = resolveRuleSection(baseGameplay.battle, rulesSource.data.battle);
gameplay.factions = resolveFactions(baseGameplay.factions, manifest);
gameplay.faction_rules = resolveFactionRules(baseGameplay.faction_rules, manifest);

const canonicalData = {
  schema_version: 1,
  release_version: RELEASE_VERSION,
  source_version: SOURCE_VERSION,
  source_authority: '/game-data/current-game.json',
  base_version: manifest.baseVersion,
  status: 'published',
  provenance: {
    current_game_authority: 'game-data/current-game.json',
    source_inputs: structuredClone(manifest.sources),
    note: 'v0.7.0 is the published product identity. v0.6.4-candidate remains the immutable source-bundle identity used to assemble this release.',
  },
  gameplay,
  proposals: structuredClone(proposalSource.data.proposals || []),
  arcane_symbol: structuredClone(arcaneSource.data),
  component_contract: stripInternalAuditMetadata(componentContract.data),
  faction_feature_taxonomy: structuredClone(manifest.factionFeatureTaxonomy),
  faction_features: structuredClone(manifest.factionFeatures),
  leaders: structuredClone(manifest.leaders),
};

const starterDecks = {
  ...structuredClone(starterDeckSource.data),
  version: RELEASE_VERSION,
  release_version: RELEASE_VERSION,
  source_version: starterDeckSource.data.version || SOURCE_VERSION,
  source_authority: '/game-data/current-game.json',
};

const rulebook = addCardAnatomyFigure(promoteRulebookVersion(currentRulebookSource));

const canonicalPayload = JSON.stringify(canonicalData);
for (const [label, pattern] of [
  ['pending-battle terminology', /\bpending(?:-|\s+)battles?\b/iu],
  ['Faction Action terminology', /\bFaction Actions?\b/iu],
  ['Faction Ability terminology', /\bFaction Abilit(?:y|ies)\b/iu],
  ['faction procedure terminology', /\bfaction procedure\b/iu],
]) {
  if (pattern.test(canonicalPayload)) throw new Error('Published canonical data still contains retired ' + label + '.');
}
const canonicalText = jsonText(canonicalData);
const starterText = jsonText(starterDecks);
const authoritySetId = sha256(Buffer.from(`${rulebook}\n${canonicalText}\n${starterText}`, 'utf8'));
const sourceProvenance = {
  schema_version: 1,
  release_version: RELEASE_VERSION,
  source_version: SOURCE_VERSION,
  base_version: manifest.baseVersion,
  authority_set_id: authoritySetId,
  current_game_authority: 'game-data/current-game.json',
  current_rulebook_authority: 'rulebook/player-facing/current-rulebook.md',
  publication_derived_assets: {
    card_anatomy_figure: 'releases/v0.7.0/Gauntlet_v0.7.0_Card_Anatomy.png',
  },
  source_inputs: structuredClone(manifest.sources),
  counts: {
    playable_cards: cards.length,
    territories: territorySource.data.territories.length,
    factions: gameplay.factions.length,
    leaders: (manifest.leaders || []).length,
    starter_decks: starterDeckSource.data.decks.length,
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

const landing = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Gauntlet ${RELEASE_VERSION}</title>\n  <meta name="description" content="Gauntlet ${RELEASE_VERSION} — ${RELEASE_NAME}">\n  <link rel="stylesheet" href="../site.css">\n</head>\n<body>\n  <header class="site-header">\n    <a class="brand" href="/" aria-label="Gauntlet home"><span class="brand-mark" aria-hidden="true">G</span><span>Gauntlet</span></a>\n    <nav aria-label="Primary navigation">\n      <a href="/start/">Start</a><a href="/#game">Game</a><a href="/rulebook/">Rules</a><a href="/factions/">Factions</a><a href="/deckbuilder/">Deckbuilder</a><a href="/card-reference/">Card Reference</a><a href="/rules-arbiter/">Rules Arbiter</a>\n    </nav>\n  </header>\n  <main class="page-shell">\n    <p class="eyebrow">Published playtest release</p>\n    <h1>Gauntlet ${RELEASE_VERSION}</h1>\n    <p><strong>${RELEASE_NAME}</strong></p>\n    <p>This release promotes the approved ${SOURCE_VERSION} source bundle into the v0.7.0 product line, with the fully illustrated production card set and the Tabletop Simulator package.</p>\n    <p><a href="../start/">Start playing</a> · <a href="../rulebook/">Rulebook</a> · <a href="../deckbuilder/">Deckbuilder</a> · <a href="../card-reference/">Card reference</a></p>\n    <p><a href="../releases/${RELEASE_VERSION}/Gauntlet_${RELEASE_VERSION}_Rulebook_Booklet.pdf">Download the printable Rulebook booklet</a></p>\n  </main>\n</body>\n</html>\n`;
await writeText(join(PUBLIC_DIR, 'index.html'), landing);

console.log(`Materialized ${RELEASE_VERSION} source snapshot from ${SOURCE_VERSION}.`);
console.log(`Authority set: ${authoritySetId}`);
console.log(`Cards: ${cards.length}; Territories: ${territorySource.data.territories.length}; Starter Decks: ${starterDeckSource.data.decks.length}.`);
