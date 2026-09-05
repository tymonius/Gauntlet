import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { v070BattleEffectHandler } from './battle-effects';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'encampment-battle-test',
    seed: 'encampment-battle-seed',
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

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
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

function injectHandCard(
  state: V070GameState,
  owner: 'A' | 'B',
  suffix: string,
): string {
  const instanceId = `encampment-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: 'military-encampment',
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function revealGambits(
  state: V070GameState,
  aCard?: string,
  bCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bCard,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function toOutcome(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

describe('v0.7.0 Encampment battle Overlay', () => {
  test('locks the handler to the released v0.7.0 Gambit/Tactic text', () => {
    expect(v070BattleEffectHandler('military-encampment')?.expectedText)
      .toBe('In the Aftermath, if you won while defending a Territory you control, place this Overlay there.');
  });

  test('registers the existing owner-win Overlay transform when defending a Territory you control', () => {
    let state = startBattle();
    const contested = state.board.find(
      space => space.position === state.battle!.contestedPosition,
    )!;
    const encampment = injectHandCard(state, 'B', 'eligible');

    state = revealGambits(state, undefined, encampment);

    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
      .toContainEqual({
        owner: 'B',
        sourceInstanceId: encampment,
        sourceCardId: 'military-encampment',
        territoryInstanceId: contested.territoryInstanceId,
        condition: 'owner_win',
      });
  });

  test('places Encampment on the contested Territory after the eligible defender wins', () => {
    let state = startBattle();
    const contested = state.board.find(
      space => space.position === state.battle!.contestedPosition,
    )!;
    const encampment = injectHandCard(state, 'B', 'win');

    state = revealGambits(state, undefined, encampment);
    state = toOutcome(state);
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
    expect(state.battle?.winner).toBe('B');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: encampment,
      owner: 'B',
      territoryInstanceId: contested.territoryInstanceId,
    }));
    expect(state.players.B.zones.graveyard).not.toContain(encampment);
    expect(state.players.B.zones.discardPile).not.toContain(encampment);
  });

  test('does not place Encampment when its defender loses', () => {
    let state = startBattle();
    const encampment = injectHandCard(state, 'B', 'loss');

    state = revealGambits(state, undefined, encampment);
    state = toOutcome(state);
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
    expect(state.battle?.winner).toBe('A');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.overlays.some(overlay =>
      overlay.instanceId === encampment
    )).toBe(false);
    expect(state.players.B.zones.graveyard).toContain(encampment);
  });

  test('does not register Encampment for the attacker or for a defender on a Territory they do not control', () => {
    let attackerState = startBattle();
    const attackerEncampment = injectHandCard(
      attackerState,
      'A',
      'attacker',
    );
    attackerState = revealGambits(attackerState, attackerEncampment);

    expect(attackerState.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(attackerState.battleRuntime?.battleCardAftermathOverlayPlacements)
      .not.toContainEqual(expect.objectContaining({
        sourceInstanceId: attackerEncampment,
      }));

    let uncontrolledState = startBattle();
    const contested = uncontrolledState.board.find(
      space => space.position === uncontrolledState.battle!.contestedPosition,
    )!;
    contested.controller = 'A';
    const defenderEncampment = injectHandCard(
      uncontrolledState,
      'B',
      'uncontrolled',
    );
    uncontrolledState = revealGambits(
      uncontrolledState,
      undefined,
      defenderEncampment,
    );

    expect(uncontrolledState.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(uncontrolledState.battleRuntime?.battleCardAftermathOverlayPlacements)
      .not.toContainEqual(expect.objectContaining({
        sourceInstanceId: defenderEncampment,
      }));
  });
});
