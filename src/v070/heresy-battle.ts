import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import type { PlayerId } from './rules';
import {
  V070_HERESY_BATTLE_TEXT,
  V070_HERESY_ID,
  prepareV070HeresyApplication,
  v070HeresyChoices,
  type V070GraveyardCopiedEffectChoice,
} from './copied-effect-callers';
import type {
  V070CardInstanceReference,
  V070CopiedEffectApplication,
  V070CopyableEffectLabel,
  V070EffectReference,
} from './copied-effects';
import {
  activeV070CopiedEffectApplication,
  isV070ActiveCopiedEffectSource,
  withV070CopiedEffectApplication,
} from './copied-effect-runtime';
import {
  completeV070HeresyBattleRevealChoice,
  queueV070HeresyBattleRevealChoice,
  type V070HeresyBattleRevealCandidate,
} from './battle-reveal-choices';
import { resolveV070WitchcraftBattleEffectHandler } from './witchcraft-handler-resolver';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import { spendV070Conviction, v070Conviction } from './inquisition';

export { V070_HERESY_BATTLE_TEXT, V070_HERESY_ID };

export function registerV070HeresyBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceRole: 'gambit' | 'tactic',
): void {
  assertHeresySource(state, owner, sourceInstanceId);
  const parentApplication = activeV070CopiedEffectApplication(state);
  if (parentApplication && !parentApplication.chainAllowsFurtherCopiedApplication) {
    appendV070Event(state, {
      type: 'heresy_battle_copy_chain_terminated',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_HERESY_ID,
        copiedChainDepth: parentApplication.chainDepth,
      },
    });
    return;
  }

  if (state.players[owner].inquisition == null || v070Conviction(state, owner) < 4) {
    appendV070Event(state, {
      type: 'heresy_battle_unaffordable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_HERESY_ID,
        conviction: state.players[owner].inquisition?.conviction ?? 0,
      },
    });
    return;
  }

  const encounteredAt = currentRevealTiming(state, sourceRole);
  const choices = liveHeresyChoices(
    state,
    owner,
    encounteredAt,
    parentApplication,
  );
  if (choices.length === 0) {
    appendV070Event(state, {
      type: 'heresy_battle_no_applicable_effect',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_HERESY_ID,
        encounteredAt,
      },
    });
    return;
  }

  queueV070HeresyBattleRevealChoice(state, {
    kind: 'heresy',
    owner,
    sourceInstanceId,
    encounteredAt,
    candidates: choices.map(choice => ({
      sourceInstanceId: choice.sourceInstanceId,
      effectLabel: choice.label,
    })),
    parentApplication: parentApplication ?? undefined,
  });
}

export function resolveV070HeresyBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  use: boolean,
  targetInstanceId?: string,
  targetEffectLabel?: V070CopyableEffectLabel,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingHeresyBattleRevealChoice;
  if (!runtime || !pending || !runtime.heresyBattleRevealChoiceOpen) {
    throw new V070GameActionError('No Heresy battle-effect choice is pending.');
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError('The Heresy controller must choose whether to spend Conviction.');
  }

  if (!use) {
    completeV070HeresyBattleRevealChoice(state);
    appendV070Event(state, {
      type: 'heresy_battle_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_HERESY_ID,
        convictionSpent: 0,
      },
    });
    return;
  }

  if (!targetInstanceId || !targetEffectLabel) {
    throw new V070GameActionError(
      'Using Heresy requires choosing the opponent Graveyard effect to apply.',
    );
  }
  if (!pending.candidates.some(candidate =>
    candidate.sourceInstanceId === targetInstanceId
    && candidate.effectLabel === targetEffectLabel
  )) {
    throw new V070GameActionError(
      'Heresy must choose one of its originally eligible opponent Graveyard effects.',
    );
  }
  if (state.players[playerId].inquisition == null || v070Conviction(state, playerId) < 4) {
    throw new V070GameActionError('Heresy can no longer spend the required 4 Conviction.');
  }

  const choices = liveHeresyChoices(
    state,
    playerId,
    pending.encounteredAt,
    pending.parentApplication ?? null,
  );
  const target = choices.find(choice =>
    choice.sourceInstanceId === targetInstanceId
    && choice.label === targetEffectLabel
  );
  if (!target) {
    throw new V070GameActionError(
      'The selected Heresy opponent Graveyard effect can no longer apply.',
    );
  }

  const convictionBefore = v070Conviction(state, playerId);
  const prepared = prepareV070HeresyApplication({
    controller: playerId,
    conviction: convictionBefore,
    opponentGraveyard: opponentGraveyardReferences(state, playerId),
    cardsById: v070CanonicalContent.cardsById,
    targetSourceInstanceId: target.sourceInstanceId,
    targetEffectLabel: target.label,
    canApplyNow: effect => effectTimingCanApply(effect, pending.encounteredAt),
    parentApplication: pending.parentApplication,
  });
  const handler = resolveV070WitchcraftBattleEffectHandler(target.cardId);
  if (!handler || handler.expectedText !== target.text) {
    throw new V070GameActionError(
      'The selected Heresy effect is not executable by the current battle engine.',
    );
  }

  completeV070HeresyBattleRevealChoice(state);
  spendV070Conviction(state, playerId, 4, 'Heresy');
  if (v070Conviction(state, playerId) !== prepared.convictionAfter) {
    throw new V070GameActionError('Heresy Conviction payment did not produce the prepared balance.');
  }

  const commitment: V070BattleCardCommitment = {
    instanceId: target.sourceInstanceId,
    owner: playerId,
    role: copiedCommitmentRole(target.label, pending.encounteredAt),
    faceUp: true,
  };
  withV070CopiedEffectApplication(state, prepared.application, () => {
    handler.apply({
      state,
      owner: playerId,
      opponent: playerId === 'A' ? 'B' : 'A',
      commitment,
    });
  }, target.sourceInstanceId);

  appendV070Event(state, {
    type: 'heresy_battle_effect_applied',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_HERESY_ID,
      targetInstanceId: target.sourceInstanceId,
      targetCardId: target.cardId,
      targetEffectLabel: target.label,
      convictionSpent: 4,
      copiedChainDepth: prepared.application.chainDepth,
    },
  });
}

function liveHeresyChoices(
  state: V070GameState,
  owner: PlayerId,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
  parentApplication: V070CopiedEffectApplication | null,
): V070GraveyardCopiedEffectChoice[] {
  if (parentApplication && !parentApplication.chainAllowsFurtherCopiedApplication) {
    return [];
  }
  if (state.players[owner].inquisition == null || v070Conviction(state, owner) < 4) {
    return [];
  }

  const opponentGraveyard = opponentGraveyardReferences(state, owner);
  const raw = v070HeresyChoices(
    opponentGraveyard,
    v070CanonicalContent.cardsById,
    effect => effectTimingCanApply(effect, encounteredAt),
  );
  return raw.filter(choice => {
    const card = v070CanonicalContent.cardsById.get(choice.cardId);
    if (!card) return false;
    if (card.trait === 'Arcane' && v070MonasterySuppressesArcaneBattleEffects(state)) {
      return false;
    }
    const handler = resolveV070WitchcraftBattleEffectHandler(choice.cardId);
    if (!handler || handler.expectedText !== choice.text) return false;

    try {
      const prepared = prepareV070HeresyApplication({
        controller: owner,
        conviction: v070Conviction(state, owner),
        opponentGraveyard,
        cardsById: v070CanonicalContent.cardsById,
        targetSourceInstanceId: choice.sourceInstanceId,
        targetEffectLabel: choice.label,
        canApplyNow: effect => effectTimingCanApply(effect, encounteredAt),
        parentApplication: parentApplication ?? undefined,
      });
      return simulateCopiedApplicationAfterPayment(
        state,
        owner,
        choice,
        prepared.application,
        encounteredAt,
      );
    } catch {
      return false;
    }
  });
}

function simulateCopiedApplicationAfterPayment(
  state: V070GameState,
  owner: PlayerId,
  effect: V070GraveyardCopiedEffectChoice,
  application: V070CopiedEffectApplication,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): boolean {
  const handler = resolveV070WitchcraftBattleEffectHandler(effect.cardId);
  if (!handler || handler.expectedText !== effect.text) return false;
  const clone = structuredClone(state) as V070GameState;
  const runtime = clone.battleRuntime;
  if (!runtime) return false;
  runtime.pendingHeresyBattleRevealChoice = null;
  runtime.heresyBattleRevealChoiceOpen = false;
  runtime.pendingArcaneKnowledgeBattleRevealChoice = null;
  runtime.arcaneKnowledgeBattleRevealChoiceOpen = false;
  runtime.pendingWitchcraftBattleRevealChoice = null;
  runtime.witchcraftBattleRevealChoiceOpen = false;

  try {
    spendV070Conviction(clone, owner, 4, 'Heresy applicability probe');
  } catch {
    return false;
  }
  const before = applicationFingerprint(clone);
  const commitment: V070BattleCardCommitment = {
    instanceId: effect.sourceInstanceId,
    owner,
    role: copiedCommitmentRole(effect.label, encounteredAt),
    faceUp: true,
  };
  try {
    withV070CopiedEffectApplication(clone, application, () => {
      handler.apply({
        state: clone,
        owner,
        opponent: owner === 'A' ? 'B' : 'A',
        commitment,
      });
    }, effect.sourceInstanceId);
  } catch {
    return false;
  }
  return applicationFingerprint(clone) !== before;
}

function effectTimingCanApply(
  effect: V070EffectReference,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): boolean {
  if (/^When you (?:set|choose) this card\b/.test(effect.text)) return false;
  if (/^(?:When|After) Gambits are revealed\b/.test(effect.text)) {
    return encounteredAt === 'reveal_gambits';
  }
  if (/^(?:When|After) Tactics are revealed\b/.test(effect.text)) {
    return encounteredAt === 'reveal_tactics';
  }
  return true;
}

function currentRevealTiming(
  state: V070GameState,
  fallbackRole: 'gambit' | 'tactic',
): 'reveal_gambits' | 'reveal_tactics' {
  const encountered = state.battleRuntime?.pendingRevealEffectEncounteredAt;
  if (encountered === 'reveal_gambits' || encountered === 'reveal_tactics') {
    return encountered;
  }
  return fallbackRole === 'gambit' ? 'reveal_gambits' : 'reveal_tactics';
}

function copiedCommitmentRole(
  label: V070CopyableEffectLabel,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): 'gambit' | 'tactic' {
  if (label === 'Gambit') return 'gambit';
  if (label === 'Tactic') return 'tactic';
  return encounteredAt === 'reveal_gambits' ? 'gambit' : 'tactic';
}

function opponentGraveyardReferences(
  state: V070GameState,
  owner: PlayerId,
): V070CardInstanceReference[] {
  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  return state.players[opponent].zones.graveyard.flatMap(instanceId => {
    const instance = state.cardInstances[instanceId];
    return instance ? [{ instanceId, cardId: instance.cardId }] : [];
  });
}

function applicationFingerprint(state: V070GameState): string {
  return JSON.stringify({
    battle: state.battle,
    battleRuntime: state.battleRuntime,
    players: state.players,
    board: state.board,
    deferredBattleAftermathDestinationEffects: state.deferredBattleAftermathDestinationEffects,
  });
}

function assertHeresySource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError('Heresy battle resolution requires an active battle.');
  }
  const source = state.cardInstances[sourceInstanceId];
  if (source?.cardId !== V070_HERESY_ID
    || (source.owner !== owner
      && !isV070ActiveCopiedEffectSource(
        state,
        owner,
        sourceInstanceId,
        V070_HERESY_ID,
      ))) {
    throw new V070GameActionError(
      'Heresy battle source does not match the applied card instance.',
    );
  }
}

export function v070HeresyPendingCandidates(
  state: V070GameState,
): readonly V070HeresyBattleRevealCandidate[] {
  return state.battleRuntime?.pendingHeresyBattleRevealChoice?.candidates ?? [];
}
