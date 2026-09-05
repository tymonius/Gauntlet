import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  clearV070AssetFaceState,
  isV070AssetUsable,
} from './asset-face-state';
import { discardV070AssetByEffect } from './assets';
import {
  releaseV070BoundCards,
  v070BindingsForHost,
} from './bindings';
import { gainV070Conviction } from './inquisition';

export const V070_RETRIBUTION_ID = 'inquisition-retribution' as const;
export const V070_RETRIBUTION_ASSET_TEXT =
  'After the opponent loses a battle they initiated, you may discard this card. If you do, they choose one: put one of their Assets in their Graveyard; or +2 Conviction. If they have no Assets, +2 Conviction.' as const;

export interface V070PendingRetributionResponse {
  playerId: PlayerId;
  owner: PlayerId;
  sourceInstanceId: string;
  candidateAssetInstanceIds: string[];
  immediateWinner: PlayerId | null;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Physical Retribution copies already declined, used, or negated this Aftermath. */
    retributionProcessedInstanceIds?: string[];
    /** Opponent choice created after a Retribution use successfully applies. */
    pendingRetributionResponse?: V070PendingRetributionResponse | null;
  }
}

export function pendingV070RetributionResponse(
  state: V070GameState,
): V070PendingRetributionResponse | null {
  return state.battleRuntime?.pendingRetributionResponse ?? null;
}

export function v070RetributionEligibleInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || battle.defender !== playerId
    || battle.loser !== battle.attacker
    || state.players[playerId].inquisition === null
    || runtime.assetUseProhibitedPlayers.includes(playerId)) {
    return [];
  }

  const processed = runtime.retributionProcessedInstanceIds ?? [];
  return state.players[playerId].zones.assetBank.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId === V070_RETRIBUTION_ID
    && !processed.includes(instanceId)
    && isV070AssetUsable(state, instanceId)
  );
}

export function markV070RetributionProcessed(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
  reason: 'declined' | 'negated',
): void {
  const runtime = requireAftermathRuntime(state);
  if (state.cardInstances[assetInstanceId]?.owner !== playerId
    || state.cardInstances[assetInstanceId]?.cardId !== V070_RETRIBUTION_ID) {
    throw new V070GameActionError(
      'Retribution processing requires that player’s physical Retribution card.',
    );
  }
  const processed = runtime.retributionProcessedInstanceIds ??= [];
  if (!processed.includes(assetInstanceId)) processed.push(assetInstanceId);

  appendV070Event(state, {
    type: reason === 'declined'
      ? 'retribution_declined'
      : 'retribution_negated',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: assetInstanceId,
      reason,
    },
  });
}

export function applyV070RetributionUse(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
  immediateWinner: PlayerId | null,
): boolean {
  const runtime = requireAftermathRuntime(state);
  if (!v070RetributionEligibleInstanceIds(state, playerId)
    .includes(assetInstanceId)) {
    throw new V070GameActionError(
      'That Retribution is no longer eligible to apply in this Aftermath.',
    );
  }

  const processed = runtime.retributionProcessedInstanceIds ??= [];
  if (!processed.includes(assetInstanceId)) processed.push(assetInstanceId);

  discardV070AssetByEffect(
    state,
    playerId,
    assetInstanceId,
    'Retribution use',
  );

  const opponent = otherPlayer(playerId);
  const candidates = [...state.players[opponent].zones.assetBank];
  appendV070Event(state, {
    type: 'retribution_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: assetInstanceId,
      opponent,
      opponentAssetCount: candidates.length,
    },
  });

  if (candidates.length === 0) {
    gainV070Conviction(
      state,
      playerId,
      2,
      'Retribution: opponent had no Assets',
    );
    appendV070Event(state, {
      type: 'retribution_resolved',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: assetInstanceId,
        choice: 'conviction',
        automatic: true,
      },
    });
    return false;
  }

  runtime.pendingRetributionResponse = {
    playerId: opponent,
    owner: playerId,
    sourceInstanceId: assetInstanceId,
    candidateAssetInstanceIds: candidates,
    immediateWinner,
  };
  appendV070Event(state, {
    type: 'retribution_response_pending',
    actor: opponent,
    visibility: 'public',
    payload: {
      playerId: opponent,
      owner: playerId,
      sourceInstanceId: assetInstanceId,
      candidateAssetCount: candidates.length,
      choices: ['asset', 'conviction'],
    },
  });
  appendV070Event(state, {
    type: 'retribution_response_options',
    actor: opponent,
    visibility: opponent,
    payload: {
      sourceInstanceId: assetInstanceId,
      candidateAssetInstanceIds: candidates,
    },
  });
  return true;
}

export function resolveV070RetributionResponse(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'asset' | 'conviction',
  assetInstanceId?: string,
): PlayerId | null {
  const runtime = requireAftermathRuntime(state);
  const pending = runtime.pendingRetributionResponse;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending Retribution response.',
    );
  }

  if (choice === 'asset') {
    if (!assetInstanceId
      || !pending.candidateAssetInstanceIds.includes(assetInstanceId)
      || !state.players[playerId].zones.assetBank.includes(assetInstanceId)) {
      throw new V070GameActionError(
        'Retribution requires choosing one of the responding player’s banked Assets.',
      );
    }
    putBankedAssetInGraveyardForRetribution(
      state,
      playerId,
      assetInstanceId,
    );
  } else {
    if (assetInstanceId) {
      throw new V070GameActionError(
        'Choosing +2 Conviction does not choose an Asset.',
      );
    }
    gainV070Conviction(
      state,
      pending.owner,
      2,
      'Retribution',
    );
  }

  runtime.pendingRetributionResponse = null;
  appendV070Event(state, {
    type: 'retribution_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      choice,
      assetInstanceId: choice === 'asset' ? assetInstanceId : null,
      automatic: false,
    },
  });
  return pending.immediateWinner;
}

function putBankedAssetInGraveyardForRetribution(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  const bank = state.players[playerId].zones.assetBank;
  const index = bank.indexOf(instanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'Retribution can put only a currently banked Asset in the Graveyard.',
    );
  }
  const cardId = state.cardInstances[instanceId]?.cardId;
  if (!cardId) {
    throw new V070GameActionError(
      `Unknown Asset instance ${instanceId}.`,
    );
  }

  bank.splice(index, 1);
  clearV070AssetFaceState(state, instanceId);
  state.players[playerId].zones.graveyard.push(instanceId);
  state.sanctions = state.sanctions.filter(
    sanction => sanction.instanceId !== instanceId,
  );

  appendV070Event(state, {
    type: 'asset_departed',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId,
      destination: 'graveyard',
      removed: false,
      reason: 'Retribution',
    },
  });

  if (v070BindingsForHost(state, instanceId).length > 0) {
    releaseV070BoundCards(
      state,
      instanceId,
      cardId === 'military-reserve-force' ? 'graveyard' : 'discard',
      cardId === 'military-reserve-force'
        ? 'Reserve Force host left play'
        : 'bound Asset host left play',
    );
  }
}

function requireAftermathRuntime(state: V070GameState) {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime || runtime.stage !== 'aftermath') {
    throw new V070GameActionError(
      'Retribution requires an active battle Aftermath.',
    );
  }
  return runtime;
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

function validateRetributionContract(): void {
  const card = v070CanonicalContent.cardsById.get(V070_RETRIBUTION_ID);
  const actual = card?.effects.find(effect => effect.label === 'Asset')?.text;
  if (actual !== V070_RETRIBUTION_ASSET_TEXT) {
    throw new Error(
      `v0.7.0 Retribution Asset authority drifted: expected ${JSON.stringify(V070_RETRIBUTION_ASSET_TEXT)}, got ${JSON.stringify(actual)}.`,
    );
  }
}

validateRetributionContract();
