import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const candidatePath = 'docs/Gauntlet_v0.6.2_Faction_and_Component_Candidate.md';
const compatibilityAuditPath = 'docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md';
const matrixPath = 'docs/Gauntlet_v0.6.2_Faction_Component_Test_Matrix.md';
const compatibilityMatrixPath = 'docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Test_Matrix.md';
const sharedPath = 'docs/Gauntlet_v0.6.2_Shared_Rules_Candidate.md';
const ledgerPath = 'docs/Gauntlet_v0.6.2_Implementation_Ledger.md';

const candidate = read(candidatePath);
const compatibilityAudit = read(compatibilityAuditPath);
const matrix = read(matrixPath);
const compatibilityMatrix = read(compatibilityMatrixPath);
const shared = read(sharedPath);
const ledger = read(ledgerPath);
const normativeWaveB = `${candidate}\n${compatibilityAudit}`;

const failures = [];
const requireText = (source, text, label) => {
  if (!source.includes(text)) failures.push(`${label}: missing ${JSON.stringify(text)}`);
};
const forbidText = (source, text, label) => {
  if (source.includes(text)) failures.push(`${label}: forbidden ${JSON.stringify(text)}`);
};

for (const [text, label] of [
  ['Neutral | 50 | Remove Invasion; add Landslide.', 'Neutral replacement'],
  ['Military | 13 | Add Invasion.', 'Military count'],
  ['Diplomats | 13 | Add Détente.', 'Diplomat count'],
  ['Financiers | 13 | Add Compound Interest.', 'Financier count'],
  ['Intelligence | 13 | Add Extraordinary Rendition.', 'Intelligence count'],
  ["Mystics | 13 | Add Nature's Altar.", 'Mystics count'],
  ['Inquisition | 13 | Add Martyrdom.', 'Inquisition count'],
  ['**Action — Opening:** During your Movement this turn, you may advance up to two additional Positions', 'Invasion Action'],
  ['Unused additional movement is lost when a pending battle is created.', 'Invasion movement loss'],
  ['**Asset:** The first time each turn an opponent accepts one of your Proposals that was already ratified when you offered it, gain 1 Influence.', 'Détente Asset'],
  ['**Asset:** After your normal Draw, if your Treasury contains at least one card, you may reveal the top card of your Draw Pile.', 'Compound Interest Asset'],
  ['Whenever you discard one or more Assets you control, discard Extraordinary Rendition before any others, if able.', 'Extraordinary Rendition priority'],
  ["**Overlay:** During your Opening, if your Player Token is on this Territory, you may take the Begin a Rite Faction Action.", "Nature's Altar Overlay"],
  ['cards remaining in the opponent\'s Reserve go to their Graveyard instead of their Discard Pile', 'Martyrdom Reserve destination'],
  ['**Overlay:** When a player retreats onto this Territory, they retreat one additional Position, if able.', 'Landslide Overlay'],
  ['**Purge — Opening or Denouement:**', 'Purge phase label'],
  ['**Defensive Edge:** When the defender has Defensive Edge, the defender wins tied battle totals.', 'Defensive Edge definition'],
  ['During battles here, Defensive Edge does not apply. If battle totals remain tied, make a Tiebreak Roll.', 'Arena tie replacement'],
  ['**Accepted:** Put that card in your Graveyard, then gain 1 Influence.', 'Good Faith accepted result'],
  ['**Tactic:** Gain advantage. Then you may play one card from your Hand with a Tactic or Battle effect face up as an additional Tactic. In the Aftermath, put this card and that card in your Graveyard.', 'Black Covenant'],
  ['| First Rite | 1 |\n| Second Rite | 2 |\n| Third Rite | 3 |\n| Ritual of Ascendance | 4 |', 'Guardians scaling'],
  ['| Starting Capital | 2, as a v0.6.2 test revision. |', 'Financier starting Capital'],
  ['If Treasury value is greater, the Financier may take one Action during both Opening and Denouement that turn', 'Financial Capacity'],
  ["Tariffs, Divestment, and Margin Loan each permit one additional Action during the phase in which the card's Action resolves.", 'Financier same-phase Action permission'],
  ['| +1 | 1 |\n| +2 | 3 |\n| +3 | 6 |\n| +4 | 10 |', 'Leverage progression'],
]) requireText(candidate, text, label);

for (const [text, label] of [
  ['**Start a Mission — Denouement:**', 'Intelligence Mission timing'],
  ['**Complete a Special Operation — Denouement:**', 'Intelligence Special Operation timing'],
  ['Fieldcraft does not alter Territory control, Occupation, Capture, Defensive Edge', 'Fieldcraft terminology'],
  ['**Action:** Place Fog of War as an Overlay on a Territory.', 'Fog of War placement'],
  ['**Use:** During Onset in a battle you initiated', 'Reconnaissance Onset timing'],
  ['**Use:** During Opening or Denouement, as an Action, put this card in your Graveyard', 'Sleeper Network timing'],
  ['All 13 Mystics cards, including Nature\'s Altar, have the Arcane trait.', 'Mystics Arcane count'],
  ['**Beginning restriction:** You may take the Begin a Rite Faction Action for Rite of Crossing during Denouement only after winning a battle that turn', 'Rite of Crossing timing'],
  ['**Relentless Pursuit:** Once per turn, at the end of the Aftermath', 'Relentless Pursuit'],
  ['the losing opponent cannot play or benefit from Martyrdom', 'No Martyrs and Martyrdom'],
  ['**Asset:** Opposing effects cannot reveal your Hand, Reserve, or face-down Gambits or Tactics.', 'Neutral Counterintelligence'],
  ['**Action — Opening:** During your Movement this turn, you may move one additional Position. This additional movement cannot create a pending battle.', 'Forced March'],
  ['If that additional movement creates a pending battle, you cannot set a Gambit in that battle.', 'Advance Guard'],
  ['they cannot play a card for its Action effect during Denouement that turn.', 'Entrenchment'],
  ['**Use:** During Onset while you are the defender', 'Palisade Wall'],
  ['**Use:** During Opening or Denouement, you may discard this card. If you do, you may take one additional Action during that phase.', 'Reinforcements'],
  ['Draw three cards. After this Action resolves, you may take one additional Action during this phase.', 'Insurrection'],
  ['After you win a Counterattack, draw one card. During your Denouement that turn, you may take one additional Action, even if you take another Action during that phase.', 'Liberation'],
  ['If you play Strategic Withdrawal during Denouement after your normal Movement has ended, begin a new Movement sequence', 'Strategic Withdrawal'],
  ['Assimilation cannot create isolated control.', 'Assimilation'],
  ['The next time the opponent would add this Territory to their Front Line during Capture, prevent that Front Line advance.', 'Protracted Siege'],
  ['Manifest Destiny never creates isolated control.', 'Manifest Destiny'],
  ['After a player voluntarily Falls Back onto Refuge, they draw one card.', 'Refuge'],
]) requireText(compatibilityAudit, text, label);

for (const text of [
  'Defender\'s Advantage',
  'If battle totals are tied, reroll the battle dice.',
  'gain 1 Influence for each Influence spent',
]) forbidText(candidate, text, 'candidate vocabulary');

for (const text of [
  'Capture → Draw → Opening → Movement → Denouement → Cleanup',
  'Pending battle → Terms → Onset → Gambits',
  '**Defensive Edge:** When the defender has Defensive Edge, the defender wins tied battle totals.',
  'advance your Front Line',
]) requireText(shared + normativeWaveB, text, 'Wave A/B parity');

for (const text of [
  'Landslide',
  'Détente',
  'Compound Interest',
  'Extraordinary Rendition',
  "Nature's Altar",
  'Martyrdom',
  'Complete interaction and stacking validation for Military Invasion',
]) requireText(ledger, text, 'implementation ledger parity');

const proposalStart = candidate.indexOf('## Proposal set — exact v0.6.2 text');
const proposalEnd = candidate.indexOf('## Diplomats — Détente');
if (proposalStart < 0 || proposalEnd <= proposalStart) {
  failures.push('Proposal block could not be isolated.');
} else {
  const proposalBlock = candidate.slice(proposalStart, proposalEnd);
  const proposalNames = [
    'De-escalation',
    'Orderly Withdrawal',
    'Capitulation',
    'Open Channels',
    'Mutual Disarmament',
    'Prisoner Exchange',
    'Rebuilding Pact',
    'Ultimatum',
    'Diplomatic Recognition',
  ];
  for (const name of proposalNames) requireText(proposalBlock, `### ${name}`, `Proposal ${name}`);
  const perspectiveTerms = proposalBlock.match(/\b(?:you|your|yours)\b/gi) ?? [];
  if (perspectiveTerms.length > 0) {
    failures.push(`Proposal block contains ambiguous reader-perspective terms: ${perspectiveTerms.join(', ')}`);
  }
  const acceptedCount = (proposalBlock.match(/> \*\*Accepted:\*\*/g) ?? []).length;
  const refusedCount = (proposalBlock.match(/> \*\*Refused:\*\*/g) ?? []).length;
  if (acceptedCount !== 9 || refusedCount !== 9) {
    failures.push(`Proposal block must contain 9 Accepted and 9 Refused results; found ${acceptedCount}/${refusedCount}.`);
  }
}

const getScenarioIds = (source) => [...source.matchAll(/^## ([A-Z]\d{2}) —/gm)].map((match) => match[1]);
const primaryScenarioIds = getScenarioIds(matrix);
const compatibilityScenarioIds = getScenarioIds(compatibilityMatrix);
const scenarioIds = [...primaryScenarioIds, ...compatibilityScenarioIds];
const uniqueScenarioIds = new Set(scenarioIds);

if (primaryScenarioIds.length !== 85) {
  failures.push(`Expected 85 primary Wave B scenarios; found ${primaryScenarioIds.length}.`);
}
if (compatibilityScenarioIds.length !== 26) {
  failures.push(`Expected 26 compatibility scenarios; found ${compatibilityScenarioIds.length}.`);
}
if (scenarioIds.length !== 111 || uniqueScenarioIds.size !== 111) {
  failures.push(`Expected 111 unique combined Wave B scenarios; found ${scenarioIds.length} headings and ${uniqueScenarioIds.size} unique IDs.`);
}

for (const prefix of ['A', 'M', 'D', 'F', 'I', 'Y', 'Q', 'N']) {
  if (!scenarioIds.some((id) => id.startsWith(prefix))) failures.push(`Missing scenario family ${prefix}.`);
}

for (const text of [
  'Détente does not trigger when the accepted Proposal becomes ratified during those Terms.',
  "Tariffs, Divestment, and Margin Loan each permit one additional Action during the phase in which the card's Action resolves.",
  'Arenas remove Defensive Edge and use a separate Tiebreak Roll',
  'published v0.6.1 sources remain unchanged',
]) requireText(normativeWaveB, text, 'cross-faction requirement');

if (failures.length > 0) {
  console.error('v0.6.2 faction/component validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`v0.6.2 faction/component validation passed (${scenarioIds.length} scenarios, exact-text and parity gates).`);
