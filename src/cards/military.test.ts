import { describe, expect, it } from 'vitest';
import { initializeGame } from '../state/initialize';
import { createValidSetup } from '../state/test-helpers';
import { applyMilitaryActionEffect, militaryCardDefinitions, resolveMilitaryEndTurn } from './military';

function militaryGame() {
  return initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1', name: 'Military Player', factionId: 'military', leaderName: 'General',
        deck: ['military-encampment', 'military-reserve-force', 'military-unbroken-ranks', 'military-give-chase'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2', name: 'Opponent',
        deck: ['p2-card-1', 'p2-card-2', 'p2-card-3', 'p2-card-4'],
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  }));
}

describe('canonical Military card pool', () => {
  it('contains all twelve canonical cards with exact identifying text', () => {
    expect(militaryCardDefinitions).toHaveLength(12);
    expect(militaryCardDefinitions.map((card) => card.name)).toEqual([
      'Unbroken Ranks', 'Battlefield Promotion', 'Encampment', 'Rearguard', 'Brothers in Arms',
      'Field Command', 'Reserve Force', 'Give Chase', 'Hold the Line', 'Countercharge', 'War Crimes', 'Shock and Awe',
    ]);
    expect(militaryCardDefinitions.find((card) => card.name === 'Shock and Awe')).toMatchObject({ cost: 5, unique: true });
    expect(militaryCardDefinitions.find((card) => card.name === 'War Crimes')?.supplemental?.[0]).toContain('every card your opponent played from their Battle Hand');
    expect(militaryCardDefinitions.find((card) => card.name === 'Encampment')?.cardForm).toBe('Territory Overlay');
  });

  it('places Encampment as an Overlay and produces Command at end of turn', () => {
    const game = militaryGame();
    const player = game.players.player_1;
    const space = game.board.spaces.find((candidate) => candidate.kind === 'territory' && candidate.controller === player.id)!;
    game.board.spaces.forEach((candidate) => { if (candidate.occupant === player.id) candidate.occupant = undefined; });
    space.occupant = player.id;
    player.occupiedSpaceId = space.id;
    player.zones.removed.push('military-encampment');

    applyMilitaryActionEffect(game, player.id, 'military-encampment', [{ kind: 'space', spaceId: space.id }]);
    expect(space.overlays).toEqual([{ cardId: 'military-encampment', owner: player.id, faceUp: true }]);
    resolveMilitaryEndTurn(game, player.id);
    expect(player.resources?.command?.value).toBe(1);
  });

  it('stores a face-down Reserve Force card outside normal zones', () => {
    const game = militaryGame();
    const player = game.players.player_1;
    player.zones.assetBank.push('military-reserve-force');
    expect(player.zones.hand).toContain('military-unbroken-ranks');

    applyMilitaryActionEffect(game, player.id, 'military-reserve-force', [{ kind: 'card', cardId: 'military-unbroken-ranks', owner: player.id }]);
    expect(player.zones.hand).not.toContain('military-unbroken-ranks');
    expect(player.military?.storedCards['military-reserve-force']).toBe('military-unbroken-ranks');
  });
});
