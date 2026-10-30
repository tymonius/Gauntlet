import { describe, expect, test } from 'vitest';
import { createV070StarterGame, reduceV070SetupAction } from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { viewV070GameForPlayer } from './views';

function readyBattle() {
  let state = createV070StarterGame({
    gameId: 'commitment-provenance-regression',
    seed: 'commitment-provenance-regression',
    players: {
      A: { name: 'A', starterDeckId: 'mystics-alchemist-first-principles' },
      B: { name: 'B', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard', playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories', playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(item => { item.occupant = null; item.blank = true; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  expect(state.battle?.attacker).toBe('A');
  return state;
}

describe('physical battle commitment source-zone provenance', () => {
  test('normal Gambit originates in Hand; normal Tactic originates in Reserve', () => {
    let state = readyBattle();
    const gambit = 'source-hand-gambit';
    const tactic = 'source-reserve-tactic';
    state.cardInstances[gambit] = {
      instanceId: gambit, cardId: 'neutral-rallying-cry', owner: 'A',
    };
    state.cardInstances[tactic] = {
      instanceId: tactic, cardId: 'neutral-rallying-cry', owner: 'A',
    };
    state.players.A.zones.hand.push(gambit);
    state.players.A.zones.drawPile.unshift(tactic);

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset', playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit', playerId: 'A', cardInstanceId: gambit,
    });
    expect(state.battleRuntime?.participants.A.gambit).toEqual(
      expect.objectContaining({ instanceId: gambit, sourceZone: 'hand' }),
    );
    // A face-down commitment must not disclose its identity or provenance
    // to the opponent through the public battle view.
    const privateGambit = viewV070GameForPlayer(state, 'B')
      .battleRuntime?.participants.A.gambit;
    expect(privateGambit).not.toHaveProperty('instanceId');
    expect(privateGambit).not.toHaveProperty('sourceZone');

    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    expect(state.battleRuntime?.participants.A.reserve).toContain(tactic);
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: tactic,
    });
    expect(state.battleRuntime?.participants.A.tactic).toEqual(
      expect.objectContaining({ instanceId: tactic, sourceZone: 'reserve' }),
    );
  });
});
