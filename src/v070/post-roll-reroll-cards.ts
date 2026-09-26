import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_VALOR_ID = 'neutral-valor' as const;
export const V070_VALOR_BATTLE_TEXT =
  "After battle dice are rolled, if your battle total is lower than the opponent's, you may reroll your battle die." as const;

export const V070_FATES_TOLL_ID = 'mystics-fate-s-toll' as const;
export const V070_FATES_TOLL_BATTLE_TEXT =
  'After you roll, you may put one other card from your Hand in your Graveyard to reroll.' as const;

export type V070PostRollRerollCardId =
  | typeof V070_VALOR_ID
  | typeof V070_FATES_TOLL_ID;

function validatePostRollRerollAuthority(): void {
  for (const [cardId, expectedText] of [
    [V070_VALOR_ID, V070_VALOR_BATTLE_TEXT],
    [V070_FATES_TOLL_ID, V070_FATES_TOLL_BATTLE_TEXT],
  ] as const) {
    const frozen = v070CanonicalContent.cardsById.get(cardId);
    const current = currentCanonicalContent.cardsById.get(cardId);
    const frozenText = frozen?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    const currentText = current?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    if (frozenText !== expectedText || currentText !== expectedText) {
      throw new Error(
        `${cardId} post-roll battle text drifted between frozen and current authority.`,
      );
    }
  }
}

validatePostRollRerollAuthority();

export function registerV070PostRollRerollEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: V070PostRollRerollCardId,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Post-roll reroll registration requires an active battle.',
    );
  }
  if (runtime.battleCardPostRollRerolls.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }
  runtime.battleCardPostRollRerolls.push({
    owner,
    sourceInstanceId,
    sourceCardId,
  });
}
