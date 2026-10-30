import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type { V070BattleCardCommitment } from './battle-types';
import {
  hasV070BattleCardEffectApplied,
  v070BattleCommitment,
} from './battle-effect-status';
import { V070_FOG_OF_WAR_ID } from './fog-of-war';

export type V070FogOfWarReturnSelection =
  | { choice: 'one_gambit'; targetInstanceId: string }
  | { choice: 'all_tactics' };

/**
 * Physical, source-aware card return primitive for Fog of War. This function
 * intentionally accepts *unapplied* effects only. The printed after-Tactics
 * effect cannot be enabled until already-applied Gambit/Tactic effects can
 * be undone safely (including copied effects and deferred registrations).
 *
 * This is not an implementation of the Fog of War printed battle choice.
 */
export function returnV070UnappliedFogOfWarBattleCards(
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
  // Do not remove a card from the battle while an earlier reveal-effect
  // sequence still holds a queued commitment that would apply afterward.
  if (runtime.pendingRevealEffectEncounteredAt) {
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
    if (hasV070BattleCardEffectApplied(state, card.instanceId)
      || state.events.some(event =>
        event.type === 'battle_card_effect_applied'
        && (event.payload as { instanceId?: string } | undefined)
          ?.instanceId === card.instanceId)) {
      throw new V070GameActionError(
        'Cannot return a battle card with an applied effect until its effects can be reversed.',
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
