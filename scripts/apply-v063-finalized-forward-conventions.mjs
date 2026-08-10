import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));

const FINALIZED_NAMES = [
  'Protracted Siege',
  'Margin Loan',
  'Shock and Awe',
  'Leveraged Buyout',
  'Bombardment',
  'Reserve Force',
  'Fog of War',
  'Demilitarized Zone',
  'Necromancy',
  'Capital Gains',
  'Manifest Destiny',
  'Sleeper Network',
  'Give Chase'
];

// Finalization settles a card's bespoke semantic/editorial decision. It does
// not exempt that card from pool-wide conventions adopted later. Apply any
// convention that postdates an individual finalization before validating the
// canonical #405 tracker.
replaceText(
  'Manifest Destiny',
  'Action',
  'Put all other cards in your Hand and at least one banked Asset, totaling a minimum of three cards, in your Graveyard. Add this card to your end of the Gauntlet as a blank Territory you control.',
  'Put all other cards in your Hand and at least one Asset, totaling a minimum of three cards, in your Graveyard. Add this card to your end of the Gauntlet as a blank Territory you control.'
);

for (const name of FINALIZED_NAMES) {
  const card = byName.get(name);
  if (!card) throw new Error(`Finalized card not found: ${name}.`);

  for (const effect of card.effects ?? []) {
    const text = effect.text;

    for (const [pattern, description] of [
      [/\bbanked Assets?\b/i, 'redundant banked Asset wording'],
      [/\bbattle(?: here)? involving you\b/i, 'redundant 1v1 battle scope'],
      [/\bAsset(?:s)? (?:you|they) control\b/i, 'redundant Asset-control wording'],
      [/\bPlayable Deck\b/, 'retired Playable Deck terminology'],
      [/\bBattle effects?\b/, 'retired Battle-effect prose'],
      [/Gambit\/Tactic effect/, 'slash heading used as a prose effect category'],
      [/as though you (?:played|controlled) it/i, 'obsolete copied-effect boilerplate'],
      [/normal (?:role )?destinations?/i, 'obsolete destination jargon'],
      [/place this card(?: from your Hand)? as an Overlay/i, 'obsolete physical Overlay placement wording'],
      [/\+\d+ Front Line/, 'obsolete Front Line shorthand'],
      [/\bnormal Draw step\b|\bnormal draw\b/, 'inconsistent normal Draw timing language'],
      [/^While (?:this card|[^,]+) is banked,\s*/i, 'redundant Asset banked-state lead'],
      [/if (?:this card|it) is not negated/i, 'redundant non-negated guard'],
      [/When this card leaves play, put the bound card in its owner's Discard Pile\./i, 'redundant default Bind cleanup'],
      [/(?:^|\s)(?:Attacker|Defender|Counterattack|Win|Lose):(?=\s)/m, 'stale colon-form condition prefix'],
      [/\b(?:Opponent|You) (?:win|wins|lose|loses) —/i, 'unpaired subject-prefixed outcome shorthand']
    ]) {
      if (pattern.test(text)) {
        throw new Error(`Later convention not propagated to finalized card ${name} ${effect.label}: ${description} (${pattern}).`);
      }
    }

    if (['Gambit/Tactic', 'Gambit', 'Tactic'].includes(effect.label) && /^When revealed,\s*/i.test(text)) {
      throw new Error(`Redundant default reveal timing remains on finalized card ${name} ${effect.label}.`);
    }

    for (const match of text.matchAll(/\b(?:advantage|disadvantage|position)\b/gi)) {
      const expected = match[0].toLowerCase() === 'position'
        ? 'Position'
        : match[0].toLowerCase() === 'advantage' ? 'Advantage' : 'Disadvantage';
      if (match[0] !== expected) {
        throw new Error(`Defined-term capitalization not propagated to finalized card ${name} ${effect.label}: ${match[0]}.`);
      }
    }
  }

  const labels = (card.effects ?? []).map((effect) => effect.label);
  if (labels.includes('Activate') || labels.includes('Battle')) {
    throw new Error(`Retired effect heading remains on finalized card ${name}.`);
  }
}

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  finalized_forward_conventions: {
    finalized_cards_audited: FINALIZED_NAMES.length,
    manifest_destiny_asset_wording_updated: true,
    finalized_cards_are_not_exempt_from_later_conventions: true
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log(`Applied later pool-wide conventions to ${FINALIZED_NAMES.length} finalized cards and verified forward convention coverage.`);

function replaceText(cardName, label, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}.`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}.`);
  if (effect.text !== from) throw new Error(`Unexpected current text on ${cardName} ${label}.`);
  effect.text = to;
}
