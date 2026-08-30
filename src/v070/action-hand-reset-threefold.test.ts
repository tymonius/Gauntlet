import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';
import {
  associateV070Sanction,
  V070_SANCTIONS_CENSURE_ID,
} from './sanctions';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'hand-reset-threefold-actions',
    seed: 'hand-reset-threefold-actions-seed',
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
  zone: 'hand' | 'drawPile' | 'discardPile' | 'assetBank',
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

describe('v0.7.0 Monetary Crisis Action', () => {
  test('discards both complete Hands before either player draws two', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'financiers-monetary-crisis',
      'hand',
      'source',
    );
    const aHandBefore = [...state.players.A.zones.hand];
    const bHandBefore = state.players.B.zones.hand.filter(id => id !== source);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.hand).toHaveLength(2);
    expect(state.players.B.zones.hand).toHaveLength(2);
    expect(state.players.B.zones.hand).not.toContain(source);
    expect(state.players.B.zones.discardPile).toContain(source);

    for (const instanceId of aHandBefore) {
      expect(state.players.A.zones.hand).not.toContain(instanceId);
      expect(
        state.players.A.zones.discardPile.includes(instanceId)
        || state.players.A.zones.drawPile.includes(instanceId),
      ).toBe(true);
    }
    for (const instanceId of bHandBefore) {
      expect(state.players.B.zones.hand).not.toContain(instanceId);
      expect(
        state.players.B.zones.discardPile.includes(instanceId)
        || state.players.B.zones.drawPile.includes(instanceId),
      ).toBe(true);
    }

    const discarded = state.events.find(event =>
      event.type === 'hands_discarded'
      && (event.payload as { purpose?: string })?.purpose === 'Monetary Crisis'
    );
    expect(discarded?.visibility).toBe('public');
    const players = (discarded?.payload as {
      players?: Array<{
        playerId: 'A' | 'B';
        cards: Array<{ instanceId: string; cardId: string }>;
      }>;
    })?.players;
    expect(players?.find(entry => entry.playerId === 'A')?.cards.map(card => card.instanceId))
      .toEqual(aHandBefore);
    expect(players?.find(entry => entry.playerId === 'B')?.cards.map(card => card.instanceId))
      .toEqual(bHandBefore);

    expect(state.events.filter(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string })?.purpose === 'Monetary Crisis'
    )).toHaveLength(2);
  });

  test('with empty Draw Piles, newly discarded Hands are available to the required reshuffles', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'financiers-monetary-crisis',
      'hand',
      'source',
    );

    state.players.A.zones.drawPile = [];
    state.players.B.zones.drawPile = [];
    state.players.A.zones.discardPile = [];
    state.players.B.zones.discardPile = [];

    const aHandBefore = [...state.players.A.zones.hand];
    const bHandBefore = state.players.B.zones.hand.filter(id => id !== source);
    expect(aHandBefore.length).toBeGreaterThanOrEqual(2);
    expect(bHandBefore.length).toBeGreaterThanOrEqual(2);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.hand).toHaveLength(2);
    expect(state.players.B.zones.hand).toHaveLength(2);
    expect(state.players.A.zones.hand.every(id => aHandBefore.includes(id))).toBe(true);
    expect(state.players.B.zones.hand.every(id => bHandBefore.includes(id))).toBe(true);
    expect(state.players.B.zones.hand).not.toContain(source);

    const reshuffles = state.events.filter(event =>
      event.type === 'discard_reshuffled'
      && (event.payload as { purpose?: string })?.purpose === 'Monetary Crisis'
    );
    expect(reshuffles.map(event => event.actor).sort()).toEqual(['A', 'B']);
  });

  test('drawn card identities remain private to each owner after the public Hand discard', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'financiers-monetary-crisis',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');

    const aPrivateDraws = aView.events.filter(event =>
      event.type === 'drawn_card_identity'
      && event.actor === 'A'
      && (event.payload as { purpose?: string })?.purpose === 'Monetary Crisis'
    );
    const bPrivateDraws = bView.events.filter(event =>
      event.type === 'drawn_card_identity'
      && event.actor === 'B'
      && (event.payload as { purpose?: string })?.purpose === 'Monetary Crisis'
    );
    expect(aPrivateDraws).toHaveLength(1);
    expect(bPrivateDraws).toHaveLength(1);

    expect(aView.events.some(event =>
      event.type === 'drawn_card_identity'
      && event.actor === 'B'
      && (event.payload as { purpose?: string })?.purpose === 'Monetary Crisis'
    )).toBe(false);
    expect(bView.events.some(event =>
      event.type === 'drawn_card_identity'
      && event.actor === 'A'
      && (event.payload as { purpose?: string })?.purpose === 'Monetary Crisis'
    )).toBe(false);
  });
});

describe('v0.7.0 Threefold Vision Action', () => {
  test('requires three cards already in Draw Pile and never reshuffles to manufacture look targets', () => {
    const state = openingForB();
    const topTwo = state.players.B.zones.drawPile.slice(0, 2);
    state.players.B.zones.drawPile = [...topTwo];
    injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'discardPile',
      'extra-discard',
    );
    const source = injectCard(
      state,
      'B',
      'mystics-threefold-vision',
      'hand',
      'source',
    );
    const reshufflesBefore = state.players.B.reshuffleCount;

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least three cards in your Draw Pile/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.players.B.reshuffleCount).toBe(reshufflesBefore);
  });

  test('looks privately at exactly the top three and redacts candidate identities from the opponent view', () => {
    let state = openingForB();
    const candidates = state.players.B.zones.drawPile.slice(0, 3);
    const source = injectCard(
      state,
      'B',
      'mystics-threefold-vision',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'threefold_vision_distribution',
      playerId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: candidates,
    });
    expect(state.players.B.zones.drawPile.slice(0, 3)).toEqual(candidates);

    const ownerView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(ownerView.pendingActionEffectChoice).toEqual(state.pendingActionEffectChoice);
    expect(opponentView.pendingActionEffectChoice).toEqual({
      kind: 'threefold_vision_distribution',
      playerId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: [],
    });

    const ownerLook = ownerView.events.find(event =>
      event.type === 'draw_pile_cards_looked_at'
      && (event.payload as { purpose?: string })?.purpose === 'Threefold Vision'
    );
    expect((ownerLook?.payload as { instanceIds?: string[] })?.instanceIds).toEqual(candidates);
    expect(opponentView.events.some(event =>
      event.type === 'draw_pile_cards_looked_at'
      && (event.payload as { purpose?: string })?.purpose === 'Threefold Vision'
    )).toBe(false);

    const publicPending = opponentView.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Threefold Vision'
    );
    expect(publicPending?.payload).toEqual(expect.objectContaining({
      candidateCount: 3,
    }));
    expect(JSON.stringify(publicPending?.payload)).not.toContain(candidates[0]);
  });

  test('requires a one-to-each-zone assignment of exactly the three looked-at cards', () => {
    let state = openingForB();
    const candidates = state.players.B.zones.drawPile.slice(0, 3);
    const outside = state.players.B.zones.drawPile[3];
    const source = injectCard(
      state,
      'B',
      'mystics-threefold-vision',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_threefold_vision_distribution',
      playerId: 'B',
      handInstanceId: candidates[0],
      discardInstanceId: candidates[0],
      graveyardInstanceId: candidates[2],
    })).toThrow(/assign three different cards/);

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_threefold_vision_distribution',
      playerId: 'B',
      handInstanceId: candidates[0],
      discardInstanceId: candidates[1],
      graveyardInstanceId: outside,
    })).toThrow(/assign exactly the three cards it looked at/);

    expect(state.players.B.zones.drawPile.slice(0, 3)).toEqual(candidates);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'threefold_vision_distribution',
      candidateInstanceIds: candidates,
    }));
  });

  test('routes one looked-at card to each zone while keeping the Hand identity owner-private', () => {
    let state = openingForB();
    const candidates = state.players.B.zones.drawPile.slice(0, 3);
    const fourth = state.players.B.zones.drawPile[3];
    const [toHand, toDiscard, toGraveyard] = candidates;
    const source = injectCard(
      state,
      'B',
      'mystics-threefold-vision',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_threefold_vision_distribution',
      playerId: 'B',
      handInstanceId: toHand,
      discardInstanceId: toDiscard,
      graveyardInstanceId: toGraveyard,
    });

    expect(state.players.B.zones.hand).toContain(toHand);
    expect(state.players.B.zones.discardPile).toContain(toDiscard);
    expect(state.players.B.zones.graveyard).toContain(toGraveyard);
    expect(state.players.B.zones.drawPile[0]).toBe(fourth);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');
    const publicRoute = aView.events.find(event =>
      event.type === 'threefold_vision_public_cards_routed'
    );
    expect(publicRoute?.payload).toEqual(expect.objectContaining({
      discardInstanceId: toDiscard,
      graveyardInstanceId: toGraveyard,
    }));
    expect(JSON.stringify(publicRoute?.payload)).not.toContain(toHand);

    const privateRoute = bView.events.find(event =>
      event.type === 'threefold_vision_hand_card_routed'
    );
    expect(privateRoute?.payload).toEqual(expect.objectContaining({
      handInstanceId: toHand,
    }));
    expect(aView.events.some(event =>
      event.type === 'threefold_vision_hand_card_routed'
    )).toBe(false);
  });

  test('if Censure draw leaves fewer than three Draw cards, Threefold Vision finishes without deadlocking', () => {
    let state = openingForB();
    const topThree = state.players.B.zones.drawPile.slice(0, 3);
    state.players.B.zones.drawPile = [...topThree];
    state.players.B.zones.discardPile = [];
    const source = injectCard(
      state,
      'B',
      'mystics-threefold-vision',
      'hand',
      'source',
    );
    const censure = injectCard(
      state,
      'A',
      V070_SANCTIONS_CENSURE_ID,
      'assetBank',
      'censure',
    );
    associateV070Sanction(state, {
      instanceId: censure,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });

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
      choice: 'draw',
    });

    expect(state.players.B.zones.drawPile).toHaveLength(2);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'action_effect_incomplete'
      && (event.payload as { purpose?: string; reason?: string })?.purpose === 'Threefold Vision'
      && (event.payload as { reason?: string })?.reason === 'required_draw_pile_cards_unavailable'
    )).toBe(true);
  });
});
