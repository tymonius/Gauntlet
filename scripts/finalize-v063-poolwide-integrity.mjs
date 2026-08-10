import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));

function effect(cardName, label) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const found = (card.effects ?? []).find((entry) => entry.label === label);
  if (!found) throw new Error(`Effect ${label} not found on ${cardName}.`);
  return found;
}

function replaceText(cardName, label, from, to) {
  const target = effect(cardName, label);
  if (!target.text.includes(from)) throw new Error(`Expected text not found on ${cardName} ${label}: ${from}`);
  target.text = target.text.replace(from, to);
}

function replaceEffect(cardName, label, text) {
  effect(cardName, label).text = text;
}

// Variants found only after inspecting the generated final artifact.
replaceText(
  'Circle of Bones',
  'Overlay',
  'Once during each battle here involving you, after dice are rolled,',
  'Once during each battle here, after dice are rolled,'
);

// Finish the adopted natural Aftermath wording while preserving genuinely
// distinct end-of-Aftermath timing.
replaceEffect('Assimilation', 'Asset',
  'In the Aftermath, if you initiated and won this battle on a Territory the opponent controls, you may put this card in your Graveyard to advance Front Line 1, if able, instead of occupying it.');
replaceEffect('Attrition', 'Asset',
  'In the Aftermath, if the opponent lost, put each opposing Tactic from this battle in their Graveyard instead of their Discard Pile.');
replaceEffect('Countercharge', 'Asset',
  'At the end of the Aftermath, if you won and did not initiate this battle, you may put this card in your Graveyard to advance one Position.');
replaceEffect('Countercharge', 'Gambit/Tactic',
  'At the end of the Aftermath, if you won and did not initiate this battle, put this card in your Graveyard, then advance one Position.');
replaceEffect('Court Martial', 'Asset',
  'In the Aftermath, if the opponent lost, after their normal retreat, you may discard this card: Retreat +1, if able.');
replaceEffect('Scorched Earth', 'Asset',
  'In the Aftermath, if you lost while defending a Territory you control, after you retreat, you may place this card on that Territory as a Ruins Overlay.');
replaceEffect('Underwriting', 'Asset',
  'In the Aftermath, if you lost after using Subsidize, you may discard this card to gain Capital equal to the bonus you purchased.');
replaceEffect('War Crimes', 'Asset',
  "In the Aftermath, if you won, you may put this card in your Graveyard to put all opposing Tactics from this battle in their owner's Graveyard instead of their Discard Pile; Opponent: Retreat +1. You cannot move, capture a Territory, or use an Order as a result of that victory.");

// Win/Lose dash prefixes are reserved for paired/genuinely branching outcomes.
replaceEffect('Battlefield Promotion', 'Gambit/Tactic',
  'In the Aftermath, if you win, return one other Tactic you chose to your Hand instead of putting it in your Discard Pile.');
replaceEffect('Capital Punishment', 'Gambit/Tactic',
  "When revealed, negate one opposing Gambit or Tactic that has not taken effect. In the Aftermath, if you win, put the chosen card in its owner's Graveyard.");
replaceEffect('Corner the Market', 'Gambit/Tactic',
  'In the Aftermath, if you win, you may buy or buy out any number of Deeds. Complete each purchase before calculating the next cost.');
replaceEffect('Foothold', 'Gambit/Tactic',
  'If you are defending against a Counterattack, gain Advantage. In the Aftermath, if you win, +1 Card.');
replaceEffect('Fortifications', 'Gambit/Tactic',
  'Defender — +1 Battle Total. If you lose, after your normal retreat you may move one additional Position toward your own end.');
replaceEffect('Hold the Line', 'Asset',
  'During Onset while defending a Territory you control, you may put this card in your Graveyard. If you do, after Tactics are revealed, +2 Reserve; +1 Tactic from those cards. If you lose, after you retreat, the attacker captures that Territory.');
replaceEffect('Hold the Line', 'Gambit/Tactic',
  'If you are defending a Territory you control, after Tactics are revealed, +2 Reserve; +1 Tactic from those cards. If you lose, after you retreat, the attacker captures that Territory. In the Aftermath, put this card in your Graveyard.');
replaceEffect('Salvage', 'Gambit/Tactic',
  'In the Aftermath, if you win, you may put one card remaining in your Reserve in your Hand instead of your Discard Pile, then discard one card from your Hand.');
replaceEffect('War Crimes', 'Gambit/Tactic',
  'In the Aftermath, if you win, you may apply the same effect and put this card in your Graveyard.');

// Shared movement rules already establish one-Position-at-a-time movement.
replaceEffect("Fate's Toll", 'Action',
  'Put one other card from your Hand in your Graveyard. Move one additional Position this turn.');
replaceEffect('Invasion', 'Action',
  'During your Movement this turn, you may advance up to two additional Positions. This additional movement may only be used to advance.');

// Capitalize the defined Position term in the remaining player-facing uses.
for (const card of candidate.cards ?? []) {
  for (const entry of card.effects ?? []) {
    entry.text = entry.text.replace(/\bposition\b/g, 'Position');
  }
}

// Preserve the one useful non-player-facing reminder on finalized Manifest Destiny.
const manifestDestiny = byName.get('Manifest Destiny');
if (!manifestDestiny) throw new Error('Manifest Destiny not found.');
manifestDestiny.rules_notes = [
  'After entering the Gauntlet, this card is a normal Territory with a normal Deed.'
];

const playerFacing = (candidate.cards ?? [])
  .flatMap((card) => (card.effects ?? []).flatMap((entry) => [entry.label, entry.text]))
  .join('\n');

const forbiddenPatterns = [
  [/(?:^|\s)(?:Attacker|Defender|Counterattack|Win|Lose):(?=\s)/m, 'stale colon-form condition prefix'],
  [/\bActivate\b/, 'retired Activate term'],
  [/\bBattle effects?\b/, 'retired Battle-effect prose'],
  [/Gambit\/Tactic effect/, 'slash label used as prose category'],
  [/\binvolving you\b/i, 'redundant 1v1 battle scope'],
  [/\bPlayable Deck\b/, 'retired Playable Deck term'],
  [/\bAsset(?:s)? (?:you|they) control\b/, 'redundant Asset-control wording'],
  [/as though you (?:played|controlled) it/i, 'obsolete copied-effect boilerplate'],
  [/normal (?:role )?destinations?/i, 'obsolete destination jargon'],
  [/place this card(?: from your Hand)? as an Overlay/i, 'obsolete physical Overlay placement wording'],
  [/\+\d+ Front Line/, 'obsolete Front Line shorthand'],
  [/\b(?:In|During|At the end of) the Aftermath of a battle\b/i, 'obsolete Aftermath-of-a-battle construction'],
  [/\bone (?:P|p)osition at a time\b|\bone at a time\b/i, 'redundant one-at-a-time movement reminder'],
  [/\bposition\b/, 'lowercase defined Position term']
];

for (const [pattern, description] of forbiddenPatterns) {
  if (pattern.test(playerFacing)) throw new Error(`Final v0.6.3 card-text integrity failure: ${description} (${pattern}).`);
}

// Win/Lose shorthand is permitted only when the same effect actually branches.
for (const card of candidate.cards ?? []) {
  for (const entry of card.effects ?? []) {
    const hasWin = entry.text.includes('Win —');
    const hasLose = entry.text.includes('Lose —');
    if (hasWin !== hasLose) {
      throw new Error(`Unpaired Win/Lose shorthand remains on ${card.name} ${entry.label}.`);
    }
  }
}

const labels = (candidate.cards ?? []).flatMap((card) => (card.effects ?? []).map((entry) => entry.label));
if (labels.includes('Activate') || labels.includes('Battle')) {
  throw new Error('Final v0.6.3 candidate contains retired Activate or Battle headings.');
}
if (labels.filter((label) => label === 'Gambit/Tactic').length !== 106) {
  throw new Error(`Expected 106 Gambit/Tactic headings, found ${labels.filter((label) => label === 'Gambit/Tactic').length}.`);
}

for (const card of candidate.cards ?? []) {
  for (const legacy of ['activate', 'battle']) {
    if (Object.hasOwn(card, legacy)) throw new Error(`Legacy ${legacy} field remains on ${card.name}.`);
  }
}

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  final_integrity: {
    manifest_destiny_rules_note_preserved: true,
    condition_prefix_colons_forbidden: true,
    aftermath_variants_normalized: true,
    unpaired_win_lose_shorthand_forbidden: true,
    defined_position_capitalized: true,
    accepted_convention_residuals_checked_poolwide: true
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log('Final v0.6.3 card-text integrity gate passed across all 128 cards.');
