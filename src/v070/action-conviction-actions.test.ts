import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  gainV070Conviction,
  v070Conviction,
} from './inquisition';

const inquisitionStarter = 'inquisition-grand-inquisitor-final-judgment';
const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'conviction-actions',
    seed: 'conviction-actions-seed',
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

function clearHandToDraw(
  state: V070GameState,
  playerId: 'A' | 'B',
): void {
  state.players[playerId].zones.drawPile.push(
    ...state.players[playerId].zones.hand,
  );
  state.players[playerId].zones.hand = [];
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'drawPile' | 'discardPile' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `conviction-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Burning at the Stake Action', () => {
  test('automatically graveyards the unique highest-value Hand card and gains Conviction if it is Arcane', () => {
    let state = openingForA();
    clearHandToDraw(state, 'B');
    const low = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'low',
    );
    const highest = inject(
      state,
      'B',
      'inquisition-heresy',
      'hand',
      'highest',
    );
    const source = inject(
      state,
      'A',
      'inquisition-burning-at-the-stake',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toContain(low);
    expect(state.players.B.zones.hand).not.toContain(highest);
    expect(state.players.B.zones.graveyard).toContain(highest);
    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();

    const reveal = state.events.find(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose
        === 'Burning at the Stake'
    );
    const moved = state.events.find(event =>
      event.type === 'hand_card_graveyarded'
      && (event.payload as { instanceId?: string })?.instanceId === highest
    );
    const conviction = state.events.find(event =>
      event.type === 'conviction_changed'
      && (event.payload as { reason?: string })?.reason
        === 'Burning at the Stake'
    );
    expect(reveal).toBeDefined();
    expect(moved).toBeDefined();
    expect(conviction).toBeDefined();
    expect(reveal!.index).toBeLessThan(moved!.index);
    expect(moved!.index).toBeLessThan(conviction!.index);
  });

  test('ties at the highest card value create a public active-player choice', () => {
    let state = openingForA();
    clearHandToDraw(state, 'B');
    const first = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'first',
    );
    const second = inject(
      state,
      'B',
      'mystics-fate-s-toll',
      'hand',
      'second',
    );
    inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'low',
    );
    const source = inject(
      state,
      'A',
      'inquisition-burning-at-the-stake',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'burning_at_stake_tie',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: [first, second],
    });

    const pending = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose
        === 'Burning at the Stake'
    );
    expect(pending?.visibility).toBe('public');
    expect((pending?.payload as { targetInstanceIds?: string[] })
      ?.targetInstanceIds).toEqual([first, second]);

    state = reduceV070TurnAction(state, {
      type: 'choose_burning_at_stake_target',
      playerId: 'A',
      targetInstanceId: second,
    });

    expect(state.players.B.zones.graveyard).toContain(second);
    expect(state.players.B.zones.hand).toContain(first);
    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.pendingActionCard).toBeNull();
  });

  test('an invalid tied target preserves the pending choice', () => {
    let state = openingForA();
    clearHandToDraw(state, 'B');
    const first = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'first',
    );
    const second = inject(
      state,
      'B',
      'mystics-fate-s-toll',
      'hand',
      'second',
    );
    const low = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'low',
    );
    const source = inject(
      state,
      'A',
      'inquisition-burning-at-the-stake',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_burning_at_stake_target',
      playerId: 'A',
      targetInstanceId: low,
    })).toThrow(/tied highest-value cards/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'burning_at_stake_tie',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: [first, second],
    });
  });

  test('an empty opposing Hand reveals normally and then resolves with no target', () => {
    let state = openingForA();
    clearHandToDraw(state, 'B');
    const source = inject(
      state,
      'A',
      'inquisition-burning-at-the-stake',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionCard).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(v070Conviction(state, 'A')).toBe(0);
    expect(state.events.some(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose
        === 'Burning at the Stake'
    )).toBe(true);
  });
});

describe('v0.7.0 Hellfire Action', () => {
  test('spends the chosen Conviction and graveyards that many existing top Draw cards without reshuffling', () => {
    let state = openingForA();
    gainV070Conviction(state, 'A', 3, 'setup');
    state.players.B.zones.drawPile = [];
    const first = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'drawPile',
      'first',
    );
    const second = inject(
      state,
      'B',
      'neutral-advance-guard',
      'drawPile',
      'second',
    );
    const third = inject(
      state,
      'B',
      'neutral-fealty',
      'drawPile',
      'third',
    );
    const source = inject(
      state,
      'A',
      'inquisition-hellfire',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'hellfire_conviction_amount',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
      maximum: 3,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_hellfire_amount',
      playerId: 'A',
      amount: 2,
    });

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.players.B.zones.graveyard).toEqual(
      expect.arrayContaining([first, second]),
    );
    expect(state.players.B.zones.drawPile).toEqual([third]);
    expect(state.players.B.reshuffleCount).toBe(0);
    expect(state.players.A.zones.discardPile).toContain(source);
  });

  test('if fewer Draw cards exist than Conviction spent, Hellfire does not reshuffle the opponent Discard Pile', () => {
    let state = openingForA();
    gainV070Conviction(state, 'A', 4, 'setup');
    state.players.B.zones.drawPile = [];
    state.players.B.zones.discardPile = [];
    const only = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'drawPile',
      'only',
    );
    const discard = inject(
      state,
      'B',
      'neutral-fealty',
      'discardPile',
      'discard',
    );
    const source = inject(
      state,
      'A',
      'inquisition-hellfire',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_hellfire_amount',
      playerId: 'A',
      amount: 3,
    });

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.players.B.zones.graveyard).toContain(only);
    expect(state.players.B.zones.discardPile).toContain(discard);
    expect(state.players.B.zones.drawPile).toEqual([]);
    expect(state.players.B.reshuffleCount).toBe(0);

    const resolved = state.events.find(event =>
      event.type === 'hellfire_resolved'
    );
    expect(resolved?.payload).toEqual(expect.objectContaining({
      convictionSpent: 3,
      requestedCardCount: 3,
      graveyardedInstanceIds: [only],
      exhausted: true,
    }));
  });

  test('with 0 Conviction, Hellfire resolves immediately for 0 without opening a meaningless choice', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'inquisition-hellfire',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(v070Conviction(state, 'A')).toBe(0);
    expect(state.players.A.zones.discardPile).toContain(source);
  });

  test('an invalid Conviction amount leaves the Hellfire choice pending', () => {
    let state = openingForA();
    gainV070Conviction(state, 'A', 2, 'setup');
    const source = inject(
      state,
      'A',
      'inquisition-hellfire',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_hellfire_amount',
      playerId: 'A',
      amount: 3,
    })).toThrow(/from 0 to 2/);

    expect(v070Conviction(state, 'A')).toBe(2);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'hellfire_conviction_amount',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
      maximum: 2,
    });
  });
});

describe('v0.7.0 Penance Action', () => {
  test('the opponent may put one chosen Hand card in their Graveyard', () => {
    let state = openingForA();
    clearHandToDraw(state, 'B');
    const sacrifice = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'sacrifice',
    );
    const source = inject(
      state,
      'A',
      'inquisition-penance',
      'hand',
      'source',
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
      choice: 'graveyard',
      cardInstanceId: sacrifice,
    });

    expect(state.players.B.zones.hand).not.toContain(sacrifice);
    expect(state.players.B.zones.graveyard).toContain(sacrifice);
    expect(v070Conviction(state, 'A')).toBe(0);
    expect(state.players.A.zones.discardPile).toContain(source);
  });

  test('the opponent may instead give the Inquisition +1 Conviction', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'inquisition-penance',
      'hand',
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

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.pendingActionCard).toBeNull();
  });

  test('an empty opposing Hand automatically resolves to +1 Conviction', () => {
    let state = openingForA();
    clearHandToDraw(state, 'B');
    const source = inject(
      state,
      'A',
      'inquisition-penance',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.events.some(event =>
      event.type === 'penance_resolved'
      && (event.payload as { automatic?: boolean })?.automatic === true
    )).toBe(true);
  });

  test('the Conviction choice remains legal at the cap and simply gains no excess Conviction', () => {
    let state = openingForA();
    gainV070Conviction(state, 'A', 4, 'setup');
    const source = inject(
      state,
      'A',
      'inquisition-penance',
      'hand',
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
    expect(state.pendingActionCard).toBeNull();
  });
});
