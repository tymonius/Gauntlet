import { describe, expect, it } from 'vitest';
import {
  advanceV061BattleStage,
  createV061BattleCard,
  createV061BattleState,
  nextV061BattleStage,
  normalV061BattleDestination,
  remainingV061ReserveDestination,
  toV061PublicBattleView,
  v061InterferenceReturnDestination,
} from './battle-v061';

function battle() {
  return createV061BattleState({
    id: 'battle-v061-test',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: 'player_1',
    defender: 'player_2',
    tiePolicy: 'defender',
  });
}

describe('v0.6.1 battle lifecycle', () => {
  it('uses the authoritative eight-stage sequence and waits for each completion gate', () => {
    const state = battle();

    expect(state.stage).toBe('opening_effects');
    expect(nextV061BattleStage(state)).toBeUndefined();

    state.openingEffectsComplete = true;
    expect(advanceV061BattleStage(state)).toBe('set_gambits');
    expect(nextV061BattleStage(state)).toBeUndefined();

    state.attacker.gambitChoiceComplete = true;
    state.defender.gambitChoiceComplete = true;
    expect(advanceV061BattleStage(state)).toBe('form_reserves');

    state.attacker.reserveFormed = true;
    state.defender.reserveFormed = true;
    expect(advanceV061BattleStage(state)).toBe('reveal_gambits');

    state.gambitRevealComplete = true;
    expect(advanceV061BattleStage(state)).toBe('choose_tactics');

    state.attacker.tacticChoiceComplete = true;
    state.defender.tacticChoiceComplete = true;
    expect(advanceV061BattleStage(state)).toBe('reveal_tactics');

    state.tacticRevealComplete = true;
    expect(advanceV061BattleStage(state)).toBe('resolve_battle');
    expect(nextV061BattleStage(state)).toBeUndefined();

    state.winner = 'player_1';
    state.loser = 'player_2';
    expect(advanceV061BattleStage(state)).toBe('aftermath');
    expect(nextV061BattleStage(state)).toBeUndefined();
  });

  it('allows a no-winner withdrawal to proceed to the Aftermath without winner or loser', () => {
    const state = battle();
    state.stage = 'resolve_battle';
    state.noWinner = true;
    state.attacker.withdrew = true;

    expect(advanceV061BattleStage(state)).toBe('aftermath');
    expect(state.winner).toBeUndefined();
    expect(state.loser).toBeUndefined();
  });

  it('uses battle role for normal cleanup and actual source for Interference returns', () => {
    const gambit = createV061BattleCard({
      cardId: 'neutral-rallying-cry',
      owner: 'player_1',
      role: 'gambit',
      source: 'hand',
    });
    const reserveTactic = createV061BattleCard({
      cardId: 'neutral-fealty',
      owner: 'player_1',
      role: 'tactic',
      source: 'reserve',
    });
    const handTactic = createV061BattleCard({
      cardId: 'military-shock-and-awe-follow-up',
      owner: 'player_1',
      role: 'tactic',
      source: 'hand',
      added: true,
    });

    expect(normalV061BattleDestination(gambit)).toBe('graveyard');
    expect(normalV061BattleDestination(reserveTactic)).toBe('discard');
    expect(normalV061BattleDestination(handTactic)).toBe('discard');
    expect(v061InterferenceReturnDestination(gambit)).toBe('hand');
    expect(v061InterferenceReturnDestination(reserveTactic)).toBe('reserve');
    expect(v061InterferenceReturnDestination(handTactic)).toBe('hand');
    expect(remainingV061ReserveDestination()).toBe('discard');

    handTactic.cleanupDestination = 'graveyard';
    expect(normalV061BattleDestination(handTactic)).toBe('graveyard');
  });

  it('keeps opposing face-down choices hidden while preserving counts', () => {
    const state = battle();
    state.stage = 'choose_tactics';
    state.attacker.gambitChoiceComplete = true;
    state.attacker.gambit = createV061BattleCard({
      cardId: 'neutral-rallying-cry',
      owner: 'player_1',
      role: 'gambit',
      source: 'hand',
    });
    state.attacker.reserveFormed = true;
    state.attacker.reserve = ['neutral-fealty', 'neutral-forced-march'];
    state.attacker.tactics = [createV061BattleCard({
      cardId: 'neutral-fealty',
      owner: 'player_1',
      role: 'tactic',
      source: 'reserve',
    })];

    const opponentView = toV061PublicBattleView(state, 'player_2');
    expect(opponentView.attacker.gambit).toEqual({ faceDown: true });
    expect(opponentView.attacker.tactics).toEqual([{ faceDown: true }]);
    expect(opponentView.attacker.reserveCount).toBe(2);

    const ownerView = toV061PublicBattleView(state, 'player_1');
    expect(ownerView.attacker.gambit).toMatchObject({ cardId: 'neutral-rallying-cry' });
    expect(ownerView.attacker.tactics[0]).toMatchObject({ cardId: 'neutral-fealty' });
    expect(ownerView.attacker.reserveCount).toBe(2);
  });
});
