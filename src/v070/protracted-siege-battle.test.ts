import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { v070BattleEffectHandler } from './battle-effects';
import {
  V070_PROTRACTED_SIEGE_BATTLE_TEXT,
  pruneV070ProtractedSiegeAftermathPlacements,
} from './protracted-siege';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'protracted-siege-battle-test',
    seed: 'protracted-siege-battle-seed',
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

function injectSiege(
  state: V070GameState,
  owner: 'A' | 'B',
  suffix: string,
): string {
  const instanceId = `protracted-siege-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: 'neutral-protracted-siege',
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

describe('v0.7.0 Protracted Siege battle Overlay', () => {
  test('locks the handler to the released v0.7.0 Gambit/Tactic text', () => {
    expect(v070BattleEffectHandler('neutral-protracted-siege')?.expectedText)
      .toBe(V070_PROTRACTED_SIEGE_BATTLE_TEXT);
  });

  test('registers a mandatory Overlay transform only while defending a Territory you control', () => {
    let state = startBattle();
    const contested = state.board.find(
      space => space.position === state.battle!.contestedPosition,
    )!;
    const siege = injectSiege(state, 'B', 'eligible');

    state = revealGambits(state, undefined, siege);

    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
      .toContainEqual({
        owner: 'B',
        sourceInstanceId: siege,
        sourceCardId: 'neutral-protracted-siege',
        territoryInstanceId: contested.territoryInstanceId,
        condition: 'always',
      });

    let attackerState = startBattle();
    const attackerSiege = injectSiege(attackerState, 'A', 'attacker');
    attackerState = revealGambits(attackerState, attackerSiege);
    expect(attackerState.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(attackerState.battleRuntime?.battleCardAftermathOverlayPlacements)
      .not.toContainEqual(expect.objectContaining({
        sourceInstanceId: attackerSiege,
      }));

    let uncontrolledState = startBattle();
    const uncontrolledTerritory = uncontrolledState.board.find(
      space => space.position === uncontrolledState.battle!.contestedPosition,
    )!;
    uncontrolledTerritory.controller = 'A';
    const uncontrolledSiege = injectSiege(
      uncontrolledState,
      'B',
      'uncontrolled',
    );
    uncontrolledState = revealGambits(
      uncontrolledState,
      undefined,
      uncontrolledSiege,
    );
    expect(uncontrolledState.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(uncontrolledState.battleRuntime?.battleCardAftermathOverlayPlacements)
      .not.toContainEqual(expect.objectContaining({
        sourceInstanceId: uncontrolledSiege,
      }));
  });

  test('places Protracted Siege after its eligible defender loses and retreats', () => {
    let state = startBattle();
    const contested = state.board.find(
      space => space.position === state.battle!.contestedPosition,
    )!;
    const siege = injectSiege(state, 'B', 'loss');

    state = revealGambits(state, undefined, siege);
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
    expect(state.battle?.loser).toBe('B');
    expect(state.battle?.positions.B).not.toBe(contested.position);
    expect(contested.controller).toBe('B');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: siege,
      owner: 'B',
      territoryInstanceId: contested.territoryInstanceId,
    }));
    expect(state.players.B.zones.graveyard).not.toContain(siege);
    expect(state.players.B.zones.discardPile).not.toContain(siege);
  });

  test('prunes Protracted Siege before shared Aftermath effects when its defender wins', () => {
    let state = startBattle();
    const siege = injectSiege(state, 'B', 'win');

    state = revealGambits(state, undefined, siege);
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
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
      .toContainEqual(expect.objectContaining({ sourceInstanceId: siege }));

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.overlays.some(overlay => overlay.instanceId === siege))
      .toBe(false);
    expect(state.players.B.zones.graveyard).toContain(siege);
  });

  test('owner-loss pruning also removes Protracted Siege from a non-result Aftermath', () => {
    const state = startBattle();
    const siege = injectSiege(state, 'B', 'non-result');
    const revealed = revealGambits(state, undefined, siege);

    expect(revealed.battleRuntime?.battleCardAftermathOverlayPlacements)
      .toContainEqual(expect.objectContaining({ sourceInstanceId: siege }));
    expect(revealed.battle?.loser).toBeNull();

    pruneV070ProtractedSiegeAftermathPlacements(revealed);

    expect(revealed.battleRuntime?.battleCardAftermathOverlayPlacements)
      .not.toContainEqual(expect.objectContaining({ sourceInstanceId: siege }));
  });
});
