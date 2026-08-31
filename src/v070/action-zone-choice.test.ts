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
    gameId: 'zone-choice-actions',
    seed: 'zone-choice-actions-seed',
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
  zone: 'hand' | 'discardPile' | 'graveyard' | 'assetBank',
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

describe('v0.7.0 Soul for Soul Action', () => {
  test('requires one other Hand card and one Graveyard card before spending the Action', () => {
    const state = openingForB();
    state.players.B.zones.drawPile.push(...state.players.B.zones.hand.splice(0));
    state.players.B.zones.graveyard = [];
    const source = injectCard(
      state,
      'B',
      'mystics-soul-for-soul',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires one other card in your Hand/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('exchanges one chosen Hand card with one chosen Graveyard card simultaneously', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'mystics-soul-for-soul',
      'hand',
      'source',
    );
    const handTarget = state.players.B.zones.hand.find(id => id !== source)!;
    const graveTarget = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'graveyard',
      'grave-target',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'soul_for_soul_targets',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_soul_for_soul_targets',
      playerId: 'B',
      handInstanceId: handTarget,
      graveyardInstanceId: graveTarget,
    });

    expect(state.players.B.zones.hand).toContain(graveTarget);
    expect(state.players.B.zones.hand).not.toContain(handTarget);
    expect(state.players.B.zones.graveyard).toContain(handTarget);
    expect(state.players.B.zones.graveyard).not.toContain(graveTarget);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();

    expect(state.events.some(event =>
      event.type === 'hand_graveyard_cards_exchanged'
      && (event.payload as { handToGraveyardInstanceId?: string })?.handToGraveyardInstanceId === handTarget
      && (event.payload as { graveyardToHandInstanceId?: string })?.graveyardToHandInstanceId === graveTarget
    )).toBe(true);
  });

  test('invalid exchange targets leave the pending choice intact', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'mystics-soul-for-soul',
      'hand',
      'source',
    );
    const graveTarget = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'graveyard',
      'grave-target',
    );
    const invalidHand = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_soul_for_soul_targets',
      playerId: 'B',
      handInstanceId: invalidHand,
      graveyardInstanceId: graveTarget,
    })).toThrow(/choose one card from your Hand/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'soul_for_soul_targets',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
    expect(state.pendingActionCard?.instanceId).toBe(source);
  });

  test('if Censure consumes the last other Hand card, the exchange does not deadlock', () => {
    let state = openingForB();
    state.players.B.zones.drawPile.push(...state.players.B.zones.hand.splice(0));
    const source = injectCard(
      state,
      'B',
      'mystics-soul-for-soul',
      'hand',
      'source',
    );
    const payment = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'payment',
    );
    injectCard(
      state,
      'B',
      'neutral-fortifications',
      'graveyard',
      'grave-target',
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
      choice: 'discard',
      discardInstanceId: payment,
    });

    expect(state.players.B.zones.hand).toHaveLength(0);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'action_effect_incomplete'
      && (event.payload as { purpose?: string; reason?: string })?.purpose === 'Soul for Soul'
      && (event.payload as { reason?: string })?.reason === 'required_exchange_target_unavailable'
    )).toBe(true);
  });
});

describe('v0.7.0 Accusation Action', () => {
  test('requires a card in the opponent Discard Pile before spending the Action', () => {
    const state = openingForB();
    state.players.A.zones.drawPile.push(...state.players.A.zones.discardPile.splice(0));
    const source = injectCard(
      state,
      'B',
      'inquisition-accusation',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/opponent’s Discard Pile/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('active player chooses the Discard card, then the opponent may put it on top of Draw', () => {
    let state = openingForB();
    const target = state.players.A.zones.discardPile[0];
    const source = injectCard(
      state,
      'B',
      'inquisition-accusation',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'accusation_target',
      playerId: 'B',
      opponentId: 'A',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_accusation_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'accusation_response',
      playerId: 'A',
      actionOwnerId: 'B',
      sourceActionInstanceId: source,
      targetInstanceId: target,
    });
    const targetEvent = state.events.find(event =>
      event.type === 'accusation_target_chosen'
      && (event.payload as { targetInstanceId?: string })?.targetInstanceId === target
    );
    expect(targetEvent?.visibility).toBe('public');

    state = reduceV070TurnAction(state, {
      type: 'resolve_accusation_choice',
      playerId: 'A',
      destination: 'draw_top',
    });

    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.A.zones.drawPile[0]).toBe(target);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
  });

  test('the opponent may instead put the chosen card in their Graveyard', () => {
    let state = openingForB();
    const target = state.players.A.zones.discardPile[0];
    const source = injectCard(
      state,
      'B',
      'inquisition-accusation',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_accusation_target',
      playerId: 'B',
      targetInstanceId: target,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_accusation_choice',
      playerId: 'A',
      destination: 'graveyard',
    });

    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.players.B.zones.discardPile).toContain(source);
  });

  test('invalid Accusation target leaves the active-player choice pending', () => {
    let state = openingForB();
    const source = injectCard(
      state,
      'B',
      'inquisition-accusation',
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
      type: 'choose_accusation_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/must target a card in the opponent’s Discard Pile/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'accusation_target',
      playerId: 'B',
      opponentId: 'A',
      sourceActionInstanceId: source,
    });
  });
});
