import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));

// Copied-effect source cards stay in their zones by shared rule unless an
// effect expressly gives them another destination.
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

// Asset already means a banked card. Retain the explicit phrase only on the
// finalized Manifest Destiny text, where #405 is authoritative until reopened.
replaceText(
  'Illegal Occupation',
  'Asset',
  'While the opponent occupies a Territory you control, their banked Assets are inactive.',
  'While the opponent occupies a Territory you control, their Assets are inactive.'
);
replaceText(
  'Illegal Occupation',
  'Gambit/Tactic',
  'Counterattack — their banked Assets are inactive during this battle; gain Advantage.',
  'Counterattack — their Assets are inactive during this battle; gain Advantage.'
);
replaceText(
  'Palisade Wall',
  'Asset',
  "During Onset while you are the defender, you may discard this card to make the opponent's banked Assets inactive during that battle.",
  "During Onset while you are the defender, you may discard this card to make the opponent's Assets inactive during that battle."
);
replaceText(
  'Sequestration',
  'Gambit/Tactic',
  'All banked Assets are inactive during this battle.',
  'All Assets are inactive during this battle.'
);
replaceText(
  'Subversion',
  'Asset',
  "When an opposing banked Asset's effect would apply, you may put this card in your Graveyard to negate that effect and put the opposing Asset in its owner's Discard Pile if it remains in play.",
  "When an opposing Asset's effect would apply, you may put this card in your Graveyard to negate that effect and put the opposing Asset in its owner's Discard Pile if it remains in play."
);
replaceText(
  'Subversion',
  'Gambit/Tactic',
  'Opposing banked Assets cannot be used during this battle.',
  'Opposing Assets cannot be used during this battle.'
);
replaceText(
  'Subversion',
  'Mission',
  'Complete after you win a battle in which the opponent used a banked Asset and you used none of your banked Assets.',
  'Complete after you win a battle in which the opponent used an Asset and you used none of your Assets.'
);

// Advantage and Disadvantage are capitalized defined terms everywhere on card
// faces, including sentence-initial and non-"gain" constructions.
replaceText(
  'Black Covenant',
  'Tactic',
  'Gain advantage. +1 Tactic from Hand. In the Aftermath, put this card and that card in your Graveyard.',
  'Gain Advantage. +1 Tactic from Hand. In the Aftermath, put this card and that card in your Graveyard.'
);
replaceText(
  'Fealty',
  'Asset',
  'Opposing card effects cannot give you disadvantage.',
  'Opposing card effects cannot give you Disadvantage.'
);
replaceText(
  'Fealty',
  'Gambit/Tactic',
  'Ignore one disadvantage affecting you during this battle. If you have no disadvantage, +1 Battle Total instead.',
  'Ignore one Disadvantage affecting you during this battle. If you have no Disadvantage, +1 Battle Total instead.'
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

for (const card of candidate.cards ?? []) {
  for (const effect of card.effects ?? []) {
    for (const match of effect.text.matchAll(/\b(?:advantage|disadvantage)\b/gi)) {
      if (match[0] !== 'Advantage' && match[0] !== 'Disadvantage') {
        throw new Error(`Improper Advantage/Disadvantage capitalization on ${card.name} ${effect.label}: ${match[0]}.`);
      }
    }
  }
}

const remainingBankedAssetUses = [];
for (const card of candidate.cards ?? []) {
  for (const effect of card.effects ?? []) {
    if (/\bbanked Assets?\b/.test(effect.text)) remainingBankedAssetUses.push(`${card.name} ${effect.label}`);
  }
}
if (remainingBankedAssetUses.length !== 1 || remainingBankedAssetUses[0] !== 'Manifest Destiny Action') {
  throw new Error(`Unexpected banked Asset wording remains: ${remainingBankedAssetUses.join(', ') || 'none'}.`);
}

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  generated_artifact_audit: {
    copied_effect_source_zone_redundancy_removed: 3,
    redundant_banked_asset_uses_removed: 7,
    advantage_capitalization_residuals_removed: 3,
    source_card_state_inherited_from_shared_rule: true,
    finalized_manifest_destiny_exception_preserved: true
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log('Applied final generated-artifact cleanup to copied-effect, Asset, and Advantage wording.');

function replaceText(cardName, label, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}.`);
  if (effect.text !== from) throw new Error(`Unexpected current text on ${cardName} ${label}.`);
  effect.text = to;
}
