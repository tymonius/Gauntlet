import { describe, expect, it } from 'vitest';
import { canResolveIntelligenceAction } from './intelligence-action-cards';
import { initializeGame } from './initialize';

function game() {
  return initializeGame({
    id: 'intelligence-action-legality',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Intelligence', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a1'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', factionId: 'military', leaderName: 'General', deck: ['d1'], territories: ['t4', 't5', 't6'] },
    ],
  });
}

describe('Intelligence Action legality', () => {
  it('requires an opposing hand card for Assassins', () => {
    const state = game();
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-assassins')).toBe(false);
    state.players.player_2.zones.hand.push('target-card');
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-assassins')).toBe(true);
  });

  it('requires another eligible Mission card for Operational Reassessment', () => {
    const state = game();
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-spies',
      kind: 'normal',
      startedTurn: 1,
      requirementSatisfied: false,
      evidence: [],
    };
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-operational-reassessment')).toBe(false);

    state.players.player_1.zones.hand.push('card-valor');
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-operational-reassessment')).toBe(false);

    state.players.player_1.zones.hand.push('intelligence-fog-of-war');
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-operational-reassessment')).toBe(true);
  });
});
