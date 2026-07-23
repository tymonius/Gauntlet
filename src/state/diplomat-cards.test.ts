import { describe, expect, it } from 'vitest';
import type { BattleState, GameState } from '../types';
import { initializeGame } from './initialize';
import { offerTerms } from './diplomat-terms';
import {
  DIPLOMAT_REACTIVE_CARDS,
  resolveNonbindingResolution,
  resolveTradeConcessions,
  useDiplomaticLatitude,
  useGoodFaith,
  useGunboatDiplomacy,
  useNeutralObservers,
  useNonbindingResolution,
  useSafeConduct,
  useTradeConcessions,
} from './diplomat-cards';

function game(): GameState {
  const state = initializeGame({
    id: 'diplomat-card-test', version: 'v0.6.0', shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Diplomat', factionId: 'diplomats', leaderName: 'Ambassador', deck: ['d1','d2','d3','d4'], territories: ['d-t1','d-t2','d-t3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1','o2','o3','o4'], territories: ['o-t1','o-t2','o-t3'] },
    ],
  });
  state.phase = 'battle';
  state.battle = {
    id: 'battle-1', stage: 'hand_commit', location: 'space-4', attackerOrigin: 'space-3',
    attacker: { playerId: 'player_1', passedHandCommit: false, passedBattleDrawPlay: false, hasDrawnBattleCards: false, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3, battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, retreated: false },
    defender: { playerId: 'player_2', passedHandCommit: false, passedBattleDrawPlay: false, hasDrawnBattleCards: false, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3, battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, retreated: false },
    tiePolicy: 'reroll', effectsResolved: [],
  } satisfies BattleState;
  state.players.player_1.resources!.influence!.value = 3;
  return state;
}

function offer(state: GameState): void {
  offerTerms(state, 'player_1', 'open-channels');
}

describe('Diplomat reactive cards', () => {
  it('sets aside Trade Concessions and resolves the opponent benefit', () => {
    const state = game();
    state.players.player_1.zones.hand.push(DIPLOMAT_REACTIVE_CARDS.tradeConcessions);
    offer(state);
    useTradeConcessions(state, 'player_1');
    expect(state.players.player_1.zones.hand).not.toContain(DIPLOMAT_REACTIVE_CARDS.tradeConcessions);
    state.pendingDiplomatChoice = { kind: 'trade_concessions', playerId: 'player_2', diplomatId: 'player_1', options: ['draw_two','bank_asset'] };
    resolveTradeConcessions(state, 'player_2', 'draw_two');
    expect(state.players.player_2.zones.hand).toHaveLength(5);
    expect(state.players.player_1.zones.discard).toContain(DIPLOMAT_REACTIVE_CARDS.tradeConcessions);
  });

  it('uses Good Faith from the Asset Bank and sets aside the selected card', () => {
    const state = game();
    state.players.player_1.zones.assetBank.push(DIPLOMAT_REACTIVE_CARDS.goodFaith);
    offer(state);
    useGoodFaith(state, 'player_1', 'd1');
    expect(state.players.player_1.zones.assetBank).not.toContain(DIPLOMAT_REACTIVE_CARDS.goodFaith);
    expect(state.players.player_1.diplomats?.termsCards?.goodFaithCard).toBe('d1');
  });

  it('adds a second same-Stake Proposal through Diplomatic Latitude', () => {
    const state = game();
    state.players.player_1.zones.hand.push(DIPLOMAT_REACTIVE_CARDS.diplomaticLatitude);
    offer(state);
    useDiplomaticLatitude(state, 'player_1', 'mutual-disarmament');
    expect(state.players.player_1.diplomats?.activeTerms?.proposalIds).toEqual(['open-channels','mutual-disarmament']);
  });

  it('records Nonbinding Resolution and resolves declined ratification for Influence', () => {
    const state = game();
    state.players.player_1.zones.hand.push(DIPLOMAT_REACTIVE_CARDS.nonbindingResolution);
    offer(state);
    useNonbindingResolution(state, 'player_1');
    state.pendingDiplomatChoice = { kind: 'nonbinding_resolution', playerId: 'player_2', diplomatId: 'player_1', proposalId: 'open-channels', options: ['ratify','decline_ratification'] };
    const before = state.players.player_1.resources!.influence!.value;
    resolveNonbindingResolution(state, 'player_2', 'decline_ratification');
    expect(state.players.player_1.resources!.influence!.value).toBe(before + 2);
  });

  it('reveals Gunboat Diplomacy before the response', () => {
    const state = game();
    state.players.player_1.zones.hand.push(DIPLOMAT_REACTIVE_CARDS.gunboatDiplomacy);
    offer(state);
    useGunboatDiplomacy(state, 'player_1');
    expect(state.players.player_1.diplomats?.termsCards?.gunboatCard).toBe(DIPLOMAT_REACTIVE_CARDS.gunboatDiplomacy);
  });

  it('uses Neutral Observers after refusal and gives the opponent priority', () => {
    const state = game();
    offer(state);
    state.players.player_1.diplomats!.activeTerms!.response = 'refused';
    state.players.player_1.zones.assetBank.push(DIPLOMAT_REACTIVE_CARDS.neutralObservers);
    useNeutralObservers(state, 'player_1');
    expect(state.priorityPlayer).toBe('player_2');
    expect(state.battle?.effectsResolved).toContain('neutral_observers:player_1');
  });

  it('uses Safe Conduct to end refused Terms without a winner', () => {
    const state = game();
    offer(state);
    state.players.player_1.diplomats!.activeTerms!.response = 'refused';
    state.players.player_1.zones.assetBank.push(DIPLOMAT_REACTIVE_CARDS.safeConduct);
    useSafeConduct(state, 'player_1');
    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.discard).toContain(DIPLOMAT_REACTIVE_CARDS.safeConduct);
  });
});
