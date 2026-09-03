import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROOT, loadCurrentGameAuthority } from './current-game-authority.mjs';
import { applyV070CanonicalCorrections, applyV070RulebookCorrections } from '../rulebook/player-facing/v070-corrections.js';
import { synchronizeKnownRulebookClaims, validateKnownRulebookClaims } from '../rulebook/player-facing/rule-facts.js';

const RELEASE_VERSION = 'v0.7.1';
const CANDIDATE_VERSION = 'v0.7.1-candidate';
const RELEASE_DIR = join(ROOT, 'releases', RELEASE_VERSION);
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

function addCardAnatomyFigures(markdown) {
  const source = String(markdown || '').replace(/\r\n/g, '\n').replace('**Version 0.7.1 Candidate**', '**Version 0.7.1**');
  if (!source.includes('**Version 0.7.1**')) {
    throw new Error('Current Rulebook authority is not natively v0.7.1.');
  }
  if (/Release candidate|GENERATED CLEAN V0\.6\.3/u.test(source)) {
    throw new Error('Current Rulebook authority still contains transitional publication markers.');
  }
  const cardMarker = "Most ordinary playable cards use the same frame. Read these elements when constructing a Deck and resolving a card in play:\n\n";
  if (!source.includes(cardMarker)) {
    throw new Error('Card Anatomy introduction marker is missing from the current Rulebook authority.');
  }
  const arcaneMarker = "Some playable cards show the Mystics sigil immediately before the card name. The symbol marks the **Arcane** trait; its color follows the card's faction identity.\n\n";
  if (!source.includes(arcaneMarker)) {
    throw new Error('Arcane trait-mark explanation is missing from the current Rulebook authority.');
  }
  const cardFigure = '![Card anatomy diagram](</releases/v0.7.1/Gauntlet_v0.7.1_Card_Anatomy.png>)\n\n';
  const arcaneFigure = '![Arcane trait mark example](</releases/v0.7.1/Gauntlet_v0.7.1_Arcane_Trait_Mark.png>)\n\n';
  return source
    .replace(cardMarker, cardMarker + cardFigure)
    .replace(arcaneMarker, arcaneMarker + arcaneFigure);
}

async function repairAndValidateFrozenReleaseSources() {
  const paths = {
    rulebook: `releases/${RELEASE_VERSION}/Gauntlet_${RELEASE_VERSION}_Rulebook.md`,
    canonical: `releases/${RELEASE_VERSION}/Gauntlet_${RELEASE_VERSION}_Canonical_Data.json`,
    starters: `releases/${RELEASE_VERSION}/Gauntlet_${RELEASE_VERSION}_Starter_Decks.json`,
    provenance: `releases/${RELEASE_VERSION}/Gauntlet_${RELEASE_VERSION}_Source_Provenance.json`,
  };
  let [rulebook, canonicalText, startersText, provenanceText] = await Promise.all([
    readText(paths.rulebook),
    readText(paths.canonical),
    readText(paths.starters),
    readText(paths.provenance),
  ]);
  let canonical = JSON.parse(canonicalText);
  const starters = JSON.parse(startersText);
  const provenance = JSON.parse(provenanceText);

  if (!rulebook.includes(`**Version ${RELEASE_VERSION.replace(/^v/, '')}**`)) {
    throw new Error(`${RELEASE_VERSION} frozen Rulebook source has the wrong version identity.`);
  }
  if (canonical.release_version !== RELEASE_VERSION || canonical.source_version !== RELEASE_VERSION) {
    throw new Error(`${RELEASE_VERSION} frozen canonical data has the wrong release/source identity.`);
  }
  if (starters.release_version !== RELEASE_VERSION || starters.source_version !== RELEASE_VERSION) {
    throw new Error(`${RELEASE_VERSION} frozen starter data has the wrong release/source identity.`);
  }
  if (provenance.release_version !== RELEASE_VERSION || provenance.source_version !== RELEASE_VERSION || !provenance.authority_set_id) {
    throw new Error(`${RELEASE_VERSION} frozen source provenance is incomplete.`);
  }

  canonical = applyV070CanonicalCorrections(canonical);
  const correctedCanonicalText = jsonText(canonical);
  if (correctedCanonicalText !== canonicalText) {
    canonicalText = correctedCanonicalText;
    await writeText(join(ROOT, paths.canonical), canonicalText);
    console.log('Re-derived maintained v0.7.1 canonical summaries from playable-card records.');
  }

  const semanticRulebook = applyV070RulebookCorrections(rulebook);
  const synchronized = synchronizeKnownRulebookClaims(semanticRulebook, canonical);
  rulebook = synchronized.output;
  validateKnownRulebookClaims(rulebook, canonical);
  if (rulebook !== await readText(paths.rulebook)) {
    await writeText(join(ROOT, paths.rulebook), rulebook);
    console.log('Synchronized maintained v0.7.1 Rulebook facts from canonical authority.');
  }

  const diplomats = canonical.gameplay?.factions?.find(faction => faction.id === 'diplomats');
  if (diplomats?.factionRules?.peace_treaty_threshold !== 6) {
    throw new Error('Frozen v0.7.1 canonical Peace Treaty threshold must be six.');
  }

  const authoritySetId = sha256(Buffer.from(`${rulebook}\n${canonicalText}\n${startersText}`, 'utf8'));
  if (provenance.authority_set_id !== authoritySetId) {
    provenance.authority_set_id = authoritySetId;
    provenance.publication_corrections = {
      ...(provenance.publication_corrections || {}),
      derived_rulebook_facts: {
        source: 'canonical gameplay records and faction rule fields',
        corrected_claims: synchronized.changes.map(change => change.label),
      },
    };
    await writeText(join(ROOT, paths.provenance), jsonText(provenance));
    console.log(`Updated maintained v0.7.1 authority set after derived-fact synchronization: ${authoritySetId}`);
  }
}

function validateAuthority(authority) {
  if (authority.schemaVersion !== 2 || authority.authority !== 'current-game' || ![RELEASE_VERSION, CANDIDATE_VERSION].includes(authority.version)) {
    throw new Error('v0.7.1 publication requires the complete v0.7.1 current-game authority.');
  }
  for (const forbidden of ['sources', 'resolution', 'baseVersion', 'factionOverrides']) {
    if (Object.prototype.hasOwnProperty.call(authority, forbidden)) {
      throw new Error(`Publication authority still contains transitional field ${forbidden}.`);
    }
  }
  if (authority.gameplay?.cards?.length !== 142) throw new Error('v0.7.1 requires 142 playable cards.');
  if (authority.gameplay?.territories?.length !== 25) throw new Error('v0.7.1 requires 25 Territories.');
  if (authority.gameplay?.factions?.length !== 6) throw new Error('v0.7.1 requires six factions.');
  if (authority.leaders?.length !== 12) throw new Error('v0.7.1 requires 12 structured Leaders.');
  if (authority.proposals?.length !== 9) throw new Error('v0.7.1 requires nine Proposals.');
  if (authority.starterDecks?.decks?.length !== 12) throw new Error('v0.7.1 requires 12 starter Decks.');
  if (!authority.factionFeatureTaxonomy || !authority.factionFeatures) {
    throw new Error('v0.7.1 requires current Faction Feature authority.');
  }
  const diplomats = authority.gameplay.factions.find(faction => faction.id === 'diplomats');
  if (diplomats?.factionRules?.peace_treaty_threshold !== 6) {
    throw new Error('v0.7.1 publication requires a six-Proposal Peace Treaty threshold.');
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

const authority = await loadCurrentGameAuthority();

if (![RELEASE_VERSION, CANDIDATE_VERSION].includes(authority.version)) {
  await repairAndValidateFrozenReleaseSources();
  console.log(`Current development is ${authority.version}; preserving the frozen ${RELEASE_VERSION} release-source snapshot.`);
} else {
  const currentRulebookSource = await readText(CURRENT_RULEBOOK_SOURCE);
  validateAuthority(authority);

  const rulebook = addCardAnatomyFigures(currentRulebookSource);
  const canonicalData = {
    schema_version: 2,
    release_version: RELEASE_VERSION,
    source_version: RELEASE_VERSION,
    source_authority: `/${CURRENT_GAME_SOURCE}`,
    status: 'published',
    provenance: {
      current_game_authority: CURRENT_GAME_SOURCE,
      current_rulebook_authority: CURRENT_RULEBOOK_SOURCE,
      historical_derivation: clone(authority.provenance),
      note: 'The v0.7.1 release is copied from complete current authorities. Historical derivation inputs are provenance only and are not layered during publication.',
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
    source_version: RELEASE_VERSION,
    source_authority: `/${CURRENT_GAME_SOURCE}`,
  };

  const canonicalText = jsonText(canonicalData);
  const starterText = jsonText(starterDecks);
  const authoritySetId = sha256(Buffer.from(`${rulebook}\n${canonicalText}\n${starterText}`, 'utf8'));
  const sourceProvenance = {
    schema_version: 2,
    release_version: RELEASE_VERSION,
    source_version: RELEASE_VERSION,
    authority_set_id: authoritySetId,
    current_game_authority: CURRENT_GAME_SOURCE,
    current_rulebook_authority: CURRENT_RULEBOOK_SOURCE,
    historical_derivation: clone(authority.provenance),
    publication_derived_assets: {
      card_anatomy_figure: 'releases/v0.7.1/Gauntlet_v0.7.1_Card_Anatomy.png',
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
  await Promise.all([
    writeText(join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Rulebook.md`), rulebook),
    writeText(join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Canonical_Data.json`), canonicalText),
    writeText(join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Starter_Decks.json`), starterText),
    writeText(join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Source_Provenance.json`), jsonText(sourceProvenance)),
  ]);

  console.log(`Materialized ${RELEASE_VERSION} directly from complete current authorities.`);
  console.log(`Authority set: ${authoritySetId}`);
  console.log(`Cards: ${authority.gameplay.cards.length}; Territories: ${authority.gameplay.territories.length}; Starter Decks: ${authority.starterDecks.decks.length}.`);
}