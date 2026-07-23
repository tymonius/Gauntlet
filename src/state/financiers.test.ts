import { describe, expect, it } from 'vitest';
import type { BattleState, GameState } from '../types';
import { initializeGame } from './initialize';
import {
  buyDeed,
  capitalLimit,
  checkControllingInterest,
  deedCost,
  enforceCapitalLimit,
  gainDeedIncome,
  placeInTreasury,
  playTheMarket,
  subsidize,
  subsidizeCost,
} from './financiers';
import { setFactionResource } from './resources';

function game(): GameState {
  const state = initializeGame({
    id: 'financier-test', version: 'v0.6.0', shuffleDecks: false, openingHandSize: 3,
    players: [
      { id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: ['financiers-speculation', 'financiers-monetary-crisis', 'financiers-corner-the-market'], territories: ['t1','t2','t3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1','o2','o3'], territories: ['t4','t5','t6'] },
    ],
  });
  for (const space of state.board.spaces) space.revealed = true;
  return state;
}

function battle(state: GameState): void {
  state.phase = 'battle';
  state.battle = {
    id: 'battle-1', stage: 'dice', location: 'space-1', attackerOrigin: 'player_1-heartland',
    attacker: { playerId: 'player_1', passedHandCommit: true, passedBattleDrawPlay: true, hasDrawnBattleCards: true, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3, battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, retreated: false },
    defender: { playerId: 'player_2', passedHandCommit: true, passedBattleDrawPlay: true, hasDrawnBattleCards: true, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3, battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, retreated: false },
    tiePolicy: 'reroll', effectsResolved: [],
  } satisfies BattleState;
}

describe('Financier core framework', () => {
  it('initializes an empty Treasury and Deed portfolio', () => {
    const state = game();
    expect(state.players.player_1.financiers).toEqual({ treasury: [], deedsOwned: [] });
    expect(state.players.player_1.resources?.capital?.value).toBe(0);
  });

  it('places a card in Treasury and increases the Capital limit by its value', () => {
    const state = game();
    state.phase = 'action_after_movement';
    placeInTreasury(state, 'player_1', 'financiers-corner-the-market');
    expect(state.players.player_1.financiers?.treasury).toEqual(['financiers-corner-the-market']);
    expect(capitalLimit(state, 'player_1')).toBe(8);
  });

  it('calculates capped Deed costs and Banker collateral', () => {
    const state = game();
    const ownSpace = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_1')!;
    expect(deedCost(state, 'player_1', ownSpace.id)).toBe(1);
    setFactionResource(state, 'player_1', 'capital', 10, 'test');
    const paid = buyDeed(state, 'player_1', ownSpace.id, 'financiers-speculation');
    expect(paid).toBe(1);
    expect(state.players.player_1.financiers?.deedsOwned).toContain(ownSpace.id);
    expect(state.players.player_1.zones.discard).toContain('financiers-speculation');
  });

  it('gains one Capital per owned Deed and clamps Capital at end of every turn', () => {
    const state = game();
    state.players.player_1.financiers!.deedsOwned = ['space-1', 'space-2'];
    gainDeedIncome(state, 'player_1');
    expect(state.players.player_1.resources!.capital!.value).toBe(2);
    setFactionResource(state, 'player_1', 'capital', 20, 'test');
    enforceCapitalLimit(state);
    expect(state.players.player_1.resources!.capital!.value).toBe(3);
  });

  it('plays the market using the canonical die table', () => {
    const state = game();
    state.phase = 'action_after_movement';
    const gain = playTheMarket(state, 'player_1', 'financiers-corner-the-market', 6);
    expect(gain).toBe(10);
    expect(state.players.player_1.resources!.capital!.value).toBe(10);
    expect(state.players.player_1.zones.discard).toContain('financiers-corner-the-market');
  });

  it('uses triangular Subsidize costs without a fixed maximum', () => {
    const state = game();
    battle(state);
    setFactionResource(state, 'player_1', 'capital', 20, 'test');
    expect(subsidizeCost(4)).toBe(10);
    subsidize(state, 'player_1', 4);
    expect(state.battle!.attacker.modifiers).toBe(4);
    expect(state.players.player_1.resources!.capital!.value).toBe(10);
  });

  it('wins immediately through Controlling Interest', () => {
    const state = game();
    state.players.player_1.financiers!.deedsOwned = state.board.spaces.filter((space) => space.kind === 'territory').map((space) => space.id);
    expect(checkControllingInterest(state, 'player_1')).toBe(true);
    expect(state.winner).toBe('player_1');
    expect(state.phase).toBe('game_over');
  });
});
