import { describe, expect, test } from 'vitest';
import * as current from './current';

describe('current digital rules surface', () => {
  test('binds current content to the v0.6.4 candidate authority', () => {
    expect(current.CURRENT_RULES_VERSION).toBe('v0.6.4-candidate');
    expect(current.V064_CANDIDATE_RULES_VERSION).toBe('v0.6.4-candidate');
    expect(current.v064CandidateContent.rulesVersion).toBe('v0.6.4-candidate');
    expect(current.v064CandidateContent.authorityPath).toBe('game-data/current-game.json');
    expect(current.v064CandidateContent.rulesSource.change_type).toBe('collapse-pending-battle-into-onset');
    expect(current.v064CandidateContent.battle).not.toHaveProperty('pending_sequence');
  });

  test('exposes the Onset-first battle API instead of the v0.6.3 pending-battle API', () => {
    for (const name of [
      'createV064TurnState',
      'advanceV064TurnPhase',
      'createV064BattleOnset',
      'createV064LastStandOnset',
      'proceedV064ToGambits',
      'endV064OnsetWithoutBattle',
      'resolveV064BattleOutcome',
      'applyV064BattleOutcome',
      'resolveV064Withdrawal',
      'beginNormalV064Movement',
      'beginEffectGrantedV064Movement',
      'applyV064MovementChoice',
      'hasInherentBankAction',
      'activateInvasionAction',
      'resolveLandslideRetreatChain',
      'resolveDetenteAcceptance',
      'resolveCompoundInterest',
      'bankExtraordinaryRendition',
      'canBeginRiteFromNaturesAltar',
      'playMartyrdomBeforeBattleCardsClear',
      'completeMartyrdomAfterBattleCardsClear',
      'eligibleV063CopiedEffects',
      'eligibleV063CopiedEffectInstances',
      'beginV063CopiedEffectApplication',
      'continueV063CopiedEffectApplication',
      'resolveV063ArcaneKnowledgeAction',
      'v063ArcaneKnowledgeBattleChoices',
      'prepareV063ArcaneKnowledgeBattleApplication',
      'v063HeresyChoices',
      'prepareV063HeresyApplication',
      'v063RendTheVeilChoices',
      'prepareV063RendTheVeilApplication',
      'completeV063RendTheVeilAftermath',
      'v063WitchcraftRepeatChoices',
      'prepareV063WitchcraftBattleApplication',
      'prepareV063WitchcraftAssetApplication',
      'createV063GauntletState',
      'insertV063TerritoryAtPlayerEnd',
      'insertV063TerritoryAtFrontLine',
      'v063DeedCost',
      'v063HasControllingInterest',
      'resolveV063ManifestDestinyAction',
      'resolveV063ManifestDestinyBattle',
      'v063QuicksandMovementRule',
      'v063DifficultTerrainTurnState',
      'v063DisruptedSupplyLinesActiveAssets',
      'resolveV063RuinedStorehouseReplacementDraw',
      'v063SupplyDepotNormalDrawCount',
      'v063RefugeCardBonus',
      'v063CommandTentActionPlan',
      'v063MonasteryAllowsGraveyardExit',
      'v063MonasterySuppressesArcaneEffect',
      'v063KingsRoadAdditionalMovement',
      'resolveV063TollBridgeAdvanceCost',
      'stashV063SmugglersRunCard',
      'useV063SmugglersRunStash',
      'resolveV063SmugglersRunStartTurn',
      'resolveV063SmugglersRunControlLoss',
      'v063PoisonousGasAllowsCommitment',
      'resolveV063PoisonousGasNoTacticPenalty',
      'v063GarrisonInitialReserveBonus',
      'resolveV063FieldHospitalSave',
      'v063ExposedFlankOccupierCanSetGambit',
      'v063HighGroundDefenderHasAdvantage',
      'v063FortifiedPassAttackerBankedAssetsActive',
      'v063InsurgencyOccupierBankedAssetsActive',
      'v063WatchtowerGambitPlan',
      'resolveV063OldBattlefieldReserveOverride',
      'v063TrainingGroundsReplacementPlan',
      'applyV063ArenaDefensiveEdgeRule',
      'resolveV063SpoilsOfWarReserveOverride',
      'resolveV063NoQuarterAdditionalRetreat',
      'v063SingleCombatBankedAssetsActive',
      'v063GrandMeleeBattleBonus',
    ]) {
      expect(typeof current[name as keyof typeof current]).toBe('function');
    }

    for (const name of [
      'createV063PendingBattle',
      'beginV063Onset',
      'beginV063ActiveBattle',
      'createPendingBattle',
    ]) {
      expect(current).not.toHaveProperty(name);
    }
  });

  test('uses current card wording for battle initiation', () => {
    const advanceGuard = current.v064CandidateContent.cardsById.get('neutral-advance-guard');
    const forcedMarch = current.v064CandidateContent.cardsById.get('neutral-forced-march');
    expect(advanceGuard?.effects.find(effect => effect.label === 'Action')?.text).toContain('initiates a battle');
    expect(forcedMarch?.effects.find(effect => effect.label === 'Action')?.text).toContain('cannot initiate a battle');
    expect(JSON.stringify([advanceGuard, forcedMarch])).not.toContain('pending battle');
  });
});
