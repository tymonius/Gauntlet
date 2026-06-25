import type { BattleModifier, EffectContext, EffectHandler, EffectResult, EffectTiming } from './types';

export class EffectRegistry {
  private handlers: EffectHandler[];

  constructor(handlers: EffectHandler[] = []) {
    this.handlers = handlers;
  }

  register(handler: EffectHandler): EffectRegistry {
    return new EffectRegistry([...this.handlers, handler]);
  }

  forTiming(timing: EffectTiming): EffectHandler[] {
    return this.handlers.filter((handler) => handler.timing.includes(timing));
  }

  resolve(context: EffectContext): EffectResult {
    const results = this.forTiming(context.timing)
      .filter((handler) => handler.applies(context))
      .map((handler) => handler.resolve(context));

    return mergeEffectResults(results);
  }
}

export function mergeEffectResults(results: EffectResult[]): EffectResult {
  return {
    modifiers: results.flatMap((result) => result.modifiers ?? []),
    destinationOverrides: results.flatMap((result) => result.destinationOverrides ?? []),
    logMessages: results.flatMap((result) => result.logMessages ?? []),
  };
}

export function totalModifiersFor(modifiers: BattleModifier[] | undefined, playerId: string): number {
  return (modifiers ?? [])
    .filter((modifier) => modifier.playerId === playerId)
    .reduce((total, modifier) => total + modifier.amount, 0);
}

export const emptyEffectRegistry = new EffectRegistry();
