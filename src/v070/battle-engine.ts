import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  reduceV070BattleAction as reduceV070BattleActionPreWarBonds,
  type V070BattleAction as V070PreWarBondsBattleAction,
} from './battle-engine-prewar-bonds';
import {
  resumeV070SupportedRevealEffects,
  v070BattleRevealEffectsPending,
} from './battle-effects';
import { openV070WarBondsAfterFirstBattle } from './war-bonds';
import {
  openV070ReembodimentRecovery,
  pendingV070ReembodimentRecovery,
  recordV070ReembodimentQualifyingTransition,
  resolveV070ReembodimentRecovery,
  type V070ReembodimentContinuation,
} from './reembodiment';
import {
  openV070SpiritHollowAftermathChoice,
} from './spirit-hollow';
import {
  openV070SubversionAssetBattleWindow,
  resolveV070SubversionAssetBattleChoice,
} from './subversion-asset';
import type { V070SubversionAssetBattleContinuation } from './battle-types';
import {
  pruneV070ProtractedSiegeAftermathPlacements,
  resolveV070ProtractedSiegeDepartures,
} from './protracted-siege';
import {
  openV070LandslideAftermathChoice,
  pendingV070LandslideAftermath,
  resolveV070LandslideAftermathChoice,
} from './landslide';
import {
  openV070DivineMercyBattleChoice,
  resolveV070DivineMercyBattleChoice,
} from './divine-mercy-battle';
import {
  openV070DarkOmensBattleChoice,
  resolveV070DarkOmensBattleChoice,
} from './dark-omens-battle';
import {
  openV070PenanceBattleChoice,
  resolveV070PenanceBattleChoice,
} from './penance-battle';
import {
  applyV070PropertyDuesAftermathEffects,
  openV070PropertyDuesBattleChoice,
  resolveV070PropertyDuesBattleChoice,
} from './property-dues-battle';
import {
  openV070RequisitionBattleChoice,
  resolveV070RequisitionBattleChoice,
} from './requisition-battle';
import {
  openV070SeditionBattleChoice,
  resolveV070SeditionBattleChoice,
} from './sedition-battle';
import {
  applyV070SpeculationAftermathEffects,
  openV070SpeculationBattleChoice,
  resolveV070SpeculationBattleChoice,
} from './speculation-battle';
import {
  openV070TariffsBattleChoice,
  resolveV070TariffsBattleChoice,
} from './tariffs-battle';
import {
  isV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import { v070MysticInvocationPendingPlayers } from './mystics';

export * from './battle-engine-prewar-bonds';

export type V070BattleAction =
  | V070PreWarBondsBattleAction
  | {
      type: 'resolve_reembodiment_recovery';
      playerId: PlayerId;
      targetInstanceId?: string;
    }
  | {
      type: 'resolve_landslide_aftermath';
      playerId: PlayerId;
      sourceInstanceId?: string;
    }
  | {
      type: 'resolve_divine_mercy_battle';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_dark_omens_battle';
      playerId: PlayerId;
      use: boolean;
    }
  | {
      type: 'resolve_sedition_battle';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_requisition_battle';
      playerId: PlayerId;
      assetInstanceId?: string;
    }
  | {
      type: 'resolve_tariffs_battle';
      playerId: PlayerId;
      cardInstanceId?: string;
    }
  | {
      type: 'resolve_penance_battle';
      playerId: PlayerId;
      choice: 'graveyard' | 'battle_total';
      cardInstanceId?: string;
    }
  | {
      type: 'resolve_property_dues_battle';
      playerId: PlayerId;
      choice: 'discard' | 'capital';
      cardInstanceId?: string;
    }
  | {
      type: 'resolve_speculation_battle';
      playerId: PlayerId;
      use: boolean;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const pendingRevealChoice = pendingV070BattleRevealChoice(state);
  if (pendingRevealChoice && isV070BattleRevealChoiceOpen(state)) {
    if (pendingRevealChoice.kind === 'divine_mercy') {
      if (action.type !== 'resolve_divine_mercy_battle') {
        throw new V070GameActionError(
          'Resolve the pending Divine Mercy Graveyard choice before continuing the battle.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      resolveV070DivineMercyBattleChoice(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      continueV070BattleRevealProcedure(next);
      return next;
    }

    if (pendingRevealChoice.kind === 'dark_omens') {
      if (action.type !== 'resolve_dark_omens_battle') {
        throw new V070GameActionError(
          'Resolve or decline the pending Dark Omens battle choice before continuing the battle.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      const result = resolveV070DarkOmensBattleChoice(
        next,
        action.playerId,
        action.use,
      );
      if (result.graveyardedInstanceId
        && openReembodimentAfterBattleEffect(
          next,
          result.playerId,
          [result.graveyardedInstanceId],
          'Dark Omens',
        )) {
        return next;
      }
      continueV070BattleRevealProcedure(next);
      return next;
    }

    if (pendingRevealChoice.kind === 'sedition') {
      if (action.type !== 'resolve_sedition_battle') {
        throw new V070GameActionError(
          'Resolve the pending Sedition Asset choice before continuing the battle.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      resolveV070SeditionBattleChoice(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      continueV070BattleRevealProcedure(next);
      return next;
    }

    if (pendingRevealChoice.kind === 'requisition') {
      if (action.type !== 'resolve_requisition_battle') {
        throw new V070GameActionError(
          'Resolve or decline the pending Requisition Asset choice before continuing the battle.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      resolveV070RequisitionBattleChoice(
        next,
        action.playerId,
        action.assetInstanceId,
      );
      continueV070BattleRevealProcedure(next);
      return next;
    }

    if (pendingRevealChoice.kind === 'tariffs') {
      if (action.type !== 'resolve_tariffs_battle') {
        throw new V070GameActionError(
          'Resolve or decline the pending Tariffs Hand-discard choice before continuing the battle.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      resolveV070TariffsBattleChoice(
        next,
        action.playerId,
        action.cardInstanceId,
      );
      continueV070BattleRevealProcedure(next);
      return next;
    }

    if (pendingRevealChoice.kind === 'penance') {
      if (action.type !== 'resolve_penance_battle') {
        throw new V070GameActionError(
          'Resolve the pending Penance choice before continuing the battle.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      resolveV070PenanceBattleChoice(
        next,
        action.playerId,
        action.choice,
        action.cardInstanceId,
      );
      continueV070BattleRevealProcedure(next);
      return next;
    }

    if (pendingRevealChoice.kind === 'property_dues') {
      if (action.type !== 'resolve_property_dues_battle') {
        throw new V070GameActionError(
          'Resolve the pending Property Dues choice before continuing the battle.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      resolveV070PropertyDuesBattleChoice(
        next,
        action.playerId,
        action.choice,
        action.cardInstanceId,
      );
      continueV070BattleRevealProcedure(next);
      return next;
    }

    if (pendingRevealChoice.kind === 'speculation') {
      if (action.type !== 'resolve_speculation_battle') {
        throw new V070GameActionError(
          'Resolve or decline the pending Speculation Capital spend before continuing the battle.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      resolveV070SpeculationBattleChoice(
        next,
        action.playerId,
        action.use,
      );
      continueV070BattleRevealProcedure(next);
      return next;
    }
  }
  if (action.type === 'resolve_divine_mercy_battle') {
    throw new V070GameActionError(
      'There is no open Divine Mercy battle choice.',
    );
  }
  if (action.type === 'resolve_dark_omens_battle') {
    throw new V070GameActionError(
      'There is no open Dark Omens battle choice.',
    );
  }
  if (action.type === 'resolve_sedition_battle') {
    throw new V070GameActionError(
      'There is no open Sedition battle choice.',
    );
  }
  if (action.type === 'resolve_requisition_battle') {
    throw new V070GameActionError(
      'There is no open Requisition battle choice.',
    );
  }
  if (action.type === 'resolve_tariffs_battle') {
    throw new V070GameActionError(
      'There is no open Tariffs battle choice.',
    );
  }
  if (action.type === 'resolve_penance_battle') {
    throw new V070GameActionError(
      'There is no open Penance battle choice.',
    );
  }
  if (action.type === 'resolve_property_dues_battle') {
    throw new V070GameActionError(
      'There is no open Property Dues battle choice.',
    );
  }
  if (action.type === 'resolve_speculation_battle') {
    throw new V070GameActionError(
      'There is no open Speculation battle choice.',
    );
  }

  const pendingRecovery = pendingV070ReembodimentRecovery(state);
  if (pendingRecovery) {
    if (action.type !== 'resolve_reembodiment_recovery') {
      throw new V070GameActionError(
        'Resolve or decline the pending Reembodiment recovery before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    const sourceLabel = pendingRecovery.sourceLabel;
    resolveV070ReembodimentRecovery(
      next,
      action.playerId,
      action.targetInstanceId,
    );
    return resumeAfterReembodimentBattlePause(next, sourceLabel);
  }
  if (action.type === 'resolve_reembodiment_recovery') {
    throw new V070GameActionError(
      'There is no pending Reembodiment recovery.',
    );
  }

  const pendingSubversion = state.battleRuntime?.pendingSubversionAssetBattle;
  const reembodimentSubversion = pendingSubversion
    && isReembodimentContinuation(
      pendingSubversion.deferredAction as unknown,
    )
    ? pendingSubversion
    : null;
  if (reembodimentSubversion) {
    if (action.type !== 'resolve_subversion_asset') {
      throw new V070GameActionError(
        'Resolve or decline the pending Subversion response to Reembodiment before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    const resolved = resolveV070SubversionAssetBattleChoice(
      next,
      action.playerId,
      action.choice,
      action.subversionInstanceId,
    );
    const continuation = resolved.pending.deferredAction as unknown;
    if (!isReembodimentContinuation(continuation)) {
      throw new V070GameActionError(
        'The pending Subversion continuation no longer matches Reembodiment.',
      );
    }
    if (!resolved.used
      && openV070ReembodimentRecovery(next, continuation)) {
      return next;
    }
    return resumeAfterReembodimentBattlePause(
      next,
      continuation.sourceLabel,
    );
  }

  const pendingLandslide = pendingV070LandslideAftermath(state);
  if (pendingLandslide) {
    if (action.type !== 'resolve_landslide_aftermath') {
      throw new V070GameActionError(
        'Resolve or decline the pending Landslide placement before continuing the Aftermath.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070LandslideAftermathChoice(
      next,
      action.playerId,
      action.sourceInstanceId,
    );
    const battle = next.battle;
    if (!battle) return next;
    return reduceV070BattleAction(next, {
      type: 'complete_aftermath',
      playerId: battle.attacker,
    });
  }
  if (action.type === 'resolve_landslide_aftermath') {
    throw new V070GameActionError(
      'There is no pending Landslide Aftermath placement.',
    );
  }

  if (action.type === 'complete_aftermath') {
    const landslidePrepared = structuredClone(state) as V070GameState;
    if (openV070LandslideAftermathChoice(landslidePrepared)) {
      return landslidePrepared;
    }
  }

  const prepared = action.type === 'complete_aftermath'
    ? structuredClone(state) as V070GameState
    : state;
  if (action.type === 'complete_aftermath') {
    pruneV070ProtractedSiegeAftermathPlacements(prepared);
  }

  const previousPositions = battleOrPlayerPositions(prepared);
  const controlled = reembodimentControlledBattleEffect(action);
  const beforeHand = controlled
    ? [...prepared.players[controlled.playerId].zones.hand]
    : [];
  const battleOrder = prepared.battle
    ? [prepared.battle.attacker, prepared.battle.defender] as const
    : null;
  const next = reduceV070BattleActionPreWarBonds(
    prepared,
    action as V070PreWarBondsBattleAction,
  );
  applyV070PropertyDuesAftermathEffects(next);
  applyV070SpeculationAftermathEffects(next);
  resolveV070ProtractedSiegeDepartures(
    next,
    previousPositions,
    battleOrPlayerPositions(next),
  );

  if (controlled) {
    const moved = beforeHand.filter(instanceId =>
      !next.players[controlled.playerId].zones.hand.includes(instanceId)
      && next.players[controlled.playerId].zones.graveyard.includes(instanceId)
    );
    if (openReembodimentAfterBattleEffect(
      next,
      controlled.playerId,
      moved,
      controlled.sourceLabel,
    )) {
      return next;
    }
  }

  if (continueV070BattleRevealProcedure(next)) return next;

  if (!next.battle) {
    openV070WarBondsAfterFirstBattle(
      next,
      battleOrder ?? undefined,
    );
  }
  return next;
}

/**
 * Continue one simultaneous reveal in exact alternating effect order. A card
 * choice or Mystic Invocation pauses before any later reveal effect applies.
 */
function continueV070BattleRevealProcedure(
  state: V070GameState,
): boolean {
  while (true) {
    if (v070MysticInvocationPendingPlayers(state).length > 0
      || pendingV070ReembodimentRecovery(state)
      || isReembodimentSubversionPending(state)) {
      return true;
    }

    const pending = pendingV070BattleRevealChoice(state);
    if (pending) {
      if (isV070BattleRevealChoiceOpen(state)) return true;

      let opened = false;
      switch (pending.kind) {
        case 'divine_mercy':
          opened = openV070DivineMercyBattleChoice(state);
          break;
        case 'dark_omens':
          opened = openV070DarkOmensBattleChoice(state);
          break;
        case 'sedition':
          opened = openV070SeditionBattleChoice(state);
          break;
        case 'requisition':
          opened = openV070RequisitionBattleChoice(state);
          break;
        case 'tariffs':
          opened = openV070TariffsBattleChoice(state);
          break;
        case 'penance':
          opened = openV070PenanceBattleChoice(state);
          break;
        case 'property_dues':
          opened = openV070PropertyDuesBattleChoice(state);
          break;
        case 'speculation':
          opened = openV070SpeculationBattleChoice(state);
          break;
      }
      if (opened) return true;
      // Unavailable choices remove themselves. Before any later effect applies,
      // honor a reaction they may have opened (notably Mystic Invocation).
      continue;
    }

    if (v070BattleRevealEffectsPending(state)) {
      resumeV070SupportedRevealEffects(state);
      continue;
    }

    return false;
  }
}

function openReembodimentAfterBattleEffect(
  state: V070GameState,
  playerId: PlayerId,
  movedHandInstanceIds: readonly string[],
  sourceLabel: string,
): boolean {
  const continuation = recordV070ReembodimentQualifyingTransition(
    state,
    playerId,
    movedHandInstanceIds,
    sourceLabel,
    true,
  );
  if (!continuation) return false;

  if (openV070SubversionAssetBattleWindow(
    state,
    continuation.playerId,
    continuation.assetInstanceId,
    'Reembodiment',
    continuation as unknown as V070SubversionAssetBattleContinuation,
  )) {
    return true;
  }
  return openV070ReembodimentRecovery(state, continuation);
}

function battleOrPlayerPositions(
  state: V070GameState,
): Record<PlayerId, number | null> {
  return state.battle
    ? { ...state.battle.positions }
    : {
        A: state.players.A.position,
        B: state.players.B.position,
      };
}

function reembodimentControlledBattleEffect(
  action: V070BattleAction,
): { playerId: PlayerId; sourceLabel: string } | null {
  switch (action.type) {
    case 'use_mystic_transmutation':
      return {
        playerId: action.playerId,
        sourceLabel: 'Transmutation',
      };
    case 'use_guardians_of_the_circle':
      return {
        playerId: action.playerId,
        sourceLabel: 'Guardians of the Circle',
      };
    default:
      return null;
  }
}

function resumeAfterReembodimentBattlePause(
  state: V070GameState,
  sourceLabel: string,
): V070GameState {
  if (sourceLabel === 'Spirit Hollow') {
    if (openV070SpiritHollowAftermathChoice(state)) return state;
    const battle = state.battle;
    if (!battle) return state;
    return reduceV070BattleActionPreWarBonds(state, {
      type: 'complete_aftermath',
      playerId: battle.attacker,
    });
  }

  continueV070BattleRevealProcedure(state);
  return state;
}

function isReembodimentSubversionPending(
  state: V070GameState,
): boolean {
  const pending = state.battleRuntime?.pendingSubversionAssetBattle;
  return Boolean(
    pending
    && isReembodimentContinuation(
      pending.deferredAction as unknown,
    ),
  );
}

function isReembodimentContinuation(
  value: unknown,
): value is V070ReembodimentContinuation {
  if (!value || typeof value !== 'object') return false;
  return (value as { type?: unknown }).type === 'apply_reembodiment_recovery';
}
