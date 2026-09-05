import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, BattleState, GameState, PlayerID } from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import {
  applyAccursedWagerAction,
  bindAccursedWagerToNewBattle,
  expireAccursedWagerAtEndTurn,
  openAccursedWagerAftermathIfReady,
  queueAccursedWagerAfterBattle,
  resolveAccursedWagerChoice,
} from './mystics-accursed-wager';
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

function played(cardId: string, owner: PlayerID, origin: 'hand' | 'battle_draw'): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false };
}

function game(mysticLeader = 'Spirit Walker', opponentFaction = 'military'): GameState {
  const state = initializeGame({
    id: 'mystics-accursed-wager-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName: mysticLeader,
        deck: ['mystics-accursed-wager', 'card-valor'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: opponentFaction,
        leaderName: opponentFaction === 'mystics' ? 'Alchemist' : 'General',
        deck: ['card-fortifications', 'card-valor'],
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

function battle(attacker: PlayerID = 'player_1', defender: PlayerID = 'player_2'): BattleState {
  return {
    id: 'wager-battle',
    stage: 'resolution',
    location: 'space-4',
    attackerOrigin: 'space-3',
    attacker: participant(attacker),
    defender: participant(defender),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function recordResult(state: GameState, prior: BattleState, winner: PlayerID, loser: PlayerID): void {
  state.battle = undefined;
  state.recentBattleResult = {
    battleId: prior.id,
    turn: state.turn,
    winner,
    loser,
    attacker: prior.attacker.playerId,
    defender: prior.defender.playerId,
    location: prior.location,
    attackerOrigin: prior.attackerOrigin,
    retreatDirection: loser === prior.attacker.playerId ? -1 : 1,
  };
  state.phase = 'action_after_movement';
}

describe('Accursed Wager Action form', () => {
  it('arms through normal Action play and binds only when its owner initiates the next battle', () => {
    let state = game();
    state.players.player_1.zones.hand = ['mystics-accursed-wager'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-accursed-wager',
    }).state;

    expect(state.players.player_1.mystics).toMatchObject({
      accursedWagerArmedTurn: state.turn,
      accursedWagerArmedCount: 1,
    });
    expect(state.players.player_1.zones.discard).toContain('mystics-accursed-wager');

    state.battle = battle();
    state.phase = 'battle';
    bindAccursedWagerToNewBattle(state);

    expect(state.players.player_1.mystics).toMatchObject({
      accursedWagerBattleId: 'wager-battle',
      accursedWagerBattleCount: 1,
    });
    expect(state.players.player_1.mystics?.accursedWagerArmedCount).toBeUndefined();
  });

  it('expires unused copies at the end of the turn', () => {
    const state = game();
    applyAccursedWagerAction(state, 'player_1', 'mystics-accursed-wager');
    applyAccursedWagerAction(state, 'player_1', 'mystics-accursed-wager');

    expireAccursedWagerAtEndTurn(state, 'player_1');

    expect(state.players.player_1.mystics?.accursedWagerArmedTurn).toBeUndefined();
    expect(state.players.player_1.mystics?.accursedWagerArmedCount).toBeUndefined();
  });
});

describe('Accursed Wager aftermath', () => {
  it('combines armed Action copies and active Battle copies', () => {
    const state = game();
    const prior = battle();
    prior.attacker.handCommit = played('mystics-accursed-wager', 'player_1', 'hand');
    prior.attacker.battleDrawPlayed = [played('mystics-accursed-wager', 'player_1', 'battle_draw')];
    state.players.player_1.mystics!.accursedWagerBattleId = prior.id;
    state.players.player_1.mystics!.accursedWagerBattleCount = 2;
    state.players.player_2.zones.hand = ['loss-a', 'loss-b', 'loss-c', 'loss-d'];
    recordResult(state, prior, 'player_1', 'player_2');

    expect(queueAccursedWagerAfterBattle(state, prior)).toBe(true);
    expect(state.pendingMysticsAftermath).toMatchObject({
      kind: 'accursed_wager',
      battleId: prior.id,
      loserId: 'player_2',
      remaining: 4,
    });
    expect(openAccursedWagerAftermathIfReady(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'accursed_wager_after_battle',
      playerId: 'player_2',
      remaining: 4,
    });
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'resolve_mystics_choice',
      playerId: 'player_2',
      choice: 'select',
      cardId: 'loss-a',
    });
  });

  it('resolves stacked losses sequentially and stops when the hand is empty', () => {
    const state = game();
    const prior = battle();
    prior.attacker.handCommit = played('mystics-accursed-wager', 'player_1', 'hand');
    prior.attacker.battleDrawPlayed = [played('mystics-accursed-wager', 'player_1', 'battle_draw')];
    state.players.player_2.zones.hand = ['loss-a', 'loss-b'];
    recordResult(state, prior, 'player_1', 'player_2');
    queueAccursedWagerAfterBattle(state, prior);
    openAccursedWagerAftermathIfReady(state);

    resolveAccursedWagerChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_2',
      choice: 'select',
      cardId: 'loss-a',
    });
    expect(state.pendingMysticsAftermath?.remaining).toBe(1);
    openAccursedWagerAftermathIfReady(state);

    resolveAccursedWagerChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_2',
      choice: 'select',
      cardId: 'loss-b',
    });

    expect(state.players.player_2.zones.graveyard).toEqual(expect.arrayContaining(['loss-a', 'loss-b']));
    expect(state.pendingMysticsChoice).toBeUndefined();
    expect(state.pendingMysticsAftermath).toBeUndefined();
  });

  it('waits behind an existing aftermath window', () => {
    const state = game();
    const prior = battle();
    prior.attacker.handCommit = played('mystics-accursed-wager', 'player_1', 'hand');
    state.players.player_2.zones.hand = ['loss-a'];
    recordResult(state, prior, 'player_1', 'player_2');
    queueAccursedWagerAfterBattle(state, prior);
    state.pendingLeaderAbilityWindow = { playerId: 'player_1', timing: 'after_battle', battleId: prior.id };

    expect(openAccursedWagerAftermathIfReady(state)).toBe(false);
    expect(state.pendingMysticsAftermath).toBeDefined();
    state.pendingLeaderAbilityWindow = undefined;
    expect(openAccursedWagerAftermathIfReady(state)).toBe(true);
  });

  it('does nothing when the losing player has no card in hand', () => {
    const state = game();
    const prior = battle();
    prior.attacker.handCommit = played('mystics-accursed-wager', 'player_1', 'hand');
    state.players.player_2.zones.hand = [];
    recordResult(state, prior, 'player_1', 'player_2');
    queueAccursedWagerAfterBattle(state, prior);

    expect(openAccursedWagerAftermathIfReady(state)).toBe(false);
    expect(state.pendingMysticsAftermath).toBeUndefined();
  });

  it('ignores canceled Battle copies', () => {
    const state = game();
    const prior = battle();
    prior.attacker.handCommit = { ...played('mystics-accursed-wager', 'player_1', 'hand'), canceled: true };
    state.players.player_2.zones.hand = ['loss-a'];
    recordResult(state, prior, 'player_1', 'player_2');

    expect(queueAccursedWagerAfterBattle(state, prior)).toBe(false);
    expect(state.pendingMysticsAftermath).toBeUndefined();
  });

  it('triggers Materia Prima when the active Alchemist loses on their own turn', () => {
    const state = game('Alchemist');
    const prior = battle('player_1', 'player_2');
    prior.defender.handCommit = played('mystics-accursed-wager', 'player_2', 'hand');
    state.players.player_1.zones.hand = ['loss-a'];
    state.players.player_1.zones.deck = ['card-valor'];
    recordResult(state, prior, 'player_2', 'player_1');
    queueAccursedWagerAfterBattle(state, prior);
    openAccursedWagerAftermathIfReady(state);

    resolveAccursedWagerChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'loss-a',
    });

    expect(state.players.player_1.zones.graveyard).toContain('loss-a');
    expect(state.players.player_1.zones.hand).toContain('card-valor');
    expect(state.players.player_1.mystics?.materiaPrimaUsedTurn).toBe(state.turn);
  });
});
