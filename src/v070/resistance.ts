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

export const V070_RESISTANCE_ID = 'neutral-resistance' as const;

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
    const resistanceCount = state.players[playerId].zones.assetBank.filter(
      instanceId =>
        state.cardInstances[instanceId]?.cardId === V070_RESISTANCE_ID
        && isV070AssetActive(state, instanceId),
    ).length;
    if (resistanceCount === 0) continue;

    const bonus = resistanceCount * 2;
    runtime.participants[playerId].reserveBonus += bonus;
    appendV070Event(state, {
      type: 'resistance_asset_counterattack_reserve',
      actor: playerId,
      visibility: 'public',
      payload: {
        resistanceCount,
        reserveBonus: bonus,
      },
    });
  }
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
