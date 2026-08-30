import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_MAX_CONVICTION = 4 as const;

export function v070Conviction(
  state: V070GameState,
  playerId: PlayerId,
): number {
  return requireInquisitionState(state, playerId).conviction;
}

export function gainV070Conviction(
  state: V070GameState,
  playerId: PlayerId,
  amount: number,
  reason: string,
): number {
  const gain = nonnegativeInteger(amount, 'Conviction gain');
  const inquisition = requireInquisitionState(state, playerId);
  const previous = inquisition.conviction;
  inquisition.conviction = Math.min(
    V070_MAX_CONVICTION,
    previous + gain,
  );
  const applied = inquisition.conviction - previous;

  appendV070Event(state, {
    type: 'conviction_changed',
    actor: playerId,
    visibility: 'public',
    payload: {
      requestedDelta: gain,
      delta: applied,
      balance: inquisition.conviction,
      maximum: V070_MAX_CONVICTION,
      capped: applied < gain,
      reason,
    },
  });

  return applied;
}

export function spendV070Conviction(
  state: V070GameState,
  playerId: PlayerId,
  amount: number,
  reason: string,
): void {
  const cost = nonnegativeInteger(amount, 'Conviction spend');
  const inquisition = requireInquisitionState(state, playerId);
  if (cost > inquisition.conviction) {
    throw new V070GameActionError(
      `That effect requires ${cost} Conviction but only ${inquisition.conviction} is available.`,
    );
  }

  inquisition.conviction -= cost;
  appendV070Event(state, {
    type: 'conviction_changed',
    actor: playerId,
    visibility: 'public',
    payload: {
      requestedDelta: -cost,
      delta: -cost,
      balance: inquisition.conviction,
      maximum: V070_MAX_CONVICTION,
      capped: false,
      reason,
    },
  });
}

function requireInquisitionState(
  state: V070GameState,
  playerId: PlayerId,
) {
  const inquisition = state.players[playerId]?.inquisition;
  if (!inquisition) {
    throw new V070GameActionError(
      `${playerId} is not using the Inquisition faction.`,
    );
  }
  return inquisition;
}

function nonnegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new V070GameActionError(
      `${label} must be a nonnegative integer.`,
    );
  }
  return value;
}
