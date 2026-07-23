import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-operational-reassessment';
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
  return { cardId, owner, origin, faceDown: false, canceled: false };
}

function game(): GameState {
  const state = initializeGame({
    id: 'intelligence-operational-reassessment-battle',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Attacker', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Defender', factionId: 'intelligence', leaderName: 'Spymaster', deck: ['b'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  for (const space of state.board.spaces) space.occupant = undefined;
  territories[1].occupant = 'player_1';
  territories[2].occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = territories[1].id;
  state.players.player_2.occupiedSpaceId = territories[2].id;
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'battle-1',
    stage: 'dice',
    location: territories[2].id,
    attackerOrigin: territories[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return state;
}

function addReassessment(state: GameState, playerId: PlayerID, origin: 'hand' | 'battle_draw' = 'battle_draw'): void {
  const participantState = state.battle!.attacker.playerId === playerId ? state.battle!.attacker : state.battle!.defender;
  if (origin === 'hand') participantState.handCommit = played('intelligence-operational-reassessment', playerId, 'hand');
  else participantState.battleDrawPlayed.push(played('intelligence-operational-reassessment', playerId, 'battle_draw'));
}

function openWindow(state: GameState): GameState {
  return applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
}

function resolveSharedReveal(state: GameState): GameState {
  return applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
}

function finishBattle(state: GameState): GameState {
  let next = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 6 }).state;
  next = applyGameAction(next, { type: 'roll_battle_die', playerId: 'player_2', value: 1 }).state;
  return applyGameAction(next, { type: 'resolve_battle', playerId: 'player_1' }).state;
}

describe('Operational Reassessment Battle effect', () => {
  it('offers only implemented Battle effects that can still resolve', () => {
    let state = game();
    addReassessment(state, 'player_1');
    state.players.player_1.zones.hand = [
      'card-valor',
      'intelligence-deep-cover',
      'intelligence-spies',
      'intelligence-assassins',
      'intelligence-disinformation',
      'not-a-supported-battle-card',
    ];

    state = openWindow(state);

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'operational_reassessment_battle',
      playerId: 'player_1',
      eligibleCardIds: expect.arrayContaining(['card-valor', 'intelligence-deep-cover']),
    });
    const eligible = (state.pendingIntelligenceChoice as { eligibleCardIds: string[] }).eligibleCardIds;
    expect(eligible).not.toEqual(expect.arrayContaining([
      'intelligence-spies',
      'intelligence-assassins',
      'intelligence-disinformation',
      'not-a-supported-battle-card',
    ]));
    expect(state.battle?.effectsResolved).not.toContain('before_battle_resolution');
  });

  it('replaces Operational Reassessment with a face-up replayed card and resolves its effect', () => {
    let state = game();
    addReassessment(state, 'player_1', 'hand');
    state.players.player_1.zones.hand = ['card-valor'];

    state = openWindow(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_1.zones.hand).not.toContain('card-valor');
    expect(state.players.player_1.zones.graveyard).toContain('intelligence-operational-reassessment');
    expect(state.battle?.attacker.handCommit).toBeUndefined();
    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'card-valor',
      owner: 'player_1',
      origin: 'replayed',
      faceDown: false,
    }));
    expect(state.battle?.effectsResolved).toContain('operational_reassessment_replacement:player_1:card-valor');

    state = resolveSharedReveal(state);
    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
  });

  it('leaves Operational Reassessment in the battle when the player passes', () => {
    let state = game();
    addReassessment(state, 'player_1');
    state.players.player_1.zones.hand = ['card-valor'];

    state = openWindow(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'intelligence-operational-reassessment',
      earlyEffectResolved: true,
    }));
    expect(state.players.player_1.zones.graveyard).not.toContain('intelligence-operational-reassessment');

    state = resolveSharedReveal(state);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
  });

  it('offers attacker Operational Reassessment before defender Operational Reassessment', () => {
    let state = game();
    addReassessment(state, 'player_1');
    addReassessment(state, 'player_2');
    state.players.player_1.zones.hand = ['card-valor'];
    state.players.player_2.zones.hand = ['card-fortifications'];

    state = openWindow(state);
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'operational_reassessment_battle', playerId: 'player_1' });

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'operational_reassessment_battle', playerId: 'player_2' });

    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_2', choice: 'pass' }).state;
    expect(state.pendingIntelligenceChoice).toBeUndefined();
  });

  it('opens another window when the replacement is Operational Reassessment', () => {
    let state = game();
    addReassessment(state, 'player_1');
    state.players.player_1.zones.hand = ['intelligence-operational-reassessment', 'card-valor'];

    state = openWindow(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-operational-reassessment',
    }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'operational_reassessment_battle',
      playerId: 'player_1',
      eligibleCardIds: ['card-valor'],
    });
    expect(state.players.player_1.zones.graveyard.filter((cardId) => cardId === 'intelligence-operational-reassessment')).toHaveLength(1);
  });

  it('sends the replacement card to the Graveyard during cleanup', () => {
    let state = game();
    addReassessment(state, 'player_1');
    state.players.player_1.zones.hand = ['card-valor'];

    state = openWindow(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-valor',
    }).state;
    state = resolveSharedReveal(state);
    state = finishBattle(state);

    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining([
      'intelligence-operational-reassessment',
      'card-valor',
    ]));
    expect(state.players.player_1.zones.discard).not.toContain('card-valor');
  });
});
