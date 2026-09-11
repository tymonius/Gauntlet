import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';

function startBattle(territoryId?: string): V070GameState {
  let state = createV070StarterGame({
    gameId: `retreat-step-${territoryId ?? 'ordinary'}`,
    seed: `retreat-step-seed-${territoryId ?? 'ordinary'}`,
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
  const instanceId = `retreat-step-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function revealToOutcome(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bGambit,
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
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function retreatEvents(state: V070GameState) {
  return state.events
    .filter(event => event.type === 'battle_retreat_step')
    .map(event => event.payload as {
      playerId: 'A' | 'B';
      from: number;
      to: number;
      sourceKind: string;
      sourceLabel: string;
      sourceInstanceId: string | null;
      sourceCardId: string | null;
    });
}

describe('v0.7.0 shared battle Retreat steps', () => {
  test('observes the normal loss Retreat before Arena: No Quarter adds its next step', () => {
    let state = startBattle('territory-arena-no-quarter');
    state = revealToOutcome(state);
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

    const events = retreatEvents(state);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(expect.objectContaining({
      playerId: 'B',
      from: 3,
      to: 4,
      sourceKind: 'normal_battle_loss',
    }));
    expect(events[1]).toEqual(expect.objectContaining({
      playerId: 'B',
      from: 4,
      to: 5,
      sourceKind: 'territory',
      sourceLabel: 'Arena: No Quarter',
    }));
    expect(events[0].to).toBe(events[1].from);
  });

  test('routes Court Martial additional Retreat through the same chronological step procedure', () => {
    let state = startBattle();
    const courtMartial = injectHandCard(
      state,
      'A',
      'neutral-court-martial',
      'court-martial',
    );
    state = revealToOutcome(state, courtMartial);
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

    const events = retreatEvents(state);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(expect.objectContaining({
      sourceKind: 'normal_battle_loss',
      from: 3,
      to: 4,
    }));
    expect(events[1]).toEqual(expect.objectContaining({
      sourceKind: 'battle_card',
      sourceCardId: 'neutral-court-martial',
      sourceInstanceId: courtMartial,
      from: 4,
      to: 5,
    }));
  });

  test('Fortifications optional extra movement emits a shared Retreat step when used', () => {
    let state = startBattle();
    const fortifications = injectHandCard(
      state,
      'B',
      'neutral-fortifications',
      'fortifications',
    );
    state = revealToOutcome(state, undefined, fortifications);
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

    expect(state.battleRuntime?.pendingFortificationsRetreat)
      .toEqual(expect.objectContaining({
        playerId: 'B',
        sourceInstanceId: fortifications,
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_fortifications_retreat',
      playerId: 'B',
      use: true,
    });

    expect(retreatEvents(state).at(-1)).toEqual(expect.objectContaining({
      playerId: 'B',
      sourceKind: 'fortifications',
      sourceInstanceId: fortifications,
    }));
  });

  test('Commandant Repel uses the same step procedure after the attacker normal Retreat', () => {
    let state = startBattle();
    state = revealToOutcome(state);
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
    expect(state.players.B.military?.command).toBeGreaterThanOrEqual(1);
    const before = retreatEvents(state);
    expect(before.at(-1)).toEqual(expect.objectContaining({
      playerId: 'A',
      sourceKind: 'normal_battle_loss',
      from: 3,
      to: 2,
    }));

    state = reduceV070BattleAction(state, {
      type: 'use_commandant_repel',
      playerId: 'B',
    });

    expect(retreatEvents(state).at(-1)).toEqual(expect.objectContaining({
      playerId: 'A',
      sourceKind: 'military_order',
      sourceLabel: 'Commandant Repel',
      from: 2,
      to: 1,
    }));
  });
});
