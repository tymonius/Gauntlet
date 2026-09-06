import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import {
  ACT_OF_FAITH,
  openNextActOfFaithChoice,
  queueActOfFaithBattleEffects,
} from './inquisition-act-of-faith';
import { initializeGame } from './initialize';
import { toPrivateGameView, toPublicGameView } from './views';

const FIRST = 'neutral-contingency-plan';
const SECOND = 'neutral-counterintelligence';
const THIRD = 'inquisition-divine-mercy';
const FOURTH = 'inquisition-penance';

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
    id: 'inquisition-act-of-faith-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [ACT_OF_FAITH, 'inquisition-excommunication'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor', 'card-fortifications', 'card-attrition'],
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

function resolvedBattle(): BattleState {
  return {
    id: 'act-of-faith-battle',
    stage: 'resolution',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function setRecentResult(state: GameState, battle: BattleState): void {
  state.recentBattleResult = {
    battleId: battle.id,
    turn: state.turn,
    winner: 'player_1',
    loser: 'player_2',
    attacker: 'player_2',
    defender: 'player_1',
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    retreatDirection: 1,
  };
}

describe('Inquisition Act of Faith', () => {
  it('reveals up to three cards as an Action and holds them outside all zones until selection', () => {
    let state = game();
    state.players.player_1.zones.hand = [ACT_OF_FAITH];
    state.players.player_2.zones.deck = [FIRST, SECOND, THIRD, FOURTH];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ACT_OF_FAITH,
    }).state;

    expect(state.players.player_1.zones.discard).toContain(ACT_OF_FAITH);
    expect(state.players.player_2.zones.deck).toEqual([FOURTH]);
    expect(state.players.player_2.zones.discard).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'act_of_faith',
      playerId: 'player_1',
      opponentId: 'player_2',
      source: 'action',
      revealedCards: [FIRST, SECOND, THIRD],
    });
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_graveyard',
      cardId: SECOND,
    }).state;

    expect(state.players.player_2.zones.graveyard).toEqual([SECOND]);
    expect(state.players.player_2.zones.discard).toEqual([FIRST, THIRD]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
    expect(state.pendingInquisitionChoice).toBeUndefined();
  });

  it('automatically puts a sole Action reveal in the Graveyard', () => {
    let state = game();
    state.players.player_1.zones.hand = [ACT_OF_FAITH];
    state.players.player_2.zones.deck = [FIRST];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ACT_OF_FAITH,
    }).state;

    expect(state.players.player_2.zones.deck).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toEqual([FIRST]);
    expect(state.players.player_2.zones.discard).toEqual([]);
    expect(state.pendingInquisitionChoice).toBeUndefined();
  });

  it('does not reshuffle the opponent Discard Pile when their Draw Pile is empty', () => {
    let state = game();
    state.players.player_1.zones.hand = [ACT_OF_FAITH];
    state.players.player_2.zones.deck = [];
    state.players.player_2.zones.discard = [FIRST];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ACT_OF_FAITH,
    }).state;

    expect(state.players.player_2.zones.deck).toEqual([]);
    expect(state.players.player_2.zones.discard).toEqual([FIRST]);
    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.pendingInquisitionChoice).toBeUndefined();
  });

  it('reveals up to two after battle, resolves the choice, and gains normal Conviction', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.battleDrawPlayed = [{
      cardId: ACT_OF_FAITH,
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    state.players.player_2.zones.deck = [FIRST, SECOND, THIRD];
    setRecentResult(state, battle);

    expect(queueActOfFaithBattleEffects(state, battle)).toBe(1);
    expect(openNextActOfFaithChoice(state)).toBe(true);
    expect(state.players.player_2.zones.deck).toEqual([THIRD]);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'act_of_faith',
      source: 'battle',
      battleId: battle.id,
      revealedCards: [FIRST, SECOND],
    });

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_graveyard',
      cardId: FIRST,
    }).state;

    expect(state.players.player_2.zones.graveyard).toEqual([FIRST]);
    expect(state.players.player_2.zones.discard).toEqual([SECOND]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_1.inquisition?.convictionBattleGainTurn).toBe(state.turn);
  });

  it('automatically resolves a sole Battle reveal and grants normal Conviction once', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: ACT_OF_FAITH,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.players.player_2.zones.deck = [FIRST];
    setRecentResult(state, battle);

    queueActOfFaithBattleEffects(state, battle);
    expect(openNextActOfFaithChoice(state)).toBe(false);

    expect(state.players.player_2.zones.deck).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toEqual([FIRST]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.pendingInquisitionChoice).toBeUndefined();
  });

  it('resolves stacked active Battle copies sequentially and ignores a canceled source copy', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: ACT_OF_FAITH,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.defender.battleDrawPlayed = [
      {
        cardId: ACT_OF_FAITH,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
      },
      {
        cardId: ACT_OF_FAITH,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: true,
      },
    ];
    state.players.player_2.zones.deck = [FIRST, SECOND, THIRD, FOURTH];
    setRecentResult(state, battle);

    expect(queueActOfFaithBattleEffects(state, battle)).toBe(2);
    openNextActOfFaithChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_graveyard',
      cardId: FIRST,
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'act_of_faith',
      source: 'battle',
      revealedCards: [THIRD, FOURTH],
    });
    expect(state.inquisitionActOfFaithQueue).toHaveLength(1);
    expect(state.players.player_2.zones.deck).toEqual([]);
  });

  it('preserves duplicate revealed copies when one is selected', () => {
    let state = game();
    state.players.player_1.zones.hand = [ACT_OF_FAITH];
    state.players.player_2.zones.deck = [FIRST, FIRST];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ACT_OF_FAITH,
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_graveyard',
      cardId: FIRST,
    }).state;

    expect(state.players.player_2.zones.graveyard).toEqual([FIRST]);
    expect(state.players.player_2.zones.discard).toEqual([FIRST]);
  });
});
