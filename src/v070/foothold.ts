import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { drawV070Cards } from './card-draw';
import { discardV070AssetByEffect } from './assets';
import { isV070AssetActive } from './asset-face-state';
import { isV070CounterattackBattle } from './resistance';

export const V070_FOOTHOLD_ID = 'neutral-foothold' as const;

export function v070FootholdAssetEligibleInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.assetBank.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId === V070_FOOTHOLD_ID
    && isV070AssetActive(state, instanceId)
  );
}

export function openV070FootholdAssetAftermathWindow(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || runtime.aftermathCardsCleared
    || runtime.footholdAssetWindowResolved
    || !battle.winner
    || battle.winner !== battle.defender
    || !isV070CounterattackBattle(state)) {
    return false;
  }

  const playerId = battle.winner;
  const eligible = v070FootholdAssetEligibleInstanceIds(
    state,
    playerId,
  );
  if (eligible.length === 0) {
    runtime.footholdAssetWindowResolved = true;
    return false;
  }

  runtime.footholdAssetWindowPlayer = playerId;
  appendFootholdWindowEvents(state, playerId, eligible, 'opened');
  return true;
}

export function useV070FootholdAssetAfterCounterattackWin(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || runtime.aftermathCardsCleared
    || runtime.footholdAssetWindowPlayer !== playerId
    || battle.winner !== playerId
    || battle.defender !== playerId
    || !isV070CounterattackBattle(state)) {
    throw new V070GameActionError(
      'Foothold is not pending for that player.',
    );
  }

  const eligible = v070FootholdAssetEligibleInstanceIds(
    state,
    playerId,
  );
  if (!eligible.includes(assetInstanceId)) {
    throw new V070GameActionError(
      'Choose an active banked Foothold from the pending window.',
    );
  }

  const rendition = state.players[playerId].zones.assetBank.find(
    instanceId =>
      state.cardInstances[instanceId]?.cardId ===
        'intelligence-extraordinary-rendition'
      && isV070AssetActive(state, instanceId),
  );
  if (rendition) {
    discardV070AssetByEffect(
      state,
      playerId,
      rendition,
      'Extraordinary Rendition before Foothold',
    );
  }

  discardV070AssetByEffect(
    state,
    playerId,
    assetInstanceId,
    'Foothold Asset',
  );

  const draw = drawV070Cards(
    state,
    playerId,
    2,
    'Foothold Asset',
  );
  state.players[playerId].zones.hand.push(...draw.drawn);

  appendV070Event(state, {
    type: 'foothold_asset_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      assetInstanceId,
      cardId: V070_FOOTHOLD_ID,
      renditionDiscardedInstanceId: rendition ?? null,
      drawCount: draw.drawn.length,
      reshuffles: draw.reshuffles,
      exhausted: draw.exhausted,
    },
  });
  appendV070Event(state, {
    type: 'cards_drawn',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: draw.drawn.length,
      purpose: 'Foothold Asset',
      sourceInstanceId: assetInstanceId,
      reshuffles: draw.reshuffles,
      exhausted: draw.exhausted,
    },
  });
  if (draw.drawn.length > 0) {
    appendV070Event(state, {
      type: 'drawn_card_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        cardInstanceIds: [...draw.drawn],
        purpose: 'Foothold Asset',
        sourceInstanceId: assetInstanceId,
      },
    });
  }

  const remaining = v070FootholdAssetEligibleInstanceIds(
    state,
    playerId,
  );
  if (remaining.length > 0) {
    appendFootholdWindowEvents(
      state,
      playerId,
      remaining,
      'continues',
    );
    return true;
  }

  closeFootholdWindow(state);
  return false;
}

export function passV070FootholdAssetAfterCounterattackWin(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = state.battleRuntime;
  if (!runtime
    || runtime.footholdAssetWindowPlayer !== playerId) {
    throw new V070GameActionError(
      'Foothold is not pending for that player.',
    );
  }

  appendV070Event(state, {
    type: 'foothold_asset_window_declined',
    actor: playerId,
    visibility: 'public',
    payload: {
      remainingCount:
        v070FootholdAssetEligibleInstanceIds(state, playerId).length,
    },
  });
  closeFootholdWindow(state);
}

function appendFootholdWindowEvents(
  state: V070GameState,
  playerId: PlayerId,
  eligible: readonly string[],
  stateLabel: 'opened' | 'continues',
): void {
  appendV070Event(state, {
    type: stateLabel === 'opened'
      ? 'foothold_asset_window_opened'
      : 'foothold_asset_window_continues',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      eligibleCount: eligible.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'foothold_asset_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      playerId,
      assetInstanceIds: [...eligible],
    },
  });
}

function closeFootholdWindow(state: V070GameState): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.footholdAssetWindowPlayer = null;
  runtime.footholdAssetWindowResolved = true;
}
