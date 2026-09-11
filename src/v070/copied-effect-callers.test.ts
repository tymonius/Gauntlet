import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  beginV070CopiedEffectApplication,
  v070EffectReference,
  type V070CardInstanceReference,
} from './copied-effects';
import {
  V070_HERESY_BATTLE_TEXT,
  V070_HERESY_ID,
  V070_REND_THE_VEIL_ASSET_TEXT,
  V070_REND_THE_VEIL_BATTLE_TEXT,
  V070_REND_THE_VEIL_ID,
  V070_WITCHCRAFT_ASSET_TEXT,
  V070_WITCHCRAFT_BATTLE_TEXT,
  V070_WITCHCRAFT_ID,
  completeV070RendTheVeilAftermath,
  prepareV070HeresyApplication,
  prepareV070RendTheVeilApplication,
  prepareV070WitchcraftAssetApplication,
  prepareV070WitchcraftBattleApplication,
  v070HeresyChoices,
  v070RendTheVeilChoices,
  v070WitchcraftRepeatChoices,
  type V070ControlledBattleEffect,
} from './copied-effect-callers';

const instance = (instanceId: string, cardId: string): V070CardInstanceReference => ({
  instanceId,
  cardId,
});

function effect(cardId: string, label: 'Gambit' | 'Tactic' | 'Gambit/Tactic') {
  const card = v070CanonicalContent.cardsById.get(cardId);
  const printed = card?.effects.find(entry => entry.label === label);
  if (!card || !printed) throw new Error(`Missing ${cardId} ${label} test authority.`);
  return v070EffectReference(card, printed);
}

function battleEffect(
  sourceInstanceId: string,
  cardId: string,
  label: 'Gambit' | 'Tactic' | 'Gambit/Tactic',
  overrides: Partial<V070ControlledBattleEffect> = {},
): V070ControlledBattleEffect {
  return {
    ...effect(cardId, label),
    sourceInstanceId,
    controller: 'A',
    active: true,
    createsCopiedOrRepeatedApplication: false,
    addsBattleCard: false,
    ...overrides,
  };
}

describe('released v0.7.0 copied-effect caller authority', () => {
  test('locks Heresy, Rend the Veil, and Witchcraft independently to the frozen release', () => {
    const heresy = v070CanonicalContent.cardsById.get(V070_HERESY_ID);
    expect(heresy?.effects.find(entry => entry.label === 'Gambit/Tactic')?.text).toBe(
      V070_HERESY_BATTLE_TEXT,
    );

    const rend = v070CanonicalContent.cardsById.get(V070_REND_THE_VEIL_ID);
    expect(rend?.effects.find(entry => entry.label === 'Asset')?.text).toBe(
      V070_REND_THE_VEIL_ASSET_TEXT,
    );
    expect(rend?.effects.find(entry => entry.label === 'Gambit/Tactic')?.text).toBe(
      V070_REND_THE_VEIL_BATTLE_TEXT,
    );

    const witchcraft = v070CanonicalContent.cardsById.get(V070_WITCHCRAFT_ID);
    expect(witchcraft?.effects.find(entry => entry.label === 'Asset')?.text).toBe(
      V070_WITCHCRAFT_ASSET_TEXT,
    );
    expect(witchcraft?.effects.find(entry => entry.label === 'Gambit/Tactic')?.text).toBe(
      V070_WITCHCRAFT_BATTLE_TEXT,
    );
  });
});

describe('Heresy copied-effect semantics', () => {
  test('spends 4 Conviction, uses an applicable opposing Graveyard effect, and leaves its source there', () => {
    const graveyard = [instance('opp-rally-1', 'neutral-rallying-cry')];
    const result = prepareV070HeresyApplication({
      controller: 'A',
      conviction: 4,
      opponentGraveyard: graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'opp-rally-1',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    });

    expect(result.convictionAfter).toBe(0);
    expect(result.targetRemainsInGraveyard).toBe(true);
    expect(result.application).toMatchObject({
      cardId: 'neutral-rallying-cry',
      controller: 'A',
      chainDepth: 1,
      sourceCardMovesMerelyBecauseCopied: false,
    });
    expect(graveyard).toEqual([instance('opp-rally-1', 'neutral-rallying-cry')]);
  });

  test('requires both the printed 4 Conviction cost and current applicability', () => {
    const graveyard = [instance('opp-rally-1', 'neutral-rallying-cry')];
    expect(() => prepareV070HeresyApplication({
      controller: 'A',
      conviction: 3,
      opponentGraveyard: graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'opp-rally-1',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    })).toThrow(/4 Conviction/);
    expect(v070HeresyChoices(graveyard, v070CanonicalContent.cardsById, () => false)).toEqual([]);
  });
});

describe('Rend the Veil copied-effect semantics', () => {
  test('preserves duplicate physical Graveyard copies and selects only Tactic-capable effects', () => {
    const choices = v070RendTheVeilChoices([
      instance('black-1', 'mystics-black-covenant'),
      instance('black-2', 'mystics-black-covenant'),
      instance('rally-1', 'neutral-rallying-cry'),
    ], v070CanonicalContent.cardsById, () => true);

    expect(choices.filter(choice => choice.cardId === 'mystics-black-covenant')).toHaveLength(2);
    expect(choices.map(choice => choice.sourceInstanceId)).toEqual(
      expect.arrayContaining(['black-1', 'black-2']),
    );
  });

  test('distinguishes Asset source disposal from battle-source Aftermath movement', () => {
    const graveyard = [
      instance('black-1', 'mystics-black-covenant'),
      instance('black-2', 'mystics-black-covenant'),
    ];
    const asset = prepareV070RendTheVeilApplication({
      controller: 'A',
      sourceMode: 'asset',
      graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'black-2',
      targetEffectLabel: 'Tactic',
      canApplyNow: () => true,
    });
    expect(asset.sourceAssetDestination).toBe('discard_pile');
    expect(asset.moveTargetToDiscardPileInAftermath).toBe(false);

    const battle = prepareV070RendTheVeilApplication({
      controller: 'A',
      sourceMode: 'battle',
      graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'black-2',
      targetEffectLabel: 'Tactic',
      canApplyNow: () => true,
    });
    expect(battle.sourceAssetDestination).toBeNull();
    expect(battle.moveTargetToDiscardPileInAftermath).toBe(true);

    const aftermath = completeV070RendTheVeilAftermath(
      { graveyard, discardPile: [] },
      battle.targetSourceInstanceId,
    );
    expect(aftermath.graveyard).toEqual([instance('black-1', 'mystics-black-covenant')]);
    expect(aftermath.discardPile).toEqual([instance('black-2', 'mystics-black-covenant')]);
    expect(aftermath.moved).toBe(true);
  });
});

describe('Witchcraft copied-effect semantics', () => {
  test('offers only another active applicable non-copying, non-card-adding effect controlled by its player', () => {
    const choices = v070WitchcraftRepeatChoices({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: [
        battleEffect('witch-1', V070_WITCHCRAFT_ID, 'Gambit/Tactic', {
          createsCopiedOrRepeatedApplication: true,
        }),
        battleEffect('rally-1', 'neutral-rallying-cry', 'Gambit/Tactic'),
        battleEffect('opponent', 'neutral-rallying-cry', 'Gambit/Tactic', { controller: 'B' }),
        battleEffect('inactive', 'neutral-rallying-cry', 'Gambit/Tactic', { active: false }),
        battleEffect('copy-caller', 'neutral-arcane-knowledge', 'Gambit/Tactic', {
          createsCopiedOrRepeatedApplication: true,
        }),
        battleEffect('adds-card', 'mystics-black-covenant', 'Tactic', { addsBattleCard: true }),
      ],
      canApplyNow: () => true,
    });
    expect(choices.map(choice => choice.sourceInstanceId)).toEqual(['rally-1']);
  });

  test('battle mode repeats an eligible target, otherwise gains Advantage and sends Witchcraft to Graveyard', () => {
    const noTarget = prepareV070WitchcraftBattleApplication({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: [],
      canApplyNow: () => true,
    });
    expect(noTarget).toMatchObject({
      application: null,
      fallbackAdvantage: 1,
      sourceAftermathDestination: 'graveyard',
    });

    const target = prepareV070WitchcraftBattleApplication({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: [battleEffect('rally-1', 'neutral-rallying-cry', 'Gambit/Tactic')],
      canApplyNow: () => true,
      targetSourceInstanceId: 'rally-1',
      targetEffectLabel: 'Gambit/Tactic',
    });
    expect(target.application).toMatchObject({ cardId: 'neutral-rallying-cry', chainDepth: 1 });
    expect(target.fallbackAdvantage).toBe(0);
  });

  test('Asset mode pays Hand-to-Graveyard once-per-turn cost and copied callers terminate at layer two', () => {
    const effects = [battleEffect('rally-1', 'neutral-rallying-cry', 'Gambit/Tactic')];
    const asset = prepareV070WitchcraftAssetApplication({
      controller: 'A',
      usedThisTurn: false,
      witchcraftAssetInstanceId: 'witch-asset-1',
      zones: { hand: [instance('hand-1', 'neutral-reserves')], graveyard: [] },
      sacrificeInstanceId: 'hand-1',
      battleEffects: effects,
      canApplyNow: () => true,
      targetSourceInstanceId: 'rally-1',
      targetEffectLabel: 'Gambit/Tactic',
    });
    expect(asset.hand).toEqual([]);
    expect(asset.graveyard).toEqual([instance('hand-1', 'neutral-reserves')]);
    expect(asset.usedThisTurn).toBe(true);

    const witchcraft = v070CanonicalContent.cardsById.get(V070_WITCHCRAFT_ID)!;
    const printed = witchcraft.effects.find(entry => entry.label === 'Gambit/Tactic')!;
    const parent = beginV070CopiedEffectApplication(v070EffectReference(witchcraft, printed), 'A');
    const repeated = prepareV070WitchcraftBattleApplication({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: effects,
      canApplyNow: () => true,
      targetSourceInstanceId: 'rally-1',
      targetEffectLabel: 'Gambit/Tactic',
      parentApplication: parent,
    });
    expect(repeated.application?.chainDepth).toBe(2);
    expect(repeated.application?.chainAllowsFurtherCopiedApplication).toBe(false);
  });
});
