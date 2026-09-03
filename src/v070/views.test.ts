import { describe, expect, test } from 'vitest';
import { createV070StarterGame, reduceV070SetupAction } from './engine';
import { createV070BattleRuntime } from './battle-types';
import { viewV070GameForPlayer } from './views';

const input = {
  gameId: 'view-test',
  seed: 'view-seed',
  players: {
    A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
    B: { name: 'Bravo', starterDeckId: 'intelligence-ranger-field-operations' },
  },
} as const;

describe('v0.7.0 private player views', () => {
  test('shows the viewer their opening cards but not the opponent’s', () => {
    const state = createV070StarterGame(input);
    const aView = viewV070GameForPlayer(state, 'A');

    expect(aView.players.A.openingSelection).toHaveLength(4);
    expect(aView.players.B.openingSelection).toBeUndefined();
    expect(aView.players.A.zones.drawPileCount).toBe(26);
    expect(aView.players.B.zones.drawPileCount).toBe(26);

    const opponentOpeningIds = new Set(state.players.B.openingSelection);
    expect(JSON.stringify(aView)).not.toContain([...opponentOpeningIds][0]);
  });

  test('never exposes an opponent Hand through the player view', () => {
    let state = createV070StarterGame(input);
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId: 'A',
      cardInstanceId: state.players.A.openingSelection[0],
    });
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId: 'B',
      cardInstanceId: state.players.B.openingSelection[0],
    });

    const aView = viewV070GameForPlayer(state, 'A');
    expect(aView.players.A.zones.hand).toHaveLength(3);
    expect(aView.players.B.zones.hand).toBeUndefined();
    expect(aView.players.B.zones.handCount).toBe(3);

    for (const instanceId of state.players.B.zones.hand) {
      expect(JSON.stringify(aView)).not.toContain(instanceId);
    }
  });

  test('keeps the opponent Territory order private until reveal', () => {
    let state = createV070StarterGame(input);
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId: 'A',
      cardInstanceId: state.players.A.openingSelection[0],
    });
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId: 'B',
      cardInstanceId: state.players.B.openingSelection[0],
    });
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId: 'B',
      territoryIds: [...state.players.B.territoryCandidates].reverse(),
    });

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');

    expect(aView.players.B.territoryOrder).toBeNull();
    expect(aView.players.B.territoryCandidates).toBeUndefined();
    expect(bView.players.B.territoryOrder)
      .toEqual([...state.players.B.territoryCandidates].reverse());
  });

  test('shows shared-timing Aftermath options only to the player making the choice', () => {
    const state = createV070StarterGame(input);
    state.battleRuntime = createV070BattleRuntime();
    state.battleRuntime.stage = 'aftermath';
    state.battleRuntime.pendingBattleAftermathControlledEffectChoice = {
      playerId: 'A',
      candidateSourceInstanceIds: ['choice-one', 'choice-two'],
      immediateWinner: null,
    };

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');

    expect(
      aView.battleRuntime
        ?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual({
      playerId: 'A',
      candidateCount: 2,
      immediateWinner: null,
      candidateSourceInstanceIds: ['choice-one', 'choice-two'],
    });
    expect(
      bView.battleRuntime
        ?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual({
      playerId: 'A',
      candidateCount: 2,
      immediateWinner: null,
    });
  });

  test('filters private event payloads to the intended player', () => {
    const state = createV070StarterGame(input);
    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');

    const aPrivate = aView.events.filter(event => event.visibility === 'A');
    const bPrivate = bView.events.filter(event => event.visibility === 'B');

    expect(aPrivate).toHaveLength(1);
    expect(bPrivate).toHaveLength(1);
    expect(aView.events.some(event => event.visibility === 'B')).toBe(false);
    expect(bView.events.some(event => event.visibility === 'A')).toBe(false);
  });
});
