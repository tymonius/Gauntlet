import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  advanceV070FrontLine,
  nextV070FrontLineTarget,
} from './front-line';
import { placeV070OverlayFromBattle } from './overlays';
import {
  V070_PROTRACTED_SIEGE_OVERLAY_TEXT,
} from './protracted-siege';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'protracted-siege-overlay-test',
    seed: 'protracted-siege-overlay-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
      },
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
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function injectOverlay(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  territoryPosition: number,
  suffix: string,
): string {
  const instanceId = `protracted-siege-overlay-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  placeV070OverlayFromBattle(
    state,
    owner,
    instanceId,
    territoryPosition,
    'Protracted Siege Overlay test',
  );
  return instanceId;
}

function advanceToMovement(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  return reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
}

function startAdjacentBattle(): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';
  state = advanceToMovement(state);
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

describe('v0.7.0 Protracted Siege persistent Overlay', () => {
  test('locks the Overlay implementation to released v0.7.0 text', () => {
    const card = v070CanonicalContent.cardsById.get('neutral-protracted-siege');
    expect(card?.effects.find(effect => effect.label === 'Overlay')?.text)
      .toBe(V070_PROTRACTED_SIEGE_OVERLAY_TEXT);
  });

  test('prevents an opposing Front Line capture, enters Graveyard, and stops the same multi-step advance from retrying the blocked Territory', () => {
    const state = readyGame();
    const target = nextV070FrontLineTarget(state, 'A')!;
    expect(target.controller).toBe('B');
    const siege = injectOverlay(
      state,
      'B',
      'neutral-protracted-siege',
      target.position,
      'capture',
    );

    const result = advanceV070FrontLine(
      state,
      'A',
      2,
      'Protracted Siege multi-step capture test',
    );

    expect(result.captures).toEqual([]);
    expect(target.controller).toBe('B');
    expect(state.overlays.some(overlay => overlay.instanceId === siege))
      .toBe(false);
    expect(state.players.B.zones.graveyard).toContain(siege);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'territory_capture_prevented',
      actor: 'B',
      payload: expect.objectContaining({
        source: 'Protracted Siege',
        capturingPlayer: 'A',
      }),
    }));
  });

  test('a covered Protracted Siege is inactive and does not prevent capture', () => {
    const state = readyGame();
    const target = nextV070FrontLineTarget(state, 'A')!;
    const siege = injectOverlay(
      state,
      'B',
      'neutral-protracted-siege',
      target.position,
      'covered',
    );
    injectOverlay(
      state,
      'B',
      'neutral-landslide',
      target.position,
      'cover',
    );

    const result = advanceV070FrontLine(
      state,
      'A',
      1,
      'covered Protracted Siege capture test',
    );

    expect(result.captures).toHaveLength(1);
    expect(target.controller).toBe('A');
    expect(state.players.B.zones.graveyard).not.toContain(siege);
    expect(state.overlays.some(overlay => overlay.instanceId === siege))
      .toBe(true);
  });

  test('turn movement graveyards Protracted Siege when the opposing token leaves first, but not when its owner leaves', () => {
    let opposing = advanceToMovement(readyGame());
    const aOrigin = opposing.players.A.position;
    expect(aOrigin).not.toBeNull();
    const opposingSiege = injectOverlay(
      opposing,
      'B',
      'neutral-protracted-siege',
      aOrigin!,
      'opponent-leaves',
    );

    opposing = reduceV070TurnAction(opposing, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(opposing.players.B.zones.graveyard).toContain(opposingSiege);
    expect(opposing.overlays.some(overlay =>
      overlay.instanceId === opposingSiege
    )).toBe(false);

    let owner = advanceToMovement(readyGame());
    const ownerOrigin = owner.players.A.position;
    expect(ownerOrigin).not.toBeNull();
    const ownerSiege = injectOverlay(
      owner,
      'A',
      'neutral-protracted-siege',
      ownerOrigin!,
      'owner-leaves',
    );

    owner = reduceV070TurnAction(owner, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(owner.players.A.zones.graveyard).not.toContain(ownerSiege);
    expect(owner.overlays.some(overlay => overlay.instanceId === ownerSiege))
      .toBe(true);
  });

  test('battle retreat is observed as an opposing-token departure before Aftermath completes', () => {
    let state = startAdjacentBattle();
    const contested = state.battle!.contestedPosition;
    const siege = injectOverlay(
      state,
      'B',
      'neutral-protracted-siege',
      contested,
      'battle-retreat',
    );

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });

    expect(state.battle?.loser).toBe('A');
    expect(state.battle?.positions.A).not.toBe(contested);
    expect(state.players.B.zones.graveyard).toContain(siege);
    expect(state.overlays.some(overlay => overlay.instanceId === siege))
      .toBe(false);
  });
});
