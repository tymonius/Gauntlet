import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { isV070AssetUsable } from './asset-face-state';
import {
  gainV070Capital,
  placeV070CardInTreasury,
} from './financiers';

export const V070_WAR_BONDS_ID = 'financiers-war-bonds' as const;
export const V070_WAR_BONDS_ASSET_TEXT =
  'After the first battle each turn, you may place one card from your Hand face up in your Treasury. If you do, +1 Capital.' as const;

export interface V070PendingWarBondsChoice {
  playerId: PlayerId;
  assetInstanceId: string;
  remainingPlayerIds: PlayerId[];
}

export interface V070WarBondsContinuation {
  type: 'war_bonds_apply';
  playerId: PlayerId;
  assetInstanceId: string;
  handInstanceId: string;
  remainingPlayerIds: PlayerId[];
}

declare module './engine' {
  interface V070GameState {
    /** First battle whose post-battle War Bonds timing has been opened this turn. */
    warBondsFirstBattleTurn?: number | null;
    /** Serialized optional War Bonds choice after that first battle. */
    pendingWarBondsChoice?: V070PendingWarBondsChoice | null;
  }
}

export function pendingV070WarBondsChoice(
  state: V070GameState,
): V070PendingWarBondsChoice | null {
  return state.pendingWarBondsChoice ?? null;
}

export function v070CurrentTurnHasCompletedBattle(
  state: V070GameState,
): boolean {
  const startIndex = currentTurnStartEventIndex(state);
  if (startIndex < 0) return false;
  return state.events.slice(startIndex + 1).some(
    event => event.type === 'battle_aftermath_complete',
  );
}

/**
 * Open the released post-first-battle timing. This is intentionally called
 * only after the battle container has closed, so "during this battle" effects
 * no longer apply to War Bonds.
 */
export function openV070WarBondsAfterFirstBattle(
  state: V070GameState,
): boolean {
  if (state.battle || state.stage !== 'playing') return false;
  if (state.warBondsFirstBattleTurn === state.turnNumber) return false;
  if (!v070CurrentTurnHasCompletedBattle(state)) return false;

  state.warBondsFirstBattleTurn = state.turnNumber;
  const active = state.activePlayer;
  const order: PlayerId[] = active
    ? [active, otherPlayer(active)]
    : ['A', 'B'];
  return openNextV070WarBondsChoice(state, order);
}

export function resolveV070WarBondsChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'pass' | 'use',
  handInstanceId?: string,
): V070WarBondsContinuation | null {
  const pending = pendingV070WarBondsChoice(state);
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending War Bonds opportunity.',
    );
  }

  if (choice === 'pass') {
    if (handInstanceId) {
      throw new V070GameActionError(
        'Passing War Bonds does not choose a Hand card.',
      );
    }
    state.pendingWarBondsChoice = null;
    appendV070Event(state, {
      type: 'war_bonds_declined',
      actor: playerId,
      visibility: 'public',
      payload: { assetInstanceId: pending.assetInstanceId },
    });
    openNextV070WarBondsChoice(state, pending.remainingPlayerIds);
    return null;
  }

  if (!handInstanceId
    || !state.players[playerId].zones.hand.includes(handInstanceId)) {
    throw new V070GameActionError(
      'Using War Bonds requires choosing one card from your Hand.',
    );
  }
  assertV070WarBondsUsable(state, playerId, pending.assetInstanceId);

  state.pendingWarBondsChoice = null;
  appendV070Event(state, {
    type: 'war_bonds_use_committed',
    actor: playerId,
    visibility: 'public',
    payload: {
      assetInstanceId: pending.assetInstanceId,
      // Hand identity remains private until the effect actually applies.
    },
  });
  return {
    type: 'war_bonds_apply',
    playerId,
    assetInstanceId: pending.assetInstanceId,
    handInstanceId,
    remainingPlayerIds: [...pending.remainingPlayerIds],
  };
}

export function applyV070WarBonds(
  state: V070GameState,
  continuation: V070WarBondsContinuation,
): void {
  assertV070WarBondsUsable(
    state,
    continuation.playerId,
    continuation.assetInstanceId,
  );
  if (!state.players[continuation.playerId].zones.hand.includes(
    continuation.handInstanceId,
  )) {
    throw new V070GameActionError(
      'The card committed to War Bonds is no longer in Hand.',
    );
  }

  placeV070CardInTreasury(
    state,
    continuation.playerId,
    continuation.handInstanceId,
    'War Bonds',
  );
  gainV070Capital(
    state,
    continuation.playerId,
    1,
    'War Bonds',
  );
  appendV070Event(state, {
    type: 'war_bonds_resolved',
    actor: continuation.playerId,
    visibility: 'public',
    payload: {
      assetInstanceId: continuation.assetInstanceId,
      treasuryInstanceId: continuation.handInstanceId,
    },
  });
}

export function continueV070WarBondsTiming(
  state: V070GameState,
  remainingPlayerIds: readonly PlayerId[],
): boolean {
  return openNextV070WarBondsChoice(state, remainingPlayerIds);
}

function openNextV070WarBondsChoice(
  state: V070GameState,
  playerIds: readonly PlayerId[],
): boolean {
  for (let index = 0; index < playerIds.length; index += 1) {
    const playerId = playerIds[index];
    const assetInstanceId = activeV070WarBondsInstanceId(state, playerId);
    if (!assetInstanceId || state.players[playerId].zones.hand.length === 0) {
      continue;
    }
    state.pendingWarBondsChoice = {
      playerId,
      assetInstanceId,
      remainingPlayerIds: playerIds.slice(index + 1),
    };
    appendV070Event(state, {
      type: 'war_bonds_choice_pending',
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
  state.pendingWarBondsChoice = null;
  return false;
}

function activeV070WarBondsInstanceId(
  state: V070GameState,
  playerId: PlayerId,
): string | null {
  return state.players[playerId].zones.assetBank.find(instanceId =>
    state.cardInstances[instanceId]?.cardId === V070_WAR_BONDS_ID
    && isV070AssetUsable(state, instanceId)
  ) ?? null;
}

function assertV070WarBondsUsable(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
): void {
  if (!state.players[playerId].financiers
    || !state.players[playerId].zones.assetBank.includes(assetInstanceId)
    || state.cardInstances[assetInstanceId]?.cardId !== V070_WAR_BONDS_ID
    || !isV070AssetUsable(state, assetInstanceId)) {
    throw new V070GameActionError(
      'War Bonds must remain an active usable banked Asset when its effect applies.',
    );
  }
}

function currentTurnStartEventIndex(state: V070GameState): number {
  for (let index = state.events.length - 1; index >= 0; index -= 1) {
    const event = state.events[index];
    if (event.type !== 'turn_started') continue;
    const payload = event.payload as { turnNumber?: number } | undefined;
    if (payload?.turnNumber === state.turnNumber) return index;
  }
  return -1;
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

function validateWarBondsContract(): void {
  const card = v070CanonicalContent.cardsById.get(V070_WAR_BONDS_ID);
  const actual = card?.effects.find(effect => effect.label === 'Asset')?.text;
  if (actual !== V070_WAR_BONDS_ASSET_TEXT) {
    throw new Error(
      `v0.7.0 War Bonds Asset authority drifted: expected ${JSON.stringify(V070_WAR_BONDS_ASSET_TEXT)}, got ${JSON.stringify(actual)}.`,
    );
  }
}

validateWarBondsContract();
