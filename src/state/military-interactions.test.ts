import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { resolveMilitaryChoice } from './military-interactions';
import { createValidSetup } from './test-helpers';
import type { GameState, PendingMilitaryChoice, RecentBattleResult } from '../types';

function game(): GameState {
  const state = initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General',
        deck: ['military-unbroken-ranks', 'military-battlefield-promotion', 'military-war-crimes', 'military-shock-and-awe'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2', name: 'Player Two',
        deck: ['p2-card-1', 'p2-card-2', 'p2-card-3', 'p2-card-4'],
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  }));
  state.recentBattleResult = {
    battleId: 'battle-1', turn: state.turn, winner: 'player_1', loser: 'player_2',
    attacker: 'player_1', defender: 'player_2', location: 'space-4', attackerOrigin: 'space-3',
    retreatDirection: 1, battleHandCards: { player_1: [], player_2: ['p2-card-1'] },
    handCommittedCards: {}, ordersUsed: {},
  } satisfies RecentBattleResult;
  return state;
}

function setChoice(state: GameState, choice: PendingMilitaryChoice): void {
  state.pendingMilitaryChoice = choice;
  state.priorityPlayer = choice.playerId;
}

describe('Military interaction windows', () => {
  it('resolves Battlefield Promotion by returning an eligible Battle Hand card', () => {
    const state = game();
    state.players.player_1.zones.discard.push('military-unbroken-ranks');
    setChoice(state, {
      kind: 'battlefield_promotion', playerId: 'player_1', sourceCardId: 'military-battlefield-promotion',
      options: ['military-unbroken-ranks'],
    });

    resolveMilitaryChoice(state, 'player_1', 'military-unbroken-ranks');
    expect(state.players.player_1.zones.hand).toContain('military-unbroken-ranks');
    expect(state.players.player_1.zones.discard).not.toContain('military-unbroken-ranks');
  });

  it('resolves War Crimes destinations, extra retreat, and victory restrictions', () => {
    const state = game();
    state.players.player_1.zones.assetBank.push('military-war-crimes');
    state.players.player_2.zones.discard.push('p2-card-1');
    const loserSpace = state.board.spaces.find((space) => space.occupant === 'player_2')!;
    const destination = state.board.spaces.find((space) => space.index === loserSpace.index + 1);
    if (destination) delete destination.occupant;
    setChoice(state, {
      kind: 'war_crimes', playerId: 'player_1', sourceCardId: 'military-war-crimes',
      defeatedPlayer: 'player_2', affectedCards: ['p2-card-1'], options: ['use', 'pass'],
    });

    resolveMilitaryChoice(state, 'player_1', 'use');
    expect(state.players.player_2.zones.graveyard).toContain('p2-card-1');
    expect(state.players.player_1.zones.graveyard).toContain('military-war-crimes');
    expect(state.players.player_1.military?.victoryRestrictions).toEqual({ noMovement: true, noCapture: true, noOrders: true });
  });

  it('resolves Shock and Awe Consolidate with immediate capture and Command 2', () => {
    const state = game();
    state.players.player_1.zones.assetBank.push('military-shock-and-awe');
    const location = state.board.spaces.find((space) => space.id === 'space-4')!;
    location.kind = 'territory';
    location.territoryId = 'p2-territory-1';
    location.controller = 'player_2';
    setChoice(state, {
      kind: 'shock_and_awe', playerId: 'player_1', sourceCardId: 'military-shock-and-awe',
      location: 'space-4', defeatedPlayer: 'player_2', options: ['consolidate'],
    });

    resolveMilitaryChoice(state, 'player_1', 'consolidate');
    expect(location.controller).toBe('player_1');
    expect(state.players.player_1.controlledTerritories).toContain('p2-territory-1');
    expect(state.players.player_1.resources?.command?.value).toBe(2);
  });
});
