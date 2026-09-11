import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type { V070CopyableEffectLabel } from './copied-effects';
import * as previous from './battle-engine-reveal-order-pre-witchcraft';
import {
  isV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import { resolveV070WitchcraftBattleChoice } from './witchcraft-battle';
import { resolveV070ArcaneKnowledgeBattleChoice } from './arcane-knowledge-battle';

export * from './battle-engine-reveal-order-pre-witchcraft';

export type V070BattleAction =
  | previous.V070BattleAction
  | {
      type: 'resolve_witchcraft_battle';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_arcane_knowledge_battle';
      playerId: PlayerId;
      targetInstanceId: string;
      targetEffectLabel: V070CopyableEffectLabel;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind === 'arcane_knowledge'
    && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_arcane_knowledge_battle') {
      throw new V070GameActionError(
        'Choose the Graveyard effect Arcane Knowledge applies before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070ArcaneKnowledgeBattleChoice(
      next,
      action.playerId,
      action.targetInstanceId,
      action.targetEffectLabel,
    );
    return next;
  }

  if (pending?.kind === 'witchcraft' && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_witchcraft_battle') {
      throw new V070GameActionError(
        'Choose the battle effect Witchcraft repeats before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070WitchcraftBattleChoice(
      next,
      action.playerId,
      action.targetInstanceId,
    );
    return next;
  }

  if (action.type === 'resolve_arcane_knowledge_battle') {
    throw new V070GameActionError(
      'There is no open Arcane Knowledge battle-effect choice.',
    );
  }
  if (action.type === 'resolve_witchcraft_battle') {
    throw new V070GameActionError('There is no open Witchcraft battle-effect choice.');
  }

  return previous.reduceV070BattleAction(
    state,
    action as previous.V070BattleAction,
  );
}
