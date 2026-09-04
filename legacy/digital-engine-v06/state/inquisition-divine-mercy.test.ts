import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import {
  DIVINE_MERCY,
  openNextDivineMercyChoice,
  queueDivineMercyBattleEffects,
} from './inquisition-divine-mercy';
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
    id: 'inquisition-divine-mercy-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [DIVINE_MERCY, 'inquisition-penance'],
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
    id: 'divine-mercy-battle',
    stage: 'dice',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_2'),
    defender: participant('player_1'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Inquisition Divine Mercy', () => {
  it('plays as an Action, moves an opposing Graveyard card to Discard, and gains 2 Conviction', () => {
    let state = game();
    state.players.player_1.zones.hand = [DIVINE_MERCY];
    state.players.player_2.zones.graveyard = ['card-valor'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: DIVINE_MERCY,
      targets: [{ kind: 'card', owner: 'player_2', cardId: 'card-valor' }],
    }).state;

    expect(state.players.player_1.zones.discard).toContain(DIVINE_MERCY);
    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.players.player_2.zones.discard).toContain('card-valor');
    expect(state.players.player_1.resources?.conviction?.value).toBe(2);
  });

  it('caps the Action Conviction gain at 4', () => {
    let state = game();
    state.players.player_1.zones.hand = [DIVINE_MERCY];
    state.players.player_1.resources!.conviction!.value = 3;
    state.players.player_2.zones.graveyard = ['card-valor'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: DIVINE_MERCY,
      targets: [{ kind: 'card', owner: 'player_2', cardId: 'card-valor' }],
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(4);
  });

  it('validates the Action target before moving the source card', () => {
    const state = game();
    state.players.player_1.zones.hand = [DIVINE_MERCY];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: DIVINE_MERCY,
    })).toThrow(/requires one card/);
    expect(state.players.player_1.zones.hand).toEqual([DIVINE_MERCY]);
    expect(state.players.player_1.zones.discard).toEqual([]);
  });

  it('queues after reveal and adds +2 after moving the chosen Graveyard card to Discard', () => {
    let state = game();
    const battle = revealedBattle();
    battle.defender.battleDrawPlayed = [{
      cardId: DIVINE_MERCY,
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    state.phase = 'battle';
    state.battle = battle;
    state.players.player_2.zones.graveyard = ['card-attrition'];

    expect(queueDivineMercyBattleEffects(state)).toBe(1);
    expect(queueDivineMercyBattleEffects(state)).toBe(0);
    expect(openNextDivineMercyChoice(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'divine_mercy_battle',
      playerId: 'player_1',
      opponentId: 'player_2',
      graveyardOptions: ['card-attrition'],
    });
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: 'card-attrition',
    }).state;

    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.players.player_2.zones.discard).toContain('card-attrition');
    expect(state.battle?.defender.modifiers).toBe(2);
    expect(state.battle?.resolvedModifiers).toContainEqual(expect.objectContaining({
      playerId: 'player_1',
      source: DIVINE_MERCY,
      amount: 2,
    }));
  });

  it('resolves stacked active copies sequentially and ignores canceled copies', () => {
    let state = game();
    const battle = revealedBattle();
    battle.defender.handCommit = {
      cardId: DIVINE_MERCY,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.defender.battleDrawPlayed = [
      {
        cardId: DIVINE_MERCY,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
      },
      {
        cardId: DIVINE_MERCY,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: true,
      },
    ];
    state.phase = 'battle';
    state.battle = battle;
    state.players.player_2.zones.graveyard = ['card-valor', 'card-attrition'];

    expect(queueDivineMercyBattleEffects(state)).toBe(2);
    openNextDivineMercyChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: 'card-valor',
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'divine_mercy_battle',
      playerId: 'player_1',
      graveyardOptions: ['card-attrition'],
    });
    expect(state.inquisitionDivineMercyQueue).toHaveLength(1);
    expect(state.battle?.defender.modifiers).toBe(2);
  });

  it('skips a Battle copy cleanly when the opposing Graveyard is empty', () => {
    const state = game();
    const battle = revealedBattle();
    battle.defender.handCommit = {
      cardId: DIVINE_MERCY,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.phase = 'battle';
    state.battle = battle;

    expect(queueDivineMercyBattleEffects(state)).toBe(1);
    expect(openNextDivineMercyChoice(state)).toBe(false);
    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.inquisitionDivineMercyQueue).toBeUndefined();
  });
});
