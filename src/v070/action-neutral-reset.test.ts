import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  associateV070Sanction,
  V070_SANCTIONS_CENSURE_ID,
} from './sanctions';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'neutral-reset-actions',
    seed: 'neutral-reset-actions-seed',
    players: {
      A: { name: 'Diplomat', starterDeckId: diplomatStarter },
      B: { name: 'Opponent', starterDeckId: militaryStarter },
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
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'B' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'B' });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner: playerId };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function injectOpposingCensure(state: V070GameState): string {
  const instanceId = `test-A-${V070_SANCTIONS_CENSURE_ID}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: V070_SANCTIONS_CENSURE_ID,
    owner: 'A',
  };
  state.players.A.zones.assetBank.push(instanceId);
  associateV070Sanction(state, {
    instanceId,
    owner: 'A',
    opponent: 'B',
    kind: 'asset',
  });
  return instanceId;
}

describe('v0.7.0 Neutral reset Actions', () => {
  test('Insurrection recycles both Discard Piles, redraws three, and grants one additional Action', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-insurrection', 'insurrection');
    const aReshufflesBefore = state.players.A.reshuffleCount;
    const bReshufflesBefore = state.players.B.reshuffleCount;

    expect(state.players.A.zones.discardPile.length).toBeGreaterThan(0);
    expect(state.players.B.zones.discardPile.length).toBeGreaterThan(0);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toHaveLength(3);
    expect(state.players.B.zones.hand).not.toContain(source);
    expect(state.players.B.zones.discardPile).toEqual([source]);
    expect(state.players.A.zones.discardPile).toHaveLength(0);
    expect(state.players.A.reshuffleCount).toBe(aReshufflesBefore + 1);
    expect(state.players.B.reshuffleCount).toBe(bReshufflesBefore + 1);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(1);
    expect(state.turnState?.phaseActionGrants.opening).toBe(1);
    expect(state.events.some(event =>
      event.type === 'additional_action_granted'
      && (event.payload as { purpose?: string })?.purpose === 'Insurrection'
    )).toBe(true);

    const followUp = state.players.B.zones.hand[0];
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: followUp,
    });
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken.opening).toBe(2);
  });

  test('Insurrection effect shuffling is deterministic for the same authoritative state', () => {
    const original = openingForB();
    const source = injectHandCard(original, 'B', 'neutral-insurrection', 'deterministic');
    const first = reduceV070TurnAction(original, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    const second = reduceV070TurnAction(original, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(second.players.A.zones.drawPile).toEqual(first.players.A.zones.drawPile);
    expect(second.players.B.zones.drawPile).toEqual(first.players.B.zones.drawPile);
    expect(second.players.B.zones.hand).toEqual(first.players.B.zones.hand);
  });

  test('Revolution exchanges hand sizes while the pending source card remains outside the discarded Hand', () => {
    let state = openingForB();
    injectHandCard(state, 'A', 'neutral-rallying-cry', 'extra-a');
    const source = injectHandCard(state, 'B', 'neutral-revolution', 'revolution');

    const aHandBefore = state.players.A.zones.hand.length;
    const bOtherHandBefore = state.players.B.zones.hand.length - 1;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toHaveLength(aHandBefore);
    expect(state.players.A.zones.hand).toHaveLength(bOtherHandBefore);
    expect(state.players.B.zones.hand).not.toContain(source);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(0);
  });

  test('Censure resolves before Revolution counts and discards the active player Hand', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-revolution', 'censured-revolution');
    const censure = injectOpposingCensure(state);
    const bOtherHandBefore = state.players.B.zones.hand.length - 1;
    const aHandBefore = state.players.A.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingSanctionChoices).toEqual([
      expect.objectContaining({
        sanctionInstanceId: censure,
        sourceActionInstanceId: source,
      }),
    ]);

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'draw',
    });

    // Censure adds one card before Revolution discards B's Hand, so A draws
    // one more card than B originally held apart from the Revolution source.
    expect(state.players.A.zones.hand).toHaveLength(bOtherHandBefore + 1);
    expect(state.players.B.zones.hand).toHaveLength(aHandBefore);
    expect(state.pendingActionCard).toBeNull();
  });
});
