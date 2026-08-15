import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { publicAuthorityNote, RULEBOOK_SHA256, RULEBOOK_SOURCE, PLAYER_CHAPTER_11 } from './publication-utils.mjs';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const hash = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

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

const app = read('rulebook/app.js');
if (!app.includes("const CHAPTER_11_URL = './player-facing/chapter-11.md';")) {
  fail('Browser Rulebook does not load the reviewed player-facing Chapter 11 source.');
}
const verifyIndex = app.indexOf('if (actualHash !== SOURCE_SHA256)');
const applyIndex = app.indexOf('const markdown = publicRulebookSource');
if (verifyIndex < 0 || applyIndex < 0 || verifyIndex >= applyIndex) {
  fail('Browser Rulebook must verify the certified source hash before applying the player-facing Rulebook layer.');
}
if (!read('scripts/publication-utils.mjs').includes('replacePlayerFacingChapter11(normalized)')) {
  fail('Semantic Rulebook publication does not apply the reviewed Chapter 11 replacement.');
}

if (failures) {
  console.error(`Player-facing v0.6.3 Rulebook validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('Validated certified Rulebook integrity and self-contained player-facing Chapter 11 publication layer.');
