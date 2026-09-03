import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import {
  battleHasUnresolvedConfessionPreReveal,
  CONFESSION,
  confessionLegalHandCommitCards,
  openNextConfessionPreRevealWindow,
} from './inquisition-confession';
import { initializeGame } from './initialize';
import { toPrivateGameView, toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: false,
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
    id: 'inquisition-confession-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [CONFESSION, 'inquisition-penance', 'card-valor'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor', 'card-fortifications', 'diplomats-safe-conduct'],
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

function battle(stage: BattleState['stage'] = 'hand_commit'): BattleState {
  return {
    id: 'confession-battle',
    stage,
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Inquisition Confession', () => {
  it('inspects the opposing hand and opens a private choice among Battle cards', () => {
    let state = game();
    state.players.player_1.zones.hand = [CONFESSION];
    state.players.player_2.zones.hand = ['card-valor', 'card-fortifications', 'diplomats-safe-conduct'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONFESSION,
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'confession_action',
      playerId: 'player_1',
      opponentId: 'player_2',
      handOptions: ['card-valor', 'card-fortifications'],
    });
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: 'card-valor',
    }).state;

    expect(state.inquisitionConfessionConstraint).toEqual({
      inquisitorId: 'player_1',
      opponentId: 'player_2',
      cardId: 'card-valor',
      expiresTurn: state.turn,
    });
  });

  it('requires the chosen card if the opponent commits from hand, but still permits passing', () => {
    let state = game();
    state.phase = 'battle';
    state.battle = battle();
    state.priorityPlayer = 'player_2';
    state.players.player_2.zones.hand = ['card-valor', 'card-fortifications'];
    state.inquisitionConfessionConstraint = {
      inquisitorId: 'player_1',
      opponentId: 'player_2',
      cardId: 'card-valor',
      expiresTurn: state.turn,
    };

    expect(confessionLegalHandCommitCards(state, 'player_2', state.players.player_2.zones.hand))
      .toEqual(['card-valor']);
    expect(() => applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_2',
      cardId: 'card-fortifications',
    })).toThrow(/Confession requires card-valor/);

    state = applyGameAction(state, {
      type: 'pass_battle_hand_commit',
      playerId: 'player_2',
    }).state;
    expect(state.battle?.defender.passedHandCommit).toBe(true);
  });

  it('does not force the chosen card after it leaves the opponent hand', () => {
    let state = game();
    state.phase = 'battle';
    state.battle = battle();
    state.priorityPlayer = 'player_2';
    state.players.player_2.zones.hand = ['card-fortifications'];
    state.inquisitionConfessionConstraint = {
      inquisitorId: 'player_1',
      opponentId: 'player_2',
      cardId: 'card-valor',
      expiresTurn: state.turn,
    };

    state = applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_2',
      cardId: 'card-fortifications',
    }).state;
    expect(state.battle?.defender.handCommit?.cardId).toBe('card-fortifications');
  });

  it('clears the Action constraint when the turn ends', () => {
    let state = game();
    state.phase = 'cleanup';
    state.inquisitionConfessionConstraint = {
      inquisitorId: 'player_1',
      opponentId: 'player_2',
      cardId: 'card-valor',
      expiresTurn: state.turn,
    };

    state = applyGameAction(state, {
      type: 'end_turn',
      playerId: 'player_1',
    }).state;
    expect(state.inquisitionConfessionConstraint).toBeUndefined();
  });

  it('defers normal reveal, reveals the opponent hand commitment, and replaces its own commitment face up', () => {
    let state = game();
    state.phase = 'battle';
    state.battle = battle('normal_reveal');
    state.battle.attacker.handCommit = {
      cardId: 'inquisition-penance',
      owner: 'player_1',
      origin: 'hand',
      faceDown: true,
      canceled: false,
    };
    state.battle.attacker.battleDrawPlayed = [{
      cardId: CONFESSION,
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: true,
      canceled: false,
    }];
    state.battle.defender.handCommit = {
      cardId: 'card-fortifications',
      owner: 'player_2',
      origin: 'hand',
      faceDown: true,
      canceled: false,
    };
    state.players.player_1.zones.hand = ['card-valor'];
    state.priorityPlayer = 'player_1';

    expect(battleHasUnresolvedConfessionPreReveal(state)).toBe(true);
    expect(openNextConfessionPreRevealWindow(state)).toBe(true);
    expect(state.battle.defender.handCommit.faceDown).toBe(false);
    expect(state.battle.attacker.battleDrawPlayed[0].faceDown).toBe(false);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'confession_battle',
      originalCommitCardId: 'inquisition-penance',
      replacementOptions: ['card-valor'],
    });

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'replace',
      cardId: 'card-valor',
    }).state;

    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.handCommit).toMatchObject({
      cardId: 'card-valor',
      faceDown: false,
      origin: 'hand',
    });
    expect(state.players.player_1.zones.hand).toContain('inquisition-penance');
    expect(state.players.player_1.zones.hand).not.toContain('card-valor');
  });

  it('can return Confession itself when it was the hand commitment', () => {
    let state = game();
    state.phase = 'battle';
    state.battle = battle('normal_reveal');
    state.battle.attacker.handCommit = {
      cardId: CONFESSION,
      owner: 'player_1',
      origin: 'hand',
      faceDown: true,
      canceled: false,
    };
    state.battle.defender.handCommit = {
      cardId: 'card-valor',
      owner: 'player_2',
      origin: 'hand',
      faceDown: true,
      canceled: false,
    };
    state.players.player_1.zones.hand = ['inquisition-penance'];

    openNextConfessionPreRevealWindow(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'replace',
      cardId: 'inquisition-penance',
    }).state;

    expect(state.battle?.attacker.handCommit?.cardId).toBe('inquisition-penance');
    expect(state.players.player_1.zones.hand).toContain(CONFESSION);
  });

  it('ignores a canceled Confession source', () => {
    const state = game();
    state.phase = 'battle';
    state.battle = battle('normal_reveal');
    state.battle.attacker.battleDrawPlayed = [{
      cardId: CONFESSION,
      owner: 'player_1',
      origin: 'battle_draw',
      faceDown: true,
      canceled: true,
    }];

    expect(battleHasUnresolvedConfessionPreReveal(state)).toBe(false);
    expect(openNextConfessionPreRevealWindow(state)).toBe(false);
  });
});
