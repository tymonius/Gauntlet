import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'artifacts/reconstruction/clean-v0.6.2/faction-guides');
const targets = [
  'military/Gauntlet_v0.6.2_Military_Faction_Guide.md',
  'diplomat/Gauntlet_v0.6.2_Diplomat_Faction_Guide.md',
  'financier/Gauntlet_v0.6.2_Financier_Faction_Guide.md',
  'intelligence/Gauntlet_v0.6.2_Intelligence_Faction_Guide.md',
  'mystics/Gauntlet_v0.6.2_Mystics_Faction_Guide.md',
  'inquisition/Gauntlet_v0.6.2_Inquisition_Faction_Guide.md'
];

for (const rel of targets) {
  const file = path.join(base, rel);
  let text = fs.readFileSync(file, 'utf8');

  text = text.replace(
    'During an Action Opportunity, spend 1 Action and Conviction to Purge. The first Action spent to Purge each turn grants 1 additional Action that turn. You may spend at most 1 Action on Purge each turn.',
    'During Opening or Denouement, take an Action and spend Conviction to Purge. If one phase Action is Purge, you may also take one Action in the other phase that turn. You may take the Purge Faction Action no more than once per turn.'
  );

  fs.writeFileSync(file, text);
}

console.log('Normalized clean v0.6.2 faction authority teaching language.');
