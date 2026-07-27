import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-post-reveal';
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
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    earlyEffectResolved: cardId === 'intelligence-reconnaissance' ? true : undefined,
  };
}

function game(): GameState {
  const state = initializeGame({
    id: 'intelligence-post-reveal-order',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Attacker', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Defender', factionId: 'intelligence', leaderName: 'Spymaster', deck: ['b'], territories: ['t4', 't5', 't6'] },
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
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return state;
}

describe('unified Intelligence post-reveal ordering', () => {
  it('resolves an attacker’s hand commitment before their Battle Hand selection and before defender effects', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-reconnaissance', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');
    state.players.player_1.zones.hand = ['card-valor'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'operational_reassessment_battle',
      playerId: 'player_1',
    });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'reconnaissance_battle_withdraw',
      playerId: 'player_1',
    });

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

  it('does not allow defender Reconnaissance to preempt attacker Operational Reassessment', () => {
    let state = game();
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-operational-reassessment', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');
    state.players.player_1.zones.hand = ['card-valor'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'operational_reassessment_battle',
      playerId: 'player_1',
    });
  });

  it('skips Operational Reassessment with no legal replacement and continues to the next effect', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-reconnaissance', 'player_1', 'battle_draw')];
    state.players.player_1.zones.hand = ['intelligence-spies'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.attacker.handCommit?.earlyEffectResolved).toBe(true);
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'reconnaissance_battle_withdraw',
      playerId: 'player_1',
    });
  });

  it('continues into the shared effect registry after all post-reveal choices are complete', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');
    state.battle!.defender.handCommit = played('card-valor', 'player_2', 'hand');

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
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

  it('opens the next attacker effect after an Operational Reassessment replacement', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1', 'hand');
    state.battle!.attacker.battleDrawPlayed = [played('intelligence-reconnaissance', 'player_1', 'battle_draw')];
    state.players.player_1.zones.hand = ['card-valor'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-valor',
    }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'reconnaissance_battle_withdraw',
      playerId: 'player_1',
    });
    expect(state.players.player_1.zones.graveyard).toContain('intelligence-operational-reassessment');
    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({ cardId: 'card-valor' }));
  });
});
