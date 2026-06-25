import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction } from './reducer';
import { createValidSetup } from './test-helpers';

function createBattleReadyGame(): GameState {
  const game = initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: ['card-conscription', 'p1-card-2', 'p1-card-3', 'p1-battle-1', 'p1-battle-2', 'p1-battle-3', 'p1-battle-4', 'p1-battle-5'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: ['p2-card-1', 'p2-card-2', 'p2-card-3', 'p2-battle-1', 'p2-battle-2', 'p2-battle-3'],
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  }));

  return {
    ...game,
    phase: 'movement' as const,
    players: {
      ...game.players,
      player_2: {
        ...game.players.player_2,
        occupiedSpaceId: 'space-1',
      },
    },
    board: {
      ...game.board,
      spaces: game.board.spaces.map((space) => {
        if (space.id === 'space-1') return { ...space, occupant: 'player_2' as const };
        if (space.id === 'player_2-heartland') return { ...space, occupant: undefined };
        return space;
      }),
    },
  };
}

describe('Conscription battle effect', () => {
  it('draws 4 battle cards when committed from hand', () => {
    const battleStarted = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1Committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'card-conscription' }).state;
    const p2Passed = applyGameAction(p1Committed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2Passed, { type: 'draw_battle_cards', playerId: 'player_1' }).state;

    expect(p1Drew.battle?.attacker.battleDrawCount).toBe(4);
    expect(p1Drew.battle?.attacker.battleDraw).toEqual(['p1-battle-1', 'p1-battle-2', 'p1-battle-3', 'p1-battle-4']);
  });

  it('may play 2 cards from the battle draw', () => {
    const battleStarted = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1Committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'card-conscription' }).state;
    const p2Passed = applyGameAction(p1Committed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2Passed, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    const p1PlayedFirst = applyGameAction(p2Drew, { type: 'play_battle_draw_card', playerId: 'player_1', cardId: 'p1-battle-1' }).state;
    const p1PlayedSecond = applyGameAction(p1PlayedFirst, { type: 'play_battle_draw_card', playerId: 'player_1', cardId: 'p1-battle-2' }).state;

    expect(p1PlayedSecond.battle?.stage).toBe('battle_play_selection');
    expect(p1PlayedSecond.battle?.attacker.battleDrawPlayed.map((card) => card.cardId)).toEqual(['p1-battle-1', 'p1-battle-2']);
  });

  it('supports partial battle draws when most cards are in the graveyard', () => {
    const game = createBattleReadyGame();
    game.players.player_1.zones.deck = ['only-battle-card'];
    game.players.player_1.zones.discard = [];
    game.players.player_1.zones.graveyard = ['dead-1', 'dead-2', 'dead-3'];

    const battleStarted = applyGameAction(game, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1Committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'card-conscription' }).state;
    const p2Passed = applyGameAction(p1Committed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2Passed, { type: 'draw_battle_cards', playerId: 'player_1' }).state;

    expect(p1Drew.battle?.attacker.battleDraw).toEqual(['only-battle-card']);
    expect(p1Drew.players.player_1.zones.graveyard).toEqual(['dead-1', 'dead-2', 'dead-3']);
  });
});
