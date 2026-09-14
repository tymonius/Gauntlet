import fs from 'node:fs';

const legacy = fs.readFileSync('rulebook/player-facing/current-rulebook.md', 'utf8');
const contract = JSON.parse(fs.readFileSync('config/rules-surface-contract.json', 'utf8'));

const topLevelHeadings = legacy
  .split(/\r?\n/)
  .map((line) => line.match(/^# (.+)$/)?.[1])
  .filter(Boolean);

const numberedChapters = topLevelHeadings.filter((heading) => /^\d+\./.test(heading));
const structuralHeadings = topLevelHeadings.filter((heading) => !/^\d+\./.test(heading));
const registryIds = contract.ruleRegistry.map((entry) => entry.id);

console.log(JSON.stringify({
  topLevelHeadings,
  numberedChapters,
  structuralHeadings,
  registryIds,
  surfaces: contract.surfaces,
}, null, 2));
