import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { preventV070OpposingHandReveal } from './counterintelligence';
import {
  applyV070NormalAftermathConviction,
  gainV070Conviction,
  isV070ArcaneCard,
} from './inquisition';

export const V070_BURNING_AT_THE_STAKE_ID =
  'inquisition-burning-at-the-stake' as const;
export const V070_BURNING_AT_THE_STAKE_BATTLE_TEXT =
  'In the Aftermath, if the opponent lost, they reveal their Hand. Put the card there with the highest card value in their Graveyard; choose among ties. If it has the Arcane trait, +1 Conviction.' as const;

export interface V070PendingBurningAtTheStakeAftermath {
  sourceInstanceId: string;
  owner: PlayerId;
  opponent: PlayerId;
  playerId: PlayerId;
  highestCardValue: number;
  revealedHandInstanceIds: string[];
  candidateInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    burningAtTheStakeBattleSourceInstanceIds?: string[];
    resolvedBurningAtTheStakeBattleSourceInstanceIds?: string[];
    pendingBurningAtTheStakeAftermath?:
      V070PendingBurningAtTheStakeAftermath | null;
  }
}

function validateV070BurningAtTheStakeAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(
    V070_BURNING_AT_THE_STAKE_ID,
  );
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_BURNING_AT_THE_STAKE_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Burning at the Stake battle text drifted from released authority.',
    );
  }
}

validateV070BurningAtTheStakeAuthority();

export function registerV070BurningAtTheStakeBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Burning at the Stake battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !==
      V070_BURNING_AT_THE_STAKE_ID) {
    throw new V070GameActionError(
      'Burning at the Stake battle source does not match the revealed card instance.',
    );
  }

  runtime.burningAtTheStakeBattleSourceInstanceIds ??= [];
  if (!runtime.burningAtTheStakeBattleSourceInstanceIds.includes(
    sourceInstanceId,
  )) {
    runtime.burningAtTheStakeBattleSourceInstanceIds.push(sourceInstanceId);
  }
}

export function pendingV070BurningAtTheStakeAftermath(
  state: V070GameState,
): V070PendingBurningAtTheStakeAftermath | null {
  return state.battleRuntime?.pendingBurningAtTheStakeAftermath ?? null;
}

export function unresolvedV070BurningAtTheStakeSourcesForPlayer(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const resolved = new Set(
    runtime.resolvedBurningAtTheStakeBattleSourceInstanceIds ?? [],
  );
  return (runtime.burningAtTheStakeBattleSourceInstanceIds ?? []).filter(
    sourceInstanceId =>
      !resolved.has(sourceInstanceId)
      && state.cardInstances[sourceInstanceId]?.owner === playerId,
  );
}

export function openV070BurningAtTheStakeAftermathForSource(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  const source = state.cardInstances[sourceInstanceId];
  if (!battle || !runtime || !source) {
    throw new V070GameActionError(
      'Burning at the Stake Aftermath requires an active battle and source card.',
    );
  }
  const owner = source.owner;
  if (source.cardId !== V070_BURNING_AT_THE_STAKE_ID
    || !unresolvedV070BurningAtTheStakeSourcesForPlayer(state, owner)
      .includes(sourceInstanceId)) {
    throw new V070GameActionError(
      'That Burning at the Stake source is not pending in this Aftermath.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  if (battle.loser !== opponent) {
    markBurningAtTheStakeResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'burning_at_the_stake_aftermath_inapplicable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_BURNING_AT_THE_STAKE_ID,
        opponent,
        reason: 'opponent_did_not_lose',
      },
    });
    return false;
  }

  const revealedHandInstanceIds = [...state.players[opponent].zones.hand];
  if (revealedHandInstanceIds.length === 0) {
    markBurningAtTheStakeResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'burning_at_the_stake_aftermath_no_hand',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_BURNING_AT_THE_STAKE_ID,
        opponent,
      },
    });
    return false;
  }

  if (preventV070OpposingHandReveal(
    state,
    owner,
    opponent,
    'Burning at the Stake',
    sourceInstanceId,
  )) {
    markBurningAtTheStakeResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'burning_at_the_stake_aftermath_prevented',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_BURNING_AT_THE_STAKE_ID,
        opponent,
        reason: 'counterintelligence',
      },
    });
    return false;
  }

  const values = revealedHandInstanceIds.map(instanceId =>
    v070CardValue(state, instanceId)
  );
  const highestCardValue = Math.max(...values);
  const candidateInstanceIds = revealedHandInstanceIds.filter(
    instanceId => v070CardValue(state, instanceId) === highestCardValue,
  );

  appendV070Event(state, {
    type: 'burning_at_the_stake_hand_revealed',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_BURNING_AT_THE_STAKE_ID,
      opponent,
      revealedHandInstanceIds: [...revealedHandInstanceIds],
      revealedCards: revealedHandInstanceIds.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId ?? null,
        cardValue: v070CardValue(state, instanceId),
      })),
      highestCardValue,
    },
  });

  if (candidateInstanceIds.length === 1) {
    resolveBurningAtTheStakeTarget(
      state,
      owner,
      opponent,
      sourceInstanceId,
      candidateInstanceIds[0],
    );
    return false;
  }

  runtime.pendingBurningAtTheStakeAftermath = {
    sourceInstanceId,
    owner,
    opponent,
    playerId: owner,
    highestCardValue,
    revealedHandInstanceIds,
    candidateInstanceIds,
  };
  appendV070Event(state, {
    type: 'burning_at_the_stake_aftermath_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_BURNING_AT_THE_STAKE_ID,
      opponent,
      highestCardValue,
      candidateInstanceIds: [...candidateInstanceIds],
    },
  });
  return true;
}

export function resolveV070BurningAtTheStakeAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): PlayerId {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingBurningAtTheStakeAftermath;
  if (!runtime || !pending) {
    throw new V070GameActionError(
      'No Burning at the Stake Aftermath choice is pending.',
    );
  }
  if (pending.playerId !== playerId) {
    throw new V070GameActionError(
      'Only the Burning at the Stake owner may choose among tied highest-value cards.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !state.players[pending.opponent].zones.hand.includes(targetInstanceId)
    || v070CardValue(state, targetInstanceId) !== pending.highestCardValue) {
    throw new V070GameActionError(
      'Burning at the Stake must choose a tied highest-value card from the revealed Hand.',
    );
  }

  runtime.pendingBurningAtTheStakeAftermath = null;
  resolveBurningAtTheStakeTarget(
    state,
    pending.owner,
    pending.opponent,
    pending.sourceInstanceId,
    targetInstanceId,
  );
  return pending.owner;
}

export function removeV070BurningAtTheStakeBattleRegistration(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.burningAtTheStakeBattleSourceInstanceIds =
    (runtime.burningAtTheStakeBattleSourceInstanceIds ?? []).filter(
      candidate => candidate !== sourceInstanceId,
    );
  if (runtime.pendingBurningAtTheStakeAftermath?.sourceInstanceId ===
    sourceInstanceId) {
    runtime.pendingBurningAtTheStakeAftermath = null;
  }
}

function resolveBurningAtTheStakeTarget(
  state: V070GameState,
  owner: PlayerId,
  opponent: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  const hand = state.players[opponent].zones.hand;
  const index = hand.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The Burning at the Stake target is no longer in the opponent\'s Hand.',
    );
  }
  hand.splice(index, 1);
  state.players[opponent].zones.graveyard.push(targetInstanceId);
  markBurningAtTheStakeResolved(state, sourceInstanceId);

  const targetCardId = state.cardInstances[targetInstanceId]?.cardId ?? '';
  const arcane = isV070ArcaneCard(targetCardId);
  appendV070Event(state, {
    type: 'burning_at_the_stake_card_graveyarded',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_BURNING_AT_THE_STAKE_ID,
      opponent,
      targetInstanceId,
      targetCardId,
      cardValue: v070CardValue(state, targetInstanceId),
      arcane,
    },
  });

  // The card enters the Graveyard during the Aftermath, so it also satisfies
  // the Inquisition's normal once-per-turn Conviction trigger independently of
  // Burning at the Stake's printed Arcane bonus.
  applyV070NormalAftermathConviction(state, owner, [targetInstanceId]);
  if (arcane) {
    gainV070Conviction(
      state,
      owner,
      1,
      'Burning at the Stake: highest-value Arcane card graveyarded',
    );
  }
}

function markBurningAtTheStakeResolved(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.resolvedBurningAtTheStakeBattleSourceInstanceIds ??= [];
  if (!runtime.resolvedBurningAtTheStakeBattleSourceInstanceIds.includes(
    sourceInstanceId,
  )) {
    runtime.resolvedBurningAtTheStakeBattleSourceInstanceIds.push(
      sourceInstanceId,
    );
  }
}

function v070CardValue(
  state: V070GameState,
  instanceId: string,
): number {
  const cardId = state.cardInstances[instanceId]?.cardId;
  const value = cardId
    ? v070CanonicalContent.cardsById.get(cardId)?.cost
    : undefined;
  if (value === undefined) {
    throw new V070GameActionError(
      'Burning at the Stake could not determine that card\'s printed value.',
    );
  }
  return value;
}
