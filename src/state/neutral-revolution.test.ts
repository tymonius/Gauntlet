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
import { REVOLUTION } from './neutral-revolution';
import { VALOR } from './neutral-valor';
import { toPrivateGameView, toPublicGameView } from './views';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-revolution-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Revolutionary',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [REVOLUTION, REVOLUTION, VALOR, 'p1-draw-1', 'p1-draw-2', 'p1-draw-3'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [REVOLUTION, 'p2-draw-1', 'p2-draw-2', 'p2-draw-3'],
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
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    fromInitialBattleHand: origin === 'battle_draw',
    ...overrides,
  };
}

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[],
  modifiers = 0,
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[],
  defenderCards: BattlePlayedCard[],
  attackerModifiers = 0,
  defenderModifiers = 0,
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `revolution-battle-${state.log.length + 1}`,
    stage: 'dice',
    location: 'space-4',
    attackerOrigin: 'space-3',
    attacker: participant('player_1', attackerCards, attackerModifiers),
    defender: participant('player_2', defenderCards, defenderModifiers),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function rollBoth(state: GameState, attackerRoll = 6, defenderRoll = 2): GameState {
  state = applyGameAction(state, {
    type: 'roll_battle_die',
    playerId: 'player_1',
    value: attackerRoll,
  }).state;
  return applyGameAction(state, {
    type: 'roll_battle_die',
    playerId: 'player_2',
    value: defenderRoll,
  }).state;
}

function decide(state: GameState, playerId: PlayerID, choice: 'keep' | 'exchange'): GameState {
  return applyGameAction(state, {
    type: 'resolve_neutral_choice',
    playerId,
    choice,
  }).state;
}

describe('Neutral Revolution', () => {
  it('registers both canonical forms with normal destinations', () => {
    expect(getCardPlayRule(REVOLUTION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: false,
    });
  });

  it('discards both hands before each player draws the size of the other discarded hand', () => {
    let state = game();
    state.players.player_1.zones.hand = [REVOLUTION, 'p1-hand-a', 'p1-hand-b'];
    state.players.player_1.zones.deck = ['p1-new-a', 'p1-new-b'];
    state.players.player_2.zones.hand = ['p2-hand-a'];
    state.players.player_2.zones.deck = ['p2-new-a', 'p2-new-b', 'p2-new-c'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: REVOLUTION,
    }).state;

    expect(state.players.player_1.zones.discard).toEqual(
      expect.arrayContaining([REVOLUTION, 'p1-hand-a', 'p1-hand-b']),
    );
    expect(state.players.player_2.zones.discard).toContain('p2-hand-a');
    expect(state.players.player_1.zones.hand).toHaveLength(1);
    expect(state.players.player_2.zones.hand).toHaveLength(2);
  });

  it('lets a lone Revolution controller exchange only the selected die results', () => {
    let state = game();
    beginBattle(state, [played(REVOLUTION, 'player_1')], [], 2, -1);
    state = rollBoth(state, 6, 2);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'revolution_battle',
      playerId: 'player_1',
    });
    state = decide(state, 'player_1', 'exchange');

    expect(state.battle?.attacker.diceRoll).toBe(2);
    expect(state.battle?.defender.diceRoll).toBe(6);
    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.defender.modifiers).toBe(-1);
  });

  it('keeps simultaneous decisions private and performs no exchange when both players exchange', () => {
    let state = game();
    beginBattle(
      state,
      [played(REVOLUTION, 'player_1')],
      [played(REVOLUTION, 'player_2')],
    );
    state = rollBoth(state, 6, 2);
    state = decide(state, 'player_1', 'exchange');

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'revolution_battle',
      playerId: 'player_2',
    });
    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_1').pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_2').pendingNeutralChoice).toMatchObject({
      kind: 'revolution_battle',
    });
    expect(state.log.some((event) => event.type === 'neutral_revolution_battle_resolved')).toBe(false);

    state = decide(state, 'player_2', 'exchange');
    expect(state.battle?.attacker.diceRoll).toBe(6);
    expect(state.battle?.defender.diceRoll).toBe(2);
    expect(state.log).toContainEqual(expect.objectContaining({
      type: 'neutral_revolution_battle_resolved',
      payload: expect.objectContaining({ exchangingPlayers: ['player_1', 'player_2'] }),
    }));
  });

  it('exchanges when exactly one of two eligible players chooses exchange', () => {
    let state = game();
    beginBattle(
      state,
      [played(REVOLUTION, 'player_1')],
      [played(REVOLUTION, 'player_2')],
    );
    state = rollBoth(state, 5, 3);
    state = decide(state, 'player_1', 'keep');
    state = decide(state, 'player_2', 'exchange');

    expect(state.battle?.attacker.diceRoll).toBe(3);
    expect(state.battle?.defender.diceRoll).toBe(5);
  });

  it('grants one exchange decision per player even when that player used multiple copies', () => {
    let state = game();
    beginBattle(
      state,
      [
        played(REVOLUTION, 'player_1', 'hand'),
        played(REVOLUTION, 'player_1', 'battle_draw'),
      ],
      [],
    );
    state = rollBoth(state, 4, 2);
    state = decide(state, 'player_1', 'keep');

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.neutralRevolutionBattleExchange).toBeUndefined();
    expect(state.battle?.attacker.diceRoll).toBe(4);
    expect(state.battle?.effectsResolved).toContain('neutral_revolution_exchange_resolved');
  });

  it('waits until Valor reroll decisions are complete before opening Revolution', () => {
    let state = game();
    beginBattle(
      state,
      [played(VALOR, 'player_1', 'hand'), played(REVOLUTION, 'player_1')],
      [],
    );
    state = rollBoth(state, 1, 6);

    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'valor_battle' });
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'revolution_battle' });
  });

  it('ignores canceled, negated, and virtual Revolution copies', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      beginBattle(
        state,
        [played(REVOLUTION, 'player_1', 'battle_draw', overrides)],
        [],
      );
      state = rollBoth(state, 6, 2);
      expect(state.pendingNeutralChoice).toBeUndefined();
      expect(state.neutralRevolutionBattleExchange).toBeUndefined();
    }
  });
});
