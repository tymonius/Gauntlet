import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PendingMilitaryChoice,
  PlayerID,
  RecentBattleResult,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { NO_MARTYRS } from './inquisition-no-martyrs';
import { STAND_GROUND } from './neutral-stand-ground';

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

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-stand-ground-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mover',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [NO_MARTYRS, NO_MARTYRS, 'military-war-crimes', 'military-shock-and-awe'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'military',
        leaderName: 'General',
        deck: [STAND_GROUND, STAND_GROUND, 'card-valor', 'card-fortifications'],
        territories: ['t4', 't5', 't6'],
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

function placePlayers(state: GameState, playerOneIndex: number, playerTwoIndex: number): void {
  for (const space of state.board.spaces) delete space.occupant;
  const one = state.board.spaces.find((space) => space.index === playerOneIndex)!;
  const two = state.board.spaces.find((space) => space.index === playerTwoIndex)!;
  one.occupant = 'player_1';
  two.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = one.id;
  state.players.player_2.occupiedSpaceId = two.id;
}

function resolutionBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): BattleState {
  const origin = state.board.spaces.find((space) => space.index === 2)!;
  const location = state.board.spaces.find((space) => space.index === 3)!;
  return {
    id: 'stand-ground-battle',
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: {
      ...participant('player_1', attackerCards),
      diceRoll: 6,
    },
    defender: {
      ...participant('player_2', defenderCards),
      diceRoll: 1,
    },
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function revealBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): void {
  state.phase = 'battle';
  state.battle = {
    ...resolutionBattle(state, attackerCards, defenderCards),
    stage: 'dice',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    effectsResolved: [],
  };
}

function militaryResult(state: GameState): RecentBattleResult {
  return {
    battleId: 'prior-battle',
    turn: state.turn,
    winner: 'player_1',
    loser: 'player_2',
    attacker: 'player_1',
    defender: 'player_2',
    location: state.board.spaces.find((space) => space.index === 3)!.id,
    attackerOrigin: state.board.spaces.find((space) => space.index === 2)!.id,
    retreatDirection: 1,
    battleHandCards: { player_1: [], player_2: ['card-valor'] },
    handCommittedCards: {},
    ordersUsed: {},
  };
}

function setMilitaryChoice(state: GameState, choice: PendingMilitaryChoice): void {
  state.pendingMilitaryChoice = choice;
  state.priorityPlayer = choice.playerId;
}

describe('Neutral Stand Ground', () => {
  it('registers Action banking and ordinary Battle destinations', () => {
    expect(getCardPlayRule(STAND_GROUND)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
      requiresTarget: false,
    });

    let state = game();
    state.players.player_1.zones.hand = [STAND_GROUND];
    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: STAND_GROUND,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([STAND_GROUND]);
  });

  it('grants the defender Advantage per active physical Battle copy only', () => {
    let state = game();
    placePlayers(state, 2, 3);
    revealBattle(state, [played(STAND_GROUND, 'player_1')], [
      played(STAND_GROUND, 'player_2', 'hand'),
      played(STAND_GROUND, 'player_2'),
      played(STAND_GROUND, 'player_2', 'battle_draw', { canceled: true }),
      played(STAND_GROUND, 'player_2', 'battle_draw', { negated: true }),
      played(STAND_GROUND, 'player_2', 'battle_draw', { virtual: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.defender.advantage).toBe(2);
    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
    expect(state.battle?.effectsResolved).toContain('neutral_stand_ground_battle');
  });

  it('does not interfere with an ordinary required battle retreat', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_2.zones.assetBank = [STAND_GROUND];
    state.phase = 'battle';
    state.battle = resolutionBattle(state);

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.players.player_2.zones.assetBank).toEqual([STAND_GROUND]);
  });

  it('may cancel one No Martyrs additional retreat without canceling the normal retreat', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_2.zones.assetBank = [STAND_GROUND];
    state.phase = 'battle';
    state.battle = resolutionBattle(state, [played(NO_MARTYRS, 'player_1', 'hand')]);

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'stand_ground_movement',
      playerId: 'player_2',
      sourceCardId: NO_MARTYRS,
      movementKind: 'no_martyrs',
      triggersRemaining: 1,
    });
    expect(state.battle).toBeDefined();

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.players.player_2.zones.assetBank).toEqual([]);
    expect(state.players.player_2.zones.discard).toContain(STAND_GROUND);
    expect(state.recentBattleResult?.additionalRetreatPositions?.player_2).toBe(0);
  });

  it('offers stacked No Martyrs movements sequentially to separate physical copies', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_2.zones.assetBank = [STAND_GROUND, STAND_GROUND];
    state.phase = 'battle';
    state.battle = resolutionBattle(state, [
      played(NO_MARTYRS, 'player_1', 'hand'),
      played(NO_MARTYRS, 'player_1'),
    ]);

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ triggersRemaining: 2 });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'stand_ground_movement', triggersRemaining: 1,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use',
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.players.player_2.zones.discard.filter((card) => card === STAND_GROUND)).toHaveLength(2);
  });

  it('cannot answer No Martyrs while banked Asset use is prohibited', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_2.zones.assetBank = [STAND_GROUND];
    state.phase = 'battle';
    state.battle = resolutionBattle(state, [played(NO_MARTYRS, 'player_1', 'hand')]);
    state.battle.bankedAssetUseProhibited = ['player_2'];

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 5)?.id,
    );
    expect(state.players.player_2.zones.assetBank).toEqual([STAND_GROUND]);
  });

  it('prevents War Crimes movement while preserving its other consequences', () => {
    let state = game();
    placePlayers(state, 3, 4);
    state.phase = 'action_after_movement';
    state.recentBattleResult = militaryResult(state);
    state.players.player_1.zones.assetBank = ['military-war-crimes'];
    state.players.player_2.zones.assetBank = [STAND_GROUND];
    state.players.player_2.zones.discard = ['card-valor'];
    setMilitaryChoice(state, {
      kind: 'war_crimes',
      playerId: 'player_1',
      sourceCardId: 'military-war-crimes',
      defeatedPlayer: 'player_2',
      affectedCards: ['card-valor'],
      options: ['use', 'pass'],
    });

    state = applyGameAction(state, {
      type: 'resolve_military_choice', playerId: 'player_1', choice: 'use',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'stand_ground_movement',
      playerId: 'player_2',
      movementKind: 'war_crimes',
    });
    expect(state.players.player_1.zones.assetBank).toContain('military-war-crimes');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use',
    }).state;

    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.players.player_2.zones.graveyard).toContain('card-valor');
    expect(state.players.player_1.zones.graveyard).toContain('military-war-crimes');
    expect(state.players.player_1.military?.victoryRestrictions).toEqual({
      noMovement: true, noCapture: true, noOrders: true,
    });
  });

  it('prevents Shock and Awe’s opposing movement, leaving no vacated position to advance into', () => {
    let state = game();
    placePlayers(state, 3, 4);
    state.phase = 'action_after_movement';
    state.recentBattleResult = militaryResult(state);
    state.players.player_1.zones.assetBank = ['military-shock-and-awe'];
    state.players.player_2.zones.assetBank = [STAND_GROUND];
    setMilitaryChoice(state, {
      kind: 'shock_and_awe',
      playerId: 'player_1',
      sourceCardId: 'military-shock-and-awe',
      location: state.recentBattleResult.location,
      defeatedPlayer: 'player_2',
      options: ['breakthrough', 'consolidate'],
    });

    state = applyGameAction(state, {
      type: 'resolve_military_choice', playerId: 'player_1', choice: 'breakthrough',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ movementKind: 'shock_and_awe' });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use',
    }).state;

    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.players.player_1.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 3)?.id,
    );
    expect(state.players.player_1.zones.graveyard).toContain('military-shock-and-awe');
  });
});
