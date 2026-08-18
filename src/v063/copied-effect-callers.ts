import type { V063CanonicalCard } from '../content/v063';
import type { PlayerId } from './rules';
import {
  beginV063CopiedEffectApplication,
  continueV063CopiedEffectApplication,
  eligibleV063CopiedEffectInstances,
  type V063CanApplyEffectNow,
  type V063CardInstanceReference,
  type V063CopiedEffectApplication,
  type V063CopyableEffectLabel,
  type V063EffectInstanceReference,
  type V063EffectReference,
} from './copied-effects';

export const V063_HERESY_ID = 'inquisition-heresy' as const;
export const V063_REND_THE_VEIL_ID = 'mystics-rend-the-veil' as const;
export const V063_WITCHCRAFT_ID = 'mystics-witchcraft' as const;

const GAMBIT_OR_TACTIC_LABELS: readonly V063CopyableEffectLabel[] = [
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
] as const;
const TACTIC_LABELS: readonly V063CopyableEffectLabel[] = ['Tactic', 'Gambit/Tactic'] as const;

function beginCallerApplication(
  target: V063EffectReference,
  controller: PlayerId,
  parentApplication?: V063CopiedEffectApplication,
): V063CopiedEffectApplication {
  return parentApplication
    ? continueV063CopiedEffectApplication(parentApplication, target, controller, true)
    : beginV063CopiedEffectApplication(target, controller);
}

export interface V063GraveyardCopiedEffectChoice extends V063EffectInstanceReference {
  sourceZone: 'graveyard';
}

function graveyardChoices(
  graveyard: readonly V063CardInstanceReference[],
  cardsById: ReadonlyMap<string, V063CanonicalCard>,
  allowedLabels: readonly V063CopyableEffectLabel[],
  canApplyNow: V063CanApplyEffectNow,
): V063GraveyardCopiedEffectChoice[] {
  return eligibleV063CopiedEffectInstances(
    cardsById,
    graveyard,
    allowedLabels,
    canApplyNow,
  ).map((choice) => ({ ...choice, sourceZone: 'graveyard' as const }));
}

function requireGraveyardChoice(
  choices: readonly V063GraveyardCopiedEffectChoice[],
  targetSourceInstanceId: string,
  targetEffectLabel: V063CopyableEffectLabel,
  callerName: string,
): V063GraveyardCopiedEffectChoice {
  const choice = choices.find((entry) => (
    entry.sourceInstanceId === targetSourceInstanceId && entry.label === targetEffectLabel
  ));
  if (!choice) {
    throw new Error(`${callerName} must choose an eligible effect from the required Graveyard.`);
  }
  return choice;
}

// ---------------------------------------------------------------------------
// Heresy
// ---------------------------------------------------------------------------

export function v063HeresyChoices(
  opponentGraveyard: readonly V063CardInstanceReference[],
  cardsById: ReadonlyMap<string, V063CanonicalCard>,
  canApplyNow: V063CanApplyEffectNow,
): V063GraveyardCopiedEffectChoice[] {
  return graveyardChoices(opponentGraveyard, cardsById, GAMBIT_OR_TACTIC_LABELS, canApplyNow);
}

export interface V063HeresyApplicationResult {
  convictionAfter: number;
  targetSourceInstanceId: string;
  targetRemainsInGraveyard: true;
  application: V063CopiedEffectApplication;
}

export function prepareV063HeresyApplication(input: {
  controller: PlayerId;
  conviction: number;
  opponentGraveyard: readonly V063CardInstanceReference[];
  cardsById: ReadonlyMap<string, V063CanonicalCard>;
  targetSourceInstanceId: string;
  targetEffectLabel: V063CopyableEffectLabel;
  canApplyNow: V063CanApplyEffectNow;
  parentApplication?: V063CopiedEffectApplication;
}): V063HeresyApplicationResult {
  if (!Number.isInteger(input.conviction) || input.conviction < 4) {
    throw new Error('Heresy requires spending 4 Conviction.');
  }
  const choice = requireGraveyardChoice(
    v063HeresyChoices(input.opponentGraveyard, input.cardsById, input.canApplyNow),
    input.targetSourceInstanceId,
    input.targetEffectLabel,
    'Heresy',
  );
  return {
    convictionAfter: input.conviction - 4,
    targetSourceInstanceId: choice.sourceInstanceId,
    targetRemainsInGraveyard: true,
    application: beginCallerApplication(choice, input.controller, input.parentApplication),
  };
}

// ---------------------------------------------------------------------------
// Rend the Veil
// ---------------------------------------------------------------------------

export function v063RendTheVeilChoices(
  graveyard: readonly V063CardInstanceReference[],
  cardsById: ReadonlyMap<string, V063CanonicalCard>,
  canApplyNow: V063CanApplyEffectNow,
): V063GraveyardCopiedEffectChoice[] {
  return graveyardChoices(graveyard, cardsById, TACTIC_LABELS, canApplyNow);
}

export type V063RendTheVeilSourceMode = 'asset' | 'battle';

export interface V063RendTheVeilApplicationResult {
  targetSourceInstanceId: string;
  application: V063CopiedEffectApplication;
  sourceAssetDestination: 'discard_pile' | null;
  moveTargetToDiscardPileInAftermath: boolean;
}

export function prepareV063RendTheVeilApplication(input: {
  controller: PlayerId;
  sourceMode: V063RendTheVeilSourceMode;
  graveyard: readonly V063CardInstanceReference[];
  cardsById: ReadonlyMap<string, V063CanonicalCard>;
  targetSourceInstanceId: string;
  targetEffectLabel: V063CopyableEffectLabel;
  canApplyNow: V063CanApplyEffectNow;
  parentApplication?: V063CopiedEffectApplication;
}): V063RendTheVeilApplicationResult {
  const choice = requireGraveyardChoice(
    v063RendTheVeilChoices(input.graveyard, input.cardsById, input.canApplyNow),
    input.targetSourceInstanceId,
    input.targetEffectLabel,
    'Rend the Veil',
  );
  return {
    targetSourceInstanceId: choice.sourceInstanceId,
    application: beginCallerApplication(choice, input.controller, input.parentApplication),
    sourceAssetDestination: input.sourceMode === 'asset' ? 'discard_pile' : null,
    moveTargetToDiscardPileInAftermath: input.sourceMode === 'battle',
  };
}

export interface V063InstanceZones {
  graveyard: V063CardInstanceReference[];
  discardPile: V063CardInstanceReference[];
}

export interface V063RendTheVeilAftermathResult extends V063InstanceZones {
  moved: boolean;
}

/**
 * Rend's Gambit/Tactic instruction moves the exact selected physical card in
 * the Aftermath. If another instruction already moved it, complete as much as
 * possible and leave the zones unchanged.
 */
export function completeV063RendTheVeilAftermath(
  zones: V063InstanceZones,
  targetSourceInstanceId: string,
): V063RendTheVeilAftermathResult {
  const index = zones.graveyard.findIndex((card) => card.instanceId === targetSourceInstanceId);
  if (index < 0) {
    return {
      graveyard: [...zones.graveyard],
      discardPile: [...zones.discardPile],
      moved: false,
    };
  }
  const target = zones.graveyard[index];
  return {
    graveyard: zones.graveyard.filter((_, cardIndex) => cardIndex !== index),
    discardPile: [...zones.discardPile, target],
    moved: true,
  };
}

// ---------------------------------------------------------------------------
// Witchcraft
// ---------------------------------------------------------------------------

export interface V063ControlledBattleEffect extends V063EffectReference {
  sourceInstanceId: string;
  controller: PlayerId;
  active: boolean;
  createsCopiedOrRepeatedApplication: boolean;
  addsBattleCard: boolean;
}

export function v063WitchcraftRepeatChoices(input: {
  controller: PlayerId;
  witchcraftSourceInstanceId: string;
  battleEffects: readonly V063ControlledBattleEffect[];
  canApplyNow: V063CanApplyEffectNow;
}): V063ControlledBattleEffect[] {
  return input.battleEffects.filter((effect) => (
    effect.active
    && effect.controller === input.controller
    && effect.sourceInstanceId !== input.witchcraftSourceInstanceId
    && GAMBIT_OR_TACTIC_LABELS.includes(effect.label)
    && !effect.createsCopiedOrRepeatedApplication
    && !effect.addsBattleCard
    && input.canApplyNow(effect)
  ));
}

function requireWitchcraftTarget(
  choices: readonly V063ControlledBattleEffect[],
  targetSourceInstanceId: string,
  targetEffectLabel: V063CopyableEffectLabel,
): V063ControlledBattleEffect {
  const target = choices.find((choice) => (
    choice.sourceInstanceId === targetSourceInstanceId && choice.label === targetEffectLabel
  ));
  if (!target) throw new Error('Witchcraft must repeat an eligible other Gambit or Tactic effect you control.');
  return target;
}

export interface V063WitchcraftBattleResult {
  application: V063CopiedEffectApplication | null;
  fallbackAdvantage: 0 | 1;
  sourceAftermathDestination: 'graveyard';
}

export function prepareV063WitchcraftBattleApplication(input: {
  controller: PlayerId;
  witchcraftSourceInstanceId: string;
  battleEffects: readonly V063ControlledBattleEffect[];
  canApplyNow: V063CanApplyEffectNow;
  targetSourceInstanceId?: string;
  targetEffectLabel?: V063CopyableEffectLabel;
  parentApplication?: V063CopiedEffectApplication;
}): V063WitchcraftBattleResult {
  const choices = v063WitchcraftRepeatChoices(input);
  if (choices.length === 0) {
    return {
      application: null,
      fallbackAdvantage: 1,
      sourceAftermathDestination: 'graveyard',
    };
  }
  if (!input.targetSourceInstanceId || !input.targetEffectLabel) {
    throw new Error('Witchcraft must choose an eligible effect when at least one can apply.');
  }
  const target = requireWitchcraftTarget(
    choices,
    input.targetSourceInstanceId,
    input.targetEffectLabel,
  );
  return {
    application: beginCallerApplication(target, input.controller, input.parentApplication),
    fallbackAdvantage: 0,
    sourceAftermathDestination: 'graveyard',
  };
}

export interface V063WitchcraftAssetZones {
  hand: V063CardInstanceReference[];
  graveyard: V063CardInstanceReference[];
}

export interface V063WitchcraftAssetResult extends V063WitchcraftAssetZones {
  application: V063CopiedEffectApplication;
  usedThisTurn: true;
}

export function prepareV063WitchcraftAssetApplication(input: {
  controller: PlayerId;
  usedThisTurn: boolean;
  witchcraftAssetInstanceId: string;
  zones: V063WitchcraftAssetZones;
  sacrificeInstanceId: string;
  battleEffects: readonly V063ControlledBattleEffect[];
  canApplyNow: V063CanApplyEffectNow;
  targetSourceInstanceId: string;
  targetEffectLabel: V063CopyableEffectLabel;
  parentApplication?: V063CopiedEffectApplication;
}): V063WitchcraftAssetResult {
  if (input.usedThisTurn) throw new Error('Witchcraft Asset may be used only once per turn.');
  const sacrificeIndex = input.zones.hand.findIndex((card) => card.instanceId === input.sacrificeInstanceId);
  if (sacrificeIndex < 0) throw new Error('Witchcraft Asset must put one card from Hand in the Graveyard.');
  const choices = v063WitchcraftRepeatChoices({
    controller: input.controller,
    witchcraftSourceInstanceId: input.witchcraftAssetInstanceId,
    battleEffects: input.battleEffects,
    canApplyNow: input.canApplyNow,
  });
  const target = requireWitchcraftTarget(
    choices,
    input.targetSourceInstanceId,
    input.targetEffectLabel,
  );
  const sacrifice = input.zones.hand[sacrificeIndex];
  return {
    hand: input.zones.hand.filter((_, index) => index !== sacrificeIndex),
    graveyard: [...input.zones.graveyard, sacrifice],
    application: beginCallerApplication(target, input.controller, input.parentApplication),
    usedThisTurn: true,
  };
}
