import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-subversion-asset';
import { initializeGame } from './initialize';
import { isSubversionAssetChoice } from './intelligence-subversion-asset';

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

function game(defenderFaction: 'intelligence' | 'military' | 'diplomats' | 'financiers' = 'intelligence'): GameState {
  const state = initializeGame({
    id: 'subversion-asset-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Subverter', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a1', 'a2', 'a3'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Target', factionId: defenderFaction, leaderName: defenderFaction === 'military' ? 'General' : defenderFaction === 'diplomats' ? 'Ambassador' : defenderFaction === 'financiers' ? 'Banker' : 'Spymaster', deck: ['d1', 'd2', 'd3'], territories: ['t4', 't5', 't6'] },
    ],
  });
  state.players.player_1.zones.assetBank = ['intelligence-subversion'];
  return state;
}

function battleGame(defenderFaction: 'intelligence' | 'military' | 'diplomats' | 'financiers' = 'intelligence'): GameState {
  const state = game(defenderFaction);
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
  return state;
}

function expectSubversionWindow(state: GameState, targetCardId: string): void {
  expect(isSubversionAssetChoice(state.pendingIntelligenceChoice)).toBe(true);
  expect(state.pendingIntelligenceChoice).toMatchObject({
    kind: 'subversion_asset_negate',
    playerId: 'player_1',
    targetOwner: 'player_2',
    targetCardId,
    options: ['pass', 'use'],
  });
}

describe('Subversion Asset effect', () => {
  it('interrupts Reconnaissance and resumes it after Subversion passes', () => {
    let state = battleGame();
    state.players.player_2.zones.assetBank = ['intelligence-reconnaissance'];
    state.pendingIntelligenceChoice = {
      kind: 'reconnaissance',
      playerId: 'player_2',
      battleId: 'battle-1',
      opponentId: 'player_1',
      options: ['pass', 'use'],
      resumePriorityPlayer: 'player_1',
    };

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_2', choice: 'use' }).state;
    expectSubversionWindow(state, 'intelligence-reconnaissance');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'reconnaissance_withdraw', playerId: 'player_2' });
    expect(state.players.player_2.zones.discard).toContain('intelligence-reconnaissance');
    expect(state.players.player_1.zones.assetBank).toContain('intelligence-subversion');
  });

  it('negates Reconnaissance, graves Subversion, and discards the opposing Asset', () => {
    let state = battleGame();
    state.players.player_2.zones.assetBank = ['intelligence-reconnaissance'];
    state.pendingIntelligenceChoice = {
      kind: 'reconnaissance',
      playerId: 'player_2',
      battleId: 'battle-1',
      opponentId: 'player_1',
      options: ['pass', 'use'],
      resumePriorityPlayer: 'player_1',
    };

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_2', choice: 'use' }).state;
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;

    expect(state.players.player_1.zones.graveyard).toContain('intelligence-subversion');
    expect(state.players.player_2.zones.discard).toContain('intelligence-reconnaissance');
    expect(state.pendingIntelligenceChoice?.kind).not.toBe('reconnaissance_withdraw');
    expect(state.log.some((event) => event.type === 'intelligence_reconnaissance_hand_inspected')).toBe(false);
  });

  it('negates passive Fortifications before revealed effects resolve', () => {
    let state = battleGame();
    state.battle!.stage = 'dice';
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expectSubversionWindow(state, 'card-fortifications');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
    expect(state.players.player_2.zones.discard).toContain('card-fortifications');
  });

  it('allows passive Fortifications to resolve when Subversion passes', () => {
    let state = battleGame();
    state.battle!.stage = 'dice';
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'pass' }).state;

    expect(state.battle?.defender.modifiers).toBe(1);
    expect(state.players.player_2.zones.assetBank).toContain('card-fortifications');
  });

  it('negates a banked Military precommit Asset and advances the timing queue', () => {
    let state = battleGame('military');
    state.players.player_2.zones.assetBank = ['military-hold-the-line'];
    state.pendingMilitaryTimingChoice = {
      kind: 'military_asset_precommit',
      playerId: 'player_2',
      sourceCardId: 'military-hold-the-line',
      options: ['use', 'pass'],
    };

    state = applyGameAction(state, { type: 'resolve_military_timing_choice', playerId: 'player_2', choice: 'use' }).state;
    expectSubversionWindow(state, 'military-hold-the-line');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.pendingMilitaryTimingChoice).toBeUndefined();
    expect(state.battle?.effectsResolved).not.toContain('active:military-hold-the-line:player_2');
    expect(state.players.player_2.zones.discard).toContain('military-hold-the-line');
  });

  it('negates Good Faith without disturbing the underlying Terms response', () => {
    let state = battleGame('diplomats');
    state.players.player_2.zones.assetBank = ['diplomats-good-faith'];
    state.players.player_2.zones.hand = ['set-aside-card'];
    state.players.player_2.diplomats!.activeTerms = {
      diplomat: 'player_2',
      opponent: 'player_1',
      proposalIds: ['de-escalation'],
      selectedProposalId: 'de-escalation',
      stake: 1,
      contestedSpace: state.battle!.location,
      attacker: 'player_1',
      defender: 'player_2',
    };
    state.pendingDiplomatChoice = {
      kind: 'respond_to_terms',
      playerId: 'player_1',
      diplomatId: 'player_2',
      proposalIds: ['de-escalation'],
      stake: 1,
      options: ['accept', 'refuse'],
    };

    state = applyGameAction(state, {
      type: 'use_diplomat_card',
      playerId: 'player_2',
      cardId: 'diplomats-good-faith',
      targetCardId: 'set-aside-card',
    }).state;
    expectSubversionWindow(state, 'diplomats-good-faith');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.pendingDiplomatChoice?.kind).toBe('respond_to_terms');
    expect(state.players.player_2.zones.hand).toContain('set-aside-card');
    expect(state.players.player_2.zones.discard).toContain('diplomats-good-faith');
  });

  it('negates Tariffs so the normal turn-start draw occurs', () => {
    let state = game('financiers');
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.phase = 'turn_start';
    state.players.player_2.zones.assetBank = ['financiers-tariffs'];
    state.players.player_2.zones.deck = ['drawn-card'];

    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_2' }).state;
    expectSubversionWindow(state, 'financiers-tariffs');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.players.player_2.zones.hand).toContain('drawn-card');
    expect(state.players.player_2.zones.discard).toContain('financiers-tariffs');
    expect(state.phase).toBe('action_before_movement');
  });

  it('negates Sleeper Network activation and clears its hidden attachments after it leaves play', () => {
    let state = game();
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.phase = 'turn_start';
    state.players.player_2.zones.assetBank = ['intelligence-sleeper-network'];
    state.players.player_2.intelligence!.sleeperNetwork = {
      cards: ['intelligence-spies'],
      bankedTurn: state.turn - 1,
      startOfferTurn: state.turn,
    };
    state.pendingIntelligenceChoice = {
      kind: 'sleeper_network_activate',
      playerId: 'player_2',
      options: ['pass', 'activate'],
      resumePriorityPlayer: 'player_2',
    };

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_2', choice: 'activate' }).state;
    expectSubversionWindow(state, 'intelligence-sleeper-network');

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.players.player_2.intelligence?.sleeperNetwork).toBeUndefined();
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining(['intelligence-sleeper-network', 'intelligence-spies']));
  });

  it('does not offer the Asset interrupt when a Battle Subversion already prohibits the effect', () => {
    let state = battleGame();
    state.battle!.stage = 'dice';
    state.battle!.bankedAssetUseProhibited = ['player_2'];
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(isSubversionAssetChoice(state.pendingIntelligenceChoice)).toBe(false);
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.players.player_1.zones.assetBank).toContain('intelligence-subversion');
  });
});
