import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));

// Preserve the one useful non-player-facing reminder on finalized Manifest Destiny.
// It is a rules/reference note, not printed card text.
const manifestDestiny = byName.get('Manifest Destiny');
if (!manifestDestiny) throw new Error('Manifest Destiny not found.');
manifestDestiny.rules_notes = [
  'After entering the Gauntlet, this card is a normal Territory with a normal Deed.'
];

const playerFacing = (candidate.cards ?? [])
  .flatMap((card) => (card.effects ?? []).flatMap((effect) => [effect.label, effect.text]))
  .join('\n');

const forbiddenPatterns = [
  [/(?:^|\s)(?:Attacker|Defender|Counterattack|Win|Lose):(?=\s)/m, 'stale colon-form condition prefix'],
  [/\bActivate\b/, 'retired Activate term'],
  [/\bBattle effects?\b/, 'retired Battle-effect prose'],
  [/Gambit\/Tactic effect/, 'slash label used as prose category'],
  [/\bbattle involving you\b/i, 'redundant 1v1 battle scope'],
  [/\bPlayable Deck\b/, 'retired Playable Deck term'],
  [/\bAsset(?:s)? (?:you|they) control\b/, 'redundant Asset-control wording'],
  [/as though you (?:played|controlled) it/i, 'obsolete copied-effect boilerplate'],
  [/normal (?:role )?destinations?/i, 'obsolete destination jargon'],
  [/place this card(?: from your Hand)? as an Overlay/i, 'obsolete physical Overlay placement wording'],
  [/\+\d+ Front Line/, 'obsolete Front Line shorthand']
];

for (const [pattern, description] of forbiddenPatterns) {
  if (pattern.test(playerFacing)) throw new Error(`Final v0.6.3 card-text integrity failure: ${description} (${pattern}).`);
}

const labels = (candidate.cards ?? []).flatMap((card) => (card.effects ?? []).map((effect) => effect.label));
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
    accepted_convention_residuals_checked_poolwide: true
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log('Final v0.6.3 card-text integrity gate passed across all 128 cards.');
