import {
  v070CanonicalContent,
  type V070CanonicalCard,
} from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_SUPPORTED_ASSET_RUNTIME_IDS = new Set([
  'diplomats-detente',
  'diplomats-good-faith',
  'diplomats-neutral-observers',
  'diplomats-safe-conduct',
  'diplomats-plenipotentiary',
] as const);

const REMOVAL_LIFECYCLE_UNSUPPORTED = new Set([
  'neutral-contingency-plan',
  'military-reserve-force',
  'intelligence-extraordinary-rendition',
  'financiers-margin-loan',
  'intelligence-sleeper-network',
]);

export type V070AssetAction = {
  type: 'resolve_asset_limit_removal';
  playerId: PlayerId;
  instanceIds: readonly string[];
};

export function reduceV070AssetAction(
  state: V070GameState,
  action: V070AssetAction,
): V070GameState {
  if (state.stage !== 'playing') {
    throw new V070GameActionError('Asset actions require an active v0.7.0 game.');
  }

  const next = structuredClone(state) as V070GameState;
  resolveV070AssetLimitRemoval(next, action.playerId, action.instanceIds);
  return next;
}

export interface V070BankAssetOptions {
  replaceAssetInstanceId?: string;
  purpose: string;
  allowSpecialBanking?: boolean;
}

export function effectiveV070AssetLimit(
  state: V070GameState,
  playerId: PlayerId,
): number {
  const embargoCount = state.sanctions.filter(sanction =>
    sanction.opponent === playerId
    && sanction.kind === 'asset'
    && state.cardInstances[sanction.instanceId]?.cardId === 'diplomats-sanctions-embargo'
    && state.players[sanction.owner].zones.assetBank.includes(sanction.instanceId)
  ).length;

  return Math.max(
    0,
    state.players[playerId].controlledTerritories.length - embargoCount,
  );
}

export function bankableV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const player = state.players[playerId];
  const replaceable = replaceableV070AssetInstanceIds(state, playerId);
  const hasCapacity = player.zones.assetBank.length < effectiveV070AssetLimit(state, playerId);

  return player.zones.hand.filter(instanceId => {
    const card = canonicalCardForInstance(state, instanceId);
    if (!cardHasAssetEffect(card)) return false;
    if (!v070AssetRuntimeSupported(card.id)) return false;
    if (violatesSingleBankedCopy(state, playerId, card)) return false;
    return hasCapacity || replaceable.length > 0;
  });
}

export function inherentBankActionV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return bankableV070AssetInstanceIds(state, playerId).filter(instanceId => {
    const card = canonicalCardForInstance(state, instanceId);
    return !cardHasSpecialBankingAction(card);
  });
}

export function bankV070AssetWithInherentAction(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  replaceAssetInstanceId?: string,
): void {
  const card = canonicalCardForInstance(state, instanceId);
  if (!cardHasAssetEffect(card)) {
    throw new V070GameActionError(
      'The inherent Bank Action requires a card with an Asset effect.',
    );
  }
  if (cardHasSpecialBankingAction(card)) {
    throw new V070GameActionError(
      `${card.name} has a printed banking Action that overrides the inherent Bank procedure.`,
    );
  }

  bankV070AssetFromHand(state, playerId, instanceId, {
    replaceAssetInstanceId,
    purpose: 'Inherent Bank Action',
  });
}

export function voluntarilyDiscardableV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return replaceableV070AssetInstanceIds(state, playerId);
}

export function discardV070AssetAsAction(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  const discardable = voluntarilyDiscardableV070AssetInstanceIds(state, playerId);
  if (!discardable.includes(instanceId)) {
    if (!state.players[playerId].zones.assetBank.includes(instanceId)) {
      throw new V070GameActionError('That card is not a controlled banked Asset.');
    }
    throw new V070GameActionError('That Asset cannot be voluntarily discarded now.');
  }

  removeBankedAssetToDiscard(
    state,
    playerId,
    instanceId,
    'Discard Asset as an Action',
    false,
  );
}

export function bankV070AssetFromHand(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  options: V070BankAssetOptions,
): void {
  const player = state.players[playerId];
  const handIndex = player.zones.hand.indexOf(instanceId);
  if (handIndex < 0) {
    throw new V070GameActionError('That Asset card is not in the player’s Hand.');
  }

  const card = canonicalCardForInstance(state, instanceId);
  const inherentBanking = cardHasAssetEffect(card);
  const specialBanking = Boolean(options.allowSpecialBanking)
    && /^Asset(?:\b| with\b)/i.test(card.card_form ?? '');

  if (!inherentBanking && !specialBanking) {
    throw new V070GameActionError('That Hand card cannot legally be banked as an Asset now.');
  }
  if (inherentBanking && !v070AssetRuntimeSupported(card.id)) {
    throw new V070GameActionError(
      `${card.name} cannot be banked yet because its persistent Asset effect is not executable in v0.7.0.`,
    );
  }
  if (violatesSingleBankedCopy(state, playerId, card)) {
    throw new V070GameActionError('That Asset violates its single-banked-copy restriction.');
  }

  const limit = effectiveV070AssetLimit(state, playerId);
  const atLimit = player.zones.assetBank.length >= limit;
  const replacement = options.replaceAssetInstanceId;

  if (atLimit) {
    if (!replacement) {
      throw new V070GameActionError('Banking at the Asset limit requires choosing a replaceable Asset.');
    }
    const replaceable = replaceableV070AssetInstanceIds(state, playerId);
    if (!replaceable.includes(replacement)) {
      throw new V070GameActionError('That banked Asset cannot be replaced now.');
    }
    removeBankedAssetToDiscard(
      state,
      playerId,
      replacement,
      options.purpose,
      false,
    );
    appendV070Event(state, {
      type: 'asset_replaced',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: replacement,
        cardId: state.cardInstances[replacement]?.cardId,
        purpose: options.purpose,
      },
    });
  } else if (replacement) {
    throw new V070GameActionError(
      'Asset replacement is available only when banking at the Asset limit.',
    );
  }

  player.zones.hand.splice(handIndex, 1);
  player.zones.assetBank.push(instanceId);
  appendV070Event(state, {
    type: 'asset_banked',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: card.id,
      purpose: options.purpose,
      effectiveLimit: effectiveV070AssetLimit(state, playerId),
    },
  });
}

export function openV070AssetLimitEnforcement(
  state: V070GameState,
  playerId: PlayerId,
  reason: string,
  sourceInstanceId: string | null = null,
): boolean {
  const limit = effectiveV070AssetLimit(state, playerId);
  const excess = Math.max(0, state.players[playerId].zones.assetBank.length - limit);

  if (excess === 0) {
    if (state.pendingAssetLimitChoice?.playerId === playerId) {
      state.pendingAssetLimitChoice = null;
    }
    return false;
  }

  state.pendingAssetLimitChoice = {
    playerId,
    effectiveLimit: limit,
    excess,
    reason,
    sourceInstanceId,
  };

  appendV070Event(state, {
    type: 'asset_limit_enforcement_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      effectiveLimit: limit,
      bankedAssets: state.players[playerId].zones.assetBank.length,
      excess,
      reason,
      sourceInstanceId,
    },
  });
  return true;
}

export function resolveV070AssetLimitRemoval(
  state: V070GameState,
  playerId: PlayerId,
  instanceIds: readonly string[],
): void {
  const pending = state.pendingAssetLimitChoice;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError('No Asset-limit removal choice is pending for that player.');
  }

  const limit = effectiveV070AssetLimit(state, playerId);
  const excess = Math.max(0, state.players[playerId].zones.assetBank.length - limit);
  if (excess === 0) {
    state.pendingAssetLimitChoice = null;
    return;
  }

  if (instanceIds.length !== excess || new Set(instanceIds).size !== instanceIds.length) {
    throw new V070GameActionError(
      `Asset-limit enforcement requires exactly ${excess} Asset removal(s).`,
    );
  }

  const bank = state.players[playerId].zones.assetBank;
  for (const instanceId of instanceIds) {
    if (!bank.includes(instanceId)) {
      throw new V070GameActionError('Asset-limit removals must come from the player’s Asset Bank.');
    }
  }

  assertForcedRemovalLifecycleSupported(state, playerId, instanceIds);

  const extraordinary = bank.find(instanceId =>
    state.cardInstances[instanceId]?.cardId === 'intelligence-extraordinary-rendition'
  );
  if (extraordinary && instanceIds[0] !== extraordinary) {
    throw new V070GameActionError(
      'Extraordinary Rendition must be discarded before any other Asset, if able.',
    );
  }

  for (const instanceId of instanceIds) {
    removeBankedAssetToDiscard(
      state,
      playerId,
      instanceId,
      pending.reason,
      true,
    );
  }

  state.pendingAssetLimitChoice = null;
  appendV070Event(state, {
    type: 'asset_limit_enforcement_complete',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      effectiveLimit: effectiveV070AssetLimit(state, playerId),
      removedInstanceIds: [...instanceIds],
      reason: pending.reason,
      sourceInstanceId: pending.sourceInstanceId,
    },
  });
}

export function replaceableV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const bank = state.players[playerId].zones.assetBank;
  const extraordinary = bank.find(instanceId =>
    state.cardInstances[instanceId]?.cardId === 'intelligence-extraordinary-rendition'
  );

  // Extraordinary Rendition must leave before other Assets, but its bound-card
  // lifecycle is not yet represented in the v0.7.0 authoritative state.
  if (extraordinary) return [];

  return bank.filter(instanceId => {
    const card = canonicalCardForInstance(state, instanceId);
    const assetText = card.effects
      .filter(effect => effect.label === 'Asset')
      .map(effect => effect.text)
      .join(' ');
    if (/cannot voluntarily discard this card at another time/i.test(assetText)) return false;
    if (/cannot voluntarily cause it to leave play during the turn it is banked/i.test(assetText)) {
      return false;
    }
    return true;
  });
}

function removeBankedAssetToDiscard(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  reason: string,
  removed: boolean,
): void {
  const bank = state.players[playerId].zones.assetBank;
  const index = bank.indexOf(instanceId);
  if (index < 0) {
    throw new V070GameActionError('That Asset is no longer banked.');
  }

  const cardId = state.cardInstances[instanceId]?.cardId;
  if (!cardId) throw new V070GameActionError(`Unknown Asset instance ${instanceId}.`);

  bank.splice(index, 1);
  state.players[playerId].zones.discardPile.push(instanceId);
  state.sanctions = state.sanctions.filter(
    sanction => sanction.instanceId !== instanceId,
  );

  appendV070Event(state, {
    type: removed ? 'asset_removed' : 'asset_discarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId,
      destination: 'discard',
      removed,
      reason,
    },
  });
}

function assertForcedRemovalLifecycleSupported(
  state: V070GameState,
  playerId: PlayerId,
  selected?: readonly string[],
): void {
  const candidates = selected ?? state.players[playerId].zones.assetBank;
  const unsupported = candidates.find(instanceId =>
    REMOVAL_LIFECYCLE_UNSUPPORTED.has(state.cardInstances[instanceId]?.cardId ?? '')
  );
  if (!unsupported) return;

  const cardId = state.cardInstances[unsupported]?.cardId;
  throw new V070GameActionError(
    `Forced Asset Removal for ${cardId} is unsupported until its bound-card lifecycle is represented.`,
  );
}

function violatesSingleBankedCopy(
  state: V070GameState,
  playerId: PlayerId,
  card: V070CanonicalCard,
): boolean {
  const restrictionText = card.effects.map(effect => effect.text).join(' ');
  if (!/only one banked|cannot bank it while you control another banked/i.test(restrictionText)) {
    return false;
  }
  return state.players[playerId].zones.assetBank.some(instanceId =>
    state.cardInstances[instanceId]?.cardId === card.id
  );
}

function canonicalCardForInstance(
  state: V070GameState,
  instanceId: string,
): V070CanonicalCard {
  const cardId = state.cardInstances[instanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card) throw new V070GameActionError(`Unknown card instance ${instanceId}.`);
  return card;
}

export function v070AssetRuntimeSupported(cardId: string): boolean {
  return V070_SUPPORTED_ASSET_RUNTIME_IDS.has(
    cardId as typeof V070_SUPPORTED_ASSET_RUNTIME_IDS extends Set<infer T> ? T : never,
  );
}

function cardHasSpecialBankingAction(card: V070CanonicalCard): boolean {
  return card.effects.some(effect =>
    effect.label === 'Action'
    && /\bbank this card\b/i.test(effect.text)
  );
}

function cardHasAssetEffect(card: V070CanonicalCard): boolean {
  return card.effects.some(effect => effect.label === 'Asset');
}
