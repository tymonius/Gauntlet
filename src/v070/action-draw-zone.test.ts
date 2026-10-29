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
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'act_of_faith_reveal_count',
      playerId: 'B',
      opponentId: 'A',
      sourceActionInstanceId: source,
      maximumRevealCount: 3,
    });
    expect(state.events.some(event =>
      event.type === 'draw_pile_cards_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Act of Faith'
    )).toBe(false);
    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count',
      playerId: 'B',
      revealCount: 3,
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
    expect((revealEvent?.payload as {
      cards?: Array<{ instanceId: string; cardId: string }>;
    })?.cards).toEqual(revealed.map(instanceId => ({
      instanceId,
      cardId: state.cardInstances[instanceId].cardId,
    })));

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
      kind: 'act_of_faith_reveal_count',
      maximumRevealCount: 2,
    }));
    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count',
      playerId: 'B',
      revealCount: 2,
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
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'act_of_faith_reveal_count',
      maximumRevealCount: 1,
    }));
    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count',
      playerId: 'B',
      revealCount: 1,
    });

    expect(state.players.A.zones.drawPile).toHaveLength(0);
    expect(state.players.A.zones.graveyard).toContain(only);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });

  test('zero-card choice resolves without revealing or moving opposing cards', () => {
    let state = openingForB();
    const original = [...state.players.A.zones.drawPile];
    const source = injectCard(state, 'B', 'inquisition-act-of-faith', 'hand', 'zero');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card', playerId: 'B', cardInstanceId: source,
    });
    expect(state.pendingActionEffectChoice?.kind).toBe('act_of_faith_reveal_count');
    expect(() => reduceV070TurnAction(state, {
      type: 'pass_opening', playerId: 'B',
    })).toThrow(/pending printed Action effect choice/);
    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count', playerId: 'B', revealCount: 0,
    });
    expect(state.players.A.zones.drawPile).toEqual(original);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.events.some(event => event.type === 'draw_pile_cards_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Act of Faith')).toBe(false);
    expect(state.events.some(event =>
      event.type === 'act_of_faith_action_reveal_declined')).toBe(true);
  });

  test('two-card choice from a larger Draw Pile leaves the third card untouched', () => {
    let state = openingForB();
    const firstTwo = state.players.A.zones.drawPile.slice(0, 2);
    const third = state.players.A.zones.drawPile[2];
    const source = injectCard(state, 'B', 'inquisition-act-of-faith', 'hand', 'two');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card', playerId: 'B', cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count', playerId: 'B', revealCount: 2,
    });
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'act_of_faith_graveyard_target',
      revealedInstanceIds: firstTwo,
    }));
    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_graveyard_target',
      playerId: 'B', targetInstanceId: firstTwo[0],
    });
    expect(state.players.A.zones.drawPile[0]).toBe(third);
    expect(state.players.A.zones.graveyard).toContain(firstTwo[0]);
    expect(state.players.A.zones.discardPile).toContain(firstTwo[1]);
  });

  test('rejects unauthorized, noninteger, negative, and excess reveal counts atomically', () => {
    let state = openingForB();
    const source = injectCard(state, 'B', 'inquisition-act-of-faith', 'hand', 'invalid');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card', playerId: 'B', cardInstanceId: source,
    });
    const initial = [...state.players.A.zones.drawPile];
    for (const revealCount of [-1, 4, 1.5, Number.NaN]) {
      expect(() => reduceV070TurnAction(state, {
        type: 'choose_act_of_faith_reveal_count',
        playerId: 'B',
        revealCount,
      })).toThrow(/may reveal from zero/);
    }
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count',
      playerId: 'A',
      revealCount: 1,
    })).toThrow();
    expect(state.players.A.zones.drawPile).toEqual(initial);
    expect(state.pendingActionEffectChoice?.kind).toBe('act_of_faith_reveal_count');
    expect(state.events.some(event =>
      event.type === 'draw_pile_cards_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Act of Faith')).toBe(false);
  });

  test('rejects stale Draw Pile count and reordered revealed top cards', () => {
    let state = openingForB();
    const source = injectCard(state, 'B', 'inquisition-act-of-faith', 'hand', 'stale');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card', playerId: 'B', cardInstanceId: source,
    });
    // Simulate a stale/externally mutated pending state.
    state.players.A.zones.drawPile = state.players.A.zones.drawPile.slice(0, 1);
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count',
      playerId: 'B', revealCount: 2,
    })).toThrow(/no longer has enough Draw Pile cards/);
    expect(state.pendingActionEffectChoice?.kind).toBe('act_of_faith_reveal_count');
    // Fresh count selection snapshots the exact revealed top cards.
    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count',
      playerId: 'B', revealCount: 1,
    });
    expect(state.pendingActionEffectChoice).toBeNull();

    let reordered = openingForB();
    const secondSource = injectCard(
      reordered, 'B', 'inquisition-act-of-faith', 'hand', 'stale-reorder',
    );
    reordered = reduceV070TurnAction(reordered, {
      type: 'play_action_card', playerId: 'B', cardInstanceId: secondSource,
    });
    reordered = reduceV070TurnAction(reordered, {
      type: 'choose_act_of_faith_reveal_count', playerId: 'B', revealCount: 2,
    });
    const choice = reordered.pendingActionEffectChoice;
    expect(choice?.kind).toBe('act_of_faith_graveyard_target');
    if (!choice || choice.kind !== 'act_of_faith_graveyard_target') {
      throw new Error('Act of Faith did not open its Graveyard choice.');
    }
    const top = choice.revealedInstanceIds;
    [reordered.players.A.zones.drawPile[0], reordered.players.A.zones.drawPile[1]] = [
      reordered.players.A.zones.drawPile[1],
      reordered.players.A.zones.drawPile[0],
    ];
    expect(() => reduceV070TurnAction(reordered, {
      type: 'choose_act_of_faith_graveyard_target',
      playerId: 'B',
      targetInstanceId: top[0],
    })).toThrow(/no longer on top/);
    expect(reordered.pendingActionEffectChoice?.kind).toBe('act_of_faith_graveyard_target');
    expect(reordered.players.A.zones.graveyard).not.toContain(top[0]);
  });

  test('count choice reveals no hidden Draw Pile identities in either player view', () => {
    let state = openingForB();
    const source = injectCard(state, 'B', 'inquisition-act-of-faith', 'hand', 'privacy');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card', playerId: 'B', cardInstanceId: source,
    });
    const ownerView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');
    for (const view of [ownerView, opponentView]) {
      expect(view.pendingActionEffectChoice).toEqual(expect.objectContaining({
        kind: 'act_of_faith_reveal_count',
        maximumRevealCount: 3,
      }));
      expect(JSON.stringify(view.pendingActionEffectChoice)).not.toContain('revealedInstanceIds');
      expect(view.events.some(event =>
        event.type === 'draw_pile_cards_revealed'
        && (event.payload as { purpose?: string })?.purpose === 'Act of Faith')).toBe(false);
    }
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
    state = reduceV070TurnAction(state, {
      type: 'choose_act_of_faith_reveal_count',
      playerId: 'B',
      revealCount: 3,
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
