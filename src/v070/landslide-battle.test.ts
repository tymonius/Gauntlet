import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  cardEligibleForV070BattleRole,
  reduceV070BattleAction,
} from './battle-engine';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import {
  V070_LANDSLIDE_BATTLE_TEXT,
  pendingV070LandslideAftermath,
} from './landslide';
import { placeV070OverlayFromBattle } from './overlays';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'landslide-battle-test',
    seed: 'landslide-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
      },
    },
  });

  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

function injectHandCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `landslide-battle-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function revealGambits(
  state: V070GameState,
  aCard?: string,
  bCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bCard,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function toOutcome(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function defenderLosesWithLandslide(): {
  state: V070GameState;
  landslide: string;
  territoryInstanceId: string;
} {
  let state = startBattle();
  const territory = state.board.find(
    space => space.position === state.battle!.contestedPosition,
  )!;
  const landslide = injectHandCard(
    state,
    'B',
    'neutral-landslide',
    'loss',
  );
  state = revealGambits(state, undefined, landslide);
  state = toOutcome(state);
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [6],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [1],
  });
  expect(state.battle?.loser).toBe('B');
  expect(state.battle?.positions.B).not.toBe(state.battle?.contestedPosition);
  return {
    state,
    landslide,
    territoryInstanceId: territory.territoryInstanceId,
  };
}

function unsupportedGambit(
  state: V070GameState,
  owner: 'A' | 'B',
): string {
  const card = Object.values(state.cardInstances).find(instance =>
    instance.owner === owner
    && cardEligibleForV070BattleRole(instance.cardId, 'gambit')
    && !v070BattleEffectHandler(instance.cardId)
  );
  if (!card) {
    throw new Error('Fixture has no unsupported Gambit.');
  }
  const player = state.players[owner];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(card.instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones.hand.push(card.instanceId);
  return card.instanceId;
}

describe('v0.7.0 Landslide battle Overlay', () => {
  test('locks Landslide to the released Gambit/Tactic text and advertises it as supported', () => {
    const card = v070CanonicalContent.cardsById.get('neutral-landslide');
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_LANDSLIDE_BATTLE_TEXT);
    expect(v070BattleEffectHandler('neutral-landslide')?.expectedText)
      .toBe(V070_LANDSLIDE_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain('neutral-landslide');
  });

  test('registers Landslide at reveal without weakening unsupported-effect atomicity', () => {
    let supported = startBattle();
    const landslide = injectHandCard(
      supported,
      'B',
      'neutral-landslide',
      'register',
    );
    supported = revealGambits(supported, undefined, landslide);

    expect(supported.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(supported.battleRuntime?.landslideBattleInstanceIds)
      .toEqual([landslide]);
    expect(supported.battleRuntime?.stage).toBe('choose_tactics');

    let blocked = startBattle();
    const blockedLandslide = injectHandCard(
      blocked,
      'A',
      'neutral-landslide',
      'blocked',
    );
    const unsupported = unsupportedGambit(blocked, 'B');
    blocked = revealGambits(blocked, blockedLandslide, unsupported);

    expect(blocked.battleRuntime?.stage).toBe('halted');
    expect(blocked.battleRuntime?.landslideBattleInstanceIds ?? [])
      .not.toContain(blockedLandslide);
    expect(blocked.battleRuntime?.unsupportedEffects.some(effect =>
      effect.instanceId === unsupported
    )).toBe(true);
  });

  test('opens the optional placement only after the loser has retreated and before cards clear', () => {
    let { state, landslide, territoryInstanceId } =
      defenderLosesWithLandslide();

    expect(pendingV070LandslideAftermath(state)).toBeNull();
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime?.aftermathCardsCleared).toBe(false);
    expect(pendingV070LandslideAftermath(state)).toEqual({
      playerId: 'B',
      candidateInstanceIds: [landslide],
      territoryInstanceId,
    });
    expect(state.overlays.some(overlay => overlay.instanceId === landslide))
      .toBe(false);

    const ownerView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(ownerView.pendingLandslideAftermath).toEqual({
      playerId: 'B',
      territoryInstanceId,
      candidateCount: 1,
      candidateInstanceIds: [landslide],
    });
    expect(opponentView.pendingLandslideAftermath).toEqual({
      playerId: 'B',
      territoryInstanceId,
      candidateCount: 1,
    });
  });

  test('placing Landslide attaches the physical battle card; declining leaves its normal Gambit destination intact', () => {
    let placed = defenderLosesWithLandslide();
    placed.state = reduceV070BattleAction(placed.state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    placed.state = reduceV070BattleAction(placed.state, {
      type: 'resolve_landslide_aftermath',
      playerId: 'B',
      sourceInstanceId: placed.landslide,
    });

    expect(placed.state.overlays).toContainEqual(expect.objectContaining({
      instanceId: placed.landslide,
      owner: 'B',
      territoryInstanceId: placed.territoryInstanceId,
    }));
    expect(placed.state.players.B.zones.graveyard)
      .not.toContain(placed.landslide);
    expect(placed.state.players.B.zones.discardPile)
      .not.toContain(placed.landslide);

    let declined = defenderLosesWithLandslide();
    declined.state = reduceV070BattleAction(declined.state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    declined.state = reduceV070BattleAction(declined.state, {
      type: 'resolve_landslide_aftermath',
      playerId: 'B',
    });

    expect(declined.state.overlays.some(overlay =>
      overlay.instanceId === declined.landslide
    )).toBe(false);
    expect(declined.state.players.B.zones.graveyard)
      .toContain(declined.landslide);
  });

  test('does not offer placement after a win or when the contested Territory already has any Landslide in its Overlay stack', () => {
    let winner = startBattle();
    const winnerLandslide = injectHandCard(
      winner,
      'B',
      'neutral-landslide',
      'winner',
    );
    winner = revealGambits(winner, undefined, winnerLandslide);
    winner = toOutcome(winner);
    winner = reduceV070BattleAction(winner, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    winner = reduceV070BattleAction(winner, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });
    winner = reduceV070BattleAction(winner, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(pendingV070LandslideAftermath(winner)).toBeNull();
    expect(winner.players.B.zones.graveyard).toContain(winnerLandslide);

    let blocked = defenderLosesWithLandslide();
    const territory = blocked.state.board.find(candidate =>
      candidate.territoryInstanceId === blocked.territoryInstanceId
    )!;
    const existing = `existing-landslide-${territory.territoryInstanceId}`;
    blocked.state.cardInstances[existing] = {
      instanceId: existing,
      cardId: 'neutral-landslide',
      owner: 'A',
    };
    placeV070OverlayFromBattle(
      blocked.state,
      'A',
      existing,
      territory.position,
      'existing Landslide test',
    );
    const cover = `landslide-cover-${territory.territoryInstanceId}`;
    blocked.state.cardInstances[cover] = {
      instanceId: cover,
      cardId: 'neutral-battlefield-plunder',
      owner: 'A',
    };
    placeV070OverlayFromBattle(
      blocked.state,
      'A',
      cover,
      territory.position,
      'covered Landslide test',
    );

    blocked.state = reduceV070BattleAction(blocked.state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(pendingV070LandslideAftermath(blocked.state)).toBeNull();
    expect(blocked.state.players.B.zones.graveyard)
      .toContain(blocked.landslide);
    expect(blocked.state.overlays.some(overlay => overlay.instanceId === existing))
      .toBe(true);
  });
});
