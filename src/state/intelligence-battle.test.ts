import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, CardID, GameState, PlayerID } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-intelligence';
import { initializeGame } from './initialize';
import { setFactionResource } from './resources';
import { toPrivateGameView, toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
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
  };
}

function game(stage: 'hand_commit' | 'battle_play_selection' = 'hand_commit'): GameState {
  const state = initializeGame({
    id: 'intelligence-battle',
    version: 'v0.6.0',
    shuffleDecks: false,
    openingHandSize: 0,
    players: [
      { id: 'player_1', name: 'Intelligence', factionId: 'intelligence', leaderName: 'Spymaster', deck: ['i1', 'i2', 'i3', 'i4'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['card-valor', 'card-fortifications', 'card-attrition', 'card-conscription'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  for (const space of state.board.spaces) space.occupant = undefined;
  territories[2].occupant = 'player_2';
  territories[3].occupant = 'player_1';
  state.players.player_2.occupiedSpaceId = territories[2].id;
  state.players.player_1.occupiedSpaceId = territories[3].id;
  state.phase = 'battle';
  state.activePlayer = 'player_2';
  state.priorityPlayer = 'player_2';
  state.players.player_2.zones.hand = ['card-valor', 'card-fortifications'];
  state.players.player_2.zones.deck = ['card-attrition', 'card-conscription'];
  state.battle = {
    id: `${state.id}-battle-1`,
    stage,
    location: territories[3].id,
    attackerOrigin: territories[2].id,
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  setFactionResource(state, 'player_1', 'intel', 3, 'test');
  return state;
}

function useSurveillance(state: GameState): GameState {
  return applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'surveil' }).state;
}

describe('Intelligence Surveillance and Interference', () => {
  it('opens Surveillance after an opposing face-down hand commitment and preserves private identity', () => {
    let state = game();
    state.battle!.defender.passedHandCommit = true;
    state = applyGameAction(state, { type: 'commit_battle_hand_card', playerId: 'player_2', cardId: 'card-valor' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'surveillance', playerId: 'player_1', targetCardId: 'card-valor', targetSource: 'hand' });
    expect(buildGuidedOptions(state).map((option) => option.action.type)).toEqual(['resolve_intelligence_choice', 'resolve_intelligence_choice']);

    state = useSurveillance(state);
    expect(state.players.player_1.resources?.intel?.value).toBe(2);
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'interference', targetCardId: 'card-valor' });
    expect(toPublicGameView(state).battle?.attacker.handCommit).toEqual({ faceDown: true });
    expect(toPrivateGameView(state, 'player_1').battle?.attacker.handCommit).toMatchObject({ cardId: 'card-valor', faceDown: true });
    expect(toPrivateGameView(state, 'player_2').battle?.attacker.handCommit).toMatchObject({ cardId: 'card-valor', faceDown: true });
  });

  it('returns an interfered hand card and accepts one face-down replacement without another Surveillance window', () => {
    let state = game();
    state.battle!.defender.passedHandCommit = true;
    state = applyGameAction(state, { type: 'commit_battle_hand_card', playerId: 'player_2', cardId: 'card-valor' }).state;
    state = useSurveillance(state);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'interfere' }).state;
    expect(state.players.player_1.resources?.intel?.value).toBe(0);
    expect(state.players.player_2.zones.hand).toContain('card-valor');
    expect(state.battle?.attacker.handCommit).toBeUndefined();
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'interference_replacement', playerId: 'player_2', source: 'hand' });

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_2', choice: 'select', cardId: 'card-fortifications' }).state;
    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.attacker.handCommit).toMatchObject({ cardId: 'card-fortifications', faceDown: true });
    expect(state.battle?.stage).toBe('battle_draw');
  });

  it('defers the normal reveal for a final Battle Hand selection until Surveillance is resolved', () => {
    let state = game('battle_play_selection');
    state.battle!.attacker.hasDrawnBattleCards = true;
    state.battle!.attacker.battleDraw = ['card-valor'];
    state.battle!.defender.hasDrawnBattleCards = true;
    state.battle!.defender.battleDraw = [];
    state.battle!.defender.passedBattleDrawPlay = true;

    state = applyGameAction(state, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'card-valor' }).state;
    expect(state.battle?.stage).toBe('normal_reveal');
    expect(state.battle?.attacker.battleDrawPlayed[0]).toMatchObject({ cardId: 'card-valor', faceDown: true });
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'surveillance', targetSource: 'battle_draw' });

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.battleDrawPlayed[0].faceDown).toBe(false);
  });

  it('returns an interfered Battle Hand card to that Battle Hand for replacement', () => {
    let state = game('battle_play_selection');
    state.battle!.attacker.hasDrawnBattleCards = true;
    state.battle!.attacker.battleDraw = ['card-valor', 'card-fortifications'];
    state.battle!.defender.hasDrawnBattleCards = true;
    state.battle!.defender.battleDraw = [];
    state.battle!.defender.passedBattleDrawPlay = true;

    state = applyGameAction(state, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'card-valor' }).state;
    state = useSurveillance(state);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'interfere' }).state;
    expect(state.battle?.attacker.battleDraw).toEqual(expect.arrayContaining(['card-valor', 'card-fortifications']));
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'interference_replacement', source: 'battle_draw' });

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_2', choice: 'select', cardId: 'card-fortifications' }).state;
    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.battleDrawPlayed).toEqual([expect.objectContaining({ cardId: 'card-fortifications', faceDown: false })]);
    expect(state.battle?.attacker.battleDraw).toContain('card-valor');
  });

  it('allows Surveillance only once per Intelligence player per battle', () => {
    let state = game();
    state = applyGameAction(state, { type: 'commit_battle_hand_card', playerId: 'player_2', cardId: 'card-valor' }).state;
    state = useSurveillance(state);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.players.player_1.intelligence?.surveillanceUsedBattleId).toBe(state.battle?.id);

    state.battle!.stage = 'battle_play_selection';
    state.battle!.attacker.hasDrawnBattleCards = true;
    state.battle!.attacker.battleDraw = ['card-attrition'];
    state.battle!.attacker.passedBattleDrawPlay = false;
    state.battle!.defender.hasDrawnBattleCards = true;
    state.battle!.defender.battleDraw = [];
    state.battle!.defender.passedBattleDrawPlay = true;
    state = applyGameAction(state, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'card-attrition' }).state;
    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
  });

  it('does not offer Surveillance for a hand commitment already face up through Watchtower', () => {
    let state = game();
    state.battle!.attackerHandCommitVisibleTo = ['player_1'];
    state = applyGameAction(state, { type: 'commit_battle_hand_card', playerId: 'player_2', cardId: 'card-valor' }).state;
    expect(state.battle?.attacker.handCommit?.faceDown).toBe(false);
    expect(state.pendingIntelligenceChoice).toBeUndefined();
  });
});
