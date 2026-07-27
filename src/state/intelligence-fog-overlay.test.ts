import { describe, expect, it } from 'vitest';
import type { GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-fog-overlay';
import { consumeFogOfWarOverlayAfterBattle, FOG_OF_WAR_OVERLAY } from './intelligence-fog-overlay';
import { initializeGame } from './initialize';
import { createV06StandardBoard } from './v06-board';
import { toPublicGameView } from './views';

function game(): GameState {
  const playerOne = {
    id: 'player_1',
    name: 'Attacker',
    factionId: 'intelligence',
    leaderName: 'Ranger',
    deck: ['card-valor', 'card-attrition', 'card-fortifications'],
    territories: ['t1', 't2', 't3'],
  };
  const playerTwo = {
    id: 'player_2',
    name: 'Defender',
    factionId: 'military',
    leaderName: 'General',
    deck: ['card-valor', 'card-attrition', 'card-fortifications'],
    territories: ['t4', 't5', 't6'],
  };
  const state = initializeGame({
    id: 'intelligence-fog-overlay',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [playerOne, playerTwo],
  });
  state.board = createV06StandardBoard([playerOne, playerTwo]).board;
  const origin = state.board.spaces.find((space) => space.index === 2)!;
  const location = state.board.spaces.find((space) => space.index === 3)!;
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.players.player_1.controlledTerritories = ['t1', 't2', 't3'];
  state.players.player_2.controlledTerritories = ['t4', 't5', 't6'];
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.movementRemaining = 1;
  return state;
}

function territoryAt(state: GameState, index: number) {
  return state.board.spaces.find((space) => space.kind === 'territory' && space.index === index)!;
}

function placeFog(state: GameState, owner: PlayerID = 'player_1', index = 3): GameState {
  const space = territoryAt(state, index);
  if (owner === 'player_1') {
    state.players.player_1.zones.hand = [FOG_OF_WAR_OVERLAY];
    return applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FOG_OF_WAR_OVERLAY,
      targets: [{ kind: 'space', spaceId: space.id }],
    }).state;
  }
  space.overlays ??= [];
  space.overlays.push({ cardId: FOG_OF_WAR_OVERLAY, owner, faceUp: true });
  return state;
}

function startBattle(state: GameState): GameState {
  state.phase = 'movement';
  state.players.player_1.movementRemaining = 1;
  return applyGameAction(state, {
    type: 'move_player',
    playerId: 'player_1',
    toSpaceId: territoryAt(state, 3).id,
  }).state;
}

describe('Fog of War Territory Overlay', () => {
  it('places the Action card visibly on a Territory instead of leaving it removed', () => {
    const state = placeFog(game());
    const location = territoryAt(state, 3);

    expect(state.players.player_1.zones.hand).not.toContain(FOG_OF_WAR_OVERLAY);
    expect(state.players.player_1.zones.removed).not.toContain(FOG_OF_WAR_OVERLAY);
    expect(location.overlays).toContainEqual({
      cardId: FOG_OF_WAR_OVERLAY,
      owner: 'player_1',
      faceUp: true,
    });
    expect(toPublicGameView(state).board.spaces.find((space) => space.id === location.id)?.overlays)
      .toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
  });

  it('requires a Territory target and rejects a second Fog Overlay on the same Territory', () => {
    const missingTarget = game();
    missingTarget.players.player_1.zones.hand = [FOG_OF_WAR_OVERLAY];
    expect(() => applyGameAction(missingTarget, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FOG_OF_WAR_OVERLAY,
    })).toThrow(/Territory target/i);

    const state = placeFog(game());
    state.phase = 'action_after_movement';
    state.players.player_1.actionsRemaining = 1;
    state.players.player_1.hasPlayedActionThisTurn = false;
    state.players.player_1.zones.hand = [FOG_OF_WAR_OVERLAY];
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FOG_OF_WAR_OVERLAY,
      targets: [{ kind: 'space', spaceId: territoryAt(state, 3).id }],
    })).toThrow(/already has/i);
  });

  it('remains on its Territory when a battle occurs elsewhere', () => {
    let state = placeFog(game(), 'player_1', 4);
    state = startBattle(state);

    expect(state.battle?.fogOfWarOverlayOwner).toBeUndefined();
    expect(territoryAt(state, 4).overlays).toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
    expect(state.players.player_1.zones.discard).not.toContain(FOG_OF_WAR_OVERLAY);
  });

  it('is removed for the next battle there and forces its attacking owner to commit second', () => {
    let state = startBattle(placeFog(game()));

    expect(state.battle?.fogOfWarOverlayOwner).toBe('player_1');
    expect(territoryAt(state, 3).overlays).toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
    expect(state.players.player_1.zones.discard).not.toContain(FOG_OF_WAR_OVERLAY);
    expect(state.priorityPlayer).toBe('player_2');

    expect(() => applyGameAction(state, {
      type: 'pass_battle_hand_commit',
      playerId: 'player_1',
    })).toThrow(/opponent.*first/i);

    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    expect(state.priorityPlayer).toBe('player_1');
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
    expect(state.battle?.stage).toBe('battle_draw');
  });

  it('forces a defending Overlay owner to wait for the attacking player', () => {
    let state = placeFog(game(), 'player_2');
    state = startBattle(state);

    expect(state.battle?.fogOfWarOverlayOwner).toBe('player_2');
    expect(state.priorityPlayer).toBe('player_1');
    expect(() => applyGameAction(state, {
      type: 'pass_battle_hand_commit',
      playerId: 'player_2',
    })).toThrow(/opponent.*first/i);

    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
    expect(state.priorityPlayer).toBe('player_2');
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    expect(state.battle?.stage).toBe('battle_draw');
  });

  it('allows Battle Hands to be drawn in either order but forces the Overlay owner to choose second', () => {
    let state = startBattle(placeFog(game()));
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;

    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    expect(state.battle?.stage).toBe('battle_play_selection');
    expect(state.priorityPlayer).toBe('player_2');

    expect(() => applyGameAction(state, {
      type: 'pass_battle_draw_play',
      playerId: 'player_1',
    })).toThrow(/Battle Hand.*first/i);

    state = applyGameAction(state, { type: 'pass_battle_draw_play', playerId: 'player_2' }).state;
    expect(state.priorityPlayer).toBe('player_1');
    state = applyGameAction(state, { type: 'pass_battle_draw_play', playerId: 'player_1' }).state;
    expect(['normal_reveal', 'dice']).toContain(state.battle?.stage);
  });

  it('waits until the opponent completes a modified multi-card Battle Hand choice', () => {
    let state = startBattle(placeFog(game()));
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    state.battle!.defender.battleDrawPlayLimit = 2;

    const first = state.battle!.defender.battleDraw[0];
    state = applyGameAction(state, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: first }).state;
    expect(state.priorityPlayer).toBe('player_2');
    expect(() => applyGameAction(state, {
      type: 'pass_battle_draw_play',
      playerId: 'player_1',
    })).toThrow(/Battle Hand.*first/i);

    state = applyGameAction(state, { type: 'pass_battle_draw_play', playerId: 'player_2' }).state;
    expect(state.priorityPlayer).toBe('player_1');
  });

  it('moves the Overlay to Discard only after the fought battle ends', () => {
    let state = startBattle(placeFog(game()));
    state.battle!.stage = 'resolution';
    state.battle!.attacker.diceRoll = 6;
    state.battle!.defender.diceRoll = 1;
    state.battle!.effectsResolved.push('before_battle_resolution');

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(territoryAt(state, 3).overlays ?? []).not.toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
    expect(state.players.player_1.zones.discard).toContain(FOG_OF_WAR_OVERLAY);
  });

  it('does not consume the Overlay when a battle ends before either player commits', () => {
    const state = startBattle(placeFog(game()));
    const battle = structuredClone(state.battle!);
    state.battle = undefined;

    expect(consumeFogOfWarOverlayAfterBattle(state, battle)).toBe(false);
    expect(territoryAt(state, 3).overlays).toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
    expect(state.players.player_1.zones.discard).not.toContain(FOG_OF_WAR_OVERLAY);
  });

});
