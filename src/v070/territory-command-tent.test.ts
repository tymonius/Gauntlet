import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { placeV070OverlayFromHand } from './overlays';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function setupAtCommandTent(
  controller: 'A' | 'B' = 'A',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'command-tent-territory',
    seed: `command-tent-${controller}`,
    players: {
      A: { name: 'Active', starterDeckId: militaryA },
      B: { name: 'Opponent', starterDeckId: militaryB },
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

  const position = state.players.A.position!;
  const territory = state.board.find(
    candidate => candidate.position === position,
  )!;
  territory.territoryId = 'territory-command-tent';
  territory.controller = controller;
  territory.blank = false;
  return state;
}

function inject(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const instanceId = `command-tent-A-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function reachOpening(state: V070GameState): V070GameState {
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

describe('v0.7.0 Command Tent Territory', () => {
  test('its controller starting the turn there gains +1 total Action and card-first requirements in both Action phases', () => {
    let state = reachOpening(setupAtCommandTent('A'));

    expect(state.turnState?.actionsAvailable).toBe(2);
    expect(state.turnState?.commandTentCardActionFirst).toBe(true);

    const openingAsset = inject(
      state,
      'neutral-counterintelligence',
      'opening-asset',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: openingAsset,
    })).toThrow(/Command Tent requires the first Action/);

    const openingAction = inject(
      state,
      'neutral-rallying-cry',
      'opening-action',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: openingAction,
    });

    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(1);

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

    const denouementAsset = inject(
      state,
      'neutral-counterintelligence',
      'denouement-asset',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: denouementAsset,
    })).toThrow(/Command Tent requires the first Action/);

    const denouementAction = inject(
      state,
      'neutral-rallying-cry',
      'denouement-action',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: denouementAction,
    });

    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken).toEqual({
      opening: 1,
      denouement: 1,
    });
    expect(state.events.some(event =>
      event.type === 'territory_effect_applied'
      && (event.payload as { territoryId?: string })?.territoryId ===
        'territory-command-tent'
    )).toBe(true);
  });

  test('the player may skip Opening, but the first Denouement Action must still be a printed card Action', () => {
    let state = reachOpening(setupAtCommandTent('A'));
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });

    expect(state.turnState?.actionsAvailable).toBe(2);
    expect(state.turnState?.actionsTaken.opening).toBe(0);

    const asset = inject(
      state,
      'neutral-counterintelligence',
      'skipped-opening-asset',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: asset,
    })).toThrow(/Command Tent requires the first Action/);

    const action = inject(
      state,
      'neutral-rallying-cry',
      'skipped-opening-action',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: action,
    });
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.denouement).toBe(1);
  });

  test('starting there without controlling Command Tent grants no benefit', () => {
    const state = reduceV070TurnAction(
      setupAtCommandTent('B'),
      {
        type: 'resolve_capture',
        playerId: 'A',
      },
    );

    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.commandTentCardActionFirst).toBe(false);
  });

  test('an exposed Overlay supersedes Command Tent before its start-turn effect applies', () => {
    const state = setupAtCommandTent('A');
    const position = state.players.A.position!;
    const overlay = inject(
      state,
      'mystics-circle-of-bones',
      'overlay',
    );
    placeV070OverlayFromHand(
      state,
      'A',
      overlay,
      position,
      'Command Tent test',
    );

    const next = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'A',
    });

    expect(next.turnState?.actionsAvailable).toBe(1);
    expect(next.turnState?.commandTentCardActionFirst).toBe(false);
  });
});
