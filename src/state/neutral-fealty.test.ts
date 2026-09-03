import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { resolveAssassinsPreRevealCard } from './intelligence-simple-battle-effects';
import { initializeGame } from './initialize';
import {
  applyFealtyBattleEffects,
  FEALTY,
  fealtyPreventsOpposingCardDisadvantage,
} from './neutral-fealty';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-fealty-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [FEALTY, FEALTY, 'card-valor'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: ['intelligence-assassins', 'card-fortifications', 'card-attrition'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'hand',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[] = []): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  playerOneCards: BattlePlayedCard[] = [],
  playerTwoCards: BattlePlayedCard[] = [],
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'fealty-battle',
    stage: 'dice',
    location: 'space-1',
    attackerOrigin: 'player_1-heartland',
    attacker: participant('player_1', playerOneCards),
    defender: participant('player_2', playerTwoCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function resolveReveal(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle_reveal',
    playerId: 'player_1',
  }).state;
}

describe('Neutral Fealty', () => {
  it('registers both canonical forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(FEALTY)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [FEALTY];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FEALTY,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([]);
    expect(state.players.player_1.zones.assetBank).toEqual([FEALTY]);
  });

  it('adds +1 when its Battle copy finds no disadvantage', () => {
    let state = game();
    beginBattle(state, [played(FEALTY, 'player_1')]);

    state = resolveReveal(state);

    expect(state.battle?.attacker.disadvantage ?? 0).toBe(0);
    expect(state.battle?.attacker.modifiers).toBe(1);
    expect(state.battle?.resolvedModifiers).toContainEqual(expect.objectContaining({
      playerId: 'player_1',
      source: FEALTY,
      amount: 1,
    }));
  });

  it('ignores one raw disadvantage instead of adding +1', () => {
    let state = game();
    beginBattle(state, [played(FEALTY, 'player_1')]);
    state.battle!.attacker.advantage = 1;
    state.battle!.attacker.disadvantage = 1;

    state = resolveReveal(state);

    expect(state.battle?.attacker.advantage).toBe(1);
    expect(state.battle?.attacker.disadvantage).toBe(0);
    expect(state.battle?.attacker.modifiers).toBe(0);
  });

  it('stacks by removing available disadvantage first and converting excess copies to bonuses', () => {
    let state = game();
    beginBattle(state, [
      played(FEALTY, 'player_1', 'hand'),
      played(FEALTY, 'player_1', 'battle_draw'),
    ]);
    state.battle!.attacker.disadvantage = 1;

    state = resolveReveal(state);

    expect(state.battle?.attacker.disadvantage).toBe(0);
    expect(state.battle?.attacker.modifiers).toBe(1);
  });

  it('ignores canceled and negated Battle copies', () => {
    let state = game();
    beginBattle(state, [
      played(FEALTY, 'player_1', 'hand', { canceled: true }),
      played(FEALTY, 'player_1', 'battle_draw', { negated: true }),
    ]);
    state.battle!.attacker.disadvantage = 1;

    state = resolveReveal(state);

    expect(state.battle?.attacker.disadvantage).toBe(1);
    expect(state.battle?.attacker.modifiers).toBe(0);
  });

  it('resolves only once even if the Neutral continuation is invoked again', () => {
    let state = game();
    beginBattle(state, [played(FEALTY, 'player_1')]);
    state = resolveReveal(state);

    applyFealtyBattleEffects(state);

    expect(state.battle?.attacker.modifiers).toBe(1);
    expect(state.battle?.effectsResolved.filter((key) => key === 'neutral_fealty_battle')).toHaveLength(1);
  });

  it('prevents the opposing Assassins no-commitment disadvantage while the Asset is active', () => {
    const state = game();
    const assassins = played('intelligence-assassins', 'player_2');
    beginBattle(state, [], [assassins]);
    state.players.player_1.zones.assetBank = [FEALTY];

    resolveAssassinsPreRevealCard(state, state.battle!.defender, assassins);

    expect(state.battle?.attacker.disadvantage ?? 0).toBe(0);
    expect(state.log.some((event) => event.type === 'neutral_fealty_prevented_disadvantage')).toBe(true);
  });

  it('does not prevent Assassins when banked Asset use is prohibited', () => {
    const state = game();
    const assassins = played('intelligence-assassins', 'player_2');
    beginBattle(state, [], [assassins]);
    state.players.player_1.zones.assetBank = [FEALTY];
    state.battle!.bankedAssetUseProhibited = ['player_1'];

    resolveAssassinsPreRevealCard(state, state.battle!.defender, assassins);

    expect(state.battle?.attacker.disadvantage).toBe(1);
  });

  it('does not block a card effect sourced by the protected player', () => {
    const state = game();
    state.players.player_1.zones.assetBank = [FEALTY];

    expect(fealtyPreventsOpposingCardDisadvantage(state, 'player_1', 'player_1')).toBe(false);
    expect(fealtyPreventsOpposingCardDisadvantage(state, 'player_2', 'player_1')).toBe(true);
  });
});
