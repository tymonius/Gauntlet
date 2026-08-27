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
const CURRENT_RULEBOOK_PATH = 'rulebook/player-facing/current-rulebook.md';
const CARD_ANATOMY_IMAGE_PATH = 'images/rulebook/card-anatomy.png';

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

function validateCurrentRulebook(markdown) {
  const source = String(markdown || '');
  if (!source.includes('**Version 0.6.4 — Release Candidate**')) {
    throw new Error('Maintained current Rulebook is missing the v0.6.4 candidate version marker.');
  }
  if (!source.includes('# 5. Actions, Faction Features, Leader Abilities, and Assets')) {
    throw new Error('Maintained current Rulebook is missing the Faction Feature / Leader Ability chapter.');
  }
  if (!source.includes('## Card anatomy') || !source.includes('![Card anatomy diagram](/images/rulebook/card-anatomy.png)')) {
    throw new Error('Maintained current Rulebook is missing the published Card Anatomy diagram.');
  }
  for (const pattern of [
    /\bpending\b/iu,
    /\bFaction Actions?\b/u,
    /\bFaction Abilit(?:y|ies)\b/u,
    /\bfaction procedure\b/iu,
  ]) {
    if (pattern.test(source)) throw new Error(`Maintained current Rulebook still contains retired terminology: ${pattern}.`);
  }
}

function promoteRulebookVersion(markdown) {
  validateCurrentRulebook(markdown);
  let result = String(markdown || '');
  result = result.replace('**Version 0.6.4 — Release Candidate**', '**Version 0.7.0**');
  result = result.replace(/^>\s*\*\*Release candidate\.\*\*[^\n]*(?:\n|$)/gmu, '');
  result = result.replace(/\*\*Version\s+v?0\.6\.4(?:-candidate)?\*\*/u, '**Version 0.7.0**');
  if (!result.includes('**Version 0.7.0**')) {
    throw new Error('Promoted Rulebook is missing the v0.7.0 version marker.');
  }
  const header = result.slice(0, 1600);
  if (/Version\s+0\.6\.4|Release candidate/iu.test(header)) {
    throw new Error('Promoted Rulebook still exposes candidate identity in its publication header.');
  }
  if (!result.includes('## Card anatomy') || !result.includes('![Card anatomy diagram](/images/rulebook/card-anatomy.png)')) {
    throw new Error('Promoted Rulebook lost the Card Anatomy diagram.');
  }
  for (const pattern of [
    /\bpending\b/iu,
    /\bFaction Actions?\b/u,
    /\bFaction Abilit(?:y|ies)\b/u,
    /\bfaction procedure\b/iu,
  ]) {
    if (pattern.test(result)) throw new Error(`Promoted Rulebook contains retired terminology: ${pattern}.`);
  }
  return result.replace(/\n{4,}/g, '\n\n\n');
}

const manifest = await loadCurrentGameManifest();
if (manifest.version !== SOURCE_VERSION || manifest.baseVersion !== 'v0.6.3') {
  throw new Error(`v0.7.0 publication expected ${SOURCE_VERSION} over v0.6.3, found ${manifest.version}/${manifest.baseVersion}.`);
}
if (!manifest.factionFeatureTaxonomy || !manifest.factionFeatures || !Array.isArray(manifest.leaders) || manifest.leaders.length !== 12) {
  throw new Error('v0.7.0 publication requires current Faction Feature taxonomy and all 12 authoritative Leader definitions.');
}

const [baseSource, cardChanges, territorySource, proposalSource, arcaneSource, rulesSource, componentContract, starterDeckSource, currentRulebook] = await Promise.all([
  readCurrentJsonSource('baseGameplay'),
  readCurrentJsonSource('cardChanges'),
  readCurrentJsonSource('territories'),
  readCurrentJsonSource('proposals'),
  readCurrentJsonSource('arcaneSymbol'),
  readCurrentJsonSource('rules'),
  readCurrentJsonSource('componentContract'),
  readCurrentJsonSource('starterDecks'),
  readText(CURRENT_RULEBOOK_PATH),
]);
await readFile(join(ROOT, CARD_ANATOMY_IMAGE_PATH));

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
gameplay.faction_feature_taxonomy = structuredClone(manifest.factionFeatureTaxonomy);
gameplay.faction_features = structuredClone(manifest.factionFeatures);

const intelligence = gameplay.factions.find(faction => faction.id === 'intelligence');
if (!intelligence || intelligence.resource !== 'Intel' || /Operation Progress/iu.test(String(intelligence.resource))) {
  throw new Error('v0.7.0 canonical Intelligence authority must classify Intel as Resource and Operation Progress separately.');
}
const mystics = gameplay.factions.find(faction => faction.id === 'mystics');
if (!mystics || mystics.resource) {
  throw new Error('v0.7.0 canonical Mystics authority must not invent a generic Resource.');
}

const canonicalData = {
  schema_version: 1,
  release_version: RELEASE_VERSION,
  source_version: SOURCE_VERSION,
  source_authority: '/game-data/current-game.json',
  base_version: manifest.baseVersion,
  status: 'published',
  provenance: {
    current_game_authority: 'game-data/current-game.json',
    current_rulebook_authority: CURRENT_RULEBOOK_PATH,
    source_inputs: structuredClone(manifest.sources),
    note: 'v0.7.0 is the published product identity. v0.6.4-candidate remains the immutable source-bundle identity used to assemble this release.',
  },
  gameplay,
  proposals: structuredClone(proposalSource.data.proposals || []),
  arcane_symbol: structuredClone(arcaneSource.data),
  component_contract: structuredClone(componentContract.data),
};

const starterDecks = {
  ...structuredClone(starterDeckSource.data),
  version: RELEASE_VERSION,
  release_version: RELEASE_VERSION,
  source_version: starterDeckSource.data.version || SOURCE_VERSION,
  source_authority: '/game-data/current-game.json',
};

const rulebook = promoteRulebookVersion(currentRulebook);
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
  current_rulebook_authority: CURRENT_RULEBOOK_PATH,
  card_anatomy_figure: CARD_ANATOMY_IMAGE_PATH,
  source_inputs: structuredClone(manifest.sources),
  counts: {
    playable_cards: cards.length,
    territories: territorySource.data.territories.length,
    factions: gameplay.factions.length,
    leaders: manifest.leaders.length,
    starter_decks: starterDeckSource.data.decks.length,
    faction_feature_sets: Object.keys(manifest.factionFeatures).length,
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

console.log(`Materialized ${RELEASE_VERSION} source snapshot from maintained current authorities.`);
console.log(`Authority set: ${authoritySetId}`);
console.log(`Cards: ${cards.length}; Territories: ${territorySource.data.territories.length}; Starter Decks: ${starterDeckSource.data.decks.length}.`);
