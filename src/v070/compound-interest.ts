import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { isV070AssetUsable } from './asset-face-state';

export const V070_COMPOUND_INTEREST_ID =
  'financiers-compound-interest' as const;

export const V070_COMPOUND_INTEREST_ASSET_TEXT =
  'After your normal Draw, if your Treasury contains at least one card, you may reveal the top card of your Draw Pile. Place it face up in your Treasury or put it in your Discard Pile.' as const;

function assertV070CompoundInterestContract(): void {
  const card = v070CanonicalContent.cardsById.get(V070_COMPOUND_INTEREST_ID);
  const assetText = card?.effects.find(effect => effect.label === 'Asset')?.text;
  if (assetText !== V070_COMPOUND_INTEREST_ASSET_TEXT) {
    throw new Error(
      'v0.7.0 Compound Interest lifecycle drifted from released canonical Asset text.',
    );
  }
}

assertV070CompoundInterestContract();

export type V070PendingCompoundInterestChoice =
  | {
      kind: 'use';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | {
      kind: 'destination';
      playerId: PlayerId;
      assetInstanceId: string;
      revealedInstanceId: string;
    };

declare module './engine' {
  interface V070GameState {
    /**
     * Serialized post-normal-Draw Compound Interest window. Optional so older
     * v0.7.0 snapshots remain readable through this additive façade.
     */
    pendingCompoundInterestChoice?: V070PendingCompoundInterestChoice | null;
  }
}

export function pendingV070CompoundInterestChoice(
  state: V070GameState,
): V070PendingCompoundInterestChoice | null {
  return state.pendingCompoundInterestChoice ?? null;
}

export function activeV070CompoundInterestInstanceId(
  state: V070GameState,
  playerId: PlayerId,
): string | null {
  return state.players[playerId].zones.assetBank.find(instanceId =>
    state.cardInstances[instanceId]?.cardId === V070_COMPOUND_INTEREST_ID
    && isV070AssetUsable(state, instanceId)
  ) ?? null;
}

export function canOpenV070CompoundInterestAfterNormalDraw(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const assetInstanceId = activeV070CompoundInterestInstanceId(
    state,
    playerId,
  );
  return Boolean(
    assetInstanceId
    && (state.players[playerId].financiers?.treasury.length ?? 0) > 0
    && state.players[playerId].zones.drawPile.length > 0,
  );
}

export function openV070CompoundInterestAfterNormalDraw(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  if (pendingV070CompoundInterestChoice(state)) return false;
  const assetInstanceId = activeV070CompoundInterestInstanceId(
    state,
    playerId,
  );
  if (!assetInstanceId
    || (state.players[playerId].financiers?.treasury.length ?? 0) === 0
    || state.players[playerId].zones.drawPile.length === 0) {
    return false;
  }

  state.pendingCompoundInterestChoice = {
    kind: 'use',
    playerId,
    assetInstanceId,
  };
  appendV070Event(state, {
    type: 'compound_interest_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      assetInstanceId,
      optional: true,
    },
  });
  return true;
}

export function resolveV070CompoundInterestUseChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'pass' | 'use',
): { used: boolean; assetInstanceId: string } {
  const pending = pendingV070CompoundInterestChoice(state);
  if (!pending || pending.kind !== 'use' || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Compound Interest use choice is pending for that player.',
    );
  }

  const { assetInstanceId } = pending;
  if (choice === 'pass') {
    state.pendingCompoundInterestChoice = null;
    appendV070Event(state, {
      type: 'compound_interest_declined',
      actor: playerId,
      visibility: 'public',
      payload: { assetInstanceId },
    });
    return { used: false, assetInstanceId };
  }

  if (!state.players[playerId].zones.assetBank.includes(assetInstanceId)
    || state.cardInstances[assetInstanceId]?.cardId
      !== V070_COMPOUND_INTEREST_ID
    || !isV070AssetUsable(state, assetInstanceId)
    || (state.players[playerId].financiers?.treasury.length ?? 0) === 0
    || state.players[playerId].zones.drawPile.length === 0) {
    throw new V070GameActionError(
      'Compound Interest is no longer eligible to apply after the normal Draw.',
    );
  }

  state.pendingCompoundInterestChoice = null;
  appendV070Event(state, {
    type: 'compound_interest_use_committed',
    actor: playerId,
    visibility: 'public',
    payload: { assetInstanceId },
  });
  return { used: true, assetInstanceId };
}

export function revealV070CompoundInterestTopCard(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
): string {
  if (pendingV070CompoundInterestChoice(state)) {
    throw new V070GameActionError(
      'Resolve the current Compound Interest choice before revealing another card.',
    );
  }
  if (!state.players[playerId].zones.assetBank.includes(assetInstanceId)
    || state.cardInstances[assetInstanceId]?.cardId
      !== V070_COMPOUND_INTEREST_ID
    || !isV070AssetUsable(state, assetInstanceId)) {
    throw new V070GameActionError(
      'Compound Interest must remain an active usable banked Asset when its effect resolves.',
    );
  }
  if ((state.players[playerId].financiers?.treasury.length ?? 0) === 0) {
    throw new V070GameActionError(
      'Compound Interest requires at least one card already in Treasury.',
    );
  }

  const revealedInstanceId = state.players[playerId].zones.drawPile[0];
  if (!revealedInstanceId) {
    throw new V070GameActionError(
      'Compound Interest has no top Draw Pile card to reveal.',
    );
  }

  state.pendingCompoundInterestChoice = {
    kind: 'destination',
    playerId,
    assetInstanceId,
    revealedInstanceId,
  };
  appendV070Event(state, {
    type: 'compound_interest_card_revealed',
    actor: playerId,
    visibility: 'public',
    payload: {
      assetInstanceId,
      instanceId: revealedInstanceId,
      cardId: state.cardInstances[revealedInstanceId]?.cardId,
    },
  });
  return revealedInstanceId;
}

export function resolveV070CompoundInterestDestination(
  state: V070GameState,
  playerId: PlayerId,
  destination: 'treasury' | 'discard',
): string {
  const pending = pendingV070CompoundInterestChoice(state);
  if (!pending
    || pending.kind !== 'destination'
    || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No revealed Compound Interest card is awaiting a destination for that player.',
    );
  }

  const drawPile = state.players[playerId].zones.drawPile;
  if (drawPile[0] !== pending.revealedInstanceId) {
    throw new V070GameActionError(
      'The revealed Compound Interest card is no longer on top of the Draw Pile.',
    );
  }
  if (destination === 'treasury' && !state.players[playerId].financiers) {
    throw new V070GameActionError(
      'Compound Interest can place a revealed card only in an existing Financier Treasury.',
    );
  }

  drawPile.shift();
  if (destination === 'treasury') {
    state.players[playerId].financiers!.treasury.push(
      pending.revealedInstanceId,
    );
  } else {
    state.players[playerId].zones.discardPile.push(
      pending.revealedInstanceId,
    );
  }

  state.pendingCompoundInterestChoice = null;
  appendV070Event(state, {
    type: 'compound_interest_card_routed',
    actor: playerId,
    visibility: 'public',
    payload: {
      assetInstanceId: pending.assetInstanceId,
      instanceId: pending.revealedInstanceId,
      cardId: state.cardInstances[pending.revealedInstanceId]?.cardId,
      destination,
    },
  });
  return pending.revealedInstanceId;
}
