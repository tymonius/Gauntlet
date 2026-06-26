import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction } from './reducer';
import { createValidSetup } from './test-helpers';
import { toPrivateGameView, toPublicGameView } from './views';

function createBattleReadyGame(): GameState {
  const game = initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: ['card-valor', 'card-embargo', 'p1-card-3', 'p1-battle-1', 'card-conscription', 'p1-battle-3'],
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

describe('legal battle play affordances', () => {
  it('exposes legal hand commitments and pass during hand commit', () => {
    const battleStarted = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;

    expect(toPrivateGameView(battleStarted, 'player_1').battle?.legalBattlePlays).toEqual([
      { action: 'commit_battle_hand_card', cardId: 'card-valor', origin: 'hand' },
      { action: 'commit_battle_hand_card', cardId: 'card-embargo', origin: 'hand' },
      { action: 'commit_battle_hand_card', cardId: 'p1-card-3', origin: 'hand' },
      { action: 'pass_battle_hand_commit' },
    ]);
    expect(toPublicGameView(battleStarted).battle?.legalBattlePlays).toBeUndefined();
  });

  it('exposes legal battle-draw plays and pass during battle draw selection', () => {
    const battleStarted = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1PassedHand = applyGameAction(battleStarted, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
    const p2PassedHand = applyGameAction(p1PassedHand, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2PassedHand, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;

    expect(toPrivateGameView(p2Drew, 'player_1').battle?.legalBattlePlays).toEqual([
      { action: 'play_battle_draw_card', cardId: 'p1-battle-1', origin: 'battle_draw' },
      { action: 'play_battle_draw_card', cardId: 'card-conscription', origin: 'battle_draw' },
      { action: 'play_battle_draw_card', cardId: 'p1-battle-3', origin: 'battle_draw' },
      { action: 'pass_battle_draw_play' },
    ]);
  });

  it('removes legal plays after a player passes', () => {
    const battleStarted = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1PassedHand = applyGameAction(battleStarted, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;

    expect(toPrivateGameView(p1PassedHand, 'player_1').battle?.legalBattlePlays).toBeUndefined();
  });
});
