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

  test('exposes the migrated v0.6.3 rules procedures rather than stale v0.6.2 runtime names', () => {
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
