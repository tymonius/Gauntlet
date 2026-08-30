import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'opponent-hand-reveal-actions',
    seed: 'opponent-hand-reveal-actions-seed',
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

function injectCard(
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

describe('v0.7.0 Assassins Action', () => {
  test('requires a nonempty opponent Hand before spending the Action', () => {
    const state = openingForB();
    state.players.A.zones.hand = [];
    const source = injectCard(
      state,
      'B',
      'intelligence-assassins',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in the opponent’s Hand/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('reveals the entire opponent Hand, then discards one chosen revealed card', () => {
    let state = openingForB();
    const extra = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'hand',
      'extra',
    );
    const revealedBefore = [...state.players.A.zones.hand];
    const source = injectCard(
      state,
      'B',
      'intelligence-assassins',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const reveal = state.events.find(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Assassins'
    );
    expect(reveal?.visibility).toBe('public');
    expect(reveal?.payload).toEqual(expect.objectContaining({
      owner: 'A',
      purpose: 'Assassins',
      instanceIds: revealedBefore,
    }));
    expect((reveal?.payload as {
      cards?: Array<{ instanceId: string; cardId: string }>;
    })?.cards).toEqual(revealedBefore.map(instanceId => ({
      instanceId,
      cardId: state.cardInstances[instanceId].cardId,
    })));

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'opponent_hand_discard_target',
      playerId: 'B',
      opponentId: 'A',
      sourceActionInstanceId: source,
      purpose: 'Assassins',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_opponent_hand_discard_target',
      playerId: 'B',
      targetInstanceId: extra,
    });

    expect(state.players.A.zones.hand).not.toContain(extra);
    expect(state.players.A.zones.discardPile).toContain(extra);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();

    expect(state.events.some(event =>
      event.type === 'card_discarded'
      && (event.payload as { instanceId?: string; purpose?: string })?.instanceId === extra
      && (event.payload as { purpose?: string })?.purpose === 'Assassins'
    )).toBe(true);
  });

  test('invalid Assassins target leaves the revealed-Hand choice pending', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'intelligence-assassins',
      'hand',
      'source',
    );
    const invalid = state.players.A.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_opponent_hand_discard_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/must choose a card still in the opponent’s Hand/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'opponent_hand_discard_target',
      sourceActionInstanceId: source,
    }));
  });
});

describe('v0.7.0 Spies Action', () => {
  test('reveals the opponent Hand, draws one, then requires one own-Hand discard', () => {
    let state = openingForB();
    const opponentHand = [...state.players.A.zones.hand];
    const source = injectCard(
      state,
      'B',
      'intelligence-spies',
      'hand',
      'source',
    );
    const top = state.players.B.zones.drawPile[0];
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const reveal = state.events.find(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Spies'
    );
    expect(reveal?.payload).toEqual(expect.objectContaining({
      owner: 'A',
      instanceIds: opponentHand,
      purpose: 'Spies',
    }));

    expect(state.players.B.zones.hand).toContain(top);
    expect(state.players.B.zones.hand).not.toContain(source);
    expect(state.players.B.zones.hand.length).toBe(handBefore);

    const revealIndex = state.events.findIndex(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Spies'
    );
    const drawIndex = state.events.findIndex(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string })?.purpose === 'Spies'
    );
    expect(revealIndex).toBeGreaterThanOrEqual(0);
    expect(drawIndex).toBeGreaterThan(revealIndex);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'hand_destination_target',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Spies',
      destination: 'discard',
      drawAfter: 0,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_hand_destination_target',
      playerId: 'B',
      targetInstanceId: top,
    });

    expect(state.players.B.zones.hand).not.toContain(top);
    expect(state.players.B.zones.discardPile).toContain(top);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
  });

  test('Spies may reveal an empty opponent Hand and still resolve draw then discard', () => {
    let state = openingForB();
    state.players.A.zones.hand = [];
    const source = injectCard(
      state,
      'B',
      'intelligence-spies',
      'hand',
      'source',
    );
    const top = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const reveal = state.events.find(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Spies'
    );
    expect((reveal?.payload as { instanceIds?: string[] })?.instanceIds).toEqual([]);
    expect(state.players.B.zones.hand).toContain(top);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'hand_destination_target',
      purpose: 'Spies',
    }));
  });

  test('if no card can be drawn and no other Hand card exists, Spies finishes without deadlocking', () => {
    let state = openingForB();
    state.players.B.zones.drawPile = [];
    state.players.B.zones.discardPile = [];
    state.players.B.zones.hand = [];
    const source = injectCard(
      state,
      'B',
      'intelligence-spies',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toHaveLength(0);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string; count?: number })?.purpose === 'Spies'
      && (event.payload as { count?: number })?.count === 0
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'action_effect_incomplete'
      && (event.payload as { purpose?: string; reason?: string })?.purpose === 'Spies'
      && (event.payload as { reason?: string })?.reason === 'required_hand_target_unavailable'
    )).toBe(true);
  });
});
