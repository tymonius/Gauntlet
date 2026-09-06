import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import {
  EXCOMMUNICATION,
  legalExcommunicationSelections,
  openNextExcommunicationChoice,
  queueExcommunicationBattleEffects,
} from './inquisition-excommunication';
import { initializeGame } from './initialize';

const ONE = 'neutral-contingency-plan';
const OTHER_ONE = 'neutral-counterintelligence';
const TWO = 'inquisition-divine-mercy';
const THREE = EXCOMMUNICATION;

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
    id: 'inquisition-excommunication-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [EXCOMMUNICATION, 'inquisition-divine-mercy', 'inquisition-penance'],
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
    id: 'excommunication-battle',
    stage: 'resolution',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Inquisition Excommunication', () => {
  it('plays as an Action and moves cards with combined value up to 5 to the Graveyard', () => {
    let state = game();
    state.players.player_1.zones.hand = [EXCOMMUNICATION];
    state.players.player_2.zones.discard = [THREE, TWO, ONE];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: EXCOMMUNICATION,
      targets: [
        { kind: 'card', owner: 'player_2', cardId: THREE },
        { kind: 'card', owner: 'player_2', cardId: TWO },
      ],
    }).state;

    expect(state.players.player_1.zones.discard).toContain(EXCOMMUNICATION);
    expect(state.players.player_2.zones.discard).toEqual([ONE]);
    expect(state.players.player_2.zones.graveyard).toEqual([THREE, TWO]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
  });

  it('rejects an Action selection above value 5 before moving the source card', () => {
    const state = game();
    state.players.player_1.zones.hand = [EXCOMMUNICATION];
    state.players.player_2.zones.discard = [THREE, TWO, ONE];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: EXCOMMUNICATION,
      targets: [
        { kind: 'card', owner: 'player_2', cardId: THREE },
        { kind: 'card', owner: 'player_2', cardId: TWO },
        { kind: 'card', owner: 'player_2', cardId: ONE },
      ],
    })).toThrow(/combined deckbuilding value/);

    expect(state.players.player_1.zones.hand).toEqual([EXCOMMUNICATION]);
    expect(state.players.player_1.zones.discard).toEqual([]);
    expect(state.players.player_2.zones.discard).toEqual([THREE, TWO, ONE]);
  });

  it('preserves duplicate copies in legal selections and moves both selected copies', () => {
    let state = game();
    state.players.player_1.zones.hand = [EXCOMMUNICATION];
    state.players.player_2.zones.discard = [ONE, ONE];

    expect(legalExcommunicationSelections(state.players.player_2.zones.discard, 5)).toContainEqual([ONE, ONE]);

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: EXCOMMUNICATION,
      targets: [
        { kind: 'card', owner: 'player_2', cardId: ONE },
        { kind: 'card', owner: 'player_2', cardId: ONE },
      ],
    }).state;

    expect(state.players.player_2.zones.discard).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toEqual([ONE, ONE]);
  });

  it('queues after battle cleanup, moves up to value 3, and gains normal after-battle Conviction', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.battleDrawPlayed = [{
      cardId: EXCOMMUNICATION,
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    state.players.player_2.zones.discard = [TWO, ONE, THREE];
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

    expect(queueExcommunicationBattleEffects(state, battle)).toBe(1);
    expect(openNextExcommunicationChoice(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'excommunication_battle',
      playerId: 'player_1',
      opponentId: 'player_2',
      valueLimit: 3,
    });

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_cards',
      cardId: EXCOMMUNICATION,
      cardIds: [TWO, ONE],
    }).state;

    expect(state.players.player_2.zones.discard).toEqual([THREE]);
    expect(state.players.player_2.zones.graveyard).toEqual([TWO, ONE]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_1.inquisition?.convictionBattleGainTurn).toBe(state.turn);
  });

  it('resolves stacked active Battle copies sequentially and ignores canceled copies', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: EXCOMMUNICATION,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.defender.battleDrawPlayed = [
      {
        cardId: EXCOMMUNICATION,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
      },
      {
        cardId: EXCOMMUNICATION,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: true,
      },
    ];
    state.players.player_2.zones.discard = [TWO, ONE, OTHER_ONE];
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

    expect(queueExcommunicationBattleEffects(state, battle)).toBe(2);
    openNextExcommunicationChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_cards',
      cardId: EXCOMMUNICATION,
      cardIds: [TWO],
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'excommunication_battle',
      playerId: 'player_1',
      discardOptions: [ONE, OTHER_ONE],
    });
    expect(state.inquisitionExcommunicationQueue).toHaveLength(1);
  });

  it('does not gain a second normal after-battle Conviction in the same turn', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: EXCOMMUNICATION,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.players.player_1.resources!.conviction!.value = 1;
    state.players.player_1.inquisition!.convictionBattleGainTurn = state.turn;
    state.players.player_2.zones.discard = [ONE];
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
    queueExcommunicationBattleEffects(state, battle);
    openNextExcommunicationChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_cards',
      cardId: EXCOMMUNICATION,
      cardIds: [ONE],
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
  });
});
