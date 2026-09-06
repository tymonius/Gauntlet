import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { publicAuthorityNote, RULEBOOK_SHA256, RULEBOOK_SOURCE, PLAYER_CHAPTER_11 } from './publication-utils.mjs';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const hash = (relative) => crypto.createHash('sha256').update(read(relative), 'utf8').digest('hex');

let failures = 0;
const fail = (message) => { console.error(message); failures += 1; };

if (hash(RULEBOOK_SOURCE) !== RULEBOOK_SHA256) {
  fail(`${RULEBOOK_SOURCE}: certified Rulebook hash drifted before player-facing transformation.`);
}

const certified = read(RULEBOOK_SOURCE);
const chapter11Override = read(PLAYER_CHAPTER_11);
const published = publicAuthorityNote(certified);
const startMarker = '# 11. Detailed Card and Timing Rules';
const endMarker = '# 12. Overlays and Other Shared Card Rules';
const start = published.indexOf(startMarker);
const end = published.indexOf(endMarker);
if (start < 0 || end < 0 || end <= start) fail('Published Rulebook does not contain valid Chapter 11 boundaries.');

const chapter11 = start >= 0 && end > start ? published.slice(start, end).trim() : '';
if (chapter11 !== chapter11Override.trim()) {
  fail('Published Rulebook Chapter 11 does not exactly match the reviewed player-facing Chapter 11 source.');
}

for (const phrase of [
  'Inherited interaction rules',
  'Adopted v0.6.3 card procedures',
  'v0.6.3 no longer uses',
  'former **Activate** heading is retired',
  'Cards therefore do not need',
  'Cards should still use',
  'Do not print `from Reserve`',
  'When ownership is already clear from the sentence, prefer',
  'standard v0.6.3 game is 1v1',
]) {
  if (chapter11.includes(phrase)) fail(`Player-facing Chapter 11 contains reconstruction/editorial language: ${JSON.stringify(phrase)}`);
}

for (const required of [
  'the attacker applies one effect they control',
  'A replacement Gambit must be Gambit-eligible.',
  'A negated card has no effect but remains in battle.',
  '**Bank:** As an Action, play this card from your Hand and bank it.',
  'It does not spend or require another Action unless',
  'Effect-granted movement may create a pending battle and may force the opponent to make a Last Stand',
  'Unless an effect says otherwise, a Tactic comes from the player\'s **Reserve**.',
  'A card whose title begins **Sanctions:** is a **Sanction**.',
  'An Asset is **Removed** when a rule or effect forces it to leave play.',
  '**Bind** attaches one card to another',
  'resolve reveal-stage interference before ordinary effects at that stage',
  '`+N Action` grants N additional Actions during the **current phase**.',
  'the reroll replaces the result it rerolls',
  'Make all choices again and pay all costs again for each new application.',
  'neither player wins or loses that battle; withdrawal is not a loss;',
]) {
  if (!chapter11.includes(required)) fail(`Player-facing Chapter 11 lost required rule meaning: ${JSON.stringify(required)}`);
}

for (const phrase of [
  'State these effects in terms of the procedure the player may perform.',
  'Faction references must group Faction Actions separately from Faction Abilities',
  'Use **Onset** as the formal stage name.',
  'interpret or rewrite it to:',
  'Rules and player-facing text may distinguish',
  'inherited Last Stand battle rules',
  'clean faction authority',
  'perspective-dependent **you** or **your**',
  'an Denouement',
  'Counterintelligence does not prevent the reveal',
  'banked-card effect heading in v0.6.3',
  'apply unchanged',
  'Cards therefore do not need to repeat identification of the refusing opponent',
  'a successful purchase also gives you control of that Territory',
  "At the beginning of the opponent's turn, after their normal start-of-turn draw attempt",
]) {
  if (published.includes(phrase)) fail(`Player-facing Rulebook still contains rejected wording: ${JSON.stringify(phrase)}`);
}

for (const required of [
  "Unless an effect expressly says otherwise, a capture effect outside the normal Capture step advances that player's Front Line by one Territory and cannot create non-contiguous control.",
  'The capture route and Last Stand battle route both count as running the Gauntlet.',
  'Conduct the resulting battle normally. The defender has Defensive Edge while making a Last Stand unless an effect removes it.',
  'Reference cards summarize procedures but do not replace the complete faction rules in this Rulebook.',
  'When resolving a Proposal, follow the player roles named in its Accepted or Refused effect.',
  'If the purchase succeeds and that Territory is immediately beyond your Front Line, capture it.',
  'Otherwise, Hostile Takeover does not change Territory control.',
  "If the opponent is unable to draw to start their turn because both their Draw Pile and Discard Pile are empty, immediately win through **Purification**.",
  'Playing or setting a card face up does not count as revealing it.',
  'Counterintelligence therefore does not prevent effects like Watchtower that cause a card to be played or set face up.',
  'Additional printed removal conditions also apply unless the Sanction says otherwise.',
  '**Asset is the only banked-card effect heading.**',
  'Normal Deed purchase costs, caps, procedures, income rules, and Controlling Interest rules apply.',
]) {
  if (!published.includes(required)) fail(`Player-facing Rulebook lost approved readthrough wording: ${JSON.stringify(required)}`);
}

const app = read('rulebook/app.js');
if (!app.includes("const RELEASE_MANIFEST_URL = '../releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json';")) {
  fail('Current Browser Rulebook is not bound to the published v0.7.1 release manifest.');
}
if (app.includes("const CHAPTER_11_URL = './player-facing/chapter-11.md';") || app.includes('publicRulebookSource')) {
  fail('Current Browser Rulebook must not layer mutable v0.6.3 player-facing sources over the published v0.7.0 release.');
}
if (!app.includes('if (actualHash !== rulebook.sha256)')) {
  fail('Current Browser Rulebook does not verify its published Rulebook binding.');
}
if (!read('scripts/publication-utils.mjs').includes('replacePlayerFacingChapter11(normalized)')) {
  fail('Semantic Rulebook publication does not apply the reviewed Chapter 11 replacement.');
}
if (!read('rules-assistant/v063-last-stand-language.js').includes('applyV063PlayerFacingRulebookCorrections')) {
  fail('Browser and Rules Arbiter normalization do not share the player-facing Rulebook correction source.');
}

const bookletWorkflow = read('.github/workflows/build-clean-v063-booklet.yml');
if (!bookletWorkflow.includes('/rulebook/player-facing/corrections.js')) {
  fail('Rulebook booklet sparse checkout does not include the shared player-facing corrections source.');
}
const qualityGate = read('.github/workflows/pr-quality-gate.yml');
for (const requiredRoute of [
  "under('rulebook/player-facing/')",
  "exact('rules-assistant/v063-last-stand-language.js')",
  "exact('scripts/publication-utils.mjs')",
]) {
  if (!qualityGate.includes(requiredRoute)) {
    fail(`PR quality gate does not route player-facing Rulebook input through the booklet contract: ${requiredRoute}`);
  }
}

const financierPage = read('factions/financiers/index.html');
if (!financierPage.includes('If the purchase succeeds and that Territory is immediately beyond your Front Line, capture it; otherwise, the purchase does not change Territory control.')) {
  fail('Financiers public faction page does not reflect contiguous Hostile Takeover capture.');
}
const inquisitionPage = read('factions/inquisition/index.html');
if (!inquisitionPage.includes('If the opponent is unable to draw to start their turn because both their Draw Pile and Discard Pile are empty, the Inquisition wins immediately.')) {
  fail('Inquisition public faction page does not reflect approved Purification wording.');
}

if (failures) {
  console.error(`Player-facing v0.6.3 Rulebook validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('Validated certified Rulebook integrity, reviewed Chapter 11, full player-facing readthrough corrections, and booklet routing.');
