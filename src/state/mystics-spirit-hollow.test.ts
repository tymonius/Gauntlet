import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PlayerID,
} from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import {
  openNextSpiritHollowChoice,
  placeSpiritHollowBattleOverlays,
  queueSpiritHollowAfterBattle,
  resolveSpiritHollowChoice,
} from './mystics-spirit-hollow';
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
  state: { canceled?: boolean; negated?: boolean } = {},
): BattlePlayedCard {
  return {
    cardId: 'mystics-spirit-hollow',
    owner,
    origin,
    faceDown: false,
    canceled: state.canceled ?? false,
    negated: state.negated,
  };
}

function game(leaderName = 'Spirit Walker'): GameState {
  const state = initializeGame({
    id: 'mystics-spirit-hollow-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName,
        deck: ['mystics-spirit-hollow', 'card-valor', 'card-fortifications'],
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
  const space = territories(state)[offset];
  space.occupant = playerId;
  state.players[playerId].occupiedSpaceId = space.id;
}

function battle(state: GameState): BattleState {
  const spaces = territories(state);
  return {
    id: 'spirit-hollow-battle',
    stage: 'resolution',
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function recordResult(state: GameState, prior: BattleState): void {
  state.recentBattleResult = {
    battleId: prior.id,
    turn: state.turn,
    winner: 'player_1',
    loser: 'player_2',
    attacker: 'player_1',
    defender: 'player_2',
    location: prior.location,
    attackerOrigin: prior.attackerOrigin,
    retreatDirection: 1,
  };
  state.phase = 'action_after_movement';
}

function installSpiritHollow(state: GameState, prior: BattleState, owner: PlayerID = 'player_1'): void {
  const space = state.board.spaces.find((candidate) => candidate.id === prior.location)!;
  placeTerritoryOverlay(space, 'mystics-spirit-hollow', owner);
}

describe('Spirit Hollow Action placement', () => {
  it('places on the current or adjacent Territory and leaves no temporary removed-zone copy', () => {
    let state = game();
    const spaces = territories(state);
    placePlayer(state, 'player_1', 1);
    state.players.player_1.zones.hand = ['mystics-spirit-hollow'];

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual(expect.arrayContaining([
      {
        type: 'play_action_card',
        playerId: 'player_1',
        cardId: 'mystics-spirit-hollow',
        targets: [{ kind: 'space', spaceId: spaces[1].id }],
      },
      {
        type: 'play_action_card',
        playerId: 'player_1',
        cardId: 'mystics-spirit-hollow',
        targets: [{ kind: 'space', spaceId: spaces[2].id }],
      },
    ]));

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-spirit-hollow',
      targets: [{ kind: 'space', spaceId: spaces[2].id }],
    }).state;

    expect(topTerritoryOverlay(state.board.spaces.find((space) => space.id === spaces[2].id))).toMatchObject({
      cardId: 'mystics-spirit-hollow',
      owner: 'player_1',
      faceUp: true,
    });
    expect(state.players.player_1.zones.removed).not.toContain('mystics-spirit-hollow');
    expect(state.players.player_1.zones.discard).not.toContain('mystics-spirit-hollow');
    expect(state.players.player_1.zones.graveyard).not.toContain('mystics-spirit-hollow');
  });

  it('rejects missing, endpoint, and nonadjacent targets before the card leaves hand', () => {
    const state = game();
    const spaces = territories(state);
    placePlayer(state, 'player_1', 1);
    state.players.player_1.zones.hand = ['mystics-spirit-hollow'];
    const endpoint = state.board.spaces.find((space) => space.kind === 'endpoint')!;

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-spirit-hollow',
    })).toThrow(/requires exactly one/i);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-spirit-hollow',
      targets: [{ kind: 'space', spaceId: endpoint.id }],
    })).toThrow(/current Territory or an adjacent/i);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-spirit-hollow',
      targets: [{ kind: 'space', spaceId: spaces[4].id }],
    })).toThrow(/current Territory or an adjacent/i);
    expect(state.players.player_1.zones.hand).toEqual(['mystics-spirit-hollow']);
  });
});

describe('Spirit Hollow Battle placement and stacking', () => {
  it('moves active hand and Battle Hand copies from normal cleanup destinations onto the contested Territory', () => {
    const state = game();
    const prior = battle(state);
    prior.attacker.handCommit = played('player_1', 'hand');
    prior.attacker.battleDrawPlayed = [played('player_1', 'battle_draw')];
    state.players.player_1.zones.graveyard = ['mystics-spirit-hollow'];
    state.players.player_1.zones.discard = ['mystics-spirit-hollow'];

    expect(placeSpiritHollowBattleOverlays(state, prior)).toBe(2);
    const space = state.board.spaces.find((candidate) => candidate.id === prior.location)!;
    expect(space.overlays).toEqual([
      { cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },
      { cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },
    ]);
    expect(state.players.player_1.zones.graveyard).not.toContain('mystics-spirit-hollow');
    expect(state.players.player_1.zones.discard).not.toContain('mystics-spirit-hollow');
  });

  it('leaves canceled and negated copies in their normal destinations', () => {
    const state = game();
    const prior = battle(state);
    prior.attacker.handCommit = played('player_1', 'hand', { canceled: true });
    prior.attacker.battleDrawPlayed = [played('player_1', 'battle_draw', { negated: true })];
    state.players.player_1.zones.hand = ['mystics-spirit-hollow'];
    state.players.player_1.zones.discard = ['mystics-spirit-hollow'];

    expect(placeSpiritHollowBattleOverlays(state, prior)).toBe(0);
    expect(state.board.spaces.find((candidate) => candidate.id === prior.location)?.overlays).toBeUndefined();
    expect(state.players.player_1.zones.hand).toContain('mystics-spirit-hollow');
    expect(state.players.player_1.zones.discard).toContain('mystics-spirit-hollow');
  });

  it('lets only the topmost Overlay run its normal effect', () => {
    const covered = game();
    const coveredBattle = battle(covered);
    const coveredSpace = covered.board.spaces.find((candidate) => candidate.id === coveredBattle.location)!;
    placeTerritoryOverlay(coveredSpace, 'mystics-spirit-hollow', 'player_1');
    placeTerritoryOverlay(coveredSpace, 'intelligence-fog-of-war', 'player_2');
    expect(queueSpiritHollowAfterBattle(covered, coveredBattle)).toBe(false);

    const active = game();
    const activeBattle = battle(active);
    const activeSpace = active.board.spaces.find((candidate) => candidate.id === activeBattle.location)!;
    placeTerritoryOverlay(activeSpace, 'intelligence-fog-of-war', 'player_2');
    placeTerritoryOverlay(activeSpace, 'mystics-spirit-hollow', 'player_1');
    expect(queueSpiritHollowAfterBattle(active, activeBattle)).toBe(true);
  });

  it('allows a newly battle-placed Spirit Hollow to trigger for that same battle', () => {
    const state = game();
    const prior = battle(state);
    prior.attacker.handCommit = played('player_1', 'hand');
    state.players.player_1.zones.graveyard = ['mystics-spirit-hollow'];
    state.players.player_1.zones.hand = ['hand-card'];
    state.players.player_2.zones.hand = ['opponent-card'];

    placeSpiritHollowBattleOverlays(state, prior);
    expect(queueSpiritHollowAfterBattle(state, prior)).toBe(true);
    expect(openNextSpiritHollowChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'spirit_hollow_after_cleanup',
      playerId: 'player_1',
      battleId: prior.id,
    });
  });
});

describe('Spirit Hollow after-cleanup choices', () => {
  it('offers private sequential choices to both players and auto-skips an empty hand', () => {
    const state = game();
    const prior = battle(state);
    installSpiritHollow(state, prior);
    state.players.player_1.zones.hand = [];
    state.players.player_2.zones.hand = ['opponent-card'];
    queueSpiritHollowAfterBattle(state, prior);

    expect(openNextSpiritHollowChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'spirit_hollow_after_cleanup',
      playerId: 'player_2',
      handOptions: ['opponent-card'],
    });
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
  });

  it('allows sacrifice without recovery or with one preexisting Graveyard card', () => {
    const state = game();
    const prior = battle(state);
    installSpiritHollow(state, prior);
    state.players.player_1.zones.hand = ['hand-card'];
    state.players.player_1.zones.graveyard = ['grave-card'];
    state.players.player_2.zones.hand = [];
    queueSpiritHollowAfterBattle(state, prior);
    openNextSpiritHollowChoice(state);

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual(expect.arrayContaining([
      { type: 'resolve_mystics_choice', playerId: 'player_1', choice: 'pass' },
      { type: 'resolve_mystics_choice', playerId: 'player_1', choice: 'use', cardId: 'hand-card' },
      {
        type: 'resolve_mystics_choice',
        playerId: 'player_1',
        choice: 'use',
        cardId: 'hand-card',
        secondaryCardId: 'grave-card',
      },
    ]));

    resolveSpiritHollowChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'hand-card',
      secondaryCardId: 'grave-card',
    });

    expect(state.players.player_1.zones.graveyard).toContain('hand-card');
    expect(state.players.player_1.zones.graveyard).not.toContain('grave-card');
    expect(state.players.player_1.zones.discard).toContain('grave-card');
    const publicEvent = state.log.find((event) => event.type === 'mystics_spirit_hollow_used')!;
    expect(JSON.stringify(publicEvent)).not.toContain('hand-card');
    expect(JSON.stringify(publicEvent)).not.toContain('grave-card');
  });

  it('treats an existing same-title copy as the required other Graveyard card', () => {
    const state = game();
    const prior = battle(state);
    installSpiritHollow(state, prior);
    state.players.player_1.zones.hand = ['duplicate'];
    state.players.player_1.zones.graveyard = ['duplicate'];
    state.players.player_2.zones.hand = [];
    queueSpiritHollowAfterBattle(state, prior);
    openNextSpiritHollowChoice(state);

    resolveSpiritHollowChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'duplicate',
      secondaryCardId: 'duplicate',
    });

    expect(state.players.player_1.zones.graveyard).toEqual(['duplicate']);
    expect(state.players.player_1.zones.discard).toEqual(['duplicate']);
  });

  it('triggers Materia Prima and lets Grave Ward interrupt before the second player chooses', () => {
    let state = game('Alchemist');
    const prior = battle(state);
    installSpiritHollow(state, prior);
    state.activePlayer = 'player_1';
    state.players.player_1.zones.hand = ['sacrifice-card'];
    state.players.player_1.zones.deck = ['drawn-card'];
    state.players.player_1.zones.assetBank = ['mystics-grave-ward'];
    state.players.player_2.zones.hand = ['opponent-card'];
    queueSpiritHollowAfterBattle(state, prior);
    openNextSpiritHollowChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'sacrifice-card',
    }).state;

    expect(state.players.player_1.zones.hand).toContain('drawn-card');
    expect(state.players.player_1.mystics?.materiaPrimaUsedTurn).toBe(state.turn);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_asset',
      playerId: 'player_1',
      cardId: 'sacrifice-card',
    });
  });
});

describe('capture-sensitive Overlay removal', () => {
  it('moves covered Spirit Hollow and Circle of Bones copies to their owners’ Graveyards when control changes', () => {
    let state = game();
    const space = territories(state)[2];
    for (const candidate of state.board.spaces) candidate.occupant = undefined;
    space.controller = 'player_2';
    space.occupant = 'player_1';
    space.capturePendingBy = 'player_1';
    state.players.player_1.occupiedSpaceId = space.id;
    state.activePlayer = 'player_1';
    state.priorityPlayer = 'player_1';
    state.phase = 'turn_start';
    state.players.player_1.zones.deck = ['drawn-card'];
    space.overlays = [
      { cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },
      { cardId: 'intelligence-fog-of-war', owner: 'player_2', faceUp: true },
      { cardId: 'mystics-circle-of-bones', owner: 'player_1', faceUp: true },
    ];

    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_1' }).state;

    expect(space.controller).toBe('player_2');
    const updated = state.board.spaces.find((candidate) => candidate.id === space.id)!;
    expect(updated.controller).toBe('player_1');
    expect(updated.overlays).toEqual([
      { cardId: 'intelligence-fog-of-war', owner: 'player_2', faceUp: true },
    ]);
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining([
      'mystics-spirit-hollow',
      'mystics-circle-of-bones',
    ]));
  });
});
