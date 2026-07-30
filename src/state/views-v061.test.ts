import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { applyV061GameBattleAction, beginV061GameBattle } from './game-battle-v061';
import { toPrivateV061GameView, toPublicV061GameView } from './views-v061';

function game() {
  return initializeGame({
    id: 'v061-view-test',
    version: 'v0.6.1',
    openingHandSize: 1,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: ['neutral-rallying-cry', 'neutral-contingency-plan', 'neutral-counterintelligence', 'neutral-fealty'],
        territories: ['territory-quicksand', 'territory-garrison', 'territory-high-ground'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: ['neutral-rallying-cry', 'neutral-contingency-plan', 'neutral-counterintelligence', 'neutral-fealty'],
        territories: ['territory-watchtower', 'territory-supply-depot', 'territory-field-hospital'],
      },
    ],
  });
}

describe('v0.6.1 game views', () => {
  it('shows only owners their face-down Gambit and Tactic identities', () => {
    let state = beginV061GameBattle(game(), {
      id: 'battle-v061-view-test',
      location: 'space-3',
      attackerOrigin: 'space-2',
      attacker: 'player_1',
      defender: 'player_2',
      tiePolicy: 'defender',
    });
    state = applyV061GameBattleAction(state, { type: 'complete_opening_effects' });
    state = applyV061GameBattleAction(state, {
      type: 'set_gambit',
      playerId: 'player_1',
      cardId: 'neutral-rallying-cry',
    });
    state = applyV061GameBattleAction(state, { type: 'pass_gambit', playerId: 'player_2' });
    state = applyV061GameBattleAction(state, { type: 'form_reserve', playerId: 'player_1' });
    state = applyV061GameBattleAction(state, { type: 'form_reserve', playerId: 'player_2' });
    state = applyV061GameBattleAction(state, { type: 'reveal_gambits' });
    state = applyV061GameBattleAction(state, {
      type: 'choose_tactics',
      playerId: 'player_1',
      cardIds: ['neutral-contingency-plan'],
    });

    const spectator = toPublicV061GameView(state);
    expect(spectator.battleV061?.attacker.gambit).toMatchObject({ cardId: 'neutral-rallying-cry' });
    expect(spectator.battleV061?.attacker.tactics).toEqual([{ faceDown: true }]);
    expect(spectator.battleV061?.attacker.reserveCount).toBe(2);

    const owner = toPrivateV061GameView(state, 'player_1');
    expect(owner.battleV061?.attacker.tactics[0]).toMatchObject({ cardId: 'neutral-contingency-plan' });
    expect(owner.players.player_1.zones.hand.kind).toBe('visible');

    const opponent = toPrivateV061GameView(state, 'player_2');
    expect(opponent.battleV061?.attacker.tactics).toEqual([{ faceDown: true }]);
  });
});
