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
    gameId: 'neutral-hand-routing-actions',
    seed: 'neutral-hand-routing-actions-seed',
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

function moveExistingCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  target: 'discardPile' | 'hand',
): string {
  const player = state.players[playerId];
  const instanceId = player.zones.drawPile.shift()
    ?? player.zones.hand.shift()
    ?? player.zones.discardPile.shift();
  if (!instanceId) throw new Error(`${playerId} has no movable card.`);

  for (const zone of [
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones[target].push(instanceId);
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

describe('v0.7.0 Neutral Hand-routing Actions', () => {
  test('Second Line draws one, then routes the chosen Hand card to the top of Draw', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-reserves', 'second-line');
    const handBefore = [...state.players.B.zones.hand];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'hand_destination_target',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Second Line',
      destination: 'draw_top',
    }));
    expect(state.players.B.zones.hand.length).toBe(handBefore.length);
    expect(state.players.B.zones.hand).not.toContain(source);

    const target = state.players.B.zones.hand[0];
    state = reduceV070TurnAction(state, {
      type: 'choose_hand_destination_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.players.B.zones.drawPile[0]).toBe(target);
    expect(state.players.B.zones.hand).not.toContain(target);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
  });

  test('Tactical Planning draws two, then routes the chosen Hand card to the bottom of Draw', () => {
    let state = openingForB();
    const source = injectHandCard(
      state,
      'B',
      'neutral-tactical-planning',
      'tactical-planning',
    );
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand.length).toBe(handBefore + 1);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'hand_destination_target',
      purpose: 'Tactical Planning',
      destination: 'draw_bottom',
    }));

    const target = state.players.B.zones.hand.at(-1)!;
    state = reduceV070TurnAction(state, {
      type: 'choose_hand_destination_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.players.B.zones.drawPile.at(-1)).toBe(target);
    expect(state.players.B.zones.discardPile).toContain(source);
  });

  test('Salvage returns a chosen Discard card to Hand, then requires a Hand discard', () => {
    let state = openingForB();
    const recovered = moveExistingCard(state, 'B', 'discardPile');
    const source = injectHandCard(state, 'B', 'neutral-salvage', 'salvage');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'salvage_recovery_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target',
      playerId: 'B',
      targetInstanceId: recovered,
    });

    expect(state.players.B.zones.hand).toContain(recovered);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'hand_destination_target',
      purpose: 'Salvage',
      destination: 'discard',
    }));

    const discard = state.players.B.zones.hand.find(id => id !== recovered)!;
    state = reduceV070TurnAction(state, {
      type: 'choose_hand_destination_target',
      playerId: 'B',
      targetInstanceId: discard,
    });

    expect(state.players.B.zones.discardPile).toContain(discard);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.hand).toContain(recovered);
    expect(state.pendingActionCard).toBeNull();
  });

  test('Salvage cannot start without a pre-existing Discard target', () => {
    const state = openingForB();
    state.players.B.zones.drawPile.push(...state.players.B.zones.discardPile.splice(0));
    const source = injectHandCard(state, 'B', 'neutral-salvage', 'empty-salvage');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in your Discard Pile/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('an invalid Hand-routing target leaves the pending Action choice intact', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-reserves', 'invalid-target');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const invalid = state.players.B.zones.drawPile[0];
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_hand_destination_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/choose a card from your Hand/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'hand_destination_target',
      sourceActionInstanceId: source,
    }));
    expect(state.pendingActionCard?.instanceId).toBe(source);
  });

  test('routing a hidden Hand card into Draw does not reveal its identity publicly', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-reserves', 'hidden-routing');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    const target = state.players.B.zones.hand[0];
    state = reduceV070TurnAction(state, {
      type: 'choose_hand_destination_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    const publicEvent = state.events.find(event =>
      event.type === 'hand_card_routed_to_draw_pile'
      && (event.payload as { purpose?: string })?.purpose === 'Second Line'
    );
    expect(publicEvent?.visibility).toBe('public');
    expect((publicEvent?.payload as { instanceId?: string; cardId?: string })?.instanceId).toBeUndefined();
    expect((publicEvent?.payload as { instanceId?: string; cardId?: string })?.cardId).toBeUndefined();

    const privateEvent = state.events.find(event =>
      event.type === 'hand_card_routed_identity'
      && event.visibility === 'B'
    );
    expect((privateEvent?.payload as { instanceId?: string })?.instanceId).toBe(target);
  });

  test('Censure resolves before Second Line draws and opens its Hand-routing choice', () => {
    let state = openingForB();
    state.turnState!.actionsAvailable = 2;
    const source = injectHandCard(state, 'B', 'neutral-reserves', 'censured-second-line');
    const payment = injectHandCard(state, 'B', 'neutral-rallying-cry', 'censure-payment');
    const censure = injectOpposingCensure(state);
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingSanctionChoices).toHaveLength(1);

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'discard',
      discardInstanceId: payment,
    });

    expect(state.players.B.zones.discardPile).toContain(payment);
    expect(state.players.B.zones.hand.length).toBe(handBefore - 1);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'hand_destination_target',
      purpose: 'Second Line',
    }));
  });

  test('a mandatory Hand-routing step that has no target does not deadlock the turn', () => {
    let state = openingForB();
    const player = state.players.B;
    player.zones.drawPile = [];
    player.zones.discardPile = [];
    player.zones.graveyard = [];
    player.zones.hand = [];
    const source = injectHandCard(state, 'B', 'neutral-reserves', 'exhausted-second-line');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toHaveLength(0);
    expect(state.players.B.zones.discardPile).toEqual([source]);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.events.some(event =>
      event.type === 'action_effect_incomplete'
      && (event.payload as { reason?: string })?.reason === 'required_hand_target_unavailable'
    )).toBe(true);
  });
});
