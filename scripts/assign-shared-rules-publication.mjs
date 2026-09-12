import fs from 'node:fs';
import path from 'node:path';

const contractPath = path.join(process.cwd(), 'config/rules-surface-contract.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const parts = contract.publicationArchitecture?.comprehensiveRules?.parts;
if (!Array.isArray(parts)) throw new Error('Missing Comprehensive Rules parts.');

const assignments = {
  'cards-zones': [
    'core.card-zones',
    'core.cards.assets',
    'core.cards.bind'
  ],
  'battles': [
    'core.battle.reserve',
    'core.battle.withdrawal-procedure',
    'core.cards.no-winner'
  ],
  'effects-timing': [
    'core.cards.choices',
    'core.cards.shorthand',
    'core.cards.repeat'
  ],
  'persistent-shared': [
    'core.cards.becoming-territories'
  ]
};

for (const [partId, ruleIds] of Object.entries(assignments)) {
  const part = parts.find(entry => entry.id === partId);
  if (!part) throw new Error(`Missing Comprehensive Rules part ${partId}.`);
  part.covers ||= [];
  for (const ruleId of ruleIds) {
    if (!part.covers.includes(ruleId)) part.covers.push(ruleId);
  }
}

fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
console.log('Assigned normalized shared rules to direct Comprehensive Rules parts.');
