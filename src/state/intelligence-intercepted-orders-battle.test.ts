import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-intercepted-orders';
import { continueIntelligenceBattle } from './intelligence-battle';
import { initializeGame } from './initialize';
import { setFactionResource } from './resources';
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
    id: 'intelligence-intercepted-orders-battle',
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

function qualifyingBattle(): GameState {
  const state = game();
  state.battle!.attacker.handCommit = played('intelligence-intercepted-orders', 'player_1', 'hand');
  state.battle!.defender.battleDrawPlayed = [played('selected-card', 'player_2', 'battle_draw')];
  state.battle!.defender.battleDraw = ['unselected-card', 'other-card'];
  return state;
}

describe('Intercepted Orders Battle effect', () => {
  it('reveals early and privately exposes selected and unselected Battle Hand cards', () => {
    const state = qualifyingBattle();

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'intercepted_orders_battle_select',
      playerId: 'player_1',
      opponentId: 'player_2',
      selectedCardIds: ['selected-card'],
      unselectedCardIds: ['unselected-card', 'other-card'],
    });
    expect(state.battle?.attacker.handCommit).toMatchObject({
      faceDown: false,
      earlyEffectResolved: true,
    });
    expect('pendingIntelligenceChoice' in toPublicGameView(state)).toBe(false);
    expect(toPrivateGameView(state, 'player_1').pendingIntelligenceChoice).toMatchObject({ kind: 'intercepted_orders_battle_select' });
    expect(toPrivateGameView(state, 'player_2').pendingIntelligenceChoice).toBeUndefined();
  });

  it('prohibits an unselected card without changing the selected card', () => {
    let state = qualifyingBattle();
    continueIntelligenceBattle(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select_unselected',
      cardId: 'unselected-card',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.blockedBattleDrawCards?.player_2).toContain('unselected-card');
    expect(state.battle?.defender.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'selected-card',
      faceDown: false,
    }));
    expect(state.battle?.defender.battleDraw).toEqual(expect.arrayContaining(['unselected-card', 'other-card']));
  });

  it('returns a prohibited selected card and offers another eligible card', () => {
    let state = qualifyingBattle();
    continueIntelligenceBattle(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select_selected',
      cardId: 'selected-card',
    }).state;

    expect(state.battle?.defender.battleDrawPlayed).toHaveLength(0);
    expect(state.battle?.defender.battleDraw[0]).toBe('selected-card');
    expect(state.battle?.blockedBattleDrawCards?.player_2).toContain('selected-card');
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'intercepted_orders_battle_replacement',
      playerId: 'player_2',
      prohibitedCardId: 'selected-card',
      eligibleCardIds: expect.arrayContaining(['unselected-card', 'other-card']),
    });
    expect((state.pendingIntelligenceChoice as { eligibleCardIds: string[] }).eligibleCardIds).not.toContain('selected-card');
  });

  it('distinguishes selected and unselected copies with the same card ID', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-intercepted-orders', 'player_1', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('duplicate', 'player_2', 'battle_draw')];
    state.battle!.defender.battleDraw = ['duplicate', 'other-card'];
    continueIntelligenceBattle(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select_selected',
      cardId: 'duplicate',
    }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'intercepted_orders_battle_replacement',
      eligibleCardIds: expect.arrayContaining(['duplicate', 'other-card']),
    });
    expect(state.battle?.defender.battleDraw).toEqual(['duplicate', 'duplicate', 'other-card']);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'select',
      cardId: 'duplicate',
    }).state;

    expect(state.battle?.defender.battleDrawPlayed).toContainEqual(expect.objectContaining({ cardId: 'duplicate' }));
    expect(state.battle?.defender.battleDraw).toContain('duplicate');
    expect(state.battle?.blockedBattleDrawCards?.player_2).toEqual(['duplicate']);
  });

  it('allows the opponent to decline a replacement', () => {
    let state = qualifyingBattle();
    continueIntelligenceBattle(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select_selected',
      cardId: 'selected-card',
    }).state;

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'pass',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.defender.passedBattleDrawPlay).toBe(true);
    expect(state.battle?.defender.battleDrawPlayed).toHaveLength(0);
  });

  it('opens Surveillance after the opponent selects a replacement', () => {
    let state = qualifyingBattle();
    setFactionResource(state, 'player_1', 'intel', 1, 'test replacement Surveillance');
    continueIntelligenceBattle(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select_selected',
      cardId: 'selected-card',
    }).state;

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'select',
      cardId: 'other-card',
    }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'surveillance',
      playerId: 'player_1',
      targetOwner: 'player_2',
      targetCardId: 'other-card',
      targetSource: 'battle_draw',
    });
  });

  it('resolves attacking Assassins before defending Intercepted Orders', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('intelligence-intercepted-orders', 'player_2', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('attacker-selection', 'player_1', 'battle_draw')];
    state.battle!.defender.battleDrawPlayed = [played('defender-selection', 'player_2', 'battle_draw')];

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.defender.handCommit).toMatchObject({
      cardId: 'intelligence-intercepted-orders',
      negated: true,
    });
    expect(state.battle?.stage).toBe('dice');
  });

  it('resolves attacking Intercepted Orders before defending Assassins', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-intercepted-orders', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('intelligence-assassins', 'player_2', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('attacker-selection', 'player_1', 'battle_draw')];
    state.battle!.defender.battleDrawPlayed = [played('defender-selection', 'player_2', 'battle_draw')];

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'intercepted_orders_battle_select',
      playerId: 'player_1',
    });
    expect(state.battle?.defender.handCommit).toMatchObject({ faceDown: true });
  });

  it('records observation evidence for Spies and Deep Cover hooks', () => {
    const state = qualifyingBattle();
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-spies',
      kind: 'normal',
      startedTurn: state.turn - 1,
      startedLogIndex: state.log.length,
      requirementSatisfied: false,
      evidence: [],
    };

    continueIntelligenceBattle(state);

    expect(state.players.player_1.intelligence?.activeMission?.evidence.some((entry) => (
      entry.startsWith('spies:observed:battle-1:Intercepted Orders')
    ))).toBe(true);
    expect(state.battle?.observedBeforeNormalReveal?.player_2).toContain('selected-card');
  });

  it('simply reveals when the opponent has no Battle Hand cards', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-intercepted-orders', 'player_1', 'hand');

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.handCommit).toMatchObject({ faceDown: false, earlyEffectResolved: true });
  });
});
