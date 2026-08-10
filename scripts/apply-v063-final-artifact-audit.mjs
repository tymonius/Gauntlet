import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));

replaceText(
  'Arcane Knowledge',
  'Gambit/Tactic',
  'When revealed, apply the Gambit or Tactic effect of one card in your Graveyard that can apply now. Leave that card in your Graveyard.',
  'When revealed, apply the Gambit or Tactic effect of one card in your Graveyard that can apply now.'
);

replaceText(
  'Heresy',
  'Gambit/Tactic',
  "You may spend 4 Conviction to apply the Gambit or Tactic effect of one card in the opponent's Graveyard that can apply now. Leave that card in the opponent's Graveyard.",
  "You may spend 4 Conviction to apply the Gambit or Tactic effect of one card in the opponent's Graveyard that can apply now."
);

replaceText(
  'Rend the Veil',
  'Asset',
  'After Tactics are revealed, you may discard this card to apply the Tactic effect of one card in your Graveyard that can apply now. Leave that card in your Graveyard.',
  'After Tactics are revealed, you may discard this card to apply the Tactic effect of one card in your Graveyard that can apply now.'
);

const playerFacing = (candidate.cards ?? [])
  .flatMap((card) => (card.effects ?? []).flatMap((effect) => [effect.label, effect.text]))
  .join('\n');

for (const [pattern, description] of [
  [/\bLeave (?:that|the|chosen) card in (?:your|the opponent's|its owner's) (?:Graveyard|Discard Pile)\b/i, 'redundant copied-effect source-zone instruction'],
  [/as though you (?:played|controlled) it/i, 'obsolete copied-effect as-though instruction'],
  [/Gambit\/Tactic effect/, 'slash heading used as a prose effect category']
]) {
  if (pattern.test(playerFacing)) {
    throw new Error(`Final artifact audit failed: ${description} (${pattern}).`);
  }
}

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  generated_artifact_audit: {
    copied_effect_source_zone_redundancy_removed: 3,
    source_card_state_inherited_from_shared_rule: true
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log('Applied final generated-artifact cleanup to copied-effect source-zone wording.');

function replaceText(cardName, label, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}.`);
  if (effect.text !== from) throw new Error(`Unexpected current text on ${cardName} ${label}.`);
  effect.text = to;
}
