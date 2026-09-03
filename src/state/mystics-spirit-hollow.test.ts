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
  flags: { canceled?: boolean; negated?: boolean } = {},
): BattlePlayedCard {
  return {
    cardId: 'mystics-spirit-hollow',
    owner,
    origin,
    faceDown: false,
    canceled: flags.canceled ?? false,
    negated: flags.negated,
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
  const destination = territories(state)[offset];
  destination.occupant = playerId;
  state.players[playerId].occupiedSpaceId = destination.id;
}

function resolvedBattle(state: GameState): BattleState {
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

function installSpiritHollow(state: GameState, prior: BattleState): void {
  const space = state.board.spaces.find((candidate) => candidate.id === prior.location)!;
  placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_1');
}

describe('Spirit Hollow Action placement', () => {
  it('places on the current or adjacent Territory and exposes guided targets', () => {
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

  it('rejects missing, non-Territory, and nonadjacent targets before leaving hand', () => {
    const state = game();
    const spaces = territories(state);
    placePlayer(state, 'player_1', 1);
    state.players.player_1.zones.hand = ['mystics-spirit-hollow'];
    const nonTerritory = state.board.spaces.find((space) => space.kind !== 'territory')!;

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-spirit-hollow',
    })).toThrow(/requires exactly one/i);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-spirit-hollow',
      targets: [{ kind: 'space', spaceId: nonTerritory.id }],
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
  it('replaces normal cleanup destinations only for active copies', () => {
    const state = game();
    const prior = resolvedBattle(state);
    prior.attacker.handCommit = played('player_1', 'hand');
    prior.attacker.battleDrawPlayed = [
      played('player_1', 'battle_draw'),
      played('player_1', 'battle_draw', { negated: true }),
    ];
    prior.defender.handCommit = played('player_2', 'hand', { canceled: true });
    state.players.player_1.zones.graveyard = ['mystics-spirit-hollow'];
    state.players.player_1.zones.discard = ['mystics-spirit-hollow', 'mystics-spirit-hollow'];
    state.players.player_2.zones.hand = ['mystics-spirit-hollow'];

    expect(placeSpiritHollowBattleOverlays(state, prior)).toBe(2);
    const space = state.board.spaces.find((candidate) => candidate.id === prior.location)!;
    expect(space.overlays).toEqual([
      { cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },
      { cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },
    ]);
    expect(state.players.player_1.zones.graveyard).not.toContain('mystics-spirit-hollow');
    expect(state.players.player_1.zones.discard).toEqual(['mystics-spirit-hollow']);
    expect(state.players.player_2.zones.hand).toContain('mystics-spirit-hollow');
  });

  it('runs only the top Overlay and lets a newly placed copy trigger for the same battle', () => {
    const covered = game();
    const coveredBattle = resolvedBattle(covered);
    const coveredSpace = covered.board.spaces.find((candidate) => candidate.id === coveredBattle.location)!;
    placeTerritoryOverlay(coveredSpace, 'mystics-spirit-hollow', 'player_1');
    placeTerritoryOverlay(coveredSpace, 'intelligence-fog-of-war', 'player_2');
    expect(queueSpiritHollowAfterBattle(covered, coveredBattle)).toBe(false);

    const active = game();
    const activeBattle = resolvedBattle(active);
    activeBattle.attacker.handCommit = played('player_1', 'hand');
    active.players.player_1.zones.graveyard = ['mystics-spirit-hollow'];
    active.players.player_1.zones.hand = ['hand-card'];
    active.players.player_2.zones.hand = ['opponent-card'];
    placeSpiritHollowBattleOverlays(active, activeBattle);

    expect(queueSpiritHollowAfterBattle(active, activeBattle)).toBe(true);
    expect(openNextSpiritHollowChoice(active)).toBe(true);
    expect(active.pendingMysticsChoice).toMatchObject({
      kind: 'spirit_hollow_after_cleanup',
      playerId: 'player_1',
      battleId: activeBattle.id,
    });
  });
});

describe('Spirit Hollow after-cleanup choices', () => {
  it('keeps choices private, skips empty hands, and offers optional recovery', () => {
    const state = game();
    const prior = resolvedBattle(state);
    installSpiritHollow(state, prior);
    state.players.player_1.zones.hand = [];
    state.players.player_2.zones.hand = ['opponent-card'];
    state.players.player_2.zones.graveyard = ['grave-card'];
    queueSpiritHollowAfterBattle(state, prior);

    expect(openNextSpiritHollowChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'spirit_hollow_after_cleanup',
      playerId: 'player_2',
      handOptions: ['opponent-card'],
      graveyardOptions: ['grave-card'],
    });
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual(expect.arrayContaining([
      { type: 'resolve_mystics_choice', playerId: 'player_2', choice: 'pass' },
      { type: 'resolve_mystics_choice', playerId: 'player_2', choice: 'use', cardId: 'opponent-card' },
      {
        type: 'resolve_mystics_choice',
        playerId: 'player_2',
        choice: 'use',
        cardId: 'opponent-card',
        secondaryCardId: 'grave-card',
      },
    ]));
  });

  it('supports same-title recovery without recovering the newly sacrificed copy', () => {
    const state = game();
    const prior = resolvedBattle(state);
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
    const publicEvent = state.log.find((event) => event.type === 'mystics_spirit_hollow_used')!;
    expect(JSON.stringify(publicEvent)).not.toContain('duplicate');
  });

  it('triggers Materia Prima and lets Grave Ward interrupt before the next player', () => {
    let state = game('Alchemist');
    const prior = resolvedBattle(state);
    installSpiritHollow(state, prior);
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
  it('removes covered Spirit Hollow and Circle of Bones copies when control changes', () => {
    let state = game();
    const target = territories(state)[2];
    for (const space of state.board.spaces) space.occupant = undefined;
    target.controller = 'player_2';
    target.occupant = 'player_1';
    target.capturePendingBy = 'player_1';
    target.overlays = [
      { cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },
      { cardId: 'intelligence-fog-of-war', owner: 'player_2', faceUp: true },
      { cardId: 'mystics-circle-of-bones', owner: 'player_1', faceUp: true },
    ];
    state.players.player_1.occupiedSpaceId = target.id;
    state.activePlayer = 'player_1';
    state.priorityPlayer = 'player_1';
    state.phase = 'turn_start';
    state.players.player_1.zones.deck = ['drawn-card'];

    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_1' }).state;

    const updated = state.board.spaces.find((space) => space.id === target.id)!;
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
