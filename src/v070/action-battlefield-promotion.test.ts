import { describe, expect, test } from 'vitest';
import {
  appendV070Event,
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';

const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'battlefield-promotion',
    seed: 'battlefield-promotion-seed',
    players: {
      A: { name: 'A', starterDeckId: militaryStarter },
      B: { name: 'B', starterDeckId: militaryStarter },
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
    value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function advanceToDenouement(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'hold',
  });
  expect(state.turnState?.phase).toBe('denouement');
  return state;
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'discardPile',
  suffix: string,
): string {
  const instanceId = `promotion-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function recordCompletedBattle(
  state: V070GameState,
  winner: 'A' | 'B',
  tactics: Partial<Record<'A' | 'B', readonly string[]>>,
  suffix: string,
): void {
  appendV070Event(state, {
    type: 'battle_initiated',
    actor: 'A',
    visibility: 'public',
    payload: {
      attacker: 'A',
      defender: 'B',
      contestedPosition: 2,
      fixture: suffix,
    },
  });

  for (const playerId of ['A', 'B'] as const) {
    for (const instanceId of tactics[playerId] ?? []) {
      appendV070Event(state, {
        type: 'tactic_revealed',
        actor: playerId,
        visibility: 'public',
        payload: {
          instanceId,
          cardId: state.cardInstances[instanceId]?.cardId,
          fixture: suffix,
        },
      });
    }
  }

  appendV070Event(state, {
    type: 'battle_outcome',
    visibility: 'public',
    payload: {
      winner,
      loser: winner === 'A' ? 'B' : 'A',
      method: 'total',
      tiebreakRounds: 0,
      fixture: suffix,
    },
  });
  appendV070Event(state, {
    type: 'battle_aftermath_complete',
    visibility: 'public',
    payload: {
      positions: { A: 2, B: 3 },
      fixture: suffix,
    },
  });
}

describe('v0.7.0 Battlefield Promotion Action', () => {
  test('returns one Tactic chosen in a battle won this turn from Discard to Hand', () => {
    let state = openingForA();
    const tactic = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'won-tactic',
    );
    recordCompletedBattle(state, 'A', { A: [tactic] }, 'won');
    state = advanceToDenouement(state);

    const source = inject(
      state,
      'A',
      'military-battlefield-promotion',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'battlefield_promotion_target',
      playerId: 'A',
      sourceActionInstanceId: source,
      candidateInstanceIds: [tactic],
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_battlefield_promotion_target',
      playerId: 'A',
      targetInstanceId: tactic,
    });

    expect(state.players.A.zones.discardPile).not.toContain(tactic);
    expect(state.players.A.zones.hand).toContain(tactic);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });

  test('Tactics from battles the player lost are not eligible', () => {
    let state = openingForA();
    const lostTactic = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'lost-tactic',
    );
    const wonTactic = inject(
      state,
      'A',
      'neutral-advance-guard',
      'discardPile',
      'won-tactic',
    );
    recordCompletedBattle(state, 'B', { A: [lostTactic] }, 'lost');
    recordCompletedBattle(state, 'A', { A: [wonTactic] }, 'won');
    state = advanceToDenouement(state);

    const source = inject(
      state,
      'A',
      'military-battlefield-promotion',
      'hand',
      'source',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'battlefield_promotion_target',
      playerId: 'A',
      sourceActionInstanceId: source,
      candidateInstanceIds: [wonTactic],
    });
    expect(
      (state.pendingActionEffectChoice as {
        candidateInstanceIds: string[];
      }).candidateInstanceIds,
    ).not.toContain(lostTactic);
  });

  test('multiple won battles contribute their still-discarded chosen Tactics in battle order', () => {
    let state = openingForA();
    const first = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'first',
    );
    const second = inject(
      state,
      'A',
      'neutral-advance-guard',
      'discardPile',
      'second',
    );
    recordCompletedBattle(state, 'A', { A: [first] }, 'first');
    recordCompletedBattle(state, 'A', { A: [second] }, 'second');
    state = advanceToDenouement(state);

    const source = inject(
      state,
      'A',
      'military-battlefield-promotion',
      'hand',
      'source',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'battlefield_promotion_target',
      playerId: 'A',
      sourceActionInstanceId: source,
      candidateInstanceIds: [first, second],
    });
  });

  test('a qualifying Tactic that has left Discard is no longer a legal target', () => {
    let state = openingForA();
    const tactic = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'moved',
    );
    recordCompletedBattle(state, 'A', { A: [tactic] }, 'won');

    state.players.A.zones.discardPile =
      state.players.A.zones.discardPile.filter(id => id !== tactic);
    state.players.A.zones.hand.push(tactic);
    state = advanceToDenouement(state);

    const source = inject(
      state,
      'A',
      'military-battlefield-promotion',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/requires a Tactic you chose in a battle you won this turn/);

    expect(state.players.A.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Battlefield Promotion is Denouement-only', () => {
    const state = openingForA();
    const tactic = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'won-tactic',
    );
    recordCompletedBattle(state, 'A', { A: [tactic] }, 'won');
    const source = inject(
      state,
      'A',
      'military-battlefield-promotion',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/only during Denouement/);

    expect(state.players.A.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('an invalid target leaves the Promotion choice pending', () => {
    let state = openingForA();
    const tactic = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'won-tactic',
    );
    const invalid = inject(
      state,
      'A',
      'neutral-advance-guard',
      'discardPile',
      'invalid',
    );
    recordCompletedBattle(state, 'A', { A: [tactic] }, 'won');
    state = advanceToDenouement(state);

    const source = inject(
      state,
      'A',
      'military-battlefield-promotion',
      'hand',
      'source',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_battlefield_promotion_target',
      playerId: 'A',
      targetInstanceId: invalid,
    })).toThrow(/must target a Tactic chosen in a battle you won this turn/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'battlefield_promotion_target',
      playerId: 'A',
      sourceActionInstanceId: source,
      candidateInstanceIds: [tactic],
    });
  });
});
