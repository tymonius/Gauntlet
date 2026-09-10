import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  V070_ARCANE_KNOWLEDGE_BATTLE_TEXT,
  prepareV070ArcaneKnowledgeBattleApplication,
  v070ArcaneKnowledgeBattleChoices,
} from './arcane-knowledge-battle';
import {
  continueV070CopiedEffectApplication,
  v070EffectReference,
  type V070CardInstanceReference,
} from './copied-effects';

describe('released v0.7.0 Arcane Knowledge battle authority', () => {
  test('locks the published Gambit/Tactic text independently of the canonical lookup', () => {
    expect(V070_ARCANE_KNOWLEDGE_BATTLE_TEXT).toBe(
      'Apply the Gambit or Tactic effect of one card in your Graveyard that can apply now.',
    );
    const card = v070CanonicalContent.cardsById.get('neutral-arcane-knowledge');
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text).toBe(
      V070_ARCANE_KNOWLEDGE_BATTLE_TEXT,
    );
  });
});

describe('v0.7.0 copied/repeated-effect semantic kernel', () => {
  const graveyard: V070CardInstanceReference[] = [
    { instanceId: 'rally', cardId: 'neutral-rallying-cry' },
    { instanceId: 'fortifications', cardId: 'neutral-fortifications' },
    { instanceId: 'witchcraft', cardId: 'mystics-witchcraft' },
    { instanceId: 'arcane', cardId: 'neutral-arcane-knowledge' },
  ];

  test('Arcane Knowledge uses semantic can-apply-now filtering rather than a title whitelist', () => {
    const choices = v070ArcaneKnowledgeBattleChoices(
      graveyard,
      v070CanonicalContent.cardsById,
      effect => effect.cardId !== 'neutral-fortifications',
    );

    expect(choices.map(({ sourceInstanceId, label }) => `${sourceInstanceId}:${label}`)).toContain(
      'rally:Gambit/Tactic',
    );
    expect(choices.map(({ sourceInstanceId, label }) => `${sourceInstanceId}:${label}`)).toContain(
      'witchcraft:Gambit/Tactic',
    );
    expect(choices.map(({ sourceInstanceId, label }) => `${sourceInstanceId}:${label}`)).toContain(
      'arcane:Gambit/Tactic',
    );
    expect(choices.some(choice => choice.sourceInstanceId === 'fortifications')).toBe(false);
    expect(choices.every(choice => choice.sourceZone === 'graveyard')).toBe(true);
  });

  test('preserves the exact physical Graveyard source while applying its printed effect under the instructed controller', () => {
    const application = prepareV070ArcaneKnowledgeBattleApplication({
      controller: 'B',
      graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'rally',
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
    expect(graveyard.find(card => card.instanceId === 'rally')).toEqual({
      instanceId: 'rally',
      cardId: 'neutral-rallying-cry',
    });
  });

  test('requires the exact selected physical source and printed effect to be eligible now', () => {
    expect(() => prepareV070ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'fortifications',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => false,
    })).toThrow(/eligible Gambit or Tactic effect/);

    expect(() => prepareV070ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'not-in-graveyard',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    })).toThrow(/Graveyard/);
  });

  test('chain depth alone does not permit an ordinary copied effect to create another application', () => {
    const ordinary = prepareV070ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'rally',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    });
    expect(() => continueV070CopiedEffectApplication(
      ordinary,
      ordinary,
      'A',
      false,
    )).toThrow(/printed text instructs another application/);
  });

  test('permits one further instructed copied application but no third layer in the same chain', () => {
    const first = prepareV070ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'arcane',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    });

    const heresy = v070CanonicalContent.cardsById.get('inquisition-heresy');
    const heresyEffect = heresy?.effects.find(effect => effect.label === 'Gambit/Tactic');
    expect(heresy).toBeDefined();
    expect(heresyEffect).toBeDefined();
    const second = continueV070CopiedEffectApplication(
      first,
      v070EffectReference(heresy!, heresyEffect!),
      'A',
      true,
    );

    expect(second.chainDepth).toBe(2);
    expect(second.chainAllowsFurtherCopiedApplication).toBe(false);
    expect(() => continueV070CopiedEffectApplication(
      second,
      v070EffectReference(heresy!, heresyEffect!),
      'A',
      true,
    )).toThrow(/third application layer/);
  });

  test('does not treat copying an Arcane source effect as playing, setting, or choosing that source card', () => {
    const application = prepareV070ArcaneKnowledgeBattleApplication({
      controller: 'A',
      graveyard,
      cardsById: v070CanonicalContent.cardsById,
      targetSourceInstanceId: 'witchcraft',
      targetEffectLabel: 'Gambit/Tactic',
      canApplyNow: () => true,
    });

    expect(application.sourceCardIsPlayedSetOrChosen).toBe(false);
    expect(application.sourceEventTriggers).toBe(false);
  });
});
