import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { CardID, GameState } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import {
  captureDecoysAssetSnapshot,
  openNextDecoysChoice,
  registerDecoysAssetExits,
  resolveDecoysChoice,
} from './neutral-decoys';
import { DECOYS } from './neutral-decoys-battle';
import { initializeGame } from './initialize';
import { registerRedemptionDiscardCardIds } from './neutral-redemption';

const ASSET_A = 'neutral-entrenchment';
const ASSET_B = 'neutral-fortifications';
const REDEMPTION = 'neutral-redemption';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-decoys-replacement-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Source',
        factionId: 'military',
        leaderName: 'General',
        deck: ['neutral-sedition'],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Protected',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [DECOYS, DECOYS, ASSET_A, ASSET_B],
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

function moveAssets(
  state: GameState,
  cardIds: CardID[],
  destination: 'hand' | 'discard' | 'graveyard' | 'removed',
): ReturnType<typeof captureDecoysAssetSnapshot> {
  const before = captureDecoysAssetSnapshot(state);
  for (const cardId of cardIds) {
    const index = state.players.player_2.zones.assetBank.indexOf(cardId);
    if (index < 0) throw new Error(`${cardId} is not banked in the test fixture.`);
    state.players.player_2.zones.assetBank.splice(index, 1);
    state.players.player_2.zones[destination].push(cardId);
  }
  return before;
}

function pendingTargetKey(state: GameState, cardId: CardID): string {
  const pending = state.pendingNeutralChoice;
  if (!pending || pending.kind !== 'decoys_asset') throw new Error('No Decoys choice is pending.');
  const target = pending.assetOptions.find((asset) => asset.cardId === cardId);
  if (!target) throw new Error(`${cardId} is not a pending Decoys target.`);
  return target.exitId;
}

describe('Neutral Decoys Action replacement', () => {
  it('registers both forms and banks its Action as an Asset', () => {
    expect(getCardPlayRule(DECOYS)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_2.actionsRemaining = 1;
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.players.player_2.zones.hand = [DECOYS];
    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_2', cardId: DECOYS,
    }).state;
    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS]);
  });

  it('keeps affected Assets provisionally in play while the response is pending', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET_A];
    const before = moveAssets(state, [ASSET_A], 'discard');

    expect(registerDecoysAssetExits(state, before, 'player_1')).toBe(1);
    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS, ASSET_A]);
    expect(state.players.player_2.zones.discard).not.toContain(ASSET_A);
    expect(openNextDecoysChoice(state)).toBe(true);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'decoys_asset', playerId: 'player_2',
    });
  });

  it('reapplies the original exit when the controller declines', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET_A];
    const before = moveAssets(state, [ASSET_A], 'graveyard');
    registerDecoysAssetExits(state, before, 'player_1');
    openNextDecoysChoice(state);

    const result = resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'pass',
    });

    expect(result).toMatchObject({ decoysFinalized: true, discardedCardIds: [] });
    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS]);
    expect(state.players.player_2.zones.graveyard).toContain(ASSET_A);
  });

  it('discards Decoys and leaves the selected affected Asset in play', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET_A];
    const before = moveAssets(state, [ASSET_A], 'discard');
    registerDecoysAssetExits(state, before, 'player_1');
    openNextDecoysChoice(state);

    const result = resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: pendingTargetKey(state, ASSET_A),
    });

    expect(result).toMatchObject({ decoysFinalized: true, discardedCardIds: [] });
    expect(state.players.player_2.zones.assetBank).toEqual([ASSET_A]);
    expect(state.players.player_2.zones.discard).toContain(DECOYS);
    expect(state.players.player_2.zones.discard).not.toContain(ASSET_A);
  });

  it('applies every unprotected exit only after the final choice', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET_A, ASSET_B];
    const before = moveAssets(state, [ASSET_A, ASSET_B], 'discard');
    registerDecoysAssetExits(state, before, 'player_1');
    openNextDecoysChoice(state);

    const result = resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: pendingTargetKey(state, ASSET_A),
    });

    expect(result.discardedCardIds).toEqual([ASSET_B]);
    expect(state.players.player_2.zones.assetBank).toEqual([ASSET_A]);
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining([DECOYS, ASSET_B]));
    expect(state.players.player_2.zones.discard).not.toContain(ASSET_A);
  });

  it('can use a Decoys copy that was itself affected to preserve another Asset', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET_A];
    const before = moveAssets(state, [DECOYS, ASSET_A], 'graveyard');
    registerDecoysAssetExits(state, before, 'player_1');
    openNextDecoysChoice(state);

    resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: pendingTargetKey(state, ASSET_A),
    });

    expect(state.players.player_2.zones.assetBank).toEqual([ASSET_A]);
    expect(state.players.player_2.zones.discard).toContain(DECOYS);
    expect(state.players.player_2.zones.graveyard).not.toContain(DECOYS);
    expect(state.players.player_2.zones.graveyard).not.toContain(ASSET_A);
  });

  it('uses separate copies to preserve separate affected Assets', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, DECOYS, ASSET_A, ASSET_B];
    const before = moveAssets(state, [ASSET_A, ASSET_B], 'discard');
    registerDecoysAssetExits(state, before, 'player_1');
    openNextDecoysChoice(state);

    let result = resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: pendingTargetKey(state, ASSET_A),
    });
    expect(result.decoysFinalized).toBe(false);
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'decoys_asset' });

    result = resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: pendingTargetKey(state, ASSET_B),
    });
    expect(result.decoysFinalized).toBe(true);
    expect(state.players.player_2.zones.assetBank).toEqual(expect.arrayContaining([ASSET_A, ASSET_B]));
    expect(state.players.player_2.zones.discard.filter((cardId) => cardId === DECOYS)).toHaveLength(2);
  });

  it('preserves the face state of an affected face-down Asset', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET_A];
    state.players.player_2.faceDownAssets = [ASSET_A];
    const before = moveAssets(state, [ASSET_A], 'discard');
    state.players.player_2.faceDownAssets = undefined;
    registerDecoysAssetExits(state, before, 'player_1');
    openNextDecoysChoice(state);

    expect(state.players.player_2.faceDownAssets).toEqual([ASSET_A]);
    resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: pendingTargetKey(state, ASSET_A),
    });
    expect(state.players.player_2.zones.assetBank).toContain(ASSET_A);
    expect(state.players.player_2.faceDownAssets).toEqual([ASSET_A]);
  });

  it('exposes only unprotected opposing discards to Redemption', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, REDEMPTION, ASSET_A, ASSET_B];
    const before = moveAssets(state, [ASSET_A, ASSET_B], 'discard');
    registerDecoysAssetExits(state, before, 'player_1');
    openNextDecoysChoice(state);

    const result = resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: pendingTargetKey(state, ASSET_A),
    });
    expect(result.discardedCardIds).toEqual([ASSET_B]);
    expect(registerRedemptionDiscardCardIds(
      state,
      'player_2',
      result.discardedCardIds,
      'player_1',
    )).toBe(1);
    expect(state.neutralRedemptionDiscardQueue).toContainEqual(expect.objectContaining({
      playerId: 'player_2',
      sourcePlayerId: 'player_1',
      cardIds: [ASSET_B],
    }));
    expect(state.neutralRedemptionDiscardQueue?.[0].cardIds).not.toContain(DECOYS);
    expect(state.neutralRedemptionDiscardQueue?.[0].cardIds).not.toContain(ASSET_A);
  });

  it('does not respond to the controller own effect or from an inactive copy', () => {
    const own = game();
    own.players.player_2.zones.assetBank = [DECOYS, ASSET_A];
    let before = moveAssets(own, [ASSET_A], 'discard');
    expect(registerDecoysAssetExits(own, before, 'player_2')).toBe(0);

    const inactive = game();
    inactive.players.player_2.zones.assetBank = [DECOYS, ASSET_A];
    inactive.players.player_2.faceDownAssets = [DECOYS];
    before = moveAssets(inactive, [ASSET_A], 'discard');
    expect(registerDecoysAssetExits(inactive, before, 'player_1')).toBe(0);
  });
});
