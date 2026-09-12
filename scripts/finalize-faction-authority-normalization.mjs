import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authorityPath = path.join(root, 'game-data/current-game.json');
const contractPath = path.join(root, 'config/rules-surface-contract.json');

const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const factionIds = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

// Faction Features are taxonomy/profile metadata. Exact procedures live once in their
// canonical gameplay.faction_rules block (or the dedicated Mystics/Proposal corpora).
for (const factionId of factionIds) {
  for (const feature of authority.factionFeatures?.[factionId] || []) {
    delete feature.text;
    delete feature.rules;
  }
}

// Military had one legacy shorthand rule that no longer matched the canonical Leader
// wording. Normalize it to the current Fortify text and expose the shared Orders procedure
// in the faction rules block instead of duplicating it on factionFeatures.
authority.gameplay.faction_rules.military.orders = 'Orders are the Military Faction Feature. The chosen Leader supplies that player’s available Orders as Leader Abilities. Spend the listed Command and resolve the Order at its stated timing without spending an Action.';
authority.gameplay.faction_rules.military.fortify = 'During the Aftermath of a battle you won while occupying an enemy-controlled Territory, spend 2 Command to capture the Territory you occupy, if able.';

// Mystics already have a dedicated canonical Rite corpus. Keep lifecycle rules there only.
delete authority.gameplay.faction_rules.mystics.rite_lifecycle;
delete authority.mystics.generalRules?.normalization;

// Each faction feature registry entry must fingerprint both the profile metadata and the
// canonical faction procedure block. Dedicated Proposal/Rite corpora remain separate IDs.
for (const factionId of factionIds) {
  const registry = contract.ruleRegistry?.find(entry => entry.id === `faction.${factionId}.features`);
  if (!registry) throw new Error(`Missing registry entry faction.${factionId}.features`);
  registry.sources = [
    {
      path: ['factionFeatures', factionId],
      optional: true,
    },
    {
      path: ['gameplay', 'faction_rules', factionId],
    },
  ];
}

fs.writeFileSync(authorityPath, `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
console.log('Finalized single-source faction authority and registry dependencies.');
