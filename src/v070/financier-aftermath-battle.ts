import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  buyV070Deed,
  buyV070DeedWithCollateral,
  isV070FinancierPlayer,
  v070DeedCost,
  v070DeedOwner,
  v070FinancierCardValue,
} from './financiers';

export const V070_CORNER_THE_MARKET_ID =
  'financiers-corner-the-market' as const;
export const V070_LEVERAGED_BUYOUT_ID =
  'financiers-leveraged-buyout' as const;
export const V070_MONETARY_CRISIS_ID =
  'financiers-monetary-crisis' as const;

export const V070_CORNER_THE_MARKET_BATTLE_TEXT =
  'In the Aftermath, if you win, you may buy or buy out any number of Deeds. Complete each purchase before calculating the next cost.' as const;
export const V070_LEVERAGED_BUYOUT_BATTLE_TEXT =
  "In the Aftermath, before battle cards are cleared, if you won, you may buy this Territory's Deed using any of your other Gambits, Tactics, or Reserve cards as collateral. Each collateral card contributes its value toward the cost. Action collateral goes to your Graveyard after the purchase; battle collateral goes there when battle cards are cleared. Collateral may pay the entire cost." as const;
export const V070_MONETARY_CRISIS_BATTLE_TEXT =
  'In the Aftermath, each player with more than one card in Hand chooses one and discards the rest.' as const;

export type V070FinancierAftermathCardId =
  | typeof V070_CORNER_THE_MARKET_ID
  | typeof V070_LEVERAGED_BUYOUT_ID
  | typeof V070_MONETARY_CRISIS_ID;

export interface V070FinancierAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
  sourceCardId: V070FinancierAftermathCardId;
}

export type V070PendingFinancierAftermathChoice =
  | {
      kind: 'corner_the_market';
      playerId: PlayerId;
      sourceInstanceId: string;
      candidateTerritoryInstanceIds: string[];
    }
  | {
      kind: 'leveraged_buyout';
      playerId: PlayerId;
      sourceInstanceId: string;
      territoryInstanceId: string;
      cost: number;
      candidateCollateralInstanceIds: string[];
    }
  | {
      kind: 'monetary_crisis';
      playerId: PlayerId;
      sourceOwner: PlayerId;
      sourceInstanceId: string;
      candidateInstanceIds: string[];
      remainingPlayerIds: PlayerId[];
    };

declare module './battle-types' {
  interface V070BattleRuntime {
    financierAftermathEffects?: V070FinancierAftermathEffect[];
    pendingFinancierAftermathChoice?:
      V070PendingFinancierAftermathChoice | null;
  }
}

function validateAuthority(): void {
  for (const [cardId, expectedText] of [
    [V070_CORNER_THE_MARKET_ID, V070_CORNER_THE_MARKET_BATTLE_TEXT],
    [V070_LEVERAGED_BUYOUT_ID, V070_LEVERAGED_BUYOUT_BATTLE_TEXT],
    [V070_MONETARY_CRISIS_ID, V070_MONETARY_CRISIS_BATTLE_TEXT],
  ] as const) {
    const frozen = v070CanonicalContent.cardsById.get(cardId);
    const current = currentCanonicalContent.cardsById.get(cardId);
    const frozenText = frozen?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    const currentText = current?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    if (frozenText !== expectedText || currentText !== expectedText) {
      throw new Error(
        `${cardId} battle text drifted between frozen and current authority.`,
      );
    }
  }
}

validateAuthority();

export function registerV070FinancierAftermathBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: V070FinancierAftermathCardId,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Financier Aftermath battle registration requires an active battle.',
    );
  }
  const instance = state.cardInstances[sourceInstanceId];
  if (instance?.owner !== owner || instance.cardId !== sourceCardId) {
    throw new V070GameActionError(
      'Financier Aftermath source does not match the revealed card instance.',
    );
  }

  runtime.financierAftermathEffects ??= [];
  if (runtime.financierAftermathEffects.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) return;
  runtime.financierAftermathEffects.push({
    owner,
    sourceInstanceId,
    sourceCardId,
  });
  appendV070Event(state, {
    type: 'financier_aftermath_effect_registered',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId,
    },
  });
}

export function v070FinancierAftermathEffects(
  state: V070GameState,
): V070FinancierAftermathEffect[] {
  return (state.battleRuntime?.financierAftermathEffects ?? [])
    .map(effect => ({ ...effect }));
}

export function pendingV070FinancierAftermathChoice(
  state: V070GameState,
): V070PendingFinancierAftermathChoice | null {
  return state.battleRuntime?.pendingFinancierAftermathChoice ?? null;
}

export function v070FinancierAftermathEffectIsOptional(
  effect: V070FinancierAftermathEffect,
): boolean {
  return effect.sourceCardId === V070_CORNER_THE_MARKET_ID
    || effect.sourceCardId === V070_LEVERAGED_BUYOUT_ID;
}

export function v070FinancierAftermathEffectEligible(
  state: V070GameState,
  effect: V070FinancierAftermathEffect,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath') return false;

  if (effect.sourceCardId === V070_MONETARY_CRISIS_ID) return true;
  if (battle.winner !== effect.owner) return false;

  if (effect.sourceCardId === V070_CORNER_THE_MARKET_ID) {
    return affordableDeedTerritoryInstanceIds(state, effect.owner).length > 0;
  }

  const target = contestedTerritoryInstanceId(state);
  if (!target || v070DeedOwner(state, target) === effect.owner) return false;
  try {
    const cost = v070DeedCost(state, effect.owner, target);
    const collateral = leveragedBuyoutCollateralInstanceIds(
      state,
      effect.owner,
      effect.sourceInstanceId,
    );
    const totalAvailable =
      state.players[effect.owner].financiers!.capital
      + collateral.reduce(
          (sum, instanceId) =>
            sum + v070FinancierCardValue(state, instanceId),
          0,
        );
    return totalAvailable >= cost;
  } catch {
    return false;
  }
}

export function v070FinancierAftermathEffectNeedsChoice(
  state: V070GameState,
  effect: V070FinancierAftermathEffect,
): boolean {
  if (v070FinancierAftermathEffectIsOptional(effect)) return true;
  return monetaryCrisisAffectedPlayers(state).length > 0;
}

export function beginV070FinancierAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime || runtime.stage !== 'aftermath') {
    throw new V070GameActionError(
      'Financier Aftermath resolution requires the Aftermath stage.',
    );
  }
  if (runtime.pendingFinancierAftermathChoice) {
    throw new V070GameActionError(
      'Resolve the pending Financier Aftermath choice first.',
    );
  }

  const index = (runtime.financierAftermathEffects ?? []).findIndex(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (index < 0) {
    throw new V070GameActionError(
      'That Financier Aftermath effect is no longer pending.',
    );
  }
  const [effect] = runtime.financierAftermathEffects!.splice(index, 1);

  if (!v070FinancierAftermathEffectEligible(state, effect)) {
    appendV070Event(state, {
      type: 'financier_aftermath_effect_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: effect.sourceCardId,
      },
    });
    return;
  }

  if (effect.sourceCardId === V070_CORNER_THE_MARKET_ID) {
    openCornerTheMarketChoice(state, effect);
    return;
  }
  if (effect.sourceCardId === V070_LEVERAGED_BUYOUT_ID) {
    openLeveragedBuyoutChoice(state, effect);
    return;
  }

  openNextMonetaryCrisisChoice(
    state,
    effect.owner,
    effect.sourceInstanceId,
    monetaryCrisisAffectedPlayers(state),
  );
}

export function declineV070FinancierAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const index = (runtime?.financierAftermathEffects ?? []).findIndex(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (!runtime || index < 0) {
    throw new V070GameActionError(
      'That optional Financier Aftermath effect is not pending.',
    );
  }
  const effect = runtime.financierAftermathEffects![index];
  if (!v070FinancierAftermathEffectIsOptional(effect)) {
    throw new V070GameActionError(
      'That Financier Aftermath effect is not optional.',
    );
  }
  runtime.financierAftermathEffects!.splice(index, 1);
  appendV070Event(state, {
    type: 'financier_aftermath_effect_declined',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: effect.sourceCardId,
    },
  });
}

export function resolveV070CornerTheMarketAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  territoryInstanceId?: string,
): boolean {
  const pending = pendingV070FinancierAftermathChoice(state);
  if (pending?.kind !== 'corner_the_market'
    || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Corner the Market Aftermath choice is pending for that player.',
    );
  }

  if (territoryInstanceId === undefined) {
    state.battleRuntime!.pendingFinancierAftermathChoice = null;
    appendV070Event(state, {
      type: 'corner_the_market_aftermath_finished',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
      },
    });
    return true;
  }
  if (!pending.candidateTerritoryInstanceIds.includes(
    territoryInstanceId,
  )) {
    throw new V070GameActionError(
      'That Deed is not currently affordable through Corner the Market.',
    );
  }

  const purchase = buyV070Deed(
    state,
    playerId,
    territoryInstanceId,
    'Corner the Market battle Aftermath',
  );
  appendV070Event(state, {
    type: 'corner_the_market_aftermath_purchase',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      territoryInstanceId,
      cost: purchase.cost,
      buyout: purchase.buyout,
    },
  });

  const candidates = affordableDeedTerritoryInstanceIds(state, playerId);
  if (candidates.length === 0 || state.stage === 'ended') {
    state.battleRuntime!.pendingFinancierAftermathChoice = null;
    return true;
  }
  state.battleRuntime!.pendingFinancierAftermathChoice = {
    ...pending,
    candidateTerritoryInstanceIds: candidates,
  };
  return false;
}

export function resolveV070LeveragedBuyoutAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  collateralInstanceIds?: readonly string[],
): void {
  const pending = pendingV070FinancierAftermathChoice(state);
  if (pending?.kind !== 'leveraged_buyout'
    || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Leveraged Buyout Aftermath choice is pending for that player.',
    );
  }

  if (collateralInstanceIds === undefined) {
    state.battleRuntime!.pendingFinancierAftermathChoice = null;
    appendV070Event(state, {
      type: 'leveraged_buyout_aftermath_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        territoryInstanceId: pending.territoryInstanceId,
      },
    });
    return;
  }
  if (new Set(collateralInstanceIds).size !== collateralInstanceIds.length) {
    throw new V070GameActionError(
      'Leveraged Buyout cannot use the same collateral card twice.',
    );
  }
  if (collateralInstanceIds.some(instanceId =>
    !pending.candidateCollateralInstanceIds.includes(instanceId)
  )) {
    throw new V070GameActionError(
      'Leveraged Buyout collateral must be another Gambit, Tactic, or Reserve card from this battle.',
    );
  }

  const currentCandidates = leveragedBuyoutCollateralInstanceIds(
    state,
    playerId,
    pending.sourceInstanceId,
  );
  if (collateralInstanceIds.some(instanceId =>
    !currentCandidates.includes(instanceId)
  )) {
    throw new V070GameActionError(
      'Selected Leveraged Buyout collateral is no longer available in this battle.',
    );
  }
  if (v070DeedOwner(state, pending.territoryInstanceId) === playerId) {
    throw new V070GameActionError(
      'You already own this Territory’s Deed.',
    );
  }

  const cost = v070DeedCost(
    state,
    playerId,
    pending.territoryInstanceId,
  );
  const collateralValue = collateralInstanceIds.reduce(
    (sum, instanceId) =>
      sum + v070FinancierCardValue(state, instanceId),
    0,
  );
  const capital = state.players[playerId].financiers!.capital;
  if (capital + collateralValue < cost) {
    throw new V070GameActionError(
      `Leveraged Buyout requires ${cost} total payment but only ${capital + collateralValue} is available from Capital and selected collateral.`,
    );
  }

  const purchase = buyV070DeedWithCollateral(
    state,
    playerId,
    pending.territoryInstanceId,
    collateralValue,
    'Leveraged Buyout battle Aftermath',
  );
  const runtime = state.battleRuntime!;
  for (const instanceId of collateralInstanceIds) {
    const existing = runtime.battleCardAftermathDestinationOverrides.find(
      override =>
        override.playerId === playerId
        && override.instanceId === instanceId,
    );
    if (existing) {
      existing.destination = 'graveyard';
      existing.sourceCardId = V070_LEVERAGED_BUYOUT_ID;
    } else {
      runtime.battleCardAftermathDestinationOverrides.push({
        sourceCardId: V070_LEVERAGED_BUYOUT_ID,
        playerId,
        instanceId,
        destination: 'graveyard',
      });
    }
  }

  runtime.pendingFinancierAftermathChoice = null;
  appendV070Event(state, {
    type: 'leveraged_buyout_aftermath_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      territoryInstanceId: pending.territoryInstanceId,
      cost: purchase.cost,
      capitalPaid: purchase.capitalPaid,
      collateralValue: purchase.collateralValue,
      collateralApplied: purchase.collateralApplied,
      collateralInstanceIds: [...collateralInstanceIds],
    },
  });
}

export function resolveV070MonetaryCrisisAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  keepInstanceId: string,
): boolean {
  const pending = pendingV070FinancierAftermathChoice(state);
  if (pending?.kind !== 'monetary_crisis'
    || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Monetary Crisis Hand choice is pending for that player.',
    );
  }
  if (!pending.candidateInstanceIds.includes(keepInstanceId)
    || !state.players[playerId].zones.hand.includes(keepInstanceId)) {
    throw new V070GameActionError(
      'Monetary Crisis must keep one currently eligible card from that Hand.',
    );
  }

  const hand = [...state.players[playerId].zones.hand];
  const discarded = hand.filter(
    instanceId => instanceId !== keepInstanceId,
  );
  state.players[playerId].zones.hand = [keepInstanceId];
  state.players[playerId].zones.discardPile.push(...discarded);
  appendV070Event(state, {
    type: 'monetary_crisis_aftermath_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceOwner: pending.sourceOwner,
      discardedInstanceIds: discarded,
    },
  });
  appendV070Event(state, {
    type: 'monetary_crisis_aftermath_kept_card',
    actor: playerId,
    visibility: playerId,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      keptInstanceId: keepInstanceId,
      keptCardId: state.cardInstances[keepInstanceId]?.cardId ?? null,
    },
  });

  state.battleRuntime!.pendingFinancierAftermathChoice = null;
  openNextMonetaryCrisisChoice(
    state,
    pending.sourceOwner,
    pending.sourceInstanceId,
    pending.remainingPlayerIds,
  );
  return !state.battleRuntime!.pendingFinancierAftermathChoice;
}

function openCornerTheMarketChoice(
  state: V070GameState,
  effect: V070FinancierAftermathEffect,
): void {
  const candidates = affordableDeedTerritoryInstanceIds(
    state,
    effect.owner,
  );
  if (candidates.length === 0) return;
  state.battleRuntime!.pendingFinancierAftermathChoice = {
    kind: 'corner_the_market',
    playerId: effect.owner,
    sourceInstanceId: effect.sourceInstanceId,
    candidateTerritoryInstanceIds: candidates,
  };
  appendV070Event(state, {
    type: 'corner_the_market_aftermath_pending',
    actor: effect.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: effect.sourceInstanceId,
      candidateCount: candidates.length,
      optional: true,
    },
  });
}

function openLeveragedBuyoutChoice(
  state: V070GameState,
  effect: V070FinancierAftermathEffect,
): void {
  const territoryInstanceId = contestedTerritoryInstanceId(state);
  if (!territoryInstanceId) return;
  const cost = v070DeedCost(state, effect.owner, territoryInstanceId);
  const candidates = leveragedBuyoutCollateralInstanceIds(
    state,
    effect.owner,
    effect.sourceInstanceId,
  );
  state.battleRuntime!.pendingFinancierAftermathChoice = {
    kind: 'leveraged_buyout',
    playerId: effect.owner,
    sourceInstanceId: effect.sourceInstanceId,
    territoryInstanceId,
    cost,
    candidateCollateralInstanceIds: candidates,
  };
  appendV070Event(state, {
    type: 'leveraged_buyout_aftermath_pending',
    actor: effect.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: effect.sourceInstanceId,
      territoryInstanceId,
      cost,
      candidateCount: candidates.length,
      optional: true,
    },
  });
}

function openNextMonetaryCrisisChoice(
  state: V070GameState,
  sourceOwner: PlayerId,
  sourceInstanceId: string,
  playerIds: readonly PlayerId[],
): void {
  const remaining = [...playerIds];
  while (remaining.length > 0) {
    const playerId = remaining.shift()!;
    const hand = [...state.players[playerId].zones.hand];
    if (hand.length <= 1) continue;
    state.battleRuntime!.pendingFinancierAftermathChoice = {
      kind: 'monetary_crisis',
      playerId,
      sourceOwner,
      sourceInstanceId,
      candidateInstanceIds: hand,
      remainingPlayerIds: remaining,
    };
    appendV070Event(state, {
      type: 'monetary_crisis_aftermath_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceOwner,
        playerId,
        handCount: hand.length,
      },
    });
    return;
  }

  state.battleRuntime!.pendingFinancierAftermathChoice = null;
  appendV070Event(state, {
    type: 'monetary_crisis_aftermath_complete',
    actor: sourceOwner,
    visibility: 'public',
    payload: { sourceInstanceId },
  });
}

function monetaryCrisisAffectedPlayers(
  state: V070GameState,
): PlayerId[] {
  const battle = state.battle;
  if (!battle) return [];
  return [battle.attacker, battle.defender].filter(
    playerId => state.players[playerId].zones.hand.length > 1,
  );
}

function affordableDeedTerritoryInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  if (!isV070FinancierPlayer(state, playerId)) return [];
  const capital = state.players[playerId].financiers!.capital;
  const result: string[] = [];
  for (const deed of state.deeds) {
    if (deed.owner === playerId) continue;
    if (deed.owner && !isV070FinancierPlayer(state, deed.owner)) continue;
    try {
      if (v070DeedCost(
        state,
        playerId,
        deed.territoryInstanceId,
      ) <= capital) {
        result.push(deed.territoryInstanceId);
      }
    } catch {
      // An ineligible Deed is not a candidate.
    }
  }
  return result;
}

function contestedTerritoryInstanceId(
  state: V070GameState,
): string | null {
  const battle = state.battle;
  if (!battle) return null;
  return state.board.find(
    territory => territory.position === battle.contestedPosition,
  )?.territoryInstanceId ?? null;
}

function leveragedBuyoutCollateralInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
): string[] {
  const participant = state.battleRuntime?.participants[playerId];
  if (!participant) return [];
  return [
    ...(participant.gambit ? [participant.gambit.instanceId] : []),
    ...participant.additionalGambits.map(
      commitment => commitment.instanceId,
    ),
    ...(participant.tactic ? [participant.tactic.instanceId] : []),
    ...participant.additionalTactics.map(
      commitment => commitment.instanceId,
    ),
    ...participant.reserve,
  ].filter(instanceId => instanceId !== sourceInstanceId);
}
