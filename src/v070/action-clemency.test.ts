import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
  type V070PlayerZones,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  associateV070Sanction,
  V070_SANCTIONS_CENSURE_ID,
} from './sanctions';
import { viewV070GameForPlayer } from './views';

const ambassadorStarter = 'diplomats-ambassador-open-channels';
const senatorStarter = 'diplomats-senator-procedure-endures';
const militaryStarter = 'military-commandant-holdfast';

function openingGame(
  opponentStarter = militaryStarter,
): V070GameState {
  let state = createV070StarterGame({
    gameId: `clemency-test-${opponentStarter}`,
    seed: `clemency-seed-${opponentStarter}`,
    players: {
      A: { name: 'Diplomat', starterDeckId: ambassadorStarter },
      B: { name: 'Opponent', starterDeckId: opponentStarter },
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

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function relocateCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  target: keyof Pick<V070PlayerZones, 'hand' | 'discardPile' | 'graveyard' | 'assetBank'>,
  occurrence = 0,
): string {
  const instances = Object.values(state.cardInstances)
    .filter(instance => instance.owner === playerId && instance.cardId === cardId);
  const instance = instances[occurrence];
  if (!instance) throw new Error(`Missing ${playerId} card ${cardId} #${occurrence}`);

  const player = state.players[playerId];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instance.instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones[target].push(instance.instanceId);
  return instance.instanceId;
}

function putAnyOpponentCardInGraveyard(state: V070GameState): string {
  const candidate = Object.values(state.cardInstances)
    .find(instance => instance.owner === 'B');
  if (!candidate) throw new Error('Opponent has no card instance.');

  const player = state.players.B;
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(candidate.instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones.graveyard.push(candidate.instanceId);
  return candidate.instanceId;
}

describe('v0.7.0 Clemency Action continuation', () => {
  test('cannot be played without a legal opponent Graveyard target and does not spend the Action', () => {
    const state = openingGame();
    const clemency = relocateCard(state, 'A', 'diplomats-clemency', 'hand');

    expect(state.players.B.zones.graveyard).toHaveLength(0);
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: clemency,
    })).toThrow(/requires at least one card in the opponent’s Graveyard/);

    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(0);
    expect(state.players.A.zones.hand).toContain(clemency);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
  });

  test('recycle branch moves the chosen opponent Graveyard card to Discard and grants +1 Influence', () => {
    let state = openingGame();
    const clemency = relocateCard(state, 'A', 'diplomats-clemency', 'hand');
    const target = putAnyOpponentCardInGraveyard(state);
    const influenceBefore = state.players.A.diplomats!.influence;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: clemency,
    });

    expect(state.players.A.zones.hand).not.toContain(clemency);
    expect(state.players.A.zones.discardPile).not.toContain(clemency);
    expect(state.pendingActionCard).toEqual({
      playerId: 'A',
      instanceId: clemency,
      cardId: 'diplomats-clemency',
      phase: 'opening',
    });
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'clemency_target',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: clemency,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_clemency_target',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'clemency_response',
      playerId: 'B',
      actionOwnerId: 'A',
      sourceActionInstanceId: clemency,
      targetInstanceId: target,
    });

    const opponentView = viewV070GameForPlayer(state, 'B');
    expect(opponentView.pendingActionEffectChoice).toEqual(
      state.pendingActionEffectChoice,
    );

    // B may respond even though A is the active player.
    state = reduceV070TurnAction(state, {
      type: 'resolve_clemency_choice',
      playerId: 'B',
      choice: 'recycle',
    });

    expect(state.players.B.zones.graveyard).not.toContain(target);
    expect(state.players.B.zones.discardPile).toContain(target);
    expect(state.players.A.diplomats?.influence).toBe(influenceBefore + 1);
    expect(state.players.A.zones.discardPile).toContain(clemency);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'clemency_resolved'
      && (event.payload as { response?: string })?.response === 'recycle'
    )).toBe(true);
  });

  test('leave branch keeps the target in Graveyard and gives the Clemency player +1 Card', () => {
    let state = openingGame();
    const clemency = relocateCard(state, 'A', 'diplomats-clemency', 'hand');
    const target = putAnyOpponentCardInGraveyard(state);
    const expectedDraw = state.players.A.zones.drawPile[0];
    const handBefore = state.players.A.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: clemency,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_clemency_target',
      playerId: 'A',
      targetInstanceId: target,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_clemency_choice',
      playerId: 'B',
      choice: 'leave',
    });

    expect(state.players.B.zones.graveyard).toContain(target);
    expect(state.players.B.zones.discardPile).not.toContain(target);
    expect(state.players.A.zones.hand).toContain(expectedDraw);
    // Playing Clemency removes one card, then the leave branch draws one.
    expect(state.players.A.zones.hand.length).toBe(handBefore);
    expect(state.players.A.zones.discardPile).toContain(clemency);
  });

  test('only a card in the opponent Graveyard can be chosen as the Clemency target', () => {
    let state = openingGame();
    const clemency = relocateCard(state, 'A', 'diplomats-clemency', 'hand');
    putAnyOpponentCardInGraveyard(state);
    const invalid = state.players.B.zones.hand[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: clemency,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_clemency_target',
      playerId: 'A',
      targetInstanceId: invalid,
    })).toThrow(/opponent’s Graveyard/);

    expect(state.pendingActionEffectChoice?.kind).toBe('clemency_target');
    expect(state.pendingActionCard?.instanceId).toBe(clemency);
  });

  test('the non-active opponent exclusively owns the Clemency response', () => {
    let state = openingGame();
    const clemency = relocateCard(state, 'A', 'diplomats-clemency', 'hand');
    const target = putAnyOpponentCardInGraveyard(state);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: clemency,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_clemency_target',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_clemency_choice',
      playerId: 'A',
      choice: 'leave',
    })).toThrow(/pending printed Action effect choice/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'clemency_response',
      playerId: 'B',
      targetInstanceId: target,
    }));
  });

  test('Censure resolves before Clemency asks for its Graveyard target', () => {
    let state = openingGame(senatorStarter);
    const clemency = relocateCard(state, 'A', 'diplomats-clemency', 'hand');
    putAnyOpponentCardInGraveyard(state);

    const censure = relocateCard(
      state,
      'B',
      V070_SANCTIONS_CENSURE_ID,
      'assetBank',
    );
    associateV070Sanction(state, {
      instanceId: censure,
      owner: 'B',
      opponent: 'A',
      kind: 'asset',
    });

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: clemency,
    });

    expect(state.pendingSanctionChoices).toEqual([
      expect.objectContaining({
        kind: 'censure_action',
        playerId: 'A',
        sanctionInstanceId: censure,
        sourceActionInstanceId: clemency,
      }),
    ]);
    expect(state.pendingActionEffectChoice).toBeNull();

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'A',
      sanctionInstanceId: censure,
      choice: 'draw',
    });

    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'clemency_target',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: clemency,
    });
  });
});
