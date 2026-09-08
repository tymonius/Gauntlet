import { test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import { v070BattleEffectHandler } from './battle-effects';

test('audit remaining unsupported v0.7.0 Gambit/Tactic effects', () => {
  const remaining = v070CanonicalContent.content.cards
    .filter(card => card.effects.some(effect =>
      effect.label === 'Gambit'
      || effect.label === 'Tactic'
      || effect.label === 'Gambit/Tactic'
    ))
    .filter(card => !v070BattleEffectHandler(card.id))
    .map(card => ({
      id: card.id,
      name: card.name,
      effects: card.effects.filter(effect =>
        effect.label === 'Gambit'
        || effect.label === 'Tactic'
        || effect.label === 'Gambit/Tactic'
      ),
    }));

  throw new Error(`REMAINING_V070_BATTLE_EFFECTS=${JSON.stringify(remaining)}`);
});
