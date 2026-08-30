import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'draw-zone-actions',
    seed: 'draw-zone-actions-seed',
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
  zone: 'hand' | 'drawPile' | 'discardPile',
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

describe('v0.7.0 Dark Omens Action', () => {
  test('draws two and restricts the Graveyard choice to those exact drawn cards', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'mystics-dark-omens',
      'hand',
      'source',
    );
    const drawn = state.players.B.zones.drawPile.slice(0, 2);
    const preexistingHand = state.players.B.zones.hand.find(id => id !== source)!;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'dark_omens_graveyard_target',
      playerId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: drawn,
    });
    expect(state.players.B.zones.hand).toEqual(expect.arrayContaining(drawn));

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_dark_omens_graveyard_target',
      playerId: 'B',
      targetInstanceId: preexistingHand,
    })).toThrow(/must choose one of the cards drawn by its Action/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'dark_omens_graveyard_target',
      candidateInstanceIds: drawn,
    }));

    state = reduceV070TurnAction(state, {
      type: 'choose_dark_omens_graveyard_target',
      playerId: 'B',
      targetInstanceId: drawn[0],
    });

    expect(state.players.B.zones.hand).not.toContain(drawn[0]);
    expect(state.players.B.zones.graveyard).toContain(drawn[0]);
    expect(state.players.B.zones.hand).toContain(drawn[1]);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
  });

  test('Dark Omens candidate identities are visible only to the acting player', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'mystics-dark-omens',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const authoritative = state.pendingActionEffectChoice;
    expect(authoritative?.kind).toBe('dark_omens_graveyard_target');
    const ownerView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');

    expect(ownerView.pendingActionEffectChoice).toEqual(authoritative);
    expect(opponentView.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'dark_omens_graveyard_target',
      playerId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: [],
    }));

    const publicPending = opponentView.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Dark Omens'
    );
    expect(publicPending?.payload).toEqual(expect.objectContaining({
      candidateCount: 2,
    }));
    expect(JSON.stringify(publicPending?.payload)).not.toContain('candidateInstanceIds');
  });

  test('when only one card can be drawn, Dark Omens automatically puts it in Graveyard', () => {
    let state = openingForB();
    const only = state.players.B.zones.drawPile[0];
    state.players.B.zones.drawPile = only ? [only] : [];
    state.players.B.zones.discardPile = [];
    const source = injectCard(
      state,
      'B',
      'mystics-dark-omens',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.graveyard).toContain(only);
    expect(state.players.B.zones.hand).not.toContain(only);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });
});

describe('v0.7.0 Act of Faith Action', () => {
  test('requires at least one card in the opponent Draw Pile before spending the Action', () => {
    const state = openingForB();
    state.players.A.zones.drawPile = [];
    const source = injectCard(
      state,
      'B',
      'inquisition-act-of-faith',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in the opponent’s Draw Pile/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('reveals up to three top cards, puts one chosen card in Graveyard, and discards the rest', () => {
    let state = openingForB();
    const revealed = state.players.A.zones.drawPile.slice(0, 3);
    const fourth = state.players.A.zones.drawPile[3];
    const source = injectCard(
      state,
      'B',
      'inquisition-act-of-faith',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.drawPile.slice(0, 3)).toEqual(revealed);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'act_of_faith_graveyard_target',
      playerId: 'B',
      opponentId: 'A',
      sourceActionInstanceId: source,
      revealedInstanceIds: revealed,
    });

    const revealEvent = state.events.find(event =>
      event.type === 'draw_pile_cards_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Act of Faith'
    );
    expect(revealEvent?.visibility).toBe('public');
    expect((revealEvent?.payload as { instanceIds?: string[] })?.instanceIds).toEqual(revealed);

    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_graveyard_target',
      playerId: 'B',
      targetInstanceId: revealed[1],
    });

    expect(state.players.A.zones.graveyard).toContain(revealed[1]);
    expect(state.players.A.zones.discardPile).toEqual(
      expect.arrayContaining([revealed[0], revealed[2]]),
    );
    expect(state.players.A.zones.drawPile[0]).toBe(fourth);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
  });

  test('Act of Faith never reshuffles to reach three revealed cards', () => {
    let state = openingForB();
    const topTwo = state.players.A.zones.drawPile.slice(0, 2);
    state.players.A.zones.drawPile = [...topTwo];
    const discardBefore = [...state.players.A.zones.discardPile];
    const reshufflesBefore = state.players.A.reshuffleCount;
    const source = injectCard(
      state,
      'B',
      'inquisition-act-of-faith',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'act_of_faith_graveyard_target',
      revealedInstanceIds: topTwo,
    }));
    expect(state.players.A.reshuffleCount).toBe(reshufflesBefore);
    expect(state.players.A.zones.discardPile).toEqual(discardBefore);
    expect(state.events.some(event =>
      event.type === 'discard_reshuffled'
      && event.actor === 'A'
      && (event.payload as { purpose?: string })?.purpose === 'Act of Faith'
    )).toBe(false);
  });

  test('with exactly one revealed card, Act of Faith automatically puts it in Graveyard', () => {
    let state = openingForB();
    const only = state.players.A.zones.drawPile[0];
    state.players.A.zones.drawPile = only ? [only] : [];
    const source = injectCard(
      state,
      'B',
      'inquisition-act-of-faith',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.drawPile).toHaveLength(0);
    expect(state.players.A.zones.graveyard).toContain(only);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });

  test('invalid Act of Faith choice leaves all revealed cards in place and preserves the pending choice', () => {
    let state = openingForB();
    const revealed = state.players.A.zones.drawPile.slice(0, 3);
    const invalid = state.players.A.zones.drawPile[3];
    const source = injectCard(
      state,
      'B',
      'inquisition-act-of-faith',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_graveyard_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/must choose one of the cards it revealed/);

    expect(state.players.A.zones.drawPile.slice(0, 3)).toEqual(revealed);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'act_of_faith_graveyard_target',
      revealedInstanceIds: revealed,
    }));
  });
});
