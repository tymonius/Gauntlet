import { describe, expect, test } from 'vitest';
import * as current from './current';

describe('current digital rules surface', () => {
  test('binds current content to the published v0.6.3 release adapter', () => {
    expect(current.CURRENT_RULES_VERSION).toBe('v0.6.3');
    expect(current.V063_RULES_VERSION).toBe('v0.6.3');
    expect(current.v063CanonicalContent.rulesVersion).toBe('v0.6.3');
    expect(current.v063CanonicalContent.canonicalDataSource).toBe(
      'releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json',
    );
    expect(current.v063CanonicalContent.releaseManifestSource).toBe(
      'releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json',
    );
  });

  test('does not expose the reconstruction adapter as the current content contract', () => {
    expect('cleanV063Content' in current).toBe(false);
    expect('CLEAN_V063_AUTHORITY_TARGET' in current).toBe(false);
    expect('createCleanV063TurnState' in current).toBe(false);
  });

  test('exposes migrated v0.6.3 gameplay procedures rather than stale rule-runtime names', () => {
    for (const name of [
      'createV063TurnState',
      'advanceV063TurnPhase',
      'applyV063Capture',
      'createV063PendingBattle',
      'createV063LastStandBattle',
      'resolveV063BattleOutcome',
      'applyV063BattleOutcome',
      'resolveV063Withdrawal',
      'retreatV063Position',
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
      'beginV063CopiedEffectApplication',
      'continueV063CopiedEffectApplication',
      'resolveV063ArcaneKnowledgeAction',
      'v063ArcaneKnowledgeBattleChoices',
      'prepareV063ArcaneKnowledgeBattleApplication',
      'createV063GauntletState',
      'insertV063TerritoryAtPlayerEnd',
      'insertV063TerritoryAtFrontLine',
      'v063DeedCost',
      'v063HasControllingInterest',
      'resolveV063ManifestDestinyAction',
      'resolveV063ManifestDestinyBattle',
    ]) {
      expect(typeof current[name as keyof typeof current]).toBe('function');
    }

    for (const name of [
      'createTurnState',
      'advanceTurnPhase',
      'applyNormalCapture',
      'createPendingBattle',
      'resolveBattleOutcome',
      'applyBattleOutcome',
      'resolveWithdrawal',
      'retreatPosition',
    ]) {
      expect(current).not.toHaveProperty(name);
    }
  });
});
