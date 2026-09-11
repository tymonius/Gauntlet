import type { V070GameState } from './engine';
import type { V070CopiedEffectApplication } from './copied-effects';

declare module './battle-types' {
  interface V070BattleRuntime {
    activeCopiedEffectApplication?: V070CopiedEffectApplication | null;
  }
}

export function activeV070CopiedEffectApplication(
  state: V070GameState,
): V070CopiedEffectApplication | null {
  return state.battleRuntime?.activeCopiedEffectApplication ?? null;
}

export function withV070CopiedEffectApplication<T>(
  state: V070GameState,
  application: V070CopiedEffectApplication,
  apply: () => T,
): T {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new Error('Copied battle-effect application requires an active battle runtime.');
  }
  const previous = runtime.activeCopiedEffectApplication ?? null;
  runtime.activeCopiedEffectApplication = application;
  try {
    return apply();
  } finally {
    runtime.activeCopiedEffectApplication = previous;
  }
}
