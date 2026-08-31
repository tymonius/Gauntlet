import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { V063_STARTER_CATALOG } from '../v0.6.3/data/starter-decks-candidate.js';

const root = process.cwd();
const targetRoot = 'artifacts/reconstruction/clean-v0.6.3/downstream';
const canonicalPath = `${targetRoot}/canonical-data.json`;
const starterPath = `${targetRoot}/starter-decks.json`;
const boundaryPath = `${targetRoot}/source-boundary.md`;
const statusPath = `${targetRoot}/validation-status.md`;
const manifestPath = `${targetRoot}/manifest.json`;
const certificationPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const planPath = 'config/reconstruction-version-plan.json';
const resolutionsPath = 'config/reconstruction-version-resolutions.json';
const lifecyclePath = 'config/release-lifecycle.json';
const baselinePath = 'releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json';
const structuredAuthorityPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json';
const starterSourcePath = 'v0.6.3/data/starter-decks-candidate.js';
const starterAuditPath = 'docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md';

const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const parentHumanAuthoritySetId = '2da05383c10fe3e784c64b26fd2d9837913011cad996966f49a7ae3a92af8ed9';
const baselineBlob = '31ee55f3ff2784215863547b167ff1e689343f15';
const starterApproval = {
  pr: 573,
  merge_commit: 'e13cd423bacc4c965aad9f8ed622100bef88d48f',
  source: 'https://github.com/tymonius/Gauntlet/pull/573',
};
const factionDefs = [
  ['Military', 'military', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/military/Gauntlet_v0.6.3_Military_Faction_Guide.md'],
  ['Diplomats', 'diplomats', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md'],
  ['Financiers', 'financiers', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/financier/Gauntlet_v0.6.3_Financier_Faction_Guide.md'],
  ['Intelligence', 'intelligence', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/intelligence/Gauntlet_v0.6.3_Intelligence_Faction_Guide.md'],
  ['Mystics', 'mystics', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md'],
  ['Inquisition', 'inquisition', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/inquisition/Gauntlet_v0.6.3_Inquisition_Faction_Guide.md'],
];
const guideByAllegiance = new Map(factionDefs.map(([a, , g]) => [a, g]));
const guideByFactionId = new Map(factionDefs.map(([, id, g]) => [id, g]));
const forbiddenAuthority = [
  'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',
  'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json',
];
const provenanceKeys = new Set(['source', 'source_candidate', 'v063_source', 'governing_sources', 'inherits_from', 'release_manifest']);

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
const slug = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const effectText = (card, label) => card.effects?.find((effect) => effect.label === label)?.text;
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
function normalizeMarkdown(text) {
  return text.replace(/^>\s?/gm, '').replace(/\*\*/g, '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
}
function deepStripProvenance(value) {
  if (Array.isArray(value)) return value.map(deepStripProvenance);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !provenanceKeys.has(key))
    .map(([key, child]) => [key, deepStripProvenance(child)]));
}
function canonicalCardPool(guideText) {
  const start = guideText.search(/^# \d+\. Canonical .* card pool$/m);
  assert(start >= 0, 'Faction guide is missing its canonical card-pool heading.');
  const tail = guideText.slice(start);
  const end = tail.search(/^# \d+\. Quick reference$/m);
  assert(end > 0, 'Faction guide is missing its Quick reference boundary.');
  return tail.slice(0, end);
}
function cardSection(pool, name) {
  const marker = `## ${name}`;
  const start = pool.indexOf(marker);
  assert(start >= 0, `Certified faction guide is missing ${name}.`);
  const tail = pool.slice(start + marker.length);
  const nextCard = tail.search(/^## /m);
  return tail.slice(0, nextCard >= 0 ? nextCard : tail.length);
}

function verifyAuthorityInputs() {
  const certification = readJson(certificationPath);
  const plan = readJson(planPath);
  const resolutions = readJson(resolutionsPath);
  const lifecycle = readJson(lifecyclePath);
  const baselineText = read(baselinePath);
  const structuredAuthorityText = read(structuredAuthorityPath);
  const baseline = JSON.parse(baselineText);
  const structuredAuthority = JSON.parse(structuredAuthorityText);
  const evidence = structuredAuthority.gameplay;

  assert.equal(certification.target, 'clean-v0.6.3-complete');
  assert.equal(certification.status, 'certified_on_manual_merge');
  assert.equal(certification.authority_set_id, authoritySetId);
  assert.equal(certification.publication_unlocked, false);

  const target = plan.targets?.['clean-v0.6.3'];
  assert.equal(plan.publication_unlocked, false);
  assert.equal(target?.status, 'authority_certified');
  assert.equal(target?.downstream_regeneration_unlocked, true);
  assert.equal(target?.certification?.authority_set_id, parentHumanAuthoritySetId);
  assert.equal(target?.certification?.publication_unlocked, false);
  assert.equal(target?.starter_policy?.candidate_source, starterApproval.source);
  assert.equal(target?.starter_policy?.status, 'eligible_for_downstream_regeneration_after_clean_v063_certification');
  assert.equal(target?.starter_policy?.deck_count, 12);
  assert.equal(target?.starter_policy?.cards_per_deck, 30);
  assert.equal(target?.starter_policy?.deckbuilding_value, 60);

  assert.equal(lifecycle.current_release, 'v0.6.1');
  assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
  assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');

  assert.equal(gitBlobSha(baselineText), baselineBlob, 'Published v0.6.1 canonical baseline blob drifted.');
  assert.equal(baseline.version, 'v0.6.1');
  assert.match(baseline.status, /Published playtest edition/);
  assert.equal(baseline.cards?.length, 122, 'Published v0.6.1 structural baseline card count drifted.');
  assert.equal(baseline.territories?.length, 25, 'Published v0.6.1 structural baseline Territory count drifted.');
  assert.equal(baseline.factions?.length, 6, 'Published v0.6.1 structural baseline faction count drifted.');
  assert.equal(structuredAuthority.target, 'clean-v0.6.3-canonical-structured-authority');
  assert.equal(structuredAuthority.status, 'complete_authority_candidate');
  assert.equal(structuredAuthority.publication_unlocked, false);
  assert.equal(evidence.cards?.length, 128);
  assert.equal(evidence.territories?.length, 25);

  const certifiedFiles = new Map((certification.authority_files ?? []).map((entry) => [entry.path, entry]));
  const structuredAuthorityEntry = certifiedFiles.get(structuredAuthorityPath);
  assert(structuredAuthorityEntry, 'Complete authority manifest does not bind the canonical structured authority.');
  assert.equal(sha256(structuredAuthorityText), structuredAuthorityEntry.sha256, 'Canonical structured authority drifted from its complete authority manifest.');
  for (const entry of certification.authority_files ?? []) {
    assert.equal(sha256(read(entry.path)), entry.sha256, `Certified authority file drifted: ${entry.path}`);
  }
  for (const [, , guide] of factionDefs) assert(certifiedFiles.has(guide), `Certification does not bind ${guide}.`);

  const recovered = resolutions['clean-v0.6.3']?.additional_recovered_decisions ?? [];
  assert.deepEqual(recovered.map((entry) => entry.id).sort(), ['GNT-DEC-2026-0812-001', 'GNT-DEC-2026-0812-002', 'GNT-DEC-2026-0812-003']);
  for (const entry of recovered) {
    assert.equal(entry.version_disposition, 'adopt');
    assert(entry.evidence?.includes('https://github.com/tymonius/Gauntlet/pull/571'), `${entry.id} must remain pinned to PR #571.`);
  }
  return { certification, baseline, evidence };
}

function verifyFactionPayloadAgainstCertifiedGuides(evidence) {
  for (const [allegiance, , guidePath] of factionDefs) {
    const cards = evidence.cards.filter((card) => card.allegiance === allegiance);
    assert.equal(cards.length, 13, `${allegiance} evidence payload must contain 13 cards.`);
    const pool = canonicalCardPool(read(guidePath));
    const headings = [...pool.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    assert.equal(headings.length, 13, `${allegiance} certified guide must contain 13 canonical cards.`);
    assert.deepEqual(new Set(headings), new Set(cards.map((card) => card.name)), `${allegiance} card identities drifted between evidence and certified guide.`);
    for (const card of cards) {
      const normalized = normalizeMarkdown(cardSection(pool, card.name));
      assert(normalized.includes(`Cost: ${card.cost}`), `${card.name} cost drifted from certified guide.`);
      if (card.card_form) assert(normalized.includes(`Card form: ${card.card_form}`), `${card.name} card form drifted from certified guide.`);
      if (card.unique) assert(normalized.includes('Unique: Maximum one copy per Deck'), `${card.name} Unique rule drifted from certified guide.`);
      for (const effect of card.effects ?? []) {
        assert(normalized.includes(normalizeMarkdown(`${effect.label}: ${effect.text}`)), `${card.name} / ${effect.label} text drifted from certified guide.`);
      }
    }
  }
}

function verifyIdentityAndNeutralBoundaries(baseline, evidence) {
  const counts = evidence.cards.reduce((map, card) => {
    map[card.allegiance] = (map[card.allegiance] ?? 0) + 1;
    return map;
  }, {});
  assert.deepEqual(counts, {
    Mystics: 13,
    Inquisition: 13,
    Neutral: 50,
    Intelligence: 13,
    Military: 13,
    Financiers: 13,
    Diplomats: 13,
  });

  // The published baseline supplies stable schema and broad identity structure,
  // not a requirement that every v0.6.1 card identity survive later approved
  // pool migrations. v0.6.1 Neutral Invasion, for example, is not the same
  // identity as the later Military Invasion. Explicit clean-v0.6.3 identity
  // invariants are checked below instead of inventing a blanket carry-forward.
  assert.equal(baseline.deck_construction?.maximum_deckbuilding_value, 60);
  assert.equal(baseline.deck_construction?.territories_per_player, 3);
  assert.equal(baseline.deck_construction?.factions_per_deck, 1);
  assert.equal(baseline.deck_construction?.leaders_per_deck, 1);

  const evidenceCards = new Map(evidence.cards.map((card) => [card.id, card]));
  const evidenceTerritories = new Map(evidence.territories.map((territory) => [territory.id, territory]));
  const secondLine = evidenceCards.get('neutral-reserves');
  assert.equal(secondLine?.name, 'Second Line');
  assert(!evidence.cards.some((card) => card.name === 'Reserves'), 'Retired Reserves title survived in playable cards.');
  const smugglers = evidenceTerritories.get('territory-smuggler-s-pass');
  assert.equal(smugglers?.name, "Smuggler's Run");
  assert(!evidence.territories.some((territory) => territory.name === "Smuggler's Pass"), "Retired Smuggler's Pass title survived.");

  const byName = new Map(evidence.cards.map((card) => [card.name, card]));
  const armistice = byName.get('Armistice');
  const contingency = byName.get('Contingency Plan');
  const manifestDestiny = byName.get('Manifest Destiny');
  assert.equal(armistice?.cost, 4);
  assert.equal(effectText(armistice, 'Asset'), "Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.");
  assert.equal(contingency?.cost, 1);
  assert.equal(effectText(contingency, 'Asset'), 'If this card is Removed, +1 Card.');
  assert.equal(effectText(contingency, 'Gambit/Tactic'), 'If your opponent controls more Territories than you, +2 Battle Total.');
  assert.equal(manifestDestiny?.cost, 5);
  assert(manifestDestiny?.rules_notes?.includes('After entering the Gauntlet, this card is a normal Territory with a normal Deed.'));
  assert.equal(byName.get('Protracted Siege')?.card_form, 'Territory Overlay');
  assert.equal(byName.get('Extraordinary Rendition')?.card_form, 'Asset');
  assert.equal(effectText(byName.get('Détente'), 'Action'), 'Bank this card. You may have only one banked Détente.');
}

function buildStarterOutput(evidence) {
  const output = structuredClone(V063_STARTER_CATALOG);
  output.version = 'clean-v0.6.3-downstream';
  output.status = 'PR #573 competitive starter set validated against certified clean v0.6.3 authority — not published';
  output.authority_set_id = authoritySetId;
  output.approval = { ...starterApproval, source_file: starterSourcePath, audit: starterAuditPath };
  output.publication_unlocked = false;

  const cardsByName = new Map(evidence.cards.map((card) => [card.name, card]));
  const territoriesByName = new Map(evidence.territories.map((territory) => [territory.name, territory]));
  const factionsById = new Map(evidence.factions.map((faction) => [faction.id, faction]));
  const seenDecks = new Set();
  const seenPairs = new Set();
  const usedTitles = new Set();
  for (const deck of output.decks ?? []) {
    assert(!seenDecks.has(deck.id), `Duplicate starter id ${deck.id}.`);
    seenDecks.add(deck.id);
    const pair = `${deck.factionId}/${deck.leaderId}`;
    assert(!seenPairs.has(pair), `Duplicate starter Leader pair ${pair}.`);
    seenPairs.add(pair);
    const faction = factionsById.get(deck.factionId);
    assert(faction, `${deck.name}: unknown faction ${deck.factionId}.`);
    assert(faction.leaders?.some((leader) => slug(leader.name) === deck.leaderId), `${deck.name}: Leader does not belong to faction.`);
    let count = 0;
    let value = 0;
    for (const item of deck.cards ?? []) {
      const card = cardsByName.get(item.name);
      assert(card, `${deck.name}: unknown card ${item.name}.`);
      assert(Number.isInteger(item.quantity) && item.quantity > 0, `${deck.name}: invalid quantity for ${item.name}.`);
      assert(card.allegiance === 'Neutral' || slug(card.allegiance) === deck.factionId, `${deck.name}: illegal allegiance for ${item.name}.`);
      assert(!(card.unique && item.quantity > 1), `${deck.name}: Unique card duplicated: ${item.name}.`);
      count += item.quantity;
      value += item.quantity * card.cost;
      usedTitles.add(item.name);
    }
    assert.equal(count, 30, `${deck.name}: card count must be 30.`);
    assert.equal(value, 60, `${deck.name}: Deckbuilding Value must be 60.`);
    assert.equal(deck.cardCount, 30);
    assert.equal(deck.deckbuildingValue, 60);
    assert.equal(deck.territories?.length, 3, `${deck.name}: must contain three Territories.`);
    assert.equal(new Set(deck.territories).size, 3, `${deck.name}: duplicate Territory.`);
    assert.deepEqual(deck.recommendedTerritoryOrder, deck.territories, `${deck.name}: recommended order drifted.`);
    assert.equal(deck.territoryOrderGuidance?.chosenAfterOpeningSelection, true);
    assert.equal(deck.territoryOrderGuidance?.informedByOpeningHand, true);
    assert.equal(deck.territoryOrderGuidance?.informedByOpeningDiscard, true);
    assert.equal(deck.territoryOrderGuidance?.informedByInitiative, false);
    let arenas = 0;
    for (const name of deck.territories) {
      const territory = territoriesByName.get(name);
      assert(territory, `${deck.name}: unknown Territory ${name}.`);
      if (territory.arena) arenas += 1;
    }
    assert(arenas <= 1, `${deck.name}: too many Arenas.`);
  }
  assert.equal(output.decks?.length, 12);
  assert.equal(seenPairs.size, 12);
  assert.equal(usedTitles.size, 110, 'PR #573 pool coverage drifted from 110 unique titles.');
  return output;
}

function buildCanonical({ certification, evidence }, starters) {
  const data = deepStripProvenance(structuredClone(evidence));
  data.version = 'clean-v0.6.3-downstream';
  data.name = 'Gauntlet clean v0.6.3 canonical downstream reconstruction';
  data.date = '2026-08-13';
  data.status = 'Certified-authority downstream reconstruction — not published';
  data.publication_unlocked = false;
  data.authority_set_id = authoritySetId;
  data.authority = {
    target: 'clean-v0.6.3-complete',
    certification_manifest: certificationPath,
    authority_set_id: authoritySetId,
    rulebook: certification.authority_files[0].path,
    faction_guides: factionDefs.map(([, , guide]) => guide),
  };
  data.structural_baseline = { path: baselinePath, git_blob_sha: baselineBlob, role: 'published schema and stable-structure baseline only' };
  data.structured_authority = { path: structuredAuthorityPath, sha256: sha256(read(structuredAuthorityPath)), role: 'complete_machine_readable_authority' };
  data.governing_sources = {
    authority_certification: certificationPath,
    rulebook: certification.authority_files[0].path,
    faction_guides: Object.fromEntries(factionDefs.map(([a, , guide]) => [a, guide])),
    reconstruction_plan: planPath,
    recovered_decisions: resolutionsPath,
    published_structural_baseline: baselinePath,
    structured_authority: structuredAuthorityPath,
    starter_approval: starterApproval.source,
  };
  data.factions = data.factions.map((faction) => ({ ...faction, source: guideByFactionId.get(faction.id), authority_set_id: authoritySetId }));
  data.cards = data.cards.map((card) => ({
    ...card,
    provenance: card.allegiance === 'Neutral'
      ? { authority_basis: [certificationPath, planPath, resolutionsPath, baselinePath], structured_authority: structuredAuthorityPath }
      : { authority: guideByAllegiance.get(card.allegiance), structured_authority: structuredAuthorityPath },
  }));
  data.territories = data.territories.map((territory) => ({
    ...territory,
    provenance: { authority_basis: [certificationPath, planPath, baselinePath], structured_authority: structuredAuthorityPath },
  }));
  data.starter_decks = starters;
  data.normalization = {
    stage: 'clean-v0.6.3-certified-authority-downstream-reconstruction',
    certified_authority_set: authoritySetId,
    published_release: false,
    historical_v062_v063_packages_used_as_authority: false,
    complete_structured_authority_used_as_content_source: true,
    historical_v063_candidate_used_as_content_source: false,
  };
  return data;
}

export function buildOutputs({ write = false } = {}) {
  const inputs = verifyAuthorityInputs();
  verifyFactionPayloadAgainstCertifiedGuides(inputs.evidence);
  verifyIdentityAndNeutralBoundaries(inputs.baseline, inputs.evidence);
  const starters = buildStarterOutput(inputs.evidence);
  const canonical = buildCanonical(inputs, starters);
  const canonicalText = jsonText(canonical);
  const starterText = jsonText(starters);
  for (const forbidden of forbiddenAuthority) {
    assert(!canonicalText.includes(forbidden), `Forbidden historical authority source leaked into clean canonical data: ${forbidden}`);
    assert(!starterText.includes(forbidden), `Forbidden historical authority source leaked into clean starter data: ${forbidden}`);
  }

  const boundaryText = `# Clean v0.6.3 downstream source boundary

**Status:** reconstruction candidate; not published  
**Complete authority set:** ${authoritySetId}

The complete clean v0.6.3 authority manifest at ${certificationPath} is the binding downstream source. Its machine-readable gameplay payload comes from ${structuredAuthorityPath}, which was independently regenerated from v0.6.1 through the historical v0.6.2/v0.6.3 transformation pipeline and certified with zero gameplay drift.

The certified Rulebook and six faction guides remain the human-readable authority within that complete set. The published v0.6.1 canonical data is retained only as a pinned structural-baseline check; it is not used to fill missing clean-v0.6.3 gameplay content. The withdrawn v0.6.3 release-candidate canonical file is forbidden as a downstream content source or emitted provenance dependency.

The twelve starter compositions come from PR #573 (merge ${starterApproval.merge_commit}) and are accepted only after legality is revalidated against the complete 128-card / 25-Territory authority.

Publication remains separately locked; v0.6.1 remains current/public.
`;
  const statusText = `# Clean v0.6.3 downstream validation status

**Status:** candidate ready for merge review  
**Publication:** locked  
**Authority set:** ${authoritySetId}

Validated by the deterministic build/validation gate:

- exact complete-authority manifest and every bound authority-file hash;
- machine-readable gameplay source from the complete canonical structured authority, not the withdrawn v0.6.3 candidate;
- 128 playable cards: 50 Neutral plus 13 for each of six factions;
- all 78 faction-card identities, costs, forms, Unique status, and printed effects against their certified faction guides;
- 25 Territories, Second Line, and Smuggler's Run identity invariants;
- recovered Armistice, Manifest Destiny, and Contingency Plan decisions;
- Extraordinary Rendition form normalization and Détente special Bank Action;
- twelve PR #573 starter Decks, each exactly 30 cards / 60 Deckbuilding Value, legal for its Leader/faction, with legal Territory selections and 110 represented playable titles; and
- no publication/current-release cutover.
`;
  const outputFiles = [[canonicalPath, canonicalText], [starterPath, starterText], [boundaryPath, boundaryText], [statusPath, statusText]];
  const manifest = {
    schema_version: 1,
    target: 'clean-v0.6.3-downstream',
    status: 'downstream_candidate_pending_merge_review',
    authority_set_id: authoritySetId,
    authority_certification: certificationPath,
    publication_unlocked: false,
    public_current_release: 'v0.6.1',
    baseline: { path: baselinePath, git_blob_sha: baselineBlob, role: 'published_schema_and_stable_structure_baseline_only' },
    structured_authority: { path: structuredAuthorityPath, sha256: sha256(read(structuredAuthorityPath)), role: 'complete_machine_readable_authority' },
    starter_approval: { ...starterApproval, source_file: starterSourcePath, audit: starterAuditPath },
    forbidden_authority_sources: forbiddenAuthority,
    outputs: outputFiles.map(([file, text]) => ({ path: file, sha256: sha256(text), bytes: Buffer.byteLength(text, 'utf8'), lines: text.split('\n').length })),
    invariants: { playable_cards: 128, neutral_cards: 50, faction_cards_each: 13, territories: 25, factions: 6, leaders: 12, starter_decks: 12, starter_cards_each: 30, starter_value_each: 60, starter_unique_titles_used: 110 },
  };
  const outputs = new Map([...outputFiles, [manifestPath, jsonText(manifest)]]);
  if (write) {
    for (const [file, text] of outputs) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), text, 'utf8');
    }
    console.log(`Built clean v0.6.3 downstream canonical data and ${starters.decks.length} PR #573 starter Decks from certified authority set ${authoritySetId}.`);
  }
  return outputs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) buildOutputs({ write: true });
