import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import {
  openNextNecromancyBattleChoice,
  queueNecromancyBattleEffects,
  resolveNecromancyChoice,
} from './mystics-necromancy';
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

function played(
  owner: PlayerID,
  origin: 'hand' | 'battle_draw',
  flags: { canceled?: boolean; negated?: boolean } = {},
): BattlePlayedCard {
  return {
    cardId: 'mystics-necromancy',
    owner,
    origin,
    faceDown: false,
    canceled: flags.canceled ?? false,
    negated: flags.negated,
  };
}

function game(leaderName = 'Spirit Walker'): GameState {
  const state = initializeGame({
    id: 'mystics-necromancy-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName,
        deck: ['mystics-necromancy', 'card-valor', 'card-fortifications'],
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
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function resolvedBattle(state: GameState): BattleState {
  const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
  const current: BattleState = {
    id: 'necromancy-battle',
    stage: 'resolution',
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
  state.phase = 'action_after_movement';
  state.recentBattleResult = {
    battleId: current.id,
    turn: state.turn,
    winner: 'player_1',
    loser: 'player_2',
    attacker: 'player_1',
    defender: 'player_2',
    location: current.location,
    attackerOrigin: current.attackerOrigin,
    retreatDirection: 1,
  };
  return current;
}

describe('Necromancy Action', () => {
  it('holds the source outside normal zones and opens a private mandatory mode choice', () => {
    let state = game();
    state.players.player_1.zones.hand = ['mystics-necromancy', 'hand-card'];
    state.players.player_1.zones.graveyard = ['grave-card'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-necromancy',
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'necromancy_action',
      playerId: 'player_1',
      sourceCardId: 'mystics-necromancy',
      graveyardOptions: ['grave-card'],
    });
    expect(state.players.player_1.zones.removed).toContain('mystics-necromancy');
    expect(state.players.player_1.zones.graveyard).not.toContain('mystics-necromancy');
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual(expect.arrayContaining([
      { type: 'resolve_mystics_choice', playerId: 'player_1', choice: 'bury' },
      { type: 'resolve_mystics_choice', playerId: 'player_1', choice: 'recover', cardIds: [] },
      { type: 'resolve_mystics_choice', playerId: 'player_1', choice: 'recover', cardIds: ['grave-card'] },
    ]));
  });

  it('places itself beneath the Draw Pile, draws from the top, then releases deferred Invocation', () => {
    let state = game();
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes'];
    state.players.player_1.zones.hand = ['mystics-necromancy'];
    state.players.player_1.zones.deck = ['top-card', 'bottom-card'];
    state.players.player_1.zones.graveyard = ['grave-card'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-necromancy',
    }).state;
    expect(state.players.player_1.mystics?.invocationDeferredSourceCardIds).toContain('mystics-necromancy');

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'bury',
    }).state;

    expect(state.players.player_1.zones.hand).toContain('top-card');
    expect(state.players.player_1.zones.deck).toEqual(['bottom-card', 'mystics-necromancy']);
    expect(state.pendingMysticsChoice).toMatchObject({ kind: 'invocation', playerId: 'player_1' });
  });

  it('may draw itself when the Draw Pile and Discard Pile were otherwise empty', () => {
    let state = game();
    state.players.player_1.zones.hand = ['mystics-necromancy'];
    state.players.player_1.zones.deck = [];
    state.players.player_1.zones.discard = [];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-necromancy',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'bury',
    }).state;

    expect(state.players.player_1.zones.hand).toEqual(['mystics-necromancy']);
    expect(state.players.player_1.zones.deck).toEqual([]);
  });

  it('sacrifices every remaining hand card, returns up to three preexisting non-Necromancy cards, and graves the source', () => {
    let state = game();
    state.players.player_1.zones.hand = ['mystics-necromancy', 'hand-a', 'hand-b'];
    state.players.player_1.zones.graveyard = ['grave-a', 'grave-b', 'grave-c', 'grave-d'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-necromancy',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'recover',
      cardIds: ['grave-a', 'grave-b', 'grave-c'],
    }).state;

    expect(state.players.player_1.zones.hand).toEqual(['grave-a', 'grave-b', 'grave-c']);
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining([
      'grave-d',
      'hand-a',
      'hand-b',
      'mystics-necromancy',
    ]));
    const publicEvent = state.log.find((event) => event.type === 'mystics_necromancy_recovered')!;
    expect(JSON.stringify(publicEvent)).not.toContain('grave-a');
    expect(JSON.stringify(publicEvent)).not.toContain('hand-a');
  });

  it('supports duplicate-title multiplicity and rejects invalid recovery selections atomically', () => {
    let state = game();
    state.players.player_1.zones.hand = ['mystics-necromancy', 'hand-card'];
    state.players.player_1.zones.graveyard = ['duplicate', 'duplicate', 'other'];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-necromancy',
    }).state;

    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'recover',
      cardIds: ['duplicate', 'duplicate'],
    });
    expect(() => applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'recover',
      cardIds: ['duplicate', 'duplicate', 'duplicate'],
    })).toThrow(/eligible cards/i);
    expect(() => applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'recover',
      cardIds: ['mystics-necromancy'],
    })).toThrow(/cannot return a Necromancy/i);
    expect(() => applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'recover',
      cardIds: ['duplicate', 'duplicate', 'other', 'fourth'],
    })).toThrow(/at most three/i);
    expect(state.players.player_1.zones.removed).toContain('mystics-necromancy');
    expect(state.players.player_1.zones.hand).toContain('hand-card');
  });

  it('triggers Materia Prima once for the hand sacrifice and lets Grave Ward respond', () => {
    let state = game('Alchemist');
    state.players.player_1.zones.hand = ['mystics-necromancy', 'hand-a', 'hand-b'];
    state.players.player_1.zones.graveyard = ['grave-card'];
    state.players.player_1.zones.deck = ['replacement'];
    state.players.player_1.zones.assetBank = ['mystics-grave-ward'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-necromancy',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'recover',
      cardIds: ['grave-card'],
    }).state;

    expect(state.players.player_1.mystics?.materiaPrimaUsedTurn).toBe(state.turn);
    expect(state.players.player_1.zones.hand).toEqual(expect.arrayContaining(['replacement', 'grave-card']));
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_asset',
      playerId: 'player_1',
    });
  });
});

describe('Necromancy Battle cleanup', () => {
  it('queues active hand and Battle Hand copies after other cards reach their destinations', () => {
    const state = game();
    const current = resolvedBattle(state);
    current.attacker.handCommit = played('player_1', 'hand');
    current.attacker.battleDrawPlayed = [played('player_1', 'battle_draw')];
    state.players.player_1.zones.graveyard = ['mystics-necromancy', 'used-hand-card'];
    state.players.player_1.zones.discard = ['mystics-necromancy', 'used-battle-card'];
    state.players.player_1.zones.hand = ['remaining-hand'];

    expect(queueNecromancyBattleEffects(state, current)).toBe(2);
    expect(state.players.player_1.zones.graveyard).toEqual(['used-hand-card']);
    expect(state.players.player_1.zones.discard).toEqual(['used-battle-card']);
    expect(state.players.player_1.mystics?.necromancyBattleQueue).toHaveLength(2);
    expect(openNextNecromancyBattleChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'necromancy_battle',
      playerId: 'player_1',
      sourceOrigin: 'hand',
      graveyardOptions: ['used-hand-card'],
    });
  });

  it('ignores canceled and negated copies and skips entirely after game over', () => {
    const state = game();
    const current = resolvedBattle(state);
    current.attacker.handCommit = played('player_1', 'hand', { canceled: true });
    current.attacker.battleDrawPlayed = [played('player_1', 'battle_draw', { negated: true })];
    state.players.player_1.zones.hand = ['mystics-necromancy'];
    state.players.player_1.zones.discard = ['mystics-necromancy'];
    expect(queueNecromancyBattleEffects(state, current)).toBe(0);

    const over = game();
    const overBattle = resolvedBattle(over);
    overBattle.attacker.handCommit = played('player_1', 'hand');
    over.players.player_1.zones.graveyard = ['mystics-necromancy'];
    over.phase = 'game_over';
    expect(queueNecromancyBattleEffects(over, overBattle)).toBe(0);
  });

  it('resolves mandatory selections sequentially and restores each source to its normal destination', () => {
    let state = game();
    const current = resolvedBattle(state);
    current.attacker.handCommit = played('player_1', 'hand');
    current.attacker.battleDrawPlayed = [played('player_1', 'battle_draw')];
    state.players.player_1.zones.graveyard = ['mystics-necromancy', 'hand-result'];
    state.players.player_1.zones.discard = ['mystics-necromancy', 'draw-result'];
    state.players.player_1.zones.hand = ['remaining'];
    queueNecromancyBattleEffects(state, current);
    openNextNecromancyBattleChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'resolve',
      cardIds: ['hand-result'],
    }).state;

    expect(state.players.player_1.zones.hand).toContain('hand-result');
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining(['remaining', 'mystics-necromancy']));
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'necromancy_battle',
      sourceOrigin: 'battle_draw',
    });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'resolve',
      cardIds: [],
    }).state;

    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([
      'draw-result',
      'mystics-necromancy',
    ]));
    expect(state.players.player_1.mystics?.necromancyBattleQueue).toBeUndefined();
  });

  it('waits behind higher-priority cleanup windows and blocks deferred Invocation until resolved', () => {
    const state = game();
    const current = resolvedBattle(state);
    current.attacker.handCommit = played('player_1', 'hand');
    state.players.player_1.zones.graveyard = ['mystics-necromancy', 'grave-card'];
    queueNecromancyBattleEffects(state, current);
    state.pendingMysticsChoice = {
      kind: 'spirit_hollow_after_cleanup',
      playerId: 'player_1',
      battleId: current.id,
      spaceId: current.location,
      handOptions: ['hand-card'],
      graveyardOptions: ['grave-card'],
      options: ['pass', 'use'],
    };
    expect(openNextNecromancyBattleChoice(state)).toBe(false);

    state.pendingMysticsChoice = undefined;
    state.players.player_1.mystics!.invocationDeferredSourceCardIds = ['mystics-necromancy'];
    expect(openNextNecromancyBattleChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({ kind: 'necromancy_battle' });
  });
});
