import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import {
  canResolveManifestDestinyAction,
  MANIFEST_DESTINY,
  manifestDestinyRequiredAssetCount,
} from './neutral-manifest-destiny';
import { territoryHasPrintedEffect } from './territory-printed-effects';

const ASSET_A = 'neutral-entrenchment';
const ASSET_B = 'neutral-fortifications';
const ASSET_C = 'neutral-valor';
const HAND_A = 'neutral-rallying-cry';
const HAND_B = 'neutral-forced-march';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-manifest-destiny-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Expander',
        factionId: 'military',
        leaderName: 'General',
        deck: [MANIFEST_DESTINY, ASSET_A, ASSET_B, ASSET_C, HAND_A, HAND_B],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [MANIFEST_DESTINY, HAND_A, HAND_B],
        territories: ['territory-supply-depot', 'territory-old-battlefield', 'territory-refuge'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function played(
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: MANIFEST_DESTINY,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    fromInitialBattleHand: origin === 'battle_draw',
    ...overrides,
  };
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[]): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[],
  defenderCards: BattlePlayedCard[] = [],
  controller: PlayerID = 'player_2',
): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  location.controller = controller;
  location.revealed = true;
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `manifest-battle-${state.log.length + 1}`,
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function finishBattle(state: GameState, attackerWins: boolean): GameState {
  state.battle!.attacker.diceRoll = attackerWins ? 6 : 1;
  state.battle!.defender.diceRoll = attackerWins ? 1 : 6;
  return applyGameAction(state, {
    type: 'resolve_battle',
    playerId: 'player_1',
  }).state;
}

function playAction(
  state: GameState,
  assetCardIds: string[],
): GameState {
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: state.activePlayer,
    cardId: MANIFEST_DESTINY,
    targets: assetCardIds.map((cardId) => ({
      kind: 'card' as const,
      owner: state.activePlayer,
      cardId,
    })),
  }).state;
}

function manifestSpaces(state: GameState) {
  return state.board.spaces.filter((space) => space.manifestDestiny);
}

describe('Neutral Manifest Destiny', () => {
  it('registers both forms, the Action target requirement, and the Unique card identity', () => {
    expect(getCardPlayRule(MANIFEST_DESTINY)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'removed', battle_draw: 'discard' },
      requiresTarget: true,
    });
  });

  it('requires enough eligible Assets to reach three other sacrificed cards including one Asset', () => {
    const state = game();
    state.players.player_1.zones.hand = [MANIFEST_DESTINY, HAND_A, HAND_B];
    state.players.player_1.zones.assetBank = [];
    expect(manifestDestinyRequiredAssetCount(state, 'player_1')).toBe(1);
    expect(canResolveManifestDestinyAction(state, 'player_1')).toBe(false);

    state.players.player_1.zones.assetBank = [ASSET_A];
    expect(canResolveManifestDestinyAction(state, 'player_1')).toBe(true);

    state.players.player_1.zones.hand = [MANIFEST_DESTINY];
    expect(manifestDestinyRequiredAssetCount(state, 'player_1')).toBe(3);
    expect(canResolveManifestDestinyAction(state, 'player_1')).toBe(false);
  });

  it('pays the complete Action cost and inserts a blank Territory at player 1 end', () => {
    let state = game();
    state.players.player_1.zones.hand = [MANIFEST_DESTINY, HAND_A, HAND_B];
    state.players.player_1.zones.assetBank = [ASSET_A, ASSET_B];
    const oldFirstTerritory = state.board.spaces.find((space) => space.id === 'space-1')!;

    state = playAction(state, [ASSET_A]);

    const added = manifestSpaces(state);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      index: 1,
      kind: 'territory',
      revealed: true,
      controller: 'player_1',
      manifestDestiny: true,
      manifestDestinyOwner: 'player_1',
    });
    expect(territoryHasPrintedEffect(added[0])).toBe(false);
    expect(oldFirstTerritory.id).toBe('space-1');
    expect(state.board.spaces.find((space) => space.id === 'space-1')?.index).toBe(2);
    expect(state.players.player_1.zones.hand).toEqual([]);
    expect(state.players.player_1.zones.assetBank).toEqual([ASSET_B]);
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining([HAND_A, HAND_B, ASSET_A]));
    expect(state.players.player_1.zones.removed).not.toContain(MANIFEST_DESTINY);
    expect(state.players.player_1.controlledTerritories).toContain(added[0].territoryId);
    expect(state.board.spaces.map((space) => space.index)).toEqual(
      state.board.spaces.map((_, index) => index),
    );
  });

  it('inserts at player 2 end when player 2 uses the Action', () => {
    let state = game();
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.players.player_2.actionsRemaining = 1;
    state.players.player_2.zones.hand = [MANIFEST_DESTINY, HAND_A, HAND_B];
    state.players.player_2.zones.assetBank = [ASSET_A];

    state = playAction(state, [ASSET_A]);

    const added = manifestSpaces(state)[0]!;
    const endpoint = state.board.spaces.find((space) => space.id === 'player_2-heartland')!;
    expect(added.controller).toBe('player_2');
    expect(added.index).toBe(endpoint.index - 1);
  });

  it('rejects the wrong number or an ineligible Armistice Asset as the Action cost', () => {
    const state = game();
    state.players.player_1.zones.hand = [MANIFEST_DESTINY, HAND_A, HAND_B];
    state.players.player_1.zones.assetBank = ['neutral-armistice', ASSET_A];

    expect(() => playAction(state, [])).toThrow('exactly 1 banked Asset target');
    expect(() => playAction(state, ['neutral-armistice'])).toThrow('not an eligible banked Asset');
  });

  it('inserts a Battle copy between the origin and contested Territory after a qualifying win', () => {
    let state = game();
    beginBattle(state, [played('player_1')]);
    state = finishBattle(state, true);

    const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
    const location = state.board.spaces.find((space) => space.id === 'space-4')!;
    const added = manifestSpaces(state)[0]!;
    expect(added.index).toBe(Math.min(origin.index, location.index) + 1);
    expect(Math.abs(origin.index - added.index)).toBe(1);
    expect(Math.abs(location.index - added.index)).toBe(1);
    expect(added.controller).toBe('player_1');
    expect(added.occupant).toBeUndefined();
    expect(state.players.player_1.zones.discard).not.toContain(MANIFEST_DESTINY);
    expect(state.players.player_1.controlledTerritories).toContain(added.territoryId);
  });

  it('replaces a hand commitment Graveyard destination after a qualifying win', () => {
    let state = game();
    beginBattle(state, [played('player_1', 'hand')]);
    state = finishBattle(state, true);

    expect(manifestSpaces(state)).toHaveLength(1);
    expect(state.players.player_1.zones.graveyard).not.toContain(MANIFEST_DESTINY);
  });

  it('does nothing after a loss, while defending, on a friendly Territory, or for inactive copies', () => {
    const cases = [
      { attacker: [played('player_1')], defender: [], wins: false, controller: 'player_2' as PlayerID },
      { attacker: [], defender: [played('player_2')], wins: true, controller: 'player_2' as PlayerID },
      { attacker: [played('player_1')], defender: [], wins: true, controller: 'player_1' as PlayerID },
      { attacker: [played('player_1', 'battle_draw', { canceled: true })], defender: [], wins: true, controller: 'player_2' as PlayerID },
      { attacker: [played('player_1', 'battle_draw', { negated: true })], defender: [], wins: true, controller: 'player_2' as PlayerID },
      { attacker: [played('player_1', 'battle_draw', { virtual: true })], defender: [], wins: true, controller: 'player_2' as PlayerID },
    ];

    for (const setup of cases) {
      let state = game();
      beginBattle(state, setup.attacker, setup.defender, setup.controller);
      state = finishBattle(state, setup.wins);
      expect(manifestSpaces(state)).toHaveLength(0);
    }
  });

  it('the added card behaves as a normal occupiable and capturable Territory', () => {
    let state = game();
    state.players.player_1.zones.hand = [MANIFEST_DESTINY, HAND_A, HAND_B];
    state.players.player_1.zones.assetBank = [ASSET_A];
    state = playAction(state, [ASSET_A]);
    const added = manifestSpaces(state)[0]!;

    state.phase = 'movement';
    state.players.player_1.movementRemaining = 1;
    state = applyGameAction(state, {
      type: 'move_player', playerId: 'player_1', toSpaceId: added.id,
    }).state;
    expect(added.id).toBe(state.players.player_1.occupiedSpaceId);

    for (const space of state.board.spaces) delete space.occupant;
    added.occupant = 'player_2';
    added.capturePendingBy = 'player_2';
    state.players.player_1.occupiedSpaceId = undefined;
    state.players.player_2.occupiedSpaceId = added.id;
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.phase = 'turn_start';
    state.players.player_2.zones.deck = [HAND_A];

    state = applyGameAction(state, {
      type: 'draw_card', playerId: 'player_2',
    }).state;
    expect(added.controller).toBe('player_2');
    expect(state.players.player_1.controlledTerritories).not.toContain(added.territoryId);
    expect(state.players.player_2.controlledTerritories).toContain(added.territoryId);
  });
});
