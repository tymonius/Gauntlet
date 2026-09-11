import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';

interface DeferredRuntimeSurface {
  landslideBattleInstanceIds?: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Battle-card effects that have been negated while still unapplied. */
    negatedBattleCardEffectInstanceIds?: string[];
    /** Battle-card effects whose instruction has already taken effect. */
    appliedBattleCardEffectInstanceIds?: string[];
  }
}

export function isV070BattleCardEffectNegated(
  state: V070GameState,
  instanceId: string,
): boolean {
  return Boolean(
    state.battleRuntime?.negatedBattleCardEffectInstanceIds?.includes(instanceId),
  );
}

export function hasV070BattleCardEffectApplied(
  state: V070GameState,
  instanceId: string,
): boolean {
  return Boolean(
    state.battleRuntime?.appliedBattleCardEffectInstanceIds?.includes(instanceId),
  );
}

export function markV070BattleCardEffectApplied(
  state: V070GameState,
  instanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Battle-card effect application requires an active battle runtime.',
    );
  }
  runtime.appliedBattleCardEffectInstanceIds ??= [];
  if (!runtime.appliedBattleCardEffectInstanceIds.includes(instanceId)) {
    runtime.appliedBattleCardEffectInstanceIds.push(instanceId);
  }
}

export function negateV070BattleCardEffect(
  state: V070GameState,
  targetInstanceId: string,
  sourceInstanceId: string,
  sourceCardId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Battle-card negation requires an active battle runtime.',
    );
  }
  const commitment = v070BattleCommitment(state, targetInstanceId);
  if (!commitment) {
    throw new V070GameActionError(
      'A negation target must still be committed in the current battle.',
    );
  }
  if (hasV070BattleCardEffectApplied(state, targetInstanceId)) {
    throw new V070GameActionError(
      'A battle-card effect cannot be negated after it has taken effect.',
    );
  }

  runtime.negatedBattleCardEffectInstanceIds ??= [];
  if (!runtime.negatedBattleCardEffectInstanceIds.includes(targetInstanceId)) {
    runtime.negatedBattleCardEffectInstanceIds.push(targetInstanceId);
  }
  cancelDeferredRegistration(state, targetInstanceId);

  appendV070Event(state, {
    type: 'battle_card_effect_negated',
    actor: state.cardInstances[sourceInstanceId]?.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      targetOwner: commitment.owner,
      targetRole: commitment.role,
    },
  });
}

export function v070BattleCommitment(
  state: V070GameState,
  instanceId: string,
): V070BattleCardCommitment | null {
  const runtime = state.battleRuntime;
  if (!runtime) return null;
  for (const playerId of ['A', 'B'] as const) {
    const participant = runtime.participants[playerId];
    const commitments = [
      participant.gambit,
      ...participant.additionalGambits,
      participant.tactic,
      ...participant.additionalTactics,
    ];
    const found = commitments.find(
      (candidate): candidate is V070BattleCardCommitment =>
        Boolean(candidate && candidate.instanceId === instanceId),
    );
    if (found) return found;
  }
  return null;
}

function cancelDeferredRegistration(
  state: V070GameState,
  targetInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;

  runtime.battleAccursedWagerInstanceIds =
    runtime.battleAccursedWagerInstanceIds.filter(
      instanceId => instanceId !== targetInstanceId,
    );
  runtime.additionalRetreatEffects = runtime.additionalRetreatEffects.filter(
    effect => effect.sourceInstanceId !== targetInstanceId,
  );
  runtime.aftermathDrawEffects = runtime.aftermathDrawEffects.filter(
    effect => effect.sourceInstanceId !== targetInstanceId,
  );
  runtime.battleCardAftermathDestinationOverrides =
    runtime.battleCardAftermathDestinationOverrides.filter(
      effect => effect.instanceId !== targetInstanceId,
    );
  runtime.battleCardAftermathOverlayPlacements =
    runtime.battleCardAftermathOverlayPlacements.filter(
      effect => effect.sourceInstanceId !== targetInstanceId,
    );
  runtime.battleCardAftermathTerritoryInsertions =
    runtime.battleCardAftermathTerritoryInsertions.filter(
      effect => effect.sourceInstanceId !== targetInstanceId,
    );
  runtime.battleCardAftermathAssetBanks =
    runtime.battleCardAftermathAssetBanks.filter(
      effect => effect.sourceInstanceId !== targetInstanceId,
    );
  runtime.unbrokenRanksInstanceIds = runtime.unbrokenRanksInstanceIds.filter(
    instanceId => instanceId !== targetInstanceId,
  );

  const augmented = runtime as typeof runtime & DeferredRuntimeSurface;
  augmented.landslideBattleInstanceIds =
    augmented.landslideBattleInstanceIds?.filter(
      instanceId => instanceId !== targetInstanceId,
    );
}
