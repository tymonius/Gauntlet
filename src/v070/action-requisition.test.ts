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
    gameId: 'requisition-action',
    seed: 'requisition-action-seed',
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

function injectAsset(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner: playerId };
  state.players[playerId].zones.assetBank.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Requisition Action', () => {
  test('requires at least one Asset that can be voluntarily discarded', () => {
    const state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-requisition', 'source');

    expect(state.players.B.zones.assetBank).toHaveLength(0);
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires one Asset you can voluntarily discard/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('discards the chosen Asset voluntarily, then draws two', () => {
    let state = openingForB();
    const asset = injectAsset(
      state,
      'B',
      'neutral-counterintelligence',
      'asset',
    );
    const source = injectHandCard(state, 'B', 'neutral-requisition', 'source');
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'controlled_asset_target',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Requisition',
      operation: 'voluntary_discard',
      drawAfter: 2,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_controlled_asset_target',
      playerId: 'B',
      targetInstanceId: asset,
    });

    expect(state.players.B.zones.assetBank).not.toContain(asset);
    expect(state.players.B.zones.discardPile).toContain(asset);
    expect(state.players.B.zones.removed).not.toContain(asset);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.hand.length).toBe(handBefore + 1);
    expect(state.events.some(event =>
      event.type === 'asset_discarded'
      && (event.payload as { instanceId?: string; removed?: boolean; reason?: string })?.instanceId === asset
      && (event.payload as { removed?: boolean })?.removed === false
      && (event.payload as { reason?: string })?.reason === 'Requisition'
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string; count?: number })?.purpose === 'Requisition'
      && (event.payload as { count?: number })?.count === 2
    )).toBe(true);
  });

  test('Armistice does not become a legal Requisition cost merely because it is banked', () => {
    const state = openingForB();
    injectAsset(state, 'B', 'neutral-armistice', 'armistice');
    const source = injectHandCard(state, 'B', 'neutral-requisition', 'source');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires one Asset you can voluntarily discard/);
  });

  test('an invalid controlled-Asset target leaves the Requisition choice pending', () => {
    let state = openingForB();
    injectAsset(state, 'B', 'neutral-counterintelligence', 'asset');
    const source = injectHandCard(state, 'B', 'neutral-requisition', 'source');
    const invalid = state.players.B.zones.hand.find(id => id !== source)!;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_controlled_asset_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/must choose an Asset you can voluntarily discard/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'controlled_asset_target',
      purpose: 'Requisition',
    }));
    expect(state.pendingActionCard?.instanceId).toBe(source);
  });
});
