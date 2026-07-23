import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-intelligence';
import { initializeGame } from './initialize';
import { battleDiceCount, netBattleDiceAdjustment, selectBattleDieResult } from './battle-dice';
import { toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function game(): GameState {
  const state = initializeGame({
    id: 'battle-dice-pools',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'One', deck: ['a'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Two', deck: ['b'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'battle-1',
    stage: 'dice',
    location: territories[2].id,
    attackerOrigin: territories[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'reroll',
    effectsResolved: ['before_battle_resolution'],
  };
  return state;
}

describe('canonical battle dice pools', () => {
  it('cancels advantage and disadvantage one-for-one', () => {
    const state = game();
    state.battle!.attacker.advantage = 3;
    state.battle!.attacker.disadvantage = 2;
    expect(netBattleDiceAdjustment(state.battle!.attacker)).toBe(1);
    expect(battleDiceCount(state.battle!.attacker)).toBe(2);
  });

  it('uses the highest result for every net advantage', () => {
    let state = game();
    state.battle!.attacker.advantage = 2;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', values: [2, 6, 4] }).state;
    expect(state.battle!.attacker.diceRolls).toEqual([2, 6, 4]);
    expect(state.battle!.attacker.diceRoll).toBe(6);
  });

  it('uses the lowest result for every net disadvantage', () => {
    let state = game();
    state.battle!.attacker.disadvantage = 2;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', values: [5, 2, 4] }).state;
    expect(state.battle!.attacker.diceRoll).toBe(2);
  });

  it('converts a legacy selected-result action into a valid deterministic pool', () => {
    let state = game();
    state.battle!.attacker.advantage = 2;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 4 }).state;
    expect(state.battle!.attacker.diceRolls).toEqual([4, 1, 1]);
    expect(state.battle!.attacker.diceRoll).toBe(4);
  });

  it('rejects a pool with the wrong number of dice', () => {
    const state = game();
    state.battle!.attacker.advantage = 1;
    expect(() => applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', values: [6] })).toThrow('requires exactly 2 dice');
  });

  it('exposes raw dice and the selected result publicly', () => {
    let state = game();
    state.battle!.attacker.advantage = 1;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', values: [3, 5] }).state;
    expect(toPublicGameView(state).battle?.attacker).toMatchObject({
      advantage: 1,
      disadvantage: 0,
      diceRolls: [3, 5],
      diceRoll: 5,
    });
  });

  it('clears both selected and raw dice when a tied battle rerolls', () => {
    let state = game();
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', values: [4] }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', values: [4] }).state;
    expect(state.battle?.stage).toBe('resolution');

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.diceRoll).toBeUndefined();
    expect(state.battle?.attacker.diceRolls).toBeUndefined();
    expect(state.battle?.defender.diceRoll).toBeUndefined();
    expect(state.battle?.defender.diceRolls).toBeUndefined();
  });

  it('selects directly from a supplied pool helper', () => {
    const state = game();
    state.battle!.attacker.advantage = 1;
    state.battle!.attacker.disadvantage = 3;
    expect(selectBattleDieResult(state.battle!.attacker, [4, 2, 5])).toBe(2);
  });
});
