import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  isV070AssetActive,
  turnV070AssetFaceDownUntilPlayerNextTurn,
} from './asset-face-state';

function game(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'illegal-occupation-asset-test',
    seed: 'illegal-occupation-asset-seed',
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
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function injectBanked(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `illegal-occupation-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.assetBank.push(instanceId);
  return instanceId;
}

function occupyOpponentTerritory(
  state: V070GameState,
  occupier: 'A' | 'B',
  controller: 'A' | 'B',
  boardIndex: number,
): void {
  const territory = state.board[boardIndex];
  territory.controller = controller;
  territory.occupant = occupier;
  state.players[occupier].position = territory.position;
}

describe('v0.7.0 Illegal Occupation Asset', () => {
  test('locks the released Asset text', () => {
    const card = v070CanonicalContent.cardsById.get(
      'neutral-illegal-occupation',
    );
    expect(card?.effects).toContainEqual({
      label: 'Asset',
      text: 'While the opponent occupies a Territory you control, their Assets are inactive.',
    });
  });

  test('suppresses the occupying opponent’s Asset Bank only while Occupation persists', () => {
    const state = game();
    const illegalOccupation = injectBanked(
      state,
      'A',
      'neutral-illegal-occupation',
      'source',
    );
    const opponentAsset = injectBanked(
      state,
      'B',
      'neutral-resistance',
      'target',
    );

    occupyOpponentTerritory(state, 'B', 'A', 2);

    expect(isV070AssetActive(state, illegalOccupation)).toBe(true);
    expect(isV070AssetActive(state, opponentAsset)).toBe(false);

    state.board[2].controller = 'B';
    expect(isV070AssetActive(state, opponentAsset)).toBe(true);
  });

  test('a face-down Illegal Occupation does not suppress the opponent’s Assets', () => {
    const state = game();
    const illegalOccupation = injectBanked(
      state,
      'A',
      'neutral-illegal-occupation',
      'face-down-source',
    );
    const opponentAsset = injectBanked(
      state,
      'B',
      'neutral-resistance',
      'face-down-target',
    );
    occupyOpponentTerritory(state, 'B', 'A', 2);

    expect(isV070AssetActive(state, opponentAsset)).toBe(false);

    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: illegalOccupation,
      changedBy: 'B',
      restoreAtPlayer: 'B',
      reason: 'Illegal Occupation source suppression test',
    });

    expect(isV070AssetActive(state, illegalOccupation)).toBe(false);
    expect(isV070AssetActive(state, opponentAsset)).toBe(true);
  });

  test('opposing qualifying copies resolve stably and can suppress both Asset Banks at once', () => {
    const state = game();
    injectBanked(
      state,
      'A',
      'neutral-illegal-occupation',
      'mutual-source-a',
    );
    injectBanked(
      state,
      'B',
      'neutral-illegal-occupation',
      'mutual-source-b',
    );
    const aAsset = injectBanked(
      state,
      'A',
      'neutral-resistance',
      'mutual-target-a',
    );
    const bAsset = injectBanked(
      state,
      'B',
      'neutral-resistance',
      'mutual-target-b',
    );

    occupyOpponentTerritory(state, 'A', 'B', 1);
    occupyOpponentTerritory(state, 'B', 'A', 4);

    expect(isV070AssetActive(state, aAsset)).toBe(false);
    expect(isV070AssetActive(state, bAsset)).toBe(false);
  });
});
