import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  discardV070AssetByEffect,
} from './assets';
import {
  isV070AssetActive,
} from './asset-face-state';
import { drawV070Cards } from './card-draw';

export type V070BattleCardAftermathDestination =
  | 'discard'
  | 'graveyard'
  | 'hand'
  | 'asset';

export function initializeV070CounterattackBattle(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || battle.lastStand) return;

  const territory = state.board.find(candidate =>
    candidate.position === battle.contestedPosition
  );
  runtime.counterattackAtOnset =
    territory?.controller === battle.attacker;
}

export function v070BattleIsCounterattack(
  state: V070GameState,
): boolean {
  if (state.battleRuntime) {
    return state.battleRuntime.counterattackAtOnset;
  }
  const battle = state.battle;
  if (!battle || battle.lastStand) return false;
  const territory = state.board.find(candidate =>
    candidate.position === battle.contestedPosition
  );
  return territory?.controller === battle.attacker;
}

export function applyV070CounterattackAssetOnsetEffects(
  state: V070GameState,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || !runtime.counterattackAtOnset) return;

  const playerId = state.battle?.attacker;
  if (!playerId) return;

  const resistanceAssets =
    state.players[playerId].zones.assetBank.filter(instanceId =>
      state.cardInstances[instanceId]?.cardId === 'neutral-resistance'
      && isV070AssetActive(state, instanceId)
    );
  if (resistanceAssets.length === 0) return;

  runtime.participants[playerId].reserveBonus +=
    resistanceAssets.length * 2;

  appendV070Event(state, {
    type: 'counterattack_asset_effect_applied',
    actor: playerId,
    visibility: 'public',
    payload: {
      cardId: 'neutral-resistance',
      instanceIds: [...resistanceAssets],
      reserveBonus: resistanceAssets.length * 2,
      totalReserveBonus:
        runtime.participants[playerId].reserveBonus,
    },
  });
}

export function applyV070FootholdBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) return;

  if (runtime.counterattackAtOnset
    && battle.defender === owner) {
    runtime.participants[owner].advantage += 1;
    if (!runtime.footholdBattleInstanceIds.includes(sourceInstanceId)) {
      runtime.footholdBattleInstanceIds.push(sourceInstanceId);
    }
  }
}

export function applyV070IllegalOccupationBattleEffect(
  state: V070GameState,
  owner: PlayerId,
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime
    || !battle
    || !runtime.counterattackAtOnset
    || battle.attacker !== owner) {
    return;
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  if (!runtime.assetInactivePlayers.includes(opponent)) {
    runtime.assetInactivePlayers.push(opponent);
  }
  runtime.participants[owner].advantage += 1;
}

export function applyV070ResistanceBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime
    || !battle
    || !runtime.counterattackAtOnset
    || battle.attacker !== owner) {
    return;
  }

  runtime.participants[owner].advantage += 1;
  if (!runtime.battleCardBankOnWinInstanceIds.includes(
    sourceInstanceId
  )) {
    runtime.battleCardBankOnWinInstanceIds.push(sourceInstanceId);
  }
}

export function resolveV070FootholdBattleDraws(
  state: V070GameState,
  winner: PlayerId,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;

  for (const instanceId of runtime.footholdBattleInstanceIds) {
    if (state.cardInstances[instanceId]?.owner !== winner) continue;
    drawIntoHand(
      state,
      winner,
      1,
      'Foothold battle effect',
      instanceId,
    );
  }
}

export function v070CounterattackBattleCardAftermathDestination(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  normalDestination: V070BattleCardAftermathDestination,
): V070BattleCardAftermathDestination {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime || !battle) return normalDestination;

  if (battle.winner === playerId
    && runtime.battleCardBankOnWinInstanceIds.includes(instanceId)) {
    return 'asset';
  }
  return normalDestination;
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
    || !runtime.counterattackAtOnset) {
    return false;
  }

  const playerId = battle.winner;
  const eligible = state.players[playerId].zones.assetBank.filter(
    instanceId =>
      state.cardInstances[instanceId]?.cardId === 'neutral-foothold'
      && isV070AssetActive(state, instanceId),
  );
  if (eligible.length === 0) {
    runtime.footholdAssetWindowResolved = true;
    return false;
  }

  runtime.footholdAssetWindowPlayer = playerId;
  runtime.footholdAssetEligibleInstanceIds = [...eligible];

  appendV070Event(state, {
    type: 'foothold_asset_window_opened',
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
  return true;
}

export function useV070FootholdAssetAfterCounterattackWin(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || runtime.aftermathCardsCleared
    || runtime.footholdAssetWindowPlayer !== playerId
    || battle.winner !== playerId
    || battle.defender !== playerId
    || !runtime.counterattackAtOnset) {
    throw new V070GameActionError(
      'Foothold is not pending for that player.',
    );
  }

  if (!runtime.footholdAssetEligibleInstanceIds.includes(
    assetInstanceId,
  )
    || !state.players[playerId].zones.assetBank.includes(
      assetInstanceId,
    )
    || state.cardInstances[assetInstanceId]?.cardId !==
      'neutral-foothold'
    || !isV070AssetActive(state, assetInstanceId)) {
    throw new V070GameActionError(
      'Choose an active banked Foothold from the pending window.',
    );
  }

  discardV070AssetByEffect(
    state,
    playerId,
    assetInstanceId,
    'Foothold',
  );
  drawIntoHand(
    state,
    playerId,
    2,
    'Foothold Asset',
    assetInstanceId,
  );

  appendV070Event(state, {
    type: 'foothold_asset_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      assetInstanceId,
      cardId: 'neutral-foothold',
      drawCount: 2,
    },
  });

  const remaining = runtime.footholdAssetEligibleInstanceIds.filter(
    instanceId =>
      instanceId !== assetInstanceId
      && state.players[playerId].zones.assetBank.includes(instanceId)
      && isV070AssetActive(state, instanceId),
  );
  runtime.footholdAssetEligibleInstanceIds = remaining;
  if (remaining.length === 0) {
    closeFootholdAssetWindow(runtime);
    return;
  }

  appendV070Event(state, {
    type: 'foothold_asset_window_continues',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      eligibleCount: remaining.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'foothold_asset_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      playerId,
      assetInstanceIds: [...remaining],
    },
  });
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
        runtime.footholdAssetEligibleInstanceIds.length,
    },
  });
  closeFootholdAssetWindow(runtime);
}

function closeFootholdAssetWindow(
  runtime: NonNullable<V070GameState['battleRuntime']>,
): void {
  runtime.footholdAssetWindowPlayer = null;
  runtime.footholdAssetEligibleInstanceIds = [];
  runtime.footholdAssetWindowResolved = true;
}

function drawIntoHand(
  state: V070GameState,
  playerId: PlayerId,
  count: number,
  purpose: string,
  sourceInstanceId: string,
): void {
  const result = drawV070Cards(
    state,
    playerId,
    count,
    purpose,
  );
  state.players[playerId].zones.hand.push(...result.drawn);

  appendV070Event(state, {
    type: 'cards_drawn',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: result.drawn.length,
      purpose,
      sourceInstanceId,
      reshuffles: result.reshuffles,
      exhausted: result.exhausted,
    },
  });
  if (result.drawn.length > 0) {
    appendV070Event(state, {
      type: 'drawn_card_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        cardInstanceIds: [...result.drawn],
        purpose,
        sourceInstanceId,
      },
    });
  }
}
