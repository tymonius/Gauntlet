import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_GRAVE_WARD_ID = 'mystics-grave-ward' as const;
export const V070_GRAVE_WARD_BATTLE_TEXT =
  'In the Aftermath, after Gambits enter your Graveyard, choose one other Gambit you set during this battle. Move it from your Graveyard to your Discard Pile.' as const;

export const V070_SOUL_FOR_SOUL_ID = 'mystics-soul-for-soul' as const;
export const V070_SOUL_FOR_SOUL_BATTLE_TEXT =
  'In the Aftermath, after Gambits enter your Graveyard, you may exchange one card in your Hand with one other Gambit you set during this battle that is in your Graveyard.' as const;

export const V070_NECROMANCY_ID = 'mystics-necromancy' as const;
export const V070_NECROMANCY_BATTLE_TEXT =
  'In the Aftermath, after Gambits enter your Graveyard, apply the effect below.\n\nChoose up to three non-Necromancy cards in your Graveyard. Put all cards in your Hand in your Graveyard, then return the chosen cards to your Hand.' as const;

export type V070PostClearMysticCardId =
  | typeof V070_GRAVE_WARD_ID
  | typeof V070_SOUL_FOR_SOUL_ID
  | typeof V070_NECROMANCY_ID;

function validatePostClearMysticAuthority(): void {
  for (const [cardId, expectedText] of [
    [V070_GRAVE_WARD_ID, V070_GRAVE_WARD_BATTLE_TEXT],
    [V070_SOUL_FOR_SOUL_ID, V070_SOUL_FOR_SOUL_BATTLE_TEXT],
    [V070_NECROMANCY_ID, V070_NECROMANCY_BATTLE_TEXT],
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
        `${cardId} post-clear battle text drifted between frozen and current authority.`,
      );
    }
  }
}

validatePostClearMysticAuthority();

export function registerV070PostClearMysticBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: V070PostClearMysticCardId,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Post-clear Mystics battle resolution requires an active battle.',
    );
  }

  if (runtime.battleCardPostClearAftermathEffects.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }

  runtime.battleCardPostClearAftermathEffects.push({
    owner,
    sourceInstanceId,
    sourceCardId,
  });
}
