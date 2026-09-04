import { describe, expect, it } from 'vitest';
import type { GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { ENTRENCHMENT } from './neutral-entrenchment';
import { initializeV06Game, type V06GameSetupInput } from './v06-setup';

function legalDeck(): string[] {
  return Array.from({ length: 30 }, () => 'neutral-rallying-cry');
}

function endpointGame(): GameState {
  const setup: V06GameSetupInput = {
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: legalDeck(),
        territories: ['territory-quicksand', 'territory-garrison', 'territory-high-ground'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: legalDeck(),
        territories: ['territory-watchtower', 'territory-supply-depot', 'territory-arena-grand-melee'],
      },
    ],
  };
  return initializeV06Game(setup);
}

function placePlayer(state: GameState, playerId: PlayerID, spaceId: string): void {
  for (const space of state.board.spaces) {
    if (space.occupant === playerId) space.occupant = undefined;
  }
  state.board.spaces.find((space) => space.id === spaceId)!.occupant = playerId;
  state.players[playerId].occupiedSpaceId = spaceId;
}

describe('Neutral Entrenchment board topology', () => {
  it('recognizes player two advancing toward lower indexes on the endpoint board', () => {
    let state = endpointGame();
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.phase = 'movement';
    state.players.player_2.movementRemaining = 2;
    state.players.player_1.zones.assetBank = [ENTRENCHMENT];
    placePlayer(state, 'player_2', 'space-5');
    placePlayer(state, 'player_1', 'space-3');

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_2',
      toSpaceId: 'space-4',
    }).state;

    expect(state.players.player_2.movementRemaining).toBe(0);
    expect(state.neutralEntrenchmentActionLocks).toEqual([{
      playerId: 'player_2',
      sourcePlayerId: 'player_1',
      turn: 1,
    }]);
  });
});
