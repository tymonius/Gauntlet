import { readFile, writeFile } from 'node:fs/promises';

const contractPath = 'config/rules-surface-contract.json';
const contract = JSON.parse(await readFile(contractPath, 'utf8'));
const comprehensive = contract?.publicationArchitecture?.comprehensiveRules;

if (!comprehensive) throw new Error('Comprehensive Rules contract is missing.');
if (comprehensive.kind !== 'technical' || comprehensive.dependencyMode !== 'direct') {
  throw new Error('Comprehensive Rules must remain the direct technical surface.');
}
if (comprehensive.status !== 'planned') {
  throw new Error(`Expected Comprehensive Rules status planned; found ${JSON.stringify(comprehensive.status)}.`);
}

comprehensive.status = 'active';
await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
