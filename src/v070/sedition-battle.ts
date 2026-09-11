import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  faceUpV070AssetInstanceIds,
  isV070AssetFaceUp,
} from './asset-face-state';
import { makeV070AssetInactiveForBattle } from './battle-asset-state';
import {
  completeV070BattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';

export const V070_SEDITION_ID = 'neutral-sedition' as const;
export const V070_SEDITION_BATTLE_TEXT =
  'The opponent chooses 1 face-up Asset. It is inactive during this battle. If they have no face-up Assets, +1 Battle Total.' as const;

export interface V070SeditionBattleChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

function validateV070SeditionAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_SEDITION_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_SEDITION_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Sedition battle text drifted from released authority.',
    );
  }
}

validateV070SeditionAuthority();

export function registerV070SeditionBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Sedition battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_SEDITION_ID) {
    throw new V070GameActionError(
      'Sedition battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const candidates = faceUpV070AssetInstanceIds(state, opponent);
  if (candidates.length === 0) {
    runtime.participants[owner].battleModifier += 1;
    appendV070Event(state, {
      type: 'sedition_battle_no_asset_bonus',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_SEDITION_ID,
        opponent,
        battleTotalBonus: 1,
      },
    });
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'sedition',
    owner,
    opponent,
    sourceInstanceId,
    candidateInstanceIds: [...candidates],
  });
}

export function pendingV070SeditionBattleChoice(
  state: V070GameState,
): V070SeditionBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'sedition'
    ? pending
    : null;
}

export function openV070SeditionBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070SeditionBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    state.players[pending.opponent].zones.assetBank.includes(instanceId)
    && isV070AssetFaceUp(state, instanceId)
  );
  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'sedition');
    appendV070Event(state, {
      type: 'sedition_battle_choice_unavailable',
      actor: pending.opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_SEDITION_ID,
        owner: pending.owner,
        opponent: pending.opponent,
        reason: 'original_face_up_assets_no_longer_available',
      },
    });
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'sedition_battle_choice_pending',
    actor: pending.opponent,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_SEDITION_ID,
      owner: pending.owner,
      opponent: pending.opponent,
      candidateCount: available.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'sedition_battle_choice_options',
    actor: pending.opponent,
    visibility: pending.opponent,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      targetInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070SeditionBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = pendingV070SeditionBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Sedition battle Asset choice is pending.',
    );
  }
  if (pending.opponent !== playerId) {
    throw new V070GameActionError(
      'The opponent targeted by Sedition must choose the face-up Asset.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !state.players[playerId].zones.assetBank.includes(targetInstanceId)
    || !isV070AssetFaceUp(state, targetInstanceId)) {
    throw new V070GameActionError(
      'Sedition must choose one eligible face-up Asset controlled by the opponent.',
    );
  }

  makeV070AssetInactiveForBattle(state, targetInstanceId);
  completeV070BattleRevealChoice(state, 'sedition');

  appendV070Event(state, {
    type: 'sedition_battle_asset_inactivated',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_SEDITION_ID,
      effectOwner: pending.owner,
      assetOwner: playerId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
    },
  });
}
