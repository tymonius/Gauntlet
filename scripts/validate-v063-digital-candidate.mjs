import { readFileSync } from 'node:fs';

const canonical = JSON.parse(readFileSync('v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json', 'utf8'));
const contentAdapter = readFileSync('src/content/v063.ts', 'utf8');
const rules = readFileSync('src/v063/rules.ts', 'utf8');
const cards = readFileSync('src/v063/cards.ts', 'utf8');
const rulesTests = readFileSync('src/v063/rules.test.ts', 'utf8');
const cardTests = readFileSync('src/v063/cards.test.ts', 'utf8');

assert(canonical.version === 'v0.6.3-candidate', 'Digital candidate must consume the integrated v0.6.3 candidate.');
assert(canonical.cards?.length === 128, 'Digital candidate must consume all 128 cards.');
assert(canonical.territories?.length === 25, 'Digital candidate must consume all 25 Territories.');
assert(canonical.deck_construction?.opening_draw === 4, 'Opening draw must be four.');
assert(canonical.deck_construction?.opening_discard === 1, 'Opening selection must discard one.');
assert(canonical.deck_construction?.opening_hand === 3, 'Opening Hand must contain three cards.');
assert(canonical.deck_construction?.territory_arrangement_after_opening_selection === true, 'Territory arrangement must follow opening selection.');
assert(canonical.deck_construction?.first_player_after_territory_arrangement === true, 'Initiative must follow Territory arrangement.');
assert(canonical.battlefield?.last_stand?.final_territory_control_required === false, 'Last Stand must not require prior final-Territory control.');
assert(canonical.battlefield?.last_stand?.final_territory_capture_required === false, 'Last Stand must not require prior final-Territory capture.');
assert(canonical.battlefield?.last_stand?.separate_movement_sequence_required === true, 'Last Stand must require a separate movement sequence.');

const secondLine = canonical.cards.find((card) => card.id === 'neutral-reserves');
assert(secondLine?.name === 'Second Line', 'neutral-reserves must resolve to Second Line.');
const smugglersRun = canonical.territories.find((territory) => territory.id === 'territory-smuggler-s-pass');
assert(smugglersRun?.name === "Smuggler's Run", "territory-smuggler-s-pass must resolve to Smuggler's Run.");
const marginLoan = canonical.cards.find((card) => card.id === 'financiers-margin-loan');
const marginLoanAsset = marginLoan?.effects?.find((effect) => effect.label === 'Asset')?.text ?? '';
assert(marginLoanAsset.includes('While this remains banked, you may not draw at the start of your turn.'), 'Persistent Margin Loan draw restriction is missing.');

for (const marker of [
  'resolveOpeningSelection',
  'arrangeOpeningTerritories',
  'placeStartingTokens',
  'applyV063Capture',
  'victoryFromFinalTerritoryCapture',
  'victoryFromLastStand',
  'canInitiateLastStand',
  'beginEffectGrantedMovement',
]) {
  assert(rules.includes(marker), `Digital rules candidate is missing ${marker}.`);
  assert(rulesTests.includes(marker), `Digital rules tests do not exercise ${marker}.`);
}

for (const marker of [
  'hasInherentBankAction',
  'actionCostForDirectCardProcedure',
  'additionalTacticPermission',
  'defaultBoundCardDestinationWhenBindingEnds',
  'orderRevealStageEffects',
  'bankMarginLoan',
  'resolveMarginLoanAfterIncome',
  'removeMarginLoan',
  'resolveStartTurnDraw',
]) {
  assert(cards.includes(marker), `Digital card candidate is missing ${marker}.`);
  assert(cardTests.includes(marker), `Digital card tests do not exercise ${marker}.`);
}

assert(contentAdapter.includes("'v0.6.3-candidate'"), 'v0.6.3 content adapter is not version-locked.');
assert(rules.includes("export * from '../v062/rules';"), 'v0.6.3 rules must inherit the isolated v0.6.2 shared core rather than rewriting it in place.');
assert(cards.includes("export * from '../v062/cards';"), 'v0.6.3 cards must inherit the isolated v0.6.2 card core rather than rewriting it in place.');

console.log('v0.6.3 digital candidate validation passed: setup, victory, movement, shared card procedures, title migrations, and persistent Margin Loan are executable and regression-tested.');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
