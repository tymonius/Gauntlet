import { describe, expect, it } from 'vitest';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-intelligence';
import { initializeGame } from './initialize';
import { toPrivateGameView, toPublicGameView } from './views';

function game() {
  const state = initializeGame({
    id: 'intelligence-action-cards',
    version: 'v0.6.0',
    shuffleDecks: false,
    openingHandSize: 0,
    players: [
      {
        id: 'player_1',
        name: 'Intelligence',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: ['drawn-card', 'reserve-card'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        deck: ['opponent-deck-card'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.phase = 'action_after_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
  return state;
}

function privateEventTypes(state: ReturnType<typeof game>, viewer: 'player_1' | 'player_2') {
  return toPrivateGameView(state, viewer).log.map((event) => event.type);
}

describe('first Intelligence Action cards', () => {
  it('resolves Spies with a private hand inspection, one draw, and a chosen discard', () => {
    let state = game();
    state.players.player_1.zones.hand = ['intelligence-spies', 'keep-card'];
    state.players.player_1.zones.deck = ['drawn-card'];
    state.players.player_2.zones.hand = ['opponent-secret-a', 'opponent-secret-b'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'intelligence-spies',
    }).state;

    expect(state.players.player_1.zones.discard).toContain('intelligence-spies');
    expect(state.players.player_1.zones.hand).toEqual(['keep-card', 'drawn-card']);
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'spies_discard',
      playerId: 'player_1',
      opponentId: 'player_2',
      inspectedHand: ['opponent-secret-a', 'opponent-secret-b'],
    });
    expect(buildGuidedOptions(state).map((option) => option.action.cardId).sort()).toEqual(['drawn-card', 'keep-card']);

    const publicView = toPublicGameView(state);
    expect('pendingIntelligenceChoice' in publicView).toBe(false);
    expect(publicView.log.some((event) => event.type === 'intelligence_spies_hand_inspected')).toBe(false);
    expect(toPrivateGameView(state, 'player_1').pendingIntelligenceChoice).toMatchObject({ inspectedHand: ['opponent-secret-a', 'opponent-secret-b'] });
    expect(toPrivateGameView(state, 'player_2').pendingIntelligenceChoice).toBeUndefined();
    expect(privateEventTypes(state, 'player_1')).toContain('intelligence_spies_hand_inspected');
    expect(privateEventTypes(state, 'player_2')).not.toContain('intelligence_spies_hand_inspected');

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'drawn-card',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.players.player_1.zones.hand).toEqual(['keep-card']);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining(['intelligence-spies', 'drawn-card']));
  });

  it('resolves Assassins by privately inspecting and discarding one chosen opposing card', () => {
    let state = game();
    state.players.player_1.zones.hand = ['intelligence-assassins'];
    state.players.player_2.zones.hand = ['target-a', 'target-b'];
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-assassins',
      kind: 'normal',
      startedTurn: state.turn,
      startedLogIndex: state.log.length,
      requirementSatisfied: false,
      evidence: [],
    };

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'intelligence-assassins',
    }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'assassins_discard',
      opponentHandOptions: ['target-a', 'target-b'],
    });
    expect(state.players.player_1.intelligence?.activeMission?.evidence.some((entry) => entry.startsWith('assassins:hand-look:'))).toBe(true);
    expect(toPublicGameView(state).log.some((event) => event.type === 'intelligence_assassins_hand_inspected')).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'target-b',
    }).state;

    expect(state.players.player_2.zones.hand).toEqual(['target-a']);
    expect(state.players.player_2.zones.discard).toContain('target-b');
    expect(state.players.player_1.zones.discard).toContain('intelligence-assassins');
  });

  it('does not offer or allow Operational Reassessment without an Active Mission', () => {
    const state = game();
    state.players.player_1.zones.hand = ['intelligence-operational-reassessment', 'intelligence-spies'];

    expect(toPrivateGameView(state, 'player_1').legalActionPlays?.map((play) => play.cardId)).not.toContain('intelligence-operational-reassessment');
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'intelligence-operational-reassessment',
    })).toThrow('cannot resolve in the current state');
  });

  it('returns the Active Mission and starts a different Mission without another Action Opportunity', () => {
    let state = game();
    state.players.player_1.zones.hand = [
      'intelligence-operational-reassessment',
      'intelligence-spies',
      'intelligence-subversion',
    ];
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-disinformation',
      kind: 'normal',
      startedTurn: state.turn - 1,
      startedLogIndex: 0,
      requirementSatisfied: true,
      evidence: ['old evidence'],
    };

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'intelligence-operational-reassessment',
    }).state;

    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.intelligence?.activeMission).toBeUndefined();
    expect(state.players.player_1.zones.hand).toContain('intelligence-disinformation');
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'operational_reassessment',
      returnedMissionCardId: 'intelligence-disinformation',
      eligibleCardIds: expect.arrayContaining(['intelligence-spies', 'intelligence-subversion']),
    });
    expect((state.pendingIntelligenceChoice as { eligibleCardIds: string[] }).eligibleCardIds).not.toContain('intelligence-disinformation');
    expect(toPublicGameView(state).log.some((event) => event.type === 'intelligence_reassessment_mission_returned')).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-subversion',
    }).state;

    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.intelligence?.activeMission).toMatchObject({
      cardId: 'intelligence-subversion',
      kind: 'normal',
      startedTurn: state.turn,
      requirementSatisfied: false,
      evidence: [],
    });
    expect(state.players.player_1.zones.hand).toContain('intelligence-disinformation');
    expect(state.players.player_1.zones.hand).not.toContain('intelligence-subversion');
    expect(state.players.player_1.zones.discard).toContain('intelligence-operational-reassessment');
  });

  it('partially resolves Operational Reassessment when no different Mission is available', () => {
    let state = game();
    state.players.player_1.zones.hand = ['intelligence-operational-reassessment'];
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-spies',
      kind: 'normal',
      startedTurn: state.turn - 1,
      startedLogIndex: 0,
      requirementSatisfied: false,
      evidence: [],
    };

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'intelligence-operational-reassessment',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.players.player_1.intelligence?.activeMission).toBeUndefined();
    expect(state.players.player_1.zones.hand).toContain('intelligence-spies');
  });
});
