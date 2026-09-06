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
    gameId: 'divine-mercy',
    seed: 'divine-mercy-seed',
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

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'graveyard' | 'discardPile',
  suffix: string,
): string {
  const instanceId = `divine-mercy-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Divine Mercy Action', () => {
  test('moves one opposing Graveyard card to Discard, then gains 2 Conviction', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'inquisition-divine-mercy',
      'hand',
      'source',
    );
    const target = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'graveyard',
      'target',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'divine_mercy_target',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(state.players.B.zones.graveyard).not.toContain(target);
    expect(state.players.B.zones.discardPile).toContain(target);
    expect(v070Conviction(state, 'A')).toBe(2);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();

    const recycled = state.events.find(event =>
      event.type === 'graveyard_card_recycled'
      && (event.payload as { purpose?: string })?.purpose === 'Divine Mercy'
    );
    const conviction = state.events.find(event =>
      event.type === 'conviction_changed'
      && (event.payload as { reason?: string })?.reason === 'Divine Mercy'
    );
    const resolved = state.events.find(event =>
      event.type === 'action_card_resolved'
      && (event.payload as { instanceId?: string })?.instanceId === source
    );

    expect(recycled).toBeDefined();
    expect(conviction).toBeDefined();
    expect(resolved).toBeDefined();
    expect(recycled!.index).toBeLessThan(conviction!.index);
    expect(conviction!.index).toBeLessThan(resolved!.index);
  });

  test('Conviction gain is capped at 4 after the Graveyard move succeeds', () => {
    let state = openingForA();
    gainV070Conviction(state, 'A', 3, 'setup');
    const source = inject(
      state,
      'A',
      'inquisition-divine-mercy',
      'hand',
      'source',
    );
    const target = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'graveyard',
      'target',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(v070Conviction(state, 'A')).toBe(4);
    expect(state.players.B.zones.discardPile).toContain(target);
    expect(state.events.some(event =>
      event.type === 'conviction_changed'
      && (event.payload as {
        reason?: string;
        requestedDelta?: number;
        delta?: number;
        capped?: boolean;
      })?.reason === 'Divine Mercy'
      && (event.payload as { requestedDelta?: number })?.requestedDelta === 2
      && (event.payload as { delta?: number })?.delta === 1
      && (event.payload as { capped?: boolean })?.capped === true
    )).toBe(true);
  });

  test('requires an opposing Graveyard card before spending the Action', () => {
    const state = openingForA();
    const source = inject(
      state,
      'A',
      'inquisition-divine-mercy',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in the opponent’s Graveyard/);

    expect(state.players.A.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(v070Conviction(state, 'A')).toBe(0);
  });

  test('an invalid target leaves the Divine Mercy choice pending and gains no Conviction', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'inquisition-divine-mercy',
      'hand',
      'source',
    );
    const valid = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'graveyard',
      'valid',
    );
    const invalid = inject(
      state,
      'B',
      'neutral-advance-guard',
      'discardPile',
      'invalid',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target',
      playerId: 'A',
      targetInstanceId: invalid,
    })).toThrow(/must target a card in the opponent’s Graveyard/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'divine_mercy_target',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
    });
    expect(state.players.B.zones.graveyard).toContain(valid);
    expect(v070Conviction(state, 'A')).toBe(0);
  });

  test('the target list is public because Graveyard cards are public', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'inquisition-divine-mercy',
      'hand',
      'source',
    );
    const first = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'graveyard',
      'first',
    );
    const second = inject(
      state,
      'B',
      'neutral-advance-guard',
      'graveyard',
      'second',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    const pending = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Divine Mercy'
    );
    expect(pending?.visibility).toBe('public');
    expect((pending?.payload as { targetInstanceIds?: string[] })
      ?.targetInstanceIds).toEqual([first, second]);
  });
});
