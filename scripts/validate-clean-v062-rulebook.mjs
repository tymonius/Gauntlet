import fs from 'node:fs';

const outputPath = 'artifacts/reconstruction/clean-v0.6.2/rulebook/Gauntlet_v0.6.2_Rulebook.md';
const manifestPath = 'artifacts/reconstruction/clean-v0.6.2/rulebook/authority-manifest.json';
const planPath = 'config/reconstruction-version-plan.json';
const certificationPath = 'artifacts/reconstruction/clean-v0.6.2/certification/authority-set.json';

function fail(message) {
  console.error(`clean-v062-rulebook: ${message}`);
  process.exitCode = 1;
}

function requireText(text, needle, label = needle) {
  if (!text.includes(needle)) fail(`missing ${label}`);
}

function forbidText(text, needle, label = needle) {
  if (text.includes(needle)) fail(`forbidden ${label}`);
}

if (!fs.existsSync(outputPath)) {
  fail(`missing generated Rulebook ${outputPath}`);
  process.exit();
}
if (!fs.existsSync(manifestPath)) {
  fail(`missing authority manifest ${manifestPath}`);
  process.exit();
}

const text = fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const v062 = plan.targets?.['clean-v0.6.2'];
const v063 = plan.targets?.['clean-v0.6.3'];

if (!v062?.authority_build_unlocked) fail('clean v0.6.2 authority build is not unlocked');
if (v063?.authority_build_unlocked) {
  if (v062?.status !== 'authority_certified') fail('clean v0.6.3 may be unlocked only after clean v0.6.2 certification');
  if (v063?.status !== 'authority_build_approved') fail('unlocked clean v0.6.3 must have authority_build_approved status');
  if (!fs.existsSync(certificationPath)) fail('clean v0.6.3 unlock requires the clean v0.6.2 certification manifest');
  if (v063?.unlock?.manifest !== certificationPath) fail('clean v0.6.3 unlock must pin the clean v0.6.2 certification manifest');
  if (v063?.unlock?.publication_unlocked !== false) fail('clean v0.6.3 authority unlock may not unlock publication');
}
if (plan.publication_unlocked) fail('publication must remain locked');
if (manifest.status !== 'authority_candidate_pending_human_semantic_approval') fail('unexpected manifest status');
if (manifest.approved_faction_authority_pr !== 609) fail('Rulebook must consume the PR #609 faction authority set');

// Architecture and source discipline.
requireText(text, '**Version 0.6.2 — Clean Reconstruction Candidate**', 'v0.6.2 candidate version');
for (const part of ['# Part I — Learn to Play', '# Part II — Complete Shared Rules', '# Part III — Factions', '# Part IV — Reference']) {
  requireText(text, part);
}
requireText(text, 'withdrawn v0.6.2 Rulebook and combined faction guide are historical evidence only', 'withdrawn-package quarantine statement');

// v0.6.2 setup boundary.
requireText(text, 'Each player draws four cards. Choose three to keep as the opening Hand. Place the fourth card face down beneath the Draw Pile.', 'draw-four/keep-three/bottom-one opening');
requireText(text, 'After selecting the opening Hand, secretly arrange the three Territory Cards', 'informed Territory arrangement');
requireText(text, 'Place each token immediately before the Territory at that player\'s end.', 'pre-v0.6.3 starting position');
requireText(text, 'Setup placement is not movement or entry.', 'setup placement semantics');
forbidText(text, 'Place each token on the Territory at that player\'s end.', 'v0.6.3 starting position');

// Turn and Action model.
requireText(text, '**Capture → Draw → Opening → Movement → Denouement → Cleanup**', 'Opening/Denouement turn sequence');
requireText(text, 'A **Faction Action** is a faction-specific option a player may choose when taking an Action.', 'Faction Action definition');
requireText(text, 'A **Faction Ability** is a faction-specific effect used or triggered at its stated timing.', 'Faction Ability definition');
requireText(text, 'Purge — Faction Action, Opening or Denouement', 'Inquisition two-phase Purge exception');
for (const retired of ['Action Opportunity', 'Action Window', 'Action window']) {
  forbidText(text, retired, `retired ${retired} terminology`);
}

// Integrated cross-references must point to the Rulebook chapters, not the standalone shared-candidate section numbers.
requireText(text, 'Resolve the active player\'s Capture step using the Front Line rules in Chapter 8.', 'Capture → Front Line chapter reference');
requireText(text, 'Follow the Action rules in Chapter 5.', 'turn → Action chapter reference');
requireText(text, 'The pending-battle and Terms procedure in Chapter 7 occurs before the battle reaches Onset.', 'movement → battle chapter reference');
forbidText(text, 'using the Front Line rules in Section 6.', 'standalone shared-candidate Front Line reference');
forbidText(text, 'Follow the Action rules in Section 2.', 'standalone shared-candidate Action reference');
forbidText(text, 'The pending-battle and Terms procedure in Section 4', 'standalone shared-candidate battle reference');

// Movement, battle, and control model.
requireText(text, '**Fall Back:** move one position toward your own end.', 'Fall Back movement choice');
requireText(text, '**Pending battle → Terms → Onset → Gambits**', 'pending battle / Terms / Onset sequence');
requireText(text, '**Defensive Edge:** When the defender has Defensive Edge, the defender wins tied battle totals.', 'Defensive Edge');
requireText(text, 'Each player rolls one die. Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals.', 'straight unmodified Tiebreak Roll');
requireText(text, 'A player\'s **Front Line** is the complete unbroken sequence of Territories they control beginning at their own end of the Gauntlet.', 'Front Line definition');
forbidText(text, "Defender's Advantage", 'v0.6.1 Defender\'s Advantage term');
forbidText(text, '**Withdraw:** move one position toward your own end.', 'withdraw-as-movement vocabulary');

// Cumulative v0.6.2 normal victory, not v0.6.3 independent routes.
requireText(text, 'Capturing the opponent\'s final Territory is necessary but does not by itself win the game in v0.6.2.', 'cumulative final-Territory rule');
requireText(text, 'The opponent\'s final Territory must be added to that Front Line before the attacker may begin the normal Last Stand sequence.', 'Last Stand requires final Territory in Front Line');
requireText(text, 'If the attacker wins, after having first brought the opponent\'s final Territory into their Front Line, they have run the Gauntlet and immediately win the game.', 'cumulative Last Stand victory');
forbidText(text, 'capturing the opponent\'s final Territory immediately wins', 'v0.6.3 final-Territory standalone victory');

// Golden-rule recovery.
requireText(text, 'When two rules or effects genuinely conflict, follow the more specific one. If both can apply, use normal timing and order instead; specificity does not undo an effect that has already been applied.', 'recovered specificity rule');

// Six approved faction authorities and all 12 Leader ownership identities.
const chapterHeadings = [
  '# 13. Military', '# 14. Diplomats', '# 15. Financiers', '# 16. Intelligence', '# 17. Mystics', '# 18. Inquisition',
];
for (const heading of chapterHeadings) requireText(text, heading);
for (const chapter of chapterHeadings) {
  const start = text.indexOf(chapter);
  const next = text.indexOf('\n# ', start + chapter.length);
  const segment = text.slice(start, next > start ? next : text.length);
  requireText(segment, '## How it works', `${chapter} overview teaching heading`);
  requireText(segment, '## Complete rules', `${chapter} overview complete-rules heading`);
  requireText(segment, '## Faction Actions', `${chapter} faction-actions heading`);
}
const leaders = [
  '### General', '### Commandant', '### Ambassador', '### Senator', '### Banker', '### Executive',
  '### Ranger', '### Spymaster', '### Alchemist', '### Spirit Walker', '### Grand Inquisitor', '### Witch Hunter',
];
for (const leader of leaders) requireText(text, leader, `Leader heading ${leader}`);
requireText(text, '**Onward — 1 Command:**', 'General Onward');
requireText(text, '**Fortify — 2 Command:**', 'Commandant Fortify');
requireText(text, '**Cordiality:**', 'Ambassador Cordiality');
requireText(text, '**Political Capital:**', 'Senator Political Capital');
requireText(text, '**Line of Credit:**', 'Banker Line of Credit');
requireText(text, '**Hostile Takeover:**', 'Executive Hostile Takeover');
requireText(text, '**Fieldcraft:**', 'Ranger Fieldcraft');
requireText(text, '**Mission Control:**', 'Spymaster Mission Control');
requireText(text, '**Materia Prima:**', 'Alchemist Materia Prima');
requireText(text, '**Guardians of the Circle:**', 'Spirit Walker Guardians of the Circle');
requireText(text, '**Final Judgment:**', 'Grand Inquisitor Final Judgment');
requireText(text, '**Relentless Pursuit:**', 'Witch Hunter Relentless Pursuit');

// Faction-rule deltas that must survive Rulebook integration.
requireText(text, 'Begin with 2 Capital', 'v0.6.2 Financier starting Capital');
requireText(text, '| +4 | 10 |', 'triangular Diplomat Leverage table');
requireText(text, 'Each additional +1 costs one more Influence than the previous increment.', 'triangular Diplomat Leverage progression');
requireText(text, 'during a pending battle before Onset', 'Diplomat Terms boundary');
requireText(text, 'You may take one Action during both your Opening and your Denouement, provided that one of those Actions is Purge.', 'Inquisition Purge phase permission');
requireText(text, 'All thirteen Mystics cards have the Arcane trait.', 'Mystics 13-card Arcane pool');
requireText(text, 'Start, complete, or abort a Mission; start or complete a Special Operation; all are Denouement Actions.', 'Intelligence Action grouping');

// The Rulebook should describe faction engines, not duplicate canonical card-reference chapters.
forbidText(text, 'Canonical Military card pool', 'embedded Military card catalog');
forbidText(text, 'Canonical Diplomat card pool', 'embedded Diplomat card catalog');
forbidText(text, 'Canonical Financier card pool', 'embedded Financier card catalog');
forbidText(text, 'Canonical Intelligence card pool', 'embedded Intelligence card catalog');
forbidText(text, 'Canonical Mystics card pool', 'embedded Mystics card catalog');
forbidText(text, 'Canonical Inquisition card pool', 'embedded Inquisition card catalog');

// v0.6.3 presentation / identity boundary.
forbidText(text, 'Second Line', 'v0.6.3 Reserves title migration');
forbidText(text, "Smuggler's Run", 'v0.6.3 Smuggler title migration');
forbidText(text, '**Deck** is the complete selected game package', 'v0.6.3 Deck/Draw Pile cleanup language');

if (text.split('\n').length < 1100) fail('Rulebook is unexpectedly short for a self-contained authority candidate');

if (!process.exitCode) {
  console.log('Clean v0.6.2 Rulebook validated: setup, shared rules, integrated references, cumulative victory, six faction engines, 12 Leader mappings, and cross-version boundaries are intact.');
}
