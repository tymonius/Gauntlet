import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { buildPendingInquisitionOptions } from '../dev/inquisition-options';
import { applyGameAction } from './apply-inquisition';
import { awardBlasphemyForRevealedBattleCards } from './inquisition-core';
import {
  HERESY,
  heresyGraveyardOptions,
  openNextHeresyChoice,
} from './inquisition-heresy';
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

function played(extra: Partial<BattlePlayedCard> = {}): BattlePlayedCard {
  return {
    cardId: HERESY,
    owner: 'player_1',
    origin: 'hand',
    faceDown: false,
    canceled: false,
    ...extra,
  };
}

function game(opponentFaction = 'military'): GameState {
  const state = initializeGame({
    id: `inquisition-heresy-${opponentFaction}`,
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [HERESY, HERESY, 'inquisition-penance'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: opponentFaction,
        leaderName: opponentFaction === 'inquisition' ? 'Witch Hunter' : 'General',
        deck: ['card-valor', 'card-fortifications', 'card-attrition'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  return state;
}

function openBattle(state: GameState, attacker: PlayerID = 'player_1'): void {
  const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
  const defender: PlayerID = attacker === 'player_1' ? 'player_2' : 'player_1';
  state.phase = 'battle';
  state.battle = {
    id: 'heresy-battle',
    stage: 'dice',
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant(attacker),
    defender: participant(defender),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function setConviction(state: GameState, playerId: PlayerID, amount: number): void {
  state.players[playerId].resources!.conviction!.value = amount;
}

describe('Inquisition Heresy', () => {
  it('offers only supported Battle effects that can resolve for the current participant', () => {
    const state = game();
    openBattle(state);
    state.players.player_2.zones.graveyard = [
      'card-valor',
      'card-fortifications',
      'card-attrition',
      'inquisition-hellfire',
    ];

    expect(heresyGraveyardOptions(state, 'player_1')).toEqual([
      'card-valor',
      'card-attrition',
    ]);
  });

  it('opens a private optional choice only with four Conviction and a legal opposing Graveyard effect', () => {
    const state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played();
    state.players.player_2.zones.graveyard = ['card-valor', 'inquisition-hellfire'];
    setConviction(state, 'player_1', 4);

    expect(openNextHeresyChoice(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'heresy_replay',
      playerId: 'player_1',
      opponentId: 'player_2',
      graveyardOptions: ['card-valor'],
      options: ['pass', 'replay'],
    });
    expect(buildPendingInquisitionOptions(state, 'player_1')).toHaveLength(2);
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);
  });

  it('spends four Conviction, leaves the opposing card in its Graveyard, and resolves a virtual replay', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played();
    state.players.player_2.zones.graveyard = ['card-valor'];
    setConviction(state, 'player_1', 4);

    openNextHeresyChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'replay',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
    expect(state.players.player_2.zones.graveyard).toEqual(['card-valor']);
    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'card-valor',
      owner: 'player_1',
      origin: 'replayed',
      virtual: true,
    }));

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    expect(state.battle?.attacker.modifiers).toBe(2);
  });

  it('may pass without spending Conviction or creating a replay', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played();
    state.players.player_2.zones.graveyard = ['card-valor'];
    setConviction(state, 'player_1', 4);

    openNextHeresyChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'pass',
      cardId: HERESY,
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(4);
    expect(state.battle?.attacker.battleDrawPlayed).toEqual([]);
    expect(state.pendingInquisitionChoice).toBeUndefined();
  });

  it('skips canceled, negated, virtual, underfunded, and targetless sources', () => {
    for (const extra of [
      { canceled: true },
      { negated: true },
      { virtual: true },
    ] satisfies Array<Partial<BattlePlayedCard>>) {
      const state = game();
      openBattle(state);
      state.battle!.attacker.handCommit = played(extra);
      state.players.player_2.zones.graveyard = ['card-valor'];
      setConviction(state, 'player_1', 4);
      expect(openNextHeresyChoice(state)).toBe(false);
    }

    const underfunded = game();
    openBattle(underfunded);
    underfunded.battle!.attacker.handCommit = played();
    underfunded.players.player_2.zones.graveyard = ['card-valor'];
    setConviction(underfunded, 'player_1', 3);
    expect(openNextHeresyChoice(underfunded)).toBe(false);

    const targetless = game();
    openBattle(targetless);
    targetless.battle!.attacker.handCommit = played();
    targetless.players.player_2.zones.graveyard = ['inquisition-hellfire'];
    setConviction(targetless, 'player_1', 4);
    expect(openNextHeresyChoice(targetless)).toBe(false);
  });

  it('processes stacked active copies sequentially but cannot fund a second replay after spending four', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played();
    state.battle!.attacker.battleDrawPlayed = [played({ origin: 'battle_draw' })];
    state.players.player_2.zones.graveyard = ['card-valor'];
    setConviction(state, 'player_1', 4);

    openNextHeresyChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'replay',
      cardId: 'card-valor',
    }).state;

    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.battle?.attacker.handCommit?.postRevealEffectResolved).toBe(true);
    expect(state.battle?.attacker.battleDrawPlayed[0].postRevealEffectResolved).toBe(true);
    expect(state.battle?.attacker.battleDrawPlayed.filter((card) => card.virtual)).toHaveLength(1);
  });

  it('counts Heresy as Arcane for opposing Blasphemy', () => {
    const state = game('inquisition');
    openBattle(state, 'player_2');
    state.battle!.attacker.handCommit = {
      cardId: HERESY,
      owner: 'player_2',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };

    expect(awardBlasphemyForRevealedBattleCards(state)).toBe(1);
    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
  });
});
