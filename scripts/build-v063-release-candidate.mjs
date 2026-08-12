import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { getV063StarterCatalog } from '../v0.6.3/deckbuilder/starter-adapter.js';

const root = process.cwd();
const check = process.argv.includes('--check');
const releaseDate = '2026-08-11';
const candidateDir = 'artifacts/v0.6.3/release-candidate';
const failures = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const normalize = (value) => String(value).replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n';

function expected(relativePath, content) {
  const target = path.join(root, relativePath);
  const output = normalize(content);
  if (check) {
    if (!fs.existsSync(target)) failures.push(`Missing release-candidate file: ${relativePath}`);
    else if (read(relativePath) !== output) failures.push(`Stale release-candidate file: ${relativePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Missing upstream v0.6.3 candidate artifact: ${relativePath}`);
  }
}

function section(text, start) {
  const index = text.indexOf(start);
  if (index < 0) throw new Error(`Missing source marker: ${start}`);
  return text.slice(index).trim();
}

const upstream = {
  rulebook: 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Rulebook_Candidate.md',
  reference: 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Reference_Guide_Candidate.md',
  firstGame: 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_First_Game_Guide_Candidate.md',
  returning: 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Returning_Player_Changes_Candidate.md',
  canonical: 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json',
  completeReference: 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Complete_Card_Reference_Candidate.md',
};
for (const relativePath of Object.values(upstream)) requireFile(relativePath);
requireFile('v0.6.3/data/starter-decks-candidate.js');
requireFile('docs/Gauntlet_v0.6.3_Strong_Starter_Decks_Second_Pass_Audit.md');
requireFile('docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md');

let rulebook = read(upstream.rulebook)
  .replace('**Version 0.6.3 — Player-Facing Candidate**', '**Version 0.6.3 — Release Candidate**')
  .replace('**Status:** Active next-release candidate; v0.6.2 remains the published playtest edition', '**Status:** Release candidate — not published; v0.6.2 remains the published playtest edition');

let reference = read(upstream.reference)
  .replace('**Status:** Active compact-reference candidate  \n**Version:** v0.6.3', '**Status:** Release candidate — not published  \n**Version:** v0.6.3');

let firstGame = read(upstream.firstGame)
  .replace('**Status:** Active player-facing candidate  \n**Version:** v0.6.3', '**Status:** Release candidate — not published  \n**Version:** v0.6.3');

let returning = read(upstream.returning)
  .replace('**Status:** Active returning-player candidate  ', '**Status:** Release candidate — not published  ')
  .replace('v0.6.2 remains the published playtest edition until v0.6.3 is fully propagated and released.', 'v0.6.2 remains the published playtest edition until the v0.6.3 publication cutover is completed.');

let completeReference = read(upstream.completeReference)
  .replace(/^# Gauntlet v0\.6\.3 Complete Card Reference Candidate/m, '# Gauntlet v0.6.3 Complete Card Reference — Release Candidate');

const canonical = readJson(upstream.canonical);
if (canonical.version !== 'v0.6.3-candidate') throw new Error(`Expected v0.6.3-candidate canonical data, received ${canonical.version}.`);
if (canonical.release_manifest !== null) throw new Error('Integrated canonical candidate must keep release_manifest null before publication.');

const starterCatalog = getV063StarterCatalog();
starterCatalog.version = 'v0.6.3-release-candidate';
starterCatalog.status = 'Release candidate — finalized starter Decks; not published';
starterCatalog.purpose = 'Finalized v0.6.3 starter Decks optimized for competitive strength, winning capability, and powerful or creative Leader strategies; teaching simplicity and card-pool coverage are not optimization targets. Further composition changes require playtest evidence.';
starterCatalog.compositionSource = 'v0.6.3/data/starter-decks-candidate.js';
starterCatalog.audit = 'docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md';
starterCatalog.predecessorAudit = 'docs/Gauntlet_v0.6.3_Strong_Starter_Decks_Second_Pass_Audit.md';
starterCatalog.publicationBoundary = {
  publishedVersion: 'v0.6.2',
  publicationCutoverComplete: false,
};

const factionGuide = `# Gauntlet v0.6.3 Faction and Component Guide\n\n**Status:** Release candidate — not published  \n**Version:** v0.6.3  \n**Baseline:** v0.6.2 faction/component system, with adopted v0.6.3 replacements and synchronized card excerpts\n\nThis guide is extracted from the synchronized v0.6.3 Rulebook release candidate so the standalone faction/component reference cannot drift from the Rulebook. v0.6.2 remains authoritative for published play until the v0.6.3 cutover.\n\n${section(rulebook, '# Part IV — Factions and Components')}`;

const releaseNotes = `# Gauntlet v0.6.3 — Release Candidate Notes\n\n**Status:** Release candidate — not published  \n**Prepared:** August 11, 2026  \n**Published baseline:** v0.6.2\n\nThis package is the pre-publication assembly of Gauntlet v0.6.3. It is intended for final cross-surface and print validation. It does **not** change the public website, published Rules Arbiter, digital default, or immutable v0.6.2 release.\n\n## Principal release changes\n\n- Opening selection is draw four, discard one face up, keep three; informed Territory arrangement follows before initiative.\n- Player Tokens begin on the Territories at their own ends; setup placement is not movement and does not count as entering.\n- Capturing the opponent-end Territory and winning the opponent's Last Stand are equal immediate Run-the-Gauntlet victory routes.\n- A separate legal movement sequence can initiate the Last Stand without prior capture or control of the final Territory.\n- **Deck** and **Draw Pile** replace the retired Playable Deck terminology.\n- Dual-role battle cards use the **Gambit/Tactic** heading; **Asset** is the banked-card heading and carries the normal inherent Bank Action.\n- Shared card procedures now govern Asset Removal, Bind cleanup, additional Tactics, reveal-stage interference, copied/repeated effects, battles ending without a winner, and effect-granted movement.\n- **Reserves** is renamed **Second Line** and **Smuggler's Pass** is renamed **Smuggler's Run** while retaining their stable identities.\n- Margin Loan remains banked until Repay or Default and prevents the normal start-of-turn draw while banked.\n- The twelve recommended starter Decks are finalized as independent v0.6.3 competitive release baselines: every Deck is 30 cards / 60 Deckbuilding Value, the set collectively represents 110 of 128 playable titles without using coverage as an optimization target, and further composition changes require playtest evidence.\n- The complete 128-card pool passed the production-size text audit.\n\n## Publication boundary\n\nPromotion into \`releases/v0.6.3/\`, root-site/current-release cutover, public Rules Arbiter cutover, and digital-default cutover are deliberately excluded from this package. Those actions belong to the later publication PR after source and print validation are green.\n`;

const outputs = [
  'README.md',
  'Gauntlet_v0.6.3_Rulebook.md',
  'Gauntlet_v0.6.3_Reference_Guide.md',
  'Gauntlet_v0.6.3_First_Game_Guide.md',
  'Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
  'Gauntlet_v0.6.3_Starter_Decks.json',
  'Gauntlet_v0.6.3_Complete_Card_Reference.md',
  'Gauntlet_v0.6.3_Canonical_Data.json',
  'Gauntlet_v0.6.3_Returning_Player_Changes.md',
  'Gauntlet_v0.6.3_Release_Notes.md',
  'Gauntlet_v0.6.3_Manifest.json',
  'deployment-status.json',
];

const factions = canonical.factions ?? [];
const cardCount = canonical.cards?.length ?? 0;
const leaderCount = factions.reduce((sum, faction) => sum + (faction.leaders?.length ?? 0), 0);
const arenaCount = (canonical.territories ?? []).filter((territory) => territory.arena).length;

const manifest = {
  version: 'v0.6.3-release-candidate',
  release_version: 'v0.6.3',
  name: 'Third Playtest Revision',
  status: 'candidate-not-published',
  prepared_date: releaseDate,
  previous_version: 'v0.6.2',
  playable_card_designs: cardCount,
  card_pool_summary_total: cardCount,
  territories: canonical.territories?.length ?? 0,
  arenas: arenaCount,
  proposals: canonical.proposals?.length ?? 0,
  factions: factions.length,
  leaders: leaderCount,
  starter_decks: starterCatalog.decks?.length ?? 0,
  governing_outputs: [
    'Gauntlet_v0.6.3_Rulebook.md',
    'Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
    'Gauntlet_v0.6.3_Complete_Card_Reference.md',
    'Gauntlet_v0.6.3_Canonical_Data.json',
  ],
  current_outputs: outputs,
  upstream_sources: {
    ...upstream,
    starters: 'v0.6.3/data/starter-decks-candidate.js',
    starterAudit: 'docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md',
    starterPredecessorAudit: 'docs/Gauntlet_v0.6.3_Strong_Starter_Decks_Second_Pass_Audit.md',
  },
  development_review_surfaces: [
    'v0.6.3/rulebook/',
    'v0.6.3/start/',
    'v0.6.3/quick-reference/',
    'v0.6.3/reference/',
    'v0.6.3/deckbuilder/',
    'v0.6.3/rules-arbiter/',
  ],
  publication_boundary: {
    published_version: 'v0.6.2',
    package_directory: candidateDir,
    promotion_target: 'releases/v0.6.3/',
    public_site_cutover: false,
    rules_arbiter_default_cutover: false,
    digital_default_cutover: false,
    published_release_directory_materialized: false,
  },
  validation: {
    final_card_text_integrated: true,
    player_facing_candidates_integrated: true,
    canonical_candidate_integrated: true,
    rules_arbiter_candidate_integrated: true,
    digital_candidate_integrated: true,
    starter_guidance_integrated: true,
    competitive_starter_baseline_integrated: true,
    starter_decks_finalized_for_v063: true,
    future_starter_changes_require_playtest_evidence: true,
    source_release_candidate_assembled: true,
    print_package_generated: false,
    ready_for_publication: false,
  },
};

const deploymentStatus = {
  version: 'v0.6.3-release-candidate',
  status: 'not-published',
  published_version: 'v0.6.2',
  source_package_ready: true,
  print_package_ready: false,
  public_cutover_ready: false,
  notes: 'Source release candidate assembled for validation. Printed-material generation and publication cutover remain separate gates.',
};

const readme = `# Gauntlet v0.6.3 — Release Candidate\n\nThis directory is the assembled **pre-publication source package** for v0.6.3. It is not an immutable published release. The canonical published playtest edition remains v0.6.2 until the later cutover PR promotes this package and switches public defaults.\n\n## Start here\n\n- [Rulebook](Gauntlet_v0.6.3_Rulebook.md)\n- [Compact Reference Guide](Gauntlet_v0.6.3_Reference_Guide.md)\n- [First Game Guide](Gauntlet_v0.6.3_First_Game_Guide.md)\n- [Faction and Component Guide](Gauntlet_v0.6.3_Faction_and_Component_Guide.md)\n- [What Changed Since v0.6.2](Gauntlet_v0.6.3_Returning_Player_Changes.md)\n- [Complete Card and Territory Reference](Gauntlet_v0.6.3_Complete_Card_Reference.md)\n- [Starter Decks](Gauntlet_v0.6.3_Starter_Decks.json)\n- [Canonical Data Candidate](Gauntlet_v0.6.3_Canonical_Data.json)\n- [Release Candidate Notes](Gauntlet_v0.6.3_Release_Notes.md)\n- [Release Candidate Manifest](Gauntlet_v0.6.3_Manifest.json)\n\nThe starter Deck file is generated from the finalized independent v0.6.3 competitive starter source and its repository finalization record, not from the immutable v0.6.2 starter compositions.\n\n## Publication boundary\n\nThis package deliberately does not modify \`releases/v0.6.2/\`, the public root/current-release links, the published Rules Arbiter default, or the digital default. The next gate is generation and validation of the v0.6.3 printed-material package. Promotion to \`releases/v0.6.3/\` occurs only after those checks pass.\n`;

expected(`${candidateDir}/Gauntlet_v0.6.3_Rulebook.md`, rulebook);
expected(`${candidateDir}/Gauntlet_v0.6.3_Reference_Guide.md`, reference);
expected(`${candidateDir}/Gauntlet_v0.6.3_First_Game_Guide.md`, firstGame);
expected(`${candidateDir}/Gauntlet_v0.6.3_Faction_and_Component_Guide.md`, factionGuide);
expected(`${candidateDir}/Gauntlet_v0.6.3_Starter_Decks.json`, JSON.stringify(starterCatalog, null, 2));
expected(`${candidateDir}/Gauntlet_v0.6.3_Complete_Card_Reference.md`, completeReference);
expected(`${candidateDir}/Gauntlet_v0.6.3_Canonical_Data.json`, JSON.stringify(canonical, null, 2));
expected(`${candidateDir}/Gauntlet_v0.6.3_Returning_Player_Changes.md`, returning);
expected(`${candidateDir}/Gauntlet_v0.6.3_Release_Notes.md`, releaseNotes);
expected(`${candidateDir}/Gauntlet_v0.6.3_Manifest.json`, JSON.stringify(manifest, null, 2));
expected(`${candidateDir}/deployment-status.json`, JSON.stringify(deploymentStatus, null, 2));
expected(`${candidateDir}/README.md`, readme);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`${check ? 'Verified' : 'Assembled'} v0.6.3 source release candidate with ${outputs.length} files; finalized competitive starter Decks integrated; published v0.6.2 boundary preserved.`);
