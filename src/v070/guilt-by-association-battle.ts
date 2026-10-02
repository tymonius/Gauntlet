import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { applyV070NormalAftermathConviction } from './inquisition';
import type { PlayerId } from './rules';

export const V070_GUILT_BY_ASSOCIATION_ID =
  'inquisition-guilt-by-association' as const;
export const V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT =
  "In the Aftermath, choose one opposing Gambit, Tactic, or other card the opponent controlled in this battle. Put every card in the opponent's Discard Pile with that title in their Graveyard." as const;

export interface V070GuiltByAssociationAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    guiltByAssociationAftermathEffects?:
      V070GuiltByAssociationAftermathEffect[];
  }
}

function validateAuthority(): void {
  for (const source of [
    v070CanonicalContent.cardsById.get(V070_GUILT_BY_ASSOCIATION_ID),
    currentCanonicalContent.cardsById.get(V070_GUILT_BY_ASSOCIATION_ID),
  ]) {
    const text = source?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    if (text !== V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT) {
      throw new Error(
        'Guilt by Association battle text drifted from frozen/current authority.',
      );
    }
  }
}

validateAuthority();

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

export function v070GuiltByAssociationAftermathEffects(
  state: V070GameState,
): V070GuiltByAssociationAftermathEffect[] {
  return state.battleRuntime?.guiltByAssociationAftermathEffects ?? [];
}

export function registerV070GuiltByAssociationBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Guilt by Association requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId
      !== V070_GUILT_BY_ASSOCIATION_ID) {
    throw new V070GameActionError(
      'Guilt by Association source does not match the revealed battle card.',
    );
  }

  runtime.guiltByAssociationAftermathEffects ??= [];
  if (runtime.guiltByAssociationAftermathEffects.some(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }
  runtime.guiltByAssociationAftermathEffects.push({
    owner,
    sourceInstanceId,
  });
}

export function v070GuiltByAssociationTargetInstanceIds(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): string[] {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) return [];
  const effect = v070GuiltByAssociationAftermathEffects(state).find(
    candidate =>
      candidate.owner === owner
      && candidate.sourceInstanceId === sourceInstanceId,
  );
  if (!effect) return [];

  const opponent = otherPlayer(owner);
  const participant = runtime.participants[opponent];
  const physicalBattleCards = [
    ...(participant.gambit ? [participant.gambit.instanceId] : []),
    ...participant.additionalGambits.map(card => card.instanceId),
    ...(participant.tactic ? [participant.tactic.instanceId] : []),
    ...participant.additionalTactics.map(card => card.instanceId),
  ];

  const seenCardIds = new Set<string>();
  const targets: string[] = [];
  for (const instanceId of physicalBattleCards) {
    const cardId = state.cardInstances[instanceId]?.cardId;
    if (!cardId || seenCardIds.has(cardId)) continue;
    seenCardIds.add(cardId);
    targets.push(instanceId);
  }
  return targets;
}

export function resolveV070GuiltByAssociationAftermath(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): string[] {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime || runtime.stage !== 'aftermath') {
    throw new V070GameActionError(
      'Guilt by Association resolves only during the Aftermath.',
    );
  }

  const effects = v070GuiltByAssociationAftermathEffects(state);
  const index = effects.findIndex(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (index < 0) {
    throw new V070GameActionError(
      'That Guilt by Association effect is no longer pending.',
    );
  }

  const candidates = v070GuiltByAssociationTargetInstanceIds(
    state,
    owner,
    sourceInstanceId,
  );
  if (!candidates.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Choose a card the opponent controlled in this battle.',
    );
  }

  const targetCardId = state.cardInstances[targetInstanceId]?.cardId;
  if (!targetCardId) {
    throw new V070GameActionError(
      'Guilt by Association targeted an unknown card.',
    );
  }

  const opponent = otherPlayer(owner);
  const discard = state.players[opponent].zones.discardPile;
  const moved = discard.filter(
    instanceId => state.cardInstances[instanceId]?.cardId === targetCardId,
  );
  state.players[opponent].zones.discardPile = discard.filter(
    instanceId => state.cardInstances[instanceId]?.cardId !== targetCardId,
  );
  state.players[opponent].zones.graveyard.push(...moved);
  effects.splice(index, 1);

  applyV070NormalAftermathConviction(state, owner, moved);

  appendV070Event(state, {
    type: 'guilt_by_association_aftermath_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_GUILT_BY_ASSOCIATION_ID,
      opponentId: opponent,
      selectedBattleInstanceId: targetInstanceId,
      selectedCardId: targetCardId,
      movedInstanceIds: [...moved],
      movedCount: moved.length,
    },
  });

  return moved;
}
