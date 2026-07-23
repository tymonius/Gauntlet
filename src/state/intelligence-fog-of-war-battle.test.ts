import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-fog-of-war';
import { continueIntelligenceBattle } from './intelligence-battle';
import { initializeGame } from './initialize';
import { toPrivateGameView, toPublicGameView } from './views';

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
    id: 'intelligence-fog-of-war-battle',
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

function qualifyingFogBattle(): GameState {
  const state = game();
  state.battle!.attacker.handCommit = played('intelligence-fog-of-war', 'player_1', 'hand');
  state.battle!.defender.handCommit = played('defender-hand-card', 'player_2', 'hand');
  state.battle!.defender.battleDrawPlayed = [played('defender-battle-card', 'player_2', 'battle_draw')];
  return state;
}

describe('Fog of War Battle effect', () => {
  it('reveals early and lets the opponent choose which source to lose', () => {
    const state = qualifyingFogBattle();

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'fog_of_war_return',
      playerId: 'player_2',
      fogOwnerId: 'player_1',
      handCardId: 'defender-hand-card',
      battleHandCardIds: ['defender-battle-card'],
    });
    expect(state.battle?.attacker.handCommit).toMatchObject({
      cardId: 'intelligence-fog-of-war',
      faceDown: false,
      earlyEffectResolved: true,
    });
    expect('pendingIntelligenceChoice' in toPublicGameView(state)).toBe(false);
    expect(toPrivateGameView(state, 'player_2').pendingIntelligenceChoice).toMatchObject({ kind: 'fog_of_war_return' });
    expect(toPrivateGameView(state, 'player_1').pendingIntelligenceChoice).toBeUndefined();
  });

  it('returns the opposing hand commitment without allowing a replacement', () => {
    let state = qualifyingFogBattle();
    continueIntelligenceBattle(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'return_hand',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.defender.handCommit).toBeUndefined();
    expect(state.battle?.defender.passedHandCommit).toBe(true);
    expect(state.players.player_2.zones.hand).toContain('defender-hand-card');
    expect(state.battle?.defender.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'defender-battle-card',
      faceDown: false,
    }));
  });

  it('returns the selected Battle Hand card without allowing a replacement', () => {
    let state = qualifyingFogBattle();
    continueIntelligenceBattle(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'return_battle_hand',
      cardId: 'defender-battle-card',
    }).state;

    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.defender.handCommit).toMatchObject({ cardId: 'defender-hand-card', faceDown: false });
    expect(state.battle?.defender.battleDrawPlayed).toHaveLength(0);
    expect(state.battle?.defender.battleDraw).toContain('defender-battle-card');
    expect(state.battle?.defender.passedBattleDrawPlay).toBe(true);
  });

  it('allows choosing a specific card when multiple Battle Hand cards were used', () => {
    let state = qualifyingFogBattle();
    state.battle!.defender.battleDrawPlayed.push(played('second-battle-card', 'player_2', 'battle_draw'));
    continueIntelligenceBattle(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'return_battle_hand',
      cardId: 'second-battle-card',
    }).state;

    expect(state.battle?.defender.battleDraw).toContain('second-battle-card');
    expect(state.battle?.defender.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'defender-battle-card',
      faceDown: false,
    }));
  });

  it('simply reveals when the opponent did not use both sources', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-fog-of-war', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('defender-hand-card', 'player_2', 'hand');

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.handCommit).toMatchObject({ faceDown: false, earlyEffectResolved: true });
    expect(state.battle?.defender.handCommit).toMatchObject({ faceDown: false });
  });

  it('resolves attacking Fog before defending Spies and can return the Spies card', () => {
    let state = qualifyingFogBattle();
    state.battle!.defender.battleDrawPlayed = [played('intelligence-spies', 'player_2', 'battle_draw')];
    continueIntelligenceBattle(state);
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'fog_of_war_return', playerId: 'player_2' });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'return_battle_hand',
      cardId: 'intelligence-spies',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.defender.battleDraw).toContain('intelligence-spies');
    expect(state.battle?.defender.battleDrawPlayed).toHaveLength(0);
  });

  it('resolves attacking Spies before defending Fog', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('attacker-selection', 'player_1', 'battle_draw')];
    state.battle!.attacker.battleDraw = ['attacker-alternative'];
    state.battle!.defender.handCommit = played('intelligence-fog-of-war', 'player_2', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('defender-selection', 'player_2', 'battle_draw')];

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'spies_battle_reselect',
      playerId: 'player_1',
    });
    expect(state.battle?.defender.handCommit).toMatchObject({
      cardId: 'intelligence-fog-of-war',
      faceDown: true,
    });
    expect(state.battle?.defender.handCommit?.earlyEffectResolved).toBeUndefined();
  });

  it('uses hand-commitment order before Battle Hand order for one player', () => {
    const spiesFirst = game();
    spiesFirst.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');
    spiesFirst.battle!.attacker.battleDrawPlayed = [played('intelligence-fog-of-war', 'player_1', 'battle_draw')];
    spiesFirst.battle!.attacker.battleDraw = ['replacement'];
    spiesFirst.battle!.defender.handCommit = played('defender-hand-card', 'player_2', 'hand');
    spiesFirst.battle!.defender.battleDrawPlayed = [played('defender-battle-card', 'player_2', 'battle_draw')];
    continueIntelligenceBattle(spiesFirst);
    expect(spiesFirst.pendingIntelligenceChoice).toMatchObject({ kind: 'spies_battle_reselect' });

    const fogFirst = game();
    fogFirst.battle!.attacker.handCommit = played('intelligence-fog-of-war', 'player_1', 'hand');
    fogFirst.battle!.attacker.battleDrawPlayed = [played('intelligence-spies', 'player_1', 'battle_draw')];
    fogFirst.battle!.defender.handCommit = played('defender-hand-card', 'player_2', 'hand');
    fogFirst.battle!.defender.battleDrawPlayed = [played('defender-battle-card', 'player_2', 'battle_draw')];
    continueIntelligenceBattle(fogFirst);
    expect(fogFirst.pendingIntelligenceChoice).toMatchObject({ kind: 'fog_of_war_return' });
  });

  it('defers the normal reveal when the final Battle Hand choice is a pass', () => {
    let state = game();
    state.battle!.stage = 'battle_play_selection';
    state.battle!.attacker.handCommit = played('intelligence-fog-of-war', 'player_1', 'hand');
    state.battle!.attacker.passedBattleDrawPlay = true;
    state.battle!.defender.handCommit = played('defender-hand-card', 'player_2', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('defender-battle-card', 'player_2', 'battle_draw')];
    state.battle!.defender.passedBattleDrawPlay = false;
    state.priorityPlayer = 'player_2';

    state = applyGameAction(state, {
      type: 'pass_battle_draw_play',
      playerId: 'player_2',
    }).state;

    expect(state.battle?.stage).toBe('normal_reveal');
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'fog_of_war_return', playerId: 'player_2' });
  });
});
