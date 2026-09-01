import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export interface V070DeedPurchaseResult {
  territoryInstanceId: string;
  previousOwner: PlayerId | null;
  owner: PlayerId;
  cost: number;
  buyout: boolean;
}

export function isV070FinancierPlayer(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  return Boolean(state.players[playerId]?.financiers);
}

export function v070TreasuryValue(
  state: V070GameState,
  playerId: PlayerId,
): number {
  const financier = requireFinancierState(state, playerId);
  return financier.treasury.reduce(
    (total, instanceId) => total + cardValue(state, instanceId),
    0,
  );
}

export function v070CapitalLimit(
  state: V070GameState,
  playerId: PlayerId,
): number {
  requireFinancierState(state, playerId);
  const controlledTerritories = state.board.filter(
    territory => territory.controller === playerId,
  ).length;
  return controlledTerritories + v070TreasuryValue(state, playerId);
}

export function gainV070Capital(
  state: V070GameState,
  playerId: PlayerId,
  amount: number,
  reason: string,
): number {
  const gain = nonnegativeInteger(amount, 'Capital gain');
  const financier = requireFinancierState(state, playerId);
  financier.capital += gain;

  appendV070Event(state, {
    type: 'capital_changed',
    actor: playerId,
    visibility: 'public',
    payload: {
      requestedDelta: gain,
      delta: gain,
      balance: financier.capital,
      limit: v070CapitalLimit(state, playerId),
      reason,
    },
  });

  return gain;
}

export function spendV070Capital(
  state: V070GameState,
  playerId: PlayerId,
  amount: number,
  reason: string,
): void {
  const cost = nonnegativeInteger(amount, 'Capital spend');
  const financier = requireFinancierState(state, playerId);
  if (cost > financier.capital) {
    throw new V070GameActionError(
      `That effect requires ${cost} Capital but only ${financier.capital} is available.`,
    );
  }

  financier.capital -= cost;
  appendV070Event(state, {
    type: 'capital_changed',
    actor: playerId,
    visibility: 'public',
    payload: {
      requestedDelta: -cost,
      delta: -cost,
      balance: financier.capital,
      limit: v070CapitalLimit(state, playerId),
      reason,
    },
  });
}

export function clampV070CapitalToLimit(
  state: V070GameState,
  playerId: PlayerId,
  reason = 'End-of-turn Capital limit',
): number {
  const financier = state.players[playerId]?.financiers;
  if (!financier) return 0;

  const limit = v070CapitalLimit(state, playerId);
  if (financier.capital <= limit) return 0;

  const lost = financier.capital - limit;
  financier.capital = limit;
  appendV070Event(state, {
    type: 'capital_changed',
    actor: playerId,
    visibility: 'public',
    payload: {
      requestedDelta: -lost,
      delta: -lost,
      balance: financier.capital,
      limit,
      reason,
    },
  });
  return lost;
}

export function clampAllV070CapitalToLimits(
  state: V070GameState,
  reason = 'End-of-turn Capital limit',
): void {
  for (const playerId of ['A', 'B'] as const) {
    clampV070CapitalToLimit(state, playerId, reason);
  }
}

export function placeV070CardInTreasury(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  reason = 'Treasury',
): void {
  const financier = requireFinancierState(state, playerId);
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(instanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'A Treasury card must be placed from your Hand.',
    );
  }
  if (state.cardInstances[instanceId]?.owner !== playerId) {
    throw new V070GameActionError(
      'You cannot place another player’s card in your Treasury.',
    );
  }

  hand.splice(index, 1);
  financier.treasury.push(instanceId);
  appendV070Event(state, {
    type: 'treasury_card_added',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: state.cardInstances[instanceId]?.cardId,
      value: cardValue(state, instanceId),
      treasuryValue: v070TreasuryValue(state, playerId),
      capitalLimit: v070CapitalLimit(state, playerId),
      reason,
    },
  });
}

export function removeV070CardFromTreasury(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  destination: 'hand' | 'discard' | 'graveyard',
  reason: string,
): void {
  const financier = requireFinancierState(state, playerId);
  const index = financier.treasury.indexOf(instanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'That card is not in the player’s Treasury.',
    );
  }
  financier.treasury.splice(index, 1);

  if (destination === 'hand') {
    state.players[playerId].zones.hand.push(instanceId);
  } else if (destination === 'discard') {
    state.players[playerId].zones.discardPile.push(instanceId);
  } else {
    state.players[playerId].zones.graveyard.push(instanceId);
  }

  appendV070Event(state, {
    type: 'treasury_card_removed',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: state.cardInstances[instanceId]?.cardId,
      destination,
      treasuryValue: v070TreasuryValue(state, playerId),
      capitalLimit: v070CapitalLimit(state, playerId),
      reason,
    },
  });
}

export function ensureV070DeedForTerritory(
  state: V070GameState,
  territoryInstanceId: string,
): void {
  if (state.deeds.some(deed => deed.territoryInstanceId === territoryInstanceId)) {
    return;
  }
  if (!state.board.some(
    territory => territory.territoryInstanceId === territoryInstanceId,
  )) {
    throw new V070GameActionError(
      'A Deed may be created only for a Territory currently in the Gauntlet.',
    );
  }
  state.deeds.push({ territoryInstanceId, owner: null });
  appendV070Event(state, {
    type: 'deed_created',
    visibility: 'public',
    payload: { territoryInstanceId },
  });
}

export function v070DeedOwner(
  state: V070GameState,
  territoryInstanceId: string,
): PlayerId | null {
  return requireDeed(state, territoryInstanceId).owner;
}

export function v070DeedsOwned(
  state: V070GameState,
  playerId: PlayerId,
): number {
  return state.deeds.filter(deed => deed.owner === playerId).length;
}

export function v070DeedCost(
  state: V070GameState,
  buyer: PlayerId,
  territoryInstanceId: string,
): number {
  requireFinancierState(state, buyer);
  const deed = requireDeed(state, territoryInstanceId);
  if (deed.owner === buyer) {
    throw new V070GameActionError('You already own that Deed.');
  }
  if (deed.owner && !isV070FinancierPlayer(state, deed.owner)) {
    throw new V070GameActionError(
      'Only a Financier may own a Deed.',
    );
  }

  const territory = state.board.find(
    candidate => candidate.territoryInstanceId === territoryInstanceId,
  );
  if (!territory) {
    throw new V070GameActionError(
      'A Deed purchase must target a Territory currently in the Gauntlet.',
    );
  }

  const base = Math.min(v070DeedsOwned(state, buyer) + 1, 6);
  const positionModifier = territory.controller === buyer
    ? -1
    : territory.occupant === buyer
      ? 0
      : 1;
  const buyoutPremium = deed.owner
    ? Math.min(v070DeedsOwned(state, deed.owner), 6)
    : 0;

  return Math.max(1, base + positionModifier + buyoutPremium);
}

export function buyV070Deed(
  state: V070GameState,
  buyer: PlayerId,
  territoryInstanceId: string,
  reason = 'Buy or buy out Deed',
): V070DeedPurchaseResult {
  requireFinancierState(state, buyer);
  const deed = requireDeed(state, territoryInstanceId);
  const previousOwner = deed.owner;
  if (previousOwner === buyer) {
    throw new V070GameActionError('You already own that Deed.');
  }
  if (previousOwner && !isV070FinancierPlayer(state, previousOwner)) {
    throw new V070GameActionError(
      'Only an opposing Financier’s Deed may be bought out.',
    );
  }

  const cost = v070DeedCost(state, buyer, territoryInstanceId);
  spendV070Capital(state, buyer, cost, reason);
  deed.owner = buyer;

  appendV070Event(state, {
    type: 'deed_acquired',
    actor: buyer,
    visibility: 'public',
    payload: {
      territoryInstanceId,
      previousOwner,
      owner: buyer,
      cost,
      buyout: previousOwner !== null,
      deedsOwned: v070DeedsOwned(state, buyer),
      reason,
    },
  });

  checkV070ControllingInterest(state, buyer);

  return {
    territoryInstanceId,
    previousOwner,
    owner: buyer,
    cost,
    buyout: previousOwner !== null,
  };
}

export interface V070CollateralDeedPurchaseResult
  extends V070DeedPurchaseResult {
  capitalPaid: number;
  collateralValue: number;
  collateralApplied: number;
}

export function buyV070DeedWithCollateral(
  state: V070GameState,
  buyer: PlayerId,
  territoryInstanceId: string,
  collateralValue: number,
  reason = 'Collateral Deed purchase',
): V070CollateralDeedPurchaseResult {
  requireFinancierState(state, buyer);
  const deed = requireDeed(state, territoryInstanceId);
  const previousOwner = deed.owner;
  if (previousOwner === buyer) {
    throw new V070GameActionError('You already own that Deed.');
  }
  if (previousOwner && !isV070FinancierPlayer(state, previousOwner)) {
    throw new V070GameActionError(
      'Only an opposing Financier’s Deed may be bought out.',
    );
  }

  const collateral = nonnegativeInteger(
    collateralValue,
    'Collateral contribution',
  );
  const cost = v070DeedCost(state, buyer, territoryInstanceId);
  const collateralApplied = Math.min(cost, collateral);
  const capitalPaid = Math.max(0, cost - collateralApplied);
  spendV070Capital(state, buyer, capitalPaid, reason);
  deed.owner = buyer;

  appendV070Event(state, {
    type: 'deed_acquired',
    actor: buyer,
    visibility: 'public',
    payload: {
      territoryInstanceId,
      previousOwner,
      owner: buyer,
      cost,
      capitalPaid,
      collateralValue: collateral,
      collateralApplied,
      unusedCollateralValue: collateral - collateralApplied,
      buyout: previousOwner !== null,
      deedsOwned: v070DeedsOwned(state, buyer),
      reason,
    },
  });

  checkV070ControllingInterest(state, buyer);

  return {
    territoryInstanceId,
    previousOwner,
    owner: buyer,
    cost,
    buyout: previousOwner !== null,
    capitalPaid,
    collateralValue: collateral,
    collateralApplied,
  };
}

export function makeV070DeedUnowned(
  state: V070GameState,
  territoryInstanceId: string,
  reason: string,
): PlayerId | null {
  const deed = requireDeed(state, territoryInstanceId);
  const previousOwner = deed.owner;
  deed.owner = null;
  if (previousOwner) {
    appendV070Event(state, {
      type: 'deed_unowned',
      actor: previousOwner,
      visibility: 'public',
      payload: {
        territoryInstanceId,
        previousOwner,
        reason,
      },
    });
  }
  return previousOwner;
}

export function applyV070FinancierAfterCapture(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const financier = state.players[playerId]?.financiers;
  if (!financier) return;

  const income = v070DeedsOwned(state, playerId);
  if (income > 0) {
    gainV070Capital(
      state,
      playerId,
      income,
      'Financier Income after Capture',
    );
  } else {
    appendV070Event(state, {
      type: 'financier_income',
      actor: playerId,
      visibility: 'public',
      payload: {
        amount: 0,
        balance: financier.capital,
        deedsOwned: 0,
      },
    });
  }

  const treasuryValue = v070TreasuryValue(state, playerId);
  const controlledTerritories = state.board.filter(
    territory => territory.controller === playerId,
  ).length;
  if (treasuryValue > controlledTerritories) {
    financier.financialCapacityTurn = state.turnNumber;
    financier.financialCapacityUsedTurn = null;
    financier.financierFeatureActionSpentTurn = null;
    appendV070Event(state, {
      type: 'financial_capacity_available',
      actor: playerId,
      visibility: 'public',
      payload: {
        turnNumber: state.turnNumber,
        treasuryValue,
        controlledTerritories,
      },
    });
  } else {
    financier.financialCapacityTurn = null;
    financier.financialCapacityUsedTurn = null;
    financier.financierFeatureActionSpentTurn = null;
  }
}

export function v070FinancialCapacityAvailable(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const financier = state.players[playerId]?.financiers;
  return Boolean(
    financier
    && financier.financialCapacityTurn === state.turnNumber
    && financier.financialCapacityUsedTurn !== state.turnNumber,
  );
}

export function consumeV070FinancialCapacityAction(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const financier = requireFinancierState(state, playerId);
  if (!v070FinancialCapacityAvailable(state, playerId)) {
    throw new V070GameActionError(
      'Financial Capacity does not provide another Action now.',
    );
  }
  financier.financialCapacityUsedTurn = state.turnNumber;
  appendV070Event(state, {
    type: 'financial_capacity_used',
    actor: playerId,
    visibility: 'public',
    payload: { turnNumber: state.turnNumber },
  });
}

export function markV070FinancierFeatureActionSpent(
  state: V070GameState,
  playerId: PlayerId,
  feature: string,
): void {
  const financier = requireFinancierState(state, playerId);
  financier.financierFeatureActionSpentTurn = state.turnNumber;
  appendV070Event(state, {
    type: 'financier_feature_action_spent',
    actor: playerId,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      feature,
    },
  });
}

export function v070FinancierFeatureActionSpentThisTurn(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  return state.players[playerId]?.financiers
    ?.financierFeatureActionSpentTurn === state.turnNumber;
}

export function checkV070ControllingInterest(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  if (!isV070FinancierPlayer(state, playerId) || state.board.length === 0) {
    return false;
  }

  const requiredTerritories = new Set(
    state.board.map(territory => territory.territoryInstanceId),
  );
  const ownsAll = [...requiredTerritories].every(
    territoryInstanceId => v070DeedOwner(state, territoryInstanceId) === playerId,
  );
  if (!ownsAll) return false;

  state.stage = 'ended';
  state.winner = playerId;
  state.turnState = null;
  appendV070Event(state, {
    type: 'game_won',
    actor: playerId,
    visibility: 'public',
    payload: {
      route: 'controlling_interest',
      deedsOwned: v070DeedsOwned(state, playerId),
      territoriesInGauntlet: state.board.length,
    },
  });
  return true;
}

function requireFinancierState(
  state: V070GameState,
  playerId: PlayerId,
) {
  const financier = state.players[playerId]?.financiers;
  if (!financier) {
    throw new V070GameActionError(
      `${playerId} is not using the Financiers faction.`,
    );
  }
  return financier;
}

function requireDeed(
  state: V070GameState,
  territoryInstanceId: string,
) {
  const deed = state.deeds.find(
    candidate => candidate.territoryInstanceId === territoryInstanceId,
  );
  if (!deed) {
    throw new V070GameActionError(
      'That Territory does not have a registered Deed.',
    );
  }
  return deed;
}

function cardValue(
  state: V070GameState,
  instanceId: string,
): number {
  const cardId = state.cardInstances[instanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card) {
    throw new V070GameActionError(
      'Unknown card instance for Financier value calculation.',
    );
  }
  return card.cost;
}

function nonnegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new V070GameActionError(`${label} must be a nonnegative integer.`);
  }
  return value;
}
