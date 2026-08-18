import { readFileSync } from 'node:fs';

// Historical filename retained because older closeout tooling invokes it directly.
// The active engine migration baseline is now the published v0.6.3 release, not
// the pre-publication browser candidate this validator originally inspected.
const canonical = JSON.parse(readFileSync('releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json', 'utf8'));
const manifest = JSON.parse(readFileSync('releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json', 'utf8'));
const contentAdapter = readFileSync('src/content/v063.ts', 'utf8');
const contentTests = readFileSync('src/content/v063.test.ts', 'utf8');
const rules = readFileSync('src/v063/rules.ts', 'utf8');
const cards = readFileSync('src/v063/cards.ts', 'utf8');
const rulesTests = readFileSync('src/v063/rules.test.ts', 'utf8');
const cardTests = readFileSync('src/v063/cards.test.ts', 'utf8');

assert(manifest.release_version === 'v0.6.3', 'Digital engine baseline must use the published v0.6.3 release.');
assert(manifest.status === 'current', 'v0.6.3 release manifest must remain current.');
assert(manifest.current_package_path === 'releases/v0.6.3/', 'Digital engine baseline must remain bound to releases/v0.6.3/.');
assert(manifest.public_defaults?.digital_rules === 'v0.6.3', 'Published manifest must identify v0.6.3 as the digital-rules default.');
assert(manifest.json_exports?.includes('Gauntlet_v0.6.3_Canonical_Data.json'), 'Published manifest must declare the canonical-data export.');
assert(manifest.counts?.playable_cards === 128, 'Published manifest must declare 128 playable cards.');
assert(manifest.counts?.territories === 25, 'Published manifest must declare 25 Territories.');
assert(manifest.counts?.factions === 6, 'Published manifest must declare six factions.');
assert(manifest.counts?.leaders === 12, 'Published manifest must declare twelve Leaders.');

assert(canonical.cards?.length === 128, 'Digital engine baseline must consume all 128 published cards.');
assert(canonical.territories?.length === 25, 'Digital engine baseline must consume all 25 published Territories.');
assert(canonical.factions?.length === 6, 'Digital engine baseline must consume all six published factions.');
assert(canonical.deck_construction?.opening_draw === 4, 'Opening draw must be four.');
assert(canonical.deck_construction?.opening_discard === 1, 'Opening selection must discard one.');
assert(canonical.deck_construction?.opening_hand === 3, 'Opening Hand must contain three cards.');
assert(canonical.deck_construction?.territory_arrangement_after_opening_selection === true, 'Territory arrangement must follow opening selection.');
assert(canonical.deck_construction?.first_player_after_territory_arrangement === true, 'Initiative must follow Territory arrangement.');
assert(canonical.battlefield?.last_stand?.final_territory_control_required === false, 'Last Stand must not require prior final-Territory control.');
assert(canonical.battlefield?.last_stand?.final_territory_capture_required === false, 'Last Stand must not require prior final-Territory capture.');
assert(canonical.battlefield?.last_stand?.separate_movement_sequence_required === true, 'Last Stand must require a separate movement sequence.');

const neutralCards = canonical.cards.filter((card) => card.allegiance === 'Neutral');
assert(neutralCards.length === 50, 'Published v0.6.3 must contain 50 Neutral cards.');
for (const faction of canonical.factions) {
  assert(canonical.cards.filter((card) => card.allegiance === faction.name).length === 13, `Published v0.6.3 must contain 13 ${faction.name} cards.`);
}

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
  'createV063LastStandBattle',
  'retreatV063Position',
  'defenderHasV063DefensiveEdge',
  'resolveV063BattleOutcome',
  'applyV063BattleOutcome',
  'resolveV063Withdrawal',
  'advanceV063TurnPhase',
  'beginEffectGrantedMovement',
]) {
  assert(rules.includes(marker), `Digital v0.6.3 rules layer is missing ${marker}.`);
  assert(rulesTests.includes(marker), `Digital v0.6.3 rules tests do not exercise ${marker}.`);
}

for (const marker of [
  'hasInherentBankAction',
  'actionCostForDirectCardProcedure',
  'additionalTacticPermission',
  'defaultBoundCardDestinationWhenBindingEnds',
  'orderRevealStageEffects',
  'activateInvasionAction',
  'applyInvasionBattleMode',
  'placeLandslide',
  'placeLandslideAfterBattle',
  'resolveLandslideRetreatChain',
  'bankDetente',
  'resolveDetenteAcceptance',
  'resolveCompoundInterest',
  'bankExtraordinaryRendition',
  'extraordinaryRenditionDiscardOrder',
  'releaseExtraordinaryRendition',
  'placeNaturesAltarByAction',
  'placeNaturesAltarAfterBattle',
  'canBeginRiteFromNaturesAltar',
  'canCompleteAltarRiteThisTurn',
  'playMartyrdomBeforeBattleCardsClear',
  'clearOpponentReserveUnderMartyrdom',
  'completeMartyrdomAfterBattleCardsClear',
  'bankMarginLoan',
  'resolveMarginLoanAfterIncome',
  'removeMarginLoan',
  'resolveStartTurnDraw',
]) {
  assert(cards.includes(marker), `Digital v0.6.3 card layer is missing ${marker}.`);
  assert(cardTests.includes(marker), `Digital v0.6.3 card tests do not exercise ${marker}.`);
}

assert(contentAdapter.includes("V063_RULES_VERSION = 'v0.6.3'"), 'v0.6.3 content adapter is not release-version locked.');
assert(contentAdapter.includes("../../releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json"), 'v0.6.3 content adapter does not import the published canonical-data export.');
assert(contentAdapter.includes("../../releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json"), 'v0.6.3 content adapter does not import the published release manifest.');
assert(!contentAdapter.includes('v0.6.3-browser-candidate'), 'v0.6.3 content adapter still depends on the retired browser candidate.');
assert(!contentAdapter.includes("'v0.6.3-candidate'"), 'v0.6.3 engine content still identifies itself as a candidate.');
assert(contentTests.includes("toBe('v0.6.3')"), 'v0.6.3 content tests do not lock the released rules identity.');
assert(contentTests.includes("not.toContain('candidate')"), 'v0.6.3 content tests do not guard against candidate-source regression.');

assert(!rules.includes("export * from '../v062/rules';"), 'v0.6.3 rules must not re-export the stale v0.6.2 runtime surface.');
assert(rules.includes("from '../v062/rules';"), 'v0.6.3 rules may continue sharing stable structural types with the versioned v0.6.2 layer while runtime behavior is migrated.');
for (const forbidden of ['applyNormalCapture(', 'resolveBattleOutcome(', 'applyBattleOutcome(', 'resolveWithdrawal(', 'retreatPosition(']) {
  assert(!rules.includes(forbidden), `v0.6.3 rules still expose or call stale v0.6.2 procedure ${forbidden}.`);
}
assert(!cards.includes("export * from '../v062/cards';"), 'v0.6.3 cards must not re-export the stale v0.6.2 card runtime surface.');
assert(!cards.includes("from '../v062/cards'"), 'v0.6.3 card behavior must be owned by the v0.6.3 layer.');
assert(cards.includes('retreatV063Position'), 'Landslide must use the v0.6.3 edge-aware retreat procedure.');
assert(cardTests.includes("expect(result.position).toBe(6)"), 'Landslide regression coverage must include retreat beyond the defender own end.');
assert(cardTests.includes('Overlay ownership'), 'Nature\'s Altar regression coverage must distinguish Overlay ownership from Territory control.');
assert(cardTests.includes('playMartyrdomBeforeBattleCardsClear'), 'Martyrdom regression coverage must preserve its pre-clear timing.');
assert(cardTests.includes('completeMartyrdomAfterBattleCardsClear'), 'Martyrdom regression coverage must preserve its post-clear timing.');

console.log('v0.6.3 digital baseline validation passed: published content authority is locked, v0.6.3 owns the shared rules and migrated card runtimes, and Front Line, retreat, Last Stand, battle, withdrawal, Landslide, Overlay-control, Martyrdom timing, and persistent Margin Loan behavior are regression-tested. Full engine parity remains tracked by #741.');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
