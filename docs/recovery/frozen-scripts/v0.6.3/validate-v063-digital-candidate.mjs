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
const copiedEffects = readFileSync('src/v063/copied-effects.ts', 'utf8');
const arcaneKnowledge = readFileSync('src/v063/arcane-knowledge.ts', 'utf8');
const copiedEffectCallers = readFileSync('src/v063/copied-effect-callers.ts', 'utf8');
const rulesTests = readFileSync('src/v063/rules.test.ts', 'utf8');
const cardTests = readFileSync('src/v063/cards.test.ts', 'utf8');
const copiedEffectTests = readFileSync('src/v063/copied-effects.test.ts', 'utf8');
const copiedEffectCallerTests = readFileSync('src/v063/copied-effect-callers.test.ts', 'utf8');
const currentSurface = readFileSync('src/content/current.ts', 'utf8');
const legacyNeutralContainment = readFileSync('src/cards/neutral-audit-containment.ts', 'utf8');

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
const arcaneKnowledgeCard = canonical.cards.find((card) => card.id === 'neutral-arcane-knowledge');
assert(arcaneKnowledgeCard?.cost === 4, 'Arcane Knowledge must retain v0.6.3 cost 4.');
assert(arcaneKnowledgeCard?.effects?.find((effect) => effect.label === 'Action')?.text === 'Move one card from your Graveyard to your Discard Pile.', 'Arcane Knowledge Action text does not match published v0.6.3 authority.');
assert(arcaneKnowledgeCard?.effects?.find((effect) => effect.label === 'Gambit/Tactic')?.text === 'Apply the Gambit or Tactic effect of one card in your Graveyard that can apply now.', 'Arcane Knowledge battle text does not match published v0.6.3 authority.');

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

for (const marker of [
  'eligibleV063CopiedEffects',
  'eligibleV063CopiedEffectInstances',
  'beginV063CopiedEffectApplication',
  'continueV063CopiedEffectApplication',
  'sourceCardMovesMerelyBecauseCopied: false',
  'printedEffectOrCallerMayMoveSource: true',
  'sourceCardIsPlayedSetOrChosen: false',
  'sourceEventTriggers: false',
  'remakeChoices: true',
  'repayCosts: true',
]) {
  assert(copiedEffects.includes(marker), `Digital v0.6.3 copied-effect layer is missing ${marker}.`);
}
for (const marker of [
  'resolveV063ArcaneKnowledgeAction',
  'v063ArcaneKnowledgeBattleChoices',
  'prepareV063ArcaneKnowledgeBattleApplication',
]) {
  assert(arcaneKnowledge.includes(marker), `Digital v0.6.3 Arcane Knowledge layer is missing ${marker}.`);
  assert(copiedEffectTests.includes(marker), `Digital v0.6.3 copied-effect tests do not exercise ${marker}.`);
}
for (const marker of [
  'v063HeresyChoices',
  'prepareV063HeresyApplication',
  'v063RendTheVeilChoices',
  'prepareV063RendTheVeilApplication',
  'completeV063RendTheVeilAftermath',
  'v063WitchcraftRepeatChoices',
  'prepareV063WitchcraftBattleApplication',
  'prepareV063WitchcraftAssetApplication',
]) {
  assert(copiedEffectCallers.includes(marker), `Digital v0.6.3 copied-effect caller layer is missing ${marker}.`);
  assert(copiedEffectCallerTests.includes(marker), `Digital v0.6.3 copied-effect caller tests do not exercise ${marker}.`);
}
assert(!copiedEffects.includes('replayableBattleEffectIds'), 'v0.6.3 copied-effect legality must not use the legacy title whitelist.');
assert(!copiedEffectCallers.includes('addReplayedBattleCard'), 'Current copied-effect callers must not inject virtual replay cards into battles.');
assert(!copiedEffectCallers.includes('addVirtualRepeat'), 'Current Witchcraft must not create a virtual replay card.');
assert(copiedEffectCallerTests.includes("'black-1'"), 'Rend the Veil tests must distinguish physical duplicate source instances.');
assert(copiedEffectCallerTests.includes("'black-2'"), 'Rend the Veil tests must distinguish physical duplicate source instances.');
assert(copiedEffectCallerTests.includes('createsCopiedOrRepeatedApplication'), 'Witchcraft tests must guard repeat/copy target exclusion.');
assert(copiedEffectCallerTests.includes('addsBattleCard'), 'Witchcraft tests must guard card-adding target exclusion.');
assert(copiedEffectCallerTests.includes('fallbackAdvantage'), 'Witchcraft tests must guard its no-target Advantage fallback.');
assert(copiedEffectCallerTests.includes('once per turn'), 'Witchcraft Asset tests must guard its once-per-turn limit.');
assert(copiedEffectTests.includes('third application layer'), 'Copied-effect regression coverage must enforce the v0.6.3 chain ceiling.');
assert(copiedEffectTests.includes('sourceCardIsPlayedSetOrChosen'), 'Copied-effect regression coverage must guard source-card event semantics.');
assert(currentSurface.includes("export * from '../v063/copied-effects';"), 'Current digital surface must expose v0.6.3 copied-effect procedures.');
assert(currentSurface.includes("export * from '../v063/arcane-knowledge';"), 'Current digital surface must expose v0.6.3 Arcane Knowledge procedures.');
assert(currentSurface.includes("export * from '../v063/copied-effect-callers';"), 'Current digital surface must expose migrated v0.6.3 copied-effect callers.');

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

// The pre-v0.6 prototype remains a historical compatibility surface. Keep its
// old Arcane Knowledge battle path quarantined until that shell is explicitly
// migrated to the v0.6.3 procedures rather than treating the legacy replay
// implementation as current behavior.
assert(legacyNeutralContainment.includes("'neutral-arcane-knowledge': ['battle_hand_commit', 'battle_draw_play']"), 'Legacy Arcane Knowledge battle replay must remain quarantined until the legacy shell is migrated.');

console.log('v0.6.3 digital baseline validation passed: published content authority is locked; shared rules/card runtimes, Arcane Knowledge, Heresy, Rend the Veil, and Witchcraft use the active v0.6.3 semantics; copied/repeated effects preserve physical source identity without virtual replay; and the historical prototype remains explicitly quarantined where it is not yet migrated. Full engine parity remains tracked by #741.');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
