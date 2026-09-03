import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { SALVAGE } from './neutral-salvage';

const FIRST = 'card-valor';
const SECOND = 'card-fortifications';
const THIRD = 'card-attrition';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-salvage-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1', name: 'Salvager', factionId: 'military', leaderName: 'General',
        deck: [SALVAGE, SALVAGE, FIRST, SECOND, THIRD], territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2', name: 'Opponent', factionId: 'intelligence', leaderName: 'Ranger',
        deck: [FIRST, SECOND, THIRD], territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false, ...overrides };
}

function participant(
  playerId: PlayerID,
  handCommit?: BattlePlayedCard,
  battleDrawPlayed: BattlePlayedCard[] = [],
  battleDraw: string[] = [],
  wins = playerId === 'player_1',
): BattleParticipantState {
  return {
    playerId,
    handCommit,
    passedHandCommit: !handCommit,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw,
    battleDrawPlayed,
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, battleDrawPlayed.length),
    rerollsRemaining: 0,
    diceRoll: wins ? 6 : 1,
    modifiers: 0,
    retreated: false,
  };
}

function beginResolvedBattle(
  state: GameState,
  handCommit: BattlePlayedCard | undefined,
  playedCards: BattlePlayedCard[],
  unchosenCards: string[],
  salvagePlayerWins = true,
): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_1';
  state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.players.player_2.occupiedSpaceId = 'space-2';
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'salvage-battle',
    stage: 'resolution',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1', handCommit, playedCards, unchosenCards, salvagePlayerWins),
    defender: participant('player_2', undefined, [], [], !salvagePlayerWins),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function playAction(state: GameState, targetCardId: string): GameState {
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: SALVAGE,
    targets: [{ kind: 'card', owner: 'player_1', cardId: targetCardId }],
  }).state;
}

describe('Neutral Salvage', () => {
  it('registers both forms, discards after play, and requires an Action target', () => {
    expect(getCardPlayRule(SALVAGE)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });
  });

  it('returns one own Discard Pile card, then requires one hand discard', () => {
    let state = game();
    state.players.player_1.zones.hand = [SALVAGE, FIRST];
    state.players.player_1.zones.discard = [SECOND];

    state = playAction(state, SECOND);
    expect(state.players.player_1.zones.hand).toEqual([FIRST, SECOND]);
    expect(state.players.player_1.zones.discard).toEqual([SALVAGE]);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'salvage_action_discard',
      cardOptions: expect.arrayContaining([FIRST, SECOND]),
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: FIRST,
    }).state;
    expect(state.players.player_1.zones.hand).toEqual([SECOND]);
    expect(state.players.player_1.zones.discard).toEqual([SALVAGE, FIRST]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('preserves duplicate physical copies and may discard the recovered card', () => {
    let state = game();
    state.players.player_1.zones.hand = [SALVAGE, SALVAGE];
    state.players.player_1.zones.discard = [SALVAGE];

    state = playAction(state, SALVAGE);
    expect(state.players.player_1.zones.hand).toEqual([SALVAGE, SALVAGE]);
    expect(state.players.player_1.zones.discard).toEqual([SALVAGE]);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: SALVAGE,
    }).state;
    expect(state.players.player_1.zones.hand).toEqual([SALVAGE]);
    expect(state.players.player_1.zones.discard).toEqual([SALVAGE, SALVAGE]);
  });

  it('rejects opposing, missing, and non-discard Action targets', () => {
    const opposing = game();
    opposing.players.player_1.zones.hand = [SALVAGE];
    opposing.players.player_2.zones.discard = [FIRST];
    expect(() => applyGameAction(opposing, {
      type: 'play_action_card', playerId: 'player_1', cardId: SALVAGE,
      targets: [{ kind: 'card', owner: 'player_2', cardId: FIRST }],
    })).toThrow('your own Discard Pile');

    const missing = game();
    missing.players.player_1.zones.hand = [SALVAGE];
    expect(() => playAction(missing, FIRST)).toThrow('not in your Discard Pile');

    const noTarget = game();
    noTarget.players.player_1.zones.hand = [SALVAGE];
    expect(() => applyGameAction(noTarget, {
      type: 'play_action_card', playerId: 'player_1', cardId: SALVAGE,
    })).toThrow('exactly one card');
  });

  it('may pass the cleanup effect after winning', () => {
    let state = game();
    beginResolvedBattle(state, played(SALVAGE, 'player_1', 'hand'), [], [FIRST, SECOND]);

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'salvage_battle', playerId: 'player_1' });
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass',
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([FIRST, SECOND]));
    expect(state.players.player_1.zones.graveyard).toContain(SALVAGE);
  });

  it('returns one unchosen Battle Hand card, then requires one hand discard', () => {
    let state = game();
    state.players.player_1.zones.hand = [THIRD];
    beginResolvedBattle(state, played(SALVAGE, 'player_1', 'hand'), [], [FIRST, SECOND]);

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use', cardId: SECOND,
    }).state;
    expect(state.players.player_1.zones.hand).toEqual([THIRD, SECOND]);
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'salvage_battle_discard' });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: THIRD,
    }).state;
    expect(state.players.player_1.zones.hand).toEqual([SECOND]);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([FIRST, THIRD]));
    expect(state.players.player_1.zones.discard).not.toContain(SECOND);
  });

  it('stacks sequentially and never re-offers a recovered card that was discarded', () => {
    let state = game();
    state.players.player_1.zones.hand = [THIRD];
    beginResolvedBattle(
      state,
      played(SALVAGE, 'player_1', 'hand'),
      [played(SALVAGE, 'player_1')],
      [FIRST, SECOND, THIRD],
    );

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use', cardId: FIRST,
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: FIRST,
    }).state;

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'salvage_battle', triggersRemaining: 1,
      cardOptions: expect.arrayContaining([SECOND, THIRD]),
    });
    expect((state.pendingNeutralChoice as { cardOptions?: string[] }).cardOptions).not.toContain(FIRST);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use', cardId: SECOND,
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: THIRD,
    }).state;
    expect(state.players.player_1.zones.hand).toEqual([SECOND]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('does not trigger after losing or from canceled, negated, or virtual copies', () => {
    let losing = game();
    beginResolvedBattle(losing, played(SALVAGE, 'player_1', 'hand'), [], [FIRST], false);
    losing = applyGameAction(losing, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(losing.pendingNeutralChoice).toBeUndefined();

    let inactive = game();
    beginResolvedBattle(
      inactive,
      played(SALVAGE, 'player_1', 'hand', { canceled: true }),
      [
        played(SALVAGE, 'player_1', 'battle_draw', { negated: true }),
        played(SALVAGE, 'player_1', 'battle_draw', { virtual: true }),
      ],
      [FIRST],
    );
    inactive = applyGameAction(inactive, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(inactive.pendingNeutralChoice).toBeUndefined();
  });
});
