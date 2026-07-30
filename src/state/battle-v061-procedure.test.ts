import { describe, expect, it } from 'vitest';
import {
  applyV061BattleProcedureAction,
  createV061BattleProcedureState,
  V061BattleProcedureError,
} from './battle-v061-procedure';

function createBattle(overrides: Partial<Parameters<typeof createV061BattleProcedureState>[0]> = {}) {
  return createV061BattleProcedureState({
    id: 'battle-procedure-test',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: 'player_1',
    defender: 'player_2',
    tiePolicy: 'defender',
    ...overrides,
  });
}

describe('v0.6.1 battle procedure reducer', () => {
  it('resolves the normal Gambit, Reserve, Tactic, result, and Aftermath sequence', () => {
    const initial = createBattle();
    const openingComplete = applyV061BattleProcedureAction(initial, { type: 'complete_opening_effects' });

    expect(initial.stage).toBe('opening_effects');
    expect(openingComplete.stage).toBe('set_gambits');
    expect(openingComplete.priorityPlayer).toBe('player_1');

    const attackerSet = applyV061BattleProcedureAction(openingComplete, {
      type: 'set_gambit',
      playerId: 'player_1',
      cardId: 'neutral-rallying-cry',
    });
    expect(attackerSet.attacker.gambit).toMatchObject({
      cardId: 'neutral-rallying-cry',
      role: 'gambit',
      source: 'hand',
      faceDown: true,
    });
    expect(attackerSet.priorityPlayer).toBe('player_2');

    const gambitsComplete = applyV061BattleProcedureAction(attackerSet, {
      type: 'pass_gambit',
      playerId: 'player_2',
    });
    expect(gambitsComplete.stage).toBe('form_reserves');
    expect(gambitsComplete.priorityPlayer).toBeUndefined();

    const defenderReserve = applyV061BattleProcedureAction(gambitsComplete, {
      type: 'form_reserve',
      playerId: 'player_2',
      cardIds: ['neutral-fealty', 'neutral-forced-march', 'neutral-pathfinders'],
    });
    expect(defenderReserve.stage).toBe('form_reserves');

    const reservesComplete = applyV061BattleProcedureAction(defenderReserve, {
      type: 'form_reserve',
      playerId: 'player_1',
      cardIds: ['neutral-contingency-plan', 'neutral-new-recruits', 'neutral-supplies'],
    });
    expect(reservesComplete.stage).toBe('reveal_gambits');

    const gambitsRevealed = applyV061BattleProcedureAction(reservesComplete, { type: 'reveal_gambits' });
    expect(gambitsRevealed.attacker.gambit?.faceDown).toBe(false);
    expect(gambitsRevealed.stage).toBe('choose_tactics');
    expect(gambitsRevealed.priorityPlayer).toBe('player_1');

    const attackerTactic = applyV061BattleProcedureAction(gambitsRevealed, {
      type: 'choose_tactics',
      playerId: 'player_1',
      cardIds: ['neutral-new-recruits'],
    });
    expect(attackerTactic.attacker.tactics).toHaveLength(1);
    expect(attackerTactic.attacker.tactics[0]).toMatchObject({
      cardId: 'neutral-new-recruits',
      role: 'tactic',
      source: 'reserve',
      faceDown: true,
    });
    expect(attackerTactic.attacker.reserve).toEqual(['neutral-contingency-plan', 'neutral-supplies']);
    expect(attackerTactic.priorityPlayer).toBe('player_2');

    const tacticsComplete = applyV061BattleProcedureAction(attackerTactic, {
      type: 'pass_tactics',
      playerId: 'player_2',
    });
    expect(tacticsComplete.stage).toBe('reveal_tactics');

    const tacticsRevealed = applyV061BattleProcedureAction(tacticsComplete, { type: 'reveal_tactics' });
    expect(tacticsRevealed.attacker.tactics[0].faceDown).toBe(false);
    expect(tacticsRevealed.stage).toBe('resolve_battle');

    const result = applyV061BattleProcedureAction(tacticsRevealed, {
      type: 'record_battle_result',
      winner: 'player_1',
      loser: 'player_2',
    });
    expect(result.stage).toBe('resolve_battle');
    expect(result.winner).toBe('player_1');
    expect(result.loser).toBe('player_2');

    const aftermath = applyV061BattleProcedureAction(result, { type: 'begin_aftermath' });
    expect(aftermath.stage).toBe('aftermath');
  });

  it('enforces the current choice order independently for Gambits and Tactics', () => {
    let state = createBattle({
      gambitOrder: ['player_2', 'player_1'],
      tacticOrder: ['player_1', 'player_2'],
    });
    state = applyV061BattleProcedureAction(state, { type: 'complete_opening_effects' });
    expect(state.priorityPlayer).toBe('player_2');

    expect(() => applyV061BattleProcedureAction(state, {
      type: 'pass_gambit',
      playerId: 'player_1',
    })).toThrow(V061BattleProcedureError);

    state = applyV061BattleProcedureAction(state, { type: 'pass_gambit', playerId: 'player_2' });
    state = applyV061BattleProcedureAction(state, { type: 'pass_gambit', playerId: 'player_1' });
    state = applyV061BattleProcedureAction(state, { type: 'form_reserve', playerId: 'player_1', cardIds: [] });
    state = applyV061BattleProcedureAction(state, { type: 'form_reserve', playerId: 'player_2', cardIds: [] });
    state = applyV061BattleProcedureAction(state, { type: 'reveal_gambits' });

    expect(state.priorityPlayer).toBe('player_1');
  });

  it('chooses several Tactics simultaneously when an effect raises the limit', () => {
    let state = createBattle();
    state = applyV061BattleProcedureAction(state, { type: 'complete_opening_effects' });
    state = applyV061BattleProcedureAction(state, { type: 'pass_gambit', playerId: 'player_1' });
    state = applyV061BattleProcedureAction(state, { type: 'pass_gambit', playerId: 'player_2' });
    state = applyV061BattleProcedureAction(state, {
      type: 'form_reserve',
      playerId: 'player_1',
      cardIds: ['card-a', 'card-b', 'card-c'],
    });
    state = applyV061BattleProcedureAction(state, {
      type: 'form_reserve',
      playerId: 'player_2',
      cardIds: [],
    });
    state = applyV061BattleProcedureAction(state, { type: 'reveal_gambits' });
    state.attacker.tacticLimit = 2;

    state = applyV061BattleProcedureAction(state, {
      type: 'choose_tactics',
      playerId: 'player_1',
      cardIds: ['card-a', 'card-c'],
    });

    expect(state.attacker.tactics.map((card) => card.cardId)).toEqual(['card-a', 'card-c']);
    expect(state.attacker.reserve).toEqual(['card-b']);
  });

  it('records withdrawal immediately with no winner, loser, or unresolved later stage', () => {
    let state = createBattle();
    state = applyV061BattleProcedureAction(state, { type: 'complete_opening_effects' });
    state = applyV061BattleProcedureAction(state, {
      type: 'record_withdrawal',
      withdrawingPlayers: ['player_1'],
    });

    expect(state.stage).toBe('aftermath');
    expect(state.noWinner).toBe(true);
    expect(state.winner).toBeUndefined();
    expect(state.loser).toBeUndefined();
    expect(state.attacker.withdrew).toBe(true);
    expect(state.defender.withdrew).toBe(false);
    expect(state.priorityPlayer).toBeUndefined();
  });

  it('rejects over-limit choices and cards that are not in the Reserve', () => {
    let state = createBattle();
    state = applyV061BattleProcedureAction(state, { type: 'complete_opening_effects' });
    state = applyV061BattleProcedureAction(state, { type: 'pass_gambit', playerId: 'player_1' });
    state = applyV061BattleProcedureAction(state, { type: 'pass_gambit', playerId: 'player_2' });
    state = applyV061BattleProcedureAction(state, {
      type: 'form_reserve',
      playerId: 'player_1',
      cardIds: ['card-a', 'card-b', 'card-c'],
    });
    state = applyV061BattleProcedureAction(state, {
      type: 'form_reserve',
      playerId: 'player_2',
      cardIds: [],
    });
    state = applyV061BattleProcedureAction(state, { type: 'reveal_gambits' });

    expect(() => applyV061BattleProcedureAction(state, {
      type: 'choose_tactics',
      playerId: 'player_1',
      cardIds: ['card-a', 'card-b'],
    })).toThrow(/current limit is 1/);

    expect(() => applyV061BattleProcedureAction(state, {
      type: 'choose_tactics',
      playerId: 'player_1',
      cardIds: ['not-in-reserve'],
    })).toThrow(/not available/);
  });
});
