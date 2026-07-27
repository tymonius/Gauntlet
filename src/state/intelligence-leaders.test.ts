import { describe, expect, it } from 'vitest';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-intelligence';
import { initializeGame } from './initialize';
import {
  isTerritoryEffectIgnored,
  openFieldcraftWindow,
  RANGER_FIELDCRAFT_ABILITY_ID,
  SPYMASTER_MISSION_CONTROL_ABILITY_ID,
} from './intelligence-leaders';
import { markIntelligenceMissionRequirement } from './intelligence-missions';
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

function game(leaderName: 'Ranger' | 'Spymaster') {
  const state = initializeGame({
    id: `intelligence-${leaderName.toLowerCase()}`,
    version: 'v0.6.0',
    shuffleDecks: false,
    openingHandSize: intelligenceDeck.length,
    players: [
      { id: 'player_1', name: leaderName, factionId: 'intelligence', leaderName, deck: intelligenceDeck, territories: ['t1', 't2', 't3'] },
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

describe('Intelligence Leaders', () => {
  it('lets the Spymaster immediately begin another normal Mission after completing one', () => {
    let state = game('Spymaster');
    state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-spies', kind: 'normal' }).state;
    markIntelligenceMissionRequirement(state, 'player_1', 'surveillance victory');
    nextActionOpportunity(state);

    state = applyGameAction(state, { type: 'complete_intelligence_mission', playerId: 'player_1' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'mission_control', playerId: 'player_1' });
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(buildGuidedOptions(state).some((option) => option.action.type === 'resolve_intelligence_choice' && option.action.cardId === 'intelligence-subversion')).toBe(true);

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'select', cardId: 'intelligence-subversion' }).state;
    expect(state.players.player_1.intelligence?.activeMission).toMatchObject({ cardId: 'intelligence-subversion', kind: 'normal', startedTurn: state.turn });
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.leaderAbilityUsage?.turn[SPYMASTER_MISSION_CONTROL_ABILITY_ID]).toBe(state.turn);
    expect(state.pendingIntelligenceChoice).toBeUndefined();
  });

  it('does not consume Mission Control when the Spymaster passes', () => {
    let state = game('Spymaster');
    state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-spies', kind: 'normal' }).state;
    markIntelligenceMissionRequirement(state, 'player_1', 'surveillance victory');
    nextActionOpportunity(state);
    state = applyGameAction(state, { type: 'complete_intelligence_mission', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'pass' }).state;

    expect(state.players.player_1.intelligence?.activeMission).toBeUndefined();
    expect(state.players.player_1.leaderAbilityUsage?.turn[SPYMASTER_MISSION_CONTROL_ABILITY_ID]).toBeUndefined();
  });

  it('lets the Ranger spend 1 Intel once per turn to ignore one printed Territory effect', () => {
    let state = game('Ranger');
    const spaceId = state.board.spaces.find((space) => space.kind === 'territory')!.id;
    setFactionResource(state, 'player_1', 'intel', 1, 'test Fieldcraft');

    expect(openFieldcraftWindow(state, 'player_1', spaceId, 'printed-terrain-effect')).toBe(true);
    expect(buildGuidedOptions(state).map((option) => option.action.type)).toEqual(['resolve_intelligence_choice', 'resolve_intelligence_choice']);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'ignore' }).state;

    expect(state.players.player_1.resources?.intel?.value).toBe(0);
    expect(isTerritoryEffectIgnored(state, 'player_1', spaceId, 'printed-terrain-effect')).toBe(true);
    expect(state.players.player_1.leaderAbilityUsage?.turn[RANGER_FIELDCRAFT_ABILITY_ID]).toBe(state.turn);
    setFactionResource(state, 'player_1', 'intel', 1, 'second attempt');
    expect(openFieldcraftWindow(state, 'player_1', spaceId, 'another-effect')).toBe(false);

    state.turn += 1;
    expect(openFieldcraftWindow(state, 'player_1', spaceId, 'another-effect')).toBe(true);
  });

  it('does not offer Fieldcraft to the Spymaster', () => {
    const state = game('Spymaster');
    const spaceId = state.board.spaces.find((space) => space.kind === 'territory')!.id;
    setFactionResource(state, 'player_1', 'intel', 1, 'test Fieldcraft');
    expect(openFieldcraftWindow(state, 'player_1', spaceId, 'printed-terrain-effect')).toBe(false);
  });
});
