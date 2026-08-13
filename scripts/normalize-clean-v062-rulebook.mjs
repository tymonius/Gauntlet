import fs from 'node:fs';

const path = 'artifacts/reconstruction/clean-v0.6.2/rulebook/Gauntlet_v0.6.2_Rulebook.md';
let text = fs.readFileSync(path, 'utf8');

text = text
  .replaceAll('Do not create immediate or additional Action Opportunities or Action Windows.', 'Do not create additional Action phases or implicit same-phase Action permissions.')
  .replaceAll('Do not create immediate or additional Action phases or Action Windows.', 'Do not create additional Action phases or implicit same-phase Action permissions.')
  .replaceAll('Action Windows', 'Action phases')
  .replaceAll('Action Window', 'Action phase');

fs.writeFileSync(path, text);
console.log('Normalized clean v0.6.2 Rulebook teaching vocabulary.');
