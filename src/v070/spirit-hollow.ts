import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { assertV070GraveyardExitAllowed } from './territories';
import { recordV070MysticQualifyingHandSacrifice } from './mystics';

export const V070_SPIRIT_HOLLOW_ID = 'mystics-spirit-hollow';

/**
 * The battle core owns card cleanup and later post-clear windows. Spirit Hollow
 * needs to interrupt exactly between those two operations when its battle card
 * has just become the active Overlay. The public battle reducer catches this
 * typed pause and returns the already-cloned, partially resolved state.
 */
export class V070SpiritHollowAftermathPause extends Error {
  readonly state: V070GameState;

  constructor(state: V070GameState) {
    super('Spirit Hollow Aftermath choice is pending.');
    this.name = 'V070SpiritHollowAftermathPause';
    this.state = state;
  }
}

export function pauseV070ForSpiritHollowAfterBattleCardsCleared(
  state: V070GameState,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'aftermath') return;

  // resolveV070OverlayAfterBattle is called after all battle cards have already
  // reached their Aftermath destinations. Mark that boundary before pausing so
  // resumption cannot clear them a second time.
  runtime.aftermathCardsCleared = true;

  // Immediate game victory outranks optional post-clear windows in the current
  // battle procedure, matching the existing Final Judgment / Rout ordering.
  if (runtime.pendingGameVictory) {
    runtime.spiritHollowAftermathPlayers = [];
    return;
  }

  if (openV070SpiritHollowAftermathChoice(state)) {
    throw new V070SpiritHollowAftermathPause(state);
  }
}

export function openV070SpiritHollowAftermathChoice(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath') return false;
  if (runtime.pendingSpiritHollowAftermath) return true;

  const active = activeSpiritHollowAtContestedTerritory(state);
  if (runtime.spiritHollowAftermathPlayers === null) {
    if (!active) {
      runtime.spiritHollowAftermathPlayers = [];
      return false;
    }
    runtime.spiritHollowAftermathPlayers = [
      battle.attacker,
      battle.defender,
    ];
  }

  if (!active) {
    runtime.spiritHollowAftermathPlayers = [];
    return false;
  }

  while (runtime.spiritHollowAftermathPlayers.length > 0) {
    const playerId = runtime.spiritHollowAftermathPlayers[0];
    const candidateHandInstanceIds = [
      ...state.players[playerId].zones.hand,
    ];
    if (candidateHandInstanceIds.length === 0) {
      runtime.spiritHollowAftermathPlayers.shift();
      appendV070Event(state, {
        type: 'spirit_hollow_aftermath_unavailable',
        actor: playerId,
        visibility: 'public',
        payload: {
          playerId,
          overlayInstanceId: active.overlayInstanceId,
          territoryInstanceId: active.territoryInstanceId,
          reason: 'hand_empty',
        },
      });
      continue;
    }

    const candidateGraveyardInstanceIds = [
      ...state.players[playerId].zones.graveyard,
    ];
    runtime.pendingSpiritHollowAftermath = {
      playerId,
      overlayInstanceId: active.overlayInstanceId,
      territoryInstanceId: active.territoryInstanceId,
      candidateHandInstanceIds,
      candidateGraveyardInstanceIds,
    };

    appendV070Event(state, {
      type: 'spirit_hollow_aftermath_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        overlayInstanceId: active.overlayInstanceId,
        territoryInstanceId: active.territoryInstanceId,
        optional: true,
      },
    });
    appendV070Event(state, {
      type: 'spirit_hollow_aftermath_options',
      actor: playerId,
      visibility: playerId,
      payload: {
        candidateHandInstanceIds,
        candidateGraveyardInstanceIds,
      },
    });
    return true;
  }

  return false;
}

export function resolveV070SpiritHollowAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  handInstanceId?: string,
  graveyardInstanceId?: string,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingSpiritHollowAftermath;
  if (!runtime || !pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Spirit Hollow Aftermath choice is pending for that player.',
    );
  }

  if (!handInstanceId) {
    if (graveyardInstanceId) {
      throw new V070GameActionError(
        'Spirit Hollow cannot recover a Graveyard card when its sacrifice is declined.',
      );
    }
    appendV070Event(state, {
      type: 'spirit_hollow_aftermath_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        overlayInstanceId: pending.overlayInstanceId,
        territoryInstanceId: pending.territoryInstanceId,
      },
    });
    finishChoice(runtime, playerId);
    return;
  }

  const hand = state.players[playerId].zones.hand;
  const handIndex = hand.indexOf(handInstanceId);
  if (!pending.candidateHandInstanceIds.includes(handInstanceId)
    || handIndex < 0) {
    throw new V070GameActionError(
      'Spirit Hollow must put one eligible card from Hand in the Graveyard.',
    );
  }

  if (graveyardInstanceId) {
    const graveyard = state.players[playerId].zones.graveyard;
    if (!pending.candidateGraveyardInstanceIds.includes(graveyardInstanceId)
      || !graveyard.includes(graveyardInstanceId)) {
      throw new V070GameActionError(
        'Spirit Hollow may recover only one other card that was already in that Graveyard.',
      );
    }
    assertV070GraveyardExitAllowed(state, 'Spirit Hollow');
  }

  hand.splice(handIndex, 1);
  state.players[playerId].zones.graveyard.push(handInstanceId);

  if (graveyardInstanceId) {
    const graveyard = state.players[playerId].zones.graveyard;
    const graveyardIndex = graveyard.indexOf(graveyardInstanceId);
    graveyard.splice(graveyardIndex, 1);
    state.players[playerId].zones.discardPile.push(graveyardInstanceId);
  }

  recordV070MysticQualifyingHandSacrifice(
    state,
    playerId,
    'Spirit Hollow',
  );

  appendV070Event(state, {
    type: 'spirit_hollow_aftermath_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      overlayInstanceId: pending.overlayInstanceId,
      territoryInstanceId: pending.territoryInstanceId,
      recovered: Boolean(graveyardInstanceId),
    },
  });
  appendV070Event(state, {
    type: 'spirit_hollow_aftermath_identity',
    actor: playerId,
    visibility: playerId,
    payload: {
      sacrificedInstanceId: handInstanceId,
      sacrificedCardId: state.cardInstances[handInstanceId]?.cardId,
      recoveredInstanceId: graveyardInstanceId ?? null,
      recoveredCardId: graveyardInstanceId
        ? state.cardInstances[graveyardInstanceId]?.cardId ?? null
        : null,
    },
  });

  finishChoice(runtime, playerId);
}

function finishChoice(
  runtime: NonNullable<V070GameState['battleRuntime']>,
  playerId: PlayerId,
): void {
  runtime.pendingSpiritHollowAftermath = null;
  if (runtime.spiritHollowAftermathPlayers?.[0] === playerId) {
    runtime.spiritHollowAftermathPlayers.shift();
    return;
  }
  runtime.spiritHollowAftermathPlayers =
    runtime.spiritHollowAftermathPlayers?.filter(
      candidate => candidate !== playerId,
    ) ?? [];
}

function activeSpiritHollowAtContestedTerritory(
  state: V070GameState,
): {
  overlayInstanceId: string;
  territoryInstanceId: string;
} | null {
  const battle = state.battle;
  if (!battle) return null;
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory) return null;

  const overlays = state.overlays
    .filter(overlay =>
      overlay.territoryInstanceId === territory.territoryInstanceId
    )
    .sort((a, b) => a.sequence - b.sequence);
  const active = overlays[overlays.length - 1];
  if (!active
    || state.cardInstances[active.instanceId]?.cardId !==
      V070_SPIRIT_HOLLOW_ID) {
    return null;
  }

  return {
    overlayInstanceId: active.instanceId,
    territoryInstanceId: territory.territoryInstanceId,
  };
}
