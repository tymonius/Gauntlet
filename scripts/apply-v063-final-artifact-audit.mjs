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

// Asset is itself the banked-card mode; an Asset section does not need to say
// that its text applies while this card is banked. The ordinary start-of-turn
// draw timing is consistently called the player's normal Draw.
replaceText(
  'Armistice',
  'Asset',
  'While this card is banked, neither player can start a battle. After your normal Draw step at the start of each of your turns, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.',
  'Neither player can start a battle. After your normal Draw, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.'
);
replaceText(
  'Supplies',
  'Asset',
  'After your normal Draw step, you may discard this card for +2 Cards.',
  'After your normal Draw, you may discard this card for +2 Cards.'
);
replaceText(
  'Tariffs',
  'Asset',
  'While Tariffs is banked, skip your normal draw. You cannot bank it while you control another banked Tariffs. You cannot voluntarily cause it to leave play during the turn it is banked.',
  'Skip your normal Draw. You cannot bank it while you control another banked Tariffs. You cannot voluntarily cause it to leave play during the turn it is banked.'
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

// Bound-card cleanup uses the shared Bind default unless a card overrides the
// destination or creates another exceptional resolution.
replaceText(
  'Extraordinary Rendition',
  'Asset',
  "The bound card cannot be played, moved, or affected except by this card. Whenever you discard one or more of your Assets, discard this card before any others, if able. When this card leaves play, put the bound card in its owner's Discard Pile.",
  'The bound card cannot be played, moved, or affected except by this card. Whenever you discard one or more of your Assets, discard this card before any others, if able.'
);

// Withdrawal already ends a battle without a winner. Cards state only their
// exceptional withdrawal trigger and any nondefault positional/destination result.
replaceText(
  'Armistice',
  'Gambit/Tactic',
  "When revealed, if this card is not negated, the attacker withdraws and the battle ends without a winner. Put every other Gambit and Tactic still in battle in its owner's Discard Pile, then put this card in its owner's Graveyard.",
  "When revealed, if this card is not negated, the attacker withdraws. Put every other Gambit and Tactic still in battle in its owner's Discard Pile, then put this card in its owner's Graveyard."
);
replaceText(
  'Safe Conduct',
  'Asset',
  'When you would lose a battle following refused Terms, you may discard this card to withdraw instead. The opponent remains at or takes the contested position. The battle ends without a winner.',
  'When you would lose a battle following refused Terms, you may discard this card to withdraw instead. The opponent remains at or takes the contested position.'
);

const playerFacing = (candidate.cards ?? [])
  .flatMap((card) => (card.effects ?? []).flatMap((effect) => [effect.label, effect.text]))
  .join('\n');

for (const [pattern, description] of [
  [/\bLeave (?:that|the|chosen) card in (?:your|the opponent's|its owner's) (?:Graveyard|Discard Pile)\b/i, 'redundant copied-effect source-zone instruction'],
  [/as though you (?:played|controlled) it/i, 'obsolete copied-effect as-though instruction'],
  [/Gambit\/Tactic effect/, 'slash heading used as a prose effect category'],
  [/When this card leaves play, put the bound card in its owner's Discard Pile\./i, 'redundant shared Bind cleanup'],
  [/\bwithdraws?[^.]*battle ends without a winner\b|\bwithdraw instead\.[^.]*\bThe battle ends without a winner\./i, 'redundant no-winner explanation after withdrawal'],
  [/\bnormal Draw step\b|\bnormal draw\b/, 'inconsistent normal Draw timing language']
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

  const asset = (card.effects ?? []).find((effect) => effect.label === 'Asset');
  if (asset) {
    const redundantLead = new RegExp(`^While (?:this card|${escapeRegex(card.name)}) is banked,\\s*`, 'i');
    if (redundantLead.test(asset.text)) {
      throw new Error(`Redundant banked-card lead remains on ${card.name} Asset.`);
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
    redundant_asset_banked_leads_removed: 2,
    normal_draw_variants_normalized: 3,
    advantage_capitalization_residuals_removed: 3,
    redundant_default_bind_cleanup_removed: 1,
    redundant_withdrawal_no_winner_phrases_removed: 2,
    source_card_state_inherited_from_shared_rule: true,
    finalized_manifest_destiny_exception_preserved: true
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log('Applied final generated-artifact cleanup to copied-effect, Asset, Draw, Advantage, Bind, and withdrawal wording.');

function replaceText(cardName, label, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}.`);
  if (effect.text !== from) throw new Error(`Unexpected current text on ${cardName} ${label}.`);
  effect.text = to;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
