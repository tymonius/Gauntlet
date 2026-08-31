import { v070CanonicalContent } from '../content/v070';
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

export function isV070InquisitionPlayer(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  return Boolean(state.players[playerId]?.inquisition);
}

export function isV070ArcaneCard(cardId: string): boolean {
  return v070CanonicalContent.cardsById.get(cardId)?.trait === 'Arcane';
}

export function applyV070BlasphemyForActionPlay(
  state: V070GameState,
  actionPlayerId: PlayerId,
  cardId: string,
): void {
  if (!isV070ArcaneCard(cardId)) return;
  const inquisitionPlayerId = otherPlayer(actionPlayerId);
  if (!isV070InquisitionPlayer(state, inquisitionPlayerId)) return;

  gainV070Conviction(
    state,
    inquisitionPlayerId,
    1,
    'Blasphemy: opposing Arcane Action played',
  );
  appendV070Event(state, {
    type: 'blasphemy_triggered',
    actor: inquisitionPlayerId,
    visibility: 'public',
    payload: {
      opponent: actionPlayerId,
      cardId,
      trigger: 'action_played',
    },
  });
}

export function applyV070BlasphemyForBattleReveal(
  state: V070GameState,
  cardOwnerId: PlayerId,
  cardId: string,
  role: 'gambit' | 'tactic',
): void {
  if (!isV070ArcaneCard(cardId)) return;
  const inquisitionPlayerId = otherPlayer(cardOwnerId);
  if (!isV070InquisitionPlayer(state, inquisitionPlayerId)) return;

  gainV070Conviction(
    state,
    inquisitionPlayerId,
    1,
    `Blasphemy: opposing Arcane ${role} revealed`,
  );
  appendV070Event(state, {
    type: 'blasphemy_triggered',
    actor: inquisitionPlayerId,
    visibility: 'public',
    payload: {
      opponent: cardOwnerId,
      cardId,
      trigger: `${role}_revealed`,
    },
  });
}

export function applyV070NormalAftermathConviction(
  state: V070GameState,
  playerId: PlayerId,
  opposingCardsGraveyarded: readonly string[],
): boolean {
  if (opposingCardsGraveyarded.length === 0) return false;
  const inquisition = state.players[playerId]?.inquisition;
  if (!inquisition) return false;
  if (inquisition.normalConvictionGainTurn === state.turnNumber) {
    return false;
  }

  inquisition.normalConvictionGainTurn = state.turnNumber;
  gainV070Conviction(
    state,
    playerId,
    1,
    'Inquisition normal Aftermath gain',
  );
  appendV070Event(state, {
    type: 'inquisition_aftermath_conviction_triggered',
    actor: playerId,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      opposingCardInstanceIds: [...opposingCardsGraveyarded],
    },
  });
  return true;
}

export function v070CondemnationAppliesToPlayerTactic(
  state: V070GameState,
  tacticOwnerId: PlayerId,
): boolean {
  return isV070InquisitionPlayer(state, otherPlayer(tacticOwnerId));
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

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

function nonnegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new V070GameActionError(
      `${label} must be a nonnegative integer.`,
    );
  }
  return value;
}
