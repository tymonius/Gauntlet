import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type { V070CopyableEffectLabel } from './copied-effects';
import * as previous from './battle-engine-reveal-order-pre-witchcraft';
import {
  completeV070LateAdditionalTacticBattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import {
  applyV070LateAdditionalTacticRevealEffect,
  resumeV070SupportedRevealEffects,
} from './battle-effects';
import { resolveV070WitchcraftBattleChoice } from './witchcraft-battle';
import { resolveV070ArcaneKnowledgeBattleChoice } from './arcane-knowledge-battle';
import { resolveV070HeresyBattleChoice } from './heresy-battle';
import { resolveV070RendTheVeilBattleChoice } from './rend-the-veil-battle';
import { resolveV070ReconnaissanceBattleChoice } from './reconnaissance-battle';
import { applyV070BlasphemyForBattleReveal } from './inquisition';
import {
  resolveV070DivestmentBattleChoice,
  resolveV070FinancierImmediateSubsidizeChoice,
  resolveV070LiquidationBattleChoice,
  resolveV070MarginLoanBattleChoice,
} from './financier-pre-dice-battle';
import { recordV070MysticBattleEffectApplied } from './mystics';

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
    }
  | {
      type: 'resolve_heresy_battle';
      playerId: PlayerId;
      use: false;
    }
  | {
      type: 'resolve_heresy_battle';
      playerId: PlayerId;
      use: true;
      targetInstanceId: string;
      targetEffectLabel: V070CopyableEffectLabel;
    }
  | {
      type: 'resolve_rend_the_veil_battle';
      playerId: PlayerId;
      use: false;
    }
  | {
      type: 'resolve_rend_the_veil_battle';
      playerId: PlayerId;
      use: true;
      targetInstanceId: string;
      targetEffectLabel: V070CopyableEffectLabel;
    }
  | {
      type: 'resolve_reconnaissance_battle';
      playerId: PlayerId;
      withdraw: boolean;
    }
  | {
      type: 'resolve_late_additional_tactic';
      playerId: PlayerId;
      cardInstanceId?: string;
    }
  | {
      type: 'resolve_financier_divestment_battle';
      playerId: PlayerId;
      territoryInstanceId?: string;
    }
  | {
      type: 'resolve_financier_liquidation_battle';
      playerId: PlayerId;
      cardInstanceId?: string;
    }
  | {
      type: 'resolve_financier_margin_loan_battle';
      playerId: PlayerId;
      cardInstanceId?: string;
    }
  | {
      type: 'resolve_financier_immediate_subsidize';
      playerId: PlayerId;
      bonus: number;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind === 'financier_divestment'
    && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_financier_divestment_battle') {
      throw new V070GameActionError(
        'Resolve or decline the pending Divestment battle choice before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070DivestmentBattleChoice(
      next,
      action.playerId,
      action.territoryInstanceId,
    );
    if (!pendingV070BattleRevealChoice(next)) {
      resumeV070SupportedRevealEffects(next);
    }
    return next;
  }

  if (pending?.kind === 'financier_liquidation'
    && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_financier_liquidation_battle') {
      throw new V070GameActionError(
        'Resolve or decline the pending Liquidation battle choice before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070LiquidationBattleChoice(
      next,
      action.playerId,
      action.cardInstanceId,
    );
    if (!pendingV070BattleRevealChoice(next)) {
      resumeV070SupportedRevealEffects(next);
    }
    return next;
  }

  if (pending?.kind === 'financier_margin_loan'
    && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_financier_margin_loan_battle') {
      throw new V070GameActionError(
        'Resolve or decline the pending Margin Loan battle choice before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070MarginLoanBattleChoice(
      next,
      action.playerId,
      action.cardInstanceId,
    );
    if (!pendingV070BattleRevealChoice(next)) {
      resumeV070SupportedRevealEffects(next);
    }
    return next;
  }

  if (pending?.kind === 'financier_immediate_subsidize'
    && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_financier_immediate_subsidize') {
      throw new V070GameActionError(
        'Resolve or decline the card-granted immediate Subsidize choice before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070FinancierImmediateSubsidizeChoice(
      next,
      action.playerId,
      action.bonus,
    );
    resumeV070SupportedRevealEffects(next);
    return next;
  }
  if (pending?.kind === 'late_additional_tactic'
    && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_late_additional_tactic') {
      throw new V070GameActionError(
        'Choose or decline the pending late additional Tactic before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    const choice =
      completeV070LateAdditionalTacticBattleRevealChoice(next);
    if (choice.owner !== action.playerId) {
      throw new V070GameActionError(
        'Only the player granted the additional Tactic may resolve it.',
      );
    }

    if (action.cardInstanceId === undefined) {
      appendV070Event(next, {
        type: 'late_additional_tactic_declined',
        actor: action.playerId,
        visibility: 'public',
        payload: {
          sourceInstanceId: choice.sourceInstanceId,
          sourceCardId: choice.sourceCardId,
        },
      });
      if (choice.recordMysticSourceEffectAfterChoice) {
        recordV070MysticBattleEffectApplied(
          next,
          action.playerId,
          choice.sourceInstanceId,
        );
      }
      resumeV070SupportedRevealEffects(next);
      return next;
    }

    if (!choice.candidateInstanceIds.includes(
      action.cardInstanceId,
    )) {
      throw new V070GameActionError(
        'That card is not eligible for this additional Tactic.',
      );
    }
    const participant =
      next.battleRuntime?.participants[action.playerId];
    if (!participant) {
      throw new V070GameActionError(
        'A late additional Tactic requires an active participant.',
      );
    }
    const candidateZone = choice.candidateZone ?? 'reserve';
    const sourceZone = candidateZone === 'hand'
      ? next.players[action.playerId].zones.hand
      : participant.reserve;
    const index = sourceZone.indexOf(
      action.cardInstanceId,
    );
    if (index < 0) {
      throw new V070GameActionError(
        `The chosen additional Tactic is no longer in ${candidateZone === 'hand' ? 'Hand' : 'Reserve'}.`,
      );
    }

    sourceZone.splice(index, 1);
    const commitment = {
      instanceId: action.cardInstanceId,
      owner: action.playerId,
      role: 'tactic' as const,
      faceUp: true,
    };
    participant.additionalTactics.push(commitment);

    const cardId =
      next.cardInstances[action.cardInstanceId]?.cardId ?? '';
    appendV070Event(next, {
      type: 'tactic_chosen',
      actor: action.playerId,
      visibility: 'public',
      payload: {
        faceDown: false,
        lateAdditionalTactic: true,
        sourceInstanceId: choice.sourceInstanceId,
        sourceCardId: choice.sourceCardId,
        sourceZone: candidateZone,
      },
    });
    appendV070Event(next, {
      type: 'tactic_revealed',
      actor: action.playerId,
      visibility: 'public',
      payload: {
        instanceId: action.cardInstanceId,
        cardId,
        lateAdditionalTactic: true,
      },
    });
    applyV070BlasphemyForBattleReveal(
      next,
      action.playerId,
      cardId,
      'tactic',
    );

    if (choice.chosenDestination === 'graveyard') {
      const runtime = next.battleRuntime!;
      const existing =
        runtime.battleCardAftermathDestinationOverrides.find(
          override =>
            override.playerId === action.playerId
            && override.instanceId === action.cardInstanceId,
        );
      if (existing) {
        existing.destination = 'graveyard';
        existing.sourceCardId = choice.sourceCardId;
      } else {
        runtime.battleCardAftermathDestinationOverrides.push({
          sourceCardId: choice.sourceCardId,
          playerId: action.playerId,
          instanceId: action.cardInstanceId,
          destination: 'graveyard',
        });
      }
    }

    const unsupported =
      applyV070LateAdditionalTacticRevealEffect(
        next,
        commitment,
      );
    if (unsupported.length > 0 && next.battleRuntime) {
      next.battleRuntime.unsupportedEffects.push(...unsupported);
      next.battleRuntime.stage = 'halted';
      appendV070Event(next, {
        type: 'battle_halted_unsupported_effect',
        visibility: 'public',
        payload: {
          effects: unsupported.map(effect => ({
            owner: effect.owner,
            cardId: effect.cardId,
            role: effect.role,
            label: effect.label,
            text: effect.text,
            encounteredAt: effect.encounteredAt,
          })),
        },
      });
      return next;
    }

    if (choice.recordMysticSourceEffectAfterChoice) {
      recordV070MysticBattleEffectApplied(
        next,
        action.playerId,
        choice.sourceInstanceId,
      );
    }
    resumeV070SupportedRevealEffects(next);
    return next;
  }

  if (pending?.kind === 'reconnaissance'
    && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_reconnaissance_battle') {
      throw new V070GameActionError(
        'Choose whether Reconnaissance withdraws before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070ReconnaissanceBattleChoice(
      next,
      action.playerId,
      action.withdraw,
    );
    if (!action.withdraw) {
      resumeV070SupportedRevealEffects(next);
    }
    return next;
  }

  if (pending?.kind === 'rend_the_veil' && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_rend_the_veil_battle') {
      throw new V070GameActionError(
        'Choose whether Rend the Veil applies a Graveyard Tactic effect before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070RendTheVeilBattleChoice(
      next,
      action.playerId,
      action.use,
      action.use ? action.targetInstanceId : undefined,
      action.use ? action.targetEffectLabel : undefined,
    );
    return next;
  }

  if (pending?.kind === 'heresy' && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_heresy_battle') {
      throw new V070GameActionError(
        'Choose whether Heresy spends Conviction before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070HeresyBattleChoice(
      next,
      action.playerId,
      action.use,
      action.use ? action.targetInstanceId : undefined,
      action.use ? action.targetEffectLabel : undefined,
    );
    return next;
  }

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

  if (action.type === 'resolve_late_additional_tactic') {
    throw new V070GameActionError(
      'There is no open late additional-Tactic choice.',
    );
  }
  if (action.type === 'resolve_reconnaissance_battle') {
    throw new V070GameActionError(
      'There is no open Reconnaissance battle-effect choice.',
    );
  }
  if (action.type === 'resolve_rend_the_veil_battle') {
    throw new V070GameActionError('There is no open Rend the Veil battle-effect choice.');
  }
  if (action.type === 'resolve_heresy_battle') {
    throw new V070GameActionError('There is no open Heresy battle-effect choice.');
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
