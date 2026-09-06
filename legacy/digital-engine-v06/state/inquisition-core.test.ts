import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import { initializeGame } from './initialize';
import {
  applyCondemnationAfterBattle,
  awardBlasphemyForRevealedBattleCards,
  awardNormalConvictionAfterBattle,
  captureInquisitionGraveyards,
} from './inquisition-core';
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

function game(): GameState {
  const state = initializeGame({
    id: 'inquisition-core-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: ['card-valor', 'card-fortifications'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName: 'Spirit Walker',
        deck: ['mystics-grave-ward', 'mystics-dark-omens', 'card-valor'],
        territories: ['t4', 't5', 't6'],
      },
    ],
    startingPlayer: 'player_2',
  });
  return state;
}

function battle(): BattleState {
  return {
    id: 'inquisition-battle',
    stage: 'resolution',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Inquisition core doctrine', () => {
  it('initializes public Conviction and Inquisition state', () => {
    const state = game();
    expect(state.players.player_1.resources?.conviction).toMatchObject({
      value: 0,
      minimum: 0,
      maximum: 4,
    });
    expect(state.players.player_1.inquisition).toEqual({});
    expect(toPublicGameView(state).players.player_1.inquisition).toEqual({});
    expect(toPrivateGameView(state, 'player_1').players.player_1.inquisition).toEqual({});
  });

  it('applies Condemnation only to opposing cards used from a Battle Hand', () => {
    const state = game();
    const resolved = battle();
    resolved.attacker.handCommit = {
      cardId: 'mystics-dark-omens',
      owner: 'player_2',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    resolved.attacker.battleDrawPlayed = [{
      cardId: 'card-valor',
      owner: 'player_2',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    resolved.attacker.battleDraw = ['mystics-grave-ward'];
    state.players.player_2.zones.graveyard = ['mystics-dark-omens'];
    state.players.player_2.zones.discard = ['mystics-grave-ward', 'card-valor'];

    expect(applyCondemnationAfterBattle(state, resolved)).toEqual(['card-valor']);
    expect(state.players.player_2.zones.graveyard).toEqual(['mystics-dark-omens', 'card-valor']);
    expect(state.players.player_2.zones.discard).toEqual(['mystics-grave-ward']);
  });

  it('gains normal after-battle Conviction only once per turn', () => {
    const state = game();
    const resolved = battle();
    const before = captureInquisitionGraveyards(state);
    state.players.player_2.zones.graveyard.push('card-valor');

    expect(awardNormalConvictionAfterBattle(state, resolved, before)).toEqual(['player_1']);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);

    const secondBefore = captureInquisitionGraveyards(state);
    state.players.player_2.zones.graveyard.push('mystics-dark-omens');
    expect(awardNormalConvictionAfterBattle(state, resolved, secondBefore)).toEqual([]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);

    state.turn += 1;
    const nextTurnBefore = captureInquisitionGraveyards(state);
    state.players.player_2.zones.graveyard.push('mystics-grave-ward');
    expect(awardNormalConvictionAfterBattle(state, resolved, nextTurnBefore)).toEqual(['player_1']);
    expect(state.players.player_1.resources?.conviction?.value).toBe(2);
  });

  it('gains Blasphemy for a revealed Arcane Battle card only once', () => {
    const state = game();
    const activeBattle = battle();
    activeBattle.stage = 'dice';
    activeBattle.attacker.handCommit = {
      cardId: 'mystics-dark-omens',
      owner: 'player_2',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.battle = activeBattle;
    state.phase = 'battle';

    expect(awardBlasphemyForRevealedBattleCards(state)).toBe(1);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(awardBlasphemyForRevealedBattleCards(state)).toBe(0);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
  });

  it('gains Blasphemy when the opponent plays an Arcane Action card', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.players.player_2.actionsRemaining = 1;
    state.players.player_2.hasPlayedActionThisTurn = false;
    state.players.player_2.zones.hand = ['mystics-grave-ward'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_2',
      cardId: 'mystics-grave-ward',
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_2.zones.assetBank).toContain('mystics-grave-ward');
  });

  it('wins by Purification only after an empty normal Draw step', () => {
    let state = game();
    state.phase = 'turn_start';
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.players.player_2.zones.deck = [];
    state.players.player_2.zones.discard = [];

    state = applyGameAction(state, {
      type: 'draw_card',
      playerId: 'player_2',
    }).state;

    expect(state.winner).toBe('player_1');
    expect(state.phase).toBe('game_over');
    expect(state.log.at(-1)?.type).toBe('inquisition_purification_victory');
  });

  it('does not check Purification for a non-normal draw', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.players.player_2.zones.deck = [];
    state.players.player_2.zones.discard = [];

    state = applyGameAction(state, {
      type: 'draw_card',
      playerId: 'player_2',
    }).state;

    expect(state.winner).toBeUndefined();
  });
});
