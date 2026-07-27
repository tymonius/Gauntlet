import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-intelligence';
import { initializeGame } from './initialize';
import { markBattleCardsObservedBeforeNormalReveal } from './battle-observation';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function played(cardId: string, owner: PlayerID, origin: 'hand' | 'battle_draw'): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false };
}

function game(): GameState {
  const state = initializeGame({
    id: 'intelligence-simple-battle',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Attacker', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Defender', factionId: 'intelligence', leaderName: 'Spymaster', deck: ['b'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  for (const space of state.board.spaces) space.occupant = undefined;
  territories[1].occupant = 'player_1';
  territories[2].occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = territories[1].id;
  state.players.player_2.occupiedSpaceId = territories[2].id;
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'battle-1',
    stage: 'dice',
    location: territories[2].id,
    attackerOrigin: territories[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return state;
}

function resolveReveal(state: GameState): GameState {
  return applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
}

function finishBattle(state: GameState, attackerRoll = 6, defenderRoll = 1): GameState {
  let next = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: attackerRoll }).state;
  next = applyGameAction(next, { type: 'roll_battle_die', playerId: 'player_2', value: defenderRoll }).state;
  return applyGameAction(next, { type: 'resolve_battle', playerId: 'player_1' }).state;
}

describe('simple Intelligence Battle effects', () => {
  it('gives hand-committed Disinformation advantage and returns it to hand during cleanup', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-disinformation', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('card-valor', 'player_2', 'hand');

    state = resolveReveal(state);
    expect(state.battle?.attacker.advantage).toBe(1);
    expect(state.battle?.defender.modifiers).toBe(2);

    state = finishBattle(state);
    expect(state.players.player_1.zones.hand).toContain('intelligence-disinformation');
    expect(state.players.player_1.zones.graveyard).not.toContain('intelligence-disinformation');
    expect(state.players.player_2.zones.graveyard).toContain('card-valor');
  });

  it('does not grant or return Disinformation selected from the Battle Hand', () => {
    let state = game();
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-disinformation', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('card-valor', 'player_2', 'hand');

    state = resolveReveal(state);
    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
    state = finishBattle(state);
    expect(state.players.player_1.zones.discard).toContain('intelligence-disinformation');
    expect(state.players.player_1.zones.hand).not.toContain('intelligence-disinformation');
  });

  it('reveals and negates the opposing hand commitment with Assassins', () => {
    let state = game();
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = { ...played('card-valor', 'player_2', 'hand'), faceDown: true };

    state = resolveReveal(state);
    expect(state.battle?.defender.handCommit).toMatchObject({ faceDown: false, negated: true });
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.battle?.observedBeforeNormalReveal?.player_2).toContain('card-valor');
  });

  it('gives the opponent disadvantage when Assassins finds no hand commitment', () => {
    let state = game();
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];

    state = resolveReveal(state);
    expect(state.battle?.defender.disadvantage).toBe(1);
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', values: [5, 2] }).state;
    expect(state.battle?.defender.diceRoll).toBe(2);
  });

  it('resolves attacker early effects before defender early effects', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('card-valor', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('intelligence-disinformation', 'player_2', 'hand');

    state = resolveReveal(state);
    expect(state.battle?.defender.handCommit?.negated).toBe(true);
    expect(state.battle?.defender.advantage ?? 0).toBe(0);
    state = finishBattle(state);
    expect(state.players.player_2.zones.graveyard).toContain('intelligence-disinformation');
    expect(state.players.player_2.zones.hand).not.toContain('intelligence-disinformation');
  });

  it('gives Deep Cover advantage when an opposing effect observed a used face-down card early', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('card-valor', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-deep-cover', 'player_1', 'battle_draw')];
    markBattleCardsObservedBeforeNormalReveal(state, 'player_1', ['card-valor']);

    state = resolveReveal(state);
    expect(state.battle?.attacker.advantage).toBe(1);
  });

  it('does not grant Deep Cover advantage for an observed card that was not used', () => {
    let state = game();
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-deep-cover', 'player_1', 'battle_draw')];
    markBattleCardsObservedBeforeNormalReveal(state, 'player_1', ['some-other-card']);

    state = resolveReveal(state);
    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
  });

  it('does not resolve Deep Cover after Assassins negates it', () => {
    let state = game();
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = { ...played('intelligence-deep-cover', 'player_2', 'hand'), faceDown: true };
    markBattleCardsObservedBeforeNormalReveal(state, 'player_2', ['intelligence-deep-cover']);

    state = resolveReveal(state);
    expect(state.battle?.defender.handCommit?.negated).toBe(true);
    expect(state.battle?.defender.advantage ?? 0).toBe(0);
  });

  it('does not apply simple reveal effects twice', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-disinformation', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('card-valor', 'player_2', 'hand');
    state = resolveReveal(state);
    expect(state.battle?.attacker.advantage).toBe(1);
    expect(() => applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' })).toThrow('already resolved');
    expect(state.battle?.attacker.advantage).toBe(1);
  });
});
