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
import { ENTRENCHMENT } from './neutral-entrenchment';
import { toPrivateGameView } from './views';

const ACTION_CARD = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-entrenchment-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Advancing Player',
        factionId: 'military',
        leaderName: 'General',
        deck: [ENTRENCHMENT, ACTION_CARD, 'card-valor'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Entrenched Player',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [ENTRENCHMENT, ENTRENCHMENT, 'card-fortifications'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.movementRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
  return state;
}

function placePlayer(state: GameState, playerId: PlayerID, spaceId: string): void {
  for (const space of state.board.spaces) {
    if (space.occupant === playerId) space.occupant = undefined;
  }
  state.board.spaces.find((space) => space.id === spaceId)!.occupant = playerId;
  state.players[playerId].occupiedSpaceId = spaceId;
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
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'entrenchment-battle',
    stage: 'dice',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Entrenchment', () => {
  it('registers both canonical forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(ENTRENCHMENT)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [ENTRENCHMENT];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ENTRENCHMENT,
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([ENTRENCHMENT]);
  });

  it('ends an advancing opponent movement adjacent to its owner and locks the after-movement Action', () => {
    let state = game();
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 2;
    state.players.player_1.zones.hand = [ACTION_CARD];
    state.players.player_2.zones.assetBank = [ENTRENCHMENT];
    placePlayer(state, 'player_1', 'space-2');
    placePlayer(state, 'player_2', 'space-4');

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-3',
    }).state;

    expect(state.players.player_1.movementRemaining).toBe(0);
    expect(state.phase).toBe('action_after_movement');
    expect(state.neutralEntrenchmentActionLocks).toEqual([{
      playerId: 'player_1',
      sourcePlayerId: 'player_2',
      turn: 1,
    }]);
    expect(toPrivateGameView(state, 'player_1').legalActionPlays).toBeUndefined();
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ACTION_CARD,
    })).toThrow('Entrenchment prevents this player');
  });

  it('does not trigger when the opponent moves backward', () => {
    let state = game();
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 2;
    state.players.player_2.zones.assetBank = [ENTRENCHMENT];
    placePlayer(state, 'player_1', 'space-3');
    placePlayer(state, 'player_2', 'space-1');

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-2',
    }).state;

    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.phase).toBe('movement');
    expect(state.neutralEntrenchmentActionLocks).toBeUndefined();
  });

  it('clears the Action lock across the turn transition', () => {
    let state = game();
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 2;
    state.players.player_2.zones.assetBank = [ENTRENCHMENT];
    placePlayer(state, 'player_1', 'space-2');
    placePlayer(state, 'player_2', 'space-4');

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-3',
    }).state;
    state = applyGameAction(state, {
      type: 'end_turn',
      playerId: 'player_1',
    }).state;

    expect(state.turn).toBe(2);
    expect(state.neutralEntrenchmentActionLocks).toBeUndefined();
  });

  it('gives the attacking player disadvantage per active defending Battle copy', () => {
    let state = game();
    beginBattle(
      state,
      [played(ENTRENCHMENT, 'player_1', 'hand')],
      [
        played(ENTRENCHMENT, 'player_2', 'hand'),
        played(ENTRENCHMENT, 'player_2', 'battle_draw'),
      ],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.disadvantage).toBe(2);
    expect(state.battle?.defender.disadvantage ?? 0).toBe(0);
  });

  it('ignores canceled and negated defending Battle copies', () => {
    let state = game();
    beginBattle(state, [], [
      played(ENTRENCHMENT, 'player_2', 'hand', { canceled: true }),
      played(ENTRENCHMENT, 'player_2', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.disadvantage ?? 0).toBe(0);
  });
});
