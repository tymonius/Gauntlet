import { v070CanonicalContent, type V070CanonicalCard } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import type { PlayerId } from './rules';
import {
  beginV070CopiedEffectApplication,
  continueV070CopiedEffectApplication,
  eligibleV070CopiedEffectInstances,
  type V070CanApplyEffectNow,
  type V070CardInstanceReference,
  type V070CopiedEffectApplication,
  type V070CopyableEffectLabel,
  type V070EffectInstanceReference,
  type V070EffectReference,
} from './copied-effects';
import {
  activeV070CopiedEffectApplication,
  withV070CopiedEffectApplication,
} from './copied-effect-runtime';
import {
  completeV070ArcaneKnowledgeBattleRevealChoice,
  queueV070ArcaneKnowledgeBattleRevealChoice,
  type V070ArcaneKnowledgeBattleRevealCandidate,
} from './battle-reveal-choices';
import { resolveV070WitchcraftBattleEffectHandler } from './witchcraft-handler-resolver';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';

export const V070_ARCANE_KNOWLEDGE_ID = 'neutral-arcane-knowledge' as const;
export const V070_ARCANE_KNOWLEDGE_BATTLE_TEXT =
  'Apply the Gambit or Tactic effect of one card in your Graveyard that can apply now.' as const;

const arcaneKnowledgeCard = v070CanonicalContent.cardsById.get(V070_ARCANE_KNOWLEDGE_ID);
const arcaneKnowledgeBattleEffect = arcaneKnowledgeCard?.effects.find(
  effect => effect.label === 'Gambit/Tactic',
);
if (arcaneKnowledgeBattleEffect?.text !== V070_ARCANE_KNOWLEDGE_BATTLE_TEXT) {
  throw new Error('Released v0.7.0 Arcane Knowledge battle text no longer matches the executable authority.');
}

const ARCANE_KNOWLEDGE_BATTLE_LABELS: readonly V070CopyableEffectLabel[] = [
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
] as const;

export interface V070ArcaneKnowledgeBattleChoice extends V070EffectInstanceReference {
  sourceZone: 'graveyard';
}

export function v070ArcaneKnowledgeBattleChoices(
  graveyard: readonly V070CardInstanceReference[],
  cardsById: ReadonlyMap<string, V070CanonicalCard>,
  canApplyNow: V070CanApplyEffectNow,
): V070ArcaneKnowledgeBattleChoice[] {
  return eligibleV070CopiedEffectInstances(
    cardsById,
    graveyard,
    ARCANE_KNOWLEDGE_BATTLE_LABELS,
    canApplyNow,
  ).map(choice => ({ ...choice, sourceZone: 'graveyard' as const }));
}

export function prepareV070ArcaneKnowledgeBattleApplication(input: {
  controller: PlayerId;
  graveyard: readonly V070CardInstanceReference[];
  cardsById: ReadonlyMap<string, V070CanonicalCard>;
  targetSourceInstanceId: string;
  targetEffectLabel: V070CopyableEffectLabel;
  canApplyNow: V070CanApplyEffectNow;
  parentApplication?: V070CopiedEffectApplication;
}): V070CopiedEffectApplication {
  const choice = v070ArcaneKnowledgeBattleChoices(
    input.graveyard,
    input.cardsById,
    input.canApplyNow,
  ).find(entry => (
    entry.sourceInstanceId === input.targetSourceInstanceId
    && entry.label === input.targetEffectLabel
  ));
  if (!choice) {
    throw new Error('Arcane Knowledge must choose an eligible Gambit or Tactic effect from your Graveyard.');
  }

  return input.parentApplication
    ? continueV070CopiedEffectApplication(
        input.parentApplication,
        choice,
        input.controller,
        true,
      )
    : beginV070CopiedEffectApplication(choice, input.controller);
}

export function registerV070ArcaneKnowledgeBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceRole: 'gambit' | 'tactic',
): void {
  assertArcaneKnowledgeSource(state, owner, sourceInstanceId);
  const parentApplication = activeV070CopiedEffectApplication(state);
  if (parentApplication && !parentApplication.chainAllowsFurtherCopiedApplication) {
    appendV070Event(state, {
      type: 'arcane_knowledge_battle_copy_chain_terminated',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ARCANE_KNOWLEDGE_ID,
        copiedChainDepth: parentApplication.chainDepth,
      },
    });
    return;
  }

  const encounteredAt = currentRevealTiming(state, sourceRole);
  const choices = liveArcaneKnowledgeChoices(
    state,
    owner,
    encounteredAt,
    parentApplication,
  );
  if (choices.length === 0) {
    appendV070Event(state, {
      type: 'arcane_knowledge_battle_no_applicable_effect',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ARCANE_KNOWLEDGE_ID,
        encounteredAt,
      },
    });
    return;
  }

  if (choices.length === 1) {
    applyArcaneKnowledgeChoice(
      state,
      owner,
      sourceInstanceId,
      choices[0]!,
      encounteredAt,
      parentApplication,
    );
    return;
  }

  queueV070ArcaneKnowledgeBattleRevealChoice(state, {
    kind: 'arcane_knowledge',
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

export function resolveV070ArcaneKnowledgeBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
  targetEffectLabel: V070CopyableEffectLabel,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingArcaneKnowledgeBattleRevealChoice;
  if (!runtime || !pending || !runtime.arcaneKnowledgeBattleRevealChoiceOpen) {
    throw new V070GameActionError('No Arcane Knowledge battle-effect choice is pending.');
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError('The Arcane Knowledge controller must choose the Graveyard effect.');
  }
  if (!pending.candidates.some(candidate =>
    candidate.sourceInstanceId === targetInstanceId
    && candidate.effectLabel === targetEffectLabel
  )) {
    throw new V070GameActionError(
      'Arcane Knowledge must choose one of its originally eligible Graveyard effects.',
    );
  }

  const choices = liveArcaneKnowledgeChoices(
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
      'The selected Arcane Knowledge Graveyard effect can no longer apply.',
    );
  }

  completeV070ArcaneKnowledgeBattleRevealChoice(state);
  applyArcaneKnowledgeChoice(
    state,
    playerId,
    pending.sourceInstanceId,
    target,
    pending.encounteredAt,
    pending.parentApplication ?? null,
  );
}

function applyArcaneKnowledgeChoice(
  state: V070GameState,
  owner: PlayerId,
  arcaneKnowledgeSourceInstanceId: string,
  target: V070ArcaneKnowledgeBattleChoice,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
  parentApplication: V070CopiedEffectApplication | null,
): void {
  const application = prepareV070ArcaneKnowledgeBattleApplication({
    controller: owner,
    graveyard: graveyardReferences(state, owner),
    cardsById: v070CanonicalContent.cardsById,
    targetSourceInstanceId: target.sourceInstanceId,
    targetEffectLabel: target.label,
    canApplyNow: effect => effectTimingCanApply(effect, encounteredAt),
    parentApplication: parentApplication ?? undefined,
  });
  const handler = resolveV070WitchcraftBattleEffectHandler(target.cardId);
  if (!handler || handler.expectedText !== target.text) {
    throw new V070GameActionError(
      'The selected Arcane Knowledge effect is not executable by the current battle engine.',
    );
  }

  const commitment: V070BattleCardCommitment = {
    instanceId: target.sourceInstanceId,
    owner,
    role: copiedCommitmentRole(target.label, encounteredAt),
    faceUp: true,
  };
  withV070CopiedEffectApplication(state, application, () => {
    handler.apply({
      state,
      owner,
      opponent: owner === 'A' ? 'B' : 'A',
      commitment,
    });
  });

  appendV070Event(state, {
    type: 'arcane_knowledge_battle_effect_applied',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: arcaneKnowledgeSourceInstanceId,
      sourceCardId: V070_ARCANE_KNOWLEDGE_ID,
      targetInstanceId: target.sourceInstanceId,
      targetCardId: target.cardId,
      targetEffectLabel: target.label,
      copiedChainDepth: application.chainDepth,
    },
  });
}

function liveArcaneKnowledgeChoices(
  state: V070GameState,
  owner: PlayerId,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
  parentApplication: V070CopiedEffectApplication | null,
): V070ArcaneKnowledgeBattleChoice[] {
  if (parentApplication && !parentApplication.chainAllowsFurtherCopiedApplication) {
    return [];
  }

  const raw = v070ArcaneKnowledgeBattleChoices(
    graveyardReferences(state, owner),
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

    let application: V070CopiedEffectApplication;
    try {
      application = parentApplication
        ? continueV070CopiedEffectApplication(parentApplication, choice, owner, true)
        : beginV070CopiedEffectApplication(choice, owner);
    } catch {
      return false;
    }
    if (choice.cardId === V070_ARCANE_KNOWLEDGE_ID
      && !application.chainAllowsFurtherCopiedApplication) {
      return false;
    }
    return simulateCopiedApplication(
      state,
      owner,
      choice,
      application,
      encounteredAt,
    );
  });
}

function simulateCopiedApplication(
  state: V070GameState,
  owner: PlayerId,
  effect: V070ArcaneKnowledgeBattleChoice,
  application: V070CopiedEffectApplication,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): boolean {
  const handler = resolveV070WitchcraftBattleEffectHandler(effect.cardId);
  if (!handler || handler.expectedText !== effect.text) return false;
  const clone = structuredClone(state) as V070GameState;
  const runtime = clone.battleRuntime;
  if (!runtime) return false;
  runtime.pendingArcaneKnowledgeBattleRevealChoice = null;
  runtime.arcaneKnowledgeBattleRevealChoiceOpen = false;
  runtime.pendingWitchcraftBattleRevealChoice = null;
  runtime.witchcraftBattleRevealChoiceOpen = false;

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
    });
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

function assertArcaneKnowledgeSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Arcane Knowledge battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_ARCANE_KNOWLEDGE_ID) {
    throw new V070GameActionError(
      'Arcane Knowledge battle source does not match the applied card instance.',
    );
  }
}

export function v070ArcaneKnowledgePendingCandidates(
  state: V070GameState,
): readonly V070ArcaneKnowledgeBattleRevealCandidate[] {
  return state.battleRuntime?.pendingArcaneKnowledgeBattleRevealChoice?.candidates ?? [];
}
