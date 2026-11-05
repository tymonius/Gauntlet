import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type { V070BattleCardCommitment } from './battle-types';
import {
  markV070BattleCardEffectApplied,
  v070BattleCommitment,
} from './battle-effect-status';
import { V070_FOG_OF_WAR_ID } from './fog-of-war';
import {
  pendingV070BattleRevealChoice,
  type V070FogOfWarBattleRevealChoice,
} from './battle-reveal-choices';

export type V070FogOfWarReturnSelection =
  | { choice: 'one_gambit'; targetInstanceId: string }
  | { choice: 'all_tactics' };

/**
 * Physical, source-aware card return primitive for Fog of War. This function
 * returns the physical card, not its already-applied effect. Under the
 * current rulebook, applied effects cannot be canceled retroactively.
 *
 * Only the explicit pending reveal-stage choice may return cards while
 * the reveal scheduler is paused; their unapplied queued effects are pruned.
 */
export function returnV070FogOfWarBattleCards(
  state: V070GameState,
  fogOwner: PlayerId,
  fogInstanceId: string,
  selection: V070FogOfWarReturnSelection,
): string[] {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime
    || (runtime.stage !== 'reveal_tactics' && runtime.stage !== 'outcome')) {
    throw new V070GameActionError(
      'Fog of War card returns require an active post-Tactics battle.',
    );
  }
  if (runtime.pendingOutcome
    || (['A', 'B'] as const).some(playerId =>
      runtime.participants[playerId].battleDice.length > 0)) {
    throw new V070GameActionError(
      'Fog of War returns must resolve before either player rolls battle dice.',
    );
  }
  // Do not remove a card from the battle while an earlier reveal-effect
  // sequence still holds a queued commitment that would apply afterward.
  const pendingFog = runtime.pendingFogOfWarBattleRevealChoice;
  const withinFogRevealChoice = Boolean(
    pendingFog
    && pendingFog.sourceInstanceId === fogInstanceId
    && runtime.fogOfWarBattleRevealChoiceOpen
    && runtime.pendingRevealEffectEncounteredAt === 'reveal_tactics',
  );
  if (runtime.pendingRevealEffectEncounteredAt && !withinFogRevealChoice) {
    throw new V070GameActionError(
      'Resolve pending battle-card reveal effects before returning cards to their sources.',
    );
  }
  const fog = v070BattleCommitment(state, fogInstanceId);
  if (!fog || fog.owner !== fogOwner
    || state.cardInstances[fogInstanceId]?.cardId !== V070_FOG_OF_WAR_ID) {
    throw new V070GameActionError(
      'Fog of War must originate from its own committed battle card.',
    );
  }

  const opponent: PlayerId = fogOwner === 'A' ? 'B' : 'A';
  const participant = runtime.participants[opponent];
  const gambits = [
    ...(participant.gambit ? [participant.gambit] : []),
    ...participant.additionalGambits,
  ];
  const tactics = [
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ];
  if (gambits.length === 0 || tactics.length === 0) {
    throw new V070GameActionError(
      'Fog of War requires the opponent to have a Gambit and a Tactic.',
    );
  }
  const targets = selection.choice === 'one_gambit'
    ? gambits.filter(card => card.instanceId === selection.targetInstanceId)
    : tactics;
  if (targets.length === 0) {
    throw new V070GameActionError(
      'Choose one committed opposing Gambit or all committed opposing Tactics.',
    );
  }

  // Validate every target before mutating even a single zone. Returning
  // already-applied effects without reversing them would silently corrupt
  // the battle outcome. Those interactions are intentionally not executable
  // through this primitive until effect-level cancellation is implemented.
  for (const card of targets) {
    if (card.sourceZone !== 'hand' && card.sourceZone !== 'reserve') {
      throw new V070GameActionError(
        'Cannot return a battle card whose exact source zone was not recorded.',
      );
    }
    if (state.players[opponent].zones.hand.includes(card.instanceId)
      || participant.reserve.includes(card.instanceId)) {
      throw new V070GameActionError(
        'A returned card cannot already exist in a source zone.',
      );
    }
  }

  const targetIds = new Set(targets.map(card => card.instanceId));
  if (withinFogRevealChoice) {
    // Prevent cards returned during reveal-stage interference from applying
    // effects that are still queued. Previously resolved effects stay intact.
    runtime.pendingRevealEffectCommitments =
      runtime.pendingRevealEffectCommitments?.filter(
        card => !targetIds.has(card.instanceId),
      );
    runtime.pendingRevealDeferredOrdinaryCommitments =
      runtime.pendingRevealDeferredOrdinaryCommitments?.filter(
        card => !targetIds.has(card.instanceId),
      );
    if (runtime.pendingRevealForcedInstanceId
      && targetIds.has(runtime.pendingRevealForcedInstanceId)) {
      runtime.pendingRevealForcedInstanceId = null;
    }
  }
  if (selection.choice === 'one_gambit') {
    if (participant.gambit && targetIds.has(participant.gambit.instanceId)) {
      participant.gambit = null;
    } else {
      participant.additionalGambits = participant.additionalGambits.filter(
        card => !targetIds.has(card.instanceId),
      );
    }
  } else {
    participant.tactic = null;
    participant.additionalTactics = [];
  }

  // The cards are no longer battle commitments and must not be processed
  // again by ordinary Aftermath placement or destination overrides.
  runtime.battleCardAftermathDestinationOverrides =
    runtime.battleCardAftermathDestinationOverrides.filter(
      effect => !targetIds.has(effect.instanceId),
    );
  for (const card of targets) {
    if (card.sourceZone === 'hand') {
      state.players[opponent].zones.hand.push(card.instanceId);
    } else {
      participant.reserve.push(card.instanceId);
    }
  }
  appendV070Event(state, {
    type: 'fog_of_war_battle_cards_returned',
    actor: fogOwner,
    visibility: 'public',
    payload: {
      fogInstanceId,
      opponent,
      choice: selection.choice,
      returned: targets.map((card: V070BattleCardCommitment) => ({
        instanceId: card.instanceId,
        cardId: state.cardInstances[card.instanceId]?.cardId,
        role: card.role,
        sourceZone: card.sourceZone,
      })),
    },
  });
  return targets.map(card => card.instanceId);
}

// The pending choice is owned by the card's opponent, rather than by the
// player who committed the effect. Registering it does not itself return cards.
export function queueV070FogOfWarBattleChoice(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): boolean {
  const runtime = state.battleRuntime;
  const commitment = v070BattleCommitment(state, sourceInstanceId);
  if (!state.battle || !runtime
    || (runtime.stage !== 'reveal_tactics' && runtime.stage !== 'outcome')
    || !commitment || commitment.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_FOG_OF_WAR_ID) {
    throw new V070GameActionError(
      'Only a revealed committed Fog of War battle card can open its post-Tactics choice.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Resolve the current reveal-timing choice before opening another.',
    );
  }
  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const participant = runtime.participants[opponent];
  const gambits = [
    ...(participant.gambit ? [participant.gambit] : []),
    ...participant.additionalGambits,
  ];
  const tactics = [
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ];
  if (gambits.length === 0 || tactics.length === 0) {
    appendV070Event(state, {
      type: 'fog_of_war_no_eligible_return',
      actor: owner, visibility: 'public',
      payload: { sourceInstanceId, opponent },
    });
    return false;
  }
  const choice: V070FogOfWarBattleRevealChoice = {
    kind: 'fog_of_war', owner, opponent, sourceInstanceId,
    gambitInstanceIds: gambits.map(c => c.instanceId),
    tacticInstanceIds: tactics.map(c => c.instanceId),
  };
  runtime.pendingFogOfWarBattleRevealChoice = choice;
  runtime.fogOfWarBattleRevealChoiceOpen = true;
  appendV070Event(state, {
    type: 'fog_of_war_battle_choice_pending',
    actor: owner, visibility: 'public',
    payload: {
      sourceInstanceId,
      choosingPlayer: opponent,
      gambitCount: gambits.length,
      tacticCount: tactics.length,
      choices: ['one_gambit', 'all_tactics'],
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'fog_of_war_battle_choice_options',
    actor: opponent, visibility: opponent,
    payload: {
      sourceInstanceId,
      gambitInstanceIds: [...choice.gambitInstanceIds],
      tacticInstanceIds: [...choice.tacticInstanceIds],
    },
  });
  return true;
}

export function resolveV070FogOfWarBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  selection: V070FogOfWarReturnSelection,
): string[] {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingFogOfWarBattleRevealChoice;
  if (!runtime || !pending || !runtime.fogOfWarBattleRevealChoiceOpen) {
    throw new V070GameActionError('There is no open Fog of War battle choice.');
  }
  if (playerId !== pending.opponent) {
    throw new V070GameActionError(
      'The opponent of Fog of War chooses which of their cards to return.',
    );
  }
  if (selection.choice === 'one_gambit'
    && !pending.gambitInstanceIds.includes(selection.targetInstanceId)) {
    throw new V070GameActionError('Choose a revealed opposing Gambit.');
  }

  // Performs all validations before moving anything. A rejected choice
  // leaves its pending decision and the complete battle state untouched.
  const returned = returnV070FogOfWarBattleCards(
    state, pending.owner, pending.sourceInstanceId, selection,
  );
  runtime.pendingFogOfWarBattleRevealChoice = null;
  runtime.fogOfWarBattleRevealChoiceOpen = false;
  markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
  appendV070Event(state, {
    type: 'fog_of_war_battle_choice_resolved',
    actor: playerId, visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      choice: selection.choice,
      returnedInstanceIds: returned,
    },
  });
  return returned;
}
