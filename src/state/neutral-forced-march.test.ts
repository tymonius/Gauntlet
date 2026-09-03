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
import { FORCED_MARCH } from './neutral-forced-march';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-forced-march-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [FORCED_MARCH, FORCED_MARCH, 'card-valor'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: ['card-fortifications', 'card-attrition', 'card-valor'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.movementRemaining = 1;
  state.players.player_1.nonBattleMovementRemaining = 0;
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
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'forced-march-battle',
    stage: 'dice',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Forced March', () => {
  it('registers both canonical forms and discards after its Action form', () => {
    expect(getCardPlayRule(FORCED_MARCH)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [FORCED_MARCH];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FORCED_MARCH,
    }).state;

    expect(state.players.player_1.zones.discard).toEqual([FORCED_MARCH]);
    expect(state.players.player_1.movementRemaining).toBe(2);
    expect(state.players.player_1.nonBattleMovementRemaining).toBe(1);
  });

  it('can be played only before movement', () => {
    const state = game();
    state.phase = 'action_after_movement';
    state.players.player_1.zones.hand = [FORCED_MARCH];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FORCED_MARCH,
    })).toThrow(/only during the Action Opportunity before movement/);
  });

  it('spends restricted movement first on an unopposed move and preserves normal movement for battle', () => {
    let state = game();
    state.players.player_1.zones.hand = [FORCED_MARCH];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FORCED_MARCH,
    }).state;
    state.phase = 'movement';

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-1',
    }).state;

    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.players.player_1.nonBattleMovementRemaining).toBe(0);
    expect(state.phase).toBe('movement');

    state.board.spaces.find((space) => space.id === 'player_2-heartland')!.occupant = undefined;
    state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_2';
    state.players.player_2.occupiedSpaceId = 'space-2';

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-2',
    }).state;

    expect(state.battle?.attacker.playerId).toBe('player_1');
    expect(state.players.player_1.movementRemaining).toBe(0);
    expect(state.players.player_1.nonBattleMovementRemaining).toBe(0);
  });

  it('does not allow a restricted movement position to initiate battle', () => {
    const state = game();
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 1;
    state.players.player_1.nonBattleMovementRemaining = 1;
    state.board.spaces.find((space) => space.id === 'player_2-heartland')!.occupant = undefined;
    state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_2';
    state.players.player_2.occupiedSpaceId = 'space-1';

    expect(() => applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-1',
    })).toThrow(/cannot initiate a battle/);
  });

  it('may voluntarily finish movement and proceed to the after-movement Action Opportunity', () => {
    let state = game();
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 2;
    state.players.player_1.nonBattleMovementRemaining = 1;

    state = applyGameAction(state, {
      type: 'finish_movement',
      playerId: 'player_1',
    }).state;

    expect(state.phase).toBe('action_after_movement');
    expect(state.players.player_1.movementRemaining).toBe(0);
    expect(state.players.player_1.nonBattleMovementRemaining).toBe(0);
  });

  it('clears restricted movement across turn transitions', () => {
    let state = game();
    state.players.player_1.nonBattleMovementRemaining = 1;
    state.players.player_1.movementRemaining = 2;

    state = applyGameAction(state, {
      type: 'end_turn',
      playerId: 'player_1',
    }).state;

    expect(state.players.player_1.nonBattleMovementRemaining).toBe(0);
    expect(state.players.player_2.nonBattleMovementRemaining).toBe(0);
    expect(state.players.player_2.movementRemaining).toBe(1);
  });

  it('adds +1 per active copy only while attacking', () => {
    let state = game();
    beginBattle(
      state,
      [played(FORCED_MARCH, 'player_1'), played(FORCED_MARCH, 'player_1', 'battle_draw')],
      [played(FORCED_MARCH, 'player_2')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.battle?.resolvedModifiers).toContainEqual(expect.objectContaining({
      playerId: 'player_1',
      source: FORCED_MARCH,
      amount: 2,
    }));
  });

  it('ignores canceled and negated Battle copies', () => {
    let state = game();
    beginBattle(state, [
      played(FORCED_MARCH, 'player_1', 'hand', { canceled: true }),
      played(FORCED_MARCH, 'player_1', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.modifiers).toBe(0);
  });
});
