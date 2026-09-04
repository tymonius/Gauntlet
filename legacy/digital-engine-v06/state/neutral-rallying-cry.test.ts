import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { applyRallyingCryBattleEffects, RALLYING_CRY } from './neutral-rallying-cry';

const DRAW_CARD = 'card-valor';
const OTHER_CARD = 'card-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-rallying-cry-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [RALLYING_CRY, RALLYING_CRY, DRAW_CARD],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [RALLYING_CRY, OTHER_CARD, DRAW_CARD],
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
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'hand',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: RALLYING_CRY,
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
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'rallying-cry-battle',
    stage: 'dice',
    location: 'space-1',
    attackerOrigin: 'player_1-heartland',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Rallying Cry', () => {
  it('registers both canonical forms and discards after its Action form', () => {
    expect(getCardPlayRule(RALLYING_CRY)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });
  });

  it('draws one card and reports it through the action result', () => {
    let state = game();
    state.players.player_1.zones.hand = [RALLYING_CRY, OTHER_CARD];
    state.players.player_1.zones.deck = [DRAW_CARD];

    const result = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RALLYING_CRY,
    });
    state = result.state;

    expect(result.result?.drawnCards).toEqual([DRAW_CARD]);
    expect(state.players.player_1.zones.hand).toEqual([OTHER_CARD, DRAW_CARD]);
    expect(state.players.player_1.zones.discard).toEqual([RALLYING_CRY]);
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(true);
  });

  it('removes exactly one physical copy when another Rallying Cry remains in hand', () => {
    let state = game();
    state.players.player_1.zones.hand = [RALLYING_CRY, RALLYING_CRY, OTHER_CARD];
    state.players.player_1.zones.deck = [DRAW_CARD];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RALLYING_CRY,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([RALLYING_CRY, OTHER_CARD, DRAW_CARD]);
    expect(state.players.player_1.zones.discard).toEqual([RALLYING_CRY]);
  });

  it('uses the shared discard reshuffle when the Draw Pile is empty', () => {
    let state = game();
    state.players.player_1.zones.hand = [RALLYING_CRY];
    state.players.player_1.zones.deck = [];
    state.players.player_1.zones.discard = [OTHER_CARD];

    const result = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RALLYING_CRY,
    });
    state = result.state;

    expect(result.result?.drawnCards).toEqual([OTHER_CARD]);
    expect(state.players.player_1.zones.hand).toEqual([OTHER_CARD]);
    expect(state.players.player_1.zones.deck).toEqual([RALLYING_CRY]);
    expect(state.players.player_1.zones.discard).toEqual([]);
  });

  it('adds +1 per active copy to either battle participant', () => {
    let state = game();
    beginBattle(
      state,
      [played('player_1'), played('player_1', 'battle_draw')],
      [played('player_2')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.defender.modifiers).toBe(1);
    expect(state.battle?.resolvedModifiers).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerId: 'player_1', source: RALLYING_CRY, amount: 2 }),
      expect.objectContaining({ playerId: 'player_2', source: RALLYING_CRY, amount: 1 }),
    ]));
  });

  it('ignores canceled and negated copies and resolves only once', () => {
    let state = game();
    beginBattle(state, [
      played('player_1', 'hand', { canceled: true }),
      played('player_1', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    applyRallyingCryBattleEffects(state);

    expect(state.battle?.attacker.modifiers).toBe(0);
    expect(state.battle?.effectsResolved.filter((key) => key === 'neutral_rallying_cry_battle')).toHaveLength(1);
  });
});
