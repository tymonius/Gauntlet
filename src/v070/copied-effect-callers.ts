import { v070CanonicalContent, type V070CanonicalCard } from '../content/v070';
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

export const V070_HERESY_ID = 'inquisition-heresy' as const;
export const V070_REND_THE_VEIL_ID = 'mystics-rend-the-veil' as const;
export const V070_WITCHCRAFT_ID = 'mystics-witchcraft' as const;

export const V070_HERESY_BATTLE_TEXT =
  "You may spend 4 Conviction to apply the Gambit or Tactic effect of one card in the opponent's Graveyard that can apply now." as const;
export const V070_REND_THE_VEIL_ASSET_TEXT =
  'After Tactics are revealed, you may discard this card to apply the Tactic effect of one card in your Graveyard that can apply now.' as const;
export const V070_REND_THE_VEIL_BATTLE_TEXT =
  'After Tactics are revealed, you may apply the Tactic effect of one card in your Graveyard that can apply now. In the Aftermath, move that card from your Graveyard to your Discard Pile.' as const;
export const V070_WITCHCRAFT_ASSET_TEXT =
  'Once per turn, after Tactics are revealed, you may put 1 card from your Hand in your Graveyard to repeat one other Gambit or Tactic effect you control in this battle that can apply now.' as const;
export const V070_WITCHCRAFT_BATTLE_TEXT =
  'After Tactics are revealed, repeat one other Gambit or Tactic effect you control in this battle that can apply now. If none can apply, gain Advantage. In the Aftermath, put this card in your Graveyard.' as const;

function assertReleasedEffect(cardId: string, label: string, expectedText: string): void {
  const effect = v070CanonicalContent.cardsById.get(cardId)?.effects.find(entry => entry.label === label);
  if (effect?.text !== expectedText) {
    throw new Error(`Released v0.7.0 ${cardId} ${label} text no longer matches the executable authority.`);
  }
}

assertReleasedEffect(V070_HERESY_ID, 'Gambit/Tactic', V070_HERESY_BATTLE_TEXT);
assertReleasedEffect(V070_REND_THE_VEIL_ID, 'Asset', V070_REND_THE_VEIL_ASSET_TEXT);
assertReleasedEffect(V070_REND_THE_VEIL_ID, 'Gambit/Tactic', V070_REND_THE_VEIL_BATTLE_TEXT);
assertReleasedEffect(V070_WITCHCRAFT_ID, 'Asset', V070_WITCHCRAFT_ASSET_TEXT);
assertReleasedEffect(V070_WITCHCRAFT_ID, 'Gambit/Tactic', V070_WITCHCRAFT_BATTLE_TEXT);

const GAMBIT_OR_TACTIC_LABELS: readonly V070CopyableEffectLabel[] = [
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
] as const;
const TACTIC_LABELS: readonly V070CopyableEffectLabel[] = ['Tactic', 'Gambit/Tactic'] as const;

function beginCallerApplication(
  target: V070EffectReference,
  controller: PlayerId,
  parentApplication?: V070CopiedEffectApplication,
): V070CopiedEffectApplication {
  return parentApplication
    ? continueV070CopiedEffectApplication(parentApplication, target, controller, true)
    : beginV070CopiedEffectApplication(target, controller);
}

export interface V070GraveyardCopiedEffectChoice extends V070EffectInstanceReference {
  sourceZone: 'graveyard';
}

function graveyardChoices(
  graveyard: readonly V070CardInstanceReference[],
  cardsById: ReadonlyMap<string, V070CanonicalCard>,
  allowedLabels: readonly V070CopyableEffectLabel[],
  canApplyNow: V070CanApplyEffectNow,
): V070GraveyardCopiedEffectChoice[] {
  return eligibleV070CopiedEffectInstances(
    cardsById,
    graveyard,
    allowedLabels,
    canApplyNow,
  ).map(choice => ({ ...choice, sourceZone: 'graveyard' as const }));
}

function requireGraveyardChoice(
  choices: readonly V070GraveyardCopiedEffectChoice[],
  targetSourceInstanceId: string,
  targetEffectLabel: V070CopyableEffectLabel,
  callerName: string,
): V070GraveyardCopiedEffectChoice {
  const choice = choices.find(entry => (
    entry.sourceInstanceId === targetSourceInstanceId
    && entry.label === targetEffectLabel
  ));
  if (!choice) {
    throw new Error(`${callerName} must choose an eligible effect from the required Graveyard.`);
  }
  return choice;
}

// ---------------------------------------------------------------------------
// Heresy
// ---------------------------------------------------------------------------

export function v070HeresyChoices(
  opponentGraveyard: readonly V070CardInstanceReference[],
  cardsById: ReadonlyMap<string, V070CanonicalCard>,
  canApplyNow: V070CanApplyEffectNow,
): V070GraveyardCopiedEffectChoice[] {
  return graveyardChoices(
    opponentGraveyard,
    cardsById,
    GAMBIT_OR_TACTIC_LABELS,
    canApplyNow,
  );
}

export interface V070HeresyApplicationResult {
  convictionAfter: number;
  targetSourceInstanceId: string;
  targetRemainsInGraveyard: true;
  application: V070CopiedEffectApplication;
}

export function prepareV070HeresyApplication(input: {
  controller: PlayerId;
  conviction: number;
  opponentGraveyard: readonly V070CardInstanceReference[];
  cardsById: ReadonlyMap<string, V070CanonicalCard>;
  targetSourceInstanceId: string;
  targetEffectLabel: V070CopyableEffectLabel;
  canApplyNow: V070CanApplyEffectNow;
  parentApplication?: V070CopiedEffectApplication;
}): V070HeresyApplicationResult {
  if (!Number.isInteger(input.conviction) || input.conviction < 4) {
    throw new Error('Heresy requires spending 4 Conviction.');
  }
  const choice = requireGraveyardChoice(
    v070HeresyChoices(input.opponentGraveyard, input.cardsById, input.canApplyNow),
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

export function v070RendTheVeilChoices(
  graveyard: readonly V070CardInstanceReference[],
  cardsById: ReadonlyMap<string, V070CanonicalCard>,
  canApplyNow: V070CanApplyEffectNow,
): V070GraveyardCopiedEffectChoice[] {
  return graveyardChoices(graveyard, cardsById, TACTIC_LABELS, canApplyNow);
}

export type V070RendTheVeilSourceMode = 'asset' | 'battle';

export interface V070RendTheVeilApplicationResult {
  targetSourceInstanceId: string;
  application: V070CopiedEffectApplication;
  sourceAssetDestination: 'discard_pile' | null;
  moveTargetToDiscardPileInAftermath: boolean;
}

export function prepareV070RendTheVeilApplication(input: {
  controller: PlayerId;
  sourceMode: V070RendTheVeilSourceMode;
  graveyard: readonly V070CardInstanceReference[];
  cardsById: ReadonlyMap<string, V070CanonicalCard>;
  targetSourceInstanceId: string;
  targetEffectLabel: V070CopyableEffectLabel;
  canApplyNow: V070CanApplyEffectNow;
  parentApplication?: V070CopiedEffectApplication;
}): V070RendTheVeilApplicationResult {
  const choice = requireGraveyardChoice(
    v070RendTheVeilChoices(input.graveyard, input.cardsById, input.canApplyNow),
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

export interface V070InstanceZones {
  graveyard: V070CardInstanceReference[];
  discardPile: V070CardInstanceReference[];
}

export interface V070RendTheVeilAftermathResult extends V070InstanceZones {
  moved: boolean;
}

export function completeV070RendTheVeilAftermath(
  zones: V070InstanceZones,
  targetSourceInstanceId: string,
): V070RendTheVeilAftermathResult {
  const index = zones.graveyard.findIndex(card => card.instanceId === targetSourceInstanceId);
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

export interface V070ControlledBattleEffect extends V070EffectReference {
  sourceInstanceId: string;
  controller: PlayerId;
  active: boolean;
  createsCopiedOrRepeatedApplication: boolean;
  addsBattleCard: boolean;
}

export function v070WitchcraftRepeatChoices(input: {
  controller: PlayerId;
  witchcraftSourceInstanceId: string;
  battleEffects: readonly V070ControlledBattleEffect[];
  canApplyNow: V070CanApplyEffectNow;
}): V070ControlledBattleEffect[] {
  return input.battleEffects.filter(effect => (
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
  choices: readonly V070ControlledBattleEffect[],
  targetSourceInstanceId: string,
  targetEffectLabel: V070CopyableEffectLabel,
): V070ControlledBattleEffect {
  const target = choices.find(choice => (
    choice.sourceInstanceId === targetSourceInstanceId
    && choice.label === targetEffectLabel
  ));
  if (!target) {
    throw new Error('Witchcraft must repeat an eligible other Gambit or Tactic effect you control.');
  }
  return target;
}

export interface V070WitchcraftBattleResult {
  application: V070CopiedEffectApplication | null;
  fallbackAdvantage: 0 | 1;
  sourceAftermathDestination: 'graveyard';
}

export function prepareV070WitchcraftBattleApplication(input: {
  controller: PlayerId;
  witchcraftSourceInstanceId: string;
  battleEffects: readonly V070ControlledBattleEffect[];
  canApplyNow: V070CanApplyEffectNow;
  targetSourceInstanceId?: string;
  targetEffectLabel?: V070CopyableEffectLabel;
  parentApplication?: V070CopiedEffectApplication;
}): V070WitchcraftBattleResult {
  const choices = v070WitchcraftRepeatChoices(input);
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

export interface V070WitchcraftAssetZones {
  hand: V070CardInstanceReference[];
  graveyard: V070CardInstanceReference[];
}

export interface V070WitchcraftAssetResult extends V070WitchcraftAssetZones {
  application: V070CopiedEffectApplication;
  usedThisTurn: true;
}

export function prepareV070WitchcraftAssetApplication(input: {
  controller: PlayerId;
  usedThisTurn: boolean;
  witchcraftAssetInstanceId: string;
  zones: V070WitchcraftAssetZones;
  sacrificeInstanceId: string;
  battleEffects: readonly V070ControlledBattleEffect[];
  canApplyNow: V070CanApplyEffectNow;
  targetSourceInstanceId: string;
  targetEffectLabel: V070CopyableEffectLabel;
  parentApplication?: V070CopiedEffectApplication;
}): V070WitchcraftAssetResult {
  if (input.usedThisTurn) throw new Error('Witchcraft Asset may be used only once per turn.');
  const sacrificeIndex = input.zones.hand.findIndex(card => card.instanceId === input.sacrificeInstanceId);
  if (sacrificeIndex < 0) {
    throw new Error('Witchcraft Asset must put one card from Hand in the Graveyard.');
  }
  const choices = v070WitchcraftRepeatChoices({
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
