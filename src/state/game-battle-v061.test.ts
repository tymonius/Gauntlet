import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import {
  applyV061GameBattleAction,
  beginV061GameBattle,
  V061GameBattleError,
  v061CardEligibleForRole,
} from './game-battle-v061';

function game(version = 'v0.6.1') {
  return initializeGame({
    id: 'v061-game-battle-test',
    version,
    openingHandSize: 1,
    shuffleDecks: false,
    startingPlayer: 'player_1',
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: [
          'neutral-rallying-cry',
          'neutral-contingency-plan',
          'neutral-counterintelligence',
          'neutral-fealty',
        ],
        territories: ['territory-quicksand', 'territory-garrison', 'territory-high-ground'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: [
          'neutral-rallying-cry',
          'neutral-contingency-plan',
          'neutral-counterintelligence',
          'neutral-fealty',
        ],
        territories: ['territory-watchtower', 'territory-supply-depot', 'territory-field-hospital'],
      },
    ],
  });
}

function startedGame() {
  return beginV061GameBattle(game(), {
    id: 'battle-v061-game-test',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: 'player_1',
    defender: 'player_2',
    tiePolicy: 'defender',
  });
}

describe('v0.6.1 battle integration with game zones', () => {
  it('moves a Gambit from Hand, draws Reserves, chooses Tactics, and cleans up by role', () => {
    let state = startedGame();
    state = applyV061GameBattleAction(state, { type: 'complete_opening_effects' });
    state = applyV061GameBattleAction(state, {
      type: 'set_gambit',
      playerId: 'player_1',
      cardId: 'neutral-rallying-cry',
    });
    state = applyV061GameBattleAction(state, { type: 'pass_gambit', playerId: 'player_2' });

    expect(state.players.player_1.zones.hand).toEqual([]);
    expect(state.battleV061?.attacker.gambit?.cardId).toBe('neutral-rallying-cry');

    state = applyV061GameBattleAction(state, { type: 'form_reserve', playerId: 'player_2' });
    state = applyV061GameBattleAction(state, { type: 'form_reserve', playerId: 'player_1' });

    expect(state.battleV061?.attacker.reserve).toEqual([
      'neutral-contingency-plan',
      'neutral-counterintelligence',
      'neutral-fealty',
    ]);
    expect(state.players.player_1.zones.deck).toEqual([]);

    state = applyV061GameBattleAction(state, { type: 'reveal_gambits' });
    state = applyV061GameBattleAction(state, {
      type: 'choose_tactics',
      playerId: 'player_1',
      cardIds: ['neutral-contingency-plan'],
    });
    state = applyV061GameBattleAction(state, {
      type: 'choose_tactics',
      playerId: 'player_2',
      cardIds: ['neutral-counterintelligence'],
    });
    state = applyV061GameBattleAction(state, { type: 'reveal_tactics' });
    state = applyV061GameBattleAction(state, {
      type: 'record_battle_result',
      winner: 'player_1',
      loser: 'player_2',
    });
    state = applyV061GameBattleAction(state, { type: 'begin_aftermath' });
    state = applyV061GameBattleAction(state, { type: 'complete_aftermath_cleanup' });

    expect(state.battleV061).toBeUndefined();
    expect(state.phase).toBe('action_after_movement');
    expect(state.players.player_1.zones.graveyard).toEqual(['neutral-rallying-cry']);
    expect(state.players.player_1.zones.discard).toEqual([
      'neutral-contingency-plan',
      'neutral-counterintelligence',
      'neutral-fealty',
    ]);
    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.players.player_2.zones.discard).toEqual([
      'neutral-counterintelligence',
      'neutral-contingency-plan',
      'neutral-fealty',
    ]);
  });

  it('uses the canonical v0.6.1 headings to determine role eligibility', () => {
    expect(v061CardEligibleForRole('neutral-rallying-cry', 'gambit')).toBe(true);
    expect(v061CardEligibleForRole('neutral-rallying-cry', 'tactic')).toBe(true);
    expect(v061CardEligibleForRole('not-a-canonical-card', 'gambit')).toBe(false);
  });

  it('does not remove a Hand card when the attempted Gambit is illegal', () => {
    let state = startedGame();
    state = applyV061GameBattleAction(state, { type: 'complete_opening_effects' });

    expect(() => applyV061GameBattleAction(state, {
      type: 'set_gambit',
      playerId: 'player_1',
      cardId: 'not-a-canonical-card',
    })).toThrow(/not eligible as a Gambit/);
    expect(state.players.player_1.zones.hand).toEqual(['neutral-rallying-cry']);
    expect(state.battleV061?.attacker.gambit).toBeUndefined();
  });

  it('keeps the staged path unavailable to v0.6.0 games', () => {
    expect(() => beginV061GameBattle(game('v0.6.0'), {
      id: 'wrong-version-battle',
      location: 'space-3',
      attackerOrigin: 'space-2',
      attacker: 'player_1',
      defender: 'player_2',
      tiePolicy: 'defender',
    })).toThrow(V061GameBattleError);
  });

  it('cleans up a withdrawal without creating a winner or loser', () => {
    let state = startedGame();
    state = applyV061GameBattleAction(state, { type: 'complete_opening_effects' });
    state = applyV061GameBattleAction(state, {
      type: 'set_gambit',
      playerId: 'player_1',
      cardId: 'neutral-rallying-cry',
    });
    state = applyV061GameBattleAction(state, {
      type: 'record_withdrawal',
      withdrawingPlayers: ['player_1'],
    });

    expect(state.battleV061?.stage).toBe('aftermath');
    expect(state.battleV061?.noWinner).toBe(true);
    expect(state.battleV061?.winner).toBeUndefined();
    expect(state.battleV061?.loser).toBeUndefined();

    state = applyV061GameBattleAction(state, { type: 'complete_aftermath_cleanup' });
    expect(state.players.player_1.zones.graveyard).toEqual(['neutral-rallying-cry']);
  });
});
