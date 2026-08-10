import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_COMPACT_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_GAMBIT_TACTIC_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Gambit_Tactic_Heading_Density.md';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const before = structuredClone(candidate);
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));
let renamedHeadings = 0;
let proseEffectsChanged = 0;
let rulesNotesChanged = 0;

for (const card of candidate.cards ?? []) {
  for (const effect of card.effects ?? []) {
    if (effect.label === 'Battle') {
      effect.label = 'Gambit/Tactic';
      renamedHeadings += 1;
    }
  }
}

replaceText('Arcane Knowledge', 'Gambit/Tactic',
  'apply the Battle effect of one card in your Graveyard that can apply now',
  'apply the Gambit or Tactic effect of one card in your Graveyard that can apply now');
replaceText('Armistice', 'Gambit/Tactic',
  'Do not apply any remaining Battle effects.',
  'Do not apply any remaining Gambit or Tactic effects.');
replaceText('Contraband', 'Gambit/Tactic',
  'whose Battle effect can apply now',
  'whose Gambit or Tactic effect can apply now');
replaceText('Heresy', 'Gambit/Tactic',
  "apply the Battle effect of one card in the opponent's Graveyard that can apply now",
  "apply the Gambit or Tactic effect of one card in the opponent's Graveyard that can apply now");
replaceText('Rend the Veil', 'Activate',
  'apply the Battle effect of one card in your Graveyard that can apply now',
  'apply the Tactic effect of one card in your Graveyard that can apply now');
replaceText('Rend the Veil', 'Gambit/Tactic',
  'apply the Battle effect of one card in your Graveyard that can apply now',
  'apply the Tactic effect of one card in your Graveyard that can apply now');
replaceText('Reserve Force', 'Action',
  'has a Tactic or Battle effect',
  'has a Tactic effect');
replaceText('Resourcefulness', 'Asset',
  'the Action, Gambit, Tactic, or Battle effect',
  'the Action, Gambit, or Tactic effect');
replaceText('Shock and Awe', 'Asset',
  'apply its Battle effect',
  'apply its Gambit or Tactic effect');
replaceText('Treason', 'Activate',
  'before an opposing Battle effect applies',
  'before an opposing Gambit or Tactic effect applies');
replaceText('Treason', 'Activate',
  'choose one opposing Battle effect that has not taken effect',
  'choose one opposing Gambit or Tactic effect that has not taken effect', false);
replaceText('Treason', 'Gambit/Tactic',
  'choose one opposing Battle effect that has not taken effect',
  'choose one opposing Gambit or Tactic effect that has not taken effect');
replaceText('Witchcraft', 'Activate',
  'with an eligible Battle effect',
  'with an eligible Gambit or Tactic effect');
replaceText('Witchcraft', 'Gambit/Tactic',
  'with an eligible Battle effect',
  'with an eligible Gambit or Tactic effect');

replaceRuleNote('Margin Loan',
  'Withdrawal defaults on the Battle effect because you did not win.',
  'Withdrawal defaults on the Gambit or Tactic effect because you did not win.');
replaceRuleNote('Penance',
  "The Battle effect applies when Penance's Gambit or Tactic is revealed.",
  "The Gambit or Tactic effect applies when Penance's Gambit or Tactic is revealed.");

for (const card of candidate.cards ?? []) syncLegacyEffectFields(card);

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  gambit_tactic_heading: {
    canonical_label: 'Gambit/Tactic',
    rendering: 'Card faces stack the label as Gambit/ over Tactic; the line break is presentation only.',
    prose: 'Use Gambit effect, Tactic effect, or Gambit or Tactic effect as the sentence requires. Never use Gambit/Tactic as a prose effect category.',
    headings_renamed: renamedHeadings,
    prose_effects_changed: proseEffectsChanged,
    rules_notes_changed: rulesNotesChanged
  }
};

validate();
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport());

function replaceText(cardName, label, from, to, countEffect = true) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}`);
  if (!effect.text.includes(from)) throw new Error(`Expected text not found on ${cardName} ${label}: ${from}`);
  effect.text = effect.text.replace(from, to);
  if (countEffect) proseEffectsChanged += 1;
}

function replaceRuleNote(cardName, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const index = (card.rules_notes ?? []).findIndex((note) => note.includes(from));
  if (index < 0) throw new Error(`Expected rules note not found on ${cardName}: ${from}`);
  card.rules_notes[index] = card.rules_notes[index].replace(from, to);
  rulesNotesChanged += 1;
}

function syncLegacyEffectFields(card) {
  const labels = new Map((card.effects ?? []).map((effect) => [String(effect.label), effect.text]));
  const mappings = {
    action: 'Action',
    gambit_tactic: 'Gambit/Tactic',
    gambit: 'Gambit',
    tactic: 'Tactic',
    asset: 'Asset',
    activate: 'Activate',
    use: 'Activate',
    overlay: 'Overlay'
  };
  for (const [key, label] of Object.entries(mappings)) {
    if (labels.has(label)) card[key] = labels.get(label);
    else if (Object.hasOwn(card, key)) delete card[key];
  }
  if (Object.hasOwn(card, 'battle')) delete card.battle;
}

function validate() {
  if (renamedHeadings !== 106) throw new Error(`Expected 106 Battle headings, found ${renamedHeadings}.`);
  if (proseEffectsChanged !== 13) throw new Error(`Expected 13 effects with Battle-effect prose, changed ${proseEffectsChanged}.`);
  if (rulesNotesChanged !== 2) throw new Error(`Expected 2 rules-note terminology changes, found ${rulesNotesChanged}.`);

  const labels = (candidate.cards ?? []).flatMap((card) => (card.effects ?? []).map((effect) => effect.label));
  if (labels.includes('Battle')) throw new Error('A Battle effect heading remains in the v0.6.3 candidate.');
  if (labels.filter((label) => label === 'Gambit/Tactic').length !== 106) {
    throw new Error('Unexpected Gambit/Tactic heading count.');
  }

  const withoutNormalization = structuredClone(candidate);
  delete withoutNormalization.normalization;
  const text = JSON.stringify(withoutNormalization);
  if (/\bBattle effects?\b/.test(text)) throw new Error('Battle effect prose remains in the v0.6.3 candidate.');
  if (/Gambit\/Tactic effect/.test(text)) throw new Error('Gambit/Tactic is being used as a prose effect category.');
  if ((candidate.cards ?? []).some((card) => Object.hasOwn(card, 'battle'))) {
    throw new Error('Legacy battle fields remain in the v0.6.3 candidate.');
  }
}

function words(text) {
  const matches = String(text ?? '').trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}’'\-+]*\b/gu);
  return matches ? matches.length : 0;
}

function cardText(card) {
  return (card.effects ?? []).map((effect) => `${effect.label ?? ''}: ${effect.text ?? ''}`.trim()).join(' ');
}

function buildReport() {
  const beforeById = new Map((before.cards ?? []).map((card) => [card.id, card]));
  const rows = (candidate.cards ?? []).map((card) => {
    const prior = beforeById.get(card.id);
    const beforeText = cardText(prior);
    const afterText = cardText(card);
    return {
      name: card.name,
      allegiance: card.allegiance,
      before_words: words(beforeText),
      after_words: words(afterText),
      before_chars: beforeText.length,
      after_chars: afterText.length
    };
  });

  const totals = rows.reduce((acc, row) => {
    acc.beforeWords += row.before_words;
    acc.afterWords += row.after_words;
    acc.beforeChars += row.before_chars;
    acc.afterChars += row.after_chars;
    return acc;
  }, { beforeWords: 0, afterWords: 0, beforeChars: 0, afterChars: 0 });

  return `${[
    '# Gauntlet v0.6.3 Gambit/Tactic Heading Migration',
    '',
    `**Cards:** ${rows.length}  `,
    `**Battle headings replaced:** ${renamedHeadings}  `,
    `**Effects with prose terminology revised:** ${proseEffectsChanged}  `,
    `**Rules notes revised:** ${rulesNotesChanged}`,
    '',
    '## Convention',
    '',
    '- Canonical effect label: `Gambit/Tactic`.',
    '- Card-face renderer: stack `Gambit/` over `Tactic` within the heading column.',
    '- Prose uses `Gambit effect`, `Tactic effect`, or `Gambit or Tactic effect` as applicable; `Gambit/Tactic effect` is not a prose term.',
    '',
    '## Aggregate density',
    '',
    '| Measure | Before migration | After migration | Change |',
    '|---|---:|---:|---:|',
    `| Words | ${totals.beforeWords} | ${totals.afterWords} | ${totals.afterWords - totals.beforeWords} |`,
    `| Characters | ${totals.beforeChars} | ${totals.afterChars} | ${totals.afterChars - totals.beforeChars} |`,
    ''
  ].join('\n')}\n`;
}

console.log(`Replaced ${renamedHeadings} Battle headings with Gambit/Tactic, revised ${proseEffectsChanged} prose effects, and updated ${rulesNotesChanged} rules notes.`);
