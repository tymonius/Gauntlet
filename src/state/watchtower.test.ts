import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction } from './reducer';
import { createValidSetup } from './test-helpers';
import { toPrivateGameView, toPublicGameView } from './views';

function createWatchtowerBattleReadyGame(): GameState {
  const game = initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: ['p1-card-1', 'p1-card-2', 'p1-card-3', 'p1-battle-1', 'p1-battle-2', 'p1-battle-3'],
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
        if (space.id === 'space-1') {
          return {
            ...space,
            controller: 'player_2' as const,
            occupant: 'player_2' as const,
            revealed: true,
            territoryId: 'territory-watchtower',
          };
        }
        if (space.id === 'player_2-heartland') return { ...space, occupant: undefined };
        return space;
      }),
    },
  };
}

describe('Watchtower reveal information', () => {
  it('reveals the attacker hand commitment only to the defending Watchtower controller', () => {
    const battleStarted = applyGameAction(createWatchtowerBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'p1-card-1' }).state;

    const defenderView = toPrivateGameView(committed, 'player_2');
    const attackerView = toPrivateGameView(committed, 'player_1');
    const publicView = toPublicGameView(committed);

    expect(defenderView.battle?.attacker.handCommit).toMatchObject({ cardId: 'p1-card-1' });
    expect(attackerView.battle?.attacker.handCommit).toMatchObject({ cardId: 'p1-card-1' });
    expect(publicView.battle?.attacker.handCommit).toEqual({ faceDown: true });
  });

  it('does not reveal attacker battle-draw plays early', () => {
    const battleStarted = applyGameAction(createWatchtowerBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1Committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'p1-card-1' }).state;
    const p2PassedHand = applyGameAction(p1Committed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2PassedHand, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    const p1Played = applyGameAction(p2Drew, { type: 'play_battle_draw_card', playerId: 'player_1', cardId: 'p1-battle-1' }).state;

    const defenderView = toPrivateGameView(p1Played, 'player_2');

    expect(defenderView.battle?.attacker.handCommit).toMatchObject({ cardId: 'p1-card-1' });
    expect(defenderView.battle?.attacker.battleDrawPlayed).toEqual([{ faceDown: true }]);
  });
});
