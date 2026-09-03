import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { retreatV070Position } from './rules';

function startBattle(
  territoryId?: string,
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'core-battle-effects-test',
    seed: `core-battle-effects-${territoryId ?? 'blank'}`,
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
  if (territoryId) {
    state.board[3].territoryId = territoryId;
    state.board[3].blank = false;
  }

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
  cardId: string,
  suffix: string,
): string {
  const instanceId = `core-effect-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
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

describe('v0.7.0 core battle-effect modifiers', () => {
  test('Pathfinders gains +1 only when the contested Territory has an active printed effect', () => {
    let active = startBattle('territory-high-ground');
    const activePathfinders = injectHandCard(
      active,
      'A',
      'neutral-pathfinders',
      'active',
    );
    active = revealGambits(active, activePathfinders);

    expect(active.battleRuntime?.activePrintedTerritoryAtOnset)
      .toEqual(expect.objectContaining({
        territoryId: 'territory-high-ground',
      }));
    expect(active.battleRuntime?.participants.A.battleModifier).toBe(1);

    let blank = startBattle();
    const blankPathfinders = injectHandCard(
      blank,
      'A',
      'neutral-pathfinders',
      'blank',
    );
    blank = revealGambits(blank, blankPathfinders);

    expect(blank.battleRuntime?.activePrintedTerritoryAtOnset).toBeNull();
    expect(blank.battleRuntime?.participants.A.battleModifier).toBe(0);
  });

  test('Court Martial gives Disadvantage and adds one retreat after the normal retreat if the opponent loses', () => {
    let state = startBattle();
    const courtMartial = injectHandCard(
      state,
      'A',
      'neutral-court-martial',
      'retreat',
    );

    state = revealGambits(state, courtMartial);
    expect(state.battleRuntime?.participants.B.disadvantage).toBe(1);
    expect(state.battleRuntime?.additionalRetreatEffects).toContainEqual({
      sourceInstanceId: courtMartial,
      sourceCardId: 'neutral-court-martial',
      targetPlayer: 'B',
      steps: 1,
    });

    state = toOutcome(state);
    const normalRetreat = retreatV070Position(
      'B',
      3,
      state.board.length,
    );
    const expectedAfterCourtMartial = retreatV070Position(
      'B',
      normalRetreat,
      state.board.length,
    );

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1, 1],
    });

    expect(state.battle?.winner).toBe('A');
    expect(state.battle?.positions.B).toBe(expectedAfterCourtMartial);
    expect(state.events.some(event =>
      event.type === 'battle_card_aftermath_retreat'
      && (event.payload as { sourceCardId?: string }).sourceCardId
        === 'neutral-court-martial'
    )).toBe(true);
  });

  test('Unbroken Ranks grants one extra Command after normal victory Command when no Order was used', () => {
    let state = startBattle();
    const unbrokenRanks = injectHandCard(
      state,
      'A',
      'military-unbroken-ranks',
      'no-order',
    );

    state = revealGambits(state, unbrokenRanks);
    state = toOutcome(state);
    expect(state.players.A.military?.command).toBe(0);

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

    expect(state.players.A.military?.command).toBe(2);
    const gains = state.events.filter(event =>
      event.type === 'military_command_gained'
      && event.actor === 'A'
    );
    expect(gains).toHaveLength(2);
    expect((gains[0].payload as { reason?: string }).reason)
      .toBeUndefined();
    expect((gains[1].payload as { reason?: string }).reason)
      .toBe('Unbroken Ranks');
    expect(gains[0].index).toBeLessThan(gains[1].index);
  });

  test('Unbroken Ranks does not grant extra Command after an Order was used during that battle', () => {
    let state = startBattle();
    state.players.A.military!.command = 1;
    const unbrokenRanks = injectHandCard(
      state,
      'A',
      'military-unbroken-ranks',
      'with-order',
    );

    state = revealGambits(state, unbrokenRanks);
    state = toOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'use_general_rally',
      playerId: 'A',
    });

    expect(state.battleRuntime?.militaryOrderUsedPlayers).toContain('A');
    expect(state.players.A.military?.command).toBe(0);

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

    expect(state.players.A.military?.command).toBe(1);
    expect(state.events.filter(event =>
      event.type === 'military_command_gained'
      && event.actor === 'A'
      && (event.payload as { reason?: string }).reason === 'Unbroken Ranks'
    )).toHaveLength(0);
  });
});
