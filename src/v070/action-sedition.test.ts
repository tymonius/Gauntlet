import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { associateV070Sanction } from './sanctions';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'sedition-action',
    seed: 'sedition-action-seed',
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
  zone: 'hand' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner: playerId };
  state.players[playerId].zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Sedition Action', () => {
  test('requires the opponent to control an Asset before spending the Action', () => {
    const state = openingForB();
    const source = injectCard(state, 'B', 'neutral-sedition', 'hand', 'source');

    expect(state.players.A.zones.assetBank).toHaveLength(0);
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/opponent to control at least one Asset/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(0);
  });

  test('the opponent chooses which Asset Sedition forces them to discard', () => {
    let state = openingForB();
    const first = injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'first-asset',
    );
    const second = injectCard(
      state,
      'A',
      'neutral-fortifications',
      'assetBank',
      'second-asset',
    );
    const source = injectCard(state, 'B', 'neutral-sedition', 'hand', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.activePlayer).toBe('B');
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'forced_asset_target',
      playerId: 'A',
      assetOwnerId: 'A',
      actionOwnerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Sedition',
      destination: 'discard',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_forced_asset_target',
      playerId: 'A',
      targetInstanceId: second,
    });

    expect(state.players.A.zones.assetBank).toContain(first);
    expect(state.players.A.zones.assetBank).not.toContain(second);
    expect(state.players.A.zones.discardPile).toContain(second);
    expect(state.players.A.zones.removed).not.toContain(second);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();

    expect(state.events.some(event =>
      event.type === 'asset_removed'
      && (event.payload as {
        instanceId?: string;
        destination?: string;
        removed?: boolean;
        reason?: string;
      })?.instanceId === second
      && (event.payload as { destination?: string })?.destination === 'discard'
      && (event.payload as { removed?: boolean })?.removed === true
      && (event.payload as { reason?: string })?.reason === 'Sedition'
    )).toBe(true);
  });

  test('a Sedition forced discard clears a Sanction association on the departing Asset', () => {
    let state = openingForB();
    const sanction = injectCard(
      state,
      'A',
      'diplomats-sanctions-embargo',
      'assetBank',
      'embargo',
    );
    associateV070Sanction(state, {
      instanceId: sanction,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });
    const source = injectCard(state, 'B', 'neutral-sedition', 'hand', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_forced_asset_target',
      playerId: 'A',
      targetInstanceId: sanction,
    });

    expect(state.sanctions.some(item => item.instanceId === sanction)).toBe(false);
    expect(state.players.A.zones.discardPile).toContain(sanction);
  });

  test('an invalid forced-Asset target leaves the opponent choice pending', () => {
    let state = openingForB();
    injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'asset',
    );
    const invalid = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'hand',
      'invalid',
    );
    const source = injectCard(state, 'B', 'neutral-sedition', 'hand', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_forced_asset_target',
      playerId: 'A',
      targetInstanceId: invalid,
    })).toThrow(/must choose one Asset controlled by the opponent/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'forced_asset_target',
      playerId: 'A',
      sourceActionInstanceId: source,
    }));
    expect(state.pendingActionCard?.instanceId).toBe(source);
  });

  test('does not narrow the opponent choice when a Removed lifecycle is unsupported', () => {
    const state = openingForB();
    injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'supported',
    );
    injectCard(
      state,
      'A',
      'military-reserve-force',
      'assetBank',
      'unsupported',
    );
    const source = injectCard(state, 'B', 'neutral-sedition', 'hand', 'source');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/Forced Asset Removal for military-reserve-force is unsupported/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Extraordinary Rendition blocks Sedition until its bound-card departure lifecycle is represented', () => {
    const state = openingForB();
    injectCard(
      state,
      'A',
      'intelligence-extraordinary-rendition',
      'assetBank',
      'rendition',
    );
    injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'other',
    );
    const source = injectCard(state, 'B', 'neutral-sedition', 'hand', 'source');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/intelligence-extraordinary-rendition is unsupported/);

    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.hand).toContain(source);
  });
});
