import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  isV070BattleCardEffectNegated,
  v070BattleCommitment,
} from './battle-effect-status';

export const V070_DECOYS_ID = 'neutral-decoys' as const;
export const V070_DECOYS_BATTLE_TEXT =
  'An opposing effect that would negate or remove a card you have in battle must choose this card before another eligible card you control, if able.' as const;

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Revealed Decoys whose continuous battle-target restriction is established. */
    activeDecoysBattleInstanceIds?: string[];
  }
}

function validateV070DecoysAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_DECOYS_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_DECOYS_BATTLE_TEXT) {
    throw new Error('v0.7.0 Decoys battle text drifted from released authority.');
  }
}

validateV070DecoysAuthority();

/**
 * Establish Decoys' continuous target-priority restriction.
 *
 * Unlike a one-shot reveal instruction, this effect deliberately remains
 * negatable while it is protecting other battle cards. The shared
 * `battleCardEffectApplied` marker means a one-shot effect can no longer be
 * negated; Decoys is therefore registered here without setting that marker.
 * Once Decoys is negated or leaves battle, the restriction below stops seeing
 * it and later opposing effects may choose other eligible cards normally.
 */
export function registerV070DecoysBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Decoys battle protection requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_DECOYS_ID) {
    throw new V070GameActionError(
      'Decoys battle source does not match the revealed card instance.',
    );
  }

  runtime.activeDecoysBattleInstanceIds ??= [];
  if (!runtime.activeDecoysBattleInstanceIds.includes(sourceInstanceId)) {
    runtime.activeDecoysBattleInstanceIds.push(sourceInstanceId);
  }

  appendV070Event(state, {
    type: 'decoys_battle_protection_active',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_DECOYS_ID,
    },
  });
}

/**
 * Apply Decoys to an already rules-eligible target set. If one or more active
 * Decoys owned by the protected player are themselves eligible targets, an
 * opposing negate/remove effect must choose among those Decoys first. If no
 * Decoys are eligible under that effect's own targeting requirements, the
 * original candidate set is unchanged (the printed "if able" clause).
 */
export function restrictV070BattleTargetsByDecoys(
  state: V070GameState,
  protectedPlayer: PlayerId,
  candidateInstanceIds: readonly string[],
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime || candidateInstanceIds.length === 0) {
    return [...candidateInstanceIds];
  }

  const candidateSet = new Set(candidateInstanceIds);
  const decoys = (runtime.activeDecoysBattleInstanceIds ?? []).filter(
    instanceId =>
      candidateSet.has(instanceId)
      && state.cardInstances[instanceId]?.owner === protectedPlayer
      && state.cardInstances[instanceId]?.cardId === V070_DECOYS_ID
      && Boolean(v070BattleCommitment(state, instanceId))
      && !isV070BattleCardEffectNegated(state, instanceId),
  );

  return decoys.length > 0 ? decoys : [...candidateInstanceIds];
}

export function activeV070DecoysBattleInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return (state.battleRuntime?.activeDecoysBattleInstanceIds ?? []).filter(
    instanceId =>
      state.cardInstances[instanceId]?.owner === playerId
      && state.cardInstances[instanceId]?.cardId === V070_DECOYS_ID
      && Boolean(v070BattleCommitment(state, instanceId))
      && !isV070BattleCardEffectNegated(state, instanceId),
  );
}
