import { readFile, writeFile } from 'node:fs/promises';
import {
  loadCurrentGameAuthority,
} from './current-game-authority.mjs';
import {
  fingerprintRuleDependencies,
} from '../rulebook/publication/rule-dependencies.mjs';

const contractPath = 'config/rules-surface-contract.json';
const sourcesPath = 'config/rules-publication-sources.json';
const validatorPath = 'scripts/validate-rules-publication-contract.mjs';

const sectionDependencies = {
  military: {
    meet: ['faction.military.definition', 'faction.military.features', 'core.battlefield.victory'],
    changes: ['faction.military.features', 'core.battlefield.victory'],
    components: ['faction.military.definition', 'faction.military.features', 'core.components'],
    resource: ['faction.military.features'],
    features: ['faction.military.features', 'core.turn.actions', 'core.battle.withdrawal-procedure'],
    victory: ['faction.military.features', 'core.battlefield.victory', 'core.battlefield.last-stand', 'core.battlefield.capture', 'core.battlefield.front-line', 'core.battlefield.counterattack'],
    leaders: ['faction.military.features', 'core.battlefield.movement', 'core.battle.movement-initiation', 'core.battle.aftermath', 'core.battle.retreat', 'core.battlefield.occupation', 'core.battlefield.capture', 'core.battlefield.front-line'],
    together: ['faction.military.features', 'core.battle.aftermath', 'core.battle.retreat'],
    'first-game': ['faction.military.features', 'core.battlefield.counterattack', 'core.turn.actions'],
    reference: [],
  },
  diplomats: {
    meet: ['faction.diplomats.definition', 'faction.diplomats.features', 'faction.diplomats.proposals', 'core.battle.onset', 'core.battlefield.victory'],
    changes: ['faction.diplomats.features', 'faction.diplomats.proposals', 'core.battle.onset', 'core.battle.battle-total', 'core.turn.actions'],
    components: ['faction.diplomats.definition', 'faction.diplomats.features', 'faction.diplomats.proposals', 'core.components'],
    resource: ['faction.diplomats.features', 'faction.diplomats.proposals', 'core.battle.battle-total'],
    features: ['faction.diplomats.features', 'faction.diplomats.proposals', 'core.battle.onset', 'core.battle.gambit-count', 'core.battle.aftermath'],
    victory: ['faction.diplomats.features', 'faction.diplomats.proposals', 'core.battlefield.victory', 'core.battlefield.last-stand', 'core.turn.sequence'],
    leaders: ['faction.diplomats.features'],
    together: ['faction.diplomats.features', 'faction.diplomats.proposals', 'core.battle.battle-total'],
    'first-game': ['faction.diplomats.features', 'faction.diplomats.proposals', 'core.battlefield.victory', 'core.turn.sequence'],
    reference: [],
  },
  financiers: {
    meet: ['faction.financiers.definition', 'faction.financiers.features', 'core.battlefield.victory'],
    changes: ['faction.financiers.features', 'core.turn.actions', 'core.turn.cleanup'],
    components: ['faction.financiers.definition', 'faction.financiers.features', 'core.components'],
    resource: ['faction.financiers.features', 'core.turn.actions', 'core.turn.cleanup', 'core.battlefield.capture'],
    features: ['faction.financiers.features', 'core.turn.actions', 'core.card-zones', 'core.battlefield.occupation', 'core.battlefield.capture', 'core.battlefield.front-line', 'core.battle.battle-total'],
    victory: ['faction.financiers.features', 'core.battlefield.victory', 'core.battlefield.last-stand'],
    leaders: ['faction.financiers.features', 'core.battlefield.occupation', 'core.battlefield.capture', 'core.battlefield.front-line'],
    together: ['faction.financiers.features', 'core.battlefield.capture', 'core.battlefield.occupation', 'core.turn.actions'],
    'first-game': ['faction.financiers.features', 'core.turn.actions', 'core.turn.cleanup', 'core.battlefield.occupation'],
    reference: [],
  },
  intelligence: {
    meet: ['faction.intelligence.definition', 'faction.intelligence.features', 'core.battlefield.victory'],
    changes: ['faction.intelligence.features', 'core.turn.actions', 'core.battle.commitment-order'],
    components: ['faction.intelligence.definition', 'faction.intelligence.features', 'core.components'],
    resource: ['faction.intelligence.features', 'core.turn.actions', 'core.turn.sequence'],
    features: ['faction.intelligence.features', 'core.turn.actions', 'core.battle.commitment-order', 'core.battle.gambit-count', 'core.battle.tactic-count', 'core.battle.reserve', 'core.cards.reveal', 'core.cards.replacement', 'core.cards.revising-choice'],
    victory: ['faction.intelligence.features', 'core.battlefield.victory', 'core.battlefield.last-stand', 'core.turn.actions'],
    leaders: ['faction.intelligence.features'],
    together: ['faction.intelligence.features', 'core.turn.actions', 'core.turn.sequence'],
    'first-game': ['faction.intelligence.features', 'core.turn.actions', 'core.battle.commitment-order'],
    reference: [],
  },
  mystics: {
    meet: ['faction.mystics.definition', 'faction.mystics.features', 'faction.mystics.rites', 'core.battlefield.victory'],
    changes: ['faction.mystics.features', 'faction.mystics.rites', 'core.card-zones'],
    components: ['faction.mystics.definition', 'faction.mystics.features', 'faction.mystics.rites', 'core.components', 'core.card-zones'],
    resource: ['faction.mystics.features', 'faction.mystics.rites', 'core.card-zones', 'core.battle.battle-total'],
    features: ['faction.mystics.features', 'faction.mystics.rites', 'core.card-zones', 'core.cards.bind', 'core.cards.assets', 'core.cards.overlay', 'core.battle.advantage-disadvantage', 'core.battle.retreat', 'core.battlefield.occupation', 'core.battlefield.capture'],
    victory: ['faction.mystics.features', 'faction.mystics.rites', 'core.battlefield.victory', 'core.battlefield.last-stand', 'core.card-zones', 'core.cards.bind', 'core.battle.withdrawal-procedure'],
    leaders: ['faction.mystics.features', 'faction.mystics.rites', 'core.card-zones', 'core.battle.aftermath'],
    together: ['faction.mystics.features', 'faction.mystics.rites', 'core.card-zones', 'core.cards.bind', 'core.battle.battle-total'],
    'first-game': ['faction.mystics.features', 'faction.mystics.rites', 'core.card-zones', 'core.cards.bind', 'core.battle.battle-total'],
    reference: [],
  },
  inquisition: {
    meet: ['faction.inquisition.definition', 'faction.inquisition.features', 'core.battlefield.victory', 'core.card-zones'],
    changes: ['faction.inquisition.features', 'core.turn.actions', 'core.turn.draw', 'core.battle.aftermath', 'core.card-zones'],
    components: ['faction.inquisition.definition', 'faction.inquisition.features', 'core.components'],
    resource: ['faction.inquisition.features', 'core.battle.aftermath', 'core.card-zones', 'core.cards.reveal'],
    features: ['faction.inquisition.features', 'core.battle.aftermath', 'core.card-zones', 'core.turn.actions', 'core.turn.draw', 'core.cards.assets'],
    victory: ['faction.inquisition.features', 'core.battlefield.victory', 'core.battlefield.last-stand', 'core.turn.draw', 'core.card-zones'],
    leaders: ['faction.inquisition.features', 'core.battle.aftermath', 'core.turn.cleanup', 'core.battlefield.movement', 'core.battle.movement-initiation', 'core.turn.sequence', 'core.battle.onset', 'core.battle.withdrawal-procedure'],
    together: ['faction.inquisition.features', 'core.battle.aftermath', 'core.cards.reveal', 'core.card-zones'],
    'first-game': ['faction.inquisition.features', 'core.battle.aftermath', 'core.turn.actions', 'core.turn.draw', 'core.card-zones'],
    reference: [],
  },
};

const [contractText, sourcesText, validatorText, authority] = await Promise.all([
  readFile(contractPath, 'utf8'),
  readFile(sourcesPath, 'utf8'),
  readFile(validatorPath, 'utf8'),
  loadCurrentGameAuthority(),
]);

const contract = JSON.parse(contractText);
const sources = JSON.parse(sourcesText);
const registryById = new Map((contract.ruleRegistry || []).map(rule => [rule.id, rule]));
const templateSections = contract?.publicationArchitecture?.factionGuideTemplate?.sections || [];
const templateIds = templateSections.map(section => section.id);

if (!templateIds.length) throw new Error('Faction Guide template has no sections.');
if (new Set(templateIds).size !== templateIds.length) throw new Error('Faction Guide template contains duplicate section ids.');

sources.surfaces['faction-guide-template'].editorialSections = ['reference'];

for (const faction of contract.factions || []) {
  const mapping = sectionDependencies[faction.id];
  if (!mapping) throw new Error(`Missing section dependency mapping for ${faction.id}.`);
  if (JSON.stringify(Object.keys(mapping).sort()) !== JSON.stringify([...templateIds].sort())) {
    throw new Error(`Section dependency mapping for ${faction.id} does not match the template.`);
  }

  faction.status = 'active';
  faction.sections = templateSections.map(templateSection => {
    const dependsOn = mapping[templateSection.id];
    for (const dependency of dependsOn) {
      if (!registryById.has(dependency)) throw new Error(`${faction.id}/${templateSection.id} references unknown rule ${dependency}.`);
      if (dependency.startsWith('faction.') && !dependency.startsWith(`faction.${faction.id}.`)) {
        throw new Error(`${faction.id}/${templateSection.id} references another faction rule ${dependency}.`);
      }
    }

    const section = {
      id: templateSection.id,
      title: templateSection.title,
      dependsOn,
    };
    if (templateSection.id !== 'reference') {
      section.reviewFingerprint = fingerprintRuleDependencies(authority, registryById, dependsOn);
    }
    return section;
  });
}

const oldValidatorBlock = `const factionTemplate = contract?.publicationArchitecture?.factionGuideTemplate;\nif (!factionTemplate || factionTemplate.kind !== 'teaching' || factionTemplate.dependencyMode !== 'reviewedTeaching') {\n  fail(errors, 'Faction Guide template must be a reviewedTeaching teaching surface.');\n}\n\nfor (const faction of contract.factions || []) {\n  validateDependencies(errors, registryById, faction.dependsOn, \`Faction Guide \${faction.id}\`);\n  for (const dependency of faction.dependsOn || []) {\n    if (dependency.startsWith('faction.') && !dependency.startsWith(\`faction.\${faction.id}.\`)) {\n      fail(\n        errors,\n        \`Faction Guide \${faction.id} may not depend on another faction's operating rules (\${dependency}).\`,\n      );\n    }\n  }\n  if (faction.status === 'active' && !Array.isArray(faction.sections)) {\n    fail(errors, \`Active Faction Guide \${faction.id} must declare its authored sections and review fingerprints.\`);\n  }\n  for (const section of faction.sections || []) {\n    validateReviewedSection(\n      errors,\n      authority,\n      registryById,\n      section,\n      \`Faction Guide \${faction.id} / \${section.id}\`,\n      faction.status === 'active',\n    );\n  }\n}\n`;

const newValidatorBlock = `const factionTemplate = contract?.publicationArchitecture?.factionGuideTemplate;\nif (!factionTemplate || factionTemplate.kind !== 'teaching' || factionTemplate.dependencyMode !== 'reviewedTeaching') {\n  fail(errors, 'Faction Guide template must be a reviewedTeaching teaching surface.');\n}\n\nconst factionTemplateIds = (factionTemplate?.sections || []).map(section => section.id);\nconst factionTemplateIdSet = new Set(factionTemplateIds);\nif (factionTemplateIdSet.size !== factionTemplateIds.length) {\n  fail(errors, 'Faction Guide template contains duplicate section ids.');\n}\nconst factionEditorialIds = sources?.surfaces?.['faction-guide-template']?.editorialSections || [];\nconst factionEditorialSections = new Set(factionEditorialIds);\nif (factionEditorialSections.size !== factionEditorialIds.length) {\n  fail(errors, 'Faction Guide template editorialSections contains duplicate section ids.');\n}\nfor (const id of factionEditorialSections) {\n  if (!factionTemplateIdSet.has(id)) {\n    fail(errors, \`Faction Guide template editorialSections references unknown section \${id}.\`);\n  }\n}\n\nfor (const faction of contract.factions || []) {\n  validateDependencies(errors, registryById, faction.dependsOn, \`Faction Guide \${faction.id}\`);\n  for (const dependency of faction.dependsOn || []) {\n    if (dependency.startsWith('faction.') && !dependency.startsWith(\`faction.\${faction.id}.\`)) {\n      fail(\n        errors,\n        \`Faction Guide \${faction.id} may not depend on another faction's operating rules (\${dependency}).\`,\n      );\n    }\n  }\n\n  if (faction.status === 'active' && !Array.isArray(faction.sections)) {\n    fail(errors, \`Active Faction Guide \${faction.id} must declare its authored sections and review fingerprints.\`);\n  }\n\n  if (Array.isArray(faction.sections)) {\n    const sectionIds = faction.sections.map(section => section.id);\n    if (new Set(sectionIds).size !== sectionIds.length) {\n      fail(errors, \`Faction Guide \${faction.id} contains duplicate section ids.\`);\n    }\n    if (JSON.stringify(exactSet(sectionIds)) !== JSON.stringify(exactSet(factionTemplateIds))) {\n      fail(errors, \`Faction Guide \${faction.id} authored sections do not match the Faction Guide template.\`);\n    }\n  }\n\n  for (const section of faction.sections || []) {\n    validateReviewedSection(\n      errors,\n      authority,\n      registryById,\n      section,\n      \`Faction Guide \${faction.id} / \${section.id}\`,\n      faction.status === 'active',\n      factionEditorialSections.has(section.id),\n    );\n    for (const dependency of section.dependsOn || []) {\n      if (dependency.startsWith('faction.') && !dependency.startsWith(\`faction.\${faction.id}.\`)) {\n        fail(\n          errors,\n          \`Faction Guide \${faction.id} / \${section.id} may not depend on another faction's operating rules (\${dependency}).\`,\n        );\n      }\n    }\n  }\n}\n`;

if (!validatorText.includes(oldValidatorBlock)) {
  throw new Error('Expected Faction Guide validator block was not found.');
}
const nextValidator = validatorText.replace(oldValidatorBlock, newValidatorBlock);

await Promise.all([
  writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8'),
  writeFile(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`, 'utf8'),
  writeFile(validatorPath, nextValidator, 'utf8'),
]);
