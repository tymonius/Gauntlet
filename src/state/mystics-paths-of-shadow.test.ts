import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, BattleState, GameState, PlayerID } from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import {
  openPathsOfShadowChoiceIfReady,
  queuePathsOfShadowAfterBattle,
  resolvePathsOfShadowChoice,
} from './mystics-paths-of-shadow';
import { toPrivateGameView, toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function played(owner: PlayerID, origin: 'hand' | 'battle_draw', canceled = false): BattlePlayedCard {
  return {
    cardId: 'mystics-paths-of-shadow',
    owner,
    origin,
    faceDown: false,
    canceled,
  };
}

function game(): GameState {
  const state = initializeGame({
    id: 'mystics-paths-of-shadow-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName: 'Spirit Walker',
        deck: ['mystics-paths-of-shadow', 'mystics-paths-of-shadow', 'card-valor'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-embargo', 'card-valor'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function territories(state: GameState) {
  return state.board.spaces.filter((space) => space.kind === 'territory');
}

function place(state: GameState, playerId: PlayerID, offset: number): void {
  for (const space of state.board.spaces) {
    if (space.occupant === playerId) space.occupant = undefined;
  }
  const space = territories(state)[offset];
  space.occupant = playerId;
  state.players[playerId].occupiedSpaceId = space.id;
}

function resolvedBattle(state: GameState): BattleState {
  const spaces = territories(state);
  return {
    id: 'paths-of-shadow-battle',
    stage: 'resolution',
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function recordLoss(state: GameState, battle: BattleState): void {
  state.recentBattleResult = {
    battleId: battle.id,
    turn: state.turn,
    winner: 'player_2',
    loser: 'player_1',
    attacker: 'player_2',
    defender: 'player_1',
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    retreatDirection: -1,
  };
  state.log.push({
    id: `${state.id}-battle-log`,
    turn: state.turn,
    actor: 'player_2',
    type: 'battle_resolved',
    message: 'Opponent won the battle.',
    payload: { cancellations: [] },
    visibility: 'public',
  });
  state.phase = 'action_after_movement';
}

function prepareControlledDestinations(state: GameState): { originId: string; destinationId: string } {
  const spaces = territories(state);
  for (const space of state.board.spaces) space.occupant = undefined;
  spaces[0].controller = 'player_1';
  spaces[1].controller = 'player_1';
  spaces[0].occupant = 'player_1';
  state.players.player_1.occupiedSpaceId = spaces[0].id;
  return { originId: spaces[0].id, destinationId: spaces[1].id };
}

describe('Paths of Shadow Action effect', () => {
  it('moves to a different controlled Territory without spending movement or initiating a battle', () => {
    let state = game();
    const { originId, destinationId } = prepareControlledDestinations(state);
    state.players.player_1.zones.hand = ['mystics-paths-of-shadow'];
    state.players.player_1.movementRemaining = 1;

    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-paths-of-shadow',
      targets: [{ kind: 'space', spaceId: destinationId }],
    });

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-paths-of-shadow',
      targets: [{ kind: 'space', spaceId: destinationId }],
    }).state;

    expect(state.players.player_1.occupiedSpaceId).toBe(destinationId);
    expect(state.board.spaces.find((space) => space.id === originId)?.occupant).toBeUndefined();
    expect(state.board.spaces.find((space) => space.id === destinationId)?.occupant).toBe('player_1');
    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.phase).toBe('action_before_movement');
    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.discard).toContain('mystics-paths-of-shadow');
  });

  it('rejects missing, current, uncontrolled, and occupied targets before the card leaves hand', () => {
    const state = game();
    const { originId, destinationId } = prepareControlledDestinations(state);
    const enemySpace = territories(state)[4];
    enemySpace.controller = 'player_2';
    state.players.player_1.zones.hand = ['mystics-paths-of-shadow'];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-paths-of-shadow',
    })).toThrow(/requires exactly one/i);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-paths-of-shadow',
      targets: [{ kind: 'space', spaceId: originId }],
    })).toThrow(/different Territory/i);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-paths-of-shadow',
      targets: [{ kind: 'space', spaceId: enemySpace.id }],
    })).toThrow(/control/i);

    const destination = state.board.spaces.find((space) => space.id === destinationId)!;
    destination.occupant = 'player_2';
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-paths-of-shadow',
      targets: [{ kind: 'space', spaceId: destinationId }],
    })).toThrow(/occupied/i);
    expect(state.players.player_1.zones.hand).toEqual(['mystics-paths-of-shadow']);
  });

  it('clears a pending capture when the player abandons an occupied enemy Territory', () => {
    let state = game();
    const spaces = territories(state);
    for (const space of state.board.spaces) space.occupant = undefined;
    spaces[1].controller = 'player_2';
    spaces[1].occupant = 'player_1';
    spaces[1].capturePendingBy = 'player_1';
    spaces[0].controller = 'player_1';
    state.players.player_1.occupiedSpaceId = spaces[1].id;
    state.players.player_1.zones.hand = ['mystics-paths-of-shadow'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-paths-of-shadow',
      targets: [{ kind: 'space', spaceId: spaces[0].id }],
    }).state;

    expect(spaces[1].capturePendingBy).toBe('player_1');
    expect(state.board.spaces.find((space) => space.id === spaces[1].id)?.capturePendingBy).toBeUndefined();
  });
});

describe('Paths of Shadow Battle effect', () => {
  it('opens a private optional replacement and relocates from the provisional retreat space', () => {
    let state = game();
    const spaces = territories(state);
    for (const space of state.board.spaces) space.occupant = undefined;
    spaces[0].controller = 'player_1';
    spaces[1].controller = 'player_1';
    spaces[2].controller = 'player_1';
    spaces[1].occupant = 'player_1';
    state.players.player_1.occupiedSpaceId = spaces[1].id;

    const battle = resolvedBattle(state);
    battle.defender.handCommit = played('player_1', 'hand');
    recordLoss(state, battle);

    queuePathsOfShadowAfterBattle(state, battle);
    expect(openPathsOfShadowChoiceIfReady(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'paths_of_shadow_battle',
      playerId: 'player_1',
      battleId: battle.id,
      normalRetreatSpaceId: spaces[1].id,
      spaceOptions: expect.arrayContaining([spaces[0].id, spaces[2].id]),
    });
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'move',
      spaceId: spaces[0].id,
    });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'move',
      spaceId: spaces[0].id,
    }).state;

    expect(state.players.player_1.occupiedSpaceId).toBe(spaces[0].id);
    expect(state.board.spaces.find((space) => space.id === spaces[1].id)?.occupant).toBeUndefined();
    expect(state.board.spaces.find((space) => space.id === spaces[0].id)?.occupant).toBe('player_1');
    expect(state.pendingMysticsChoice).toBeUndefined();
  });

  it('passes and keeps the normal retreat result', () => {
    const state = game();
    const spaces = territories(state);
    for (const space of state.board.spaces) space.occupant = undefined;
    spaces[0].controller = 'player_1';
    spaces[1].controller = 'player_1';
    spaces[1].occupant = 'player_1';
    state.players.player_1.occupiedSpaceId = spaces[1].id;
    const battle = resolvedBattle(state);
    battle.defender.handCommit = played('player_1', 'hand');
    recordLoss(state, battle);
    queuePathsOfShadowAfterBattle(state, battle);
    openPathsOfShadowChoiceIfReady(state);

    resolvePathsOfShadowChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    });

    expect(state.players.player_1.occupiedSpaceId).toBe(spaces[1].id);
    expect(state.board.spaces.find((space) => space.id === spaces[1].id)?.occupant).toBe('player_1');
    expect(state.pendingMysticsChoice).toBeUndefined();
  });

  it('treats duplicate copies as one relocation opportunity and remains available when only one is canceled', () => {
    const state = game();
    const spaces = territories(state);
    for (const space of state.board.spaces) space.occupant = undefined;
    spaces[0].controller = 'player_1';
    spaces[1].controller = 'player_1';
    spaces[1].occupant = 'player_1';
    state.players.player_1.occupiedSpaceId = spaces[1].id;
    const battle = resolvedBattle(state);
    battle.defender.handCommit = played('player_1', 'hand');
    battle.defender.battleDrawPlayed = [played('player_1', 'battle_draw')];
    recordLoss(state, battle);
    const resolvedLog = state.log[state.log.length - 1];
    resolvedLog.payload = {
      cancellations: [{ owner: 'player_1', cardId: 'mystics-paths-of-shadow' }],
    };

    queuePathsOfShadowAfterBattle(state, battle);
    expect(state.players.player_1.mystics?.pathsOfShadowBattleQueue).toHaveLength(1);
    expect(openPathsOfShadowChoiceIfReady(state)).toBe(true);
  });

  it('does not open when all copies were canceled or no alternate controlled Territory is open', () => {
    const canceledState = game();
    const canceledSpaces = territories(canceledState);
    for (const space of canceledState.board.spaces) space.occupant = undefined;
    canceledSpaces[0].controller = 'player_1';
    canceledSpaces[1].controller = 'player_1';
    canceledSpaces[1].occupant = 'player_1';
    canceledState.players.player_1.occupiedSpaceId = canceledSpaces[1].id;
    const canceledBattle = resolvedBattle(canceledState);
    canceledBattle.defender.handCommit = played('player_1', 'hand');
    recordLoss(canceledState, canceledBattle);
    canceledState.log[canceledState.log.length - 1].payload = {
      cancellations: [{ owner: 'player_1', cardId: 'mystics-paths-of-shadow' }],
    };
    queuePathsOfShadowAfterBattle(canceledState, canceledBattle);
    expect(openPathsOfShadowChoiceIfReady(canceledState)).toBe(false);

    const blockedState = game();
    const blockedSpaces = territories(blockedState);
    for (const space of blockedState.board.spaces) space.occupant = undefined;
    for (const space of blockedSpaces) space.controller = 'player_2';
    blockedSpaces[1].controller = 'player_1';
    blockedSpaces[1].occupant = 'player_1';
    blockedState.players.player_1.occupiedSpaceId = blockedSpaces[1].id;
    const blockedBattle = resolvedBattle(blockedState);
    blockedBattle.defender.handCommit = played('player_1', 'hand');
    recordLoss(blockedState, blockedBattle);
    queuePathsOfShadowAfterBattle(blockedState, blockedBattle);
    expect(openPathsOfShadowChoiceIfReady(blockedState)).toBe(false);
  });

  it('waits behind a higher-priority aftermath window', () => {
    const state = game();
    const spaces = territories(state);
    for (const space of state.board.spaces) space.occupant = undefined;
    spaces[0].controller = 'player_1';
    spaces[1].controller = 'player_1';
    spaces[1].occupant = 'player_1';
    state.players.player_1.occupiedSpaceId = spaces[1].id;
    const battle = resolvedBattle(state);
    battle.defender.handCommit = played('player_1', 'hand');
    recordLoss(state, battle);
    queuePathsOfShadowAfterBattle(state, battle);
    state.pendingLeaderAbilityWindow = { playerId: 'player_2', timing: 'after_battle', battleId: battle.id };

    expect(openPathsOfShadowChoiceIfReady(state)).toBe(false);
    state.pendingLeaderAbilityWindow = undefined;
    expect(openPathsOfShadowChoiceIfReady(state)).toBe(true);
  });
});
