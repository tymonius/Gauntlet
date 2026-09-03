import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import {
  BLACK_COVENANT,
  blackCovenantBattleBindings,
  openNextBlackCovenantBattleChoice,
  reconcileBlackCovenantBindings,
} from './mystics-black-covenant';
import { toPrivateGameView, toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: false,
    passedBattleDrawPlay: false,
    hasDrawnBattleCards: false,
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
    id: 'black-covenant-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName: 'Spirit Walker',
        deck: [BLACK_COVENANT, 'card-fortifications', 'card-valor', 'card-attrition'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor', 'card-fortifications'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function openBattle(state: GameState): void {
  const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.battle = {
    id: 'black-covenant-battle',
    stage: 'hand_commit',
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function covenantCard(owner: PlayerID, origin: 'hand' | 'battle_draw'): BattlePlayedCard {
  return {
    cardId: BLACK_COVENANT,
    owner,
    origin,
    faceDown: false,
    canceled: false,
  };
}

function bindFortifications(state: GameState): GameState {
  state.players.player_1.zones.hand = [BLACK_COVENANT, 'card-fortifications'];
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: BLACK_COVENANT,
    targets: [{ kind: 'card', owner: 'player_1', cardId: 'card-fortifications' }],
  }).state;
}

describe('Black Covenant', () => {
  it('binds a card outside normal zones and keeps its identity private', () => {
    const state = bindFortifications(game());
    const binding = state.players.player_1.mystics?.blackCovenantBindings?.[0];

    expect(state.players.player_1.zones.assetBank).toContain(BLACK_COVENANT);
    expect(state.players.player_1.zones.hand).not.toContain('card-fortifications');
    expect(binding).toMatchObject({ cardId: 'card-fortifications', boundTurn: 1 });
    expect(toPrivateGameView(state, 'player_1').players.player_1.mystics).toMatchObject({
      blackCovenantBindings: [expect.objectContaining({ cardId: 'card-fortifications' })],
    });
    expect(toPublicGameView(state).players.player_1.mystics).not.toHaveProperty('blackCovenantBindings');
  });

  it('releases a bound Action without consuming or reopening the normal Action Opportunity', () => {
    let state = bindFortifications(game());
    const bindingId = state.players.player_1.mystics!.blackCovenantBindings![0].id;
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(true);

    state = applyGameAction(state, {
      type: 'use_mystic_black_covenant_action',
      playerId: 'player_1',
      bindingId,
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual(['card-fortifications']);
    expect(state.players.player_1.zones.graveyard).toContain(BLACK_COVENANT);
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(true);
    expect(state.players.player_1.mystics?.blackCovenantBindings).toBeUndefined();
  });

  it('offers guided binding and release controls', () => {
    const initial = game();
    initial.players.player_1.zones.hand = [BLACK_COVENANT, 'card-fortifications'];
    expect(buildGuidedOptions(initial).map((option) => option.label)).toContain('Bind card-fortifications beneath Black Covenant');

    const bound = bindFortifications(game());
    expect(buildGuidedOptions(bound).map((option) => option.label)).toContain('Release card-fortifications from Black Covenant as an Action');
  });

  it('commits a banked bound card face down as an additional hand commitment', () => {
    let state = bindFortifications(game());
    const bindingId = state.players.player_1.mystics!.blackCovenantBindings![0].id;
    openBattle(state);

    expect(blackCovenantBattleBindings(state, 'player_1')).toHaveLength(1);
    state = applyGameAction(state, {
      type: 'use_mystic_black_covenant_battle',
      playerId: 'player_1',
      bindingId,
    }).state;

    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'card-fortifications',
      origin: 'hand',
      faceDown: true,
    }));
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(2);
    expect(state.players.player_1.zones.assetBank).not.toContain(BLACK_COVENANT);
    expect(state.players.player_1.zones.removed).toContain(BLACK_COVENANT);
  });

  it('opens the Battle-form optional binding window after reveal', () => {
    const state = game();
    openBattle(state);
    state.battle!.stage = 'dice';
    state.battle!.attacker.handCommit = covenantCard('player_1', 'hand');
    state.players.player_1.zones.hand = ['card-valor'];

    expect(openNextBlackCovenantBattleChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'black_covenant_battle',
      playerId: 'player_1',
      handOptions: ['card-valor'],
      options: ['pass', 'bind'],
    });

    const resolved = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'bind',
      cardId: 'card-valor',
    }).state;
    expect(resolved.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'card-valor',
      origin: 'hand',
      faceDown: false,
    }));
  });

  it('moves the bound battle card and consumed Asset to the Graveyard after cleanup', () => {
    let state = bindFortifications(game());
    const bindingId = state.players.player_1.mystics!.blackCovenantBindings![0].id;
    openBattle(state);
    state = applyGameAction(state, {
      type: 'use_mystic_black_covenant_battle',
      playerId: 'player_1',
      bindingId,
    }).state;

    state.battle!.stage = 'resolution';
    state.battle!.attacker.diceRoll = 6;
    state.battle!.defender.diceRoll = 1;
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.zones.graveyard).toContain(BLACK_COVENANT);
    expect(state.players.player_1.zones.graveyard).toContain('card-fortifications');
    expect(state.players.player_1.zones.removed).not.toContain(BLACK_COVENANT);
    expect(state.players.player_1.mystics?.blackCovenantBattleReleases).toBeUndefined();
  });

  it('sends a bound card to the Graveyard when its Covenant leaves play unused', () => {
    const state = bindFortifications(game());
    state.players.player_1.zones.assetBank = [];

    reconcileBlackCovenantBindings(state);

    expect(state.players.player_1.zones.graveyard).toContain('card-fortifications');
    expect(state.players.player_1.mystics?.blackCovenantBindings).toBeUndefined();
  });

  it('cannot release a banked bound card through Subversion', () => {
    const state = bindFortifications(game());
    openBattle(state);
    state.battle!.bankedAssetUseProhibited = ['player_1'];

    expect(blackCovenantBattleBindings(state, 'player_1')).toEqual([]);
  });
});
