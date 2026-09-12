import type { V070GameState } from './engine';
import type { V070CopiedEffectApplication } from './copied-effects';
import type { PlayerId } from './rules';

declare module './battle-types' {
  interface V070BattleRuntime {
    activeCopiedEffectApplication?: V070CopiedEffectApplication | null;
    activeCopiedEffectSourceInstanceId?: string | null;
  }
}

export function activeV070CopiedEffectApplication(
  state: V070GameState,
): V070CopiedEffectApplication | null {
  return state.battleRuntime?.activeCopiedEffectApplication ?? null;
}

export function isV070ActiveCopiedEffectSource(
  state: V070GameState,
  controller: PlayerId,
  sourceInstanceId: string,
  cardId: string,
): boolean {
  const runtime = state.battleRuntime;
  const application = runtime?.activeCopiedEffectApplication;
  return Boolean(
    runtime
    && application
    && application.controller === controller
    && application.cardId === cardId
    && runtime.activeCopiedEffectSourceInstanceId === sourceInstanceId
  );
}

export function withV070CopiedEffectApplication<T>(
  state: V070GameState,
  application: V070CopiedEffectApplication,
  apply: () => T,
  sourceInstanceId?: string,
): T {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new Error('Copied battle-effect application requires an active battle runtime.');
  }
  const previous = runtime.activeCopiedEffectApplication ?? null;
  const previousSourceInstanceId = runtime.activeCopiedEffectSourceInstanceId ?? null;
  const physicalSource = sourceInstanceId
    ? state.cardInstances[sourceInstanceId]
    : undefined;
  const physicalOwner = physicalSource?.owner;

  runtime.activeCopiedEffectApplication = application;
  runtime.activeCopiedEffectSourceInstanceId = sourceInstanceId ?? null;
  if (physicalSource) {
    // A copied printed effect is controlled by the copier even when Heresy
    // selected an opponent-owned physical Graveyard card. Existing battle
    // handlers legitimately validate/derive "you" from source ownership, so
    // expose the copied controller only for the duration of effect execution.
    // The physical card's permanent owner and zone are restored afterward.
    physicalSource.owner = application.controller;
  }
  try {
    return apply();
  } finally {
    if (physicalSource && physicalOwner) {
      physicalSource.owner = physicalOwner;
    }
    runtime.activeCopiedEffectApplication = previous;
    runtime.activeCopiedEffectSourceInstanceId = previousSourceInstanceId;
  }
}
