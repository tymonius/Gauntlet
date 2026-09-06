import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export interface V070BattleRevealEffectOrderChoiceRuntime {
  playerId: PlayerId;
  candidateInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    pendingRevealEffectOrderChoice?: V070BattleRevealEffectOrderChoiceRuntime | null;
    pendingRevealEffectNextPlayer?: PlayerId | null;
    pendingRevealForcedInstanceId?: string | null;
  }
}

export function pendingV070BattleRevealEffectOrderChoice(
  state: V070GameState,
): V070BattleRevealEffectOrderChoiceRuntime | null {
  return state.battleRuntime?.pendingRevealEffectOrderChoice ?? null;
}

export function openV070BattleRevealEffectOrderChoice(
  state: V070GameState,
  playerId: PlayerId,
  candidateInstanceIds: readonly string[],
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Reveal effect ordering requires an active battle runtime.',
    );
  }
  if (runtime.pendingRevealEffectOrderChoice) return true;
  if (candidateInstanceIds.length < 2) return false;

  runtime.pendingRevealEffectOrderChoice = {
    playerId,
    candidateInstanceIds: [...candidateInstanceIds],
  };
  appendV070Event(state, {
    type: 'battle_reveal_effect_order_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      candidateCount: candidateInstanceIds.length,
      revealClass: runtime.pendingRevealEffectClass ?? 'ordinary',
    },
  });
  appendV070Event(state, {
    type: 'battle_reveal_effect_order_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      playerId,
      candidateInstanceIds: [...candidateInstanceIds],
      revealClass: runtime.pendingRevealEffectClass ?? 'ordinary',
    },
  });
  return true;
}

export function resolveV070BattleRevealEffectOrderChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingRevealEffectOrderChoice;
  if (!runtime || !pending) {
    throw new V070GameActionError(
      'No reveal effect order choice is pending.',
    );
  }
  if (pending.playerId !== playerId) {
    throw new V070GameActionError(
      'Only the player with reveal-effect priority may choose which effect to apply next.',
    );
  }
  if (!pending.candidateInstanceIds.includes(sourceInstanceId)) {
    throw new V070GameActionError(
      'That battle card is not an eligible next reveal effect.',
    );
  }

  const stillPending = runtime.pendingRevealEffectCommitments?.some(
    commitment =>
      commitment.owner === playerId
      && commitment.instanceId === sourceInstanceId,
  );
  if (!stillPending) {
    throw new V070GameActionError(
      'That reveal effect is no longer pending.',
    );
  }

  runtime.pendingRevealEffectOrderChoice = null;
  runtime.pendingRevealForcedInstanceId = sourceInstanceId;
  appendV070Event(state, {
    type: 'battle_reveal_effect_order_chosen',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      sourceInstanceId,
      sourceCardId: state.cardInstances[sourceInstanceId]?.cardId ?? null,
      revealClass: runtime.pendingRevealEffectClass ?? 'ordinary',
    },
  });
}
