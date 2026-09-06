import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import {
  expireFatesTollMovement,
  openNextFatesTollReroll,
} from './mystics-fates-toll';
import { initializeGame } from './initialize';
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
    cardId: 'mystics-fates-toll',
    owner,
    origin,
    faceDown: false,
    canceled,
  };
}

function game(leaderName = 'Spirit Walker'): GameState {
  const state = initializeGame({
    id: 'mystics-fates-toll-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName,
        deck: ['mystics-fates-toll', 'card-valor', 'card-fortifications'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor', 'card-fortifications'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function placeMystic(state: GameState, territoryOffset = 1): void {
  const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
  for (const space of state.board.spaces) space.occupant = undefined;
  const space = spaces[territoryOffset];
  space.occupant = 'player_1';
  state.players.player_1.occupiedSpaceId = space.id;
}

function prepareDiceBattle(state: GameState, secondCopy = false, canceled = false): void {
  const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'fates-toll-battle',
    stage: 'dice',
    location: spaces[3].id,
    attackerOrigin: spaces[2].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
  state.battle.attacker.handCommit = played('player_1', 'hand', canceled);
  if (secondCopy) {
    state.battle.attacker.battleDrawPlayed = [played('player_1', 'battle_draw')];
    state.battle.attacker.battleDrawPlayLimit = 2;
  }
}

describe("Fate's Toll Action effect", () => {
  it('requires one other card from hand and preserves state when the target is invalid', () => {
    const state = game();
    state.phase = 'action_after_movement';
    state.players.player_1.zones.hand = ['mystics-fates-toll'];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-fates-toll',
    })).toThrow(/requires one other card/i);
    expect(state.players.player_1.zones.hand).toEqual(['mystics-fates-toll']);

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-fates-toll',
      targets: [{ kind: 'card', owner: 'player_1', cardId: 'mystics-fates-toll' }],
    })).toThrow(/another card/i);
    expect(state.players.player_1.zones.hand).toEqual(['mystics-fates-toll']);
  });

  it('sacrifices the target, adds one position, reopens movement, and triggers Materia Prima', () => {
    let state = game('Alchemist');
    state.phase = 'action_after_movement';
    state.players.player_1.movementRemaining = 0;
    state.players.player_1.zones.hand = ['mystics-fates-toll', 'card-valor'];
    state.players.player_1.zones.deck = ['card-fortifications'];
    placeMystic(state);

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-fates-toll',
      targets: [{ kind: 'card', owner: 'player_1', cardId: 'card-valor' }],
    }).state;

    expect(state.phase).toBe('movement');
    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.players.player_1.mystics).toMatchObject({
      fatesTollMovementTurn: state.turn,
      fatesTollMovementRemaining: 1,
      materiaPrimaUsedTurn: state.turn,
    });
    expect(state.players.player_1.zones.graveyard).toContain('card-valor');
    expect(state.players.player_1.zones.discard).toContain('mystics-fates-toll');
    expect(state.players.player_1.zones.hand).toContain('card-fortifications');
  });

  it('resolves movement one position at a time and consumes the tagged bonus last', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.movementRemaining = 1;
    state.players.player_1.zones.hand = ['mystics-fates-toll', 'card-valor'];
    placeMystic(state, 1);

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-fates-toll',
      targets: [{ kind: 'card', owner: 'player_1', cardId: 'card-valor' }],
    }).state;
    state.phase = 'movement';
    const spaces = state.board.spaces.filter((space) => space.kind === 'territory');

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: spaces[2].id,
    }).state;

    expect(state.phase).toBe('movement');
    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.players.player_1.mystics?.fatesTollMovementRemaining).toBe(1);

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: spaces[3].id,
    }).state;

    expect(state.phase).toBe('action_after_movement');
    expect(state.players.player_1.movementRemaining).toBe(0);
    expect(state.players.player_1.mystics?.fatesTollMovementRemaining).toBeUndefined();
  });

  it('ends all remaining movement when a battle begins', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.movementRemaining = 1;
    state.players.player_1.zones.hand = ['mystics-fates-toll', 'card-valor'];
    const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
    placeMystic(state, 2);
    spaces[3].occupant = 'player_2';
    state.players.player_2.occupiedSpaceId = spaces[3].id;

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-fates-toll',
      targets: [{ kind: 'card', owner: 'player_1', cardId: 'card-valor' }],
    }).state;
    state.phase = 'movement';

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: spaces[3].id,
    }).state;

    expect(state.phase).toBe('battle');
    expect(state.players.player_1.movementRemaining).toBe(0);
    expect(state.players.player_1.mystics?.fatesTollMovementRemaining).toBeUndefined();
  });

  it('clears unused movement credit at turn end', () => {
    const state = game();
    state.players.player_1.mystics!.fatesTollMovementTurn = state.turn;
    state.players.player_1.mystics!.fatesTollMovementRemaining = 1;

    expireFatesTollMovement(state, 'player_1');

    expect(state.players.player_1.mystics?.fatesTollMovementTurn).toBeUndefined();
    expect(state.players.player_1.mystics?.fatesTollMovementRemaining).toBeUndefined();
  });
});

describe("Fate's Toll Battle effect", () => {
  it('opens a private reroll choice after the owner rolls and pass keeps the result', () => {
    let state = game();
    state.players.player_1.zones.hand = ['card-valor'];
    prepareDiceBattle(state);

    state = applyGameAction(state, {
      type: 'roll_battle_die',
      playerId: 'player_1',
      value: 4,
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'fates_toll_reroll',
      playerId: 'player_1',
      oldRoll: 4,
      handOptions: ['card-valor'],
    });
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.battle?.attacker.diceRoll).toBe(4);
    expect(state.pendingMysticsChoice).toBeUndefined();
  });

  it('sacrifices a hand card and replaces the full advantage roll pool', () => {
    let state = game('Alchemist');
    state.players.player_1.zones.hand = ['card-valor'];
    state.players.player_1.zones.deck = ['card-fortifications'];
    prepareDiceBattle(state);
    state.battle!.attacker.advantage = 1;

    state = applyGameAction(state, {
      type: 'roll_battle_die',
      playerId: 'player_1',
      values: [2, 4],
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'card-valor',
      values: [1, 6],
    }).state;

    expect(state.battle?.attacker.diceRolls).toEqual([1, 6]);
    expect(state.battle?.attacker.diceRoll).toBe(6);
    expect(state.players.player_1.zones.graveyard).toContain('card-valor');
    expect(state.players.player_1.mystics?.materiaPrimaDeferredBattleId).toBe('fates-toll-battle');
    expect(state.players.player_1.zones.hand).not.toContain('card-fortifications');
  });

  it('resolves multiple active copies sequentially using the current result each time', () => {
    let state = game();
    state.players.player_1.zones.hand = ['card-valor', 'card-fortifications'];
    prepareDiceBattle(state, true);

    state = applyGameAction(state, {
      type: 'roll_battle_die',
      playerId: 'player_1',
      value: 2,
    }).state;
    expect(state.pendingMysticsChoice).toMatchObject({ oldRoll: 2 });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'card-valor',
      value: 5,
    }).state;
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'fates_toll_reroll',
      oldRoll: 5,
    });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    expect(state.battle?.attacker.diceRoll).toBe(5);
    expect(state.pendingMysticsChoice).toBeUndefined();
  });

  it('ignores canceled copies and automatically skips when hand is empty', () => {
    const canceled = game();
    canceled.players.player_1.zones.hand = ['card-valor'];
    prepareDiceBattle(canceled, false, true);
    canceled.battle!.attacker.diceRoll = 3;
    canceled.battle!.attacker.diceRolls = [3];
    expect(openNextFatesTollReroll(canceled)).toBe(false);
    expect(canceled.pendingMysticsChoice).toBeUndefined();

    const empty = game();
    empty.players.player_1.zones.hand = [];
    prepareDiceBattle(empty);
    empty.battle!.attacker.diceRoll = 3;
    empty.battle!.attacker.diceRolls = [3];
    expect(openNextFatesTollReroll(empty)).toBe(false);
    expect(empty.pendingMysticsChoice).toBeUndefined();
    expect(empty.battle?.effectsResolved).toContain('mystics_fates_toll_resolved:player_1:hand');
  });
});
