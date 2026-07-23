import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-exfiltration';
import { initializeGame } from './initialize';
import { createV06StandardBoard } from './v06-board';

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
  return { cardId, owner, origin, faceDown: false, canceled: false };
}

function game(): GameState {
  const playerOne = {
    id: 'player_1',
    name: 'Attacker',
    factionId: 'intelligence',
    leaderName: 'Ranger',
    deck: ['a'],
    territories: ['t1', 't2', 't3'],
  };
  const playerTwo = {
    id: 'player_2',
    name: 'Defender',
    factionId: 'intelligence',
    leaderName: 'Spymaster',
    deck: ['b'],
    territories: ['t4', 't5', 't6'],
  };
  const state = initializeGame({
    id: 'intelligence-exfiltration-battle',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [playerOne, playerTwo],
  });
  const topology = createV06StandardBoard([playerOne, playerTwo]);
  state.board = topology.board;
  const origin = state.board.spaces.find((space) => space.index === 2)!;
  const location = state.board.spaces.find((space) => space.index === 3)!;
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'battle-1',
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: { ...participant('player_1'), diceRoll: 6 },
    defender: { ...participant('player_2'), diceRoll: 1 },
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
  return state;
}

describe('Exfiltration Battle effect', () => {
  it('offers the victorious attacker an immediate withdrawal after normal battle resolution', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-exfiltration', 'player_1', 'hand');

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult).toMatchObject({ battleId: 'battle-1', winner: 'player_1' });
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'exfiltration_battle_withdraw',
      playerId: 'player_1',
      destinationId: 'space-2',
    });
    expect(state.players.player_1.occupiedSpaceId).toBe('space-3');
    expect(state.players.player_1.zones.graveyard).toContain('intelligence-exfiltration');
  });

  it('withdraws the attacker while preserving the resolved battle outcome', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-exfiltration', 'player_1', 'hand');
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    const before = structuredClone(state.board.spaces.find((space) => space.id === 'space-3'));
    const recentResult = structuredClone(state.recentBattleResult);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'withdraw',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.players.player_1.occupiedSpaceId).toBe('space-2');
    expect(state.board.spaces.find((space) => space.id === 'space-2')?.occupant).toBe('player_1');
    expect(state.board.spaces.find((space) => space.id === 'space-3')?.occupant).toBeUndefined();
    expect(state.board.spaces.find((space) => space.id === 'space-3')?.controller).toBe(before?.controller);
    expect(state.board.spaces.find((space) => space.id === 'space-3')?.capturePendingBy).toBe(before?.capturePendingBy);
    expect(state.recentBattleResult).toEqual(recentResult);
  });

  it('allows a victorious defender to withdraw toward their own end', () => {
    let state = game();
    state.battle!.attacker.diceRoll = 1;
    state.battle!.defender.diceRoll = 6;
    state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2', 'hand');

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'exfiltration_battle_withdraw',
      playerId: 'player_2',
      destinationId: 'space-4',
    });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'withdraw',
    }).state;

    expect(state.players.player_2.occupiedSpaceId).toBe('space-4');
    expect(state.board.spaces.find((space) => space.id === 'space-4')?.occupant).toBe('player_2');
    expect(state.recentBattleResult?.winner).toBe('player_2');
  });

  it('allows the winner to remain in the victorious position', () => {
    let state = game();
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-exfiltration', 'player_1', 'battle_draw')];
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.players.player_1.occupiedSpaceId).toBe('space-3');
    expect(state.players.player_1.zones.discard).toContain('intelligence-exfiltration');
  });

  it('does not offer Exfiltration to a losing player', () => {
    let state = game();
    state.battle!.defender.diceRoll = 6;
    state.battle!.attacker.diceRoll = 1;
    state.battle!.attacker.handCommit = played('intelligence-exfiltration', 'player_1', 'hand');

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult?.winner).toBe('player_2');
    expect(state.pendingIntelligenceChoice?.kind).not.toBe('exfiltration_battle_withdraw');
  });

  it('does not offer a negated Exfiltration', () => {
    let state = game();
    state.battle!.attacker.handCommit = {
      ...played('intelligence-exfiltration', 'player_1', 'hand'),
      negated: true,
    };

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult?.winner).toBe('player_1');
    expect(state.pendingIntelligenceChoice?.kind).not.toBe('exfiltration_battle_withdraw');
  });

  it('does not open from a stale prior result when the current battle ties and rerolls', () => {
    let state = game();
    state.battle!.tiePolicy = 'reroll';
    state.battle!.attacker.diceRoll = 4;
    state.battle!.defender.diceRoll = 4;
    state.battle!.attacker.handCommit = played('intelligence-exfiltration', 'player_1', 'hand');
    state.recentBattleResult = {
      battleId: 'old-battle',
      turn: state.turn - 1,
      winner: 'player_1',
      loser: 'player_2',
      attacker: 'player_1',
      defender: 'player_2',
      location: 'space-3',
      attackerOrigin: 'space-2',
      retreatDirection: 1,
    };

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.battle?.id).toBe('battle-1');
    expect(state.battle?.stage).toBe('dice');
    expect(state.pendingIntelligenceChoice?.kind).not.toBe('exfiltration_battle_withdraw');
  });

  it('does not offer an impossible withdrawal from the winner’s own end position', () => {
    let state = game();
    const origin = state.board.spaces.find((space) => space.index === 6)!;
    const location = state.board.spaces.find((space) => space.index === 7)!;
    for (const space of state.board.spaces) space.occupant = undefined;
    origin.occupant = 'player_1';
    location.occupant = 'player_2';
    state.players.player_1.occupiedSpaceId = origin.id;
    state.players.player_2.occupiedSpaceId = location.id;
    state.battle!.attackerOrigin = origin.id;
    state.battle!.location = location.id;
    state.battle!.lastStand = true;
    state.battle!.attacker.diceRoll = 1;
    state.battle!.defender.diceRoll = 6;
    state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2', 'hand');

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult?.winner).toBe('player_2');
    expect(state.players.player_2.occupiedSpaceId).toBe('space-7');
    expect(state.pendingIntelligenceChoice?.kind).not.toBe('exfiltration_battle_withdraw');
  });
});
