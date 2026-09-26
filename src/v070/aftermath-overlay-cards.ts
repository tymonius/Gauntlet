import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_NATURES_ALTAR_ID = 'mystics-nature-s-altar' as const;
export const V070_NATURES_ALTAR_BATTLE_TEXT =
  'In the Aftermath, if you win, you may place this Overlay on the contested Territory.' as const;

export const V070_SCORCHED_EARTH_ID = 'neutral-scorched-earth' as const;
export const V070_SCORCHED_EARTH_BATTLE_TEXT =
  'In the Aftermath, if you lose while defending a Territory you control and retreat, place this card on that Territory as a Ruins Overlay.' as const;

function validateAftermathOverlayAuthority(): void {
  for (const [cardId, expectedText] of [
    [V070_NATURES_ALTAR_ID, V070_NATURES_ALTAR_BATTLE_TEXT],
    [V070_SCORCHED_EARTH_ID, V070_SCORCHED_EARTH_BATTLE_TEXT],
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

validateAftermathOverlayAuthority();

export function registerV070NaturesAltarBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime || !battle) {
    throw new V070GameActionError(
      "Nature's Altar battle resolution requires an active battle.",
    );
  }
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory) return;

  runtime.battleCardAftermathOverlayPlacements.push({
    owner,
    sourceInstanceId,
    sourceCardId: V070_NATURES_ALTAR_ID,
    territoryInstanceId: territory.territoryInstanceId,
    condition: 'owner_win',
    optional: true,
  });
}

export function registerV070ScorchedEarthBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime || !battle) {
    throw new V070GameActionError(
      'Scorched Earth battle resolution requires an active battle.',
    );
  }
  if (battle.defender !== owner) return;

  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory || territory.controller !== owner) return;

  runtime.battleCardAftermathOverlayPlacements.push({
    owner,
    sourceInstanceId,
    sourceCardId: V070_SCORCHED_EARTH_ID,
    territoryInstanceId: territory.territoryInstanceId,
    condition: 'owner_loss_after_retreat',
    asRuins: true,
  });
}
