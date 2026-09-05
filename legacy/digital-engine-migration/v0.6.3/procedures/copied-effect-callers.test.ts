import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import {
  beginV063CopiedEffectApplication,
  v063EffectReference,
  type V063CardInstanceReference,
} from './copied-effects';
import {
  V063_HERESY_ID,
  V063_REND_THE_VEIL_ID,
  V063_WITCHCRAFT_ID,
  completeV063RendTheVeilAftermath,
  prepareV063HeresyApplication,
  prepareV063RendTheVeilApplication,
  prepareV063WitchcraftAssetApplication,
  prepareV063WitchcraftBattleApplication,
  v063HeresyChoices,
  v063RendTheVeilChoices,
  v063WitchcraftRepeatChoices,
  type V063ControlledBattleEffect,
} from './copied-effect-callers';

const instance = (instanceId: string, cardId: string): V063CardInstanceReference => ({
  instanceId,
  cardId,
});

function effect(cardId: string, label: 'Gambit' | 'Tactic' | 'Gambit/Tactic') {
  const card = v063CanonicalContent.cardsById.get(cardId);
  const printed = card?.effects.find((entry) => entry.label === label);
  if (!card || !printed) throw new Error(`Missing ${cardId} ${label} test authority.`);
  return v063EffectReference(card, printed);
}

function battleEffect(
  sourceInstanceId: string,
  cardId: string,
  label: 'Gambit' | 'Tactic' | 'Gambit/Tactic',
  overrides: Partial<V063ControlledBattleEffect> = {},
): V063ControlledBattleEffect {
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

describe('published copied-effect caller authority', () => {
  test('locks Heresy, Rend the Veil, and Witchcraft to v0.6.3 text', () => {
    const heresy = v063CanonicalContent.cardsById.get(V063_HERESY_ID);
    expect(heresy?.cost).toBe(5);
    expect(heresy?.effects.find((entry) => entry.label === 'Gambit/Tactic')?.text).toBe(
      "You may spend 4 Conviction to apply the Gambit or Tactic effect of one card in the opponent's Graveyard that can apply now.",
    );

    const rend = v063CanonicalContent.cardsById.get(V063_REND_THE_VEIL_ID);
    expect(rend?.cost).toBe(3);
    expect(rend?.effects.find((entry) => entry.label === 'Asset')?.text).toBe(
      'After Tactics are revealed, you may discard this card to apply the Tactic effect of one card in your Graveyard that can apply now.',
    );
    expect(rend?.effects.find((entry) => entry.label === 'Gambit/Tactic')?.text).toBe(
      'After Tactics are revealed, you may apply the Tactic effect of one card in your Graveyard that can apply now. In the Aftermath, move that card from your Graveyard to your Discard Pile.',
    );

    const witchcraft = v063CanonicalContent.cardsById.get(V063_WITCHCRAFT_ID);
    expect(witchcraft?.cost).toBe(4);
    expect(witchcraft?.effects.find((entry) => entry.label === 'Asset')?.text).toBe(
      'Once per turn, after Tactics are revealed, you may put 1 card from your Hand in your Graveyard to repeat one other Gambit or Tactic effect you control in this battle that can apply now.',
    );
    expect(witchcraft?.effects.find((entry) => entry.label === 'Gambit/Tactic')?.text).toBe(
      'After Tactics are revealed, repeat one other Gambit or Tactic effect you control in this battle that can apply now. If none can apply, gain Advantage. In the Aftermath, put this card in your Graveyard.',
    );
  });
});

describe('Heresy', () => {
  test('spends 4 Conviction, selects an applicable opposing Graveyard effect, and leaves its source there', () => {
    const graveyard = [instance('opp-rally-1', 'neutral-rallying-cry')];
    const result = prepareV063HeresyApplication({
      controller: 'A',
      conviction: 4,
      opponentGraveyard: graveyard,
      cardsById: v063CanonicalContent.cardsById,
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
      printedEffectOrCallerMayMoveSource: true,
    });
    expect(graveyard).toEqual([instance('opp-rally-1', 'neutral-rallying-cry')]);
  });

  test('requires 4 Conviction and current timing legality', () => {
    const graveyard = [instance('opp-rally-1', 'neutral-rallying-cry')];
    expect(() => prepareV063HeresyApplication({
      controller: 'A',
      conviction: 3,
      opponentGraveyard: graveyard,
      cardsById: v063CanonicalContent.cardsById,
      targetSourceInstanceId: 'opp-rally-1',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    })).toThrow(/4 Conviction/);
    expect(v063HeresyChoices(graveyard, v063CanonicalContent.cardsById, () => false)).toEqual([]);
  });

  test('a copied Heresy may create the one permitted second application layer', () => {
    const heresyCard = v063CanonicalContent.cardsById.get(V063_HERESY_ID)!;
    const heresyPrinted = heresyCard.effects.find((entry) => entry.label === 'Gambit/Tactic')!;
    const parent = beginV063CopiedEffectApplication(v063EffectReference(heresyCard, heresyPrinted), 'A');
    const result = prepareV063HeresyApplication({
      controller: 'A',
      conviction: 4,
      opponentGraveyard: [instance('opp-rally-1', 'neutral-rallying-cry')],
      cardsById: v063CanonicalContent.cardsById,
      targetSourceInstanceId: 'opp-rally-1',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
      parentApplication: parent,
    });
    expect(result.application.chainDepth).toBe(2);
    expect(result.application.chainAllowsFurtherCopiedApplication).toBe(false);
  });
});

describe('Rend the Veil', () => {
  test('selects only Tactic-capable Graveyard effects and preserves duplicate physical copies', () => {
    const graveyard = [
      instance('black-1', 'mystics-black-covenant'),
      instance('black-2', 'mystics-black-covenant'),
      instance('rally-1', 'neutral-rallying-cry'),
    ];
    const choices = v063RendTheVeilChoices(
      graveyard,
      v063CanonicalContent.cardsById,
      () => true,
    );
    expect(choices.filter((choice) => choice.cardId === 'mystics-black-covenant')).toHaveLength(2);
    expect(choices.map((choice) => choice.sourceInstanceId)).toEqual(
      expect.arrayContaining(['black-1', 'black-2']),
    );
  });

  test('Asset use discards Rend itself but does not move the selected Graveyard source', () => {
    const result = prepareV063RendTheVeilApplication({
      controller: 'A',
      sourceMode: 'asset',
      graveyard: [instance('black-2', 'mystics-black-covenant')],
      cardsById: v063CanonicalContent.cardsById,
      targetSourceInstanceId: 'black-2',
      targetEffectLabel: 'Tactic',
      canApplyNow: () => true,
    });
    expect(result.sourceAssetDestination).toBe('discard_pile');
    expect(result.moveTargetToDiscardPileInAftermath).toBe(false);
    expect(result.targetSourceInstanceId).toBe('black-2');
  });

  test('battle use moves the exact selected physical source from Graveyard in the Aftermath', () => {
    const result = prepareV063RendTheVeilApplication({
      controller: 'A',
      sourceMode: 'battle',
      graveyard: [
        instance('black-1', 'mystics-black-covenant'),
        instance('black-2', 'mystics-black-covenant'),
      ],
      cardsById: v063CanonicalContent.cardsById,
      targetSourceInstanceId: 'black-2',
      targetEffectLabel: 'Tactic',
      canApplyNow: () => true,
    });
    expect(result.moveTargetToDiscardPileInAftermath).toBe(true);

    const aftermath = completeV063RendTheVeilAftermath({
      graveyard: [
        instance('black-1', 'mystics-black-covenant'),
        instance('black-2', 'mystics-black-covenant'),
      ],
      discardPile: [],
    }, result.targetSourceInstanceId);
    expect(aftermath.moved).toBe(true);
    expect(aftermath.graveyard).toEqual([instance('black-1', 'mystics-black-covenant')]);
    expect(aftermath.discardPile).toEqual([instance('black-2', 'mystics-black-covenant')]);
  });

  test('Aftermath movement does nothing if another instruction already moved the selected source', () => {
    const zones = {
      graveyard: [instance('black-1', 'mystics-black-covenant')],
      discardPile: [instance('black-2', 'mystics-black-covenant')],
    };
    expect(completeV063RendTheVeilAftermath(zones, 'black-2')).toEqual({
      ...zones,
      moved: false,
    });
  });
});

describe('Witchcraft', () => {
  test('offers only other active applicable Gambit/Tactic effects controlled by the Witchcraft player', () => {
    const effects: V063ControlledBattleEffect[] = [
      battleEffect('witch-1', V063_WITCHCRAFT_ID, 'Gambit/Tactic', {
        createsCopiedOrRepeatedApplication: true,
      }),
      battleEffect('rally-1', 'neutral-rallying-cry', 'Gambit/Tactic'),
      battleEffect('rally-opp', 'neutral-rallying-cry', 'Gambit/Tactic', { controller: 'B' }),
      battleEffect('inactive', 'neutral-rallying-cry', 'Gambit/Tactic', { active: false }),
      battleEffect('copy-caller', 'neutral-arcane-knowledge', 'Gambit/Tactic', {
        createsCopiedOrRepeatedApplication: true,
      }),
      battleEffect('adds-card', 'mystics-black-covenant', 'Tactic', { addsBattleCard: true }),
    ];
    const choices = v063WitchcraftRepeatChoices({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: effects,
      canApplyNow: () => true,
    });
    expect(choices.map((choice) => choice.sourceInstanceId)).toEqual(['rally-1']);
  });

  test('battle mode gains Advantage only when no eligible repeat can apply', () => {
    const result = prepareV063WitchcraftBattleApplication({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: [battleEffect('witch-1', V063_WITCHCRAFT_ID, 'Gambit/Tactic', {
        createsCopiedOrRepeatedApplication: true,
      })],
      canApplyNow: () => true,
    });
    expect(result.application).toBeNull();
    expect(result.fallbackAdvantage).toBe(1);
    expect(result.sourceAftermathDestination).toBe('graveyard');
  });

  test('battle mode must repeat a target when one is eligible', () => {
    const effects = [battleEffect('rally-1', 'neutral-rallying-cry', 'Gambit/Tactic')];
    expect(() => prepareV063WitchcraftBattleApplication({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: effects,
      canApplyNow: () => true,
    })).toThrow(/must choose/);

    const result = prepareV063WitchcraftBattleApplication({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: effects,
      canApplyNow: () => true,
      targetSourceInstanceId: 'rally-1',
      targetEffectLabel: 'Gambit/Tactic',
    });
    expect(result.application).toMatchObject({ cardId: 'neutral-rallying-cry', chainDepth: 1 });
    expect(result.fallbackAdvantage).toBe(0);
  });

  test('Asset mode pays the Hand-to-Graveyard cost and is once per turn', () => {
    const effects = [battleEffect('rally-1', 'neutral-rallying-cry', 'Gambit/Tactic')];
    const result = prepareV063WitchcraftAssetApplication({
      controller: 'A',
      usedThisTurn: false,
      witchcraftAssetInstanceId: 'witch-asset-1',
      zones: {
        hand: [instance('hand-1', 'neutral-reserves')],
        graveyard: [],
      },
      sacrificeInstanceId: 'hand-1',
      battleEffects: effects,
      canApplyNow: () => true,
      targetSourceInstanceId: 'rally-1',
      targetEffectLabel: 'Gambit/Tactic',
    });
    expect(result.hand).toEqual([]);
    expect(result.graveyard).toEqual([instance('hand-1', 'neutral-reserves')]);
    expect(result.usedThisTurn).toBe(true);

    expect(() => prepareV063WitchcraftAssetApplication({
      controller: 'A',
      usedThisTurn: true,
      witchcraftAssetInstanceId: 'witch-asset-1',
      zones: { hand: [instance('hand-2', 'neutral-reserves')], graveyard: [] },
      sacrificeInstanceId: 'hand-2',
      battleEffects: effects,
      canApplyNow: () => true,
      targetSourceInstanceId: 'rally-1',
      targetEffectLabel: 'Gambit/Tactic',
    })).toThrow(/once per turn/);
  });

  test('a copied Witchcraft repeat becomes the second and final copied-effect layer', () => {
    const witchcraftCard = v063CanonicalContent.cardsById.get(V063_WITCHCRAFT_ID)!;
    const witchcraftPrinted = witchcraftCard.effects.find((entry) => entry.label === 'Gambit/Tactic')!;
    const parent = beginV063CopiedEffectApplication(
      v063EffectReference(witchcraftCard, witchcraftPrinted),
      'A',
    );
    const result = prepareV063WitchcraftBattleApplication({
      controller: 'A',
      witchcraftSourceInstanceId: 'witch-1',
      battleEffects: [battleEffect('rally-1', 'neutral-rallying-cry', 'Gambit/Tactic')],
      canApplyNow: () => true,
      targetSourceInstanceId: 'rally-1',
      targetEffectLabel: 'Gambit/Tactic',
      parentApplication: parent,
    });
    expect(result.application?.chainDepth).toBe(2);
    expect(result.application?.chainAllowsFurtherCopiedApplication).toBe(false);
  });
});
