import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, GameState, PlayerID } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import { toPrivateGameView } from './views';

function participant(playerId: PlayerID, roll: number): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    diceRoll: roll,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function game(leaderName = 'Alchemist'): GameState {
  const state = initializeGame({
    id: 'mystics-rite-integration-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName,
        deck: ['mystics-dark-omens', 'mystics-dark-omens', 'mystics-fates-toll'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor'],
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

function prepareBattle(
  state: GameState,
  attackerRoll: number,
  defenderRoll: number,
  mysticAsAttacker = true,
): void {
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
    id: 'mystic-battle',
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant(attackerId, attackerRoll),
    defender: participant(defenderId, defenderRoll),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

describe('Mystics Rite action integration', () => {
  it('begins a Rite through the common action engine', () => {
    let state = game();
    state.players.player_1.zones.hand = ['sacrifice'];

    state = applyGameAction(state, {
      type: 'begin_mystic_rite',
      playerId: 'player_1',
      riteId: 'rite_of_blood',
      cardId: 'sacrifice',
    }).state;

    expect(state.players.player_1.mystics?.begunRite).toEqual({
      kind: 'rite_of_blood',
      startedTurn: 1,
    });
    expect(state.players.player_1.zones.graveyard).toContain('sacrifice');
    expect(state.players.player_1.actionsRemaining).toBe(0);
  });

  it('offers legal Rite starts through guided controls', () => {
    const state = game();
    state.players.player_1.zones.hand = ['mystics-dark-omens', 'blood-cost'];
    state.players.player_1.zones.graveyard = ['echo-cost'];

    const actions = buildGuidedOptions(state).map((option) => option.action);

    expect(actions).toContainEqual({
      type: 'begin_mystic_rite',
      playerId: 'player_1',
      riteId: 'rite_of_echoes',
      cardId: 'echo-cost',
      secondaryCardId: 'mystics-dark-omens',
    });
    expect(actions).toContainEqual({
      type: 'begin_mystic_rite',
      playerId: 'player_1',
      riteId: 'rite_of_blood',
      cardId: 'blood-cost',
    });
  });
});

describe('Mystics Rite battle triggers', () => {
  it('completes Rite of Echoes after a later matching Battle effect is used', () => {
    let state = game();
    state.turn = 2;
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_echoes',
      startedTurn: 1,
      faceUpBoundCardId: 'bound-grave-card',
      faceDownBoundCardId: 'mystics-dark-omens',
    };
    prepareBattle(state, 6, 1);
    state.battle!.attacker.handCommit = {
      cardId: 'mystics-dark-omens',
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.mystics?.completedRites).toContain('rite_of_echoes');
    expect(state.players.player_1.mystics?.begunRite).toBeUndefined();
    expect(state.players.player_1.zones.discard).toContain('bound-grave-card');
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining([
      'mystics-dark-omens',
      'mystics-dark-omens',
    ]));
  });

  it('does not complete same-turn Echoes and interrupts it on a loss', () => {
    let state = game();
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_echoes',
      startedTurn: state.turn,
      faceUpBoundCardId: 'bound-grave-card',
      faceDownBoundCardId: 'mystics-dark-omens',
    };
    prepareBattle(state, 1, 6);
    state.battle!.attacker.handCommit = {
      cardId: 'mystics-dark-omens',
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.mystics?.completedRites).not.toContain('rite_of_echoes');
    expect(state.players.player_1.mystics?.begunRite).toBeUndefined();
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining([
      'bound-grave-card',
      'mystics-dark-omens',
    ]));
  });

  it('completes Rite of Blood after a clean later-turn victory', () => {
    let state = game();
    state.turn = 2;
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_blood',
      startedTurn: 1,
    };
    prepareBattle(state, 6, 1);

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.mystics?.completedRites).toContain('rite_of_blood');
  });

  it('leaves Rite of Blood incomplete after a victory using a hand commitment', () => {
    let state = game();
    state.turn = 2;
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_blood',
      startedTurn: 1,
    };
    prepareBattle(state, 6, 1);
    state.battle!.attacker.handCommit = {
      cardId: 'mystics-dark-omens',
      owner: 'player_1',
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.mystics?.completedRites).not.toContain('rite_of_blood');
    expect(state.players.player_1.mystics?.begunRite).toMatchObject({ kind: 'rite_of_blood' });
  });

  it('resets an Alchemist Rite after losing a battle', () => {
    let state = game('Alchemist');
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_blood',
      startedTurn: 0,
    };
    prepareBattle(state, 1, 6);

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.mystics?.begunRite).toBeUndefined();
    expect(state.pendingMysticsChoice).toBeUndefined();
  });

  it('lets the Spirit Walker preserve a Rite with an Arcane sacrifice', () => {
    let state = game('Spirit Walker');
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_blood',
      startedTurn: 0,
    };
    state.players.player_1.zones.hand = ['mystics-fates-toll'];
    prepareBattle(state, 1, 6);

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'guardians_of_the_circle',
      playerId: 'player_1',
      riteId: 'rite_of_blood',
      arcaneCardOptions: ['mystics-fates-toll'],
    });
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'mystics-fates-toll',
    });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'mystics-fates-toll',
    }).state;

    expect(state.pendingMysticsChoice).toBeUndefined();
    expect(state.players.player_1.mystics?.begunRite).toMatchObject({ kind: 'rite_of_blood' });
    expect(state.players.player_1.zones.graveyard).toContain('mystics-fates-toll');
    expect(state.players.player_1.mystics?.guardiansOfTheCircleUsedTurn).toBe(state.turn);
  });

  it('resets the Spirit Walker Rite when Guardians is declined', () => {
    let state = game('Spirit Walker');
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_blood',
      startedTurn: 0,
    };
    state.players.player_1.zones.hand = ['mystics-dark-omens'];
    prepareBattle(state, 1, 6);
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.players.player_1.mystics?.begunRite).toBeUndefined();
  });
});

describe('Rite of Crossing turn-start integration', () => {
  it('completes after the Capture step when the required Territory remains occupied', () => {
    let state = game();
    const required = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    for (const space of state.board.spaces) space.occupant = undefined;
    required.occupant = 'player_1';
    required.capturePendingBy = 'player_1';
    state.players.player_1.occupiedSpaceId = required.id;
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_crossing',
      startedTurn: 1,
      requiredSpaceId: required.id,
    };
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.phase = 'action_after_movement';

    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_2' }).state;

    expect(state.activePlayer).toBe('player_1');
    expect(required.id).toBe(state.players.player_1.occupiedSpaceId);
    expect(state.players.player_1.mystics?.completedRites).toContain('rite_of_crossing');
    expect(state.board.spaces.find((space) => space.id === required.id)?.controller).toBe('player_1');
  });

  it('resets at the next turn start when the required position was lost', () => {
    let state = game();
    const required = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    state.players.player_1.mystics!.begunRite = {
      kind: 'rite_of_crossing',
      startedTurn: 1,
      requiredSpaceId: required.id,
    };
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.phase = 'action_after_movement';

    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_2' }).state;

    expect(state.players.player_1.mystics?.begunRite).toBeUndefined();
    expect(state.players.player_1.mystics?.completedRites).not.toContain('rite_of_crossing');
  });
});
