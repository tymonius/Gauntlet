import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { advanceV070FrontLine } from './front-line';
import {
  V070_DEMILITARIZED_ZONE_ID,
  activeV070Overlay,
  placeV070OverlayFromHand,
  v070DmzBlocksEntryThisTurn,
} from './overlays';
import { viewV070GameForPlayer } from './views';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function setupGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'overlay-dmz-test',
    seed: 'overlay-dmz-seed',
    players: {
      A: { name: 'Diplomat', starterDeckId: diplomatStarter },
      B: { name: 'Opponent', starterDeckId: militaryStarter },
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

function syncOccupants(state: V070GameState): void {
  state.board.forEach(territory => { territory.occupant = null; });
  for (const playerId of ['A', 'B'] as const) {
    const position = state.players[playerId].position;
    if (position === null) continue;
    const territory = state.board.find(candidate => candidate.position === position);
    if (territory) territory.occupant = playerId;
  }
}

function activeBattle(): V070GameState {
  let state = setupGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  syncOccupants(state);

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function movementState(): V070GameState {
  let state = setupGame();
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  return reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
}

function injectCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix = '1',
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  if (state.cardInstances[instanceId]) throw new Error(`Duplicate fixture card ${instanceId}`);
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function finishSimpleBattle(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, { type: 'pass_terms', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
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
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
}

describe('v0.7.0 Territory Overlays and Demilitarized Zone', () => {
  test('accepted Terms may place DMZ after the Proposal effect and withdraw each player still there', () => {
    let state = activeBattle();
    const contested = state.board.find(territory => territory.position === 3)!;
    const contestedIdentity = contested.territoryInstanceId;
    const dmz = injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'orderly-withdrawal',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.battleRuntime?.terms.termsCardChoice?.kind).toBe('demilitarized_zone');
    expect(state.battle?.positions).toEqual({ A: 2, B: 3 });

    state = reduceV070BattleAction(state, {
      type: 'resolve_terms_card_choice',
      playerId: 'A',
      choice: 'place_overlay',
      cardInstanceId: dmz,
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.position).toBe(2);
    expect(state.players.B.position).toBe(4);
    expect(state.players.A.zones.hand).not.toContain(dmz);
    expect(state.overlays).toEqual([
      expect.objectContaining({
        instanceId: dmz,
        owner: 'A',
        territoryInstanceId: contestedIdentity,
        placedTurn: state.turnNumber,
      }),
    ]);
    expect(state.board.find(territory => territory.position === 3)?.occupant).toBeNull();
    expect(v070DmzBlocksEntryThisTurn(state, 3)).toBe(true);

    const view = viewV070GameForPlayer(state, 'B');
    expect(view.overlays).toEqual([
      expect.objectContaining({
        instanceId: dmz,
        cardId: V070_DEMILITARIZED_ZONE_ID,
        owner: 'A',
        territoryInstanceId: contestedIdentity,
        territoryPosition: 3,
        active: true,
      }),
    ]);
  });

  test('declining optional DMZ placement lets accepted Terms conclude normally', () => {
    let state = activeBattle();
    injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'orderly-withdrawal',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_terms_card_choice',
      playerId: 'A',
      choice: 'decline_overlay',
    });

    expect(state.overlays).toHaveLength(0);
    expect(state.battle).toBeNull();
    expect(state.players.A.position).toBe(2);
    expect(state.players.B.position).toBe(3);
  });

  test('Overlay attachment follows the physical Territory when numeric positions are reindexed', () => {
    const state = setupGame();
    const dmz = injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);
    const original = state.board.find(territory => territory.position === 2)!;
    const neighbor = state.board.find(territory => territory.position === 3)!;

    placeV070OverlayFromHand(state, 'A', dmz, 2, 'test');
    const attachedIdentity = original.territoryInstanceId;

    original.position = 3;
    neighbor.position = 2;

    expect(activeV070Overlay(state, 2)).toBeNull();
    expect(activeV070Overlay(state, 3)).toEqual(expect.objectContaining({
      instanceId: dmz,
      territoryInstanceId: attachedIdentity,
    }));

    const view = viewV070GameForPlayer(state, 'A');
    expect(view.overlays[0]).toEqual(expect.objectContaining({
      territoryInstanceId: attachedIdentity,
      territoryPosition: 3,
      territoryId: original.territoryId,
    }));
  });

  test('a covered DMZ is dormant, including its same-turn entry prohibition', () => {
    const state = setupGame();
    const dmz = injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);
    const blockade = injectCard(state, 'A', 'diplomats-sanctions-blockade');

    placeV070OverlayFromHand(state, 'A', dmz, 2, 'test');
    placeV070OverlayFromHand(state, 'A', blockade, 2, 'test');

    expect(activeV070Overlay(state, 2)?.instanceId).toBe(blockade);
    expect(v070DmzBlocksEntryThisTurn(state, 2)).toBe(false);

    const view = viewV070GameForPlayer(state, 'B');
    expect(view.overlays.find(overlay => overlay.instanceId === dmz)?.active).toBe(false);
    expect(view.overlays.find(overlay => overlay.instanceId === blockade)?.active).toBe(true);
  });

  test('entering an unoccupied active DMZ on a later turn requires one Hand discard', () => {
    let state = movementState();
    state.players.A.position = 1;
    state.players.B.position = 5;
    syncOccupants(state);

    const dmz = injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);
    const payment = state.players.A.zones.hand.find(instanceId => instanceId !== dmz)!;
    placeV070OverlayFromHand(state, 'A', dmz, 2, 'test');
    state.overlays[0].placedTurn = state.turnNumber - 1;

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    })).toThrow(/requires discarding one card from Hand/);

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
      discardInstanceId: payment,
    });

    expect(state.players.A.position).toBe(2);
    expect(state.players.A.zones.hand).not.toContain(payment);
    expect(state.players.A.zones.discardPile).toContain(payment);
  });

  test('normal Capture discards active DMZ instead of changing control', () => {
    let state = setupGame();
    state.players.A.position = 3;
    state.players.B.position = 5;
    syncOccupants(state);

    const target = state.board.find(territory => territory.position === 3)!;
    expect(target.controller).toBe('B');
    const dmz = injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);
    placeV070OverlayFromHand(state, 'A', dmz, 3, 'test');

    state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });

    expect(state.board.find(territory => territory.territoryInstanceId === target.territoryInstanceId)?.controller)
      .toBe('B');
    expect(state.overlays).toHaveLength(0);
    expect(state.players.A.zones.discardPile).toContain(dmz);
    expect(state.turnState?.phase).toBe('draw');
  });

  test('DMZ replaces one step, not an entire multi-step Front Line advance', () => {
    const state = setupGame();
    const target = state.board.find(territory => territory.position === 3)!;
    const dmz = injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);
    placeV070OverlayFromHand(state, 'A', dmz, 3, 'test');

    const result = advanceV070FrontLine(state, 'A', 2, 'test_advance_two');

    expect(state.overlays).toHaveLength(0);
    expect(state.players.A.zones.discardPile).toContain(dmz);
    expect(result.captures).toHaveLength(1);
    expect(result.captures[0].territoryId).toBe(target.territoryId);
    expect(state.board.find(territory => territory.territoryInstanceId === target.territoryInstanceId)?.controller)
      .toBe('A');
  });

  test('start-of-turn DMZ upkeep blocks Capture until the occupant discards or withdraws', () => {
    let state = movementState();
    const dmz = injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);
    placeV070OverlayFromHand(state, 'A', dmz, 3, 'test');

    state.players.B.position = 3;
    syncOccupants(state);

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'A',
    });
    const cleanupExcess = Math.max(0, state.players.A.zones.hand.length - 3);
    state = reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'A',
      discardInstanceIds: state.players.A.zones.hand.slice(0, cleanupExcess),
    });

    expect(state.activePlayer).toBe('B');
    expect(state.turnState?.phase).toBe('capture');
    expect(state.pendingTurnChoice).toEqual(expect.objectContaining({
      kind: 'demilitarized_zone_upkeep',
      playerId: 'B',
      overlayInstanceId: dmz,
    }));

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    })).toThrow(/pending start-of-turn Overlay choice/);

    state = reduceV070TurnAction(state, {
      type: 'resolve_start_turn_overlay_choice',
      playerId: 'B',
      choice: 'withdraw',
    });

    expect(state.players.B.position).toBe(4);
    expect(state.pendingTurnChoice).toBeNull();
    expect(state.turnState?.phase).toBe('capture');
  });

  test('an active DMZ present when a battle begins is discarded after that battle', () => {
    let state = movementState();
    state.players.A.position = 2;
    state.players.B.position = 3;
    syncOccupants(state);

    const dmz = injectCard(state, 'A', V070_DEMILITARIZED_ZONE_ID);
    placeV070OverlayFromHand(state, 'A', dmz, 3, 'test');
    state.overlays[0].placedTurn = state.turnNumber - 1;

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    expect(state.battle).not.toBeNull();

    state = finishSimpleBattle(state);

    expect(state.battle).toBeNull();
    expect(state.overlays).toHaveLength(0);
    expect(state.players.A.zones.discardPile).toContain(dmz);
    expect(state.events.some(event =>
      event.type === 'overlay_discarded'
      && (event.payload as { reason?: string })?.reason === 'demilitarized_zone_next_battle'
    )).toBe(true);
  });
});
