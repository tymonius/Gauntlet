import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-intelligence';
import { initializeGame } from './initialize';
import { failIntelligenceMission } from './intelligence-missions';
import { openInterceptedOrdersWindow } from './intelligence-reactive-assets';
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

function game(options: { leader?: 'Ranger' | 'Spymaster'; opponentFaction?: 'diplomats' } = {}): GameState {
  const state = initializeGame({
    id: 'intelligence-reactive-assets',
    version: 'v0.6.0',
    shuffleDecks: false,
    openingHandSize: 0,
    players: [
      {
        id: 'player_1',
        name: 'Intelligence',
        factionId: 'intelligence',
        leaderName: options.leader ?? 'Ranger',
        deck: ['i1', 'i2', 'i3', 'i4'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: options.opponentFaction,
        leaderName: options.opponentFaction === 'diplomats' ? 'Ambassador' : undefined,
        deck: ['o1', 'o2', 'o3', 'o4'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  return state;
}

function occupy(state: GameState, playerId: PlayerID, index: number): void {
  for (const space of state.board.spaces) if (space.occupant === playerId) space.occupant = undefined;
  const space = state.board.spaces.find((candidate) => candidate.index === index)!;
  space.occupant = playerId;
  state.players[playerId].occupiedSpaceId = space.id;
}

function prepareMissionAction(state: GameState): void {
  state.phase = 'action_after_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
}

function prepareBattle(state: GameState): void {
  const origin = state.board.spaces.find((space) => space.index === 4)!;
  const location = state.board.spaces.find((space) => space.index === 5)!;
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_2';
  state.battle = {
    id: 'battle-1',
    stage: 'battle_draw',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('reactive Intelligence Assets', () => {
  it('resolves Exfiltration before Spymaster Mission Control', () => {
    let state = game({ leader: 'Spymaster' });
    occupy(state, 'player_1', 3);
    prepareMissionAction(state);
    state.players.player_1.zones.assetBank = ['intelligence-exfiltration'];
    state.players.player_1.zones.hand = ['intelligence-spies'];
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-disinformation',
      kind: 'normal',
      startedTurn: state.turn - 1,
      startedLogIndex: 0,
      requirementSatisfied: true,
      evidence: ['qualifying battle'],
    };

    state = applyGameAction(state, { type: 'complete_intelligence_mission', playerId: 'player_1' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'exfiltration', after: 'complete' });
    expect(state.players.player_1.occupiedSpaceId).toBe('space-3');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.players.player_1.occupiedSpaceId).toBe('space-2');
    expect(state.players.player_1.zones.assetBank).not.toContain('intelligence-exfiltration');
    expect(state.players.player_1.zones.discard).toContain('intelligence-exfiltration');
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'mission_control' });
  });

  it('lets Reconnaissance preempt Terms, inspect privately, and then resume Terms', () => {
    let state = game({ opponentFaction: 'diplomats' });
    setFactionResource(state, 'player_2', 'influence', 10, 'test Terms');
    occupy(state, 'player_1', 4);
    occupy(state, 'player_2', 5);
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 1;
    state.players.player_1.zones.assetBank = ['intelligence-reconnaissance'];
    state.players.player_2.zones.hand = ['secret-a', 'secret-b'];

    state = applyGameAction(state, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-5' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'reconnaissance', battleId: state.battle?.id });
    expect(state.pendingDiplomatChoice).toBeUndefined();

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'reconnaissance_withdraw', inspectedHand: ['secret-a', 'secret-b'] });
    expect(toPublicGameView(state).log.some((event) => event.type === 'intelligence_reconnaissance_hand_inspected')).toBe(false);
    expect(toPrivateGameView(state, 'player_1').log.some((event) => event.type === 'intelligence_reconnaissance_hand_inspected')).toBe(true);

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'stay' }).state;
    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.pendingDiplomatChoice).toMatchObject({ kind: 'offer_terms' });
    expect(state.battle?.stage).toBe('hand_commit');
  });

  it('lets Reconnaissance end the battle before hand commitments without moving the attacker', () => {
    let state = game();
    occupy(state, 'player_1', 4);
    occupy(state, 'player_2', 5);
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 1;
    state.players.player_1.zones.assetBank = ['intelligence-reconnaissance'];

    state = applyGameAction(state, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-5' }).state;
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'withdraw' }).state;

    expect(state.battle).toBeUndefined();
    expect(state.phase).toBe('action_after_movement');
    expect(state.players.player_1.occupiedSpaceId).toBe('space-4');
    expect(state.players.player_2.occupiedSpaceId).toBe('space-5');
  });

  it('triggers Intercepted Orders after the opponent forms their initial Battle Hand', () => {
    let state = game();
    prepareBattle(state);
    state.players.player_1.zones.assetBank = ['intelligence-intercepted-orders'];
    state.players.player_2.zones.deck = ['dup', 'dup', 'other'];

    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'intercepted_orders',
      playerId: 'player_1',
      targetOwner: 'player_2',
      battleHand: ['dup', 'dup', 'other'],
    });
    expect(toPublicGameView(state).pendingIntelligenceChoice).toBeUndefined();

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'select', cardId: 'dup' }).state;
    expect(state.battle?.blockedBattleDrawCards?.player_2).toEqual(['dup']);

    state.priorityPlayer = 'player_1';
    state.players.player_1.zones.deck = ['i1', 'i2', 'i3'];
    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    state.priorityPlayer = 'player_2';

    const legalCards = toPrivateGameView(state, 'player_2').battle?.legalBattlePlays
      ?.filter((play) => play.action === 'play_battle_draw_card')
      .map((play) => play.cardId);
    expect(legalCards).toEqual(expect.arrayContaining(['dup', 'other']));
    expect(legalCards?.filter((cardId) => cardId === 'dup')).toHaveLength(1);

    state = applyGameAction(state, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'dup' }).state;
    expect(state.battle?.defender.battleDrawPlayed.map((card) => card.cardId)).toContain('dup');
    expect(state.battle?.defender.battleDraw).toEqual(expect.arrayContaining(['dup', 'other']));
  });

  it('allows Deep Cover to return a threatened Active Mission to hand', () => {
    let state = game();
    state.players.player_1.zones.assetBank = ['intelligence-deep-cover'];
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-spies',
      kind: 'normal',
      startedTurn: state.turn - 1,
      startedLogIndex: 0,
      requirementSatisfied: false,
      evidence: [],
    };

    failIntelligenceMission(state, 'player_1', 'normal', 'test failure');
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'deep_cover', missionCardId: 'intelligence-spies' });
    expect(state.players.player_1.intelligence?.activeMission?.cardId).toBe('intelligence-spies');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.players.player_1.intelligence?.activeMission).toBeUndefined();
    expect(state.players.player_1.zones.hand).toContain('intelligence-spies');
    expect(state.players.player_1.zones.graveyard).toContain('intelligence-deep-cover');
    expect(state.players.player_1.zones.graveyard).not.toContain('intelligence-spies');
  });

  it('allows a threatened Mission to fail while leaving Deep Cover banked', () => {
    let state = game();
    state.players.player_1.zones.assetBank = ['intelligence-deep-cover'];
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-subversion',
      kind: 'normal',
      startedTurn: state.turn - 1,
      startedLogIndex: 0,
      requirementSatisfied: false,
      evidence: [],
    };
    failIntelligenceMission(state, 'player_1', 'normal', 'test failure');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.players.player_1.intelligence?.activeMission).toBeUndefined();
    expect(state.players.player_1.zones.graveyard).toContain('intelligence-subversion');
    expect(state.players.player_1.zones.assetBank).toContain('intelligence-deep-cover');
  });

  it('opens Intercepted Orders directly for an already formed Battle Hand', () => {
    const state = game();
    prepareBattle(state);
    state.players.player_1.zones.assetBank = ['intelligence-intercepted-orders'];
    state.battle!.defender.hasDrawnBattleCards = true;
    state.battle!.defender.battleDraw = ['a', 'b', 'c'];
    expect(openInterceptedOrdersWindow(state, 'player_2')).toBe(true);
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'intercepted_orders', battleHand: ['a', 'b', 'c'] });
  });
});
