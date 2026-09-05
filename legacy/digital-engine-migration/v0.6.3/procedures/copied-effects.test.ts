import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import {
  continueV063CopiedEffectApplication,
  v063EffectReference,
} from './copied-effects';
import {
  prepareV063ArcaneKnowledgeBattleApplication,
  resolveV063ArcaneKnowledgeAction,
  v063ArcaneKnowledgeBattleChoices,
} from './arcane-knowledge';

describe('published Arcane Knowledge authority', () => {
  test('locks the v0.6.3 Action and Gambit/Tactic text', () => {
    const card = v063CanonicalContent.cardsById.get('neutral-arcane-knowledge');
    expect(card?.cost).toBe(4);
    expect(card?.effects.find((effect) => effect.label === 'Action')?.text).toBe(
      'Move one card from your Graveyard to your Discard Pile.',
    );
    expect(card?.effects.find((effect) => effect.label === 'Gambit/Tactic')?.text).toBe(
      'Apply the Gambit or Tactic effect of one card in your Graveyard that can apply now.',
    );
  });
});

describe('Arcane Knowledge Action', () => {
  test('moves exactly one chosen Graveyard card to the Discard Pile', () => {
    expect(resolveV063ArcaneKnowledgeAction({
      graveyard: ['one', 'two', 'three'],
      discardPile: ['old'],
    }, 'two')).toEqual({
      graveyard: ['one', 'three'],
      discardPile: ['old', 'two'],
    });
  });

  test('requires the target to still be in the Graveyard', () => {
    expect(() => resolveV063ArcaneKnowledgeAction({
      graveyard: ['one'],
      discardPile: [],
    }, 'missing')).toThrow(/Graveyard/);
  });
});

describe('v0.6.3 copied/repeated-effect semantics', () => {
  test('Arcane Knowledge uses semantic can-apply-now filtering rather than a title whitelist', () => {
    const graveyard = [
      'neutral-rallying-cry',
      'neutral-fortifications',
      'mystics-witchcraft',
      'neutral-arcane-knowledge',
    ];
    const choices = v063ArcaneKnowledgeBattleChoices(
      graveyard,
      v063CanonicalContent.cardsById,
      (effect) => effect.cardId !== 'neutral-fortifications',
    );

    expect(choices.map(({ cardId, label }) => `${cardId}:${label}`)).toContain(
      'neutral-rallying-cry:Gambit/Tactic',
    );
    expect(choices.map(({ cardId, label }) => `${cardId}:${label}`)).toContain(
      'mystics-witchcraft:Gambit/Tactic',
    );
    expect(choices.map(({ cardId, label }) => `${cardId}:${label}`)).toContain(
      'neutral-arcane-knowledge:Gambit/Tactic',
    );
    expect(choices.some((choice) => choice.cardId === 'neutral-fortifications')).toBe(false);
    expect(choices.every((choice) => choice.sourceZone === 'graveyard')).toBe(true);
  });

  test('a copied application is controlled by the instructed player without moving or replaying the source card merely because it was copied', () => {
    const graveyard = ['neutral-rallying-cry'];
    const application = prepareV063ArcaneKnowledgeBattleApplication({
      controller: 'B',
      graveyard,
      cardsById: v063CanonicalContent.cardsById,
      targetCardId: 'neutral-rallying-cry',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    });

    expect(application).toMatchObject({
      cardId: 'neutral-rallying-cry',
      controller: 'B',
      chainDepth: 1,
      sourceCardMovesMerelyBecauseCopied: false,
      printedEffectOrCallerMayMoveSource: true,
      sourceCardIsPlayedSetOrChosen: false,
      sourceEventTriggers: false,
      remakeChoices: true,
      repayCosts: true,
      chainAllowsFurtherCopiedApplication: true,
    });
    expect(graveyard).toEqual(['neutral-rallying-cry']);
  });

  test('requires the selected printed effect to be able to apply at the current timing', () => {
    expect(() => prepareV063ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard: ['neutral-fortifications'],
      cardsById: v063CanonicalContent.cardsById,
      targetCardId: 'neutral-fortifications',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => false,
    })).toThrow(/cannot apply at the current timing/);
  });

  test('chain depth does not itself permit an ordinary copied effect to create another application', () => {
    const ordinary = prepareV063ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard: ['neutral-rallying-cry'],
      cardsById: v063CanonicalContent.cardsById,
      targetCardId: 'neutral-rallying-cry',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    });
    expect(() => continueV063CopiedEffectApplication(
      ordinary,
      ordinary,
      'A',
      false,
    )).toThrow(/printed text instructs another application/);
  });

  test('permits one further instructed copied application but no third layer in the same chain', () => {
    const first = prepareV063ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard: ['neutral-arcane-knowledge'],
      cardsById: v063CanonicalContent.cardsById,
      targetCardId: 'neutral-arcane-knowledge',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    });

    const heresy = v063CanonicalContent.cardsById.get('inquisition-heresy');
    const heresyEffect = heresy?.effects.find((effect) => effect.label === 'Gambit/Tactic');
    expect(heresy).toBeDefined();
    expect(heresyEffect).toBeDefined();
    const second = continueV063CopiedEffectApplication(
      first,
      v063EffectReference(heresy!, heresyEffect!),
      'A',
      true,
    );

    expect(second.chainDepth).toBe(2);
    expect(second.chainAllowsFurtherCopiedApplication).toBe(false);
    expect(() => continueV063CopiedEffectApplication(
      second,
      v063EffectReference(heresy!, heresyEffect!),
      'A',
      true,
    )).toThrow(/third application layer/);
  });

  test('does not treat copying an Arcane source effect as playing, setting, or choosing that card', () => {
    const application = prepareV063ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard: ['mystics-witchcraft'],
      cardsById: v063CanonicalContent.cardsById,
      targetCardId: 'mystics-witchcraft',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    });

    expect(application.sourceCardIsPlayedSetOrChosen).toBe(false);
    expect(application.sourceEventTriggers).toBe(false);
  });
});
