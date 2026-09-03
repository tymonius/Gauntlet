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
import { drawV070Cards } from './card-draw';
import {
  releaseV070BoundCards,
  releaseV070BoundCardsForPurpose,
  v070BindingsForHost,
} from './bindings';
import {
  clearV070AssetFaceState,
  isV070AssetActive,
} from './asset-face-state';

const REMOVAL_LIFECYCLE_UNSUPPORTED = new Set<string>();

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
    && isV070AssetActive(state, sanction.instanceId)
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
    if (violatesSingleBankedCopy(state, playerId, card)) return false;
    return hasCapacity || replaceable.length > 0;
  });
}

export function inherentBankActionV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return bankableV070AssetInstanceIds(state, playerId).filter(instanceId =>
    !hasPrintedSpecialBankingAction(canonicalCardForInstance(state, instanceId))
  );
}

export function bankV070AssetWithInherentAction(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  replaceAssetInstanceId?: string,
): void {
  const card = canonicalCardForInstance(state, instanceId);
  if (!cardHasAssetEffect(card)) {
    throw new V070GameActionError('That card has no Asset effect to bank.');
  }
  if (hasPrintedSpecialBankingAction(card)) {
    throw new V070GameActionError(
      `${card.name} has a printed special banking Action that overrides the inherent Bank Action.`,
    );
  }

  bankV070AssetFromHand(state, playerId, instanceId, {
    replaceAssetInstanceId,
    purpose: 'inherent Bank Action',
  });
}

export function voluntarilyDiscardableV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const bank = state.players[playerId].zones.assetBank;
  const extraordinary = bank.find(instanceId =>
    state.cardInstances[instanceId]?.cardId === 'intelligence-extraordinary-rendition'
    && isV070AssetActive(state, instanceId)
  );

  // Extraordinary Rendition must be discarded before every other Asset, if able.
  if (extraordinary) return [extraordinary];

  return bank.filter(instanceId => {
    if (!isV070AssetActive(state, instanceId)) return true;
    const card = canonicalCardForInstance(state, instanceId);
    const assetText = card.effects
      .filter(effect => effect.label === 'Asset')
      .map(effect => effect.text)
      .join(' ');

    if (/cannot voluntarily discard this card at another time/i.test(assetText)) {
      return false;
    }
    if (/cannot voluntarily cause it to leave play during the turn it is banked/i.test(assetText)
      && assetWasBankedThisTurn(state, instanceId)) {
      return false;
    }
    return true;
  });
}

export function voluntarilyReturnableV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.assetBank.filter(instanceId => {
    if (!isV070AssetActive(state, instanceId)) return true;
    const card = canonicalCardForInstance(state, instanceId);
    const assetText = card.effects
      .filter(effect => effect.label === 'Asset')
      .map(effect => effect.text)
      .join(' ');

    if (/cannot voluntarily cause it to leave play during the turn it is banked/i.test(assetText)
      && assetWasBankedThisTurn(state, instanceId)) {
      return false;
    }
    return true;
  });
}

export function returnV070AssetVoluntarilyToHand(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  purpose: string,
): void {
  if (!voluntarilyReturnableV070AssetInstanceIds(state, playerId).includes(instanceId)) {
    throw new V070GameActionError('That Asset cannot be voluntarily returned to Hand now.');
  }

  moveBankedAsset(
    state,
    playerId,
    instanceId,
    'hand',
    purpose,
    false,
  );
}

export function discardV070AssetAsAction(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  discardV070AssetVoluntarily(
    state,
    playerId,
    instanceId,
    'Asset discard Action',
  );
}

export function resolveV070MarginLoanRepayment(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): string[] {
  assertBankedMarginLoan(state, playerId, instanceId);
  const collateral = marginLoanCollateralInstanceIds(state, instanceId);
  if (collateral.length !== 1) {
    throw new V070GameActionError(
      'A banked Margin Loan must have exactly one bound collateral card to be repaid.',
    );
  }

  releaseV070BoundCardsForPurpose(
    state,
    instanceId,
    'Margin Loan',
    'hand',
    'Margin Loan repayment',
  );
  moveBankedAsset(
    state,
    playerId,
    instanceId,
    'discard',
    'Margin Loan repayment',
    false,
  );
  appendV070Event(state, {
    type: 'margin_loan_repaid',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      collateralInstanceIds: [...collateral],
    },
  });
  return collateral;
}

export function resolveV070MarginLoanDefault(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  reason = 'Margin Loan default',
): string[] {
  assertBankedMarginLoan(state, playerId, instanceId);
  const collateral = marginLoanCollateralInstanceIds(state, instanceId);

  if (collateral.length > 0) {
    releaseV070BoundCardsForPurpose(
      state,
      instanceId,
      'Margin Loan',
      'graveyard',
      reason,
    );
  }
  moveBankedAsset(
    state,
    playerId,
    instanceId,
    'graveyard',
    reason,
    false,
  );
  appendV070Event(state, {
    type: 'margin_loan_defaulted',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      collateralInstanceIds: [...collateral],
      removed: false,
      reason,
    },
  });
  return collateral;
}

export function activateV070SleeperNetworkAsset(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  if (state.cardInstances[instanceId]?.cardId !== 'intelligence-sleeper-network') {
    throw new V070GameActionError('Sleeper Network activation requires the banked Sleeper Network.');
  }
  if (!state.players[playerId].zones.assetBank.includes(instanceId)) {
    throw new V070GameActionError('Sleeper Network must be banked before it can be activated.');
  }
  if (!isV070AssetActive(state, instanceId)) {
    throw new V070GameActionError('Sleeper Network must be active to use its Asset Action.');
  }
  if (state.pendingSleeperNetworkChoice) {
    throw new V070GameActionError('Resolve the pending Sleeper Network procedure first.');
  }

  moveBankedAsset(
    state,
    playerId,
    instanceId,
    'graveyard',
    'Sleeper Network activation',
    false,
  );
  beginSleeperNetworkBoundActionQueue(
    state,
    playerId,
    instanceId,
    'activate',
  );
}

export type V070AssetDepartureDestination = 'discard' | 'graveyard' | 'hand';

export function assertV070ForcedAssetChoicesSupported(
  state: V070GameState,
  playerId: PlayerId,
): void {
  assertForcedRemovalLifecycleSupported(state, playerId);
}

export function removeV070AssetForced(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  destination: V070AssetDepartureDestination,
  reason: string,
): void {
  const bank = state.players[playerId].zones.assetBank;
  if (!bank.includes(instanceId)) {
    throw new V070GameActionError('Forced Asset departure must target a banked Asset.');
  }

  assertForcedRemovalLifecycleSupported(state, playerId, [instanceId]);

  const extraordinary = bank.find(candidate =>
    state.cardInstances[candidate]?.cardId === 'intelligence-extraordinary-rendition'
    && isV070AssetActive(state, candidate)
  );
  if (extraordinary && instanceId !== extraordinary) {
    throw new V070GameActionError(
      'Extraordinary Rendition must be discarded before any other Asset, if able.',
    );
  }

  moveBankedAsset(
    state,
    playerId,
    instanceId,
    destination,
    reason,
    true,
  );
}

export function discardV070AssetByEffect(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  purpose: string,
): void {
  const bank = state.players[playerId].zones.assetBank;
  if (!bank.includes(instanceId)) {
    throw new V070GameActionError(
      'An effect-forced Asset discard must target a banked Asset.',
    );
  }

  const extraordinary = bank.find(candidate =>
    state.cardInstances[candidate]?.cardId === 'intelligence-extraordinary-rendition'
    && isV070AssetActive(state, candidate)
  );
  if (extraordinary && instanceId !== extraordinary) {
    throw new V070GameActionError(
      'Extraordinary Rendition must be discarded before any other Asset, if able.',
    );
  }

  moveBankedAssetToDiscard(
    state,
    playerId,
    instanceId,
    purpose,
    false,
  );
}

export function discardV070AssetVoluntarily(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  purpose: string,
): void {
  if (!voluntarilyDiscardableV070AssetInstanceIds(state, playerId).includes(instanceId)) {
    throw new V070GameActionError('That Asset cannot be voluntarily discarded now.');
  }

  moveBankedAssetToDiscard(
    state,
    playerId,
    instanceId,
    purpose,
    false,
  );
}

export function pendingBankReplacementV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): string[] {
  const card = canonicalCardForInstance(state, instanceId);
  if (!cardHasAssetEffect(card) || !hasPrintedSpecialBankingAction(card)) {
    throw new V070GameActionError(
      `${card.name} does not have a printed special banking Action.`,
    );
  }
  if (violatesSingleBankedCopy(state, playerId, card)) {
    throw new V070GameActionError(
      `${card.name} violates its single-banked-copy restriction.`,
    );
  }

  const player = state.players[playerId];
  const limit = effectiveV070AssetLimit(state, playerId);
  if (player.zones.assetBank.length < limit) return [];

  const replaceable = replaceableV070AssetInstanceIds(state, playerId);
  if (replaceable.length === 0) {
    throw new V070GameActionError(
      `Banking ${card.name} at the Asset limit requires a replaceable Asset.`,
    );
  }
  return replaceable;
}

export function bankV070AssetFromPendingAction(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  purpose: string,
  replaceAssetInstanceId?: string,
): void {
  const pending = state.pendingActionCard;
  if (!pending
    || pending.playerId !== playerId
    || pending.instanceId !== instanceId) {
    throw new V070GameActionError(
      'That Asset card is not the player’s pending Action card.',
    );
  }

  const replacements = pendingBankReplacementV070AssetInstanceIds(
    state,
    playerId,
    instanceId,
  );
  const replacement = replaceAssetInstanceId;

  if (replacements.length > 0) {
    if (!replacement) {
      throw new V070GameActionError(
        'Banking at the Asset limit requires choosing a replaceable Asset.',
      );
    }
    if (!replacements.includes(replacement)) {
      throw new V070GameActionError('That banked Asset cannot be replaced now.');
    }

    moveBankedAssetToDiscard(
      state,
      playerId,
      replacement,
      purpose,
      false,
    );
    appendV070Event(state, {
      type: 'asset_replaced',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: replacement,
        cardId: state.cardInstances[replacement]?.cardId,
        purpose,
      },
    });
  } else if (replacement) {
    throw new V070GameActionError(
      'Asset replacement is available only when banking at the Asset limit.',
    );
  }

  const card = canonicalCardForInstance(state, instanceId);
  state.players[playerId].zones.assetBank.push(instanceId);
  appendV070Event(state, {
    type: 'asset_banked',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: card.id,
      purpose,
      effectiveLimit: effectiveV070AssetLimit(state, playerId),
      turnNumber: state.turnNumber,
    },
  });
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
    moveBankedAssetToDiscard(
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
      turnNumber: state.turnNumber,
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
    && isV070AssetActive(state, instanceId)
  );
  if (extraordinary && instanceIds[0] !== extraordinary) {
    throw new V070GameActionError(
      'Extraordinary Rendition must be discarded before any other Asset, if able.',
    );
  }

  for (const instanceId of instanceIds) {
    moveBankedAssetToDiscard(
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
    && isV070AssetActive(state, instanceId)
  );

  // Asset replacement is a voluntary discard, so Rendition must be chosen first.
  if (extraordinary) return [extraordinary];

  return bank.filter(instanceId => {
    if (!isV070AssetActive(state, instanceId)) return true;
    const card = canonicalCardForInstance(state, instanceId);
    const assetText = card.effects
      .filter(effect => effect.label === 'Asset')
      .map(effect => effect.text)
      .join(' ');
    if (/cannot voluntarily discard this card at another time/i.test(assetText)) return false;
    if (/cannot voluntarily cause it to leave play during the turn it is banked/i.test(assetText)
      && assetWasBankedThisTurn(state, instanceId)) {
      return false;
    }
    return true;
  });
}

function moveBankedAssetToDiscard(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  reason: string,
  removed: boolean,
): void {
  moveBankedAsset(
    state,
    playerId,
    instanceId,
    'discard',
    reason,
    removed,
  );
}

function moveBankedAsset(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  destination: V070AssetDepartureDestination,
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
  clearV070AssetFaceState(state, instanceId);
  if (destination === 'discard') {
    state.players[playerId].zones.discardPile.push(instanceId);
  } else if (destination === 'graveyard') {
    state.players[playerId].zones.graveyard.push(instanceId);
  } else {
    state.players[playerId].zones.hand.push(instanceId);
  }
  state.sanctions = state.sanctions.filter(
    sanction => sanction.instanceId !== instanceId,
  );

  appendV070Event(state, {
    type: removed
      ? 'asset_removed'
      : destination === 'discard'
        ? 'asset_discarded'
        : destination === 'hand'
          ? 'asset_returned'
          : 'asset_departed',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId,
      destination,
      removed,
      reason,
    },
  });

  const preserveBindings =
    (cardId === 'intelligence-sleeper-network'
      && (removed || reason === 'Sleeper Network activation'))
    || (cardId === 'financiers-margin-loan' && removed);
  if (v070BindingsForHost(state, instanceId).length > 0 && !preserveBindings) {
    releaseV070BoundCards(
      state,
      instanceId,
      cardId === 'military-reserve-force' ? 'graveyard' : 'discard',
      cardId === 'military-reserve-force'
        ? 'Reserve Force host left play'
        : 'bound Asset host left play',
    );
  }

  if (removed) {
    resolveV070RemovedAssetTrigger(
      state,
      playerId,
      instanceId,
      cardId,
    );
  }
}

function resolveV070RemovedAssetTrigger(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  cardId: string,
): void {
  if (cardId === 'financiers-margin-loan') {
    resolveRemovedMarginLoanDefault(
      state,
      playerId,
      instanceId,
    );
    return;
  }
  if (cardId === 'intelligence-sleeper-network') {
    beginSleeperNetworkBoundActionQueue(
      state,
      playerId,
      instanceId,
      'removed',
    );
    return;
  }
  if (cardId !== 'neutral-contingency-plan') return;

  const purpose = 'Contingency Plan';
  const result = drawV070Cards(state, playerId, 1, purpose);
  state.players[playerId].zones.hand.push(...result.drawn);

  appendV070Event(state, {
    type: 'cards_drawn',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: result.drawn.length,
      purpose,
      sourceInstanceId: instanceId,
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
        sourceInstanceId: instanceId,
      },
    });
  }
}

function resolveRemovedMarginLoanDefault(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  const collateral = marginLoanCollateralInstanceIds(state, instanceId);
  if (collateral.length > 0) {
    releaseV070BoundCardsForPurpose(
      state,
      instanceId,
      'Margin Loan',
      'graveyard',
      'Margin Loan Default after Removal',
    );
  }

  const player = state.players[playerId];
  const handIndex = player.zones.hand.indexOf(instanceId);
  if (handIndex >= 0) player.zones.hand.splice(handIndex, 1);
  const discardIndex = player.zones.discardPile.indexOf(instanceId);
  if (discardIndex >= 0) player.zones.discardPile.splice(discardIndex, 1);
  if (!player.zones.graveyard.includes(instanceId)) {
    player.zones.graveyard.push(instanceId);
  }

  appendV070Event(state, {
    type: 'margin_loan_defaulted',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      collateralInstanceIds: [...collateral],
      removed: true,
      reason: 'Margin Loan Default after Removal',
    },
  });
}

function marginLoanCollateralInstanceIds(
  state: V070GameState,
  instanceId: string,
): string[] {
  return v070BindingsForHost(state, instanceId)
    .filter(binding => binding.purpose === 'Margin Loan')
    .map(binding => binding.cardInstanceId);
}

function assertBankedMarginLoan(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  if (state.cardInstances[instanceId]?.cardId !== 'financiers-margin-loan') {
    throw new V070GameActionError(
      'Margin Loan lifecycle resolution requires a Margin Loan Asset.',
    );
  }
  if (!state.players[playerId].zones.assetBank.includes(instanceId)) {
    throw new V070GameActionError(
      'Margin Loan must still be banked to resolve repayment or voluntary Default.',
    );
  }
  if (!isV070AssetActive(state, instanceId)) {
    throw new V070GameActionError(
      'Margin Loan must be active to resolve its printed Asset effect.',
    );
  }
}

function beginSleeperNetworkBoundActionQueue(
  state: V070GameState,
  playerId: PlayerId,
  hostInstanceId: string,
  mode: 'activate' | 'removed',
): void {
  const bindings = state.bindings
    .filter(binding => binding.hostId === hostInstanceId)
    .sort((a, b) => a.sequence - b.sequence);
  if (bindings.length === 0) return;

  for (const binding of bindings) binding.faceUp = true;
  state.pendingSleeperNetworkChoice = {
    kind: 'bound_action_queue',
    playerId,
    hostInstanceId,
    mode,
    playedCount: 0,
  };

  appendV070Event(state, {
    type: 'sleeper_network_revealed',
    actor: playerId,
    visibility: 'public',
    payload: {
      hostInstanceId,
      mode,
      boundCards: bindings.map(binding => ({
        instanceId: binding.cardInstanceId,
        cardId: state.cardInstances[binding.cardInstanceId]?.cardId,
        sequence: binding.sequence,
      })),
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

function hasPrintedSpecialBankingAction(card: V070CanonicalCard): boolean {
  return card.effects.some(effect =>
    effect.label === 'Action' && /\bbank this card\b/i.test(effect.text)
  );
}

function assetWasBankedThisTurn(
  state: V070GameState,
  instanceId: string,
): boolean {
  return state.events.some(event => {
    if (event.type !== 'asset_banked') return false;
    const payload = event.payload as {
      instanceId?: string;
      turnNumber?: number;
    } | undefined;
    return payload?.instanceId === instanceId
      && payload.turnNumber === state.turnNumber;
  });
}

function cardHasAssetEffect(card: V070CanonicalCard): boolean {
  return card.effects.some(effect => effect.label === 'Asset');
}
