import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));

const mappings = {
  action: 'Action',
  gambit_tactic: 'Gambit/Tactic',
  gambit: 'Gambit',
  tactic: 'Tactic',
  asset: 'Asset',
  overlay: 'Overlay',
  placement: 'Placement',
  terms: 'Terms',
  accepted: 'Accepted',
  refused: 'Refused',
  mission: 'Mission',
  aftermath: 'Aftermath',
  text: 'Text'
};

let synchronizedFields = 0;

for (const card of candidate.cards ?? []) {
  const effects = new Map((card.effects ?? []).map((entry) => [entry.label, entry.text]));

  for (const [field, label] of Object.entries(mappings)) {
    if (effects.has(label)) {
      if (card[field] !== effects.get(label)) synchronizedFields += 1;
      card[field] = effects.get(label);
    } else if (Object.hasOwn(card, field)) {
      delete card[field];
      synchronizedFields += 1;
    }
  }

  for (const obsolete of ['activate', 'battle', 'use']) {
    if (Object.hasOwn(card, obsolete)) {
      delete card[obsolete];
      synchronizedFields += 1;
    }
  }
}

validate();

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  final_mirror_sync: {
    synchronized_fields: synchronizedFields,
    source_of_truth: 'cards[].effects[]'
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log(`Synchronized ${synchronizedFields} final card compatibility field(s) to effects[].`);

function validate() {
  for (const card of candidate.cards ?? []) {
    const effects = new Map((card.effects ?? []).map((entry) => [entry.label, entry.text]));

    for (const [field, label] of Object.entries(mappings)) {
      if (effects.has(label) && card[field] !== effects.get(label)) {
        throw new Error(`${card.name} ${field} does not match its ${label} effect.`);
      }
      if (!effects.has(label) && Object.hasOwn(card, field)) {
        throw new Error(`${card.name} has stale compatibility field ${field}.`);
      }
    }

    for (const obsolete of ['activate', 'battle', 'use']) {
      if (Object.hasOwn(card, obsolete)) throw new Error(`${card.name} retains obsolete field ${obsolete}.`);
    }
  }
}
