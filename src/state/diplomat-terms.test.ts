import { describe, expect, it } from 'vitest';
import type { BattleState, GameState } from '../types';
import { initializeGame } from './initialize';
import {
  applyLeverage,
  checkPeaceTreatyVictory,
  eligibleProposals,
  offerTerms,
  openDiplomatTermsWindow,
  resolvePoliticalCapital,
  resolveProposalCardChoice,
  resolveRefusedTermsWithoutWinner,
  respondToTerms,
} from './diplomat-terms';

function game(leaderName: 'Ambassador' | 'Senator' = 'Ambassador'): GameState {
  const state = initializeGame({
    id: 'diplomat-test', version: '0.5.6-dev', shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Diplomat', factionId: 'diplomats', leaderName, deck: ['diplomats-safe-conduct','d2','d3','d4'], territories: ['d-t1','d-t2','d-t3'] },
      { id: 'player_2', name: 'Opponent', deck: ['neutral-fealty','o2','o3','o4'], territories: ['o-t1','o-t2','o-t3'] },
    ],
  });
  state.phase = 'battle';
  state.battle = {
    id: 'battle-1', stage: 'hand_commit', location: 'space-4', attackerOrigin: 'space-3',
    attacker: { playerId: 'player_1', passedHandCommit: false, passedBattleDrawPlay: false, hasDrawnBattleCards: false, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3, battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, retreated: false },
    defender: { playerId: 'player_2', passedHandCommit: false, passedBattleDrawPlay: false, hasDrawnBattleCards: false, battleDraw: [], battleDrawPlayed: [], battleDrawCount: 3, battleDrawPlayLimit: 1, rerollsRemaining: 0, modifiers: 0, retreated: false },
    tiePolicy: 'reroll', effectsResolved: [],
  } satisfies BattleState;
  return state;
}

describe('Diplomat Terms framework', () => {
  it('opens a Terms choice automatically for an eligible Diplomat participant', () => {
    const state = game();
    expect(openDiplomatTermsWindow(state)).toBe(true);
    expect(state.pendingDiplomatChoice).toMatchObject({ kind: 'offer_terms', playerId: 'player_1' });
  });

  it('enumerates only eligible Proposals affordable with available Influence', () => {
    const state = game();
    expect(eligibleProposals(state, 'player_1')).toEqual(expect.arrayContaining(['de-escalation','orderly-withdrawal','open-channels','mutual-disarmament','rebuilding-pact']));
    expect(eligibleProposals(state, 'player_1')).not.toContain('ultimatum');
    expect(eligibleProposals(state, 'player_1')).not.toContain('capitulation');
  });

  it('stakes Influence and opens an opponent response', () => {
    const state = game();
    offerTerms(state, 'player_1', 'open-channels');
    expect(state.players.player_1.resources?.influence?.value).toBe(0);
    expect(state.pendingDiplomatChoice).toMatchObject({ kind: 'respond_to_terms', playerId: 'player_2', proposalIds: ['open-channels'] });
  });

  it('acceptance resolves the Proposal, returns Stake, ratifies it, rewards Influence, and triggers Cordiality', () => {
    const state = game();
    offerTerms(state, 'player_1', 'open-channels');
    respondToTerms(state, 'player_2', 'accept');
    expect(state.players.player_1.resources?.influence?.value).toBe(2);
    expect(state.players.player_1.diplomats?.ratifiedProposals).toEqual(['open-channels']);
    expect(state.players.player_1.zones.hand).toHaveLength(4);
    expect(state.players.player_2.zones.hand).toHaveLength(4);
    expect(state.battle).toBeUndefined();
  });

  it('lets each player choose the card discarded for accepted Mutual Disarmament', () => {
    const state = game();
    offerTerms(state, 'player_1', 'mutual-disarmament');
    respondToTerms(state, 'player_2', 'accept');
    expect(state.pendingDiplomatChoice).toMatchObject({ kind: 'mutual_disarmament', playerId: 'player_1', stage: 'diplomat' });
    resolveProposalCardChoice(state, 'player_1', ['d2']);
    expect(state.pendingDiplomatChoice).toMatchObject({ kind: 'mutual_disarmament', playerId: 'player_2', stage: 'opponent' });
    resolveProposalCardChoice(state, 'player_2', ['o2']);
    expect(state.players.player_1.zones.discard).toContain('d2');
    expect(state.players.player_2.zones.discard).toContain('o2');
    expect(state.battle).toBeUndefined();
  });

  it('lets both players independently recover a chosen card for accepted Prisoner Exchange', () => {
    const state = game();
    state.players.player_1.zones.graveyard.push('d-dead-a', 'd-dead-b');
    state.players.player_2.zones.graveyard.push('o-dead-a', 'o-dead-b');
    offerTerms(state, 'player_1', 'prisoner-exchange');
    respondToTerms(state, 'player_2', 'accept');
    resolveProposalCardChoice(state, 'player_1', ['d-dead-b']);
    resolveProposalCardChoice(state, 'player_2', ['o-dead-a']);
    expect(state.players.player_1.zones.discard).toContain('d-dead-b');
    expect(state.players.player_2.zones.discard).toContain('o-dead-a');
    expect(state.players.player_1.zones.graveyard).toContain('d-dead-a');
  });

  it('applies a refused Proposal bonus before optional Leverage', () => {
    const state = game();
    state.players.player_1.resources!.influence!.value = 3;
    offerTerms(state, 'player_1', 'ultimatum');
    respondToTerms(state, 'player_2', 'refuse');
    state.battle!.stage = 'dice';
    applyLeverage(state, 'player_1', 1);
    expect(state.players.player_1.resources?.influence?.value).toBe(0);
    expect(state.battle?.attacker.modifiers).toBe(2);
  });

  it('returns the Stake and ratifies nothing when refused Terms end without a winner', () => {
    const state = game();
    offerTerms(state, 'player_1', 'open-channels');
    respondToTerms(state, 'player_2', 'refuse');
    resolveRefusedTermsWithoutWinner(state, 'player_1');
    expect(state.players.player_1.resources?.influence?.value).toBe(1);
    expect(state.players.player_1.diplomats?.ratifiedProposals).toEqual([]);
    expect(state.battle).toBeUndefined();
  });

  it('resolves Senator Political Capital by sacrificing selected hand cards', () => {
    const state = game('Senator');
    state.pendingDiplomatChoice = { kind: 'political_capital', playerId: 'player_1', lostStake: 2, handOptions: [...state.players.player_1.zones.hand] };
    state.players.player_1.resources!.influence!.value = 0;
    resolvePoliticalCapital(state, 'player_1', ['diplomats-safe-conduct','d2']);
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining(['diplomats-safe-conduct','d2']));
    expect(state.players.player_1.resources?.influence?.value).toBe(2);
  });

  it('checks Peace Treaty victory only when five different Proposals are ratified', () => {
    const state = game();
    state.players.player_1.diplomats!.ratifiedProposals = ['de-escalation','orderly-withdrawal','open-channels','mutual-disarmament','ultimatum'];
    expect(checkPeaceTreatyVictory(state, 'player_1')).toBe(true);
    expect(state.winner).toBe('player_1');
    expect(state.phase).toBe('game_over');
  });
});
