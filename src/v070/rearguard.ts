import { v070CanonicalContent } from '../content/v070';
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

export const V070_REARGUARD_ID = 'military-rearguard' as const;
export const V070_REARGUARD_BATTLE_TEXT =
  'In the Aftermath, if you lose and retreat, bank this card.' as const;

function validateV070RearguardAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_REARGUARD_ID);
  const battleEffect = card?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  );
  if (!card || battleEffect?.text !== V070_REARGUARD_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Rearguard battle text drifted from released authority.',
    );
  }
}

validateV070RearguardAuthority();

export function registerV070RearguardBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Rearguard battle registration requires an active battle runtime.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.cardId !== V070_REARGUARD_ID
    || state.cardInstances[sourceInstanceId]?.owner !== owner) {
    throw new V070GameActionError(
      'Rearguard battle registration source does not match its controller.',
    );
  }

  if (runtime.battleCardAftermathAssetBanks.some(
    bank => bank.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }

  runtime.battleCardAftermathAssetBanks.push({
    owner,
    sourceInstanceId,
    sourceCardId: V070_REARGUARD_ID,
    condition: 'owner_loss_after_retreat',
  });
}

export function bankV070RearguardFromBattle(
  state: V070GameState,
  playerId: PlayerId,
  rearguardInstanceId: string,
  replaceAssetInstanceId?: string,
): boolean {
  if (state.cardInstances[rearguardInstanceId]?.cardId !== V070_REARGUARD_ID
    || state.cardInstances[rearguardInstanceId]?.owner !== playerId) {
    throw new V070GameActionError(
      'Rearguard battle banking requires that player’s Rearguard card.',
    );
  }
  if (state.players[playerId].zones.assetBank.includes(
    rearguardInstanceId,
  )) {
    throw new V070GameActionError('Rearguard is already banked.');
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
        type: 'rearguard_battle_bank_declined',
        actor: playerId,
        visibility: 'public',
        payload: {
          instanceId: rearguardInstanceId,
          replaceableCount: replaceable.length,
        },
      });
      return false;
    }
    if (!replaceable.includes(replaceAssetInstanceId)) {
      throw new V070GameActionError(
        'That banked Asset cannot be voluntarily replaced for Rearguard.',
      );
    }

    const replacedCardId =
      state.cardInstances[replaceAssetInstanceId]?.cardId;
    if (replacedCardId === 'financiers-margin-loan') {
      resolveV070MarginLoanDefault(
        state,
        playerId,
        replaceAssetInstanceId,
        'Margin Loan Default on Rearguard replacement',
      );
    } else {
      discardV070AssetVoluntarily(
        state,
        playerId,
        replaceAssetInstanceId,
        'Rearguard battle Asset replacement',
      );
    }
    appendV070Event(state, {
      type: 'asset_replaced',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: replaceAssetInstanceId,
        cardId: replacedCardId,
        purpose: 'Rearguard battle Aftermath',
      },
    });
  } else if (replaceAssetInstanceId) {
    throw new V070GameActionError(
      'Rearguard Asset replacement is available only at the Asset limit.',
    );
  }

  bank.push(rearguardInstanceId);
  appendV070Event(state, {
    type: 'asset_banked',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: rearguardInstanceId,
      cardId: V070_REARGUARD_ID,
      purpose: 'Rearguard battle Aftermath',
      effectiveLimit: effectiveV070AssetLimit(state, playerId),
      turnNumber: state.turnNumber,
    },
  });
  return true;
}
