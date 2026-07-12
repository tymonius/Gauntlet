import { describe, expect, it } from 'vitest';
import type { BattleState, GameState } from '../types';
import { EffectRegistry, totalModifiersFor } from './registry';
import {
  fortificationsAssetHandler,
  fortificationsBattleHandler,
  heartlandDefenseBonusHandler,
  valorBattleHandler,
} from './battle';

function battleState(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    id: 'battle-1',
    stage: 'resolution',
    location: 'space-1',
    attackerOrigin: 'player_1-heartland',
    tiePolicy: 'defender',
    effectsResolved: [],
    attacker: {
      playerId: 'player_1',
      passedHandCommit: false,
      passedBattleDrawPlay: false,
      hasDrawnBattleCards: false,
      battleDraw: [],
      battleDrawPlayed: [],
      battleDrawCount: 3,
      battleDrawPlayLimit: 1,
      rerollsRemaining: 0,
      modifiers: 0,
      retreated: false,
    },
    defender: {
      playerId: 'player_2',
      passedHandCommit: false,
      passedBattleDrawPlay: false,
      hasDrawnBattleCards: false,
      battleDraw: [],
      battleDrawPlayed: [],
      battleDrawCount: 3,
      battleDrawPlayLimit: 1,
      rerollsRemaining: 0,
      modifiers: 0,
      retreated: false,
    },
  };
  return { ...base, ...overrides };
}

function gameState(battle = battleState()): GameState {
  return {
    id: 'test-game',
    version: '0.5.6',
    phase: 'battle',
    turn: 1,
    activePlayer: 'player_1',
    players: {
      player_1: {
        id: 'player_1', name: 'Player One',
        zones: { deck: [], hand: [], discard: [], graveyard: [], assetBank: [], removed: [] },
        controlledTerritories: [], actionsRemaining: 1, movementRemaining: 0,
        hasPlayedActionThisTurn: false, hasPlayedBattleThisTurn: false,
      },
      player_2: {
        id: 'player_2', name: 'Player Two',
        zones: { deck: [], hand: [], discard: [], graveyard: [], assetBank: [], removed: [] },
        controlledTerritories: [], actionsRemaining: 1, movementRemaining: 0,
        hasPlayedActionThisTurn: false, hasPlayedBattleThisTurn: false,
      },
    },
    board: {
      layout: 'standard_1x6',
      spaces: [
        { id: 'player_1-heartland', index: 0, kind: 'heartland', controller: 'player_1', revealed: true },
        { id: 'space-1', index: 1, kind: 'heartland', controller: 'player_2', revealed: true },
      ],
    },
    battle,
    log: [],
  };
}

describe('battle effect handlers', () => {
  it('applies heartland defense bonus', () => {
    const battle = battleState();
    const game = gameState(battle);
    const result = new EffectRegistry([heartlandDefenseBonusHandler]).resolve({ game, battle, timing: 'before_battle_resolution' });
    expect(totalModifiersFor(result.modifiers, 'player_2')).toBe(1);
  });

  it('applies banked Fortifications to the defender', () => {
    const battle = battleState();
    const game = gameState(battle);
    game.players.player_2.zones.assetBank.push('card-fortifications');
    const result = new EffectRegistry([fortificationsAssetHandler]).resolve({ game, battle, timing: 'before_battle_resolution' });
    expect(totalModifiersFor(result.modifiers, 'player_2')).toBe(1);
  });

  it('applies played Fortifications to the defender', () => {
    const battle = battleState({
      defender: {
        ...battleState().defender,
        battleDrawPlayed: [{ cardId: 'card-fortifications', owner: 'player_2', origin: 'battle_draw', faceDown: false, canceled: false }],
      },
    });
    const result = new EffectRegistry([fortificationsBattleHandler]).resolve({ game: gameState(battle), battle, timing: 'before_battle_resolution' });
    expect(totalModifiersFor(result.modifiers, 'player_2')).toBe(1);
  });

  it('applies Valor to the player who played it', () => {
    const battle = battleState({
      attacker: {
        ...battleState().attacker,
        handCommit: { cardId: 'card-valor', owner: 'player_1', origin: 'hand', faceDown: false, canceled: false },
      },
    });
    const result = new EffectRegistry([valorBattleHandler]).resolve({ game: gameState(battle), battle, timing: 'before_battle_resolution' });
    expect(totalModifiersFor(result.modifiers, 'player_1')).toBe(2);
  });
});
