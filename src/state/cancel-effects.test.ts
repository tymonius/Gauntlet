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
        deck: ['card-embargo', 'p1-card-2', 'p1-card-3', 'p1-battle-1', 'p1-battle-2', 'p1-battle-3'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: ['card-valor', 'p2-card-2', 'p2-card-3', 'p2-battle-1', 'p2-battle-2', 'p2-battle-3'],
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

function advanceToResolution(): GameState {
  const battleStarted = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
  const p1Committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'card-embargo' }).state;
  const p2Committed = applyGameAction(p1Committed, { type: 'commit_battle_hand_card', playerId: 'player_2', cardId: 'card-valor' }).state;
  const p1Drew = applyGameAction(p2Committed, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
  const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
  const p1Passed = applyGameAction(p2Drew, { type: 'pass_battle_draw_play', playerId: 'player_1' }).state;
  const p2Passed = applyGameAction(p1Passed, { type: 'pass_battle_draw_play', playerId: 'player_2' }).state;
  const p1Rolled = applyGameAction(p2Passed, { type: 'roll_battle_die', playerId: 'player_1', value: 5 }).state;
  return applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 4 }).state;
}

describe('battle cancellation effects', () => {
  it('exposes valid Embargo targets to the Embargo player only', () => {
    const readyToResolve = advanceToResolution();

    expect(toPrivateGameView(readyToResolve, 'player_1').battle?.validBattleCardTargets).toEqual([
      {
        sourceCardId: 'card-embargo',
        sourceOwner: 'player_1',
        sourceOrigin: 'hand',
        targetCardId: 'card-valor',
        targetOwner: 'player_2',
        targetOrigin: 'hand',
      },
    ]);
    expect(toPrivateGameView(readyToResolve, 'player_2').battle?.validBattleCardTargets).toBeUndefined();
    expect(toPublicGameView(readyToResolve).battle?.validBattleCardTargets).toBeUndefined();
  });

  it('cancels a chosen opposing hand-committed battle card and returns it to hand', () => {
    const resolved = applyGameAction(advanceToResolution(), {
      type: 'resolve_battle',
      playerId: 'player_1',
      battleCardTargets: [
        {
          sourceCardId: 'card-embargo',
          sourceOwner: 'player_1',
          targetCardId: 'card-valor',
          targetOwner: 'player_2',
        },
      ],
    }).state;

    expect(resolved.board.spaces[1].occupant).toBe('player_1');
    expect(resolved.players.player_1.zones.graveyard).toContain('card-embargo');
    expect(resolved.players.player_2.zones.hand).toContain('card-valor');
    expect(resolved.players.player_2.zones.graveyard).not.toContain('card-valor');
  });

  it('does not auto-cancel if Embargo has no chosen target', () => {
    const resolved = applyGameAction(advanceToResolution(), { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(resolved.players.player_2.zones.hand).not.toContain('card-valor');
    expect(resolved.players.player_2.zones.graveyard).toContain('card-valor');
  });
});
