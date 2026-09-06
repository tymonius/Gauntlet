import {
  appendV070Event,
  type V070GameState,
  type V070PlayerZones,
} from './engine';
import type { PlayerId } from './rules';

export type V070DeferredBattleAftermathCondition =
  | 'target_loses'
  | 'owner_wins'
  | 'always';

export interface V070DeferredBattleAftermathDestinationEffect {
  sourceInstanceId: string;
  sourceCardId: string;
  owner: PlayerId;
  targetPlayer: PlayerId;
  targetInstanceIds: string[];
  destination: 'discard' | 'graveyard' | 'hand';
  condition: V070DeferredBattleAftermathCondition;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    initialReserveSnapshots?: Partial<Record<PlayerId, string[]>>;
  }
}

declare module './engine' {
  interface V070GameState {
    deferredBattleAftermathDestinationEffects?:
      V070DeferredBattleAftermathDestinationEffect[];
  }
}

/**
 * Capture each player's Reserve exactly when the normal Reserve has been formed,
 * before reveal-stage additions, Training Grounds redraws, or Tactic choices can
 * change its membership.
 */
export function captureV070InitialReserveSnapshots(
  state: V070GameState,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'reveal_gambits') return;

  runtime.initialReserveSnapshots ??= {};
  for (const playerId of ['A', 'B'] as const) {
    if (runtime.initialReserveSnapshots[playerId]) continue;
    runtime.initialReserveSnapshots[playerId] = [
      ...runtime.participants[playerId].reserve,
    ];
  }
}

export function v070InitialReserveSnapshot(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return [
    ...(state.battleRuntime?.initialReserveSnapshots?.[playerId] ?? []),
  ];
}

export function registerV070DeferredBattleAftermathDestination(
  state: V070GameState,
  effect: V070DeferredBattleAftermathDestinationEffect,
): void {
  state.deferredBattleAftermathDestinationEffects ??= [];
  state.deferredBattleAftermathDestinationEffects.push({
    ...effect,
    targetInstanceIds: [...effect.targetInstanceIds],
  });

  appendV070Event(state, {
    type: 'battle_aftermath_destination_effect_registered',
    actor: effect.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: effect.sourceInstanceId,
      sourceCardId: effect.sourceCardId,
      targetPlayer: effect.targetPlayer,
      targetCount: effect.targetInstanceIds.length,
      destination: effect.destination,
      condition: effect.condition,
    },
  });
}

/**
 * Settle deferred destinations as soon as a battle result exists. For an
 * ordinary battle this installs normal Aftermath destination overrides before
 * cards are cleared. If core resolution has already completed the Aftermath
 * (notably an immediate Last Stand victory), cards are reconciled from their
 * resulting persistent zones instead.
 */
export function settleV070DeferredBattleAftermathDestinations(
  previousState: V070GameState,
  state: V070GameState,
): void {
  const effects = state.deferredBattleAftermathDestinationEffects ?? [];
  if (effects.length === 0) return;

  const result = battleResultSince(previousState, state);
  if (result) {
    state.deferredBattleAftermathDestinationEffects = [];
    for (const effect of effects) {
      if (!conditionMet(effect, result.winner, result.loser)) continue;
      applyDestinationEffect(state, effect);
    }
    return;
  }

  // A non-result battle ending (for example a post-Onset withdrawal) cannot
  // satisfy a win/loss-conditioned deferred effect and must not leak it into
  // the next battle.
  if (battleEndedWithoutResult(previousState, state)) {
    state.deferredBattleAftermathDestinationEffects = [];
  }
}

function battleResultSince(
  previousState: V070GameState,
  state: V070GameState,
): { winner: PlayerId; loser: PlayerId } | null {
  const battle = state.battle;
  if (battle?.winner && battle.loser) {
    return { winner: battle.winner, loser: battle.loser };
  }

  const appended = state.events.slice(previousState.events.length);
  for (let index = appended.length - 1; index >= 0; index -= 1) {
    const event = appended[index];
    if (event.type !== 'battle_outcome') continue;
    const payload = event.payload as {
      winner?: PlayerId;
      loser?: PlayerId;
    } | undefined;
    if (payload?.winner && payload.loser) {
      return { winner: payload.winner, loser: payload.loser };
    }
  }
  return null;
}

function battleEndedWithoutResult(
  previousState: V070GameState,
  state: V070GameState,
): boolean {
  if (!previousState.battle) return false;
  if (state.battle?.endReason) return true;
  if (state.battle) return false;

  return state.events.slice(previousState.events.length).some(event =>
    event.type === 'armistice_battle_resolved'
    || event.type === 'battle_withdrawal'
    || event.type === 'terms_accepted'
  );
}

function conditionMet(
  effect: V070DeferredBattleAftermathDestinationEffect,
  winner: PlayerId,
  loser: PlayerId,
): boolean {
  switch (effect.condition) {
    case 'always': return true;
    case 'owner_wins': return winner === effect.owner;
    case 'target_loses': return loser === effect.targetPlayer;
  }
}

function applyDestinationEffect(
  state: V070GameState,
  effect: V070DeferredBattleAftermathDestinationEffect,
): void {
  for (const instanceId of effect.targetInstanceIds) {
    if (scheduleBattleDestination(state, effect, instanceId)) continue;
    movePersistentCard(state, effect, instanceId);
  }
}

function scheduleBattleDestination(
  state: V070GameState,
  effect: V070DeferredBattleAftermathDestinationEffect,
  instanceId: string,
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) return false;
  const participant = runtime.participants[effect.targetPlayer];
  const stillInBattle = participant.reserve.includes(instanceId)
    || participant.gambit?.instanceId === instanceId
    || participant.additionalGambits.some(item => item.instanceId === instanceId)
    || participant.tactic?.instanceId === instanceId
    || participant.additionalTactics.some(item => item.instanceId === instanceId);
  if (!stillInBattle) return false;

  const existing = runtime.battleCardAftermathDestinationOverrides.find(
    override =>
      override.playerId === effect.targetPlayer
      && override.instanceId === instanceId,
  );
  if (existing) {
    existing.destination = effect.destination;
    existing.sourceCardId = effect.sourceCardId;
  } else {
    runtime.battleCardAftermathDestinationOverrides.push({
      sourceCardId: effect.sourceCardId,
      playerId: effect.targetPlayer,
      instanceId,
      destination: effect.destination,
    });
  }
  return true;
}

function movePersistentCard(
  state: V070GameState,
  effect: V070DeferredBattleAftermathDestinationEffect,
  instanceId: string,
): void {
  const zones = state.players[effect.targetPlayer].zones;
  const destinationZone = zoneForDestination(zones, effect.destination);
  if (destinationZone.includes(instanceId)) return;

  const sourceZone = persistentSourceZone(zones, instanceId);
  if (!sourceZone) {
    appendV070Event(state, {
      type: 'battle_aftermath_destination_unresolved',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        sourceCardId: effect.sourceCardId,
        targetPlayer: effect.targetPlayer,
        targetInstanceId: instanceId,
        destination: effect.destination,
      },
    });
    return;
  }

  const index = sourceZone.indexOf(instanceId);
  sourceZone.splice(index, 1);
  destinationZone.push(instanceId);

  appendV070Event(state, {
    type: 'battle_aftermath_destination_moved',
    actor: effect.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: effect.sourceInstanceId,
      sourceCardId: effect.sourceCardId,
      targetPlayer: effect.targetPlayer,
      targetInstanceId: instanceId,
      targetCardId: state.cardInstances[instanceId]?.cardId ?? null,
      destination: effect.destination,
    },
  });
}

function persistentSourceZone(
  zones: V070PlayerZones,
  instanceId: string,
): string[] | null {
  for (const zone of [zones.drawPile, zones.hand, zones.discardPile]) {
    if (zone.includes(instanceId)) return zone;
  }
  return null;
}

function zoneForDestination(
  zones: V070PlayerZones,
  destination: 'discard' | 'graveyard' | 'hand',
): string[] {
  switch (destination) {
    case 'discard': return zones.discardPile;
    case 'graveyard': return zones.graveyard;
    case 'hand': return zones.hand;
  }
}
