import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  discardV070AssetVoluntarily,
  voluntarilyDiscardableV070AssetInstanceIds,
} from './assets';
import {
  completeV070BattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';

export const V070_REQUISITION_ID = 'neutral-requisition' as const;
export const V070_REQUISITION_BATTLE_TEXT =
  'You may discard 1 of your Assets to gain Advantage.' as const;

export interface V070RequisitionBattleChoiceRuntime {
  owner: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

function validateV070RequisitionAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_REQUISITION_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_REQUISITION_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Requisition battle text drifted from released authority.',
    );
  }
}

validateV070RequisitionAuthority();

export function registerV070RequisitionBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Requisition battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_REQUISITION_ID) {
    throw new V070GameActionError(
      'Requisition battle source does not match the revealed card instance.',
    );
  }

  const candidates = voluntarilyDiscardableV070AssetInstanceIds(
    state,
    owner,
  );
  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'requisition_battle_choice_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_REQUISITION_ID,
        reason: 'no_discardable_asset',
      },
    });
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'requisition',
    owner,
    sourceInstanceId,
    candidateInstanceIds: [...candidates],
  });
}

export function pendingV070RequisitionBattleChoice(
  state: V070GameState,
): V070RequisitionBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'requisition'
    ? pending
    : null;
}

export function openV070RequisitionBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070RequisitionBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const currentlyDiscardable = new Set(
    voluntarilyDiscardableV070AssetInstanceIds(state, pending.owner),
  );
  const available = pending.candidateInstanceIds.filter(instanceId =>
    state.players[pending.owner].zones.assetBank.includes(instanceId)
    && currentlyDiscardable.has(instanceId)
  );
  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'requisition');
    appendV070Event(state, {
      type: 'requisition_battle_choice_unavailable',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_REQUISITION_ID,
        reason: 'original_assets_no_longer_discardable',
      },
    });
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'requisition_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_REQUISITION_ID,
      playerId: pending.owner,
      candidateCount: available.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'requisition_battle_choice_options',
    actor: pending.owner,
    visibility: pending.owner,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      assetInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070RequisitionBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId?: string,
): void {
  const runtime = state.battleRuntime;
  const pending = pendingV070RequisitionBattleChoice(state);
  if (!runtime || !pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Requisition battle Asset choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Requisition owner may resolve its optional Asset discard.',
    );
  }

  if (!assetInstanceId) {
    completeV070BattleRevealChoice(state, 'requisition');
    appendV070Event(state, {
      type: 'requisition_battle_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_REQUISITION_ID,
      },
    });
    return;
  }

  const currentlyDiscardable = voluntarilyDiscardableV070AssetInstanceIds(
    state,
    playerId,
  );
  if (!pending.candidateInstanceIds.includes(assetInstanceId)
    || !currentlyDiscardable.includes(assetInstanceId)) {
    throw new V070GameActionError(
      'Requisition must discard one Asset that was eligible when its battle effect took effect.',
    );
  }

  discardV070AssetVoluntarily(
    state,
    playerId,
    assetInstanceId,
    'Requisition battle effect',
  );
  runtime.participants[playerId].advantage += 1;
  completeV070BattleRevealChoice(state, 'requisition');

  appendV070Event(state, {
    type: 'requisition_battle_asset_discarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_REQUISITION_ID,
      assetInstanceId,
      assetCardId: state.cardInstances[assetInstanceId]?.cardId ?? null,
      advantageGained: 1,
    },
  });
}
