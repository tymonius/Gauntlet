import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, GameState } from '../types';
import { applyGameAction } from './apply';
import { initializeV06Game, type V06GameSetupInput } from './v06-setup';

function deck(): string[] {
  return Array.from({ length: 30 }, () => 'neutral-rallying-cry');
}

function setup(): V06GameSetupInput {
  return {
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: deck(),
        territories: ['territory-quicksand', 'territory-garrison', 'territory-high-ground'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: deck(),
        territories: ['territory-watchtower', 'territory-supply-depot', 'territory-field-hospital'],
      },
    ],
  };
}

function participant(playerId: string, diceRoll: number): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    diceRoll,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function lastStand(attackerRoll: number, defenderRoll: number): GameState {
  const game = initializeV06Game(setup());
  const attackerOrigin = game.board.spaces.find((space) => space.index === 7)!;
  const defenderPosition = game.board.spaces.find((space) => space.id === 'player_2-beyond-gauntlet')!;

  for (const space of game.board.spaces) space.occupant = undefined;
  attackerOrigin.controller = 'player_1';
  attackerOrigin.occupant = 'player_1';
  defenderPosition.occupant = 'player_2';
  game.players.player_1.occupiedSpaceId = attackerOrigin.id;
  game.players.player_2.occupiedSpaceId = defenderPosition.id;
  game.phase = 'battle';
  game.priorityPlayer = 'player_1';
  game.battle = {
    id: `${game.id}-last-stand`,
    stage: 'resolution',
    location: defenderPosition.id,
    attackerOrigin: attackerOrigin.id,
    attacker: participant('player_1', attackerRoll),
    defender: participant('player_2', defenderRoll),
    tiePolicy: 'defender',
    lastStand: true,
    effectsResolved: [],
  };

  return game;
}

describe('canonical v0.6 Last Stand resolution', () => {
  it('applies the separate +1 defender bonus and lets the defender win the resulting tie', () => {
    const result = applyGameAction(lastStand(4, 3), {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(result.winner).toBeUndefined();
    expect(result.phase).toBe('action_after_movement');
    expect(result.players.player_1.occupiedSpaceId).toBe('space-7');
    expect(result.players.player_2.occupiedSpaceId).toBe('player_2-beyond-gauntlet');
    expect(result.log.at(-1)).toMatchObject({
      type: 'battle_resolved',
      payload: expect.objectContaining({
        winner: 'player_2',
        attackerTotal: 4,
        defenderTotal: 4,
        tiePolicy: 'defender',
      }),
    });
  });

  it('ends the game only when the attacker wins the opponent’s Last Stand', () => {
    const result = applyGameAction(lastStand(6, 3), {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(result.winner).toBe('player_1');
    expect(result.phase).toBe('game_over');
    expect(result.priorityPlayer).toBe('player_1');
    expect(result.players.player_1.occupiedSpaceId).toBe('player_2-beyond-gauntlet');
    expect(result.log.at(-1)).toMatchObject({
      type: 'last_stand_won',
      actor: 'player_1',
      payload: { winner: 'player_1', defeatedPlayer: 'player_2' },
    });
  });
});
