import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { applyGameAction } from './apply-sleeper-network';
import {
  beginCompromisedSleeperNetwork,
  canResolveSleeperNetworkAction,
  reconcileSleeperNetworks,
  SLEEPER_NETWORK,
} from './intelligence-sleeper-network';
import { initializeGame } from './initialize';
import { runPostActionAutomationPipeline } from './pipeline';
import { toPrivateGameView, toPublicGameView } from './views';

function game(): GameState {
  const state = initializeGame({
    id: 'intelligence-sleeper-network',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Network', factionId: 'intelligence', leaderName: 'Spymaster', deck: ['drawn'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', factionId: 'military', leaderName: 'General', deck: ['opponent-draw'], territories: ['t4', 't5', 't6'] },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.controlledTerritories = ['t1', 't2', 't3'];
  state.players.player_2.controlledTerritories = ['t4', 't5', 't6'];
  return state;
}

function bankNetwork(state: GameState, attachedCard = 'card-attrition'): GameState {
  state.players.player_1.zones.hand = [SLEEPER_NETWORK, attachedCard];
  let next = applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: SLEEPER_NETWORK,
  }).state;
  next = applyGameAction(next, {
    type: 'resolve_intelligence_choice',
    playerId: 'player_1',
    choice: 'select',
    cardId: attachedCard,
  }).state;
  return next;
}

describe('Sleeper Network', () => {
  it('requires another card in hand and creates a mandatory hidden attachment choice', () => {
    const state = game();
    state.players.player_1.zones.hand = [SLEEPER_NETWORK];
    expect(canResolveSleeperNetworkAction(state, 'player_1')).toBe(false);

    state.players.player_1.zones.hand.push('card-attrition');
    let next = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SLEEPER_NETWORK,
    }).state;

    expect(next.players.player_1.zones.assetBank).toContain(SLEEPER_NETWORK);
    expect(next.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_initial_card',
      eligibleCardIds: ['card-attrition'],
    });

    next = applyGameAction(next, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-attrition',
    }).state;
    expect(next.players.player_1.intelligence?.sleeperNetwork?.cards).toEqual(['card-attrition']);
    expect(next.players.player_1.zones.hand).toEqual([]);
  });

  it('keeps attachment identities private', () => {
    const state = bankNetwork(game());
    const publicView = toPublicGameView(state);
    const privateView = toPrivateGameView(state, 'player_1');

    expect(JSON.stringify(publicView.players.player_1.intelligence)).not.toContain('card-attrition');
    expect(privateView.players.player_1.intelligence?.sleeperNetwork?.cards).toEqual(['card-attrition']);
  });

  it('does not allow loading again on the banking turn', () => {
    const state = bankNetwork(game());
    state.phase = 'action_after_movement';
    state.players.player_1.zones.hand = ['intelligence-spies'];

    const next = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;

    expect(next.activePlayer).toBe('player_2');
    expect(next.pendingIntelligenceChoice?.kind).not.toBe('sleeper_network_add_card');
  });

  it('offers one optional additional hidden card at the end of a later turn', () => {
    let state = bankNetwork(game());
    state.turn = 3;
    state.phase = 'action_after_movement';
    state.players.player_1.zones.hand = ['intelligence-spies'];

    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_add_card',
      eligibleCardIds: ['intelligence-spies'],
    });
    expect(state.activePlayer).toBe('player_1');

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-spies',
    }).state;
    expect(state.activePlayer).toBe('player_2');
    expect(state.players.player_1.intelligence?.sleeperNetwork?.cards).toEqual([
      'card-attrition',
      'intelligence-spies',
    ]);
  });

  it('offers activation before the normal turn-start draw on a later turn', () => {
    const state = bankNetwork(game());
    state.turn = 3;
    state.phase = 'turn_start';
    state.activePlayer = 'player_1';
    state.priorityPlayer = 'player_1';

    runPostActionAutomationPipeline(state);

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_activate',
      playerId: 'player_1',
    });
    expect(() => applyGameAction(state, { type: 'draw_card', playerId: 'player_1' })).toThrow(/pending Intelligence choice/i);
  });

  it('activates into a legal Action queue and preserves the turn Action Opportunity', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('card-valor');
    state.turn = 3;
    state.phase = 'turn_start';
    state.players.player_1.actionsRemaining = 1;
    runPostActionAutomationPipeline(state);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'activate',
    }).state;
    expect(state.players.player_1.zones.graveyard).toContain(SLEEPER_NETWORK);
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_play_card',
      eligibleCardIds: ['card-attrition'],
    });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-attrition',
    }).state;

    expect(state.phase).toBe('turn_start');
    expect(state.players.player_1.actionsRemaining).toBe(1);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(false);
    expect(state.players.player_1.zones.assetBank).toContain('card-attrition');
    expect(state.players.player_1.zones.discard).toContain('card-valor');
    expect(state.players.player_1.intelligence?.sleeperNetwork).toBeUndefined();
  });

  it('resumes the queue after a nested Intelligence Action choice', () => {
    let state = bankNetwork(game(), 'intelligence-spies');
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('card-attrition');
    state.players.player_2.zones.hand = ['opponent-secret'];
    state.players.player_1.zones.deck = ['drawn-card'];
    state.turn = 3;
    state.phase = 'turn_start';
    runPostActionAutomationPipeline(state);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'activate' }).state;

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-spies',
    }).state;
    expect(state.pendingIntelligenceChoice?.kind).toBe('spies_discard');

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'drawn-card',
    }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_play_card',
      eligibleCardIds: ['card-attrition'],
    });
  });

  it('enforces capacity immediately when Territory control falls', () => {
    const state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies', 'intelligence-assassins');
    state.players.player_1.controlledTerritories = ['t1'];

    reconcileSleeperNetworks(state);
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_capacity',
      discardCount: 2,
    });

    let next = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-spies',
    }).state;
    expect(next.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_capacity',
      discardCount: 1,
    });

    next = applyGameAction(next, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-assassins',
    }).state;
    expect(next.players.player_1.intelligence?.sleeperNetwork?.cards).toEqual(['card-attrition']);
  });

  it('discards all attachments when Sleeper Network leaves play for a non-opposing reason', () => {
    let state = bankNetwork(game());
    state.players.player_1.controlledTerritories = [];
    state.pendingAssetBankDiscards = {
      player_1: { playerId: 'player_1', limit: 0, discardCount: 1, options: [SLEEPER_NETWORK] },
    };

    state = applyGameAction(state, {
      type: 'resolve_asset_bank_discard',
      playerId: 'player_1',
      cardIds: [SLEEPER_NETWORK],
    }).state;

    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([
      SLEEPER_NETWORK,
      'card-attrition',
    ]));
    expect(state.players.player_1.intelligence?.sleeperNetwork).toBeUndefined();
  });

  it('uses Compromised to play one legal card, then discards the rest and removes the Network', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies', 'card-valor');
    state.players.player_2.zones.hand = ['opponent-secret'];
    state.players.player_1.zones.deck = ['drawn-card'];

    expect(beginCompromisedSleeperNetwork(state, 'player_1', 'player_2', 'discard')).toBe(true);
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_compromised',
      eligibleCardIds: expect.arrayContaining(['card-attrition', 'intelligence-spies']),
    });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-attrition',
    }).state;

    expect(state.players.player_1.zones.assetBank).toContain('card-attrition');
    expect(state.players.player_1.zones.assetBank).not.toContain(SLEEPER_NETWORK);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([
      SLEEPER_NETWORK,
      'intelligence-spies',
      'card-valor',
    ]));
    expect(state.players.player_1.intelligence?.sleeperNetwork).toBeUndefined();
  });

  it('requires every legally resolvable Action to be played before activation ends', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies');
    state.turn = 3;
    state.phase = 'turn_start';
    runPostActionAutomationPipeline(state);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'activate' }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_play_card',
      options: ['select'],
      eligibleCardIds: expect.arrayContaining(['card-attrition', 'intelligence-spies']),
    });
    expect(() => applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'finish',
    })).toThrow(/legally resolvable Action card/i);
    expect(state.players.player_1.intelligence?.sleeperNetwork).toBeDefined();
  });
});
