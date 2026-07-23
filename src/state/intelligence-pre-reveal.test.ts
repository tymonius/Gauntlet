import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-fog-of-war';
import { continueIntelligenceBattle } from './intelligence-battle';
import { initializeGame } from './initialize';

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
  return { cardId, owner, origin, faceDown: true, canceled: false };
}

function game(): GameState {
  const state = initializeGame({
    id: 'intelligence-pre-reveal-order',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Attacker', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Defender', factionId: 'intelligence', leaderName: 'Spymaster', deck: ['b'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'battle-1',
    stage: 'normal_reveal',
    location: territories[2].id,
    attackerOrigin: territories[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return state;
}

describe('unified Intelligence pre-reveal ordering', () => {
  it('resolves attacking Assassins before defending Fog of War', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('intelligence-fog-of-war', 'player_2', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('defender-selection', 'player_2', 'battle_draw')];

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.handCommit).toMatchObject({ faceDown: false, earlyEffectResolved: true });
    expect(state.battle?.defender.handCommit).toMatchObject({
      cardId: 'intelligence-fog-of-war',
      faceDown: false,
      negated: true,
    });
  });

  it('resolves attacking Disinformation before defending Fog of War', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-disinformation', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('attacker-selection', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('intelligence-fog-of-war', 'player_2', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('defender-selection', 'player_2', 'battle_draw')];

    continueIntelligenceBattle(state);

    expect(state.battle?.attacker.advantage).toBe(1);
    expect(state.battle?.attacker.handCommit).toMatchObject({ faceDown: false, earlyEffectResolved: true });
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'fog_of_war_return',
      playerId: 'player_1',
    });
  });

  it('counts an Assassins-negated card as used for a later Fog of War', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-fog-of-war', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('defender-hand', 'player_2', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('defender-selection', 'player_2', 'battle_draw')];

    continueIntelligenceBattle(state);

    expect(state.battle?.defender.handCommit).toMatchObject({ negated: true });
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'fog_of_war_return',
      playerId: 'player_2',
      handCardId: 'defender-hand',
    });
  });

  it('returns an Assassins-negated hand commitment through Fog of War', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-fog-of-war', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('defender-hand', 'player_2', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('defender-selection', 'player_2', 'battle_draw')];
    continueIntelligenceBattle(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'return_hand',
    }).state;

    expect(state.players.player_2.zones.hand).toContain('defender-hand');
    expect(state.battle?.defender.handCommit).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
  });

  it('resolves one player’s hand commitment before their Battle Hand selection', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-spies', 'player_1', 'battle_draw')];
    state.battle!.attacker.battleDraw = ['replacement'];
    state.battle!.defender.handCommit = played('defender-hand', 'player_2', 'hand');

    continueIntelligenceBattle(state);

    expect(state.battle?.defender.handCommit).toMatchObject({ negated: true });
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'spies_battle_reselect',
      playerId: 'player_1',
    });
  });

  it('falls back safely when a test fixture begins after the pre-reveal stage', () => {
    const state = game();
    state.battle!.stage = 'dice';
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('defender-hand', 'player_2', 'hand');

    const resolved = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(resolved.battle?.defender.handCommit).toMatchObject({ negated: true });
    expect(resolved.battle?.effectsResolved).toContain('intelligence_simple_reveal_effects');
  });
});
