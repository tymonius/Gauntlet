import fs from 'node:fs';

const path = 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const ordinaryRoleHeadings = ['Action', 'Asset', 'Gambit', 'Tactic', 'Gambit/Tactic'];
const presentHeadings = [...new Set(data.cards.flatMap((card) => card.effects.map((effect) => effect.label)))];
const specialOrProceduralHeadings = presentHeadings.filter((label) => !ordinaryRoleHeadings.includes(label));

data.card_rules.effect_headings = {
  ...data.card_rules.effect_headings,
  // Compatibility alias retained for candidate consumers that initially read
  // this field as the ordinary role-heading set.
  supported: ordinaryRoleHeadings,
  ordinary_role_headings: ordinaryRoleHeadings,
  special_or_procedural_headings: specialOrProceduralHeadings,
  all_present_headings: presentHeadings,
};

function applyCanonicalNaming(value) {
  if (Array.isArray(value)) return value.map(applyCanonicalNaming);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, applyCanonicalNaming(child)]));
  }
  return typeof value === 'string'
    ? value.replaceAll('Ritual of Ascendance', 'Ritual of Ascension')
    : value;
}

const finalized = applyCanonicalNaming(data);

fs.writeFileSync(path, JSON.stringify(finalized, null, 2) + '\n', 'utf8');
console.log(`Finalized canonical effect-heading metadata: ${ordinaryRoleHeadings.length} ordinary role headings and ${specialOrProceduralHeadings.length} special/procedural headings.`);
