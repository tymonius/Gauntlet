import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_CAPITAL_GAINS_ID = 'financiers-capital-gains' as const;
export const V070_CAPITAL_GAINS_BATTLE_TEXT =
  'In the Aftermath, if you win, choose one other Gambit, Tactic, or Reserve card. Place it face up in your Treasury instead.' as const;

export interface V070PendingCapitalGainsAftermath {
  playerId: PlayerId;
  owner: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    capitalGainsBattleSourceInstanceIds?: string[];
    resolvedCapitalGainsBattleSourceInstanceIds?: string[];
    pendingCapitalGainsAftermath?: V070PendingCapitalGainsAftermath | null;
  }
}

export function registerV070CapitalGainsBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  if (state.cardInstances[sourceInstanceId]?.cardId !== V070_CAPITAL_GAINS_ID
    || state.cardInstances[sourceInstanceId]?.owner !== owner) {
    throw new V070GameActionError(
      'Capital Gains battle registration requires its own committed card.',
    );
  }
  runtime.capitalGainsBattleSourceInstanceIds ??= [];
  runtime.resolvedCapitalGainsBattleSourceInstanceIds ??= [];
  runtime.pendingCapitalGainsAftermath ??= null;
  if (!runtime.capitalGainsBattleSourceInstanceIds.includes(sourceInstanceId)) {
    runtime.capitalGainsBattleSourceInstanceIds.push(sourceInstanceId);
  }
}

export function pendingV070CapitalGainsAftermath(
  state: V070GameState,
): V070PendingCapitalGainsAftermath | null {
  return state.battleRuntime?.pendingCapitalGainsAftermath ?? null;
}

export function unresolvedV070CapitalGainsSourcesForPlayer(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const resolved = new Set(
    runtime.resolvedCapitalGainsBattleSourceInstanceIds ?? [],
  );
  return (runtime.capitalGainsBattleSourceInstanceIds ?? []).filter(
    sourceInstanceId =>
      state.cardInstances[sourceInstanceId]?.owner === owner
      && !resolved.has(sourceInstanceId),
  );
}

export function openV070CapitalGainsAftermathForSource(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const battle = state.battle;
  const runtime = requireRuntime(state);
  const source = state.cardInstances[sourceInstanceId];
  if (!battle || source?.cardId !== V070_CAPITAL_GAINS_ID) {
    throw new V070GameActionError(
      'Capital Gains Aftermath requires its registered battle source.',
    );
  }
  const owner = source.owner;
  if (owner !== 'A' && owner !== 'B') {
    throw new V070GameActionError('Capital Gains source has no valid owner.');
  }
  if (!unresolvedV070CapitalGainsSourcesForPlayer(state, owner)
    .includes(sourceInstanceId)) {
    throw new V070GameActionError(
      'That Capital Gains battle effect is no longer pending.',
    );
  }

  if (battle.winner !== owner) {
    markResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'capital_gains_battle_unresolved',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        reason: 'owner_did_not_win',
      },
    });
    return false;
  }

  const candidates = capitalGainsCandidates(state, sourceInstanceId);
  if (candidates.length === 0) {
    markResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'capital_gains_battle_unresolved',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        reason: 'no_other_battle_card',
      },
    });
    return false;
  }

  if (candidates.length === 1) {
    moveBattleCardToTreasury(state, owner, sourceInstanceId, candidates[0]);
    markResolved(state, sourceInstanceId);
    return false;
  }

  runtime.pendingCapitalGainsAftermath = {
    playerId: owner,
    owner,
    sourceInstanceId,
    candidateInstanceIds: candidates,
  };
  appendV070Event(state, {
    type: 'capital_gains_battle_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      candidateCount: candidates.length,
    },
  });
  return true;
}

export function resolveV070CapitalGainsAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): PlayerId {
  const runtime = requireRuntime(state);
  const pending = runtime.pendingCapitalGainsAftermath;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Capital Gains Aftermath choice is pending for that player.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !capitalGainsCandidates(state, pending.sourceInstanceId)
      .includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Capital Gains must choose another Gambit, Tactic, or Reserve card still in this battle.',
    );
  }

  moveBattleCardToTreasury(
    state,
    pending.owner,
    pending.sourceInstanceId,
    targetInstanceId,
  );
  const owner = pending.owner;
  runtime.pendingCapitalGainsAftermath = null;
  markResolved(state, pending.sourceInstanceId);
  return owner;
}

export function removeV070CapitalGainsBattleRegistration(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.capitalGainsBattleSourceInstanceIds =
    runtime.capitalGainsBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  runtime.resolvedCapitalGainsBattleSourceInstanceIds =
    runtime.resolvedCapitalGainsBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  if (runtime.pendingCapitalGainsAftermath?.sourceInstanceId ===
    sourceInstanceId) {
    runtime.pendingCapitalGainsAftermath = null;
  }
}

function capitalGainsCandidates(
  state: V070GameState,
  sourceInstanceId: string,
): string[] {
  const battle = state.battle;
  const runtime = requireRuntime(state);
  if (!battle) return [];
  const candidates: string[] = [];
  for (const playerId of [battle.attacker, battle.defender]) {
    const participant = runtime.participants[playerId];
    if (participant.gambit) candidates.push(participant.gambit.instanceId);
    candidates.push(...participant.additionalGambits.map(card => card.instanceId));
    if (participant.tactic) candidates.push(participant.tactic.instanceId);
    candidates.push(...participant.additionalTactics.map(card => card.instanceId));
    candidates.push(...participant.reserve);
  }
  return [...new Set(candidates)].filter(instanceId =>
    instanceId !== sourceInstanceId
    && !battleCardHasAlreadyLeftTemporaryBattleAreas(state, instanceId)
  );
}

function battleCardHasAlreadyLeftTemporaryBattleAreas(
  state: V070GameState,
  instanceId: string,
): boolean {
  if (state.overlays.some(overlay => overlay.instanceId === instanceId)) {
    return true;
  }
  if (state.bindings.some(binding => binding.cardInstanceId === instanceId)) {
    return true;
  }
  for (const playerId of ['A', 'B'] as const) {
    const player = state.players[playerId];
    const normalZones = [
      player.zones.drawPile,
      player.zones.hand,
      player.zones.discardPile,
      player.zones.graveyard,
      player.zones.assetBank,
      player.zones.removed,
    ];
    if (normalZones.some(zone => zone.includes(instanceId))) return true;
    if (player.financiers?.treasury.includes(instanceId)) return true;
  }
  return false;
}

function moveBattleCardToTreasury(
  state: V070GameState,
  treasuryOwner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  const financier = state.players[treasuryOwner].financiers;
  if (!financier) {
    throw new V070GameActionError(
      'Capital Gains requires the resolving player to have a Treasury.',
    );
  }
  const previousLocation = removeFromTemporaryBattleArea(
    state,
    targetInstanceId,
  );
  if (!previousLocation) {
    throw new V070GameActionError(
      'Capital Gains target is no longer in a Gambit, Tactic, or Reserve area.',
    );
  }
  financier.treasury.push(targetInstanceId);
  appendV070Event(state, {
    type: 'capital_gains_battle_treasury',
    actor: treasuryOwner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      originalOwner: state.cardInstances[targetInstanceId]?.owner ?? null,
      fromPlayer: previousLocation.playerId,
      fromRole: previousLocation.role,
    },
  });
}

function removeFromTemporaryBattleArea(
  state: V070GameState,
  instanceId: string,
): { playerId: PlayerId; role: 'gambit' | 'tactic' | 'reserve' } | null {
  const battle = state.battle;
  const runtime = requireRuntime(state);
  if (!battle) return null;
  for (const playerId of [battle.attacker, battle.defender]) {
    const participant = runtime.participants[playerId];
    if (participant.gambit?.instanceId === instanceId) {
      participant.gambit = null;
      return { playerId, role: 'gambit' };
    }
    const extraGambit = participant.additionalGambits.findIndex(
      card => card.instanceId === instanceId,
    );
    if (extraGambit >= 0) {
      participant.additionalGambits.splice(extraGambit, 1);
      return { playerId, role: 'gambit' };
    }
    if (participant.tactic?.instanceId === instanceId) {
      participant.tactic = null;
      return { playerId, role: 'tactic' };
    }
    const extraTactic = participant.additionalTactics.findIndex(
      card => card.instanceId === instanceId,
    );
    if (extraTactic >= 0) {
      participant.additionalTactics.splice(extraTactic, 1);
      return { playerId, role: 'tactic' };
    }
    const reserve = participant.reserve.indexOf(instanceId);
    if (reserve >= 0) {
      participant.reserve.splice(reserve, 1);
      return { playerId, role: 'reserve' };
    }
  }
  return null;
}

function markResolved(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  runtime.resolvedCapitalGainsBattleSourceInstanceIds ??= [];
  if (!runtime.resolvedCapitalGainsBattleSourceInstanceIds
    .includes(sourceInstanceId)) {
    runtime.resolvedCapitalGainsBattleSourceInstanceIds.push(sourceInstanceId);
  }
  if (runtime.pendingCapitalGainsAftermath?.sourceInstanceId ===
    sourceInstanceId) {
    runtime.pendingCapitalGainsAftermath = null;
  }
}

function requireRuntime(state: V070GameState) {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Capital Gains battle effect requires an active battle runtime.',
    );
  }
  return runtime;
}
