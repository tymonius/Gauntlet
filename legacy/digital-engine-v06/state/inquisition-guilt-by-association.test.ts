import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import {
  GUILT_BY_ASSOCIATION,
  openNextGuiltByAssociationChoice,
  queueGuiltByAssociationBattleEffects,
} from './inquisition-guilt-by-association';
import { initializeGame } from './initialize';

const MATCHING = 'neutral-contingency-plan';
const OTHER = 'neutral-counterintelligence';
const THIRD = 'inquisition-divine-mercy';

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
    id: 'inquisition-guilt-by-association-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [GUILT_BY_ASSOCIATION, 'inquisition-excommunication', 'inquisition-penance'],
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
    id: 'guilt-by-association-battle',
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

describe('Inquisition Guilt by Association', () => {
  it('plays as an Action and moves every matching title from Discard to Graveyard', () => {
    let state = game();
    state.players.player_1.zones.hand = [GUILT_BY_ASSOCIATION];
    state.players.player_2.zones.discard = [MATCHING, OTHER, MATCHING];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: GUILT_BY_ASSOCIATION,
      targets: [{ kind: 'card', owner: 'player_2', cardId: MATCHING }],
    }).state;

    expect(state.players.player_1.zones.discard).toContain(GUILT_BY_ASSOCIATION);
    expect(state.players.player_2.zones.discard).toEqual([OTHER]);
    expect(state.players.player_2.zones.graveyard).toEqual([MATCHING, MATCHING]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
  });

  it('validates the Action target before moving the source card', () => {
    const state = game();
    state.players.player_1.zones.hand = [GUILT_BY_ASSOCIATION];
    state.players.player_2.zones.discard = [MATCHING];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: GUILT_BY_ASSOCIATION,
    })).toThrow(/requires one card/);

    expect(state.players.player_1.zones.hand).toEqual([GUILT_BY_ASSOCIATION]);
    expect(state.players.player_1.zones.discard).toEqual([]);
    expect(state.players.player_2.zones.discard).toEqual([MATCHING]);
  });

  it('offers titles from physical opposing cards used in battle, including canceled cards but excluding virtual effects', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.defender.battleDrawPlayed = [{
      cardId: GUILT_BY_ASSOCIATION,
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    battle.attacker.handCommit = {
      cardId: MATCHING,
      owner: 'player_2',
      origin: 'hand',
      faceDown: false,
      canceled: true,
    };
    battle.attacker.battleDrawPlayed = [
      {
        cardId: OTHER,
        owner: 'player_2',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
        negated: true,
      },
      {
        cardId: THIRD,
        owner: 'player_2',
        origin: 'replayed',
        faceDown: false,
        canceled: false,
        virtual: true,
      },
    ];
    setRecentResult(state, battle);

    expect(queueGuiltByAssociationBattleEffects(state, battle)).toBe(1);
    expect(openNextGuiltByAssociationChoice(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'guilt_by_association_battle',
      playerId: 'player_1',
      opponentId: 'player_2',
      usedCardOptions: [MATCHING, OTHER],
    });
  });

  it('moves every matching discard copy after battle and gains normal Conviction once', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: GUILT_BY_ASSOCIATION,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.attacker.handCommit = {
      cardId: MATCHING,
      owner: 'player_2',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.players.player_2.zones.discard = [MATCHING, OTHER, MATCHING];
    setRecentResult(state, battle);
    queueGuiltByAssociationBattleEffects(state, battle);
    openNextGuiltByAssociationChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_title',
      cardId: MATCHING,
    }).state;

    expect(state.players.player_2.zones.discard).toEqual([OTHER]);
    expect(state.players.player_2.zones.graveyard).toEqual([MATCHING, MATCHING]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_1.inquisition?.convictionBattleGainTurn).toBe(state.turn);
  });

  it('resolves stacked active copies sequentially and ignores a canceled source copy', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: GUILT_BY_ASSOCIATION,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.defender.battleDrawPlayed = [
      {
        cardId: GUILT_BY_ASSOCIATION,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
      },
      {
        cardId: GUILT_BY_ASSOCIATION,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: true,
      },
    ];
    battle.attacker.handCommit = {
      cardId: MATCHING,
      owner: 'player_2',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.attacker.battleDrawPlayed = [{
      cardId: OTHER,
      owner: 'player_2',
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
    }];
    state.players.player_2.zones.discard = [MATCHING, OTHER];
    setRecentResult(state, battle);

    expect(queueGuiltByAssociationBattleEffects(state, battle)).toBe(2);
    openNextGuiltByAssociationChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_title',
      cardId: MATCHING,
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'guilt_by_association_battle',
      playerId: 'player_1',
      usedCardOptions: [MATCHING, OTHER],
    });
    expect(state.inquisitionGuiltByAssociationQueue).toHaveLength(1);
  });

  it('allows a used title with no remaining discard match and grants no Conviction', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.defender.handCommit = {
      cardId: GUILT_BY_ASSOCIATION,
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    battle.attacker.handCommit = {
      cardId: MATCHING,
      owner: 'player_2',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    state.players.player_2.zones.discard = [OTHER];
    setRecentResult(state, battle);
    queueGuiltByAssociationBattleEffects(state, battle);
    openNextGuiltByAssociationChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_title',
      cardId: MATCHING,
    }).state;

    expect(state.players.player_2.zones.discard).toEqual([OTHER]);
    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
  });
});
