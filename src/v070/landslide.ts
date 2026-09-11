import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  cardIdForV070Overlay,
  placeV070OverlayFromBattle,
  v070OverlaysAt,
} from './overlays';
import type { PlayerId } from './rules';

export const V070_LANDSLIDE_ID = 'neutral-landslide' as const;
export const V070_LANDSLIDE_BATTLE_TEXT =
  'In the Aftermath, if you lose and retreat from a Territory, after retreating you may place this Overlay on the contested Territory.' as const;
export const V070_LANDSLIDE_OVERLAY_TEXT =
  "When a player retreats onto this Territory: Retreat +1, if able. Then put this card in its owner's Discard Pile." as const;

export interface V070LandslideAftermathRuntime {
  playerId: PlayerId;
  candidateInstanceIds: string[];
  territoryInstanceId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    landslideBattleInstanceIds?: string[];
    pendingLandslideAftermath?: V070LandslideAftermathRuntime | null;
    landslideAftermathResolved?: boolean;
  }
}

function validateV070LandslideAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_LANDSLIDE_ID);
  const battleEffect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  const overlayEffect = card?.effects.find(effect => effect.label === 'Overlay');
  if (!card
    || battleEffect?.text !== V070_LANDSLIDE_BATTLE_TEXT
    || overlayEffect?.text !== V070_LANDSLIDE_OVERLAY_TEXT) {
    throw new Error(
      'v0.7.0 Landslide text drifted from released authority.',
    );
  }
}

validateV070LandslideAuthority();

export function registerV070LandslideBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Landslide battle registration requires an active battle runtime.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner) {
    throw new V070GameActionError(
      'Landslide battle registration owner does not match the card instance.',
    );
  }
  runtime.landslideBattleInstanceIds ??= [];
  if (!runtime.landslideBattleInstanceIds.includes(sourceInstanceId)) {
    runtime.landslideBattleInstanceIds.push(sourceInstanceId);
  }
}

export function pendingV070LandslideAftermath(
  state: V070GameState,
): V070LandslideAftermathRuntime | null {
  return state.battleRuntime?.pendingLandslideAftermath ?? null;
}

export function openV070LandslideAftermathChoice(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || runtime.aftermathCardsCleared
    || runtime.landslideAftermathResolved
    || runtime.pendingLandslideAftermath
    || battle.lastStand
    || !battle.loser) {
    return Boolean(runtime?.pendingLandslideAftermath);
  }

  const loser = battle.loser;
  if (battle.positions[loser] === battle.contestedPosition) {
    runtime.landslideAftermathResolved = true;
    return false;
  }

  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory) {
    runtime.landslideAftermathResolved = true;
    return false;
  }

  if (v070OverlaysAt(state, territory.position).some(overlay =>
    cardIdForV070Overlay(state, overlay) === V070_LANDSLIDE_ID
  )) {
    runtime.landslideAftermathResolved = true;
    appendV070Event(state, {
      type: 'landslide_battle_overlay_unavailable',
      actor: loser,
      visibility: 'public',
      payload: {
        playerId: loser,
        territoryInstanceId: territory.territoryInstanceId,
        territoryPosition: territory.position,
        reason: 'territory_already_has_landslide',
      },
    });
    return false;
  }

  const registered = runtime.landslideBattleInstanceIds ?? [];
  const candidates = registered.filter(instanceId =>
    state.cardInstances[instanceId]?.owner === loser
    && battleCommitmentInstanceIds(state, loser).includes(instanceId)
  );
  if (candidates.length === 0) {
    runtime.landslideAftermathResolved = true;
    return false;
  }

  runtime.pendingLandslideAftermath = {
    playerId: loser,
    candidateInstanceIds: [...candidates],
    territoryInstanceId: territory.territoryInstanceId,
  };
  appendV070Event(state, {
    type: 'landslide_battle_overlay_choice_pending',
    actor: loser,
    visibility: 'public',
    payload: {
      playerId: loser,
      candidateCount: candidates.length,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'landslide_battle_overlay_choice_options',
    actor: loser,
    visibility: loser,
    payload: {
      candidateInstanceIds: [...candidates],
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
    },
  });
  return true;
}

export function resolveV070LandslideAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId?: string,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingLandslideAftermath;
  if (!runtime || !pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Landslide Aftermath placement choice is pending for that player.',
    );
  }

  if (sourceInstanceId === undefined) {
    runtime.pendingLandslideAftermath = null;
    runtime.landslideAftermathResolved = true;
    appendV070Event(state, {
      type: 'landslide_battle_overlay_choice_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        territoryInstanceId: pending.territoryInstanceId,
      },
    });
    return;
  }

  if (!pending.candidateInstanceIds.includes(sourceInstanceId)) {
    throw new V070GameActionError(
      'Choose an eligible Landslide from this battle or decline the placement.',
    );
  }

  const territory = state.board.find(
    candidate => candidate.territoryInstanceId === pending.territoryInstanceId,
  );
  if (!territory) {
    throw new V070GameActionError(
      'The contested Territory is no longer in the Gauntlet.',
    );
  }
  if (v070OverlaysAt(state, territory.position).some(overlay =>
    cardIdForV070Overlay(state, overlay) === V070_LANDSLIDE_ID
  )) {
    throw new V070GameActionError(
      'That Territory already has a Landslide.',
    );
  }

  placeV070OverlayFromBattle(
    state,
    playerId,
    sourceInstanceId,
    territory.position,
    'Landslide battle Aftermath',
  );
  runtime.pendingLandslideAftermath = null;
  runtime.landslideAftermathResolved = true;

  appendV070Event(state, {
    type: 'landslide_battle_overlay_placed',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      sourceInstanceId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
    },
  });
}

function battleCommitmentInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const participant = state.battleRuntime?.participants[playerId];
  if (!participant) return [];
  return [
    ...(participant.gambit ? [participant.gambit.instanceId] : []),
    ...participant.additionalGambits.map(commitment => commitment.instanceId),
    ...(participant.tactic ? [participant.tactic.instanceId] : []),
    ...participant.additionalTactics.map(commitment => commitment.instanceId),
  ];
}
