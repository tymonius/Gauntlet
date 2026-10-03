import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import type { V070CopyableEffectLabel } from './copied-effects';
import type { PlayerId } from './rules';
import {
  completeV070ContrabandBattleRevealChoice,
  queueV070ContrabandBattleRevealChoice,
  type V070ContrabandBattleRevealCandidate,
} from './battle-reveal-choices';
import { resolveV070WitchcraftBattleEffectHandler } from './witchcraft-handler-resolver';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import { applyV070BlasphemyForBattleReveal } from './inquisition';
import { markV070BattleCardEffectApplied } from './battle-effect-status';

export const V070_CONTRABAND_ID = 'neutral-contraband' as const;
export const V070_CONTRABAND_BATTLE_TEXT =
  'Choose one eligible card in your Discard Pile whose Gambit or Tactic effect can apply now. Put this card in your Graveyard and place the chosen card face up in the same role. In the Aftermath, put the chosen card in your Graveyard unless its text says otherwise.' as const;

declare module './battle-types' {
  interface V070BattleRuntime {
    contrabandResolvedSourceInstanceIds?: string[];
    contrabandBattleTargetInstanceIds?: string[];
  }
}

function assertAuthority(): void {
  for (const content of [v070CanonicalContent, currentCanonicalContent]) {
    const effect = content.cardsById.get(V070_CONTRABAND_ID)?.effects
      .find(entry => entry.label === 'Gambit/Tactic');
    if (effect?.text !== V070_CONTRABAND_BATTLE_TEXT) {
      throw new Error(
        'Contraband battle text no longer matches the executable authority.',
      );
    }
  }
}

assertAuthority();

export function registerV070ContrabandBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Contraband battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.cardId !== V070_CONTRABAND_ID) {
    throw new V070GameActionError(
      'Contraband battle source does not match the applied card instance.',
    );
  }

  const role = physicalBattleRole(state, owner, sourceInstanceId);
  if (!role) {
    throw new V070GameActionError(
      'Contraband must physically occupy a Gambit or Tactic role to replace itself.',
    );
  }
  if (runtime.contrabandResolvedSourceInstanceIds
    ?.includes(sourceInstanceId)) {
    return;
  }

  const candidates = liveContrabandChoices(
    state,
    owner,
    sourceInstanceId,
    role,
  );
  if (candidates.length === 0) {
    runtime.contrabandResolvedSourceInstanceIds ??= [];
    runtime.contrabandResolvedSourceInstanceIds.push(sourceInstanceId);
    markV070BattleCardEffectApplied(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'contraband_battle_no_applicable_card',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_CONTRABAND_ID,
        role,
      },
    });
    return;
  }

  queueV070ContrabandBattleRevealChoice(state, {
    kind: 'contraband',
    owner,
    sourceInstanceId,
    role,
    candidates,
  });
}

export function resolveV070ContrabandBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
  targetEffectLabel: V070CopyableEffectLabel,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingContrabandBattleRevealChoice;
  if (!runtime
    || !pending
    || !runtime.contrabandBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'No Contraband battle replacement choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'The Contraband controller must choose its replacement card.',
    );
  }
  if (!pending.candidates.some(candidate =>
    candidate.sourceInstanceId === targetInstanceId
    && candidate.effectLabel === targetEffectLabel
  )) {
    throw new V070GameActionError(
      'Contraband must choose one of its originally eligible Discard Pile cards.',
    );
  }

  const live = liveContrabandChoices(
    state,
    playerId,
    pending.sourceInstanceId,
    pending.role,
  ).find(candidate =>
    candidate.sourceInstanceId === targetInstanceId
    && candidate.effectLabel === targetEffectLabel
  );
  if (!live) {
    throw new V070GameActionError(
      'The selected Contraband replacement can no longer apply.',
    );
  }

  const handler = resolveV070WitchcraftBattleEffectHandler(live.cardId);
  if (!handler || handler.expectedText !== live.text) {
    throw new V070GameActionError(
      'The selected Contraband replacement is not executable by the current battle engine.',
    );
  }

  completeV070ContrabandBattleRevealChoice(state);
  const replacement = replaceContrabandCommitment(
    state,
    playerId,
    pending.sourceInstanceId,
    targetInstanceId,
    pending.role,
  );

  runtime.contrabandResolvedSourceInstanceIds ??= [];
  if (!runtime.contrabandResolvedSourceInstanceIds
    .includes(pending.sourceInstanceId)) {
    runtime.contrabandResolvedSourceInstanceIds.push(
      pending.sourceInstanceId,
    );
  }
  runtime.contrabandBattleTargetInstanceIds ??= [];
  if (!runtime.contrabandBattleTargetInstanceIds
    .includes(targetInstanceId)) {
    runtime.contrabandBattleTargetInstanceIds.push(targetInstanceId);
  }

  markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
  applyV070BlasphemyForBattleReveal(
    state,
    playerId,
    live.cardId,
    pending.role,
  );

  appendV070Event(state, {
    type: `${pending.role}_revealed`,
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: targetInstanceId,
      cardId: live.cardId,
      faceUp: true,
      source: 'Contraband',
      replacedInstanceId: pending.sourceInstanceId,
    },
  });

  handler.apply({
    state,
    owner: playerId,
    opponent: playerId === 'A' ? 'B' : 'A',
    commitment: replacement,
  });
  markV070BattleCardEffectApplied(state, targetInstanceId);

  appendV070Event(state, {
    type: 'battle_card_effect_applied',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: targetInstanceId,
      cardId: live.cardId,
      role: pending.role,
      timing: handler.timing,
      source: 'Contraband',
    },
  });
  appendV070Event(state, {
    type: 'contraband_battle_replaced',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_CONTRABAND_ID,
      targetInstanceId,
      targetCardId: live.cardId,
      targetEffectLabel,
      role: pending.role,
    },
  });
}

export function isV070ContrabandBattleTarget(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): boolean {
  if (!state.battleRuntime?.contrabandBattleTargetInstanceIds
    ?.includes(instanceId)) {
    return false;
  }
  return physicalBattleRole(state, playerId, instanceId) !== null;
}

function liveContrabandChoices(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): V070ContrabandBattleRevealCandidate[] {
  const allowed = new Set<V070CopyableEffectLabel>([
    role === 'gambit' ? 'Gambit' : 'Tactic',
    'Gambit/Tactic',
  ]);
  const choices: V070ContrabandBattleRevealCandidate[] = [];

  for (const instanceId of state.players[owner].zones.discardPile) {
    const instance = state.cardInstances[instanceId];
    if (!instance || instance.owner !== owner) continue;
    const card = v070CanonicalContent.cardsById.get(instance.cardId);
    if (!card) continue;

    for (const effect of card.effects) {
      if (!allowed.has(effect.label as V070CopyableEffectLabel)) continue;
      const label = effect.label as V070CopyableEffectLabel;
      if (!timingCanApplyNow(effect.text, role)) continue;
      if (card.trait === 'Arcane'
        && v070MonasterySuppressesArcaneBattleEffects(state)) {
        continue;
      }

      const handler = resolveV070WitchcraftBattleEffectHandler(card.id);
      if (!handler || handler.expectedText !== effect.text) continue;
      if (!simulateContrabandTarget(
        state,
        owner,
        sourceInstanceId,
        instanceId,
        role,
        handler,
      )) {
        continue;
      }

      choices.push({
        sourceInstanceId: instanceId,
        cardId: card.id,
        effectLabel: label,
        text: effect.text,
      });
    }
  }

  return choices;
}

function timingCanApplyNow(
  text: string,
  role: 'gambit' | 'tactic',
): boolean {
  if (/^When you (?:set|choose) this card\b/.test(text)) return false;
  if (/^After Tactics are chosen\b/.test(text)) return false;
  if (/^Before Tactics normally reveal\b/.test(text)) return false;
  if (/^After battle dice are rolled\b/.test(text)) return false;
  if (/^After you roll\b/.test(text)) return false;
  if (/^(?:In the Aftermath|At the end of the Aftermath|Following the Aftermath)\b/.test(text)) {
    return false;
  }

  if (role === 'gambit') {
    if (/^(?:When|After) Tactics are revealed\b/.test(text)) return false;
  } else if (/^(?:When|After) Gambits are revealed\b/.test(text)) {
    return false;
  }

  return true;
}

function simulateContrabandTarget(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
  role: 'gambit' | 'tactic',
  handler: ReturnType<typeof resolveV070WitchcraftBattleEffectHandler>,
): boolean {
  if (!handler) return false;
  const clone = structuredClone(state) as V070GameState;
  const runtime = clone.battleRuntime;
  if (!runtime) return false;
  runtime.pendingContrabandBattleRevealChoice = null;
  runtime.contrabandBattleRevealChoiceOpen = false;

  let replacement: V070BattleCardCommitment;
  try {
    replacement = replaceContrabandCommitment(
      clone,
      owner,
      sourceInstanceId,
      targetInstanceId,
      role,
    );
  } catch {
    return false;
  }

  const before = applicationFingerprint(clone);
  try {
    handler.apply({
      state: clone,
      owner,
      opponent: owner === 'A' ? 'B' : 'A',
      commitment: replacement,
    });
  } catch {
    return false;
  }
  return applicationFingerprint(clone) !== before;
}

function replaceContrabandCommitment(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
  role: 'gambit' | 'tactic',
): V070BattleCardCommitment {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Contraband replacement requires an active battle runtime.',
    );
  }
  const target = state.cardInstances[targetInstanceId];
  if (!target || target.owner !== owner) {
    throw new V070GameActionError(
      'Contraband must choose a card owned by its controller.',
    );
  }

  const discard = state.players[owner].zones.discardPile;
  const discardIndex = discard.indexOf(targetInstanceId);
  if (discardIndex < 0) {
    throw new V070GameActionError(
      'Contraband replacement must still be in the controller Discard Pile.',
    );
  }

  const participant = runtime.participants[owner];
  const replacement: V070BattleCardCommitment = {
    instanceId: targetInstanceId,
    owner,
    role,
    faceUp: true,
  };

  let replaced = false;
  if (role === 'gambit') {
    if (participant.gambit?.instanceId === sourceInstanceId) {
      participant.gambit = replacement;
      replaced = true;
    } else {
      const index = participant.additionalGambits.findIndex(
        entry => entry.instanceId === sourceInstanceId,
      );
      if (index >= 0) {
        participant.additionalGambits[index] = replacement;
        replaced = true;
      }
    }
  } else if (participant.tactic?.instanceId === sourceInstanceId) {
    participant.tactic = replacement;
    replaced = true;
  } else {
    const index = participant.additionalTactics.findIndex(
      entry => entry.instanceId === sourceInstanceId,
    );
    if (index >= 0) {
      participant.additionalTactics[index] = replacement;
      replaced = true;
    }
  }

  if (!replaced) {
    throw new V070GameActionError(
      'Contraband is no longer occupying the role it must replace.',
    );
  }

  discard.splice(discardIndex, 1);
  if (!state.players[owner].zones.graveyard.includes(sourceInstanceId)) {
    state.players[owner].zones.graveyard.push(sourceInstanceId);
  }

  appendV070Event(state, {
    type: 'card_moved_to_graveyard',
    actor: owner,
    visibility: 'public',
    payload: {
      instanceId: sourceInstanceId,
      cardId: V070_CONTRABAND_ID,
      purpose: 'Contraband battle replacement',
    },
  });

  return replacement;
}

function physicalBattleRole(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
): 'gambit' | 'tactic' | null {
  const participant = state.battleRuntime?.participants[owner];
  if (!participant) return null;

  if (participant.gambit?.instanceId === instanceId
    || participant.additionalGambits.some(
      entry => entry.instanceId === instanceId,
    )) {
    return 'gambit';
  }
  if (participant.tactic?.instanceId === instanceId
    || participant.additionalTactics.some(
      entry => entry.instanceId === instanceId,
    )) {
    return 'tactic';
  }
  return null;
}

function applicationFingerprint(state: V070GameState): string {
  return JSON.stringify({
    battle: state.battle,
    battleRuntime: state.battleRuntime,
    players: state.players,
    board: state.board,
    overlays: state.overlays,
    deferredBattleAftermathDestinationEffects:
      state.deferredBattleAftermathDestinationEffects,
    territoryEffectSuppressions: state.territoryEffectSuppressions,
  });
}
