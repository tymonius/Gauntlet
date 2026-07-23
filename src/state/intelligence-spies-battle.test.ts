import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-spies';
import { continueIntelligenceBattle } from './intelligence-battle';
import { initializeGame } from './initialize';
import { toPrivateGameView, toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: false,
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
    id: 'intelligence-spies-battle',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Spies Player', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', factionId: 'military', leaderName: 'General', deck: ['b'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_2';
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

describe('Spies Battle effect', () => {
  it('reveals Spies early and exposes opposing used cards only to its owner', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('own-selection', 'player_1', 'battle_draw')];
    state.battle!.attacker.battleDraw = ['replacement'];
    state.battle!.defender.handCommit = played('opposing-hand', 'player_2', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('opposing-selection', 'player_2', 'battle_draw')];

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'spies_battle_reselect',
      playerId: 'player_1',
      currentSelectedCardId: 'own-selection',
      eligibleCardIds: ['replacement'],
    });
    expect(state.battle?.attacker.handCommit).toMatchObject({ cardId: 'intelligence-spies', faceDown: false, earlyEffectResolved: true });
    expect(toPublicGameView(state).battle?.defender.handCommit).toEqual({ faceDown: true });
    expect(toPrivateGameView(state, 'player_1').battle?.defender.handCommit).toMatchObject({ cardId: 'opposing-hand', faceDown: true });
    expect(toPrivateGameView(state, 'player_2').battle?.defender.handCommit).toMatchObject({ cardId: 'opposing-hand', faceDown: true });
    expect(state.battle?.observedBeforeNormalReveal?.player_2).toEqual(expect.arrayContaining(['opposing-hand', 'opposing-selection']));
  });

  it('replaces the selected Battle Hand card and then performs the normal reveal', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('old-selection', 'player_1', 'battle_draw')];
    state.battle!.attacker.battleDraw = ['new-selection'];
    state.battle!.defender.handCommit = played('opposing-hand', 'player_2', 'hand');

    continueIntelligenceBattle(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'new-selection',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.battleDraw).toContain('old-selection');
    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({ cardId: 'new-selection', faceDown: false }));
    expect(state.battle?.defender.handCommit).toMatchObject({ cardId: 'opposing-hand', faceDown: false });
  });

  it('keeps the current selection when the player passes', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('current', 'player_1', 'battle_draw')];
    state.battle!.attacker.battleDraw = ['alternative'];

    continueIntelligenceBattle(state);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'pass' }).state;

    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({ cardId: 'current', faceDown: false }));
    expect(state.battle?.attacker.battleDraw).toEqual(['alternative']);
  });

  it('opens another Spies window when the replacement card is also Spies', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('first-selection', 'player_1', 'battle_draw')];
    state.battle!.attacker.battleDraw = ['intelligence-spies', 'second-replacement'];
    state.battle!.defender.handCommit = played('opposing-hand', 'player_2', 'hand');

    continueIntelligenceBattle(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-spies',
    }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'spies_battle_reselect',
      currentSelectedCardId: 'intelligence-spies',
      eligibleCardIds: expect.arrayContaining(['second-replacement', 'first-selection']),
    });
    expect(state.battle?.stage).toBe('normal_reveal');
  });

  it('defers the normal reveal when the final Battle Hand choice is a pass', () => {
    let state = game();
    state.battle!.stage = 'battle_play_selection';
    state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('current', 'player_1', 'battle_draw')];
    state.battle!.attacker.battleDraw = ['alternative'];
    state.battle!.attacker.passedBattleDrawPlay = false;
    state.battle!.defender.passedBattleDrawPlay = false;
    state.battle!.defender.battleDraw = ['unused'];
    state.priorityPlayer = 'player_2';

    state = applyGameAction(state, { type: 'pass_battle_draw_play', playerId: 'player_2' }).state;

    expect(state.battle?.stage).toBe('normal_reveal');
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'spies_battle_reselect', playerId: 'player_1' });
    expect(state.battle?.defender.passedBattleDrawPlay).toBe(true);
  });

  it('records early observation evidence for an Active Spies Mission', () => {
    const state = game();
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-spies',
      kind: 'normal',
      startedTurn: state.turn - 1,
      startedLogIndex: state.log.length,
      requirementSatisfied: false,
      evidence: [],
    };
    state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('opposing-hand', 'player_2', 'hand');

    continueIntelligenceBattle(state);

    expect(state.players.player_1.intelligence?.activeMission?.evidence.some((entry) => entry.startsWith('spies:early-look:'))).toBe(true);
  });
});
