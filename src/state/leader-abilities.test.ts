import { describe, expect, it } from 'vitest';
import type { BattleState } from '../types';
import { initializeGame } from './initialize';
import {
  LeaderAbilityError,
  LeaderAbilityRegistry,
  legalLeaderAbilitiesFor,
  resetLeaderAbilityUsageAfterBattle,
  resetLeaderAbilityUsageForNewTurn,
  useLeaderAbility,
} from './leader-abilities';
import { gainFactionResource } from './resources';
import { createValidSetup } from './test-helpers';

function gameWithLeader(leaderName = 'General') {
  return initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName,
        deck: ['p1-card-1', 'p1-card-2', 'p1-card-3', 'p1-card-4'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: ['p2-card-1', 'p2-card-2', 'p2-card-3', 'p2-card-4'],
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  }));
}

function openBattle(game: ReturnType<typeof gameWithLeader>): void {
  game.phase = 'battle';
  game.battle = {
    id: 'battle-1',
    stage: 'dice',
    location: 'space-4',
    attackerOrigin: 'space-3',
    attacker: {
      playerId: 'player_1', passedHandCommit: true, passedBattleDrawPlay: true,
      hasDrawnBattleCards: true, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3,
      battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, retreated: false,
    },
    defender: {
      playerId: 'player_2', passedHandCommit: true, passedBattleDrawPlay: true,
      hasDrawnBattleCards: true, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3,
      battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, retreated: false,
    },
    tiePolicy: 'reroll',
    effectsResolved: [],
  } satisfies BattleState;
}

describe('Leader ability framework', () => {
  it('offers and resolves a canonical ability only at its legal timing with enough resources', () => {
    const game = gameWithLeader('General');
    gainFactionResource(game, 'player_1', 'command', 1);
    expect(legalLeaderAbilitiesFor(game, 'player_1')).toEqual([]);

    openBattle(game);
    expect(legalLeaderAbilitiesFor(game, 'player_1').map((ability) => ability.abilityId)).toContain('general-rally');
    useLeaderAbility(game, 'player_1', 'general-rally');

    expect(game.players.player_1.resources?.command?.value).toBe(0);
    expect(game.battle?.attacker.modifiers).toBe(1);
    expect(game.log.at(-1)?.type).toBe('leader_ability_used');
  });

  it('rejects wrong timing and insufficient resources', () => {
    const game = gameWithLeader('General');
    expect(() => useLeaderAbility(game, 'player_1', 'general-rally')).toThrow(LeaderAbilityError);
    openBattle(game);
    expect(() => useLeaderAbility(game, 'player_1', 'general-rally')).toThrow(LeaderAbilityError);
  });

  it('enforces once-per-turn and once-per-battle limits and resets their state', () => {
    const game = gameWithLeader('General');
    game.phase = 'action_before_movement';
    const registry = new LeaderAbilityRegistry([
      {
        id: 'test-turn', leaderName: 'General', name: 'Turn Test', text: 'Test.',
        timing: 'action_opportunity', usageLimit: 'once_per_turn', resolve: () => undefined,
      },
      {
        id: 'test-battle', leaderName: 'General', name: 'Battle Test', text: 'Test.',
        timing: 'before_battle_dice', usageLimit: 'once_per_battle', resolve: () => undefined,
      },
    ]);

    useLeaderAbility(game, 'player_1', 'test-turn', registry);
    expect(() => useLeaderAbility(game, 'player_1', 'test-turn', registry)).toThrow(LeaderAbilityError);
    resetLeaderAbilityUsageForNewTurn(game, 'player_1');
    expect(() => useLeaderAbility(game, 'player_1', 'test-turn', registry)).not.toThrow();

    openBattle(game);
    useLeaderAbility(game, 'player_1', 'test-battle', registry);
    expect(() => useLeaderAbility(game, 'player_1', 'test-battle', registry)).toThrow(LeaderAbilityError);
    resetLeaderAbilityUsageAfterBattle(game);
    game.battle!.id = 'battle-2';
    expect(() => useLeaderAbility(game, 'player_1', 'test-battle', registry)).not.toThrow();
  });
});
