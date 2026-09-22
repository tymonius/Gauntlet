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
    gameId: 'new-recruits-action',
    seed: 'new-recruits-action-seed',
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

describe('v0.7.0 New Recruits Action', () => {
  test('with no other Hand card, skips the discard and draws three', () => {
    let state = openingForB();
    state.players.B.zones.drawPile.push(...state.players.B.zones.hand.splice(0));
    const source = injectHandCard(state, 'B', 'neutral-new-recruits', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toHaveLength(3);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string; count?: number })?.purpose === 'New Recruits'
      && (event.payload as { count?: number })?.count === 3
    )).toBe(true);
  });

  test('discards one chosen other Hand card when able, then draws three', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-new-recruits', 'source');
    const target = state.players.B.zones.hand.find(id => id !== source)!;
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'hand_destination_target',
      purpose: 'New Recruits',
      destination: 'discard',
      drawAfter: 3,
    }));
    expect(state.players.B.zones.hand).not.toContain(source);

    state = reduceV070TurnAction(state, {
      type: 'choose_hand_destination_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.players.B.zones.discardPile).toContain(target);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.hand.length).toBe(handBefore + 1);
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string; count?: number })?.purpose === 'New Recruits'
      && (event.payload as { count?: number })?.count === 3
    )).toBe(true);
    expect(state.pendingActionCard).toBeNull();
  });

  test('the pending source card is not eligible as the required other-card discard', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-new-recruits', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_hand_destination_target',
      playerId: 'B',
      targetInstanceId: source,
    })).toThrow(/choose a card from your Hand/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'hand_destination_target',
      purpose: 'New Recruits',
    }));
  });

  test('if Censure removes the last other Hand card, New Recruits skips the discard and still draws three', () => {
    let state = openingForB();
    state.players.B.zones.drawPile.push(...state.players.B.zones.hand.splice(0));
    const source = injectHandCard(state, 'B', 'neutral-new-recruits', 'source');
    const payment = injectHandCard(state, 'B', 'neutral-rallying-cry', 'payment');
    const censure = injectOpposingCensure(state);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    expect(state.pendingSanctionChoices).toHaveLength(1);

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'discard',
      discardInstanceId: payment,
    });

    expect(state.players.B.zones.hand).toHaveLength(3);
    expect(state.players.B.zones.discardPile).toContain(payment);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string; count?: number })?.purpose === 'New Recruits'
      && (event.payload as { count?: number })?.count === 3
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'action_effect_incomplete'
      && (event.payload as { purpose?: string })?.purpose === 'New Recruits'
    )).toBe(false);
  });
});
