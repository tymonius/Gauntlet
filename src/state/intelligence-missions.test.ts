import { describe, expect, it } from 'vitest';
import { intelligenceCardDefinitions, intelligenceMissionCardIds } from '../cards';
import { buildGuidedOptions } from '../dev/guided-options';
import { toPrivateGameView, toPublicGameView } from './views';
import { applyGameAction } from './apply-intelligence';
import { initializeGame } from './initialize';
import { markIntelligenceMissionRequirement, specialOperationIntelCost } from './intelligence-missions';
import { runPostActionAutomationPipeline } from './pipeline';
import { setFactionResource } from './resources';

const intelligenceDeck = [
  'intelligence-spies',
  'intelligence-fog-of-war',
  'intelligence-disinformation',
  'intelligence-reconnaissance',
  'intelligence-assassins',
  'intelligence-subversion',
  'intelligence-exfiltration',
  'intelligence-operational-reassessment',
  'intelligence-intercepted-orders',
  'intelligence-deep-cover',
  'intelligence-treason',
  'intelligence-sleeper-network',
];

function game() {
  const state = initializeGame({
    id: 'intelligence-missions',
    version: 'v0.6.0',
    shuffleDecks: false,
    openingHandSize: intelligenceDeck.length,
    players: [
      { id: 'player_1', name: 'Intelligence', factionId: 'intelligence', leaderName: 'Spymaster', deck: intelligenceDeck, territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10', 'o11', 'o12'], territories: ['t4', 't5', 't6'] },
    ],
  });
  state.phase = 'action_after_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  return state;
}

function nextActionOpportunity(state: ReturnType<typeof game>): void {
  state.turn += 1;
  state.phase = 'action_after_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
}

describe('Intelligence Mission foundation', () => {
  it('loads the canonical twelve-card pool and six Mission cards', () => {
    expect(intelligenceCardDefinitions).toHaveLength(12);
    expect(intelligenceMissionCardIds.size).toBe(6);
    expect(intelligenceCardDefinitions.find((card) => card.id === 'intelligence-assassins')?.cost).toBe(4);
  });

  it('starts a face-down Mission while keeping its identity private', () => {
    const state = applyGameAction(game(), { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-spies', kind: 'normal' }).state;
    expect(state.players.player_1.zones.hand).not.toContain('intelligence-spies');
    expect(state.players.player_1.intelligence?.activeMission?.cardId).toBe('intelligence-spies');
    expect(toPublicGameView(state).players.player_1.intelligence?.activeMission).toEqual({ faceDown: true, kind: 'normal', startedTurn: 1 });
    expect((toPrivateGameView(state, 'player_1').players.player_1 as ReturnType<typeof toPrivateGameView>['players'][string]).intelligence).toMatchObject({ activeMission: { cardId: 'intelligence-spies' } });
  });

  it('completes a later-turn Mission for Operation Progress and Intel equal to its value', () => {
    let state = applyGameAction(game(), { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-spies', kind: 'normal' }).state;
    markIntelligenceMissionRequirement(state, 'player_1', 'inspected a face-down opposing card and won');
    expect(() => applyGameAction(state, { type: 'complete_intelligence_mission', playerId: 'player_1' })).toThrow('cannot complete during the turn');
    nextActionOpportunity(state);
    state = applyGameAction(state, { type: 'complete_intelligence_mission', playerId: 'player_1' }).state;
    expect(state.players.player_1.resources?.operation_progress?.value).toBe(1);
    expect(state.players.player_1.resources?.intel?.value).toBe(2);
    expect(state.players.player_1.zones.discard).toContain('intelligence-spies');
    expect(state.players.player_1.intelligence?.activeMission).toBeUndefined();
  });

  it('aborts a Mission by spending Intel equal to its value without granting progress', () => {
    let state = game();
    setFactionResource(state, 'player_1', 'intel', 5, 'test');
    state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-assassins', kind: 'normal' }).state;
    nextActionOpportunity(state);
    state = applyGameAction(state, { type: 'abort_intelligence_mission', playerId: 'player_1' }).state;
    expect(state.players.player_1.resources?.intel?.value).toBe(1);
    expect(state.players.player_1.resources?.operation_progress?.value).toBe(0);
    expect(state.players.player_1.zones.discard).toContain('intelligence-assassins');
  });

  it('starts and completes a Special Operation for an immediate Intelligence victory', () => {
    let state = game();
    setFactionResource(state, 'player_1', 'operation_progress', 4, 'test readiness');
    state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-assassins', kind: 'special_operation' }).state;
    markIntelligenceMissionRequirement(state, 'player_1', 'completed Assassins requirement', 'special_operation');
    nextActionOpportunity(state);
    const cost = specialOperationIntelCost(state, 'intelligence-assassins');
    expect(cost).toBe(2);
    setFactionResource(state, 'player_1', 'intel', cost, 'test completion');
    state = applyGameAction(state, { type: 'complete_special_operation', playerId: 'player_1' }).state;
    expect(state.winner).toBe('player_1');
    expect(state.phase).toBe('game_over');
    expect(state.players.player_1.resources?.operation_progress?.value).toBe(4);
    expect(state.log.some((event) => event.type === 'intelligence_special_operation_completed')).toBe(true);
  });

  it('fails a Special Operation immediately when readiness is lost', () => {
    let state = game();
    setFactionResource(state, 'player_1', 'operation_progress', 4, 'test readiness');
    state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-subversion', kind: 'special_operation' }).state;
    state.players.player_2.controlledTerritories.push('captured-extra');
    runPostActionAutomationPipeline(state);
    expect(state.players.player_1.intelligence?.specialOperation).toBeUndefined();
    expect(state.players.player_1.zones.graveyard).toContain('intelligence-subversion');
  });

  it('offers guided Mission and Special Operation actions only when legal', () => {
    const state = game();
    setFactionResource(state, 'player_1', 'operation_progress', 4, 'test readiness');
    const options = buildGuidedOptions(state);
    expect(options.some((option) => option.action.type === 'start_intelligence_mission' && option.action.kind === 'normal' && option.action.cardId === 'intelligence-spies')).toBe(true);
    expect(options.some((option) => option.action.type === 'start_intelligence_mission' && option.action.kind === 'special_operation' && option.action.cardId === 'intelligence-spies')).toBe(true);
  });
});
