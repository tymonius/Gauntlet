import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattleState, CardID, GameState, PlayerID } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { initializeGame } from './initialize';
import { applyGameAction } from './apply';
import { setFactionResource } from './resources';

const financierDeck = [
  'financiers-leveraged-buyout',
  'financiers-corner-the-market',
  'financiers-underwriting',
  'financiers-monetary-crisis',
  'financiers-capital-gains',
  'financiers-foreclosure',
  'financiers-speculation',
  'financiers-liquidation',
  'financiers-tariffs',
  'financiers-property-dues',
];

function participant(playerId: PlayerID, played: CardID[], roll: number): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: played.map((cardId) => ({ cardId, owner: playerId, origin: 'battle_draw', faceDown: false, canceled: false })),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(played.length, 1),
    diceRoll: roll,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function battleGame(attackerCards: CardID[]): { state: GameState; targetId: string; ownSpaceIds: string[] } {
  const state = initializeGame({
    id: 'financier-battle-acquisitions', version: 'v0.6.0', shuffleDecks: false, openingHandSize: 8,
    players: [
      { id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: financierDeck, territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  const origin = territories[2];
  const target = territories[3];
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  target.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = target.id;
  for (const cardId of attackerCards) {
    const index = state.players.player_1.zones.hand.indexOf(cardId);
    if (index >= 0) state.players.player_1.zones.hand.splice(index, 1);
  }
  const battle: BattleState = {
    id: `${state.id}-battle-test`,
    stage: 'resolution',
    location: target.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards, 6),
    defender: participant('player_2', [], 1),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = battle;
  return {
    state,
    targetId: target.id,
    ownSpaceIds: territories.filter((space) => space.controller === 'player_1').map((space) => space.id),
  };
}

describe('Financier Battle acquisition effects', () => {
  it('buys the contested Deed with another played card as Leveraged Buyout collateral', () => {
    const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting']);
    let state = applyGameAction(setup.state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingFinancierChoice).toMatchObject({
      kind: 'battle_leveraged_buyout',
      spaceId: setup.targetId,
      collateralOptions: ['financiers-underwriting'],
    });
    expect(buildGuidedOptions(state).some((option) => option.action.type === 'resolve_financier_choice' && option.action.cardIds?.includes('financiers-underwriting'))).toBe(true);

    state = applyGameAction(state, {
      type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', cardIds: ['financiers-underwriting'],
    }).state;
    expect(state.players.player_1.financiers?.deedsOwned).toContain(setup.targetId);
    expect(state.players.player_1.zones.graveyard).toContain('financiers-underwriting');
    expect(state.pendingFinancierChoice).toBeUndefined();
  });

  it('allows the winner to decline a battle Leveraged Buyout', () => {
    const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting']);
    let state = applyGameAction(setup.state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.players.player_1.financiers?.deedsOwned).not.toContain(setup.targetId);
    expect(state.pendingFinancierChoice).toBeUndefined();
  });

  it('chains Corner the Market purchases after a battle win and recalculates costs', () => {
    const setup = battleGame(['financiers-corner-the-market']);
    setFactionResource(setup.state, 'player_1', 'capital', 10, 'test');
    let state = applyGameAction(setup.state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'corner_the_market_purchase', battleId: expect.any(String) });

    const firstSpace = setup.ownSpaceIds[0];
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', spaceId: firstSpace }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'deed_purchase', continuation: 'corner_the_market', battleId: expect.any(String), cost: 1 });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'capital' }).state;
    expect(state.players.player_1.financiers?.deedsOwned).toContain(firstSpace);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'corner_the_market_purchase', battleId: expect.any(String) });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.pendingFinancierChoice).toBeUndefined();
  });

  it('continues from Leveraged Buyout into Corner the Market in the shared aftermath queue', () => {
    const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting', 'financiers-corner-the-market']);
    setFactionResource(setup.state, 'player_1', 'capital', 5, 'test');
    let state = applyGameAction(setup.state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingFinancierChoice?.kind).toBe('battle_leveraged_buyout');
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'corner_the_market_purchase', battleId: expect.any(String) });
  });
});
