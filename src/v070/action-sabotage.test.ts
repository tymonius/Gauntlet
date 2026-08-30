import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  isV070AssetFaceUp,
  turnV070AssetFaceDownUntilPlayerNextTurn,
} from './asset-face-state';

const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'sabotage',
    seed: 'sabotage-seed',
    players: {
      A: { name: 'A', starterDeckId: militaryStarter },
      B: { name: 'B', starterDeckId: militaryStarter },
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
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `sabotage-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Sabotage Action', () => {
  test('turns one chosen face-up opposing Asset face down until the Sabotage player’s next turn', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-sabotage',
      'hand',
      'source',
    );
    const target = inject(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'target',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'sabotage_asset_target',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
    });
    const pending = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Sabotage'
    );
    expect((pending?.payload as { targetInstanceIds?: string[] })
      ?.targetInstanceIds).toEqual([target]);

    state = reduceV070TurnAction(state, {
      type: 'choose_sabotage_asset_target',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(isV070AssetFaceUp(state, target)).toBe(false);
    expect(state.players.B.zones.assetBank).toContain(target);
    expect(state.assetFaceStates).toEqual([
      {
        instanceId: target,
        owner: 'B',
        faceUp: false,
        changedBy: 'A',
        sourceInstanceId: source,
        reason: 'Sabotage',
        appliedTurn: state.turnNumber,
        restoreAtPlayer: 'A',
      },
    ]);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });

  test('already-face-down opposing Assets are excluded from the target set', () => {
    let state = openingForA();
    const hidden = inject(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'hidden',
    );
    const faceUp = inject(
      state,
      'B',
      'neutral-fortifications',
      'assetBank',
      'face-up',
    );
    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: hidden,
      changedBy: 'A',
      restoreAtPlayer: 'A',
      reason: 'existing effect',
    });
    const source = inject(
      state,
      'A',
      'neutral-sabotage',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    const pending = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Sabotage'
    );
    expect((pending?.payload as { targetInstanceIds?: string[] })
      ?.targetInstanceIds).toEqual([faceUp]);

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_sabotage_asset_target',
      playerId: 'A',
      targetInstanceId: hidden,
    })).toThrow(/face-up Asset controlled by the opponent/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'sabotage_asset_target',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
    });
  });

  test('an own Asset cannot be chosen even when face up', () => {
    let state = openingForA();
    const own = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'own',
    );
    inject(
      state,
      'B',
      'neutral-fortifications',
      'assetBank',
      'opponent',
    );
    const source = inject(
      state,
      'A',
      'neutral-sabotage',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_sabotage_asset_target',
      playerId: 'A',
      targetInstanceId: own,
    })).toThrow(/face-up Asset controlled by the opponent/);

    expect(isV070AssetFaceUp(state, own)).toBe(true);
  });

  test('requires a face-up opposing Asset before spending the Action', () => {
    const state = openingForA();
    const target = inject(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'target',
    );
    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: target,
      changedBy: 'A',
      restoreAtPlayer: 'A',
      reason: 'existing effect',
    });
    const source = inject(
      state,
      'A',
      'neutral-sabotage',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/requires at least one face-up opposing Asset/);

    expect(state.players.A.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('target identity and face change remain public information', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-sabotage',
      'hand',
      'source',
    );
    const target = inject(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'target',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_sabotage_asset_target',
      playerId: 'A',
      targetInstanceId: target,
    });

    const event = state.events.find(event =>
      event.type === 'asset_turned_face_down'
      && (event.payload as { instanceId?: string })?.instanceId === target
    );
    expect(event?.visibility).toBe('public');
    expect(event?.payload).toEqual(expect.objectContaining({
      instanceId: target,
      cardId: 'neutral-counterintelligence',
      owner: 'B',
      reason: 'Sabotage',
      sourceInstanceId: source,
      restoreAtPlayer: 'A',
    }));
  });
});
