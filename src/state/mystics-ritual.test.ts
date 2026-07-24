import { describe, expect, it } from 'vitest';
import type { GameState, MysticRiteId } from '../types';
import { initializeGame } from './initialize';
import {
  beginRiteOfBlood,
  beginRiteOfCrossing,
  beginRiteOfEchoes,
  canBeginRiteOfCrossing,
  completeBegunRite,
  invocationUnlocked,
  MysticsRitualError,
  resetBegunRite,
  transmutationUnlocked,
} from './mystics-ritual';
import { toPrivateGameView, toPublicGameView } from './views';

function game(): GameState {
  const state = initializeGame({
    id: 'mystics-ritual-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName: 'Alchemist',
        deck: ['mystics-dark-omens', 'mystics-dark-omens', 'mystics-fates-toll'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.phase = 'action_after_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function setBegunRite(state: GameState, riteId: MysticRiteId): void {
  if (riteId === 'rite_of_echoes') {
    state.players.player_1.mystics!.begunRite = {
      kind: riteId,
      startedTurn: state.turn - 1,
      faceUpBoundCardId: 'echo-face-up',
      faceDownBoundCardId: 'echo-face-down',
    };
    return;
  }
  if (riteId === 'rite_of_crossing') {
    state.players.player_1.mystics!.begunRite = {
      kind: riteId,
      startedTurn: state.turn - 1,
      requiredSpaceId: 'space-3',
    };
    return;
  }
  state.players.player_1.mystics!.begunRite = {
    kind: riteId,
    startedTurn: state.turn - 1,
  };
}

describe('Mystics Ritual foundation', () => {
  it('initializes Mystics state only for the Mystics player', () => {
    const state = game();

    expect(state.players.player_1.mystics).toEqual({ completedRites: [] });
    expect(state.players.player_2.mystics).toBeUndefined();
    expect(invocationUnlocked(state.players.player_1.mystics)).toBe(false);
    expect(transmutationUnlocked(state.players.player_1.mystics)).toBe(false);
  });

  it('begins Rite of Echoes with one public and one private bound card', () => {
    const state = game();
    state.players.player_1.zones.graveyard = ['grave-card'];
    state.players.player_1.zones.hand = ['mystics-dark-omens'];

    beginRiteOfEchoes(state, 'player_1', 'grave-card', 'mystics-dark-omens');

    expect(state.players.player_1.zones.graveyard).toEqual([]);
    expect(state.players.player_1.zones.hand).toEqual([]);
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.mystics?.begunRite).toEqual({
      kind: 'rite_of_echoes',
      startedTurn: 1,
      faceUpBoundCardId: 'grave-card',
      faceDownBoundCardId: 'mystics-dark-omens',
    });

    expect(toPublicGameView(state).players.player_1.mystics?.begunRite).toEqual({
      kind: 'rite_of_echoes',
      startedTurn: 1,
      faceUpBoundCardId: 'grave-card',
      faceDownBoundCardCount: 1,
    });
    expect(toPrivateGameView(state, 'player_1').players.player_1.mystics?.begunRite).toMatchObject({
      faceDownBoundCardId: 'mystics-dark-omens',
    });
    expect(toPrivateGameView(state, 'player_2').players.player_1.mystics?.begunRite).not.toHaveProperty('faceDownBoundCardId');
  });

  it('rejects Rite of Echoes when the hand title has no other copy in the Playable Deck', () => {
    const state = game();
    state.players.player_1.zones.graveyard = ['grave-card'];
    state.players.player_1.zones.hand = ['mystics-necromancy'];
    state.players.player_1.zones.deck = [];

    expect(() => beginRiteOfEchoes(
      state,
      'player_1',
      'grave-card',
      'mystics-necromancy',
    )).toThrow(/share its title/i);

    expect(state.players.player_1.zones.graveyard).toEqual(['grave-card']);
    expect(state.players.player_1.zones.hand).toEqual(['mystics-necromancy']);
  });

  it('begins Rite of Blood by sacrificing one chosen hand card', () => {
    const state = game();
    state.players.player_1.zones.hand = ['sacrifice', 'keep'];

    beginRiteOfBlood(state, 'player_1', 'sacrifice');

    expect(state.players.player_1.zones.hand).toEqual(['keep']);
    expect(state.players.player_1.zones.graveyard).toContain('sacrifice');
    expect(state.players.player_1.mystics?.begunRite).toEqual({
      kind: 'rite_of_blood',
      startedTurn: 1,
    });
  });

  it('begins Rite of Crossing only after a qualifying attacking victory', () => {
    const state = game();
    const enemyTerritory = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    for (const space of state.board.spaces) space.occupant = undefined;
    enemyTerritory.occupant = 'player_1';
    state.players.player_1.occupiedSpaceId = enemyTerritory.id;
    state.players.player_1.zones.hand = ['mystics-fates-toll'];
    state.recentBattleResult = {
      battleId: 'battle-crossing',
      turn: state.turn,
      winner: 'player_1',
      loser: 'player_2',
      attacker: 'player_1',
      defender: 'player_2',
      location: enemyTerritory.id,
      attackerOrigin: state.board.spaces[1].id,
      retreatDirection: 1,
    };

    expect(canBeginRiteOfCrossing(state, 'player_1')).toBe(true);
    beginRiteOfCrossing(state, 'player_1', 'mystics-fates-toll', 'hand');

    expect(state.players.player_1.mystics?.begunRite).toEqual({
      kind: 'rite_of_crossing',
      startedTurn: state.turn,
      requiredSpaceId: enemyTerritory.id,
    });
    expect(state.players.player_1.zones.graveyard).toContain('mystics-fates-toll');
  });

  it('uses the Rite of Crossing discard fallback only when no Arcane card is in hand', () => {
    const state = game();
    const enemyTerritory = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    for (const space of state.board.spaces) space.occupant = undefined;
    enemyTerritory.occupant = 'player_1';
    state.players.player_1.occupiedSpaceId = enemyTerritory.id;
    state.players.player_1.zones.hand = ['neutral-card'];
    state.players.player_1.zones.discard = ['mystics-dark-omens'];
    state.recentBattleResult = {
      battleId: 'battle-crossing-fallback',
      turn: state.turn,
      winner: 'player_1',
      loser: 'player_2',
      attacker: 'player_1',
      defender: 'player_2',
      location: enemyTerritory.id,
      attackerOrigin: state.board.spaces[1].id,
      retreatDirection: 1,
    };

    beginRiteOfCrossing(state, 'player_1', 'mystics-dark-omens', 'discard');

    expect(state.players.player_1.zones.discard).toEqual([]);
    expect(state.players.player_1.zones.graveyard).toContain('mystics-dark-omens');
    expect(state.log.some((event) => event.type === 'mystics_hand_revealed_for_crossing')).toBe(true);
  });

  it('returns both Echoes bindings to the Graveyard when the Rite resets', () => {
    const state = game();
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_echoes',
      startedTurn: 1,
      faceUpBoundCardId: 'bound-from-graveyard',
      faceDownBoundCardId: 'bound-from-hand',
    };

    expect(resetBegunRite(state, 'player_1', 'battle_lost')).toBe('rite_of_echoes');
    expect(state.players.player_1.mystics?.begunRite).toBeUndefined();
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining([
      'bound-from-graveyard',
      'bound-from-hand',
    ]));
  });

  it('prevents same-turn and multiple same-turn Rite completion', () => {
    const state = game();
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_blood',
      startedTurn: state.turn,
    };

    expect(() => completeBegunRite(state, 'player_1', 'rite_of_blood')).toThrow(/cannot complete during the turn/i);

    state.turn = 2;
    completeBegunRite(state, 'player_1', 'rite_of_blood');
    setBegunRite(state, 'rite_of_crossing');

    expect(() => completeBegunRite(state, 'player_1', 'rite_of_crossing')).toThrow(/only one Rite/i);
  });

  it('unlocks Invocation and Transmutation and wins after the third Rite', () => {
    const state = game();
    state.turn = 2;
    setBegunRite(state, 'rite_of_echoes');
    completeBegunRite(state, 'player_1', 'rite_of_echoes');

    expect(invocationUnlocked(state.players.player_1.mystics)).toBe(true);
    expect(transmutationUnlocked(state.players.player_1.mystics)).toBe(false);
    expect(state.players.player_1.zones.discard).toContain('echo-face-up');
    expect(state.players.player_1.zones.graveyard).toContain('echo-face-down');

    state.turn = 3;
    setBegunRite(state, 'rite_of_blood');
    completeBegunRite(state, 'player_1', 'rite_of_blood');
    expect(transmutationUnlocked(state.players.player_1.mystics)).toBe(true);

    state.turn = 4;
    setBegunRite(state, 'rite_of_crossing');
    completeBegunRite(state, 'player_1', 'rite_of_crossing');

    expect(state.players.player_1.mystics?.completedRites).toEqual([
      'rite_of_echoes',
      'rite_of_blood',
      'rite_of_crossing',
    ]);
    expect(state.winner).toBe('player_1');
    expect(state.phase).toBe('game_over');
    expect(state.priorityPlayer).toBeUndefined();
    expect(state.log.some((event) => event.type === 'mystics_ritual_victory')).toBe(true);
  });

  it('rejects Rite APIs for a non-Mystics player', () => {
    const state = game();
    state.phase = 'action_after_movement';
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.players.player_2.zones.hand = ['sacrifice'];

    expect(() => beginRiteOfBlood(state, 'player_2', 'sacrifice')).toThrow(MysticsRitualError);
  });
});
