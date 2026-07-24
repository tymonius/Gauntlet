import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-subversion-asset';
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

function battleGame(): GameState {
  const state = initializeGame({
    id: 'subversion-mission-evidence-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Subverter',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: ['a1', 'a2', 'a3'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Target',
        factionId: 'intelligence',
        leaderName: 'Spymaster',
        deck: ['d1', 'd2', 'd3'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  const origin = territories[1];
  const location = territories[2];
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  location.controller = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_2';
  state.battle = {
    id: 'battle-1',
    stage: 'hand_commit',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  state.players.player_1.intelligence!.activeMission = {
    cardId: 'intelligence-subversion',
    kind: 'normal',
    startedTurn: state.turn,
    startedLogIndex: state.log.length,
    requirementSatisfied: false,
    evidence: [],
  };
  return state;
}

function offerReconnaissance(state: GameState, playerId: PlayerID): void {
  const opponentId: PlayerID = playerId === 'player_1' ? 'player_2' : 'player_1';
  state.players[playerId].zones.assetBank = ['intelligence-reconnaissance'];
  state.pendingIntelligenceChoice = {
    kind: 'reconnaissance',
    playerId,
    battleId: 'battle-1',
    opponentId,
    options: ['pass', 'use'],
    resumePriorityPlayer: opponentId,
  };
}

function missionEvidence(state: GameState): string[] {
  return state.players.player_1.intelligence?.activeMission?.evidence ?? [];
}

describe('Subversion Mission banked-Asset evidence', () => {
  it('records an opposing banked Asset after its effect resolves without an interrupt', () => {
    let state = battleGame();
    offerReconnaissance(state, 'player_2');

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;

    expect(missionEvidence(state)).toContain(
      'subversion:asset:battle-1:player_2:intelligence-reconnaissance',
    );
  });

  it('records the opposing Asset only after a banked Subversion passes', () => {
    let state = battleGame();
    state.players.player_1.zones.assetBank = ['intelligence-subversion'];
    offerReconnaissance(state, 'player_2');

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;
    expect(missionEvidence(state)).toEqual([]);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(missionEvidence(state)).toEqual([
      'subversion:asset:battle-1:player_2:intelligence-reconnaissance',
    ]);
  });

  it('records both the attempted opposing Asset and Subversion when the interrupt is used', () => {
    let state = battleGame();
    state.players.player_1.zones.assetBank = ['intelligence-subversion'];
    offerReconnaissance(state, 'player_2');

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;

    expect(missionEvidence(state)).toEqual(expect.arrayContaining([
      'subversion:asset:battle-1:player_2:intelligence-reconnaissance',
      'subversion:asset:battle-1:player_1:intelligence-subversion',
    ]));
  });

  it('does not record an Asset effect prohibited by Battle Subversion', () => {
    let state = battleGame();
    state.battle!.stage = 'dice';
    state.battle!.bankedAssetUseProhibited = ['player_2'];
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(missionEvidence(state)).toEqual([]);
    expect(state.battle?.defender.modifiers).toBe(0);
  });

  it('records the Mission owner using a banked Asset during the battle', () => {
    let state = battleGame();
    offerReconnaissance(state, 'player_1');

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;

    expect(missionEvidence(state)).toContain(
      'subversion:asset:battle-1:player_1:intelligence-reconnaissance',
    );
  });
});
