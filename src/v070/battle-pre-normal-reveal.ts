import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  beginV070ConfessionPreRevealSource,
  pendingV070ConfessionBattleChoice,
  v070ConfessionPreRevealSourceInstanceIds,
  V070_CONFESSION_ID,
} from './confession-battle';
import {
  beginV070ScoutingReportPreRevealSource,
  pendingV070ScoutingReportBattleChoice,
  v070ScoutingReportPreRevealSourceInstanceIds,
  V070_SCOUTING_REPORT_ID,
} from './scouting-report-battle';

export type V070PreNormalRevealRole = 'gambit' | 'tactic';

export interface V070PreNormalRevealSource {
  owner: PlayerId;
  sourceInstanceId: string;
  sourceCardId:
    | typeof V070_CONFESSION_ID
    | typeof V070_SCOUTING_REPORT_ID;
  role: V070PreNormalRevealRole;
}

export interface V070PreNormalRevealEffectOrderChoice {
  playerId: PlayerId;
  role: V070PreNormalRevealRole;
  candidateSourceInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    preNormalRevealRole?: V070PreNormalRevealRole | null;
    preNormalRevealLastPlayer?: PlayerId | null;
    pendingPreNormalRevealEffectOrderChoice?:
      V070PreNormalRevealEffectOrderChoice | null;
  }
}

function expectedStage(role: V070PreNormalRevealRole) {
  return role === 'gambit' ? 'reveal_gambits' : 'reveal_tactics';
}

function sourceRefsForPlayer(
  state: V070GameState,
  playerId: PlayerId,
  role: V070PreNormalRevealRole,
): V070PreNormalRevealSource[] {
  const result: V070PreNormalRevealSource[] = [];

  for (const sourceInstanceId of v070ScoutingReportPreRevealSourceInstanceIds(
    state,
    playerId,
    role,
  )) {
    result.push({
      owner: playerId,
      sourceInstanceId,
      sourceCardId: V070_SCOUTING_REPORT_ID,
      role,
    });
  }

  if (role === 'tactic') {
    for (const sourceInstanceId of v070ConfessionPreRevealSourceInstanceIds(
      state,
      playerId,
    )) {
      result.push({
        owner: playerId,
        sourceInstanceId,
        sourceCardId: V070_CONFESSION_ID,
        role,
      });
    }
  }

  return result;
}

export function v070PreNormalRevealSources(
  state: V070GameState,
  role: V070PreNormalRevealRole,
): V070PreNormalRevealSource[] {
  const battle = state.battle;
  if (!battle) return [];
  return [
    ...sourceRefsForPlayer(state, battle.attacker, role),
    ...sourceRefsForPlayer(state, battle.defender, role),
  ];
}

function cardSpecificChoicePending(state: V070GameState): boolean {
  return Boolean(
    pendingV070ConfessionBattleChoice(state)
    || pendingV070ScoutingReportBattleChoice(state),
  );
}

function nextPlayer(
  state: V070GameState,
  role: V070PreNormalRevealRole,
  previousPlayer: PlayerId | null,
): PlayerId | null {
  const battle = state.battle;
  if (!battle) return null;
  const has = (playerId: PlayerId) =>
    sourceRefsForPlayer(state, playerId, role).length > 0;

  if (previousPlayer === null) {
    if (has(battle.attacker)) return battle.attacker;
    if (has(battle.defender)) return battle.defender;
    return null;
  }

  const other =
    previousPlayer === battle.attacker
      ? battle.defender
      : battle.attacker;
  if (has(other)) return other;
  if (has(previousPlayer)) return previousPlayer;
  return null;
}

function beginSource(
  state: V070GameState,
  source: V070PreNormalRevealSource,
): void {
  if (source.sourceCardId === V070_CONFESSION_ID) {
    beginV070ConfessionPreRevealSource(
      state,
      source.owner,
      source.sourceInstanceId,
    );
    return;
  }
  beginV070ScoutingReportPreRevealSource(
    state,
    source.owner,
    source.sourceInstanceId,
    source.role,
  );
}

function initializeRole(
  state: V070GameState,
  role: V070PreNormalRevealRole,
): void {
  const runtime = state.battleRuntime!;
  if (runtime.preNormalRevealRole === role) return;
  runtime.preNormalRevealRole = role;
  runtime.preNormalRevealLastPlayer = null;
  runtime.pendingPreNormalRevealEffectOrderChoice = null;
}

function clearRole(state: V070GameState): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.preNormalRevealRole = null;
  runtime.preNormalRevealLastPlayer = null;
  runtime.pendingPreNormalRevealEffectOrderChoice = null;
}

function openOrderChoice(
  state: V070GameState,
  playerId: PlayerId,
  role: V070PreNormalRevealRole,
  candidates: readonly V070PreNormalRevealSource[],
): void {
  const runtime = state.battleRuntime!;
  runtime.pendingPreNormalRevealEffectOrderChoice = {
    playerId,
    role,
    candidateSourceInstanceIds: candidates.map(
      candidate => candidate.sourceInstanceId,
    ),
  };
  appendV070Event(state, {
    type: 'pre_normal_reveal_effect_order_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      role,
      candidateCount: candidates.length,
    },
  });
  appendV070Event(state, {
    type: 'pre_normal_reveal_effect_order_choice_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      role,
      sourceInstanceIds: candidates.map(
        candidate => candidate.sourceInstanceId,
      ),
    },
  });
}

export function pendingV070PreNormalRevealEffectOrderChoice(
  state: V070GameState,
): V070PreNormalRevealEffectOrderChoice | null {
  return state.battleRuntime?.pendingPreNormalRevealEffectOrderChoice ?? null;
}

export function resolveV070PreNormalRevealEffectOrderChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
): void {
  const pending = pendingV070PreNormalRevealEffectOrderChoice(state);
  const runtime = state.battleRuntime;
  if (!runtime || !pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No pre-normal-reveal effect-order choice is pending for that player.',
    );
  }
  if (!pending.candidateSourceInstanceIds.includes(sourceInstanceId)) {
    throw new V070GameActionError(
      'That card is not an eligible pre-normal-reveal effect.',
    );
  }

  const source = sourceRefsForPlayer(
    state,
    playerId,
    pending.role,
  ).find(candidate => candidate.sourceInstanceId === sourceInstanceId);
  if (!source) {
    throw new V070GameActionError(
      'That pre-normal-reveal effect is no longer available.',
    );
  }

  runtime.pendingPreNormalRevealEffectOrderChoice = null;
  runtime.preNormalRevealLastPlayer = playerId;
  beginSource(state, source);
}

export function advanceV070PreNormalRevealEffects(
  state: V070GameState,
  role: V070PreNormalRevealRole,
): boolean {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime || runtime.stage !== expectedStage(role)) {
    return false;
  }

  initializeRole(state, role);
  if (runtime.pendingPreNormalRevealEffectOrderChoice
    || cardSpecificChoicePending(state)) {
    return true;
  }

  while (true) {
    const playerId = nextPlayer(
      state,
      role,
      runtime.preNormalRevealLastPlayer ?? null,
    );
    if (!playerId) {
      clearRole(state);
      return false;
    }

    const candidates = sourceRefsForPlayer(state, playerId, role);
    if (candidates.length > 1) {
      openOrderChoice(state, playerId, role, candidates);
      return true;
    }
    if (candidates.length === 0) {
      runtime.preNormalRevealLastPlayer = playerId;
      continue;
    }

    runtime.preNormalRevealLastPlayer = playerId;
    beginSource(state, candidates[0]);
    if (cardSpecificChoicePending(state)) return true;
  }
}
