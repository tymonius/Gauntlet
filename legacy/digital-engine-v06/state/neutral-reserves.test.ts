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
import { RESERVES } from './neutral-reserves';

const FIRST = 'card-valor';
const SECOND = 'card-fortifications';
const DRAWN = 'card-attrition';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-reserves-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [RESERVES, RESERVES, FIRST, SECOND, DRAWN],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [FIRST, SECOND, DRAWN],
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
  origin: 'hand' | 'battle_draw' = 'battle_draw',
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

function participant(
  playerId: PlayerID,
  handCommit?: BattlePlayedCard,
  battleDrawPlayed: BattlePlayedCard[] = [],
  battleDraw: string[] = [],
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
    diceRoll: playerId === 'player_1' ? 6 : 1,
    modifiers: 0,
    retreated: false,
  };
}

function beginResolvedBattle(
  state: GameState,
  handCommit: BattlePlayedCard | undefined,
  playedCards: BattlePlayedCard[],
  unchosenCards: string[],
): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_1';
  state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.players.player_2.occupiedSpaceId = 'space-2';
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'reserves-battle',
    stage: 'resolution',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1', handCommit, playedCards, unchosenCards),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

describe('Neutral Reserves', () => {
  it('registers both canonical forms and discards after its Action form', () => {
    expect(getCardPlayRule(RESERVES)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });
  });

  it('draws one card, then requires one hand card to be placed on top of the Draw Pile', () => {
    let state = game();
    state.players.player_1.zones.hand = [RESERVES, FIRST];
    state.players.player_1.zones.deck = [DRAWN, SECOND];

    const result = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RESERVES,
    });
    state = result.state;

    expect(result.result?.drawnCards).toEqual([DRAWN]);
    expect(state.players.player_1.zones.hand).toEqual([FIRST, DRAWN]);
    expect(state.players.player_1.zones.discard).toEqual([RESERVES]);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'reserves_action',
      playerId: 'player_1',
      cardOptions: expect.arrayContaining([FIRST, DRAWN]),
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: FIRST,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([DRAWN]);
    expect(state.players.player_1.zones.deck).toEqual([FIRST, SECOND]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('removes exactly one physical Action copy', () => {
    let state = game();
    state.players.player_1.zones.hand = [RESERVES, RESERVES, FIRST];
    state.players.player_1.zones.deck = [DRAWN];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RESERVES,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([RESERVES, FIRST, DRAWN]);
    expect(state.players.player_1.zones.discard).toEqual([RESERVES]);
  });

  it('may pass the Battle cleanup effect', () => {
    let state = game();
    beginResolvedBattle(
      state,
      played(RESERVES, 'player_1', 'hand'),
      [],
      [FIRST, SECOND],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'reserves_battle', playerId: 'player_1' });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.deck).toEqual([RESERVES, RESERVES, FIRST, SECOND, DRAWN]);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([FIRST, SECOND]));
    expect(state.players.player_1.zones.graveyard).toContain(RESERVES);
  });

  it('places one chosen unselected Battle Hand card on top during cleanup', () => {
    let state = game();
    beginResolvedBattle(
      state,
      played(RESERVES, 'player_1', 'hand'),
      [],
      [FIRST, SECOND],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: SECOND,
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.deck[0]).toBe(SECOND);
    expect(state.players.player_1.zones.discard).toContain(FIRST);
    expect(state.players.player_1.zones.discard).not.toContain(SECOND);
  });

  it('stacks sequentially, with the last preserved card becoming the top card', () => {
    let state = game();
    beginResolvedBattle(
      state,
      played(RESERVES, 'player_1', 'hand'),
      [played(RESERVES, 'player_1')],
      [FIRST, SECOND, DRAWN],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: FIRST,
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'reserves_battle', triggersRemaining: 1 });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: SECOND,
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.deck.slice(0, 2)).toEqual([SECOND, FIRST]);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([RESERVES, DRAWN]));
  });

  it('does not open cleanup choices for canceled or negated Reserves copies', () => {
    let state = game();
    beginResolvedBattle(
      state,
      played(RESERVES, 'player_1', 'hand', { canceled: true }),
      [played(RESERVES, 'player_1', 'battle_draw', { negated: true })],
      [FIRST],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([RESERVES, FIRST]));
    expect(state.players.player_1.zones.hand).toContain(RESERVES);
  });
});
