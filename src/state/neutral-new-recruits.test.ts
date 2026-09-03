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
import { applyNewRecruitsBattleEffects, NEW_RECRUITS } from './neutral-new-recruits';
import { toPrivateGameView } from './views';

const OTHER = 'card-valor';
const DRAW_ONE = 'card-fortifications';
const DRAW_TWO = 'card-attrition';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-new-recruits-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [NEW_RECRUITS, NEW_RECRUITS, OTHER, DRAW_ONE, DRAW_TWO],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [NEW_RECRUITS, OTHER, DRAW_ONE],
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
    cardId: NEW_RECRUITS,
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
    id: 'new-recruits-battle',
    stage: 'dice',
    location: 'space-1',
    attackerOrigin: 'player_1-heartland',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function playAction(state: GameState, targetCardId: string, targetOwner: PlayerID = 'player_1') {
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: NEW_RECRUITS,
    targets: [{ kind: 'card', cardId: targetCardId, owner: targetOwner }],
  });
}

describe('Neutral New Recruits', () => {
  it('registers both canonical forms with a required Action target', () => {
    expect(getCardPlayRule(NEW_RECRUITS)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });
  });

  it('is not offered as a legal Action without another card to discard', () => {
    const state = game();
    state.players.player_1.zones.hand = [NEW_RECRUITS];

    expect(toPrivateGameView(state, 'player_1').legalActionPlays)
      .not.toContainEqual(expect.objectContaining({ cardId: NEW_RECRUITS }));

    state.players.player_1.zones.hand.push(OTHER);
    expect(toPrivateGameView(state, 'player_1').legalActionPlays)
      .toContainEqual(expect.objectContaining({ cardId: NEW_RECRUITS, requiresTarget: true }));
  });

  it('requires exactly one other card owned by the acting player', () => {
    const state = game();
    state.players.player_1.zones.hand = [NEW_RECRUITS, OTHER];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: NEW_RECRUITS,
    })).toThrow(/exactly one other card/);

    expect(() => playAction(state, OTHER, 'player_2')).toThrow(/exactly one other card/);
    expect(state.players.player_1.zones.hand).toEqual([NEW_RECRUITS, OTHER]);
  });

  it('discards the source and one chosen card, then draws two', () => {
    let state = game();
    state.players.player_1.zones.hand = [NEW_RECRUITS, OTHER];
    state.players.player_1.zones.deck = [DRAW_ONE, DRAW_TWO];

    const result = playAction(state, OTHER);
    state = result.state;

    expect(result.result?.drawnCards).toEqual([DRAW_ONE, DRAW_TWO]);
    expect(state.players.player_1.zones.hand).toEqual([DRAW_ONE, DRAW_TWO]);
    expect(state.players.player_1.zones.discard).toEqual([NEW_RECRUITS, OTHER]);
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(true);
  });

  it('allows another physical New Recruits copy to be the discarded card', () => {
    let state = game();
    state.players.player_1.zones.hand = [NEW_RECRUITS, NEW_RECRUITS, OTHER];
    state.players.player_1.zones.deck = [DRAW_ONE, DRAW_TWO];

    state = playAction(state, NEW_RECRUITS).state;

    expect(state.players.player_1.zones.hand).toEqual([OTHER, DRAW_ONE, DRAW_TWO]);
    expect(state.players.player_1.zones.discard).toEqual([NEW_RECRUITS, NEW_RECRUITS]);
  });

  it('draws as many as possible when the recyclable deck is exhausted', () => {
    let state = game();
    state.players.player_1.zones.hand = [NEW_RECRUITS, OTHER];
    state.players.player_1.zones.deck = [DRAW_ONE];
    state.players.player_1.zones.discard = [];

    const result = playAction(state, OTHER);
    state = result.state;

    expect(result.result?.drawnCards).toEqual([DRAW_ONE, NEW_RECRUITS]);
    expect(state.players.player_1.zones.hand).toEqual([DRAW_ONE, NEW_RECRUITS]);
    expect(state.players.player_1.zones.deck).toEqual([OTHER]);
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
      expect.objectContaining({ playerId: 'player_1', source: NEW_RECRUITS, amount: 2 }),
      expect.objectContaining({ playerId: 'player_2', source: NEW_RECRUITS, amount: 1 }),
    ]));
  });

  it('ignores canceled and negated Battle copies and resolves only once', () => {
    let state = game();
    beginBattle(state, [
      played('player_1', 'hand', { canceled: true }),
      played('player_1', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    applyNewRecruitsBattleEffects(state);

    expect(state.battle?.attacker.modifiers).toBe(0);
    expect(state.battle?.effectsResolved.filter((key) => key === 'neutral_new_recruits_battle')).toHaveLength(1);
  });
});
