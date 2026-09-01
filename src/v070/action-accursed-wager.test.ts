import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  armV070AccursedWager,
} from './accursed-wager';
import {
  reduceV070BattleAction,
} from './battle-engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryStarter = 'military-commandant-holdfast';
const mysticsStarter = 'mystics-alchemist-first-principles';

function openingForMysticsB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'accursed-wager-action',
    seed: 'accursed-wager-action-seed',
    players: {
      A: { name: 'Opponent', starterDeckId: militaryStarter },
      B: { name: 'Mystic', starterDeckId: mysticsStarter },
    },
  });

  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 6,
  });
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'B',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'B',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function inject(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'discardPile',
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones[zone].push(instanceId);
  return instanceId;
}

function makePlayersAdjacent(state: V070GameState): void {
  state.players.A.position = 2;
  state.players.B.position = 3;
  for (const territory of state.board) territory.occupant = null;
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  // This fixture isolates Accursed Wager, not printed Territory effects.
  state.board[2].blank = true;
}

function initiateBattleAsB(state: V070GameState): V070GameState {
  makePlayersAdjacent(state);
  if (state.turnState?.phase === 'opening') {
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
  }
  expect(state.turnState?.phase).toBe('movement');
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'B',
    choice: 'advance',
  });
  expect(state.battle).not.toBeNull();
  expect(state.battle?.attacker).toBe('B');
  return state;
}

function resolveNoCardBattleWithBWinning(
  state: V070GameState,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [6],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [1],
  });
  expect(state.battle).toMatchObject({
    winner: 'B',
    loser: 'A',
    stage: 'resolved',
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return state;
}

function playWager(state: V070GameState, suffix = 'source') {
  const source = inject(
    state,
    'B',
    'mystics-accursed-wager',
    'hand',
    suffix,
  );
  state = reduceV070TurnAction(state, {
    type: 'play_action_card',
    playerId: 'B',
    cardInstanceId: source,
  });
  return { state, source };
}

describe('v0.7.0 Accursed Wager Action', () => {
  test('arms a public delayed effect and discards the physical Action card', () => {
    const played = playWager(openingForMysticsB());
    const state = played.state;

    expect(state.accursedWagers).toEqual([{
      sourceActionInstanceId: played.source,
      owner: 'B',
      armedTurn: state.turnNumber,
      battleInitiatedEventIndex: null,
    }]);
    expect(state.players.B.zones.discardPile).toContain(played.source);
    expect(state.players.B.zones.hand).not.toContain(played.source);
    expect(state.pendingActionCard).toBeNull();

    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(opponentView.accursedWagers).toEqual(state.accursedWagers);
  });

  test('attaches only when the owner actually initiates the next battle this turn', () => {
    let played = playWager(openingForMysticsB());
    let state = initiateBattleAsB(played.state);

    const initiation = [...state.events].reverse().find(
      event => event.type === 'battle_initiated',
    )!;
    expect(state.accursedWagers).toEqual([
      expect.objectContaining({
        sourceActionInstanceId: played.source,
        owner: 'B',
        battleInitiatedEventIndex: initiation.index,
      }),
    ]);

    const attached = state.events.find(event =>
      event.type === 'accursed_wager_attached'
    );
    expect(attached?.payload).toEqual(expect.objectContaining({
      battleInitiatedEventIndex: initiation.index,
      sourceActionInstanceIds: [played.source],
      count: 1,
    }));
  });

  test('after retreat and before battle cards clear, the loser chooses one Hand card for the Graveyard', () => {
    let state = openingForMysticsB();
    const target = state.players.A.zones.hand[0];
    const played = playWager(state);
    state = initiateBattleAsB(played.state);
    state = resolveNoCardBattleWithBWinning(state);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'B',
    });

    expect(state.players.A.position).toBe(3);
    expect(state.battle).not.toBeNull();
    expect(state.battleRuntime?.pendingAccursedWager).toEqual({
      loser: 'A',
      remainingSourceActionInstanceIds: [played.source],
      immediateWinner: null,
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'B',
    })).toThrow(/pending Accursed Wager discard/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_accursed_wager_discard',
      playerId: 'A',
      cardInstanceId: target,
    });

    expect(state.players.A.zones.hand).not.toContain(target);
    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.accursedWagers).toEqual([]);
    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
    expect(state.turnState?.phase).toBe('denouement');

    const discardEvent = state.events.find(event =>
      event.type === 'accursed_wager_resolved'
      && (event.payload as { sourceActionInstanceId?: string })
        ?.sourceActionInstanceId === played.source
    );
    expect(discardEvent?.payload).toEqual(expect.objectContaining({
      loser: 'A',
      discardedInstanceId: target,
    }));
  });

  test('if the loser has no Hand cards, the Wager is consumed without blocking Aftermath', () => {
    let state = openingForMysticsB();
    state.players.A.zones.hand = [];
    const played = playWager(state);
    state = initiateBattleAsB(played.state);
    state = resolveNoCardBattleWithBWinning(state);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'B',
    });

    expect(state.accursedWagers).toEqual([]);
    expect(state.battle).toBeNull();
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.events.some(event =>
      event.type === 'accursed_wager_no_discard'
      && (event.payload as { reason?: string })?.reason ===
        'loser_hand_empty'
    )).toBe(true);
  });

  test('multiple armed Wagers attach to the same next battle and each applies if the loser remains able', () => {
    let state = openingForMysticsB();
    state.players.A.zones.hand = [];
    const target = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'hand',
      'only-target',
    );
    const first = inject(
      state,
      'B',
      'mystics-accursed-wager',
      'discardPile',
      'first',
    );
    const second = inject(
      state,
      'B',
      'mystics-accursed-wager',
      'discardPile',
      'second',
    );
    armV070AccursedWager(state, 'B', first);
    armV070AccursedWager(state, 'B', second);

    state = initiateBattleAsB(state);
    state = resolveNoCardBattleWithBWinning(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'B',
    });

    expect(state.battleRuntime?.pendingAccursedWager)
      .toEqual(expect.objectContaining({
        loser: 'A',
        remainingSourceActionInstanceIds: [first, second],
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_accursed_wager_discard',
      playerId: 'A',
      cardInstanceId: target,
    });

    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.accursedWagers).toEqual([]);
    expect(state.battle).toBeNull();
    expect(state.events.some(event =>
      event.type === 'accursed_wager_no_discard'
      && (event.payload as { reason?: string })?.reason ===
        'loser_hand_exhausted'
    )).toBe(true);
  });

  test('an unused Wager expires at the end of the turn', () => {
    let played = playWager(openingForMysticsB());
    let state = played.state;

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'hold',
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'B',
    });
    const hand = state.players.B.zones.hand;
    const excess = Math.max(0, hand.length - 3);
    state = reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'B',
      discardInstanceIds: hand.slice(0, excess),
    });

    expect(state.accursedWagers).toEqual([]);
    expect(state.events.some(event =>
      event.type === 'accursed_wager_expired'
      && (event.payload as { sourceActionInstanceIds?: string[] })
        ?.sourceActionInstanceIds?.includes(played.source)
    )).toBe(true);
  });
});
