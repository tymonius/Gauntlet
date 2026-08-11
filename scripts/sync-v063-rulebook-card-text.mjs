import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rulebookPath = path.join(root, 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Rulebook_Candidate.md');
const candidatePath = path.join(root, 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json');

let rulebook = fs.readFileSync(rulebookPath, 'utf8').replace(/\r\n/g, '\n');
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const cards = new Map(candidate.cards.map((card) => [card.name, card]));

function effectQuote(card) {
  return card.effects.map(({ label, text }) => {
    const lines = String(text).split('\n');
    let output = `> **${label}:** ${lines[0]}`;
    for (const line of lines.slice(1)) output += line ? `\n> ${line}` : '\n>';
    return output;
  }).join('\n>\n');
}

function headingRange(text, heading) {
  const match = new RegExp(`^(#{1,6}) ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm').exec(text);
  assert(match, `Missing Rulebook card heading: ${heading}`);
  const level = match[1].length;
  const bodyStart = match.index + match[0].length;
  const next = new RegExp(`^#{1,${level}} .+$`, 'gm');
  next.lastIndex = bodyStart;
  const nextMatch = next.exec(text);
  return { level, bodyStart, bodyEnd: nextMatch ? nextMatch.index : text.length };
}

function replaceFirstQuoteBlock(text, heading, cardName) {
  const card = cards.get(cardName);
  assert(card, `Missing final v0.6.3 card: ${cardName}`);
  const { bodyStart, bodyEnd } = headingRange(text, heading);
  const body = text.slice(bodyStart, bodyEnd);
  const lines = body.split('\n');
  const firstQuote = lines.findIndex((line) => line.startsWith('>'));
  assert(firstQuote >= 0, `No quoted card text found under ${heading}`);

  let afterQuote = firstQuote;
  let seenQuote = false;
  for (; afterQuote < lines.length; afterQuote += 1) {
    const line = lines[afterQuote];
    if (line.startsWith('>')) {
      seenQuote = true;
      continue;
    }
    if (seenQuote && line.trim() === '') continue;
    if (seenQuote) break;
  }

  const before = lines.slice(0, firstQuote).join('\n').replace(/\s+$/, '');
  const after = lines.slice(afterQuote).join('\n').replace(/^\s+/, '');
  const replacement = `${before}\n\n${effectQuote(card)}${after ? `\n\n${after}` : ''}\n`;
  return text.slice(0, bodyStart) + replacement + text.slice(bodyEnd);
}

function replaceHeadingBody(text, heading, cardName) {
  const card = cards.get(cardName);
  assert(card, `Missing final v0.6.3 card: ${cardName}`);
  const { bodyStart, bodyEnd } = headingRange(text, heading);
  const replacement = `\n\n**Current exact v0.6.3 card text:**\n\n${effectQuote(card)}\n\n`;
  return text.slice(0, bodyStart) + replacement + text.slice(bodyEnd);
}

// New/moved v0.6.2 blocks retain useful faction-interaction notes, but their
// quoted card faces are replaced from the final v0.6.3 candidate.
for (const [heading, cardName] of [
  ['Military — Invasion', 'Invasion'],
  ['Diplomats — Détente', 'Détente'],
  ['Financiers — Compound Interest', 'Compound Interest'],
  ['Intelligence — Extraordinary Rendition', 'Extraordinary Rendition'],
  ["Mystics — Nature's Altar", "Nature's Altar"],
  ['Inquisition — Martyrdom', 'Martyrdom'],
  ['Black Covenant', 'Black Covenant'],
]) {
  rulebook = replaceFirstQuoteBlock(rulebook, heading, cardName);
}

// These inherited-card subsections existed specifically to state revised card
// wording. Replace the entire old migration prose with the final exact text so
// the Rulebook cannot preserve an earlier editorial layer.
for (const cardName of [
  'Battlefield Promotion',
  'Encampment',
  'Give Chase',
  'Hold the Line',
  'Shock and Awe',
  'Good Faith',
  'Gunboat Diplomacy',
  'Safe Conduct',
  'Demilitarized Zone',
  'Foreclosure',
]) {
  rulebook = replaceHeadingBody(rulebook, cardName, cardName);
}

rulebook = rulebook
  .replace(
    'The first-discard requirement applies to voluntary Asset discard, required Asset loss, and Asset replacement.',
    'The first-discard requirement applies whenever you discard one or more Assets, including voluntary discard, required Asset discard, and Asset replacement.'
  )
  .replace('Extraordinary Rendition has no Use, Battle, or Mission mode.', 'Extraordinary Rendition has no Gambit, Tactic, Gambit/Tactic, or Mission effect.')
  .replaceAll("Smuggler's Pass", "Smuggler's Run")
  .replace(/\s+$/, '') + '\n';

fs.writeFileSync(rulebookPath, rulebook, 'utf8');
console.log("Synchronized 17 Rulebook card-text blocks and the Smuggler's Run Territory rename to the final v0.6.3 candidate.");
