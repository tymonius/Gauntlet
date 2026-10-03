import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  isV070BattleCardEffectNegated,
  v070BattleCommitment,
} from './battle-effect-status-pre-capital-gains';

export const V070_REDEMPTION_ID = 'neutral-redemption' as const;
export const V070_REDEMPTION_BATTLE_TEXT =
  'If an opposing effect negates one other Tactic you chose and that card would enter your Discard Pile, return it to your Hand in the Aftermath instead.' as const;

export interface V070RedemptionBattleEffect {
  owner: PlayerId;
  sourceInstanceId: string;
}

export interface V070RedemptionNegatedTactic {
  owner: PlayerId;
  targetInstanceId: string;
  negatingSourceInstanceId: string;
  negatingSourceCardId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    redemptionBattleEffects?: V070RedemptionBattleEffect[];
    redemptionNegatedTactics?: V070RedemptionNegatedTactic[];
  }
}

function validateAuthority(): void {
  for (const content of [v070CanonicalContent, currentCanonicalContent]) {
    const effect = content.cardsById.get(V070_REDEMPTION_ID)?.effects.find(
      candidate => candidate.label === 'Gambit/Tactic',
    );
    if (effect?.text !== V070_REDEMPTION_BATTLE_TEXT) {
      throw new Error(
        'Redemption Gambit/Tactic text drifted from frozen/current authority.',
      );
    }
  }
}

validateAuthority();

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

export function registerV070RedemptionBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Redemption requires an active battle.',
    );
  }
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source
    || source.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_REDEMPTION_ID) {
    throw new V070GameActionError(
      'Redemption source does not match a committed battle card.',
    );
  }

  runtime.redemptionBattleEffects ??= [];
  if (runtime.redemptionBattleEffects.some(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }
  runtime.redemptionBattleEffects.push({
    owner,
    sourceInstanceId,
  });
}

export function removeV070RedemptionBattleRegistration(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime?.redemptionBattleEffects) return;
  runtime.redemptionBattleEffects =
    runtime.redemptionBattleEffects.filter(
      effect => effect.sourceInstanceId !== sourceInstanceId,
    );
}

export function recordV070RedemptionOpposingTacticNegation(
  state: V070GameState,
  targetInstanceId: string,
  negatingSourceInstanceId: string,
  negatingSourceCardId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;

  const target = v070BattleCommitment(state, targetInstanceId);
  if (!target || target.role !== 'tactic') return;

  const sourceOwner =
    state.cardInstances[negatingSourceInstanceId]?.owner;
  if (!sourceOwner || sourceOwner === target.owner) return;

  runtime.redemptionNegatedTactics ??= [];
  if (runtime.redemptionNegatedTactics.some(
    record =>
      record.owner === target.owner
      && record.targetInstanceId === targetInstanceId,
  )) {
    return;
  }

  runtime.redemptionNegatedTactics.push({
    owner: target.owner,
    targetInstanceId,
    negatingSourceInstanceId,
    negatingSourceCardId,
  });

  appendV070Event(state, {
    type: 'redemption_battle_negated_tactic_recorded',
    actor: target.owner,
    visibility: 'public',
    payload: {
      targetInstanceId,
      targetCardId:
        state.cardInstances[targetInstanceId]?.cardId ?? null,
      targetOwner: target.owner,
      negatingSourceInstanceId,
      negatingSourceCardId,
      negatingSourceOwner: sourceOwner,
    },
  });
}

function effectiveAftermathDestination(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): 'discard' | 'graveyard' | 'hand' | 'draw_top' {
  const runtime = state.battleRuntime!;
  const cardOverride =
    runtime.battleCardAftermathDestinationOverrides.find(
      override =>
        override.playerId === playerId
        && override.instanceId === instanceId,
    );
  if (cardOverride) return cardOverride.destination;

  const territoryOverride = runtime.territoryAftermathOverride;
  if (territoryOverride
    && territoryOverride.playerId === playerId
    && territoryOverride.instanceId === instanceId) {
    return territoryOverride.destination;
  }

  return 'discard';
}

export function v070RedemptionAftermathEffects(
  state: V070GameState,
): V070RedemptionBattleEffect[] {
  return state.battleRuntime?.redemptionBattleEffects ?? [];
}

export function v070RedemptionTargetInstanceIds(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const source = runtime.redemptionBattleEffects?.find(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (!source) return [];

  return (runtime.redemptionNegatedTactics ?? [])
    .filter(record => record.owner === owner)
    .map(record => record.targetInstanceId)
    .filter(targetInstanceId => {
      if (targetInstanceId === sourceInstanceId) return false;
      const target = v070BattleCommitment(state, targetInstanceId);
      if (!target
        || target.owner !== owner
        || target.role !== 'tactic') {
        return false;
      }
      if (!isV070BattleCardEffectNegated(state, targetInstanceId)) {
        return false;
      }
      return effectiveAftermathDestination(
        state,
        owner,
        targetInstanceId,
      ) === 'discard';
    });
}

export function resolveV070RedemptionAftermath(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'aftermath') {
    throw new V070GameActionError(
      'Redemption resolves during the Aftermath before battle cards are cleared.',
    );
  }

  const candidates = v070RedemptionTargetInstanceIds(
    state,
    owner,
    sourceInstanceId,
  );
  if (!candidates.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Redemption must return another Tactic that an opposing effect negated and that would enter your Discard Pile.',
    );
  }

  const existing =
    runtime.battleCardAftermathDestinationOverrides.find(
      override =>
        override.playerId === owner
        && override.instanceId === targetInstanceId,
    );
  if (existing) {
    existing.destination = 'hand';
    existing.sourceCardId = V070_REDEMPTION_ID;
  } else {
    runtime.battleCardAftermathDestinationOverrides.push({
      sourceCardId: V070_REDEMPTION_ID,
      playerId: owner,
      instanceId: targetInstanceId,
      destination: 'hand',
    });
  }

  runtime.redemptionBattleEffects =
    (runtime.redemptionBattleEffects ?? []).filter(
      effect =>
        effect.owner !== owner
        || effect.sourceInstanceId !== sourceInstanceId,
    );

  const record = (runtime.redemptionNegatedTactics ?? []).find(
    candidate =>
      candidate.owner === owner
      && candidate.targetInstanceId === targetInstanceId,
  );

  appendV070Event(state, {
    type: 'redemption_battle_aftermath_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_REDEMPTION_ID,
      targetInstanceId,
      targetCardId:
        state.cardInstances[targetInstanceId]?.cardId ?? null,
      negatingSourceInstanceId:
        record?.negatingSourceInstanceId ?? null,
      negatingSourceCardId:
        record?.negatingSourceCardId ?? null,
      destination: 'hand',
    },
  });
}
