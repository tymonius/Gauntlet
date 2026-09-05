import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  discardV070AssetVoluntarily,
  effectiveV070AssetLimit,
  replaceableV070AssetInstanceIds,
  resolveV070MarginLoanDefault,
} from './assets';
import { isV070AssetActive } from './asset-face-state';
import { recordV070IntelligenceBattleAssetUseForMission } from './intelligence';
import { openV070SubversionAssetBattleWindow } from './subversion-asset';

export const V070_RESISTANCE_ID = 'neutral-resistance' as const;

export class V070ResistanceAssetOnsetPause extends Error {
  constructor(public readonly state: V070GameState) {
    super('Resistance Onset paused for a Subversion Asset decision.');
    this.name = 'V070ResistanceAssetOnsetPause';
  }
}

export function isV070CounterattackBattle(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  if (!battle || battle.lastStand) return false;
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  return territory?.controller === battle.attacker;
}

export function applyV070ResistanceAssetOnsetEffects(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || !isV070CounterattackBattle(state)) return;

  for (const playerId of [battle.attacker, battle.defender]) {
    for (const instanceId of [...state.players[playerId].zones.assetBank]) {
      if (runtime.resistanceAssetOnsetProcessedInstanceIds.includes(instanceId)) {
        continue;
      }
      if (state.cardInstances[instanceId]?.cardId !== V070_RESISTANCE_ID
        || !isV070AssetActive(state, instanceId)) {
        continue;
      }

      if (openV070SubversionAssetBattleWindow(
        state,
        playerId,
        instanceId,
        'Resistance',
        {
          type: 'apply_resistance_onset_asset',
          playerId,
          assetInstanceId: instanceId,
        },
      )) {
        throw new V070ResistanceAssetOnsetPause(state);
      }

      applyV070ResistanceAssetOnsetInstance(
        state,
        playerId,
        instanceId,
      );
    }
  }
}

export function applyV070ResistanceAssetOnsetInstance(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || !state.battle || !isV070CounterattackBattle(state)) {
    throw new V070GameActionError(
      'Resistance Asset Onset effect requires an active Counterattack.',
    );
  }
  if (runtime.resistanceAssetOnsetProcessedInstanceIds.includes(instanceId)) {
    return;
  }
  if (state.cardInstances[instanceId]?.cardId !== V070_RESISTANCE_ID
    || !state.players[playerId].zones.assetBank.includes(instanceId)
    || !isV070AssetActive(state, instanceId)) {
    throw new V070GameActionError(
      'Resistance must still be an active banked Asset for its Onset effect to apply.',
    );
  }

  runtime.resistanceAssetOnsetProcessedInstanceIds.push(instanceId);
  runtime.participants[playerId].reserveBonus += 2;
  recordV070IntelligenceBattleAssetUseForMission(state, playerId);

  appendV070Event(state, {
    type: 'resistance_asset_counterattack_reserve',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      resistanceCount: 1,
      reserveBonus: 2,
    },
  });
}

export function v070ResistanceBattleBankReplacementInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  if (state.players[playerId].zones.assetBank.length
    < effectiveV070AssetLimit(state, playerId)) {
    return [];
  }
  return replaceableV070AssetInstanceIds(state, playerId);
}

export function v070ResistanceBattleBankNeedsReplacementChoice(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  return state.players[playerId].zones.assetBank.length
    >= effectiveV070AssetLimit(state, playerId)
    && v070ResistanceBattleBankReplacementInstanceIds(
      state,
      playerId,
    ).length > 0;
}

export function bankV070ResistanceFromBattle(
  state: V070GameState,
  playerId: PlayerId,
  resistanceInstanceId: string,
  replaceAssetInstanceId?: string,
): boolean {
  if (state.cardInstances[resistanceInstanceId]?.cardId !==
    V070_RESISTANCE_ID) {
    throw new V070GameActionError(
      'Resistance battle banking requires the Resistance card.',
    );
  }
  if (state.players[playerId].zones.assetBank.includes(
    resistanceInstanceId,
  )) {
    throw new V070GameActionError('Resistance is already banked.');
  }

  const bank = state.players[playerId].zones.assetBank;
  const atLimit = bank.length >= effectiveV070AssetLimit(
    state,
    playerId,
  );

  if (atLimit) {
    const replaceable = replaceableV070AssetInstanceIds(
      state,
      playerId,
    );
    if (!replaceAssetInstanceId) {
      appendV070Event(state, {
        type: 'resistance_battle_bank_declined',
        actor: playerId,
        visibility: 'public',
        payload: {
          instanceId: resistanceInstanceId,
          replaceableCount: replaceable.length,
        },
      });
      return false;
    }
    if (!replaceable.includes(replaceAssetInstanceId)) {
      throw new V070GameActionError(
        'That banked Asset cannot be voluntarily replaced for Resistance.',
      );
    }

    const replacedCardId =
      state.cardInstances[replaceAssetInstanceId]?.cardId;
    if (replacedCardId === 'financiers-margin-loan') {
      resolveV070MarginLoanDefault(
        state,
        playerId,
        replaceAssetInstanceId,
        'Margin Loan Default on Resistance replacement',
      );
    } else {
      discardV070AssetVoluntarily(
        state,
        playerId,
        replaceAssetInstanceId,
        'Resistance battle Asset replacement',
      );
    }
    appendV070Event(state, {
      type: 'asset_replaced',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: replaceAssetInstanceId,
        cardId: replacedCardId,
        purpose: 'Resistance battle Aftermath',
      },
    });
  } else if (replaceAssetInstanceId) {
    throw new V070GameActionError(
      'Resistance Asset replacement is available only at the Asset limit.',
    );
  }

  bank.push(resistanceInstanceId);
  appendV070Event(state, {
    type: 'asset_banked',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: resistanceInstanceId,
      cardId: V070_RESISTANCE_ID,
      purpose: 'Resistance battle Aftermath',
      effectiveLimit: effectiveV070AssetLimit(state, playerId),
      turnNumber: state.turnNumber,
    },
  });
  return true;
}
