import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import {
  openNextAccusationChoice,
  queueAccusationBattleEffects,
} from './inquisition-accusation';
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

function game(): GameState {
  const state = initializeGame({
    id: 'inquisition-accusation-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: ['inquisition-accusation', 'inquisition-confession'],
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
    id: 'accusation-battle',
    stage: 'resolution',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Inquisition Accusation', () => {
  it('plays as an Action and lets the opponent put the chosen discard on top of their Draw Pile', () => {
    let state = game();
    state.players.player_1.zones.hand = ['inquisition-accusation'];
    state.players.player_2.zones.discard = ['card-valor'];
    state.players.player_2.zones.deck = ['card-attrition'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'inquisition-accusation',
      targets: [{ kind: 'card', owner: 'player_2', cardId: 'card-valor' }],
    }).state;

    expect(state.players.player_1.zones.discard).toContain('inquisition-accusation');
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'accusation_destination',
      playerId: 'player_2',
      inquisitorId: 'player_1',
      cardId: 'card-valor',
    });
    expect(state.priorityPlayer).toBe('player_2');
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'top_deck',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_2.zones.discard).toEqual([]);
    expect(state.players.player_2.zones.deck).toEqual(['card-valor', 'card-attrition']);
    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.priorityPlayer).toBe('player_1');
  });

  it('validates the Action target before moving the source card', () => {
    const state = game();
    state.players.player_1.zones.hand = ['inquisition-accusation'];
    state.players.player_2.zones.discard = ['card-valor'];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'inquisition-accusation',
    })).toThrow(/requires one card/);
    expect(state.players.player_1.zones.hand).toEqual(['inquisition-accusation']);
    expect(state.players.player_1.zones.discard).toEqual([]);
  });

  it('queues its Battle effect after cleanup and can target a newly discarded Battle Hand card', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.battleDrawPlayed = [{
      cardId: 'inquisition-accusation',
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    state.players.player_2.zones.discard = ['card-valor'];
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

    expect(queueAccusationBattleEffects(state, battle)).toBe(1);
    expect(openNextAccusationChoice(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'accusation_select_card',
      playerId: 'player_1',
      opponentId: 'player_2',
      discardOptions: ['card-valor'],
    });

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: 'card-valor',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'graveyard',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_2.zones.discard).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toContain('card-valor');
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_1.inquisition?.convictionBattleGainTurn).toBe(state.turn);
  });

  it('resolves stacked active Battle copies sequentially and ignores canceled copies', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: 'inquisition-accusation',
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.defender.battleDrawPlayed = [
      {
        cardId: 'inquisition-accusation',
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
      },
      {
        cardId: 'inquisition-accusation',
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: true,
      },
    ];
    state.players.player_2.zones.discard = ['card-valor', 'card-attrition'];
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

    expect(queueAccusationBattleEffects(state, battle)).toBe(2);
    openNextAccusationChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: 'card-valor',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'top_deck',
      cardId: 'card-valor',
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'accusation_select_card',
      playerId: 'player_1',
      discardOptions: ['card-attrition'],
    });
    expect(state.inquisitionAccusationQueue).toHaveLength(1);
  });

  it('does not gain a second normal after-battle Conviction in the same turn', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: 'inquisition-accusation',
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.players.player_1.resources!.conviction!.value = 1;
    state.players.player_1.inquisition!.convictionBattleGainTurn = state.turn;
    state.players.player_2.zones.discard = ['card-valor'];
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
    queueAccusationBattleEffects(state, battle);
    openNextAccusationChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: 'card-valor',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'graveyard',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
  });
});
