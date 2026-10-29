import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { beginV070MysticRite } from './mystics';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  discardV070Overlay,
  graveyardV070Overlay,
} from './overlays';

function ready(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'consecration-regression',
    seed: 'consecration-seed',
    players: {
      A: {
        name: 'Mystic',
        starterDeckId: 'mystics-alchemist-first-principles',
        selectedRiteIds: ['consecration', 'blood', 'crossing'],
      },
      B: { name: 'Military', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard', playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories', playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
}

function overlayInHand(state: V070GameState): string {
  const instanceId = 'consecration-overlay';
  state.cardInstances[instanceId] = {
    instanceId, owner: 'A', cardId: 'military-encampment',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function denouement(): V070GameState {
  let state = ready();
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'hold',
  });
  expect(state.turnState?.phase).toBe('denouement');
  return state;
}

function activeBattle(): V070GameState {
  let state = ready();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(item => { item.occupant = null; item.blank = true; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  expect(state.battle).not.toBeNull();
  return state;
}

function beginOn(state: V070GameState, position: number, begunEarlier = true): string {
  const instanceId = overlayInHand(state);
  beginV070MysticRite(state, 'A', 'consecration', {
    consecrationOverlayInstanceId: instanceId,
    consecrationTerritoryPosition: position,
  });
  if (begunEarlier) {
    state.players.A.mystics!.rites.consecration.begunTurn = state.turnNumber - 1;
  }
  return instanceId;
}

function revealNoCards(state: V070GameState): V070GameState {
  const a = state.battle!.attacker;
  const b = state.battle!.defender;
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: a });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: a });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: b });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: a });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: a });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: b });
  return reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: a });
}

describe('Rite of Consecration — canonical placement and exact Overlay tracking', () => {
  test('the beginning Action places an Overlay from Hand without an additional Action', () => {
    let state = denouement();
    const instanceId = overlayInHand(state);
    const actionsBefore = state.turnState!.actionsAvailable;
    const target = state.board[2];
    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite', playerId: 'A', riteId: 'consecration',
      consecrationOverlayInstanceId: instanceId,
      consecrationTerritoryPosition: target.position,
    });
    expect(state.turnState!.actionsAvailable).toBe(actionsBefore - 1);
    expect(state.players.A.zones.hand).not.toContain(instanceId);
    expect(state.players.A.mystics!.rites.consecration).toEqual(
      expect.objectContaining({
        status: 'begun',
        territoryInstanceId: target.territoryInstanceId,
        consecrationOverlayInstanceId: instanceId,
      }),
    );
    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId, territoryInstanceId: target.territoryInstanceId,
    }));
  });

  test('invalid Overlay placement is atomic and cannot spend the beginning Action', () => {
    const state = denouement();
    const before = structuredClone(state);
    expect(() => reduceV070TurnAction(state, {
      type: 'mystics_begin_rite', playerId: 'A', riteId: 'consecration',
      consecrationOverlayInstanceId: 'not-in-hand',
      consecrationTerritoryPosition: 2,
    })).toThrow(/not in the player.s Hand/);
    expect(state).toEqual(before);
  });

  test.each(['discard', 'graveyard'] as const)(
    'removing the exact consecrated Overlay to %s immediately resets the Rite',
    zone => {
      const state = ready();
      const instanceId = beginOn(state, 2);
      if (zone === 'discard') {
        discardV070Overlay(state, instanceId, 'consecration-test');
      } else {
        graveyardV070Overlay(state, instanceId, 'consecration-test');
      }
      expect(state.players.A.mystics!.rites.consecration.status).toBe('incomplete');
      expect(state.players.A.mystics!.rites.consecration.consecrationOverlayInstanceId)
        .toBeUndefined();
      expect(state.events.some(event =>
        event.type === 'mystic_rite_interrupted'
        && (event.payload as { reason?: string }).reason === 'consecrated_overlay_removed',
      )).toBe(true);
    },
  );

  test('winning on the exact consecrated Territory on a later turn completes it', () => {
    let state = activeBattle();
    beginOn(state, state.battle!.contestedPosition);
    state = revealNoCards(state);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'A', values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'B', values: [1],
    });
    expect(state.battle?.winner).toBe('A');
    expect(state.players.A.mystics!.rites.consecration.status).toBe('completed');
  });

  test('same-turn victory cannot complete Consecration', () => {
    let state = activeBattle();
    beginOn(state, state.battle!.contestedPosition, false);
    state = revealNoCards(state);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'A', values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'B', values: [1],
    });
    expect(state.players.A.mystics!.rites.consecration.status).toBe('begun');
  });

  test('losing on consecrated Territory interrupts, but losing elsewhere does not', () => {
    for (const onContestedTerritory of [true, false]) {
      let state = activeBattle();
      const position = onContestedTerritory ? state.battle!.contestedPosition : 1;
      beginOn(state, position);
      state = revealNoCards(state);
      state = reduceV070BattleAction(state, {
        type: 'submit_battle_dice', playerId: 'A', values: [1],
      });
      state = reduceV070BattleAction(state, {
        type: 'submit_battle_dice', playerId: 'B', values: [6],
      });
      expect(state.players.A.mystics!.rites.consecration.status).toBe(
        onContestedTerritory ? 'incomplete' : 'begun',
      );
    }
  });
});
