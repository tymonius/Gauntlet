import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { gainV070Conviction, v070Conviction } from './inquisition';
import { reduceV070TurnAction } from './turn-engine';

const inquisitionStarter = 'inquisition-grand-inquisitor-final-judgment';
const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'penance',
    seed: 'penance-seed',
    players: {
      A: { name: 'Inquisition', starterDeckId: inquisitionStarter },
      B: { name: 'Military', starterDeckId: militaryStarter },
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

function injectHand(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `penance-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Penance Action', () => {
  test('the opponent may put one chosen Hand card in their Graveyard', () => {
    let state = openingForA();
    const source = injectHand(
      state,
      'A',
      'inquisition-penance',
      'source',
    );
    const payment = injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'payment',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'penance_choice',
      playerId: 'B',
      actionOwnerId: 'A',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_penance_choice',
      playerId: 'B',
      choice: 'hand_to_graveyard',
      handInstanceId: payment,
    });

    expect(state.players.B.zones.hand).not.toContain(payment);
    expect(state.players.B.zones.graveyard).toContain(payment);
    expect(v070Conviction(state, 'A')).toBe(0);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();

    expect(state.events.some(event =>
      event.type === 'card_graveyarded'
      && event.actor === 'B'
      && (event.payload as {
        instanceId?: string;
        causedBy?: string;
        purpose?: string;
      })?.instanceId === payment
      && (event.payload as { causedBy?: string })?.causedBy === 'A'
      && (event.payload as { purpose?: string })?.purpose === 'Penance'
    )).toBe(true);
  });

  test('the opponent may instead give the Inquisition player +1 Conviction', () => {
    let state = openingForA();
    const source = injectHand(
      state,
      'A',
      'inquisition-penance',
      'source',
    );
    const opponentCard = injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'untouched',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_penance_choice',
      playerId: 'B',
      choice: 'conviction',
    });

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.players.B.zones.hand).toContain(opponentCard);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'conviction_changed'
      && (event.payload as { reason?: string })?.reason === 'Penance'
      && (event.payload as { delta?: number })?.delta === 1
    )).toBe(true);
  });

  test('with no Hand cards, only the Conviction option is advertised and remains resolvable', () => {
    let state = openingForA();
    state.players.B.zones.drawPile.push(...state.players.B.zones.hand);
    state.players.B.zones.hand = [];

    const source = injectHand(
      state,
      'A',
      'inquisition-penance',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    const pendingEvent = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Penance'
    );
    expect((pendingEvent?.payload as { options?: string[] })?.options)
      .toEqual(['conviction']);

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_penance_choice',
      playerId: 'B',
      choice: 'hand_to_graveyard',
    })).toThrow(/choose one card from their Hand/);

    state = reduceV070TurnAction(state, {
      type: 'resolve_penance_choice',
      playerId: 'B',
      choice: 'conviction',
    });

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.pendingActionEffectChoice).toBeNull();
  });

  test('the Conviction option still resolves at the maximum and loses the excess gain', () => {
    let state = openingForA();
    gainV070Conviction(state, 'A', 4, 'setup');
    const source = injectHand(
      state,
      'A',
      'inquisition-penance',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_penance_choice',
      playerId: 'B',
      choice: 'conviction',
    });

    expect(v070Conviction(state, 'A')).toBe(4);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'conviction_changed'
      && (event.payload as {
        reason?: string;
        requestedDelta?: number;
        delta?: number;
        capped?: boolean;
      })?.reason === 'Penance'
      && (event.payload as { requestedDelta?: number })?.requestedDelta === 1
      && (event.payload as { delta?: number })?.delta === 0
      && (event.payload as { capped?: boolean })?.capped === true
    )).toBe(true);
  });

  test('an invalid Hand target leaves the opponent choice pending', () => {
    let state = openingForA();
    const source = injectHand(
      state,
      'A',
      'inquisition-penance',
      'source',
    );
    const valid = injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'valid',
    );
    const invalid = injectHand(
      state,
      'A',
      'neutral-advance-guard',
      'invalid',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_penance_choice',
      playerId: 'B',
      choice: 'hand_to_graveyard',
      handInstanceId: invalid,
    })).toThrow(/not in the opponent’s Hand/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'penance_choice',
      playerId: 'B',
      actionOwnerId: 'A',
      sourceActionInstanceId: source,
    });
    expect(state.players.B.zones.hand).toContain(valid);
    expect(v070Conviction(state, 'A')).toBe(0);
  });

  test('the public modal choice does not expose opposing Hand identities', () => {
    let state = openingForA();
    const source = injectHand(
      state,
      'A',
      'inquisition-penance',
      'source',
    );
    const secret = injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'secret',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    const pendingEvent = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Penance'
    );
    expect(pendingEvent?.visibility).toBe('public');
    expect(pendingEvent?.payload).not.toHaveProperty('targetInstanceIds');
    expect(JSON.stringify(pendingEvent?.payload)).not.toContain(secret);
  });
});
