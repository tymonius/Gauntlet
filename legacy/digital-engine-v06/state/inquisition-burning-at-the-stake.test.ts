import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import {
  BURNING_AT_THE_STAKE,
  highestValueHandOptions,
  openNextBurningAtTheStakeChoice,
  queueBurningAtTheStakeBattleEffects,
} from './inquisition-burning-at-the-stake';
import { initializeGame } from './initialize';
import { toPrivateGameView, toPublicGameView } from './views';

const LOW = 'neutral-contingency-plan';
const TIED_HIGH_A = 'inquisition-divine-mercy';
const TIED_HIGH_B = 'inquisition-penance';
const ARCANE_HIGH = 'mystics-necromancy';

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
    id: 'inquisition-burning-at-the-stake-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [BURNING_AT_THE_STAKE, 'inquisition-act-of-faith'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'mystics',
        leaderName: 'Spirit Walker',
        deck: [LOW, TIED_HIGH_A, TIED_HIGH_B, ARCANE_HIGH],
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
    id: 'burning-at-the-stake-battle',
    stage: 'resolution',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function setRecentResult(state: GameState, battle: BattleState, loser: PlayerID = 'player_2'): void {
  state.recentBattleResult = {
    battleId: battle.id,
    turn: state.turn,
    winner: loser === 'player_2' ? 'player_1' : 'player_2',
    loser,
    attacker: 'player_2',
    defender: 'player_1',
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    retreatDirection: 1,
  };
}

describe('Inquisition Burning at the Stake', () => {
  it('automatically condemns the unique highest-value card as an Action', () => {
    let state = game();
    state.players.player_1.zones.hand = [BURNING_AT_THE_STAKE];
    state.players.player_2.zones.hand = [LOW, TIED_HIGH_A];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: BURNING_AT_THE_STAKE,
    }).state;

    expect(state.players.player_1.zones.discard).toContain(BURNING_AT_THE_STAKE);
    expect(state.players.player_2.zones.hand).toEqual([LOW]);
    expect(state.players.player_2.zones.graveyard).toEqual([TIED_HIGH_A]);
    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
  });

  it('opens a private choice only when different highest-value cards are tied', () => {
    let state = game();
    state.players.player_1.zones.hand = [BURNING_AT_THE_STAKE];
    state.players.player_2.zones.hand = [LOW, TIED_HIGH_A, TIED_HIGH_B];

    expect(highestValueHandOptions(state.players.player_2.zones.hand)).toEqual([TIED_HIGH_A, TIED_HIGH_B]);

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: BURNING_AT_THE_STAKE,
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'burning_at_the_stake',
      playerId: 'player_1',
      opponentId: 'player_2',
      source: 'action',
      revealedHand: [LOW, TIED_HIGH_A, TIED_HIGH_B],
      highestValueOptions: [TIED_HIGH_A, TIED_HIGH_B],
    });
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_highest',
      cardId: TIED_HIGH_B,
    }).state;

    expect(state.players.player_2.zones.hand).toEqual([LOW, TIED_HIGH_A]);
    expect(state.players.player_2.zones.graveyard).toEqual([TIED_HIGH_B]);
  });

  it('gains one additional Conviction when the condemned Action card is Arcane', () => {
    let state = game();
    state.players.player_1.zones.hand = [BURNING_AT_THE_STAKE];
    state.players.player_2.zones.hand = [LOW, ARCANE_HIGH];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: BURNING_AT_THE_STAKE,
    }).state;

    expect(state.players.player_2.zones.graveyard).toEqual([ARCANE_HIGH]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
  });

  it('queues its Battle effect only when the opponent lost', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: BURNING_AT_THE_STAKE,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.players.player_2.zones.hand = [LOW];

    setRecentResult(state, battle, 'player_1');
    expect(queueBurningAtTheStakeBattleEffects(state, battle)).toBe(0);

    setRecentResult(state, battle, 'player_2');
    expect(queueBurningAtTheStakeBattleEffects(state, battle)).toBe(1);
  });

  it('awards normal after-battle Conviction plus additional Arcane Conviction', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.defender.battleDrawPlayed = [{
      cardId: BURNING_AT_THE_STAKE,
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    state.players.player_2.zones.hand = [LOW, ARCANE_HIGH];
    setRecentResult(state, battle);

    queueBurningAtTheStakeBattleEffects(state, battle);
    expect(openNextBurningAtTheStakeChoice(state)).toBe(false);

    expect(state.players.player_2.zones.hand).toEqual([LOW]);
    expect(state.players.player_2.zones.graveyard).toEqual([ARCANE_HIGH]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(2);
    expect(state.players.player_1.inquisition?.convictionBattleGainTurn).toBe(state.turn);
  });

  it('resolves stacked active Battle copies sequentially and ignores a canceled source copy', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: BURNING_AT_THE_STAKE,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.defender.battleDrawPlayed = [
      {
        cardId: BURNING_AT_THE_STAKE,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
      },
      {
        cardId: BURNING_AT_THE_STAKE,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: true,
      },
    ];
    state.players.player_2.zones.hand = [LOW, TIED_HIGH_A, TIED_HIGH_B];
    setRecentResult(state, battle);

    expect(queueBurningAtTheStakeBattleEffects(state, battle)).toBe(2);
    expect(openNextBurningAtTheStakeChoice(state)).toBe(true);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_highest',
      cardId: TIED_HIGH_A,
    }).state;

    expect(state.inquisitionBurningAtTheStakeQueue).toBeUndefined();
    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.players.player_2.zones.hand).toEqual([LOW]);
    expect(state.players.player_2.zones.graveyard).toEqual([TIED_HIGH_A, TIED_HIGH_B]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
  });

  it('does nothing when the revealed hand is empty', () => {
    let state = game();
    state.players.player_1.zones.hand = [BURNING_AT_THE_STAKE];
    state.players.player_2.zones.hand = [];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: BURNING_AT_THE_STAKE,
    }).state;

    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.players.player_2.zones.graveyard).toEqual([]);
  });
});
