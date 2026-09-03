import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import {
  applyInsurrectionBattleEffects,
  INSURRECTION,
} from './neutral-insurrection';
import { toPrivateGameView, toPublicGameView } from './views';

const RALLYING_CRY = 'neutral-rallying-cry';
const FORTIFICATIONS = 'neutral-fortifications';
const REINFORCEMENTS = 'neutral-reinforcements';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-insurrection-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [INSURRECTION, RALLYING_CRY, FORTIFICATIONS, REINFORCEMENTS],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [RALLYING_CRY, FORTIFICATIONS, REINFORCEMENTS],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function played(
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: INSURRECTION,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[] = [],
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
  counterattack = false,
): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.index === 2)!;
  const location = state.board.spaces.find((space) => space.index === 3)!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.controller = counterattack ? 'player_1' : 'player_2';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'insurrection-battle',
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function multiset(cards: string[]): string[] {
  return [...cards].sort();
}

describe('Neutral Insurrection', () => {
  it('registers both canonical forms and sends the Action source to discard before recycling', () => {
    expect(getCardPlayRule(INSURRECTION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: false,
    });
  });

  it('discards the remaining hand, recycles both Discard Piles, draws three, and grants another Action Opportunity', () => {
    let state = game();
    state.players.player_1.zones.hand = [INSURRECTION, RALLYING_CRY, FORTIFICATIONS];
    state.players.player_1.zones.deck = [REINFORCEMENTS];
    state.players.player_1.zones.discard = ['neutral-advance-guard'];
    state.players.player_2.zones.deck = [FORTIFICATIONS];
    state.players.player_2.zones.discard = [RALLYING_CRY, REINFORCEMENTS];

    const result = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: INSURRECTION,
    });
    state = result.state;

    expect(state.players.player_1.zones.discard).toEqual([]);
    expect(state.players.player_2.zones.discard).toEqual([]);
    expect(multiset([
      ...state.players.player_1.zones.deck,
      ...state.players.player_1.zones.hand,
    ])).toEqual(multiset([
      INSURRECTION,
      RALLYING_CRY,
      FORTIFICATIONS,
      REINFORCEMENTS,
      'neutral-advance-guard',
    ]));
    expect(multiset(state.players.player_2.zones.deck)).toEqual(multiset([
      FORTIFICATIONS,
      RALLYING_CRY,
      REINFORCEMENTS,
    ]));
    expect(state.players.player_1.zones.hand).toHaveLength(3);
    expect(result.result?.drawnCards).toHaveLength(3);
    expect(state.players.player_1.actionsRemaining).toBe(1);
    expect(state.neutralInsurrectionActionOpportunity).toEqual({
      playerId: 'player_1',
      turn: state.turn,
    });
  });

  it('permits exactly one additional Action card and exposes it in private/public views', () => {
    let state = game();
    state.players.player_1.zones.hand = [INSURRECTION, RALLYING_CRY, FORTIFICATIONS];
    state.players.player_1.zones.deck = [];
    state.players.player_1.zones.discard = [];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: INSURRECTION,
    }).state;

    expect(toPrivateGameView(state, 'player_1').legalActionPlays?.map((option) => option.cardId))
      .toEqual(expect.arrayContaining([RALLYING_CRY, FORTIFICATIONS]));
    expect(toPublicGameView(state).neutralInsurrectionActionOpportunity)
      .toEqual({ playerId: 'player_1', turn: state.turn });

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RALLYING_CRY,
    }).state;

    expect(state.neutralInsurrectionActionOpportunity).toBeUndefined();
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(toPrivateGameView(state, 'player_1').legalActionPlays).toBeUndefined();
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FORTIFICATIONS,
    })).toThrow(/already played a card|no actions remaining/);
  });

  it('replaces a spent Reinforcements opportunity with its own additional opportunity', () => {
    let state = game();
    state.players.player_1.zones.hand = [INSURRECTION, RALLYING_CRY];
    state.players.player_1.zones.deck = [];
    state.players.player_1.actionsRemaining = 1;
    state.players.player_1.hasPlayedActionThisTurn = true;
    state.neutralReinforcementsActionOpportunity = {
      playerId: 'player_1',
      turn: state.turn,
    };

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: INSURRECTION,
    }).state;

    expect(state.neutralReinforcementsActionOpportunity).toBeUndefined();
    expect(state.neutralInsurrectionActionOpportunity).toEqual({
      playerId: 'player_1',
      turn: state.turn,
    });
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RALLYING_CRY,
    })).not.toThrow();
  });

  it('does not let Reinforcements stack another pending opportunity before Insurrection is spent', () => {
    let state = game();
    state.players.player_1.zones.hand = [INSURRECTION, RALLYING_CRY, FORTIFICATIONS];
    state.players.player_1.zones.deck = [];
    state.players.player_1.zones.assetBank = [REINFORCEMENTS];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: INSURRECTION,
    }).state;

    expect(toPrivateGameView(state, 'player_1').legalNeutralAssetUses).toBeUndefined();
    expect(() => applyGameAction(state, {
      type: 'use_neutral_reinforcements_asset',
      playerId: 'player_1',
    })).toThrow(/Spend the current Insurrection/);
  });

  it('chains through another Insurrection without creating more than one pending opportunity', () => {
    let state = game();
    state.players.player_1.zones.hand = [INSURRECTION, INSURRECTION, RALLYING_CRY];
    state.players.player_1.zones.deck = [];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: INSURRECTION,
    }).state;
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: INSURRECTION,
    }).state;

    expect(state.neutralInsurrectionActionOpportunity).toEqual({
      playerId: 'player_1',
      turn: state.turn,
    });
    expect(state.players.player_1.actionsRemaining).toBe(1);
  });

  it('grants one advantage per active copy during an ordinary attack', () => {
    let state = game();
    beginBattle(state, [played('player_1', 'hand'), played('player_1')]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.advantage).toBe(2);
    expect(state.battle?.effectsResolved).toContain('neutral_insurrection_battle');
  });

  it('grants double advantage per active copy while counterattacking on a controlled Territory', () => {
    let state = game();
    beginBattle(state, [played('player_1', 'hand'), played('player_1')], [], true);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.advantage).toBe(4);
    expect(state.log.some((event) => (
      event.type === 'neutral_insurrection_battle'
      && (event.payload as { counterattacking?: boolean }).counterattacking === true
    ))).toBe(true);
  });

  it('ignores canceled, negated, virtual, and defending copies', () => {
    let state = game();
    beginBattle(
      state,
      [
        played('player_1', 'hand', { canceled: true }),
        played('player_1', 'battle_draw', { negated: true }),
        played('player_1', 'battle_draw', { virtual: true }),
      ],
      [played('player_2')],
      true,
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
    expect(state.battle?.defender.advantage ?? 0).toBe(0);
  });

  it('does not apply its Battle effect twice', () => {
    const state = game();
    beginBattle(state, [played('player_1')], [], true);

    expect(applyInsurrectionBattleEffects(state)).toBe(true);
    expect(applyInsurrectionBattleEffects(state)).toBe(false);
    expect(state.battle?.attacker.advantage).toBe(2);
  });
});
