import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  reduceV070BattleAction as reduceV070BattleActionPreWarBonds,
  type V070BattleAction as V070PreWarBondsBattleAction,
} from './battle-engine-prewar-bonds';
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
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
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
    const continuation = recordV070ReembodimentQualifyingTransition(
      next,
      controlled.playerId,
      moved,
      controlled.sourceLabel,
      true,
    );
    if (continuation) {
      if (openV070SubversionAssetBattleWindow(
        next,
        continuation.playerId,
        continuation.assetInstanceId,
        'Reembodiment',
        continuation as unknown as V070SubversionAssetBattleContinuation,
      )) {
        return next;
      }
      if (openV070ReembodimentRecovery(next, continuation)) return next;
    }
  }

  if (!next.battle) {
    openV070WarBondsAfterFirstBattle(
      next,
      battleOrder ?? undefined,
    );
  }
  return next;
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
  if (sourceLabel !== 'Spirit Hollow') return state;
  if (openV070SpiritHollowAftermathChoice(state)) return state;
  const battle = state.battle;
  if (!battle) return state;
  return reduceV070BattleActionPreWarBonds(state, {
    type: 'complete_aftermath',
    playerId: battle.attacker,
  });
}

function isReembodimentContinuation(
  value: unknown,
): value is V070ReembodimentContinuation {
  if (!value || typeof value !== 'object') return false;
  return (value as { type?: unknown }).type === 'apply_reembodiment_recovery';
}
