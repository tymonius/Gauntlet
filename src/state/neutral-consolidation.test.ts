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
import { CONSOLIDATION } from './neutral-consolidation';

const FIRST = 'card-valor';
const SECOND = 'card-fortifications';
const THIRD = 'card-attrition';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-consolidation-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [CONSOLIDATION, CONSOLIDATION, FIRST, SECOND, THIRD],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [FIRST, SECOND, THIRD],
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
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: CONSOLIDATION,
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
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function prepareCaptureAtTurnStart(state: GameState): void {
  const playerHeartland = state.board.spaces.find((space) => space.occupant === 'player_1');
  if (playerHeartland) playerHeartland.occupant = undefined;
  const space = state.board.spaces.find((candidate) => candidate.id === 'space-1')!;
  space.kind = 'territory';
  space.territoryId = 'p2-one';
  space.controller = 'player_2';
  space.occupant = 'player_1';
  space.capturePendingBy = 'player_1';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.phase = 'turn_start';
}

function beginResolvedBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
  controller: PlayerID | undefined = 'player_2',
  attackerRoll = 6,
  defenderRoll = 1,
): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  const origin = state.board.spaces.find((space) => space.id === 'space-1')!;
  const location = state.board.spaces.find((space) => space.id === 'space-2')!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.territoryId = 'p2-one';
  location.controller = controller;
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.players.player_2.occupiedSpaceId = 'space-2';
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'consolidation-battle',
    stage: 'resolution',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: {
      ...participant('player_1', attackerCards),
      diceRoll: attackerRoll,
    },
    defender: {
      ...participant('player_2', defenderCards),
      diceRoll: defenderRoll,
    },
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

describe('Neutral Consolidation', () => {
  it('registers both canonical forms and discards after its Action form', () => {
    expect(getCardPlayRule(CONSOLIDATION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });
  });

  it('rejects the Action atomically without a current-turn capture', () => {
    const state = game();
    state.players.player_1.zones.hand = [CONSOLIDATION];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONSOLIDATION,
    })).toThrow(/only if you captured a Territory this turn/);
    expect(state.players.player_1.zones.hand).toEqual([CONSOLIDATION]);
    expect(state.players.player_1.zones.discard).toEqual([]);
  });

  it('does not accept a stale capture event from an earlier turn', () => {
    const state = game();
    state.turn = 4;
    state.players.player_1.zones.hand = [CONSOLIDATION];
    state.log.push({
      id: 'old-capture',
      turn: 3,
      actor: 'player_1',
      type: 'territory_captured',
      message: 'Old capture.',
      visibility: 'public',
    });

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONSOLIDATION,
    })).toThrow(/only if you captured a Territory this turn/);
  });

  it('uses a confirmed start-of-turn capture, draws two, and preserves duplicate physical copies', () => {
    let state = game();
    prepareCaptureAtTurnStart(state);
    state.players.player_1.zones.hand = [CONSOLIDATION, CONSOLIDATION];
    state.players.player_1.zones.deck = [FIRST, SECOND, THIRD];

    state = applyGameAction(state, {
      type: 'draw_card',
      playerId: 'player_1',
    }).state;
    expect(state.log.some((event) => (
      event.type === 'territory_captured'
      && event.turn === state.turn
      && event.actor === 'player_1'
    ))).toBe(true);

    const result = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONSOLIDATION,
    });
    state = result.state;

    expect(result.result?.drawnCards).toEqual([SECOND, THIRD]);
    expect(state.players.player_1.zones.hand).toEqual([CONSOLIDATION, FIRST, SECOND, THIRD]);
    expect(state.players.player_1.zones.discard).toEqual([CONSOLIDATION]);
  });

  it('draws once per active copy after winning as attacker on an opponent-controlled Territory', () => {
    let state = game();
    state.players.player_1.zones.deck = [FIRST, SECOND, THIRD];
    beginResolvedBattle(state, [played('player_1', 'hand'), played('player_1')]);

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.hand).toEqual([FIRST, SECOND]);
    expect(state.players.player_1.zones.graveyard).toContain(CONSOLIDATION);
    expect(state.players.player_1.zones.discard).toContain(CONSOLIDATION);
  });

  it('does not draw for a defensive win, an attacker loss, or a Territory not controlled by the opponent', () => {
    let defenderCopy = game();
    defenderCopy.players.player_2.zones.deck = [FIRST];
    beginResolvedBattle(defenderCopy, [], [played('player_2')], 'player_2', 1, 6);
    defenderCopy = applyGameAction(defenderCopy, {
      type: 'resolve_battle',
      playerId: 'player_2',
    }).state;
    expect(defenderCopy.players.player_2.zones.hand).toEqual([]);

    let attackerLoss = game();
    attackerLoss.players.player_1.zones.deck = [FIRST];
    beginResolvedBattle(attackerLoss, [played('player_1')], [], 'player_2', 1, 6);
    attackerLoss = applyGameAction(attackerLoss, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;
    expect(attackerLoss.players.player_1.zones.hand).toEqual([]);

    let friendlyTerritory = game();
    friendlyTerritory.players.player_1.zones.deck = [FIRST];
    beginResolvedBattle(friendlyTerritory, [played('player_1')], [], 'player_1');
    friendlyTerritory = applyGameAction(friendlyTerritory, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;
    expect(friendlyTerritory.players.player_1.zones.hand).toEqual([]);
  });

  it('ignores canceled and negated Battle copies', () => {
    let state = game();
    state.players.player_1.zones.deck = [FIRST, SECOND];
    beginResolvedBattle(state, [
      played('player_1', 'hand', { canceled: true }),
      played('player_1', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(state.players.player_1.zones.hand).toContain(CONSOLIDATION);
    expect(state.players.player_1.zones.hand).not.toContain(FIRST);
    expect(state.players.player_1.zones.hand).not.toContain(SECOND);
  });
});
