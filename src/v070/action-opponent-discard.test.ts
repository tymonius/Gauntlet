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
    gameId: 'opponent-discard-actions',
    seed: 'opponent-discard-actions-seed',
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
  zone: 'hand' | 'discardPile' | 'graveyard',
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

describe('v0.7.0 Guilt by Association Action', () => {
  test('requires a card in the opponent Discard Pile before spending the Action', () => {
    const state = openingForB();
    state.players.A.zones.drawPile.push(...state.players.A.zones.discardPile.splice(0));
    const source = injectCard(
      state,
      'B',
      'inquisition-guilt-by-association',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in the opponent’s Discard Pile/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('moves every opponent Discard card with the chosen title to Graveyard', () => {
    let state = openingForB();
    state.players.A.zones.discardPile = [];
    const first = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'rally-1',
    );
    const second = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'rally-2',
    );
    const other = injectCard(
      state,
      'A',
      'neutral-fortifications',
      'discardPile',
      'other',
    );
    const source = injectCard(
      state,
      'B',
      'inquisition-guilt-by-association',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'guilt_by_association_target',
      playerId: 'B',
      opponentId: 'A',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_guilt_by_association_target',
      playerId: 'B',
      targetInstanceId: first,
    });

    expect(state.players.A.zones.discardPile).toEqual([other]);
    expect(state.players.A.zones.graveyard).toEqual(expect.arrayContaining([first, second]));
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();

    expect(state.events.some(event =>
      event.type === 'discard_title_cards_graveyarded'
      && (event.payload as { cardId?: string; count?: number })?.cardId === 'neutral-rallying-cry'
      && (event.payload as { count?: number })?.count === 2
    )).toBe(true);
  });

  test('invalid title target leaves the choice pending', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'inquisition-guilt-by-association',
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
      type: 'choose_guilt_by_association_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/must target a card in the opponent’s Discard Pile/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'guilt_by_association_target',
      sourceActionInstanceId: source,
    }));
  });
});

describe('v0.7.0 Excommunication Action', () => {
  test('requires at least one eligible opponent Discard card before spending the Action', () => {
    const state = openingForB();
    state.players.A.zones.drawPile.push(...state.players.A.zones.discardPile.splice(0));
    const source = injectCard(
      state,
      'B',
      'inquisition-excommunication',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one opposing Discard card/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('moves one or more chosen cards with combined value exactly 5 to Graveyard', () => {
    let state = openingForB();
    state.players.A.zones.discardPile = [];
    const four = injectCard(
      state,
      'A',
      'neutral-armistice',
      'discardPile',
      'value-4',
    );
    const one = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'value-1',
    );
    const keep = injectCard(
      state,
      'A',
      'neutral-fortifications',
      'discardPile',
      'keep',
    );
    const source = injectCard(
      state,
      'B',
      'inquisition-excommunication',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'excommunication_targets',
      playerId: 'B',
      opponentId: 'A',
      sourceActionInstanceId: source,
      maxCombinedValue: 5,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_excommunication_targets',
      playerId: 'B',
      targetInstanceIds: [four, one],
    });

    expect(state.players.A.zones.discardPile).toEqual([keep]);
    expect(state.players.A.zones.graveyard).toEqual(expect.arrayContaining([four, one]));
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'discard_cards_graveyarded'
      && (event.payload as { purpose?: string; combinedValue?: number })?.purpose === 'Excommunication'
      && (event.payload as { combinedValue?: number })?.combinedValue === 5
    )).toBe(true);
  });

  test('rejects a selection with combined value above 5 without moving cards', () => {
    let state = openingForB();
    state.players.A.zones.discardPile = [];
    const four = injectCard(
      state,
      'A',
      'neutral-armistice',
      'discardPile',
      'value-4',
    );
    const three = injectCard(
      state,
      'A',
      'neutral-fortifications',
      'discardPile',
      'value-3',
    );
    const source = injectCard(
      state,
      'B',
      'inquisition-excommunication',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_excommunication_targets',
      playerId: 'B',
      targetInstanceIds: [four, three],
    })).toThrow(/combined card value 7; maximum is 5/);

    expect(state.players.A.zones.discardPile).toEqual([four, three]);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'excommunication_targets',
      sourceActionInstanceId: source,
    }));
  });

  test('rejects empty, duplicate, or non-Discard selections', () => {
    let state = openingForB();
    const target = state.players.A.zones.discardPile[0];
    const invalid = state.players.A.zones.drawPile[0];
    const source = injectCard(
      state,
      'B',
      'inquisition-excommunication',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_excommunication_targets',
      playerId: 'B',
      targetInstanceIds: [],
    })).toThrow(/requires one or more different cards/);

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_excommunication_targets',
      playerId: 'B',
      targetInstanceIds: [target, target],
    })).toThrow(/requires one or more different cards/);

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_excommunication_targets',
      playerId: 'B',
      targetInstanceIds: [invalid],
    })).toThrow(/must be in the opponent’s Discard Pile/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'excommunication_targets',
      sourceActionInstanceId: source,
    }));
  });
});
