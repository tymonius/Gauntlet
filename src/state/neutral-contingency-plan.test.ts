import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import { EffectRegistry, baseBattleEffectHandlers, totalModifiersFor } from '../effects/v06';
import type { BattleParticipantState, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { CONTINGENCY_PLAN } from './neutral-contingency-plan';
import { createValidSetup } from './test-helpers';

function game(): GameState {
  const state = initializeGame(createValidSetup({
    version: 'v0.6.0',
    openingHandSize: 0,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: [CONTINGENCY_PLAN, CONTINGENCY_PLAN, 'draw-one', 'draw-two'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: ['card-valor', 'card-fortifications', 'card-attrition', 'card-conscription'],
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  }));
  state.phase = 'action_before_movement';
  state.priorityPlayer = 'player_1';
  return state;
}

function participant(playerId: PlayerID, copies = 0): BattleParticipantState {
  const played = Array.from({ length: copies }, (_, index) => ({
    cardId: CONTINGENCY_PLAN,
    owner: playerId,
    origin: index === 0 ? 'hand' as const : 'battle_draw' as const,
    faceDown: false,
    canceled: false,
  }));
  return {
    playerId,
    handCommit: played[0],
    passedHandCommit: copies === 0,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: played.slice(1),
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function contingencyModifiers(state: GameState, copies = 1) {
  const battle = {
    id: 'contingency-battle',
    stage: 'resolution' as const,
    location: 'space-1',
    attackerOrigin: 'player_1-heartland',
    attacker: participant('player_1', copies),
    defender: participant('player_2'),
    tiePolicy: 'defender' as const,
    effectsResolved: [],
  };
  state.battle = battle;
  return new EffectRegistry(baseBattleEffectHandlers).resolve({
    game: state,
    battle,
    timing: 'before_battle_resolution',
    actor: 'player_1',
    location: battle.location,
  }).modifiers;
}

describe('Contingency Plan', () => {
  it('registers both canonical forms and banks its Action form', () => {
    const rule = getCardPlayRule(CONTINGENCY_PLAN);
    expect(rule).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [CONTINGENCY_PLAN];
    state.players.player_1.zones.deck = ['draw-one'];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONTINGENCY_PLAN,
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([CONTINGENCY_PLAN]);
    expect(state.players.player_1.zones.hand).toEqual([]);
    expect(state.players.player_1.actionsRemaining).toBe(0);
  });

  it('draws once when discarded because the Asset limit decreased', () => {
    let state = game();
    state.players.player_1.zones.deck = ['draw-one'];
    state.players.player_1.zones.hand = [];
    state.players.player_1.zones.assetBank = [CONTINGENCY_PLAN, 'card-fortifications'];
    state.pendingAssetBankDiscards = {
      player_1: {
        playerId: 'player_1',
        limit: 1,
        discardCount: 1,
        options: [CONTINGENCY_PLAN, 'card-fortifications'],
      },
    };

    state = applyGameAction(state, {
      type: 'resolve_asset_bank_discard',
      playerId: 'player_1',
      cardIds: [CONTINGENCY_PLAN],
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual(['card-fortifications']);
    expect(state.players.player_1.zones.discard).toContain(CONTINGENCY_PLAN);
    expect(state.players.player_1.zones.hand).toEqual(['draw-one']);
    expect(state.log.some((event) => event.type === 'neutral_contingency_plan_draw')).toBe(true);
  });

  it('draws once for each discarded copy and does not trigger for another Asset', () => {
    let state = game();
    state.players.player_1.zones.deck = ['draw-one', 'draw-two'];
    state.players.player_1.zones.hand = [];
    state.players.player_1.zones.assetBank = [CONTINGENCY_PLAN, CONTINGENCY_PLAN];
    state.pendingAssetBankDiscards = {
      player_1: {
        playerId: 'player_1',
        limit: 0,
        discardCount: 2,
        options: [CONTINGENCY_PLAN, CONTINGENCY_PLAN],
      },
    };

    state = applyGameAction(state, {
      type: 'resolve_asset_bank_discard',
      playerId: 'player_1',
      cardIds: [CONTINGENCY_PLAN, CONTINGENCY_PLAN],
    }).state;
    expect(state.players.player_1.zones.hand).toEqual(['draw-one', 'draw-two']);

    state = game();
    state.players.player_1.zones.deck = ['draw-one'];
    state.players.player_1.zones.hand = [];
    state.players.player_1.zones.assetBank = ['card-fortifications'];
    state.pendingAssetBankDiscards = {
      player_1: {
        playerId: 'player_1',
        limit: 0,
        discardCount: 1,
        options: ['card-fortifications'],
      },
    };
    state = applyGameAction(state, {
      type: 'resolve_asset_bank_discard',
      playerId: 'player_1',
      cardIds: ['card-fortifications'],
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([]);
    expect(state.players.player_1.zones.deck).toEqual(['draw-one']);
  });

  it('adds +1 per active copy only while the opponent controls more Territories', () => {
    const state = game();
    state.players.player_1.controlledTerritories = ['one'];
    state.players.player_2.controlledTerritories = ['two', 'three'];

    expect(totalModifiersFor(contingencyModifiers(state, 2), 'player_1')).toBe(2);

    state.players.player_1.controlledTerritories = ['one', 'four'];
    expect(totalModifiersFor(contingencyModifiers(state, 1), 'player_1')).toBe(0);
  });
});
