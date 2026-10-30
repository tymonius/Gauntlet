import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { activeV070CopiedEffectApplication } from './copied-effect-runtime';

type NumericBattleStat = 'battleModifier' | 'advantage' | 'disadvantage';

export interface V070BattleNumericEffectContribution {
  sourceInstanceId: string;
  sourceCardId: string;
  targetPlayer: PlayerId;
  stat: NumericBattleStat;
  amount: number;
}

// Only the exact printed battle effects whose handler does nothing but
// adjust a numeric participant field are eligible for this reversal path.
// No draws, movements, copied effects, pending choices, or aftermath actions.
const PURE_NUMERIC_BATTLE_EFFECT_CARD_IDS = new Set([
  'neutral-new-recruits',
  'neutral-rallying-cry',
  'diplomats-gunboat-diplomacy',
  'neutral-forced-march',
  'neutral-stand-ground',
  'neutral-entrenchment',
  'neutral-advance-guard',
]);

declare module './battle-types' {
  interface V070BattleRuntime {
    reversibleBattleNumericEffects?: V070BattleNumericEffectContribution[];
  }
}

export function applyV070ReversibleBattleNumericEffect(
  state: V070GameState,
  sourceInstanceId: string,
  sourceCardId: string,
  targetPlayer: PlayerId,
  stat: NumericBattleStat,
  amount: number,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || !state.battle) {
    throw new V070GameActionError(
      'Battle-card numeric effects require an active battle.',
    );
  }
  if (!PURE_NUMERIC_BATTLE_EFFECT_CARD_IDS.has(sourceCardId)
    || state.cardInstances[sourceInstanceId]?.cardId !== sourceCardId
    || !Number.isFinite(amount) || amount <= 0) {
    throw new V070GameActionError(
      'This printed battle-card effect cannot use numeric-only reversal.',
    );
  }
  // Repeating/copying a printed effect is attributed to its copier, not to
  // the physical card whose text was copied. Returning that physical card
  // must not reverse another card's independent copied contribution.
  if (activeV070CopiedEffectApplication(state)) {
    runtime.participants[targetPlayer][stat] += amount;
    return;
  }
  runtime.reversibleBattleNumericEffects ??= [];
  runtime.participants[targetPlayer][stat] += amount;
  runtime.reversibleBattleNumericEffects.push({
    sourceInstanceId, sourceCardId, targetPlayer, stat, amount,
  });
}

/** Only a recorded contribution from a verified pure-numeric card is reversible. */
export function canReverseV070BattleNumericEffects(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const cardId = state.cardInstances[sourceInstanceId]?.cardId;
  if (!cardId || !PURE_NUMERIC_BATTLE_EFFECT_CARD_IDS.has(cardId)) {
    return false;
  }
  const entries = state.battleRuntime?.reversibleBattleNumericEffects?.filter(
    entry => entry.sourceInstanceId === sourceInstanceId,
  ) ?? [];
  return entries.length > 0
    && entries.every(entry =>
      entry.sourceCardId === cardId
      && (entry.targetPlayer === 'A' || entry.targetPlayer === 'B')
      && (entry.stat === 'battleModifier'
        || entry.stat === 'advantage'
        || entry.stat === 'disadvantage')
      && Number.isFinite(entry.amount) && entry.amount > 0);
}

/**
 * Compensating state/event transition, not an erasure of reveal history.
 * Use only after the caller validates the entire return set atomically.
 */
export function reverseV070BattleNumericEffects(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  const entries = runtime.reversibleBattleNumericEffects?.filter(
    entry => entry.sourceInstanceId === sourceInstanceId,
  ) ?? [];
  if (entries.length === 0) return;
  if (!canReverseV070BattleNumericEffects(state, sourceInstanceId)) {
    throw new V070GameActionError(
      'This card has no verified reversible numeric battle effect.',
    );
  }
  for (const entry of entries) {
    runtime.participants[entry.targetPlayer][entry.stat] -= entry.amount;
  }
  runtime.reversibleBattleNumericEffects =
    runtime.reversibleBattleNumericEffects!.filter(
      entry => entry.sourceInstanceId !== sourceInstanceId,
    );
  runtime.appliedBattleCardEffectInstanceIds =
    runtime.appliedBattleCardEffectInstanceIds?.filter(
      id => id !== sourceInstanceId,
    );
  appendV070Event(state, {
    type: 'battle_card_numeric_effect_reversed',
    actor: state.cardInstances[sourceInstanceId]?.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: state.cardInstances[sourceInstanceId]?.cardId,
      changes: entries.map(({ targetPlayer, stat, amount }) => ({
        targetPlayer, stat, amount: -amount,
      })),
    },
  });
}
