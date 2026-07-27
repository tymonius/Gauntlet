import { describe, expect, it } from 'vitest';
import type { CardID, GameState, IntelligenceMissionKind, PlayerID, SpaceID } from '../types';
import { initializeGame } from './initialize';
import {
  evaluateIntelligenceMissionRequirements,
  recordBankedAssetUse,
  recordFaceDownCardObservedBeforeReveal,
  recordOpponentHandLookOutsideBattle,
} from './intelligence-mission-triggers';
import { runPostActionAutomationPipeline } from './pipeline';

function game(cardId: CardID, kind: IntelligenceMissionKind = 'normal'): GameState {
  const state = initializeGame({
    id: `mission-trigger-${cardId}`,
    version: 'v0.6.0',
    shuffleDecks: false,
    openingHandSize: 0,
    players: [
      { id: 'player_1', name: 'Intelligence', factionId: 'intelligence', leaderName: 'Ranger', deck: ['i1', 'i2', 'i3'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1', 'o2', 'o3'], territories: ['t4', 't5', 't6'] },
    ],
  });
  state.phase = 'action_after_movement';
  const mission = { cardId, kind, startedTurn: state.turn, startedLogIndex: state.log.length, requirementSatisfied: false, evidence: [] };
  if (kind === 'normal') state.players.player_1.intelligence!.activeMission = mission;
  else state.players.player_1.intelligence!.specialOperation = mission;
  return state;
}

interface BattleFacts {
  battleId?: string;
  winner?: PlayerID;
  attacker?: PlayerID;
  defender?: PlayerID;
  location?: SpaceID;
  ownHand?: CardID[];
  opposingHand?: CardID[];
  opposingBattleHand?: CardID[];
}

function resolveBattle(state: GameState, facts: BattleFacts = {}): void {
  const battleId = facts.battleId ?? 'battle-1';
  const defaultLocation = state.board.spaces.find((space) => space.kind === 'territory')!.id;
  const attackerOrigin = state.board.spaces.find((space) => space.id !== defaultLocation)!.id;
  state.log.push({
    id: `${state.id}-event-${state.log.length + 1}`,
    turn: state.turn,
    type: 'battle_resolved',
    message: 'Battle resolved.',
    visibility: 'public',
  });
  state.recentBattleResult = {
    battleId,
    turn: state.turn,
    winner: facts.winner ?? 'player_1',
    loser: facts.winner === 'player_2' ? 'player_1' : 'player_2',
    attacker: facts.attacker ?? 'player_1',
    defender: facts.defender ?? 'player_2',
    location: facts.location ?? defaultLocation,
    attackerOrigin,
    retreatDirection: 1,
    handCommittedCards: {
      player_1: facts.ownHand ?? [],
      player_2: facts.opposingHand ?? [],
    },
    battleHandCards: {
      player_1: [],
      player_2: facts.opposingBattleHand ?? [],
    },
  };
  runPostActionAutomationPipeline(state);
}

function activeMission(state: GameState) {
  return state.players.player_1.intelligence!.activeMission!;
}

describe('automatic Intelligence Mission requirements', () => {
  it('satisfies Spies after an early face-down observation followed by winning that battle', () => {
    const state = game('intelligence-spies');
    recordFaceDownCardObservedBeforeReveal(state, 'player_1', 'battle-1', 'surveillance');
    resolveBattle(state, { battleId: 'battle-1' });
    expect(activeMission(state).requirementSatisfied).toBe(true);
  });

  it('satisfies Fog of War when the opponent uses both card sources and loses', () => {
    const state = game('intelligence-fog-of-war');
    resolveBattle(state, { opposingHand: ['o1'], opposingBattleHand: ['o2'] });
    expect(activeMission(state).requirementSatisfied).toBe(true);
  });

  it('satisfies Disinformation when the opponent commits from hand and Intelligence does not', () => {
    const state = game('intelligence-disinformation');
    resolveBattle(state, { ownHand: [], opposingHand: ['o1'] });
    expect(activeMission(state).requirementSatisfied).toBe(true);
  });

  it('satisfies Reconnaissance after defending and winning on an enemy-controlled Territory', () => {
    const state = game('intelligence-reconnaissance');
    const location = state.board.spaces.find((space) => space.kind === 'territory')!;
    location.controller = 'player_2';
    resolveBattle(state, { attacker: 'player_2', defender: 'player_1', location: location.id });
    expect(activeMission(state).requirementSatisfied).toBe(true);
  });

  it('satisfies Assassins after an outside-battle hand look and a qualifying win', () => {
    const state = game('intelligence-assassins');
    recordOpponentHandLookOutsideBattle(state, 'player_1', 'assassins-action');
    resolveBattle(state, { opposingHand: ['o1'] });
    expect(activeMission(state).requirementSatisfied).toBe(true);
  });

  it('satisfies Subversion only when the opponent alone uses a banked Asset', () => {
    const state = game('intelligence-subversion');
    recordBankedAssetUse(state, 'player_2', 'battle-1', 'opposing-asset');
    resolveBattle(state, { battleId: 'battle-1' });
    expect(activeMission(state).requirementSatisfied).toBe(true);

    const second = game('intelligence-subversion');
    recordBankedAssetUse(second, 'player_2', 'battle-1', 'opposing-asset');
    recordBankedAssetUse(second, 'player_1', 'battle-1', 'intelligence-asset');
    resolveBattle(second, { battleId: 'battle-1' });
    expect(activeMission(second).requirementSatisfied).toBe(false);
  });

  it('uses the same printed requirement for a Special Operation', () => {
    const state = game('intelligence-fog-of-war', 'special_operation');
    state.players.player_1.resources!.operation_progress!.value = 4;
    resolveBattle(state, { opposingHand: ['o1'], opposingBattleHand: ['o2'] });
    expect(state.players.player_1.intelligence!.specialOperation?.requirementSatisfied).toBe(true);
  });

  it('does not use a battle that resolved before the Mission began', () => {
    const state = game('intelligence-disinformation');
    const location = state.board.spaces.find((space) => space.kind === 'territory')!.id;
    const attackerOrigin = state.board.spaces.find((space) => space.id !== location)!.id;
    state.log.push({ id: 'old-battle', turn: state.turn, type: 'battle_resolved', message: 'Old battle.', visibility: 'public' });
    activeMission(state).startedLogIndex = state.log.length;
    state.recentBattleResult = {
      battleId: 'old-battle',
      turn: state.turn,
      winner: 'player_1',
      loser: 'player_2',
      attacker: 'player_1',
      defender: 'player_2',
      location,
      attackerOrigin,
      retreatDirection: 1,
      handCommittedCards: { player_1: [], player_2: ['o1'] },
    };
    evaluateIntelligenceMissionRequirements(state);
    expect(activeMission(state).requirementSatisfied).toBe(false);
  });
});
