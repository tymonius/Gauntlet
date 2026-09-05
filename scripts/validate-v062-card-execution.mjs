import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildV062CanonicalData,
} from '../v0.6.2/data/canonical-data.js';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  console.error(`v0.6.2 card execution validation failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const cardsSource = read('legacy/digital-engine-migration/v0.6.2/cards.ts');
const cardsTests = read('legacy/digital-engine-migration/v0.6.2/cards.test.ts');
const factionsSource = read('legacy/digital-engine-migration/v0.6.2/factions.ts');
const factionsTests = read('legacy/digital-engine-migration/v0.6.2/factions.test.ts');
const packageJson = JSON.parse(read('package.json'));
const baseData = JSON.parse(read('releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json'));
const data = buildV062CanonicalData(baseData);

const cards = [
  ['Invasion', ['activateInvasionAction', 'applyInvasionBattleMode']],
  ['Landslide', ['placeLandslide', 'placeLandslideAfterBattle', 'resolveLandslideRetreatChain']],
  ['Détente', ['bankDetente', 'resolveDetenteAcceptance']],
  ['Compound Interest', ['resolveCompoundInterest']],
  ['Extraordinary Rendition', ['bankExtraordinaryRendition', 'extraordinaryRenditionDiscardOrder', 'releaseExtraordinaryRendition']],
  ["Nature's Altar", ['placeNaturesAltarByAction', 'placeNaturesAltarAfterBattle', 'canBeginRiteFromNaturesAltar', 'canCompleteAltarRiteThisTurn']],
  ['Martyrdom', ['resolveMartyrdom']],
];

for (const [cardName, functions] of cards) {
  assert(data.cards.some((card) => card.name === cardName), `canonical data is missing ${cardName}`);
  assert(cardsTests.includes(`describe('${cardName}'`) || cardsTests.includes(`describe("${cardName}"`), `card tests do not identify ${cardName}`);
  for (const functionName of functions) {
    assert(cardsSource.includes(`function ${functionName}`), `${cardName} has no executable ${functionName}`);
    assert(cardsTests.includes(`${functionName}(`), `${functionName} has no direct regression call`);
  }
}

assert(cardsSource.includes('while (overlays[position])'), 'Landslide does not support chained Overlays');
assert(cardsSource.includes("input.destination !== 'treasury' && input.destination !== 'discard'"), 'Compound Interest does not force a revealed destination');
assert(cardsSource.includes("name === 'Extraordinary Rendition'"), 'Extraordinary Rendition does not receive first-discard priority');
assert(cardsSource.includes("controlsTerritory(frontLine, input.player, overlay.territoryIndex)"), "Nature's Altar does not check control at completion timing");
assert(cardsSource.includes("battleResult: 'loss'"), 'Martyrdom does not preserve the loss result');

for (const functionName of [
  'canUseFactionAction',
  'evaluateFinancialCapacity',
  'recordFinancialCapacityAction',
  'financialCapacityRequirementSatisfied',
  'canGuardCurrentProgress',
  'usePurgeFactionAction',
  'useFinalJudgmentPurge',
]) {
  assert(factionsSource.includes(`function ${functionName}`), `faction systems have no executable ${functionName}`);
  assert(factionsTests.includes(`${functionName}(`), `${functionName} has no direct regression call`);
}

assert(factionsSource.includes('FINANCIER_STARTING_CAPITAL = 2'), 'Financier starting Capital is not 2');
assert(factionsSource.includes("place_treasury: ['denouement']"), 'Financier Faction Actions are not Denouement procedures');
assert(factionsSource.includes("intelligence_operation: ['denouement']"), 'Intelligence Faction Actions are not Denouement procedures');
assert(factionsSource.includes("begin_rite: ['denouement']"), 'Begin a Rite is not a normal Denouement Faction Action');
assert(!factionsSource.includes("begin_rite: ['opening']"), "Nature's Altar exception leaked into the default Begin a Rite timing");
assert(factionsSource.includes("purge: ['opening', 'denouement']"), 'Purge does not have adopted two-phase permission');
assert(factionsSource.includes('first_rite: 1') && factionsSource.includes('ritual: 4'), 'Guardians scaling is not 1/2/3/4');
assert(factionsSource.includes('consumesAction: false'), 'Final Judgment Purge is not represented as a no-Action ability');

assert(packageJson.scripts?.['test:v062-card-execution'] === 'node scripts/validate-v062-card-execution.mjs', 'missing dedicated card execution test script');
assert(String(packageJson.scripts?.test || '').includes('validate-v062-card-execution.mjs'), 'main test chain does not run the card execution gate');

console.log('v0.6.2 card execution validation passed: seven new/migrated cards and adopted faction timing systems are executable.');
