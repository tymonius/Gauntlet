import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';
const sourcePath = process.env.V063_POOLWIDE_SOURCE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_POOLWIDE_REPORT
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Poolwide_Refinement_Density.md';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));
const beforeById = new Map((source.cards ?? []).map((card) => [card.id, card]));

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
  'Give Chase',
  'Speculation',
  'Hold the Line',
  'Intercepted Orders',
  "Nature's Altar",
  'Field Command',
  'Counterworks'
];

// Finalization settles a card's bespoke semantic/editorial decision. It does
// not exempt that card from pool-wide conventions adopted later.
replaceText(
  'Manifest Destiny',
  'Action',
  'Put all other cards in your Hand and at least one banked Asset, totaling a minimum of three cards, in your Graveyard. Add this card to your end of the Gauntlet as a blank Territory you control.',
  'Put all other cards in your Hand and at least one Asset, totaling a minimum of three cards, in your Graveyard. Add this card to your end of the Gauntlet as a blank Territory you control.'
);

// Approved targeted bespoke revisions from the final density triage.
// These run after the pool-wide integrity stages so later generic rewrites
// cannot re-expand already-settled card text.
setEffects('Margin Loan', [
  ['Action', 'Bank this card; bind 1 card from your Hand or Treasury to it face up as collateral. Gain Capital equal to its value +2. +1 Action.'],
  ['Asset', "After income on your next turn, choose:\n\nRepay — Pay Capital equal to the collateral's value +3; return it to your Hand and discard this card.\n\nDefault — Put both cards in your Graveyard.\n\nIf this card is Removed, Default."],
  ['Gambit/Tactic', 'Before dice are rolled, you may bind 1 card from your Hand or Treasury to this card face up as collateral to gain Capital equal to its value; you may then Subsidize. In the Aftermath: Win — return collateral to your Hand. Otherwise — put both cards in your Graveyard.']
]);

setEffects('Shock and Awe', [
  ['Asset', 'During Onset when attacking on an enemy-controlled Territory, you may put this card in your Graveyard to apply its Gambit/Tactic effect.'],
  ['Gambit/Tactic', 'When attacking on an enemy-controlled Territory, after Tactics are revealed: +1 Tactic from Hand. Lose — Retreat +1. Win — You cannot otherwise move, advance your Front Line, or use an Order after the following effect: choose one:\n\nBreakthrough — If the opponent can Retreat +1, they do; then you advance one Position.\n\nConsolidate — Advance Front Line 1, if able; Command = 2.\n\nIn the Aftermath, put the extra Tactic and this card in your Graveyard.']
]);

setEffects('Speculation', [
  ['Action', 'Place this card face up beside a Territory you neither control nor occupy. At the start of your next turn, if you occupy or control it, +2 Capital and discard this card; otherwise put it in your Graveyard.'],
  ['Gambit/Tactic', 'If you initiated this battle, you may spend 1 Capital. If you do, in the Aftermath: Win — +2 Capital. Otherwise — put this card in your Graveyard.']
]);

setEffects('Hold the Line', [
  ['Asset', 'During Onset while defending a Territory you control, you may put this card in your Graveyard to apply its Gambit/Tactic effect after Tactics are revealed.'],
  ['Gambit/Tactic', 'If you are defending a Territory you control, after Tactics are revealed, +2 Reserve; +1 Tactic from those cards. If you lose, after you retreat, the attacker captures that Territory. In the Aftermath, put this card in your Graveyard.']
]);

setEffects('Intercepted Orders', [
  ['Asset', 'When the opponent forms their Reserve, before they choose Tactics, you may discard this card to reveal that Reserve and choose 1 card they cannot choose this battle.'],
  ['Gambit/Tactic', "Reveal each opposing face-down Tactic and the opponent's Reserve. Return 1 opposing Tactic to that Reserve; it cannot be chosen again this battle. The opponent may choose 1 eligible replacement from the Reserve."]
]);

setEffects("Nature's Altar", [
  ['Action', 'Place this Overlay on your current Territory or an adjacent Territory.'],
  ['Gambit/Tactic', 'In the Aftermath, if you win, you may place this Overlay on the contested Territory.'],
  ['Overlay', 'During your Opening, while you are here, you may take the Begin a Rite Faction Action. A Rite begun this way may complete this turn if you control this Territory when its completion condition and timing are satisfied.']
]);

setEffects('Field Command', [
  ['Asset', "After you use a 1-Command Order, you may discard this card to use your Leader's other 1-Command Order at its next legal timing this turn without spending Command."],
  ['Gambit/Tactic', "After you use a 1-Command Order during this battle, you may use your Leader's other 1-Command Order once this turn at its next legal timing without spending Command. If you do, put this card in your Graveyard after that Order takes effect."]
]);

setEffects('Counterworks', [
  ['Asset', 'When an opposing effect would place an Overlay on a Territory, you may discard this card to prevent that Overlay. The card that would become that Overlay is discarded.'],
  ['Gambit/Tactic', 'Choose one: one Overlay on the contested Territory is inactive during this battle; or the next opposing Overlay that would be placed there during this battle or its Aftermath is not placed. The card that would become that Overlay is discarded.']
]);

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

    // The slash form is normally a heading, but direct self-reference to that
    // printed heading uses "its Gambit/Tactic effect". Cross-card/general prose
    // continues to use "Gambit or Tactic effect".
    const slashResidual = text.replaceAll('its Gambit/Tactic effect', '');
    if (/Gambit\/Tactic effect/.test(slashResidual)) {
      throw new Error(`Improper Gambit/Tactic prose reference on finalized card ${name} ${effect.label}.`);
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

// This field belonged to the superseded exception logic in the preceding
// artifact-audit stage. The final candidate must not claim that exception was
// preserved after this forward-convention pass removes it.
if (candidate.normalization?.generated_artifact_audit) {
  delete candidate.normalization.generated_artifact_audit.finalized_manifest_destiny_exception_preserved;
}

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  finalized_forward_conventions: {
    finalized_cards_audited: FINALIZED_NAMES.length,
    newly_finalized_cards: 6,
    targeted_bespoke_cards_revised: 7,
    self_heading_reference_convention_updated: true,
    manifest_destiny_asset_wording_updated: true,
    finalized_cards_are_not_exempt_from_later_conventions: true
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport());
console.log(`Applied accepted bespoke revisions and later conventions to ${FINALIZED_NAMES.length} finalized cards.`);

function setEffects(cardName, effects) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}.`);
  card.effects = effects.map(([label, text]) => ({ label, text }));
  delete card.rules_notes;
}

function replaceText(cardName, label, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}.`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}.`);
  if (effect.text !== from) throw new Error(`Unexpected current text on ${cardName} ${label}.`);
  effect.text = to;
}

function words(text) {
  const matches = String(text ?? '').trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}’'\-+]*\b/gu);
  return matches ? matches.length : 0;
}

function cardText(card) {
  return (card.effects ?? []).map((entry) => `${entry.label}: ${entry.text}`).join(' ');
}

function buildReport() {
  const rows = candidate.cards.map((card) => {
    const before = beforeById.get(card.id);
    if (!before) throw new Error(`Source card missing from density comparison: ${card.name}.`);
    const beforeText = cardText(before);
    const afterText = cardText(card);
    return {
      name: card.name,
      allegiance: card.allegiance,
      beforeWords: words(beforeText),
      afterWords: words(afterText),
      beforeChars: beforeText.length,
      afterChars: afterText.length
    };
  });

  const totals = rows.reduce((acc, row) => {
    acc.beforeWords += row.beforeWords;
    acc.afterWords += row.afterWords;
    acc.beforeChars += row.beforeChars;
    acc.afterChars += row.afterChars;
    return acc;
  }, { beforeWords: 0, afterWords: 0, beforeChars: 0, afterChars: 0 });

  const ranked = [...rows].sort((a, b) => b.afterChars - a.afterChars || b.afterWords - a.afterWords || a.name.localeCompare(b.name));

  return `${[
    '# Gauntlet v0.6.3 Final Pool-Wide Refinement',
    '',
    `**Source:** \`${sourcePath}\`  `,
    `**Final candidate:** \`${candidatePath}\`  `,
    `**Cards:** ${rows.length}`,
    `**Finalized bespoke cards:** ${FINALIZED_NAMES.length}`,
    '',
    '## Aggregate density',
    '',
    '| Measure | Before final pool-wide pass | Final candidate | Change |',
    '|---|---:|---:|---:|',
    `| Words | ${totals.beforeWords} | ${totals.afterWords} | ${totals.afterWords - totals.beforeWords} |`,
    `| Characters | ${totals.beforeChars} | ${totals.afterChars} | ${totals.afterChars - totals.beforeChars} |`,
    '',
    '## Densest cards in the final candidate',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ chars |',
    '|---:|---|---|---:|---:|---:|',
    ...ranked.slice(0, 40).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.afterWords} | ${row.afterChars} | ${row.afterChars - row.beforeChars} |`),
    ''
  ].join('\n')}\n`;
}
