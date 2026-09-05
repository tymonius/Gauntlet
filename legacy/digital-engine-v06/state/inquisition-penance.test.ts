import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import {
  openNextPenanceChoice,
  PENANCE,
  queuePenanceBattleEffects,
} from './inquisition-penance';
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
    id: 'inquisition-penance-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [PENANCE, 'inquisition-accusation'],
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

function revealedBattle(): BattleState {
  return {
    id: 'penance-battle',
    stage: 'dice',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Inquisition Penance', () => {
  it('plays as an Action and lets the opponent sacrifice one hand card', () => {
    let state = game();
    state.players.player_1.zones.hand = [PENANCE];
    state.players.player_2.zones.hand = ['card-valor', 'card-fortifications'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: PENANCE,
    }).state;

    expect(state.players.player_1.zones.discard).toContain(PENANCE);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'penance_action',
      playerId: 'player_2',
      inquisitorId: 'player_1',
      handOptions: ['card-valor', 'card-fortifications'],
    });
    expect(state.priorityPlayer).toBe('player_2');
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'sacrifice',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_2.zones.hand).toEqual(['card-fortifications']);
    expect(state.players.player_2.zones.graveyard).toContain('card-valor');
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
    expect(state.pendingInquisitionChoice).toBeUndefined();
  });

  it('gains one Conviction when the opponent refuses Action Penance', () => {
    let state = game();
    state.players.player_1.zones.hand = [PENANCE];
    state.players.player_2.zones.hand = ['card-valor'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: PENANCE,
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'conviction',
      cardId: PENANCE,
    }).state;

    expect(state.players.player_2.zones.hand).toEqual(['card-valor']);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
  });

  it('queues after reveal and adds +1 when the opponent refuses Battle Penance', () => {
    let state = game();
    const battle = revealedBattle();
    battle.defender.battleDrawPlayed = [{
      cardId: PENANCE,
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    state.phase = 'battle';
    state.battle = battle;
    state.priorityPlayer = 'player_1';
    state.players.player_2.zones.hand = ['card-valor'];

    expect(queuePenanceBattleEffects(state)).toBe(1);
    expect(queuePenanceBattleEffects(state)).toBe(0);
    expect(openNextPenanceChoice(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'penance_battle',
      playerId: 'player_2',
      inquisitorId: 'player_1',
      battleId: battle.id,
    });

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'bonus',
      cardId: PENANCE,
    }).state;

    expect(state.battle?.defender.modifiers).toBe(1);
    expect(state.battle?.resolvedModifiers).toContainEqual(expect.objectContaining({
      playerId: 'player_1',
      source: PENANCE,
      amount: 1,
    }));
    expect(state.players.player_2.zones.hand).toEqual(['card-valor']);
  });

  it('lets the opponent sacrifice a card instead of granting the Battle bonus', () => {
    let state = game();
    const battle = revealedBattle();
    battle.defender.handCommit = {
      cardId: PENANCE,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.phase = 'battle';
    state.battle = battle;
    state.players.player_2.zones.hand = ['card-attrition'];
    queuePenanceBattleEffects(state);
    openNextPenanceChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'sacrifice',
      cardId: 'card-attrition',
    }).state;

    expect(state.players.player_2.zones.hand).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toContain('card-attrition');
    expect(state.battle?.defender.modifiers).toBe(0);
  });

  it('resolves stacked active copies sequentially and ignores canceled copies', () => {
    let state = game();
    const battle = revealedBattle();
    battle.defender.handCommit = {
      cardId: PENANCE,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.defender.battleDrawPlayed = [
      {
        cardId: PENANCE,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
      },
      {
        cardId: PENANCE,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: true,
      },
    ];
    state.phase = 'battle';
    state.battle = battle;
    state.players.player_2.zones.hand = [];

    expect(queuePenanceBattleEffects(state)).toBe(2);
    openNextPenanceChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      choice: 'bonus',
      cardId: PENANCE,
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'penance_battle',
      playerId: 'player_2',
    });
    expect(state.inquisitionPenanceQueue).toHaveLength(1);
    expect(state.battle?.defender.modifiers).toBe(1);
  });
});
