import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, BattleState, GameState, PlayerID } from '../types/v06';
import { buildPendingInquisitionOptions } from '../dev/inquisition-options';
import { applyGameAction } from './apply-inquisition';
import { initializeGame } from './initialize';
import {
  HELLFIRE,
  applyHellfireAfterBattle,
  openNextHellfireChoice,
} from './inquisition-hellfire';

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

function played(extra: Partial<BattlePlayedCard> = {}): BattlePlayedCard {
  return {
    cardId: HELLFIRE,
    owner: 'player_1',
    origin: 'hand',
    faceDown: false,
    canceled: false,
    ...extra,
  };
}

function game(): GameState {
  const state = initializeGame({
    id: 'inquisition-hellfire-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [HELLFIRE, HELLFIRE, 'inquisition-penance'],
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
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function openBattle(state: GameState, battleId = 'hellfire-battle'): BattleState {
  const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.battle = {
    id: battleId,
    stage: 'dice',
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return state.battle;
}

function setConviction(state: GameState, amount: number): void {
  state.players.player_1.resources!.conviction!.value = amount;
}

describe('Inquisition Hellfire', () => {
  it('spends chosen Conviction as an Action and moves only available top cards to the Graveyard', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.zones.hand = [HELLFIRE];
    state.players.player_2.zones.deck = ['card-valor', 'card-fortifications'];
    setConviction(state, 4);

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: HELLFIRE,
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'hellfire_action',
      playerId: 'player_1',
      maxSpend: 4,
    });
    expect(buildPendingInquisitionOptions(state, 'player_1')).toHaveLength(5);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'spend',
      cardId: HELLFIRE,
      amount: 3,
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_2.zones.deck).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toEqual(['card-valor', 'card-fortifications']);
    expect(state.players.player_1.zones.discard).toContain(HELLFIRE);
  });

  it('allows spending zero Conviction', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.zones.hand = [HELLFIRE];
    state.players.player_2.zones.deck = ['card-valor'];
    setConviction(state, 2);

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: HELLFIRE,
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'spend',
      cardId: HELLFIRE,
      amount: 0,
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(2);
    expect(state.players.player_2.zones.deck).toEqual(['card-valor']);
  });

  it('splits Battle spending between immediate bonus and delayed victory burn', () => {
    let state = game();
    const battle = openBattle(state);
    battle.attacker.handCommit = played();
    state.players.player_2.zones.deck = ['card-valor', 'card-fortifications', 'card-attrition'];
    setConviction(state, 4);

    expect(openNextHellfireChoice(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'hellfire_battle',
      maxSpend: 4,
    });
    expect(buildPendingInquisitionOptions(state, 'player_1')).toHaveLength(15);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'allocate',
      cardId: HELLFIRE,
      amount: 4,
      secondaryAmount: 2,
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.effectsResolved).toContain('hellfire_delayed:player_1:2');
  });

  it('applies delayed cards only if the Hellfire player wins', () => {
    const winning = game();
    const winningBattle = openBattle(winning, 'winning-hellfire');
    winningBattle.effectsResolved.push('hellfire_delayed:player_1:2');
    winning.players.player_2.zones.deck = ['card-valor', 'card-fortifications', 'card-attrition'];
    winning.recentBattleResult = {
      battleId: winningBattle.id,
      turn: winning.turn,
      winner: 'player_1',
      loser: 'player_2',
      attacker: 'player_1',
      defender: 'player_2',
      location: winningBattle.location,
      attackerOrigin: winningBattle.attackerOrigin,
      retreatDirection: 1,
    };

    expect(applyHellfireAfterBattle(winning, winningBattle)).toBe(2);
    expect(winning.players.player_2.zones.graveyard).toEqual(['card-valor', 'card-fortifications']);

    const losing = game();
    const losingBattle = openBattle(losing, 'losing-hellfire');
    losingBattle.effectsResolved.push('hellfire_delayed:player_1:2');
    losing.players.player_2.zones.deck = ['card-valor', 'card-fortifications'];
    losing.recentBattleResult = {
      battleId: losingBattle.id,
      turn: losing.turn,
      winner: 'player_2',
      loser: 'player_1',
      attacker: 'player_1',
      defender: 'player_2',
      location: losingBattle.location,
      attackerOrigin: losingBattle.attackerOrigin,
      retreatDirection: 1,
    };

    expect(applyHellfireAfterBattle(losing, losingBattle)).toBe(0);
    expect(losing.players.player_2.zones.graveyard).toEqual([]);
  });

  it('resolves active stacked copies sequentially and ignores canceled or negated copies', () => {
    let state = game();
    const battle = openBattle(state);
    battle.attacker.handCommit = played();
    battle.attacker.battleDrawPlayed = [
      played({ origin: 'battle_draw' }),
      played({ origin: 'battle_draw', canceled: true }),
      played({ origin: 'battle_draw', negated: true }),
    ];
    setConviction(state, 2);

    openNextHellfireChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'allocate',
      cardId: HELLFIRE,
      amount: 1,
      secondaryAmount: 0,
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({ kind: 'hellfire_battle', maxSpend: 1 });
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'allocate',
      cardId: HELLFIRE,
      amount: 1,
      secondaryAmount: 1,
    }).state;

    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.battle?.attacker.modifiers).toBe(1);
    expect(state.battle?.effectsResolved).toContain('hellfire_delayed:player_1:1');
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
  });
});
