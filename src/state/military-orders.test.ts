import { describe, expect, it } from 'vitest';
import type { BattleState } from '../types';
import { applyGameAction } from './apply';
import { initializeGame } from './initialize';
import { legalLeaderAbilitiesFor, useLeaderAbility } from './leader-abilities';
import { gainFactionResource } from './resources';
import { createValidSetup } from './test-helpers';

function gameWithLeader(leaderName: 'General' | 'Commandant' = 'General') {
  return initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1', name: 'Military', factionId: 'military', leaderName,
        deck: ['p1-card-1', 'p1-card-2', 'p1-card-3', 'p1-card-4'],
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

function resolvedBattle(attackerRoll: number, defenderRoll: number): BattleState {
  return {
    id: 'battle-1', stage: 'resolution', location: 'space-4', attackerOrigin: 'space-3',
    attacker: {
      playerId: 'player_1', passedHandCommit: true, passedBattleDrawPlay: true,
      hasDrawnBattleCards: true, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3,
      battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, diceRoll: attackerRoll, retreated: false,
    },
    defender: {
      playerId: 'player_2', passedHandCommit: true, passedBattleDrawPlay: true,
      hasDrawnBattleCards: true, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3,
      battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, diceRoll: defenderRoll, retreated: false,
    },
    tiePolicy: 'reroll', effectsResolved: [],
  };
}

function placeForBattle(game: ReturnType<typeof gameWithLeader>): void {
  for (const space of game.board.spaces) space.occupant = undefined;
  game.board.spaces.find((space) => space.id === 'space-3')!.occupant = 'player_1';
  game.board.spaces.find((space) => space.id === 'space-4')!.occupant = 'player_2';
  game.players.player_1.occupiedSpaceId = 'space-3';
  game.players.player_2.occupiedSpaceId = 'space-4';
  game.phase = 'battle';
}

describe('Military Command and Orders', () => {
  it('gains Command on the first Military battle victory each turn, including while already capped', () => {
    let game = gameWithLeader('General');
    placeForBattle(game);
    game.battle = resolvedBattle(6, 1);
    game = applyGameAction(game, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(game.players.player_1.resources?.command?.value).toBe(1);
    expect(game.players.player_1.factionTriggerUsage?.military_first_battle_win).toBe(1);

    game.pendingLeaderAbilityWindow = undefined;
    game.priorityPlayer = 'player_1';
    placeForBattle(game);
    game.battle = { ...resolvedBattle(6, 1), id: 'battle-2' };
    game = applyGameAction(game, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(game.players.player_1.resources?.command?.value).toBe(1);
  });

  it('implements General Onward, Rally, and Rout', () => {
    const game = gameWithLeader('General');
    gainFactionResource(game, 'player_1', 'command', 2);
    game.phase = 'action_before_movement';
    useLeaderAbility(game, 'player_1', 'general-onward');
    expect(game.players.player_1.movementRemaining).toBe(2);
    expect(game.phase).toBe('movement');

    game.phase = 'battle';
    game.battle = resolvedBattle(3, 3);
    game.battle.stage = 'dice';
    game.battle.attacker.diceRoll = undefined;
    game.battle.defender.diceRoll = undefined;
    gainFactionResource(game, 'player_1', 'command', 1);
    useLeaderAbility(game, 'player_1', 'general-rally');
    expect(game.battle.attacker.modifiers).toBe(1);

    game.battle = undefined;
    game.phase = 'action_after_movement';
    game.recentBattleResult = {
      battleId: 'battle-3', turn: 1, winner: 'player_1', loser: 'player_2', attacker: 'player_1', defender: 'player_2',
      location: 'space-4', attackerOrigin: 'space-3', retreatDirection: 1,
    };
    game.pendingLeaderAbilityWindow = { playerId: 'player_1', timing: 'after_battle', battleId: 'battle-3' };
    gainFactionResource(game, 'player_1', 'command', 2);
    expect(legalLeaderAbilitiesFor(game, 'player_1').map((ability) => ability.abilityId)).toContain('general-rout');
    useLeaderAbility(game, 'player_1', 'general-rout');
    expect(game.phase).toBe('movement');
  });

  it('implements Commandant Repel and Fortify', () => {
    const game = gameWithLeader('Commandant');
    for (const space of game.board.spaces) space.occupant = undefined;
    const occupied = game.board.spaces.find((space) => space.id === 'space-4')!;
    const loserSpace = game.board.spaces.find((space) => space.id === 'space-3')!;
    occupied.occupant = 'player_1';
    occupied.controller = 'player_2';
    occupied.capturePendingBy = 'player_1';
    loserSpace.occupant = 'player_2';
    game.players.player_1.occupiedSpaceId = occupied.id;
    game.players.player_2.occupiedSpaceId = loserSpace.id;
    game.phase = 'action_after_movement';
    game.recentBattleResult = {
      battleId: 'battle-4', turn: 1, winner: 'player_1', loser: 'player_2', attacker: 'player_2', defender: 'player_1',
      location: occupied.id, attackerOrigin: loserSpace.id, retreatDirection: -1,
    };
    game.pendingLeaderAbilityWindow = { playerId: 'player_1', timing: 'after_battle', battleId: 'battle-4' };

    gainFactionResource(game, 'player_1', 'command', 2);
    useLeaderAbility(game, 'player_1', 'commandant-fortify');
    expect(occupied.controller).toBe('player_1');
    expect(occupied.capturePendingBy).toBeUndefined();

    game.pendingLeaderAbilityWindow = { playerId: 'player_1', timing: 'after_battle', battleId: 'battle-5' };
    game.recentBattleResult = { ...game.recentBattleResult, battleId: 'battle-5' };
    gainFactionResource(game, 'player_1', 'command', 1);
    useLeaderAbility(game, 'player_1', 'commandant-repel');
    expect(game.players.player_2.occupiedSpaceId).toBe('space-2');
  });
});
