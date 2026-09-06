import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { COUNTERWORKS } from './neutral-counterworks';
import {
  PROTRACTED_SIEGE,
  removeAbandonedProtractedSiegeOverlays,
} from './neutral-protracted-siege';
import { confirmPendingCapturesFor } from './reducer';
import { placeTerritoryOverlay, topTerritoryOverlay } from './territory-overlays';
import { toPrivateGameView } from './views';

const RALLYING_CRY = 'neutral-rallying-cry';
const FORTIFICATIONS = 'neutral-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-protracted-siege-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Occupier',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [PROTRACTED_SIEGE, COUNTERWORKS, RALLYING_CRY, FORTIFICATIONS],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [PROTRACTED_SIEGE, PROTRACTED_SIEGE, RALLYING_CRY, FORTIFICATIONS],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_2.actionsRemaining = 1;
  return state;
}

function threatenedTerritory(state: GameState) {
  for (const space of state.board.spaces) delete space.occupant;
  const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
  space.kind = 'territory';
  space.territoryId = 'p2-three';
  space.revealed = true;
  space.controller = 'player_2';
  space.occupant = 'player_1';
  space.capturePendingBy = 'player_1';
  state.players.player_1.occupiedSpaceId = space.id;
  state.players.player_2.occupiedSpaceId = undefined;
  if (!state.players.player_2.controlledTerritories.includes(space.territoryId)) {
    state.players.player_2.controlledTerritories.push(space.territoryId);
  }
  state.players.player_1.controlledTerritories = state.players.player_1.controlledTerritories.filter(
    (territoryId) => territoryId !== space.territoryId,
  );
  return space;
}

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[] = [],
  roll = playerId === 'player_1' ? 6 : 1,
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    diceRoll: roll,
    modifiers: 0,
    retreated: false,
  };
}

function played(
  origin: 'hand' | 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: PROTRACTED_SIEGE,
    owner: 'player_2',
    origin,
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function beginDefenderLoss(
  state: GameState,
  defenderCards: BattlePlayedCard[],
  options: { lossSuppressed?: boolean; controlled?: boolean } = {},
): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.territoryId = 'p2-three';
  location.revealed = true;
  location.controller = options.controlled === false ? 'player_1' : 'player_2';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'protracted-siege-battle',
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1'),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
    lossRetreatEffectsSuppressedFor: options.lossSuppressed ? ['player_2'] : undefined,
  };
}

function resolveBattle(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle',
    playerId: 'player_1',
  }).state;
}

describe('Neutral Protracted Siege', () => {
  it('registers both forms and banks its Action form', () => {
    expect(getCardPlayRule(PROTRACTED_SIEGE)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [PROTRACTED_SIEGE];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: PROTRACTED_SIEGE,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([PROTRACTED_SIEGE]);
  });

  it('offers the defending controller a banked copy before a pending capture', () => {
    const state = game();
    const space = threatenedTerritory(state);
    state.players.player_2.zones.assetBank = [PROTRACTED_SIEGE];

    confirmPendingCapturesFor(state, 'player_1');

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'protracted_siege_capture',
      playerId: 'player_2',
      capturingPlayerId: 'player_1',
      spaceId: space.id,
      options: ['pass', 'use'],
    });
    expect(toPrivateGameView(state, 'player_2').pendingNeutralChoice).toMatchObject({
      kind: 'protracted_siege_capture',
    });
  });

  it('captures immediately when the controller declines the Asset trigger', () => {
    let state = game();
    const space = threatenedTerritory(state);
    state.players.player_2.zones.assetBank = [PROTRACTED_SIEGE];
    confirmPendingCapturesFor(state, 'player_1');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'pass',
    }).state;

    expect(space.id).toBe('space-4');
    const resolved = state.board.spaces.find((candidate) => candidate.id === space.id)!;
    expect(resolved.controller).toBe('player_1');
    expect(resolved.capturePendingBy).toBeUndefined();
    expect(state.players.player_2.zones.assetBank).toEqual([PROTRACTED_SIEGE]);
  });

  it('uses a banked copy to delay the current Capture step, then sends it to Graveyard', () => {
    let state = game();
    const space = threatenedTerritory(state);
    state.players.player_2.zones.assetBank = [PROTRACTED_SIEGE];
    confirmPendingCapturesFor(state, 'player_1');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;

    const delayed = state.board.spaces.find((candidate) => candidate.id === space.id)!;
    expect(delayed.controller).toBe('player_2');
    expect(delayed.capturePendingBy).toBe('player_1');
    expect(delayed.overlays?.some((overlay) => overlay.cardId === PROTRACTED_SIEGE)).toBeFalsy();
    expect(state.players.player_2.zones.assetBank).not.toContain(PROTRACTED_SIEGE);
    expect(state.players.player_2.zones.graveyard).toContain(PROTRACTED_SIEGE);

    confirmPendingCapturesFor(state, 'player_1');
    expect(delayed.controller).toBe('player_1');
    expect(delayed.capturePendingBy).toBeUndefined();
  });

  it('lets Counterworks prevent the Asset Overlay, sending its source to Discard and allowing capture', () => {
    let state = game();
    const space = threatenedTerritory(state);
    state.players.player_2.zones.assetBank = [PROTRACTED_SIEGE];
    state.players.player_1.zones.assetBank = [COUNTERWORKS];
    confirmPendingCapturesFor(state, 'player_1');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'counterworks_asset',
      playerId: 'player_1',
      overlayCardId: PROTRACTED_SIEGE,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;

    const resolved = state.board.spaces.find((candidate) => candidate.id === space.id)!;
    expect(resolved.controller).toBe('player_1');
    expect(resolved.capturePendingBy).toBeUndefined();
    expect(state.players.player_2.zones.discard).toContain(PROTRACTED_SIEGE);
    expect(state.players.player_1.zones.graveyard).toContain(COUNTERWORKS);
  });

  it('places an active Battle copy on the lost controlled Territory instead of its normal destination', () => {
    let state = game();
    beginDefenderLoss(state, [played('hand')]);

    state = resolveBattle(state);

    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(state.players.player_2.zones.graveyard).not.toContain(PROTRACTED_SIEGE);
    expect(topTerritoryOverlay(space)).toMatchObject({
      cardId: PROTRACTED_SIEGE,
      owner: 'player_2',
      captureDelayOccupier: 'player_1',
    });
  });

  it('stacks Battle copies and delays one Capture step per exposed copy', () => {
    let state = game();
    beginDefenderLoss(state, [played('hand'), played('battle_draw')]);
    state = resolveBattle(state);
    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(space.overlays).toHaveLength(2);

    confirmPendingCapturesFor(state, 'player_1');
    expect(space.controller).toBe('player_2');
    expect(space.overlays).toHaveLength(1);

    confirmPendingCapturesFor(state, 'player_1');
    expect(space.controller).toBe('player_2');
    expect(space.overlays).toBeUndefined();

    confirmPendingCapturesFor(state, 'player_1');
    expect(space.controller).toBe('player_1');
    expect(state.players.player_2.zones.graveyard.filter((card) => card === PROTRACTED_SIEGE)).toHaveLength(2);
  });

  it('does not use a dormant copy covered by another Overlay', () => {
    const state = game();
    const space = threatenedTerritory(state);
    placeTerritoryOverlay(space, PROTRACTED_SIEGE, 'player_2').captureDelayOccupier = 'player_1';
    placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_2');

    confirmPendingCapturesFor(state, 'player_1');

    expect(space.controller).toBe('player_1');
    expect(space.overlays).toHaveLength(2);
    expect(space.overlays?.[0].cardId).toBe(PROTRACTED_SIEGE);
  });

  it('removes active and dormant copies if their tracked occupier leaves first', () => {
    const state = game();
    const space = threatenedTerritory(state);
    placeTerritoryOverlay(space, PROTRACTED_SIEGE, 'player_2').captureDelayOccupier = 'player_1';
    placeTerritoryOverlay(space, PROTRACTED_SIEGE, 'player_2').captureDelayOccupier = 'player_1';
    placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_2');
    delete space.occupant;
    state.players.player_1.occupiedSpaceId = undefined;

    expect(removeAbandonedProtractedSiegeOverlays(state)).toBe(2);
    expect(space.overlays).toEqual([{ cardId: 'mystics-spirit-hollow', owner: 'player_2', faceUp: true }]);
    expect(state.players.player_2.zones.graveyard.filter((card) => card === PROTRACTED_SIEGE)).toHaveLength(2);
  });

  it('does not place the Battle form when loss benefits are suppressed or the Territory was not controlled', () => {
    let suppressed = game();
    beginDefenderLoss(suppressed, [played('hand')], { lossSuppressed: true });
    suppressed = resolveBattle(suppressed);
    expect(suppressed.board.spaces.find((space) => space.id === 'space-4')?.overlays ?? []).toEqual([]);
    expect(suppressed.players.player_2.zones.graveyard).toContain(PROTRACTED_SIEGE);

    let uncontrolled = game();
    beginDefenderLoss(uncontrolled, [played('battle_draw')], { controlled: false });
    uncontrolled = resolveBattle(uncontrolled);
    expect(uncontrolled.board.spaces.find((space) => space.id === 'space-4')?.overlays ?? []).toEqual([]);
    expect(uncontrolled.players.player_2.zones.discard).toContain(PROTRACTED_SIEGE);
  });
});
