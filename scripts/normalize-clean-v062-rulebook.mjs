import fs from 'node:fs';

const path = 'artifacts/reconstruction/clean-v0.6.2/rulebook/Gauntlet_v0.6.2_Rulebook.md';
let text = fs.readFileSync(path, 'utf8');

text = text
  .replaceAll('Do not create immediate or additional Action Opportunities or Action Windows.', 'Do not create additional Action phases or implicit same-phase Action permissions.')
  .replaceAll('Do not create immediate or additional Action phases or Action Windows.', 'Do not create additional Action phases or implicit same-phase Action permissions.')
  .replaceAll('Action Windows', 'Action phases')
  .replaceAll('Action Window', 'Action phase')
  .replaceAll('Action windows', 'Action phases')
  .replaceAll('Action window', 'Action phase')
  .replaceAll('using the Front Line rules in Section 6.', 'using the Front Line rules in Chapter 8.')
  .replaceAll('Follow the Action rules in Section 2.', 'Follow the Action rules in Chapter 5.')
  .replaceAll('The pending-battle and Terms procedure in Section 4 occurs before the battle reaches Onset.', 'The pending-battle and Terms procedure in Chapter 7 occurs before the battle reaches Onset.')
  .replaceAll('During an Denouement', 'During Denouement')
  .replaceAll('during an Denouement', 'during Denouement');

for (const chapter of ['Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition']) {
  const heading = new RegExp(`(# \\d+\\. ${chapter}\\n\\n)### How it works\\n`);
  text = text.replace(heading, '$1## How it works\n');

  const start = text.search(new RegExp(`^# \\d+\\. ${chapter}$`, 'm'));
  if (start >= 0) {
    const next = text.slice(start + 1).search(/^# \d+\. /m);
    const end = next >= 0 ? start + 1 + next : text.length;
    const segment = text.slice(start, end)
      .replace('### Complete rules\n', '## Complete rules\n')
      .replace('### Faction Actions\n', '## Faction Actions\n');
    text = text.slice(0, start) + segment + text.slice(end);
  }
}

text = text.replace(/(?:\n---\n\s*){2,}/g, '\n---\n\n');

fs.writeFileSync(path, text);
console.log('Normalized clean v0.6.2 Rulebook integration vocabulary, references, and heading hierarchy.');
