import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  retreatV070Position,
  type PlayerId,
} from './rules';
import { isV070AssetUsable } from './asset-face-state';
import { recordV070IntelligenceBattleAssetUseForMission } from './intelligence';
import { applyV070BattleRetreatStep } from './retreat-step';

export const V070_FORTIFICATIONS_ID = 'neutral-fortifications' as const;
export const V070_FORTIFICATIONS_ASSET_TEXT =
  'When defending, you may choose up to two Tactics instead of one.' as const;
export const V070_FORTIFICATIONS_BATTLE_TEXT =
  'Defender — +1 Battle Total. If you lose, after your normal retreat you may move one additional Position toward your own end.' as const;

validateFortificationsContract();

export function v070FortificationsAssetEligibleInstanceIds(
  state: V070GameState,
): string[] {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'choose_tactics'
    || runtime.fortificationsAssetTacticLimitResolved) {
    return [];
  }

  return state.players[battle.defender].zones.assetBank.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId === V070_FORTIFICATIONS_ID
    && isV070AssetUsable(state, instanceId)
  );
}

export function applyV070FortificationsAssetTacticLimit(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'choose_tactics') {
    throw new V070GameActionError(
      'Fortifications can increase the Tactic limit only before Tactics are chosen.',
    );
  }
  if (runtime.fortificationsAssetTacticLimitResolved) return;
  if (playerId !== battle.defender
    || !v070FortificationsAssetEligibleInstanceIds(state)
      .includes(assetInstanceId)) {
    throw new V070GameActionError(
      'That Fortifications is not an eligible defending Asset.',
    );
  }

  const participant = runtime.participants[playerId];
  const previousLimit = participant.tacticLimit;
  participant.tacticLimit = Math.max(participant.tacticLimit, 2);
  runtime.fortificationsAssetTacticLimitResolved = true;
  recordV070IntelligenceBattleAssetUseForMission(state, playerId);

  appendV070Event(state, {
    type: 'fortifications_asset_applied',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      assetInstanceId,
      previousTacticLimit: previousLimit,
      tacticLimit: participant.tacticLimit,
    },
  });
}

export function markV070FortificationsAssetTacticLimitResolved(
  state: V070GameState,
): void {
  if (state.battleRuntime) {
    state.battleRuntime.fortificationsAssetTacticLimitResolved = true;
  }
}

export function applyV070FortificationsGambitTacticEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Fortifications requires an active battle runtime.',
    );
  }
  if (owner !== battle.defender) return;

  runtime.participants[owner].battleModifier += 1;
  if (!runtime.fortificationsRetreatSourceInstanceIds
    .includes(sourceInstanceId)) {
    runtime.fortificationsRetreatSourceInstanceIds.push(sourceInstanceId);
  }
}

export function openV070FortificationsRetreatChoice(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath') return false;
  if (runtime.pendingFortificationsRetreat) return true;
  if (!battle.loser || battle.loser !== battle.defender) return false;

  const playerId = battle.loser;
  while (true) {
    const sourceInstanceId = runtime.fortificationsRetreatSourceInstanceIds
      .find(instanceId =>
        !runtime.fortificationsRetreatResolvedSourceInstanceIds
          .includes(instanceId)
        && state.cardInstances[instanceId]?.owner === playerId
      );
    if (!sourceInstanceId) return false;

    const from = battle.positions[playerId];
    const to = retreatV070Position(
      playerId,
      from,
      battle.territoryCount,
    );
    if (to === from) {
      runtime.fortificationsRetreatResolvedSourceInstanceIds.push(
        sourceInstanceId,
      );
      appendV070Event(state, {
        type: 'fortifications_retreat_unavailable',
        actor: playerId,
        visibility: 'public',
        payload: {
          playerId,
          sourceInstanceId,
          position: from,
        },
      });
      continue;
    }

    runtime.pendingFortificationsRetreat = {
      playerId,
      sourceInstanceId,
    };
    appendV070Event(state, {
      type: 'fortifications_retreat_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        sourceInstanceId,
        from,
        to,
        optional: true,
      },
    });
    return true;
  }
}

export function resolveV070FortificationsRetreatChoice(
  state: V070GameState,
  playerId: PlayerId,
  use: boolean,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingFortificationsRetreat ?? null;
  if (!battle || !runtime || !pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending Fortifications retreat opportunity.',
    );
  }

  runtime.pendingFortificationsRetreat = null;
  if (!runtime.fortificationsRetreatResolvedSourceInstanceIds
    .includes(pending.sourceInstanceId)) {
    runtime.fortificationsRetreatResolvedSourceInstanceIds.push(
      pending.sourceInstanceId,
    );
  }

  if (use) {
    const result = applyV070BattleRetreatStep(
      state,
      playerId,
      {
        kind: 'fortifications',
        label: 'Fortifications',
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_FORTIFICATIONS_ID,
      },
    );
    if (result.moved) {
      appendV070Event(state, {
        type: 'fortifications_retreat_used',
        actor: playerId,
        visibility: 'public',
        payload: {
          playerId,
          sourceInstanceId: pending.sourceInstanceId,
          from: result.from,
          to: result.to,
        },
      });
    } else {
      appendV070Event(state, {
        type: 'fortifications_retreat_unavailable',
        actor: playerId,
        visibility: 'public',
        payload: {
          playerId,
          sourceInstanceId: pending.sourceInstanceId,
          position: result.from,
        },
      });
    }
  } else {
    appendV070Event(state, {
      type: 'fortifications_retreat_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        sourceInstanceId: pending.sourceInstanceId,
        position: battle.positions[playerId],
      },
    });
  }

  return openV070FortificationsRetreatChoice(state);
}

function validateFortificationsContract(): void {
  const card = v070CanonicalContent.cardsById.get(V070_FORTIFICATIONS_ID);
  if (!card) {
    throw new Error('Released v0.7.0 Fortifications card is missing.');
  }
  const asset = card.effects.find(effect => effect.label === 'Asset');
  const battle = card.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (asset?.text !== V070_FORTIFICATIONS_ASSET_TEXT
    || battle?.text !== V070_FORTIFICATIONS_BATTLE_TEXT) {
    throw new Error('Fortifications handler text drift from canonical v0.7.0 content.');
  }
}
