import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  placeV070OverlayFromHand,
  v070OverlaysAt,
} from './overlays';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'landslide-action',
    seed: 'landslide-action-seed',
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

function setupOverlay(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
  territoryPosition: number,
): string {
  const instanceId = injectHandCard(state, playerId, cardId, suffix);
  placeV070OverlayFromHand(
    state,
    playerId,
    instanceId,
    territoryPosition,
    'test setup',
  );
  return instanceId;
}

describe('v0.7.0 Landslide Action', () => {
  test('places the pending physical Action card as an Overlay instead of discarding it', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-landslide', 'source');
    const targetPosition = 2;
    const territory = state.board.find(item => item.position === targetPosition)!;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'territory_overlay_target',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Landslide',
    });
    expect(state.players.B.zones.hand).not.toContain(source);
    expect(state.players.B.zones.discardPile).not.toContain(source);

    state = reduceV070TurnAction(state, {
      type: 'choose_territory_overlay_target',
      playerId: 'B',
      territoryPosition: targetPosition,
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: source,
      owner: 'B',
      territoryInstanceId: territory.territoryInstanceId,
      placedTurn: state.turnNumber,
    }));
    expect(state.players.B.zones.discardPile).not.toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'action_card_resolved'
      && (event.payload as { instanceId?: string; destination?: string })?.instanceId === source
      && (event.payload as { destination?: string })?.destination === 'overlay'
    )).toBe(true);
  });

  test('a Territory with an existing Landslide is not an eligible target', () => {
    let state = openingForB();
    const blockedPosition = 1;
    setupOverlay(
      state,
      'B',
      'neutral-landslide',
      'existing-landslide',
      blockedPosition,
    );
    const source = injectHandCard(state, 'B', 'neutral-landslide', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const pendingEvent = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Landslide'
    );
    expect((pendingEvent?.payload as { territoryPositions?: number[] })?.territoryPositions)
      .not.toContain(blockedPosition);

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_territory_overlay_target',
      playerId: 'B',
      territoryPosition: blockedPosition,
    })).toThrow(/does not already have a Landslide/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'territory_overlay_target',
      sourceActionInstanceId: source,
    }));
  });

  test('covering a Landslide with another Overlay does not permit a second Landslide there', () => {
    let state = openingForB();
    const blockedPosition = 3;
    const original = setupOverlay(
      state,
      'B',
      'neutral-landslide',
      'covered-landslide',
      blockedPosition,
    );
    setupOverlay(
      state,
      'B',
      'diplomats-demilitarized-zone',
      'covering-dmz',
      blockedPosition,
    );

    expect(v070OverlaysAt(state, blockedPosition).map(item => item.instanceId))
      .toContain(original);
    expect(v070OverlaysAt(state, blockedPosition)).toHaveLength(2);

    const source = injectHandCard(state, 'B', 'neutral-landslide', 'source');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_territory_overlay_target',
      playerId: 'B',
      territoryPosition: blockedPosition,
    })).toThrow(/does not already have a Landslide/);
  });

  test('cannot play Landslide when every Territory already has one', () => {
    const state = openingForB();
    for (const territory of state.board) {
      setupOverlay(
        state,
        'B',
        'neutral-landslide',
        `existing-${territory.position}`,
        territory.position,
      );
    }
    const source = injectHandCard(state, 'B', 'neutral-landslide', 'source');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires a Territory that does not already have a Landslide/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('the existing Hand Overlay placement path still removes the physical card from Hand', () => {
    const state = openingForB();
    const overlay = injectHandCard(
      state,
      'B',
      'diplomats-demilitarized-zone',
      'hand-overlay',
    );

    placeV070OverlayFromHand(
      state,
      'B',
      overlay,
      0,
      'regression test',
    );

    expect(state.players.B.zones.hand).not.toContain(overlay);
    expect(state.overlays.some(item => item.instanceId === overlay)).toBe(true);
  });
});
