import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import type { PlayerId } from './rules';
import {
  V070_HERESY_ID,
  V070_REND_THE_VEIL_ID,
  V070_WITCHCRAFT_BATTLE_TEXT,
  V070_WITCHCRAFT_ID,
  prepareV070WitchcraftBattleApplication,
  v070WitchcraftRepeatChoices,
  type V070ControlledBattleEffect,
} from './copied-effect-callers';
import { isV070BattleCardEffectNegated } from './battle-effect-status';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import { registerV070DeferredBattleAftermathDestination } from './battle-aftermath-deferred';
import {
  completeV070WitchcraftBattleRevealChoice,
  queueV070WitchcraftBattleRevealChoice,
} from './battle-reveal-choices';
import {
  resolveV070WitchcraftBattleEffectHandler,
} from './witchcraft-handler-resolver';
import type {
  V070CopyableEffectLabel,
  V070EffectReference,
} from './copied-effects';

export { V070_WITCHCRAFT_BATTLE_TEXT, V070_WITCHCRAFT_ID };

const COPIED_APPLICATION_CALLERS = new Set<string>([
  V070_HERESY_ID,
  V070_REND_THE_VEIL_ID,
  V070_WITCHCRAFT_ID,
]);

export function registerV070WitchcraftBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  assertWitchcraftSource(state, owner, sourceInstanceId);
  const runtime = state.battleRuntime!;
  if (runtime.stage !== 'reveal_tactics'
    && runtime.pendingRevealEffectEncounteredAt !== 'reveal_tactics') {
    throw new V070GameActionError(
      'Witchcraft battle effect can resolve only after Tactics are revealed.',
    );
  }

  registerV070DeferredBattleAftermathDestination(state, {
    sourceInstanceId,
    sourceCardId: V070_WITCHCRAFT_ID,
    owner,
    targetPlayer: owner,
    targetInstanceIds: [sourceInstanceId],
    destination: 'graveyard',
    condition: 'always',
  });

  const eligible = witchcraftChoices(state, owner, sourceInstanceId);
  if (eligible.length === 0) {
    runtime.participants[owner].advantage += 1;
    appendV070Event(state, {
      type: 'witchcraft_battle_fallback_advantage',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_WITCHCRAFT_ID,
        advantageGained: 1,
      },
    });
    return;
  }

  queueV070WitchcraftBattleRevealChoice(state, {
    kind: 'witchcraft',
    owner,
    sourceInstanceId,
    candidateInstanceIds: eligible.map(choice => choice.sourceInstanceId),
  });
}

export function resolveV070WitchcraftBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = state.battleRuntime?.pendingWitchcraftBattleRevealChoice;
  if (!pending || !state.battleRuntime?.witchcraftBattleRevealChoiceOpen) {
    throw new V070GameActionError('No Witchcraft battle-effect choice is pending.');
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError('The Witchcraft controller must choose the repeated effect.');
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)) {
    throw new V070GameActionError('Witchcraft must choose one of its originally eligible battle effects.');
  }

  const eligible = witchcraftChoices(state, playerId, pending.sourceInstanceId);
  const target = eligible.find(choice => choice.sourceInstanceId === targetInstanceId);
  if (!target) {
    throw new V070GameActionError('The selected Witchcraft effect can no longer apply.');
  }

  const application = prepareV070WitchcraftBattleApplication({
    controller: playerId,
    witchcraftSourceInstanceId: pending.sourceInstanceId,
    battleEffects: eligible,
    canApplyNow: effectCanApplyAfterTactics,
    targetSourceInstanceId: target.sourceInstanceId,
    targetEffectLabel: target.label,
  });
  if (!application.application) {
    throw new V070GameActionError('Witchcraft unexpectedly lost its eligible repeated effect.');
  }

  const commitment = controlledBattleCommitments(state, playerId).find(
    candidate => candidate.instanceId === target.sourceInstanceId,
  );
  if (!commitment) {
    throw new V070GameActionError('The selected Witchcraft source is no longer in this battle.');
  }
  const handler = resolveV070WitchcraftBattleEffectHandler(target.cardId);
  if (!handler || handler.expectedText !== target.text) {
    throw new V070GameActionError('The selected Witchcraft effect is not executable by the current battle engine.');
  }

  completeV070WitchcraftBattleRevealChoice(state);
  handler.apply({
    state,
    owner: playerId,
    opponent: playerId === 'A' ? 'B' : 'A',
    commitment,
  });

  appendV070Event(state, {
    type: 'witchcraft_battle_effect_repeated',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_WITCHCRAFT_ID,
      targetInstanceId: target.sourceInstanceId,
      targetCardId: target.cardId,
      targetEffectLabel: target.label,
      copiedChainDepth: application.application.chainDepth,
    },
  });
}

export function v070WitchcraftBattleChoices(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): readonly V070ControlledBattleEffect[] {
  return witchcraftChoices(state, owner, sourceInstanceId);
}

function witchcraftChoices(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): V070ControlledBattleEffect[] {
  const effects = controlledBattleCommitments(state, owner).flatMap(commitment => {
    const described = describeCommitmentEffect(state, commitment);
    if (!described) return [];
    const simulation = simulateApplication(state, commitment, described.effect);
    return [{
      ...described.effect,
      sourceInstanceId: commitment.instanceId,
      controller: owner,
      active: effectCanApplyAfterTactics(described.effect) && simulation.canApply,
      createsCopiedOrRepeatedApplication: COPIED_APPLICATION_CALLERS.has(described.effect.cardId),
      addsBattleCard: simulation.addsBattleCard,
    } satisfies V070ControlledBattleEffect];
  });

  return v070WitchcraftRepeatChoices({
    controller: owner,
    witchcraftSourceInstanceId: sourceInstanceId,
    battleEffects: effects,
    canApplyNow: effectCanApplyAfterTactics,
  });
}

function effectCanApplyAfterTactics(effect: V070EffectReference): boolean {
  // Repeating an effect does not recreate a trigger that has already passed.
  // These printed timings occur during Gambit reveal / Tactic selection, so
  // they cannot newly apply in Witchcraft's post-Tactics window.
  if (/^When Gambits are revealed\b/.test(effect.text)) return false;
  if (/^After Gambits are revealed\b/.test(effect.text)) return false;
  if (/^When you (?:set|choose) this card\b/.test(effect.text)) return false;
  return true;
}

function describeCommitmentEffect(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): { effect: V070EffectReference } | null {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card) return null;
  if (isV070BattleCardEffectNegated(state, commitment.instanceId)) return null;
  if (card.trait === 'Arcane' && v070MonasterySuppressesArcaneBattleEffects(state)) return null;

  const effect = card.effects.find(candidate =>
    candidate.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
    || candidate.label === 'Gambit/Tactic'
  );
  if (!effect) return null;
  if (effect.label !== 'Gambit'
    && effect.label !== 'Tactic'
    && effect.label !== 'Gambit/Tactic') return null;
  if (/^In the Aftermath\b/.test(effect.text)) return null;

  return {
    effect: {
      cardId: card.id,
      cardName: card.name,
      label: effect.label as V070CopyableEffectLabel,
      text: effect.text,
    },
  };
}

function simulateApplication(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  effect: V070EffectReference,
): { canApply: boolean; addsBattleCard: boolean } {
  const handler = resolveV070WitchcraftBattleEffectHandler(effect.cardId);
  if (!handler || handler.expectedText !== effect.text) {
    return { canApply: false, addsBattleCard: false };
  }

  const clone = structuredClone(state) as V070GameState;
  // Revalidation happens while Witchcraft's own chooser is open. The repeated
  // effect replaces that chooser after selection, so simulate the state it
  // will actually see rather than falsely rejecting handlers that open their
  // own reveal-timing choice.
  if (clone.battleRuntime?.pendingWitchcraftBattleRevealChoice) {
    clone.battleRuntime.pendingWitchcraftBattleRevealChoice = null;
    clone.battleRuntime.witchcraftBattleRevealChoiceOpen = false;
  }

  const before = applicationFingerprint(clone);
  const beforeBattleCards = battleCardInstanceIds(clone);
  try {
    handler.apply({
      state: clone,
      owner: commitment.owner,
      opponent: commitment.owner === 'A' ? 'B' : 'A',
      commitment: structuredClone(commitment),
    });
  } catch {
    return { canApply: false, addsBattleCard: false };
  }
  const afterBattleCards = battleCardInstanceIds(clone);
  return {
    canApply: applicationFingerprint(clone) !== before,
    addsBattleCard: afterBattleCards.some(id => !beforeBattleCards.includes(id)),
  };
}

function applicationFingerprint(state: V070GameState): string {
  return JSON.stringify({
    battleRuntime: state.battleRuntime,
    players: state.players,
    board: state.board,
    events: state.events,
    deferredBattleAftermathDestinationEffects: state.deferredBattleAftermathDestinationEffects,
  });
}

function battleCardInstanceIds(state: V070GameState): string[] {
  return (['A', 'B'] as const).flatMap(playerId =>
    controlledBattleCommitments(state, playerId).map(commitment => commitment.instanceId)
  );
}

function controlledBattleCommitments(
  state: V070GameState,
  playerId: PlayerId,
): V070BattleCardCommitment[] {
  const participant = state.battleRuntime?.participants[playerId];
  if (!participant) return [];
  return [
    ...(participant.gambit ? [participant.gambit] : []),
    ...participant.additionalGambits,
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ];
}

function assertWitchcraftSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError('Witchcraft battle resolution requires an active battle.');
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_WITCHCRAFT_ID) {
    throw new V070GameActionError('Witchcraft battle source does not match the revealed card instance.');
  }
}
