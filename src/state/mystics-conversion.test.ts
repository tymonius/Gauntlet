import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, GameState, PlayerID } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import {
  canUseTransmutation,
  queueInvocationForArcaneUse,
  queueInvocationForRevealedBattleCards,
} from './mystics-conversion';
import { initializeGame } from './initialize';
import { toPrivateGameView } from './views';

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

function game(leaderName = 'Alchemist'): GameState {
  const state = initializeGame({
    id: 'mystics-conversion-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName,
        deck: ['card-valor', 'mystics-dark-omens', 'mystics-witchcraft'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor', 'mystics-dark-omens'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.phase = 'action_after_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function prepareDiceBattle(state: GameState, mysticAsAttacker = true): void {
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  const origin = territories[2];
  const location = territories[3];
  for (const space of state.board.spaces) space.occupant = undefined;
  const attackerId: PlayerID = mysticAsAttacker ? 'player_1' : 'player_2';
  const defenderId: PlayerID = mysticAsAttacker ? 'player_2' : 'player_1';
  origin.occupant = attackerId;
  location.occupant = defenderId;
  state.players[attackerId].occupiedSpaceId = origin.id;
  state.players[defenderId].occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = attackerId;
  state.battle = {
    id: 'mystics-conversion-battle',
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant(attackerId),
    defender: participant(defenderId),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

describe('Transmutation', () => {
  it('sacrifices a non-Supplemental card and adds its deckbuilding value', () => {
    let state = game('Spirit Walker');
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes', 'rite_of_blood'];
    state.players.player_1.zones.hand = ['mystics-witchcraft'];
    prepareDiceBattle(state);

    expect(canUseTransmutation(state, 'player_1')).toBe(true);
    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'use_mystic_transmutation',
      playerId: 'player_1',
      cardId: 'mystics-witchcraft',
    });

    state = applyGameAction(state, {
      type: 'use_mystic_transmutation',
      playerId: 'player_1',
      cardId: 'mystics-witchcraft',
    }).state;

    expect(state.battle?.attacker.modifiers).toBe(4);
    expect(state.players.player_1.zones.graveyard).toContain('mystics-witchcraft');
    expect(state.players.player_1.mystics?.transmutationUsedTurn).toBe(state.turn);
    expect(canUseTransmutation(state, 'player_1')).toBe(false);
  });

  it('closes as soon as either player has rolled', () => {
    const state = game('Spirit Walker');
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes', 'rite_of_blood'];
    state.players.player_1.zones.hand = ['mystics-witchcraft'];
    prepareDiceBattle(state);
    state.battle!.defender.diceRoll = 3;
    state.battle!.defender.diceRolls = [3];

    expect(canUseTransmutation(state, 'player_1')).toBe(false);
    expect(() => applyGameAction(state, {
      type: 'use_mystic_transmutation',
      playerId: 'player_1',
      cardId: 'mystics-witchcraft',
    })).toThrow(/before any battle dice are rolled/i);
  });
});

describe('Materia Prima', () => {
  it('draws immediately after the first qualifying Rite sacrifice on the Alchemist turn', () => {
    let state = game('Alchemist');
    state.players.player_1.zones.deck = ['card-valor'];
    state.players.player_1.zones.hand = ['rite-cost'];

    state = applyGameAction(state, {
      type: 'begin_mystic_rite',
      playerId: 'player_1',
      riteId: 'rite_of_blood',
      cardId: 'rite-cost',
    }).state;

    expect(state.players.player_1.zones.graveyard).toContain('rite-cost');
    expect(state.players.player_1.zones.hand).toContain('card-valor');
    expect(state.players.player_1.mystics?.materiaPrimaUsedTurn).toBe(state.turn);
    const drawEvent = state.log.find((event) => event.type === 'mystics_materia_prima_drawn');
    expect(drawEvent).toBeDefined();
    expect(drawEvent?.payload).not.toMatchObject({ cardId: expect.anything() });
  });

  it('defers a battle sacrifice replacement until the battle resolves', () => {
    let state = game('Alchemist');
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes', 'rite_of_blood'];
    state.players.player_1.zones.deck = ['card-valor'];
    state.players.player_1.zones.hand = ['mystics-witchcraft'];
    prepareDiceBattle(state);

    state = applyGameAction(state, {
      type: 'use_mystic_transmutation',
      playerId: 'player_1',
      cardId: 'mystics-witchcraft',
    }).state;

    expect(state.players.player_1.zones.hand).not.toContain('card-valor');
    expect(state.players.player_1.mystics?.materiaPrimaDeferredBattleId).toBe('mystics-conversion-battle');

    state.battle!.stage = 'resolution';
    state.battle!.attacker.diceRoll = 6;
    state.battle!.attacker.diceRolls = [6];
    state.battle!.defender.diceRoll = 1;
    state.battle!.defender.diceRolls = [1];
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.zones.hand).toContain('card-valor');
    expect(state.players.player_1.mystics?.materiaPrimaDeferredBattleId).toBeUndefined();
  });
});

describe('Invocation', () => {
  it('opens privately after an Arcane Action use and moves a chosen Graveyard card to Discard', () => {
    let state = game('Spirit Walker');
    state.phase = 'action_before_movement';
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes'];
    state.players.player_1.zones.hand = ['mystics-dark-omens'];
    state.players.player_1.zones.graveyard = ['card-valor'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-dark-omens',
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'invocation',
      playerId: 'player_1',
      sourceCardIds: ['mystics-dark-omens'],
      graveyardOptions: ['card-valor'],
    });
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'card-valor',
    });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_1.zones.graveyard).not.toContain('card-valor');
    expect(state.players.player_1.zones.discard).toContain('card-valor');
    expect(state.players.player_1.mystics?.invocationUsedTurn).toBe(state.turn);
  });

  it('may be offered again after passing, but not after it is used', () => {
    const state = game('Spirit Walker');
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes'];
    state.players.player_1.zones.graveyard = ['card-valor'];

    expect(queueInvocationForArcaneUse(state, 'player_1', ['mystics-dark-omens'])).toBe(true);
    let next = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    expect(next.players.player_1.mystics?.invocationUsedTurn).toBeUndefined();
    expect(queueInvocationForArcaneUse(next, 'player_1', ['mystics-witchcraft'])).toBe(true);

    next = applyGameAction(next, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'card-valor',
    }).state;
    expect(queueInvocationForArcaneUse(next, 'player_1', ['mystics-dark-omens'])).toBe(false);
  });

  it('ignores Arcane uses by non-Mystics players', () => {
    const state = game();
    state.players.player_2.zones.graveyard = ['card-valor'];

    expect(queueInvocationForArcaneUse(state, 'player_2', ['mystics-dark-omens'])).toBe(false);
    expect(state.pendingMysticsChoice).toBeUndefined();
  });

  it('queues active Arcane Battle cards once and ignores canceled cards', () => {
    let state = game('Spirit Walker');
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes'];
    state.players.player_1.zones.graveyard = ['card-valor'];
    prepareDiceBattle(state);
    state.battle!.attacker.handCommit = {
      cardId: 'mystics-dark-omens',
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };

    queueInvocationForRevealedBattleCards(state);
    expect(state.pendingMysticsChoice).toMatchObject({ kind: 'invocation' });
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    queueInvocationForRevealedBattleCards(state);
    expect(state.pendingMysticsChoice).toBeUndefined();

    const canceled = game('Spirit Walker');
    canceled.players.player_1.mystics!.completedRites = ['rite_of_echoes'];
    canceled.players.player_1.zones.graveyard = ['card-valor'];
    prepareDiceBattle(canceled);
    canceled.battle!.attacker.handCommit = {
      cardId: 'mystics-dark-omens',
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: true,
    };
    queueInvocationForRevealedBattleCards(canceled);
    expect(canceled.pendingMysticsChoice).toBeUndefined();
  });
});
