import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { currentV070MovementStep } from './rules';
import { voluntarilyReturnableV070AssetInstanceIds } from './assets';

const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'strategic-withdrawal',
    seed: 'strategic-withdrawal-seed',
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

  state.players.A.position = 1;
  state.players.B.position = 4;
  state.board.forEach(space => { space.occupant = null; });
  state.board[1].occupant = 'A';
  state.board[4].occupant = 'B';

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
  cardId: string,
  zone: 'hand' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `strategic-A-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Strategic Withdrawal Action', () => {
  test('during Opening, returns one Asset to Hand and appends one unrestricted normal-Movement step', () => {
    let state = openingForA();
    const asset = inject(
      state,
      'neutral-counterintelligence',
      'assetBank',
      'asset',
    );
    const source = inject(
      state,
      'neutral-strategic-withdrawal',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'controlled_asset_target',
      purpose: 'Strategic Withdrawal',
      operation: 'voluntary_return_hand',
    }));

    state = reduceV070TurnAction(state, {
      type: 'choose_controlled_asset_target',
      playerId: 'A',
      targetInstanceId: asset,
    });

    expect(state.players.A.zones.assetBank).not.toContain(asset);
    expect(state.players.A.zones.hand).toContain(asset);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.turnState?.phase).toBe('opening');
    expect(state.turnState?.pendingNormalMovementSteps).toEqual([
      {
        source: 'Strategic Withdrawal',
        choiceRestriction: 'any',
        battleRestriction: 'allowed',
      },
    ]);
    expect(state.events.some(event =>
      event.type === 'asset_returned'
      && (event.payload as {
        instanceId?: string;
        removed?: boolean;
        destination?: string;
      })?.instanceId === asset
      && (event.payload as { removed?: boolean })?.removed === false
      && (event.payload as { destination?: string })?.destination === 'hand'
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'asset_removed'
      && (event.payload as { instanceId?: string })?.instanceId === asset
    )).toBe(false);

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    expect(state.turnState?.movementStepQueue.map(step => step.source)).toEqual([
      'normal',
      'Strategic Withdrawal',
    ]);
  });

  test('during Denouement, starts a separate one-step effect movement sequence and returns to Denouement afterward', () => {
    let state = openingForA();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    expect(state.turnState?.phase).toBe('denouement');

    const asset = inject(
      state,
      'neutral-counterintelligence',
      'assetBank',
      'asset',
    );
    const source = inject(
      state,
      'neutral-strategic-withdrawal',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_controlled_asset_target',
      playerId: 'A',
      targetInstanceId: asset,
    });

    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceSource).toBe('effect');
    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: 'Strategic Withdrawal',
      choiceRestriction: 'any',
      battleRestriction: 'allowed',
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'A',
    })).toThrow(/Resolve the effect-granted movement sequence/);

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.players.A.position).toBe(2);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
    expect(state.turnState?.movementSequenceSource).toBeNull();

    state = reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'A',
    });
    expect(state.turnState?.phase).toBe('cleanup');
  });

  test('holding a Denouement effect-granted sequence declines the movement without advancing the phase', () => {
    let state = openingForA();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });

    const asset = inject(
      state,
      'neutral-counterintelligence',
      'assetBank',
      'asset',
    );
    const source = inject(
      state,
      'neutral-strategic-withdrawal',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_controlled_asset_target',
      playerId: 'A',
      targetInstanceId: asset,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });

    expect(state.players.A.position).toBe(1);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
  });

  test('return is not discard: another Asset may be returned while Extraordinary Rendition remains banked', () => {
    let state = openingForA();
    const rendition = inject(
      state,
      'intelligence-extraordinary-rendition',
      'assetBank',
      'rendition',
    );
    const other = inject(
      state,
      'neutral-counterintelligence',
      'assetBank',
      'other',
    );
    const source = inject(
      state,
      'neutral-strategic-withdrawal',
      'hand',
      'source',
    );

    expect(voluntarilyReturnableV070AssetInstanceIds(state, 'A'))
      .toEqual(expect.arrayContaining([rendition, other]));

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_controlled_asset_target',
      playerId: 'A',
      targetInstanceId: other,
    });

    expect(state.players.A.zones.assetBank).toContain(rendition);
    expect(state.players.A.zones.assetBank).not.toContain(other);
    expect(state.players.A.zones.hand).toContain(other);
  });

  test('requires a returnable Asset before spending the Action', () => {
    const state = openingForA();
    const source = inject(
      state,
      'neutral-strategic-withdrawal',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/requires one Asset you can return/);

    expect(state.players.A.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });
});
