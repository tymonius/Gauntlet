import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import {
  openCircleOfBonesRerollIfReady,
  placeCircleOfBonesBattleOverlays,
  removeCircleOfBonesCleanupCopies,
  resolveCircleOfBonesChoice,
} from './mystics-circle-of-bones';
import { placeTerritoryOverlay, topTerritoryOverlay } from './territory-overlays';
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

function played(
  owner: PlayerID,
  origin: 'hand' | 'battle_draw',
  flags: { canceled?: boolean; negated?: boolean; placed?: boolean } = {},
): BattlePlayedCard {
  return {
    cardId: 'mystics-circle-of-bones',
    owner,
    origin,
    faceDown: false,
    canceled: flags.canceled ?? false,
    negated: flags.negated,
    postRevealEffectResolved: flags.placed,
  };
}

function game(leaderName = 'Spirit Walker'): GameState {
  const state = initializeGame({
    id: 'mystics-circle-of-bones-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName,
        deck: ['mystics-circle-of-bones', 'card-valor', 'card-fortifications'],
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

function territories(state: GameState) {
  return state.board.spaces.filter((space) => space.kind === 'territory');
}

function placePlayer(state: GameState, playerId: PlayerID, offset: number): void {
  for (const space of state.board.spaces) {
    if (space.occupant === playerId) space.occupant = undefined;
  }
  const destination = territories(state)[offset];
  destination.occupant = playerId;
  state.players[playerId].occupiedSpaceId = destination.id;
}

function battle(state: GameState, stage: BattleState['stage'] = 'dice'): BattleState {
  const spaces = territories(state);
  const current: BattleState = {
    id: 'circle-of-bones-battle',
    stage,
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: stage === 'dice' ? [] : ['before_battle_resolution'],
  };
  state.phase = 'battle';
  state.battle = current;
  return current;
}

function installCircle(state: GameState, owner: PlayerID = 'player_1'): void {
  const current = state.battle!;
  const space = state.board.spaces.find((candidate) => candidate.id === current.location)!;
  placeTerritoryOverlay(space, 'mystics-circle-of-bones', owner);
}

describe('Circle of Bones Action placement', () => {
  it('places on the current or adjacent Territory and exposes guided targets', () => {
    let state = game();
    const spaces = territories(state);
    placePlayer(state, 'player_1', 1);
    state.players.player_1.zones.hand = ['mystics-circle-of-bones'];

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual(expect.arrayContaining([
      {
        type: 'play_action_card',
        playerId: 'player_1',
        cardId: 'mystics-circle-of-bones',
        targets: [{ kind: 'space', spaceId: spaces[1].id }],
      },
      {
        type: 'play_action_card',
        playerId: 'player_1',
        cardId: 'mystics-circle-of-bones',
        targets: [{ kind: 'space', spaceId: spaces[2].id }],
      },
    ]));

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-circle-of-bones',
      targets: [{ kind: 'space', spaceId: spaces[2].id }],
    }).state;

    expect(topTerritoryOverlay(state.board.spaces.find((space) => space.id === spaces[2].id))).toMatchObject({
      cardId: 'mystics-circle-of-bones',
      owner: 'player_1',
      faceUp: true,
    });
    expect(state.players.player_1.zones.removed).not.toContain('mystics-circle-of-bones');
  });

  it('rejects missing, non-Territory, and nonadjacent targets before leaving hand', () => {
    const state = game();
    const spaces = territories(state);
    placePlayer(state, 'player_1', 1);
    state.players.player_1.zones.hand = ['mystics-circle-of-bones'];
    const nonTerritory = state.board.spaces.find((space) => space.kind !== 'territory')!;

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-circle-of-bones',
    })).toThrow(/requires exactly one/i);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-circle-of-bones',
      targets: [{ kind: 'space', spaceId: nonTerritory.id }],
    })).toThrow(/current Territory or an adjacent/i);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-circle-of-bones',
      targets: [{ kind: 'space', spaceId: spaces[4].id }],
    })).toThrow(/current Territory or an adjacent/i);
    expect(state.players.player_1.zones.hand).toEqual(['mystics-circle-of-bones']);
  });
});

describe('Circle of Bones reveal placement', () => {
  it('places active copies after reveal effects and leaves canceled or negated copies in battle', () => {
    let state = game();
    const current = battle(state, 'dice');
    current.attacker.handCommit = played('player_1', 'hand');
    current.attacker.battleDrawPlayed = [played('player_1', 'battle_draw', { negated: true })];
    current.defender.handCommit = played('player_2', 'hand', { canceled: true });

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    const space = state.board.spaces.find((candidate) => candidate.id === current.location)!;
    expect(space.overlays).toEqual([
      { cardId: 'mystics-circle-of-bones', owner: 'player_1', faceUp: true },
    ]);
    expect(state.battle?.attacker.handCommit?.postRevealEffectResolved).toBe(true);
    expect(state.battle?.attacker.battleDrawPlayed[0].postRevealEffectResolved).not.toBe(true);
    expect(state.battle?.defender.handCommit?.postRevealEffectResolved).not.toBe(true);
  });

  it('stacks active copies in reveal order, making the last placed copy the active top Overlay', () => {
    const state = game();
    const current = battle(state, 'dice');
    current.attacker.handCommit = played('player_1', 'hand');
    current.defender.handCommit = played('player_2', 'hand');
    current.effectsResolved.push('before_battle_resolution');

    expect(placeCircleOfBonesBattleOverlays(state)).toBe(2);
    const space = state.board.spaces.find((candidate) => candidate.id === current.location)!;
    expect(space.overlays).toEqual([
      { cardId: 'mystics-circle-of-bones', owner: 'player_1', faceUp: true },
      { cardId: 'mystics-circle-of-bones', owner: 'player_2', faceUp: true },
    ]);
    expect(topTerritoryOverlay(space)?.owner).toBe('player_2');
    expect(placeCircleOfBonesBattleOverlays(state)).toBe(0);
  });

  it('removes temporary cleanup copies without erasing the battle commitment record', () => {
    const state = game();
    const current = battle(state, 'resolution');
    current.attacker.handCommit = played('player_1', 'hand', { placed: true });
    current.attacker.battleDrawPlayed = [played('player_1', 'battle_draw', { placed: true })];
    state.players.player_1.zones.graveyard = ['mystics-circle-of-bones', 'other'];
    state.players.player_1.zones.discard = ['mystics-circle-of-bones', 'other-discard'];

    expect(removeCircleOfBonesCleanupCopies(state, current)).toBe(2);
    expect(state.players.player_1.zones.graveyard).toEqual(['other']);
    expect(state.players.player_1.zones.discard).toEqual(['other-discard']);
    expect(current.attacker.handCommit?.cardId).toBe('mystics-circle-of-bones');
    expect(current.attacker.battleDrawPlayed[0].cardId).toBe('mystics-circle-of-bones');
  });
});

describe('Circle of Bones reroll window', () => {
  it('opens privately only when the top Circle owner is in the battle and both dice are rolled', () => {
    const state = game();
    const current = battle(state, 'resolution');
    current.attacker.diceRolls = [4];
    current.attacker.diceRoll = 4;
    current.defender.diceRolls = [5];
    current.defender.diceRoll = 5;
    state.players.player_1.zones.hand = ['sacrifice-card'];
    installCircle(state, 'player_1');

    expect(openCircleOfBonesRerollIfReady(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'circle_of_bones_reroll',
      playerId: 'player_1',
      handOptions: ['sacrifice-card'],
      targetPlayerOptions: ['player_1', 'player_2'],
    });
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual(expect.arrayContaining([
      { type: 'resolve_mystics_choice', playerId: 'player_1', choice: 'pass' },
      {
        type: 'resolve_mystics_choice',
        playerId: 'player_1',
        choice: 'use',
        cardId: 'sacrifice-card',
        targetPlayerId: 'player_2',
      },
    ]));
  });

  it('rerolls the selected participant’s full advantage pool and must use the new result', () => {
    const state = game();
    const current = battle(state, 'resolution');
    current.attacker.diceRolls = [4];
    current.attacker.diceRoll = 4;
    current.defender.advantage = 1;
    current.defender.diceRolls = [5, 2];
    current.defender.diceRoll = 5;
    state.players.player_1.zones.hand = ['sacrifice-card'];
    installCircle(state, 'player_1');
    openCircleOfBonesRerollIfReady(state);

    resolveCircleOfBonesChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'sacrifice-card',
      targetPlayerId: 'player_2',
      values: [3, 6],
    });

    expect(state.players.player_1.zones.graveyard).toContain('sacrifice-card');
    expect(current.defender.diceRolls).toEqual([3, 6]);
    expect(current.defender.diceRoll).toBe(6);
    expect(openCircleOfBonesRerollIfReady(state)).toBe(false);
  });

  it('runs after Fate’s Toll windows and only once per battle even when passed', () => {
    const state = game();
    const current = battle(state, 'resolution');
    current.attacker.diceRoll = 3;
    current.attacker.diceRolls = [3];
    current.defender.diceRoll = 4;
    current.defender.diceRolls = [4];
    state.players.player_1.zones.hand = ['sacrifice-card'];
    installCircle(state, 'player_1');
    state.pendingMysticsChoice = {
      kind: 'fates_toll_reroll',
      playerId: 'player_1',
      battleId: current.id,
      sourceKey: 'fates-toll-copy',
      oldRoll: 3,
      handOptions: ['sacrifice-card'],
      options: ['pass', 'use'],
    };

    expect(openCircleOfBonesRerollIfReady(state)).toBe(false);
    state.pendingMysticsChoice = undefined;
    expect(openCircleOfBonesRerollIfReady(state)).toBe(true);
    resolveCircleOfBonesChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    });
    expect(openCircleOfBonesRerollIfReady(state)).toBe(false);
  });

  it('does not open while covered, without a hand, or when the owner is not involved', () => {
    const covered = game();
    const coveredBattle = battle(covered, 'resolution');
    coveredBattle.attacker.diceRoll = 2;
    coveredBattle.defender.diceRoll = 3;
    covered.players.player_1.zones.hand = ['card'];
    installCircle(covered, 'player_1');
    const coveredSpace = covered.board.spaces.find((space) => space.id === coveredBattle.location)!;
    placeTerritoryOverlay(coveredSpace, 'mystics-spirit-hollow', 'player_1');
    expect(openCircleOfBonesRerollIfReady(covered)).toBe(false);

    const empty = game();
    const emptyBattle = battle(empty, 'resolution');
    emptyBattle.attacker.diceRoll = 2;
    emptyBattle.defender.diceRoll = 3;
    installCircle(empty, 'player_1');
    expect(openCircleOfBonesRerollIfReady(empty)).toBe(false);
    expect(openCircleOfBonesRerollIfReady(empty)).toBe(false);

    const absent = game();
    const absentBattle = battle(absent, 'resolution');
    absentBattle.attacker.diceRoll = 2;
    absentBattle.defender.diceRoll = 3;
    absent.players.player_1.zones.hand = ['card'];
    installCircle(absent, 'spectator');
    expect(openCircleOfBonesRerollIfReady(absent)).toBe(false);
  });

  it('triggers deferred Materia Prima and Grave Ward after the sacrifice', () => {
    let state = game('Alchemist');
    const current = battle(state, 'resolution');
    current.attacker.diceRoll = 4;
    current.attacker.diceRolls = [4];
    current.defender.diceRoll = 5;
    current.defender.diceRolls = [5];
    state.players.player_1.zones.hand = ['sacrifice-card'];
    state.players.player_1.zones.deck = ['drawn-card'];
    state.players.player_1.zones.assetBank = ['mystics-grave-ward'];
    installCircle(state, 'player_1');
    openCircleOfBonesRerollIfReady(state);

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'sacrifice-card',
      targetPlayerId: 'player_2',
      value: 2,
    }).state;

    expect(state.players.player_1.mystics?.materiaPrimaUsedTurn).toBe(state.turn);
    expect(state.players.player_1.mystics?.materiaPrimaDeferredBattleId).toBe(current.id);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_asset',
      playerId: 'player_1',
      cardId: 'sacrifice-card',
    });
  });
});
