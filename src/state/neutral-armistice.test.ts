import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { ARMISTICE } from './neutral-armistice';
import { toPublicGameView } from './views';

const VALOR = 'card-valor';
const FORTIFICATIONS = 'neutral-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-armistice-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'First',
        factionId: 'military',
        leaderName: 'General',
        deck: [ARMISTICE, ARMISTICE, VALOR, FORTIFICATIONS],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Second',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [ARMISTICE, ARMISTICE, VALOR, FORTIFICATIONS],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 2;
  state.players.player_1.movementRemaining = 1;
  state.players.player_2.actionsRemaining = 1;
  state.players.player_2.movementRemaining = 1;
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' | 'replayed' = 'hand',
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
  unplayed: string[] = [],
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [...unplayed],
    initialBattleHand: [...unplayed],
    battleDrawPlayed: cards.filter((card) => card.origin !== 'hand'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin !== 'hand').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function placeAdjacent(
  state: GameState,
  attacker: PlayerID = 'player_1',
  defender: PlayerID = 'player_2',
): { originId: string; locationId: string } {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-2')!;
  const location = state.board.spaces.find((space) => space.id === 'space-3')!;
  origin.occupant = attacker;
  location.occupant = defender;
  location.kind = 'territory';
  location.territoryId = defender === 'player_2' ? 'p2-three' : 'p1-three';
  location.controller = defender;
  location.revealed = true;
  state.players[attacker].occupiedSpaceId = origin.id;
  state.players[defender].occupiedSpaceId = location.id;
  return { originId: origin.id, locationId: location.id };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
  attackerUnplayed: string[] = [],
  defenderUnplayed: string[] = [],
): void {
  const { originId, locationId } = placeAdjacent(state);
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `armistice-battle-${state.log.length + 1}`,
    stage: 'dice',
    location: locationId,
    attackerOrigin: originId,
    attacker: participant('player_1', attackerCards, attackerUnplayed),
    defender: participant('player_2', defenderCards, defenderUnplayed),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function playCondition(state: GameState): GameState {
  state.players.player_1.zones.hand = [ARMISTICE];
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: ARMISTICE,
  }).state;
}

describe('Neutral Armistice', () => {
  it('registers both forms and exposes its Action copy as a public Condition', () => {
    expect(getCardPlayRule(ARMISTICE)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'removed', battle_draw: 'discard' },
    });

    const state = playCondition(game());
    expect(state.players.player_1.zones.removed).toEqual([ARMISTICE]);
    expect(state.neutralArmisticeConditions).toEqual([{
      playerId: 'player_1',
      sourceCardId: ARMISTICE,
      playedTurn: state.turn,
      expiresAtTurn: state.turn + 1,
    }]);
    expect(toPublicGameView(state).neutralArmisticeConditions).toEqual(state.neutralArmisticeConditions);
  });

  it('prevents battles through the opponent next turn, then discards the Condition', () => {
    let state = playCondition(game());
    let placement = placeAdjacent(state);
    state.phase = 'movement';
    expect(() => applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: placement.locationId,
    })).toThrow(/cannot be initiated while Armistice is in effect/);

    state.phase = 'action_after_movement';
    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
    expect(state.neutralArmisticeConditions).toHaveLength(1);
    expect(state.players.player_1.zones.removed).toContain(ARMISTICE);

    placement = placeAdjacent(state, 'player_2', 'player_1');
    state.phase = 'movement';
    state.players.player_2.movementRemaining = 1;
    expect(() => applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_2',
      toSpaceId: placement.locationId,
    })).toThrow(/cannot be initiated while Armistice is in effect/);

    state.phase = 'action_after_movement';
    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_2' }).state;
    expect(state.neutralArmisticeConditions).toBeUndefined();
    expect(state.players.player_1.zones.removed).not.toContain(ARMISTICE);
    expect(state.players.player_1.zones.discard).toContain(ARMISTICE);

    placement = placeAdjacent(state);
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 1;
    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: placement.locationId,
    }).state;
    expect(state.battle).toBeDefined();
  });

  it('ends the battle after cancellation without a winner or retreat', () => {
    let state = game();
    beginBattle(state, [played(ARMISTICE, 'player_1')]);
    const originId = state.battle!.attackerOrigin;
    const locationId = state.battle!.location;

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.phase).toBe('action_after_movement');
    expect(state.priorityPlayer).toBe(state.activePlayer);
    expect(state.recentBattleResult).toBeUndefined();
    expect(state.players.player_1.occupiedSpaceId).toBe(originId);
    expect(state.players.player_2.occupiedSpaceId).toBe(locationId);
    expect(state.board.spaces.find((space) => space.id === originId)?.occupant).toBe('player_1');
    expect(state.board.spaces.find((space) => space.id === locationId)?.occupant).toBe('player_2');
    expect(state.log.at(-1)).toMatchObject({
      type: 'neutral_armistice_battle_ended',
      payload: expect.objectContaining({ returnWasRetreat: false }),
    });
  });

  it('puts every active Armistice in its owner Graveyard and all other physical Battle cards in Discard', () => {
    let state = game();
    beginBattle(
      state,
      [
        played(ARMISTICE, 'player_1', 'hand'),
        played(VALOR, 'player_1', 'battle_draw'),
      ],
      [
        played(ARMISTICE, 'player_2', 'battle_draw'),
        played(FORTIFICATIONS, 'player_2', 'hand'),
      ],
      ['attacker-unplayed'],
      ['defender-unplayed'],
    );

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.players.player_1.zones.graveyard.filter((card) => card === ARMISTICE)).toHaveLength(1);
    expect(state.players.player_2.zones.graveyard.filter((card) => card === ARMISTICE)).toHaveLength(1);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([VALOR, 'attacker-unplayed']));
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining([FORTIFICATIONS, 'defender-unplayed']));
    expect(state.players.player_1.zones.graveyard).not.toContain(VALOR);
    expect(state.players.player_2.zones.graveyard).not.toContain(FORTIFICATIONS);
  });

  it('discards canceled Armistice copies when another active copy ends the battle', () => {
    let state = game();
    beginBattle(
      state,
      [played(ARMISTICE, 'player_1')],
      [played(ARMISTICE, 'player_2', 'battle_draw', { canceled: true })],
    );
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.players.player_1.zones.graveyard).toContain(ARMISTICE);
    expect(state.players.player_2.zones.discard).toContain(ARMISTICE);
    expect(state.players.player_2.zones.graveyard).not.toContain(ARMISTICE);
  });

  it('does not end the battle for canceled, negated, or virtual copies', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      beginBattle(state, [played(ARMISTICE, 'player_1', 'hand', overrides)]);
      state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
      expect(state.battle).toBeDefined();
      expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
      expect(state.phase).toBe('battle');
    }
  });

  it('does not resolve later Battle effects or create battle aftermath', () => {
    let state = game();
    beginBattle(
      state,
      [played(ARMISTICE, 'player_1')],
      [played(VALOR, 'player_2', 'battle_draw')],
    );
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.log.some((event) => event.type === 'battle_reveal_resolved')).toBe(false);
    expect(state.log.some((event) => event.type === 'battle_resolved')).toBe(false);
    expect(state.recentBattleResult).toBeUndefined();
    expect(state.neutralCourtMartialQueue).toBeUndefined();
    expect(state.neutralProtractedSiegeCaptureResolution).toBeUndefined();
    expect(state.players.player_2.zones.discard).toContain(VALOR);
  });

  it('ignores virtual cards during explicit cleanup', () => {
    let state = game();
    beginBattle(state, [
      played(ARMISTICE, 'player_1'),
      played(VALOR, 'player_1', 'replayed', { virtual: true }),
    ]);
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.players.player_1.zones.discard).not.toContain(VALOR);
    expect(state.players.player_1.zones.graveyard).not.toContain(VALOR);
  });
});
