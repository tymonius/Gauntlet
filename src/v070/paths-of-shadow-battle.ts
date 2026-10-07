import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId, V070BattleOutcome } from './rules';
import {
  V070_DEMILITARIZED_ZONE_ID,
  activeV070Overlay,
  cardIdForV070Overlay,
  resolveV070OverlayEntryRequirements,
  v070DmzBlocksEntryThisTurn,
} from './overlays';

export const V070_PATHS_OF_SHADOW_ID =
  'mystics-paths-of-shadow' as const;
export const V070_PATHS_OF_SHADOW_BATTLE_TEXT =
  'In the Aftermath, if you lose, you may move to any Territory you control instead of retreating normally.' as const;

export interface V070PathsOfShadowBattleChoiceRuntime {
  playerId: PlayerId;
  sourceInstanceIds: string[];
  candidatePositions: number[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    pathsOfShadowBattleSourceInstanceIds?: string[];
    pendingPathsOfShadowBattleChoice?:
      V070PathsOfShadowBattleChoiceRuntime | null;
  }
}

function validateAuthority(): void {
  for (const [label, content] of [
    ['frozen v0.7.0', v070CanonicalContent],
    ['current', currentCanonicalContent],
  ] as const) {
    const effect = content.cardsById.get(V070_PATHS_OF_SHADOW_ID)
      ?.effects.find(candidate => candidate.label === 'Gambit/Tactic');
    if (effect?.text !== V070_PATHS_OF_SHADOW_BATTLE_TEXT) {
      throw new Error(
        `Paths of Shadow battle text drifted from ${label} gameplay authority.`,
      );
    }
  }
}

validateAuthority();

export function registerV070PathsOfShadowBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Paths of Shadow battle registration requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.cardId
      !== V070_PATHS_OF_SHADOW_ID
    || state.cardInstances[sourceInstanceId]?.owner !== owner) {
    throw new V070GameActionError(
      'Paths of Shadow battle source does not match its controller.',
    );
  }

  runtime.pathsOfShadowBattleSourceInstanceIds ??= [];
  if (!runtime.pathsOfShadowBattleSourceInstanceIds.includes(
    sourceInstanceId,
  )) {
    runtime.pathsOfShadowBattleSourceInstanceIds.push(sourceInstanceId);
  }
}

export function v070PathsOfShadowBattleCandidatePositions(
  state: V070GameState,
  playerId: PlayerId,
): number[] {
  const battle = state.battle;
  if (!battle) return [];
  const opponent = playerId === 'A' ? 'B' : 'A';
  const opponentPosition = battle.positions[opponent];

  return state.board
    .filter(territory => territory.controller === playerId)
    .filter(territory => territory.position !== battle.contestedPosition)
    .filter(territory => territory.position !== opponentPosition)
    .filter(territory =>
      !territory.occupant || territory.occupant === playerId
    )
    .filter(territory =>
      !v070DmzBlocksEntryThisTurn(state, territory.position)
    )
    .filter(territory => {
      const active = activeV070Overlay(state, territory.position);
      const requiresEntryDiscard = Boolean(
        active
        && cardIdForV070Overlay(state, active)
          === V070_DEMILITARIZED_ZONE_ID
        && territory.occupant === null,
      );
      return !requiresEntryDiscard
        || state.players[playerId].zones.hand.length > 0;
    })
    .map(territory => territory.position);
}

export function openV070PathsOfShadowBattleChoice(
  state: V070GameState,
  outcome: V070BattleOutcome,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) return false;

  const registered =
    runtime.pathsOfShadowBattleSourceInstanceIds ?? [];
  const sourceInstanceIds = registered.filter(instanceId =>
    state.cardInstances[instanceId]?.owner === outcome.loser
    && battleCommitmentInstanceIds(state, outcome.loser)
      .includes(instanceId)
  );
  if (sourceInstanceIds.length === 0) return false;

  const candidatePositions =
    v070PathsOfShadowBattleCandidatePositions(
      state,
      outcome.loser,
    );
  if (candidatePositions.length === 0) {
    appendV070Event(state, {
      type: 'paths_of_shadow_battle_unavailable',
      actor: outcome.loser,
      visibility: 'public',
      payload: {
        playerId: outcome.loser,
        sourceInstanceIds: [...sourceInstanceIds],
        reason: 'controlled_territory_destination_unavailable',
      },
    });
    return false;
  }

  runtime.pendingOutcome = structuredClone(outcome);
  runtime.stage = 'loss_replacement';
  runtime.pendingPathsOfShadowBattleChoice = {
    playerId: outcome.loser,
    sourceInstanceIds: [...sourceInstanceIds],
    candidatePositions: [...candidatePositions],
  };

  appendV070Event(state, {
    type: 'paths_of_shadow_battle_choice_pending',
    actor: outcome.loser,
    visibility: 'public',
    payload: {
      playerId: outcome.loser,
      sourceInstanceIds: [...sourceInstanceIds],
      candidateCount: candidatePositions.length,
      optional: true,
      replaces: 'normal_retreat',
    },
  });
  appendV070Event(state, {
    type: 'paths_of_shadow_battle_choice_options',
    actor: outcome.loser,
    visibility: outcome.loser,
    payload: {
      sourceInstanceIds: [...sourceInstanceIds],
      territoryPositions: [...candidatePositions],
    },
  });
  return true;
}

export interface V070PathsOfShadowBattleResolution {
  outcome: V070BattleOutcome;
  replacementPosition: number | null;
  sourceInstanceId: string | null;
}

export function resolveV070PathsOfShadowBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition?: number,
  discardInstanceId?: string,
): V070PathsOfShadowBattleResolution {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingPathsOfShadowBattleChoice;
  const outcome = runtime?.pendingOutcome;
  if (!runtime || !pending || !outcome) {
    throw new V070GameActionError(
      'No Paths of Shadow battle choice is pending.',
    );
  }
  if (pending.playerId !== playerId
    || outcome.loser !== playerId) {
    throw new V070GameActionError(
      'Only the losing Paths of Shadow controller may resolve this choice.',
    );
  }

  if (territoryPosition === undefined) {
    if (discardInstanceId) {
      throw new V070GameActionError(
        'Declining Paths of Shadow does not pay a Territory entry cost.',
      );
    }
    runtime.pendingPathsOfShadowBattleChoice = null;
    runtime.pendingOutcome = null;
    appendV070Event(state, {
      type: 'paths_of_shadow_battle_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        sourceInstanceIds: [...pending.sourceInstanceIds],
      },
    });
    return {
      outcome,
      replacementPosition: null,
      sourceInstanceId: null,
    };
  }

  if (!pending.candidatePositions.includes(territoryPosition)
    || !v070PathsOfShadowBattleCandidatePositions(
      state,
      playerId,
    ).includes(territoryPosition)) {
    throw new V070GameActionError(
      'Paths of Shadow must move to a currently legal Territory you control.',
    );
  }

  resolveV070OverlayEntryRequirements(
    state,
    playerId,
    territoryPosition,
    discardInstanceId,
  );

  const sourceInstanceId = pending.sourceInstanceIds[0] ?? null;
  runtime.pendingPathsOfShadowBattleChoice = null;
  runtime.pendingOutcome = null;

  appendV070Event(state, {
    type: 'paths_of_shadow_battle_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      sourceInstanceId,
      sourceCardId: V070_PATHS_OF_SHADOW_ID,
      territoryPosition,
      replaces: 'normal_retreat',
    },
  });

  return {
    outcome,
    replacementPosition: territoryPosition,
    sourceInstanceId,
  };
}

function battleCommitmentInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const participant = state.battleRuntime?.participants[playerId];
  if (!participant) return [];
  return [
    ...(participant.gambit ? [participant.gambit.instanceId] : []),
    ...participant.additionalGambits.map(
      commitment => commitment.instanceId,
    ),
    ...(participant.tactic ? [participant.tactic.instanceId] : []),
    ...participant.additionalTactics.map(
      commitment => commitment.instanceId,
    ),
  ];
}
