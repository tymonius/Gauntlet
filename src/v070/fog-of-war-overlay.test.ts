import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { createV070BattleRuntime } from './battle-types';
import {
  applyV070FogOfWarOverlayAtBattleOnset,
  V070_FOG_OF_WAR_ID,
} from './fog-of-war';
import { useV070NeutralObserversAfterRefusal } from './diplomats';
import { currentCanonicalContent } from '../content/current-game';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'fog-of-war-current',
    seed: 'fog-of-war-current-seed',
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

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone: 'hand' | 'assetBank',
): string {
  const instanceId = `fog-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function prepareBattle(options: {
  fog: boolean;
  contestedController: 'A' | 'B';
}): { state: V070GameState; fogInstanceId: string | null } {
  let state = openingForA();
  const origin = 2;
  const contested = 3;
  const territory = state.board.find(item => item.position === contested);
  if (!territory) throw new Error('Expected contested test Territory.');

  let fogInstanceId: string | null = null;
  if (options.fog) {
    fogInstanceId = injectCard(
      state,
      'A',
      V070_FOG_OF_WAR_ID,
      'overlay',
      'hand',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: fogInstanceId,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_territory_overlay_target',
      playerId: 'A',
      territoryPosition: contested,
    });
  }

  for (const item of state.board) item.occupant = null;
  state.players.A.position = origin;
  state.players.B.position = contested;
  state.board.find(item => item.position === origin)!.occupant = 'A';
  const contestedTerritory = state.board.find(
    item => item.position === contested,
  );
  if (!contestedTerritory) {
    throw new Error('Expected current contested test Territory.');
  }
  contestedTerritory.occupant = 'B';
  contestedTerritory.controller = options.contestedController;
  contestedTerritory.blank = true;

  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  expect(state.battle?.attacker).toBe('A');
  expect(state.battle?.defender).toBe('B');
  expect(state.battle?.contestedPosition).toBe(contested);
  return { state, fogInstanceId };
}

function proceedToGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

describe('current v0.7.2 battle commitment order', () => {
  test('current authority restores normal attacker-first Gambit and Tactic choices', () => {
    const commitmentOrder = currentCanonicalContent.content.battle
      .commitment_order as {
        gambits: string[];
        tactics: string[];
        face_state: string;
      };
    expect(commitmentOrder.gambits).toEqual(['attacker', 'defender']);
    expect(commitmentOrder.tactics).toEqual(['attacker', 'defender']);
    expect(commitmentOrder.face_state).toContain('face down');

    let { state } = prepareBattle({
      fog: false,
      contestedController: 'B',
    });
    state = proceedToGambits(state);

    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    })).toThrow(/A must make the next Gambit choice/);

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

    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    })).toThrow(/A must make the next Tactic choice/);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
  });
});

describe('current v0.7.2 Fog of War Overlay', () => {
  test('the Territory controller commits after the opponent for both stages', () => {
    let { state } = prepareBattle({
      fog: true,
      contestedController: 'A',
    });
    state = proceedToGambits(state);

    expect(state.battleRuntime?.gambitOrderOverride)
      .toEqual(expect.objectContaining({
        source: 'fog_of_war',
        firstPlayer: 'B',
        secondPlayer: 'A',
        nextPlayer: 'B',
        firstCommitmentFaceUp: false,
      }));
    expect(state.battleRuntime?.tacticOrderOverride)
      .toEqual(expect.objectContaining({
        source: 'fog_of_war',
        firstPlayer: 'B',
        secondPlayer: 'A',
        nextPlayer: 'B',
      }));

    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    })).toThrow(/B must make the next Gambit choice/);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/B must make the next Tactic choice/);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
  });

  test('Neutral Observers overrides Fog Gambit order but leaves Fog Tactic order intact', () => {
    const prepared = prepareBattle({
      fog: true,
      contestedController: 'A',
    });
    const state = prepared.state;
    if (!prepared.fogInstanceId || !state.battle) {
      throw new Error('Expected an active Fog battle.');
    }

    state.battleRuntime = createV070BattleRuntime();
    state.battleRuntime.activeOverlayAtOnset = prepared.fogInstanceId;
    expect(applyV070FogOfWarOverlayAtBattleOnset(state)).toBe(true);

    const observers = injectCard(
      state,
      'B',
      'diplomats-neutral-observers',
      'neutral-observers',
      'assetBank',
    );
    state.battleRuntime.terms.stage = 'refused';
    state.battleRuntime.terms.response = 'refused';
    state.battleRuntime.terms.offerer = 'B';
    state.battleRuntime.terms.opponent = 'A';

    useV070NeutralObserversAfterRefusal(state, 'B', observers);

    expect(state.battleRuntime.gambitOrderOverride)
      .toEqual(expect.objectContaining({
        source: 'neutral_observers',
        firstPlayer: 'A',
        secondPlayer: 'B',
        nextPlayer: 'A',
        firstCommitmentFaceUp: true,
      }));
    expect(state.battleRuntime.tacticOrderOverride)
      .toEqual(expect.objectContaining({
        source: 'fog_of_war',
        firstPlayer: 'B',
        secondPlayer: 'A',
        nextPlayer: 'B',
      }));
  });

  test('discards the Fog Overlay after the battle it affected', () => {
    let prepared = prepareBattle({
      fog: true,
      contestedController: 'A',
    });
    let state = prepared.state;
    const fogInstanceId = prepared.fogInstanceId!;
    state = proceedToGambits(state);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    expect(state.overlays.some(
      overlay => overlay.instanceId === fogInstanceId,
    )).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.overlays.some(
      overlay => overlay.instanceId === fogInstanceId,
    )).toBe(false);
    expect(state.players.A.zones.discardPile).toContain(fogInstanceId);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'overlay_discarded',
      payload: expect.objectContaining({
        instanceId: fogInstanceId,
        cardId: V070_FOG_OF_WAR_ID,
        reason: 'fog_of_war_next_battle',
      }),
    }));
  });
});
