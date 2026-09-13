import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import type { PlayerId } from './rules';
import {
  V070_REND_THE_VEIL_BATTLE_TEXT,
  V070_REND_THE_VEIL_ID,
  prepareV070RendTheVeilApplication,
  v070RendTheVeilChoices,
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
  completeV070RendTheVeilBattleRevealChoice,
  queueV070RendTheVeilBattleRevealChoice,
  type V070RendTheVeilBattleRevealCandidate,
} from './battle-reveal-choices';
import { resolveV070WitchcraftBattleEffectHandler } from './witchcraft-handler-resolver';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import { registerV070DeferredBattleAftermathDestination } from './battle-aftermath-deferred';

export { V070_REND_THE_VEIL_BATTLE_TEXT, V070_REND_THE_VEIL_ID };

export function registerV070RendTheVeilBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  assertRendTheVeilSource(state, owner, sourceInstanceId);
  const runtime = state.battleRuntime!;
  if (runtime.stage !== 'reveal_tactics'
    && runtime.pendingRevealEffectEncounteredAt !== 'reveal_tactics') {
    throw new V070GameActionError(
      'Rend the Veil battle effect can resolve only after Tactics are revealed.',
    );
  }

  const parentApplication = activeV070CopiedEffectApplication(state);
  if (parentApplication && !parentApplication.chainAllowsFurtherCopiedApplication) {
    appendV070Event(state, {
      type: 'rend_the_veil_battle_copy_chain_terminated',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_REND_THE_VEIL_ID,
        copiedChainDepth: parentApplication.chainDepth,
      },
    });
    return;
  }

  const choices = liveRendTheVeilChoices(state, owner, parentApplication);
  if (choices.length === 0) {
    appendV070Event(state, {
      type: 'rend_the_veil_battle_no_applicable_effect',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_REND_THE_VEIL_ID,
      },
    });
    return;
  }

  queueV070RendTheVeilBattleRevealChoice(state, {
    kind: 'rend_the_veil',
    owner,
    sourceInstanceId,
    candidates: choices.map(choice => ({
      sourceInstanceId: choice.sourceInstanceId,
      effectLabel: choice.label,
    })),
    parentApplication: parentApplication ?? undefined,
  });
}

export function resolveV070RendTheVeilBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  use: boolean,
  targetInstanceId?: string,
  targetEffectLabel?: V070CopyableEffectLabel,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingRendTheVeilBattleRevealChoice;
  if (!runtime || !pending || !runtime.rendTheVeilBattleRevealChoiceOpen) {
    throw new V070GameActionError('No Rend the Veil battle-effect choice is pending.');
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError('The Rend the Veil controller must resolve its Graveyard choice.');
  }

  if (!use) {
    completeV070RendTheVeilBattleRevealChoice(state);
    appendV070Event(state, {
      type: 'rend_the_veil_battle_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_REND_THE_VEIL_ID,
      },
    });
    return;
  }

  if (!targetInstanceId || !targetEffectLabel) {
    throw new V070GameActionError(
      'Using Rend the Veil requires choosing a Tactic effect in your Graveyard.',
    );
  }
  if (!pending.candidates.some(candidate =>
    candidate.sourceInstanceId === targetInstanceId
    && candidate.effectLabel === targetEffectLabel
  )) {
    throw new V070GameActionError(
      'Rend the Veil must choose one of its originally eligible Graveyard Tactic effects.',
    );
  }

  const choices = liveRendTheVeilChoices(
    state,
    playerId,
    pending.parentApplication ?? null,
  );
  const target = choices.find(choice =>
    choice.sourceInstanceId === targetInstanceId
    && choice.label === targetEffectLabel
  );
  if (!target) {
    throw new V070GameActionError(
      'The selected Rend the Veil Graveyard effect can no longer apply.',
    );
  }

  const prepared = prepareV070RendTheVeilApplication({
    controller: playerId,
    sourceMode: 'battle',
    graveyard: graveyardReferences(state, playerId),
    cardsById: v070CanonicalContent.cardsById,
    targetSourceInstanceId: target.sourceInstanceId,
    targetEffectLabel: target.label,
    canApplyNow: effectCanApplyAfterTactics,
    parentApplication: pending.parentApplication,
  });
  const handler = resolveV070WitchcraftBattleEffectHandler(target.cardId);
  if (!handler || handler.expectedText !== target.text) {
    throw new V070GameActionError(
      'The selected Rend the Veil effect is not executable by the current battle engine.',
    );
  }

  completeV070RendTheVeilBattleRevealChoice(state);
  const commitment: V070BattleCardCommitment = {
    instanceId: target.sourceInstanceId,
    owner: playerId,
    role: 'tactic',
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

  if (prepared.moveTargetToDiscardPileInAftermath) {
    registerV070DeferredBattleAftermathDestination(state, {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_REND_THE_VEIL_ID,
      owner: playerId,
      targetPlayer: playerId,
      targetInstanceIds: [prepared.targetSourceInstanceId],
      destination: 'discard',
      condition: 'always',
    });
  }

  appendV070Event(state, {
    type: 'rend_the_veil_battle_effect_applied',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_REND_THE_VEIL_ID,
      targetInstanceId: target.sourceInstanceId,
      targetCardId: target.cardId,
      targetEffectLabel: target.label,
      copiedChainDepth: prepared.application.chainDepth,
    },
  });
}

export function v070RendTheVeilPendingCandidates(
  state: V070GameState,
): readonly V070RendTheVeilBattleRevealCandidate[] {
  return state.battleRuntime?.pendingRendTheVeilBattleRevealChoice?.candidates ?? [];
}

function liveRendTheVeilChoices(
  state: V070GameState,
  owner: PlayerId,
  parentApplication: V070CopiedEffectApplication | null,
): V070GraveyardCopiedEffectChoice[] {
  if (parentApplication && !parentApplication.chainAllowsFurtherCopiedApplication) {
    return [];
  }

  const graveyard = graveyardReferences(state, owner);
  const raw = v070RendTheVeilChoices(
    graveyard,
    v070CanonicalContent.cardsById,
    effectCanApplyAfterTactics,
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
      const prepared = prepareV070RendTheVeilApplication({
        controller: owner,
        sourceMode: 'battle',
        graveyard,
        cardsById: v070CanonicalContent.cardsById,
        targetSourceInstanceId: choice.sourceInstanceId,
        targetEffectLabel: choice.label,
        canApplyNow: effectCanApplyAfterTactics,
        parentApplication: parentApplication ?? undefined,
      });
      return simulateCopiedApplication(
        state,
        owner,
        choice,
        prepared.application,
      );
    } catch {
      return false;
    }
  });
}

function simulateCopiedApplication(
  state: V070GameState,
  owner: PlayerId,
  effect: V070GraveyardCopiedEffectChoice,
  application: V070CopiedEffectApplication,
): boolean {
  const handler = resolveV070WitchcraftBattleEffectHandler(effect.cardId);
  if (!handler || handler.expectedText !== effect.text) return false;
  const clone = structuredClone(state) as V070GameState;
  const runtime = clone.battleRuntime;
  if (!runtime) return false;
  runtime.pendingRendTheVeilBattleRevealChoice = null;
  runtime.rendTheVeilBattleRevealChoiceOpen = false;
  runtime.pendingHeresyBattleRevealChoice = null;
  runtime.heresyBattleRevealChoiceOpen = false;
  runtime.pendingArcaneKnowledgeBattleRevealChoice = null;
  runtime.arcaneKnowledgeBattleRevealChoiceOpen = false;
  runtime.pendingWitchcraftBattleRevealChoice = null;
  runtime.witchcraftBattleRevealChoiceOpen = false;

  const before = applicationFingerprint(clone);
  const commitment: V070BattleCardCommitment = {
    instanceId: effect.sourceInstanceId,
    owner,
    role: 'tactic',
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

function effectCanApplyAfterTactics(effect: V070EffectReference): boolean {
  if (/^(?:When|After) Gambits are revealed\b/.test(effect.text)) return false;
  if (/^When you (?:set|choose) this card\b/.test(effect.text)) return false;
  return true;
}

function graveyardReferences(
  state: V070GameState,
  owner: PlayerId,
): V070CardInstanceReference[] {
  return state.players[owner].zones.graveyard.flatMap(instanceId => {
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

function assertRendTheVeilSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError('Rend the Veil battle resolution requires an active battle.');
  }
  const source = state.cardInstances[sourceInstanceId];
  if (source?.cardId !== V070_REND_THE_VEIL_ID
    || (source.owner !== owner
      && !isV070ActiveCopiedEffectSource(
        state,
        owner,
        sourceInstanceId,
        V070_REND_THE_VEIL_ID,
      ))) {
    throw new V070GameActionError(
      'Rend the Veil battle source does not match the applied card instance.',
    );
  }
}
