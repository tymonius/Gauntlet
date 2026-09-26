import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_MONETARY_CRISIS_ID = 'financiers-monetary-crisis' as const;
export const V070_MONETARY_CRISIS_BATTLE_TEXT =
  'In the Aftermath, each player with more than one card in Hand chooses one and discards the rest.' as const;

function validateMonetaryCrisisAuthority(): void {
  for (const content of [v070CanonicalContent, currentCanonicalContent]) {
    const card = content.cardsById.get(V070_MONETARY_CRISIS_ID);
    const text = card?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    if (text !== V070_MONETARY_CRISIS_BATTLE_TEXT) {
      throw new Error(
        'Monetary Crisis battle text drifted from frozen/current authority.',
      );
    }
  }
}

validateMonetaryCrisisAuthority();

export function registerV070MonetaryCrisisBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Monetary Crisis battle resolution requires an active battle.',
    );
  }
  if (runtime.battleCardAftermathMonetaryCrises.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }
  runtime.battleCardAftermathMonetaryCrises.push({
    owner,
    sourceInstanceId,
    sourceCardId: V070_MONETARY_CRISIS_ID,
  });
}
