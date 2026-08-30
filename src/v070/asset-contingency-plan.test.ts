import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  openV070AssetLimitEnforcement,
  reduceV070AssetAction,
  removeV070AssetForced,
} from './assets';
import { reduceV070TurnAction } from './turn-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'contingency-plan-removed',
    seed: 'contingency-plan-removed-seed',
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
  zone: 'hand' | 'assetBank' | 'drawPile' | 'discardPile',
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

describe('v0.7.0 Contingency Plan Removed trigger', () => {
  test('forced Removal to Discard draws one card after the Asset leaves play', () => {
    const state = openingForB();
    const contingency = injectCard(
      state,
      'A',
      'neutral-contingency-plan',
      'assetBank',
      'contingency',
    );
    const top = state.players.A.zones.drawPile[0];
    const handBefore = state.players.A.zones.hand.length;

    removeV070AssetForced(
      state,
      'A',
      contingency,
      'discard',
      'test forced removal',
    );

    expect(state.players.A.zones.assetBank).not.toContain(contingency);
    expect(state.players.A.zones.discardPile).toContain(contingency);
    expect(state.players.A.zones.hand).toContain(top);
    expect(state.players.A.zones.hand.length).toBe(handBefore + 1);

    const removedIndex = state.events.findIndex(event =>
      event.type === 'asset_removed'
      && (event.payload as { instanceId?: string })?.instanceId === contingency
    );
    const drawIndex = state.events.findIndex(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string })?.purpose === 'Contingency Plan'
    );
    expect(removedIndex).toBeGreaterThanOrEqual(0);
    expect(drawIndex).toBeGreaterThan(removedIndex);

    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as {
        purpose?: string;
        sourceInstanceId?: string;
        count?: number;
      })?.purpose === 'Contingency Plan'
      && (event.payload as { sourceInstanceId?: string })?.sourceInstanceId === contingency
      && (event.payload as { count?: number })?.count === 1
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'drawn_card_identity'
      && event.visibility === 'A'
      && (event.payload as { sourceInstanceId?: string })?.sourceInstanceId === contingency
    )).toBe(true);
  });

  test('forced Removal to Graveyard also triggers the draw', () => {
    const state = openingForB();
    const contingency = injectCard(
      state,
      'A',
      'neutral-contingency-plan',
      'assetBank',
      'graveyard-contingency',
    );
    const handBefore = state.players.A.zones.hand.length;

    removeV070AssetForced(
      state,
      'A',
      contingency,
      'graveyard',
      'Capital Punishment',
    );

    expect(state.players.A.zones.graveyard).toContain(contingency);
    expect(state.players.A.zones.discardPile).not.toContain(contingency);
    expect(state.players.A.zones.hand.length).toBe(handBefore + 1);
    expect(state.events.some(event =>
      event.type === 'asset_removed'
      && (event.payload as { destination?: string })?.destination === 'graveyard'
    )).toBe(true);
  });

  test('voluntary Asset discard is not Removal and does not trigger Contingency Plan', () => {
    let state = openingForB();
    const contingency = injectCard(
      state,
      'B',
      'neutral-contingency-plan',
      'assetBank',
      'voluntary',
    );
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'discard_asset',
      playerId: 'B',
      assetInstanceId: contingency,
    });

    expect(state.players.B.zones.discardPile).toContain(contingency);
    expect(state.players.B.zones.hand.length).toBe(handBefore);
    expect(state.events.some(event =>
      event.type === 'asset_discarded'
      && (event.payload as { instanceId?: string; removed?: boolean })?.instanceId === contingency
      && (event.payload as { removed?: boolean })?.removed === false
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string })?.purpose === 'Contingency Plan'
    )).toBe(false);
  });

  test('Asset-limit Removal resolves the same Contingency Plan trigger', () => {
    const state = openingForB();
    const contingency = injectCard(
      state,
      'B',
      'neutral-contingency-plan',
      'assetBank',
      'limit-contingency',
    );
    injectCard(state, 'B', 'neutral-counterintelligence', 'assetBank', 'limit-1');
    injectCard(state, 'B', 'neutral-fortifications', 'assetBank', 'limit-2');
    injectCard(state, 'B', 'neutral-fealty', 'assetBank', 'limit-3');

    expect(state.players.B.controlledTerritories).toHaveLength(3);
    expect(state.players.B.zones.assetBank).toHaveLength(4);
    expect(openV070AssetLimitEnforcement(
      state,
      'B',
      'test asset limit',
    )).toBe(true);

    const handBefore = state.players.B.zones.hand.length;
    const next = reduceV070AssetAction(state, {
      type: 'resolve_asset_limit_removal',
      playerId: 'B',
      instanceIds: [contingency],
    });

    expect(next.players.B.zones.assetBank).not.toContain(contingency);
    expect(next.players.B.zones.discardPile).toContain(contingency);
    expect(next.players.B.zones.hand.length).toBe(handBefore + 1);
    expect(next.pendingAssetLimitChoice).toBeNull();
    expect(next.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string })?.purpose === 'Contingency Plan'
    )).toBe(true);
  });

  test('Removal to Discard happens before the trigger draw reshuffles', () => {
    const state = openingForB();
    const contingency = injectCard(
      state,
      'A',
      'neutral-contingency-plan',
      'assetBank',
      'reshuffle-contingency',
    );
    const otherDiscard = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'discardPile',
      'reshuffle-other',
    );
    state.players.A.zones.drawPile = [];
    const handBefore = state.players.A.zones.hand.length;

    removeV070AssetForced(
      state,
      'A',
      contingency,
      'discard',
      'reshuffle trigger test',
    );

    expect(state.players.A.zones.hand.length).toBe(handBefore + 1);
    expect([
      contingency,
      otherDiscard,
    ]).toContain(state.players.A.zones.hand.at(-1));
    expect(state.events.some(event =>
      event.type === 'discard_reshuffled'
      && (event.payload as { purpose?: string; cardCount?: number })?.purpose === 'Contingency Plan'
      && (event.payload as { cardCount?: number })?.cardCount === 2
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string; reshuffles?: number })?.purpose === 'Contingency Plan'
      && (event.payload as { reshuffles?: number })?.reshuffles === 1
    )).toBe(true);
  });
});
