import type { V070BattleEffectHandler } from './battle-effects-core-pre-counterworks-authority';

export type V070WitchcraftBattleEffectHandlerResolver = (
  cardId: string,
) => V070BattleEffectHandler | undefined;

let resolver: V070WitchcraftBattleEffectHandlerResolver | null = null;

export function configureV070WitchcraftBattleEffectHandlerResolver(
  nextResolver: V070WitchcraftBattleEffectHandlerResolver,
): void {
  resolver = nextResolver;
}

export function resolveV070WitchcraftBattleEffectHandler(
  cardId: string,
): V070BattleEffectHandler | undefined {
  if (!resolver) {
    throw new Error(
      'Witchcraft battle-effect handler resolution was used before the battle-effect registry was initialized.',
    );
  }
  return resolver(cardId);
}
