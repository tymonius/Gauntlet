import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/v06';
import { initializeGame } from './initialize';
import { PATHFINDERS, preparePathfindersAction } from './neutral-pathfinders';

function game(): GameState {
  return initializeGame({
    id: 'neutral-audit-regressions',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'One',
        factionId: 'military',
        leaderName: 'General',
        deck: [PATHFINDERS],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: ['neutral-rallying-cry'],
        territories: ['territory-supply-depot', 'territory-old-battlefield', 'territory-refuge'],
      },
    ],
  });
}

describe('Neutral canonical audit regressions', () => {
  it('does not treat an Arena as a legal Pathfinders Action target', () => {
    const state = game();
    const target = state.board.spaces.find((space) => space.kind === 'territory')!;
    target.kind = 'arena';
    target.revealed = true;

    expect(() => preparePathfindersAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: PATHFINDERS,
      targets: [{ kind: 'space', spaceId: target.id }],
    })).toThrow('Pathfinders can target only a Territory.');
  });
});
