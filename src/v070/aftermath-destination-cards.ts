import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_BATTLEFIELD_PROMOTION_ID =
  'military-battlefield-promotion' as const;
export const V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT =
  'In the Aftermath, if you win, return one other Tactic you chose to your Hand instead of putting it in your Discard Pile.' as const;

export const V070_SECOND_LINE_ID = 'neutral-reserves' as const;
export const V070_SECOND_LINE_BATTLE_TEXT =
  'In the Aftermath, you may place one card remaining in your Reserve on top of your Draw Pile instead of putting it in your Discard Pile.' as const;

export const V070_SALVAGE_ID = 'neutral-salvage' as const;
export const V070_SALVAGE_BATTLE_TEXT =
  'In the Aftermath, if you win, you may put one card remaining in your Reserve in your Hand instead of your Discard Pile, then discard one card from your Hand.' as const;

function validateAftermathDestinationAuthority(): void {
  for (const [cardId, expectedText] of [
    [V070_BATTLEFIELD_PROMOTION_ID, V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT],
    [V070_SECOND_LINE_ID, V070_SECOND_LINE_BATTLE_TEXT],
    [V070_SALVAGE_ID, V070_SALVAGE_BATTLE_TEXT],
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
        `${cardId} battle text drifted between frozen and current authority.`,
      );
    }
  }
}

validateAftermathDestinationAuthority();

export function registerV070BattlefieldPromotionBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Battlefield Promotion battle resolution requires an active battle.',
    );
  }

  runtime.battleCardAftermathDestinationChoices.push({
    owner,
    sourceInstanceId,
    sourceCardId: V070_BATTLEFIELD_PROMOTION_ID,
    condition: 'owner_win',
    optional: false,
    candidateSource: 'other_tactics',
    destination: 'hand',
  });
}

export function registerV070SecondLineBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Second Line battle resolution requires an active battle.',
    );
  }

  runtime.battleCardAftermathDestinationChoices.push({
    owner,
    sourceInstanceId,
    sourceCardId: V070_SECOND_LINE_ID,
    condition: 'always',
    optional: true,
    candidateSource: 'reserve',
    destination: 'draw_top',
  });
}


export function registerV070SalvageBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Salvage battle resolution requires an active battle.',
    );
  }

  runtime.battleCardAftermathDestinationChoices.push({
    owner,
    sourceInstanceId,
    sourceCardId: V070_SALVAGE_ID,
    condition: 'owner_win',
    optional: true,
    candidateSource: 'reserve',
    destination: 'hand',
    afterDestination: 'discard_one_from_hand',
  });
}
