import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  completeV070BattleRevealChoice,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';
import { markV070BattleCardEffectApplied } from './battle-effect-status';

export const V070_COUNTERWORKS_ID = 'neutral-counterworks' as const;
export const V070_COUNTERWORKS_BATTLE_TEXT =
  'Choose one: one Overlay on the contested Territory is inactive during this battle; or the next opposing Overlay that would be placed there during this battle or its Aftermath is not placed. The card that would become that Overlay is discarded.' as const;

declare module './battle-types' {
  interface V070BattleRuntime {
    counterworksInactiveOverlayInstanceIds?: string[];
    counterworksOverlayPlacementPreventions?: Array<{
      owner: PlayerId;
      sourceInstanceId: string;
      territoryInstanceId: string;
    }>;
  }
}

export type V070CounterworksBattleAction = {
  type: 'resolve_counterworks_battle';
  playerId: PlayerId;
  mode: 'suppress_overlay' | 'prevent_next_opposing_overlay';
  overlayInstanceId?: string;
};

export interface V070CounterworksBattleChoice {
  kind: 'counterworks';
  owner: PlayerId;
  sourceInstanceId: string;
  territoryPosition: number;
  candidateOverlayInstanceIds: string[];
}

function validateV070CounterworksAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_COUNTERWORKS_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_COUNTERWORKS_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Counterworks battle text drifted from released authority.',
    );
  }
}

validateV070CounterworksAuthority();

export function registerV070CounterworksBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Counterworks battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_COUNTERWORKS_ID) {
    throw new V070GameActionError(
      'Counterworks battle source does not match the revealed card instance.',
    );
  }

  const territory = state.board.find(
    item => item.position === battle.contestedPosition,
  );
  if (!territory) {
    throw new V070GameActionError(
      'Counterworks requires a contested Territory in the Gauntlet.',
    );
  }

  const candidateOverlayInstanceIds = state.overlays
    .filter(overlay => overlay.territoryInstanceId === territory.territoryInstanceId)
    .sort((a, b) => a.sequence - b.sequence)
    .map(overlay => overlay.instanceId);

  queueV070BattleRevealChoice(state, {
    kind: 'counterworks',
    owner,
    sourceInstanceId,
    territoryPosition: battle.contestedPosition,
    candidateOverlayInstanceIds,
  });
}

export function pendingV070CounterworksBattleChoice(
  state: V070GameState,
): V070CounterworksBattleChoice | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'counterworks' ? pending : null;
}

export function openV070CounterworksBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070CounterworksBattleChoice(state);
  if (!pending) return false;
  markV070BattleRevealChoiceOpen(state);

  appendV070Event(state, {
    type: 'counterworks_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_COUNTERWORKS_ID,
      territoryPosition: pending.territoryPosition,
      existingOverlayCount: pending.candidateOverlayInstanceIds.length,
      choices: [
        ...(pending.candidateOverlayInstanceIds.length > 0
          ? ['suppress_overlay']
          : []),
        'prevent_next_opposing_overlay',
      ],
    },
  });
  return true;
}

export function resolveV070CounterworksBattleChoice(
  state: V070GameState,
  action: V070CounterworksBattleAction,
): void {
  const pending = pendingV070CounterworksBattleChoice(state);
  if (!pending) {
    throw new V070GameActionError(
      'There is no pending Counterworks battle choice.',
    );
  }
  if (pending.owner !== action.playerId) {
    throw new V070GameActionError(
      'Only the Counterworks controller may resolve its battle choice.',
    );
  }

  const completed = completeV070BattleRevealChoice(state, 'counterworks');
  if (completed.kind !== 'counterworks') {
    throw new V070GameActionError('Counterworks choice state changed unexpectedly.');
  }

  const runtime = state.battleRuntime!;
  const territory = state.board.find(
    item => item.position === completed.territoryPosition,
  );
  if (!territory) {
    throw new V070GameActionError(
      'The contested Territory is no longer available for Counterworks.',
    );
  }

  if (action.mode === 'suppress_overlay') {
    if (!action.overlayInstanceId
      || !completed.candidateOverlayInstanceIds.includes(action.overlayInstanceId)) {
      throw new V070GameActionError(
        'Counterworks must choose one Overlay that was on the contested Territory when the effect opened.',
      );
    }
    const stillAttached = state.overlays.some(overlay =>
      overlay.instanceId === action.overlayInstanceId
      && overlay.territoryInstanceId === territory.territoryInstanceId
    );
    if (!stillAttached) {
      throw new V070GameActionError(
        'That Counterworks Overlay target is no longer attached to the contested Territory.',
      );
    }

    runtime.counterworksInactiveOverlayInstanceIds ??= [];
    if (!runtime.counterworksInactiveOverlayInstanceIds.includes(
      action.overlayInstanceId,
    )) {
      runtime.counterworksInactiveOverlayInstanceIds.push(action.overlayInstanceId);
    }

    appendV070Event(state, {
      type: 'counterworks_overlay_suppressed',
      actor: action.playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: completed.sourceInstanceId,
        sourceCardId: V070_COUNTERWORKS_ID,
        overlayInstanceId: action.overlayInstanceId,
        overlayCardId: state.cardInstances[action.overlayInstanceId]?.cardId ?? null,
        territoryPosition: completed.territoryPosition,
        duration: 'battle',
      },
    });
  } else {
    if (action.overlayInstanceId !== undefined) {
      throw new V070GameActionError(
        'Counterworks prevention mode does not choose an existing Overlay.',
      );
    }
    runtime.counterworksOverlayPlacementPreventions ??= [];
    runtime.counterworksOverlayPlacementPreventions.push({
      owner: action.playerId,
      sourceInstanceId: completed.sourceInstanceId,
      territoryInstanceId: territory.territoryInstanceId,
    });

    appendV070Event(state, {
      type: 'counterworks_overlay_prevention_armed',
      actor: action.playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: completed.sourceInstanceId,
        sourceCardId: V070_COUNTERWORKS_ID,
        territoryPosition: completed.territoryPosition,
        territoryInstanceId: territory.territoryInstanceId,
      },
    });
  }

  markV070BattleCardEffectApplied(state, completed.sourceInstanceId);
}

export function v070CounterworksOverlayInactiveDuringBattle(
  state: V070GameState,
  overlayInstanceId: string,
): boolean {
  return Boolean(
    state.battle
    && state.battleRuntime?.counterworksInactiveOverlayInstanceIds
      ?.includes(overlayInstanceId),
  );
}

export function preventV070OverlayPlacementWithCounterworks(
  state: V070GameState,
  placingOwner: PlayerId,
  overlayInstanceId: string,
  territoryPosition: number,
  source: string,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || territoryPosition !== battle.contestedPosition) {
    return false;
  }
  const territory = state.board.find(item => item.position === territoryPosition);
  if (!territory) return false;

  const preventions = runtime.counterworksOverlayPlacementPreventions ?? [];
  const index = preventions.findIndex(prevention =>
    prevention.owner !== placingOwner
    && prevention.territoryInstanceId === territory.territoryInstanceId
  );
  if (index < 0) return false;

  const [prevention] = preventions.splice(index, 1);
  discardPreventedOverlayCard(state, overlayInstanceId);

  appendV070Event(state, {
    type: 'counterworks_overlay_placement_prevented',
    actor: prevention.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: prevention.sourceInstanceId,
      sourceCardId: V070_COUNTERWORKS_ID,
      preventedOverlayInstanceId: overlayInstanceId,
      preventedOverlayCardId:
        state.cardInstances[overlayInstanceId]?.cardId ?? null,
      preventedOverlayOwner: placingOwner,
      territoryPosition,
      territoryInstanceId: territory.territoryInstanceId,
      placementSource: source,
    },
  });
  return true;
}

function discardPreventedOverlayCard(
  state: V070GameState,
  instanceId: string,
): void {
  const card = state.cardInstances[instanceId];
  if (!card) {
    throw new V070GameActionError(
      'Counterworks could not identify the card that would become the Overlay.',
    );
  }
  const owner = card.owner;
  const player = state.players[owner];

  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    removeAll(zone, instanceId);
  }

  const runtime = state.battleRuntime;
  if (runtime) {
    const participant = runtime.participants[owner];
    if (participant.gambit?.instanceId === instanceId) participant.gambit = null;
    participant.additionalGambits = participant.additionalGambits.filter(
      commitment => commitment.instanceId !== instanceId,
    );
    if (participant.tactic?.instanceId === instanceId) participant.tactic = null;
    participant.additionalTactics = participant.additionalTactics.filter(
      commitment => commitment.instanceId !== instanceId,
    );
    removeAll(participant.reserve, instanceId);

    runtime.battleCardAftermathOverlayPlacements =
      runtime.battleCardAftermathOverlayPlacements.filter(
        placement => placement.sourceInstanceId !== instanceId,
      );
    runtime.battleCardAftermathDestinationOverrides =
      runtime.battleCardAftermathDestinationOverrides.filter(
        override => override.instanceId !== instanceId,
      );
  }

  if (!player.zones.discardPile.includes(instanceId)) {
    player.zones.discardPile.push(instanceId);
  }
}

function removeAll(target: string[], instanceId: string): void {
  let index = target.indexOf(instanceId);
  while (index >= 0) {
    target.splice(index, 1);
    index = target.indexOf(instanceId);
  }
}
