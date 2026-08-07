import { readFileSync } from 'node:fs';

const sourcePath = process.env.V063_ADVANTAGE_SOURCE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Shorthand_Normalized_Candidate.json';
const candidatePath = process.env.V063_ADVANTAGE_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const rulesPath = process.env.V063_GENERAL_CARD_RULES ?? 'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md';

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const rules = readFileSync(rulesPath, 'utf8');

for (const required of [
  'These are additive instructions, not binary statuses.',
  'Instances from separate cards, Territory effects, faction abilities, and other effects **stack**.',
  'cancel opposing instances one-for-one',
  'There is no fixed stacking cap'
]) {
  if (!rules.includes(required)) throw new Error(`Advantage stacking rule is missing required language: ${required}`);
}

const candidateById = new Map(candidate.cards.map((card) => [card.id, card]));
let checkedEffects = 0;

for (const sourceCard of source.cards) {
  const finalCard = candidateById.get(sourceCard.id);
  if (!finalCard) throw new Error(`Missing final card: ${sourceCard.id}`);
  const finalByLabel = new Map((finalCard.effects ?? []).map((effect) => [effect.label, effect]));

  for (const sourceEffect of sourceCard.effects ?? []) {
    const before = grantUnits(sourceEffect.text, true);
    if (!before.advantage && !before.disadvantage) continue;

    const finalEffect = finalByLabel.get(sourceEffect.label);
    if (!finalEffect) throw new Error(`Missing final ${sourceCard.name} ${sourceEffect.label} effect.`);
    const after = grantUnits(finalEffect.text, false);

    if (before.advantage !== after.advantage || before.disadvantage !== after.disadvantage) {
      throw new Error(
        `${sourceCard.name} ${sourceEffect.label} changed advantage instances: ` +
        `before +${before.advantage}/-${before.disadvantage}, after +${after.advantage}/-${after.disadvantage}.`
      );
    }
    checkedEffects += 1;
  }
}

const insurrection = candidate.cards.find((card) => card.name === 'Insurrection');
const insurrectionBattle = insurrection?.effects?.find((effect) => effect.label === 'Battle')?.text ?? '';
if (!insurrectionBattle.includes('Counterattack — Double Advantage.') || !insurrectionBattle.includes('Otherwise, Attacker — Advantage.')) {
  throw new Error('Insurrection no longer preserves its one-versus-two advantage instances.');
}

if (checkedEffects !== 18) {
  throw new Error(`Expected to verify 18 Advantage/Disadvantage-granting effects, checked ${checkedEffects}. Review the pool before changing this assertion.`);
}

console.log(`Verified stackable Advantage/Disadvantage instance identity across ${checkedEffects} shorthand-converted effects.`);
console.log('Advantage remains additive, cancels Disadvantage one-for-one, and has no fixed stacking cap.');

function grantUnits(text, longForm) {
  let value = String(text ?? '');
  let advantage = 0;
  let disadvantage = 0;

  if (longForm) {
    const doubles = value.match(/\bgain double advantage\b/gi) ?? [];
    advantage += doubles.length * 2;
    value = value.replace(/\bgain double advantage\b/gi, '');
    advantage += (value.match(/\bgain advantage\b/gi) ?? []).length;
    disadvantage += (value.match(/\bgive them disadvantage during this battle\b/gi) ?? []).length;
    disadvantage += (value.match(/\bthe opponent gains disadvantage during this battle\b/gi) ?? []).length;
    return { advantage, disadvantage };
  }

  const doubles = value.match(/\bDouble Advantage\b/g) ?? [];
  advantage += doubles.length * 2;
  value = value.replace(/\bDouble Advantage\b/g, '');
  advantage += (value.match(/\bAdvantage\b/g) ?? []).length;
  disadvantage += (value.match(/\bDisadvantage\b/g) ?? []).length;
  return { advantage, disadvantage };
}
