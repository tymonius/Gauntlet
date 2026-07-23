import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-reconnaissance';
import { continueIntelligenceBattle } from './intelligence-battle';
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

function played(cardId: string, owner: PlayerID, origin: 'hand' | 'battle_draw'): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: true, canceled: false };
}

function game(options: { opponentFaction?: 'intelligence' | 'diplomats' } = {}): GameState {
  const opponentFaction = options.opponentFaction ?? 'intelligence';
  const state = initializeGame({
    id: 'intelligence-reconnaissance-battle',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Attacker', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Defender', factionId: opponentFaction, leaderName: opponentFaction === 'diplomats' ? 'Ambassador' : 'Spymaster', deck: ['b'], territories: ['t4', 't5', 't6'] },
    ],
  });
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
    stage: 'normal_reveal',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return state;
}

function revealAndOpenDecision(state: GameState): GameState {
  continueIntelligenceBattle(state);
  expect(state.battle?.stage).toBe('dice');
  return applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
}

describe('Reconnaissance Battle effect', () => {
  it('reveals before other cards and defers its decision until all cards are revealed', () => {
    const state = game();
    state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('card-valor', 'player_2', 'hand');

    continueIntelligenceBattle(state);

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.handCommit).toMatchObject({
      faceDown: false,
      earlyEffectResolved: true,
    });
    expect(state.battle?.attacker.handCommit?.postRevealEffectResolved).toBeUndefined();
    expect(state.battle?.defender.handCommit).toMatchObject({ faceDown: false });
    expect(state.battle?.defender.modifiers).toBe(0);

    const next = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(next.pendingIntelligenceChoice).toMatchObject({
      kind: 'reconnaissance_battle_withdraw',
      playerId: 'player_1',
      canWithdraw: true,
    });
    expect(next.battle?.defender.modifiers).toBe(0);
    expect(next.battle?.effectsResolved).not.toContain('before_battle_resolution');
  });

  it('lets the attacker stay and then proceeds to the defender’s Reconnaissance', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');
    state = revealAndOpenDecision(state);
    expect(state.pendingIntelligenceChoice).toMatchObject({ playerId: 'player_1' });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'stay',
    }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'reconnaissance_battle_withdraw',
      playerId: 'player_2',
    });
  });

  it('lets an attacking hand-committed Reconnaissance withdraw without moving either token', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('attacker-selected', 'player_1', 'battle_draw')];
    state.battle!.attacker.battleDraw = ['attacker-unselected'];
    state.battle!.defender.handCommit = played('defender-hand', 'player_2', 'hand');
    state.battle!.defender.battleDrawPlayed = [played('defender-selected', 'player_2', 'battle_draw')];
    state.battle!.defender.battleDraw = ['defender-unselected'];
    state = revealAndOpenDecision(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'withdraw',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.phase).toBe('action_after_movement');
    expect(state.winner).toBeUndefined();
    expect(state.players.player_1.occupiedSpaceId).toBe('space-2');
    expect(state.players.player_2.occupiedSpaceId).toBe('space-3');
    expect(state.players.player_1.zones.graveyard).toContain('intelligence-reconnaissance');
    expect(state.players.player_2.zones.hand).toContain('defender-hand');
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining(['attacker-selected', 'attacker-unselected']));
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining(['defender-selected', 'defender-unselected']));
  });

  it('sends a Battle-Hand Reconnaissance to Discard when it withdraws', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('attacker-hand', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-reconnaissance', 'player_1', 'battle_draw')];
    state = revealAndOpenDecision(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'withdraw',
    }).state;

    expect(state.players.player_1.zones.discard).toContain('intelligence-reconnaissance');
    expect(state.players.player_1.zones.hand).toContain('attacker-hand');
    expect(state.players.player_1.zones.graveyard).not.toContain('intelligence-reconnaissance');
  });

  it('moves a withdrawing defender one position and advances the attacker into the contested position', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('attacker-hand', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');
    state = revealAndOpenDecision(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'withdraw',
    }).state;

    expect(state.players.player_1.occupiedSpaceId).toBe('space-3');
    expect(state.players.player_2.occupiedSpaceId).toBe('space-4');
    expect(state.board.spaces.find((space) => space.id === 'space-2')?.occupant).toBeUndefined();
    expect(state.board.spaces.find((space) => space.id === 'space-3')?.occupant).toBe('player_1');
    expect(state.board.spaces.find((space) => space.id === 'space-4')?.occupant).toBe('player_2');
    expect(state.players.player_2.zones.graveyard).toContain('intelligence-reconnaissance');
    expect(state.players.player_1.zones.hand).toContain('attacker-hand');
  });

  it('returns refused Terms stakes when Reconnaissance ends the battle without a winner', () => {
    let state = game({ opponentFaction: 'diplomats' });
    state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');
    state.players.player_2.resources!.influence!.value = 0;
    state.players.player_2.diplomats!.activeTerms = {
      diplomat: 'player_2',
      opponent: 'player_1',
      proposalIds: ['orderly-withdrawal'],
      selectedProposalId: 'orderly-withdrawal',
      stake: 2,
      contestedSpace: state.battle!.location,
      attacker: 'player_1',
      defender: 'player_2',
      response: 'refused',
    };
    state = revealAndOpenDecision(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'withdraw',
    }).state;

    expect(state.players.player_2.resources?.influence?.value).toBe(2);
    expect(state.players.player_2.diplomats?.activeTerms).toBeUndefined();
  });

  it('returns another Reconnaissance to its source when the first player withdraws', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');
    state = revealAndOpenDecision(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'withdraw',
    }).state;

    expect(state.players.player_1.zones.graveyard).toContain('intelligence-reconnaissance');
    expect(state.players.player_2.zones.hand).toContain('intelligence-reconnaissance');
    expect(state.players.player_2.zones.graveyard).not.toContain('intelligence-reconnaissance');
  });

  it('does not offer an impossible defender withdrawal beyond the end position', () => {
    const state = game();
    const origin = state.board.spaces.find((space) => space.index === 6)!;
    const location = state.board.spaces.find((space) => space.index === 7)!;
    for (const space of state.board.spaces) space.occupant = undefined;
    origin.occupant = 'player_1';
    location.occupant = 'player_2';
    state.players.player_1.occupiedSpaceId = origin.id;
    state.players.player_2.occupiedSpaceId = location.id;
    state.battle!.attackerOrigin = origin.id;
    state.battle!.location = location.id;
    state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');

    const next = revealAndOpenDecision(state);

    expect(next.pendingIntelligenceChoice).toMatchObject({
      kind: 'reconnaissance_battle_withdraw',
      playerId: 'player_2',
      canWithdraw: false,
      options: ['stay'],
    });
  });

  it('continues into normal effects after the player stays', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('card-valor', 'player_2', 'hand');
    state = revealAndOpenDecision(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'stay',
    }).state;
    expect(state.pendingIntelligenceChoice).toBeUndefined();

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.defender.modifiers).toBe(2);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
  });
});
