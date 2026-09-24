import { describe, expect, test } from 'vitest';
import * as current from './current';

describe('current digital rules surface', () => {
  test('binds current content to packages/game-data/current-game.json', () => {
    expect(current.CURRENT_RULES_VERSION).toBe('v0.7.2');
    expect(current.currentCanonicalContent.authority).toBe('current-game');
    expect(current.currentCanonicalContent.status).toBe('current-release');
    expect(current.currentCanonicalContent.rulesVersion).toBe('v0.7.2');
    expect(current.currentCanonicalContent.content.cards).toHaveLength(142);
    expect(current.currentCanonicalContent.content.territories).toHaveLength(25);
    expect(current.currentCanonicalContent.content.factions).toHaveLength(6);

    // The frozen v0.7.0 adapter remains separately addressable as historical
    // implementation evidence; it is no longer the current content identity.
    expect(current.V070_RULES_VERSION).toBe('v0.7.0');
    expect(current.V070_CANONICAL_DATA_SOURCE)
      .toBe('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json');
    expect(current.v070CanonicalContent.rulesVersion).toBe('v0.7.0');
  });

  test('keeps the v0.7.0 reducer API available as the migration implementation surface', () => {
    for (const name of [
      'createV070TurnState',
      'advanceV070TurnPhase',
      'createV070BattleOnset',
      'createV070LastStandOnset',
      'canInitiateV070LastStand',
      'proceedV070ToGambits',
      'endV070OnsetWithoutBattle',
      'v070BattleWasFought',
      'resolveV070BattleOutcome',
      'applyV070BattleOutcome',
      'resolveV070Withdrawal',
      'beginNormalV070Movement',
      'beginEffectGrantedV070Movement',
      'applyV070MovementChoice',
    ]) {
      expect(typeof current[name as keyof typeof current]).toBe('function');
    }

    for (const name of [
      'V064_CANDIDATE_RULES_VERSION',
      'v064CandidateContent',
      'createV064BattleOnset',
      'createV064TurnState',
      'createV063PendingBattle',
      'beginV063Onset',
      'beginV063ActiveBattle',
      'createPendingBattle',
    ]) {
      expect(current).not.toHaveProperty(name);
    }
  });

  test('exposes the maintained starter setup and private-view engine surface', () => {
    for (const name of [
      'loadV070StarterDecks',
      'createV070StarterGame',
      'reduceV070SetupAction',
      'reduceV070TurnAction',
      'drawV070Cards',
      'reduceV070BattleAction',
      'cardEligibleForV070BattleRole',
      'requiredV070BattleDice',
      'v070BattleEffectHandler',
      'resolveV070SupportedRevealEffects',
      'viewV070GameForPlayer',
    ]) {
      expect(typeof current[name as keyof typeof current]).toBe('function');
    }
    expect(current.v070StarterDecks.size).toBe(12);
  });

  test('uses current v0.7.2 authority for current card wording', () => {
    const advanceGuard =
      current.currentCanonicalContent.cardsById.get('neutral-advance-guard');
    const forcedMarch =
      current.currentCanonicalContent.cardsById.get('neutral-forced-march');

    expect(advanceGuard?.effects.find(effect => effect.label === 'Action')?.text)
      .toContain('initiates a battle');
    expect(forcedMarch?.effects.find(effect => effect.label === 'Action')?.text)
      .toContain('cannot initiate a battle');
    expect(current.currentCanonicalContent.content.battle.onset)
      .toContain('Resolve Terms first');
    expect(JSON.stringify([advanceGuard, forcedMarch])).not.toContain('pending battle');
  });

  test('does not leak unpromoted historical procedure libraries through the current API', () => {
    for (const name of [
      'resolveV063ArcaneKnowledgeAction',
      'prepareV063HeresyApplication',
      'resolveV063ManifestDestinyAction',
      'v063QuicksandMovementRule',
      'v063GrandMeleeBattleBonus',
      'createV064BattleOnset',
      'createV064TurnState',
    ]) {
      expect(current).not.toHaveProperty(name);
    }

    expect(current).not.toHaveProperty('resolveV070ArcaneKnowledgeAction');
    expect(current).not.toHaveProperty('resolveV070ManifestDestinyAction');
    expect(current).not.toHaveProperty('v070QuicksandMovementRule');
  });
});
