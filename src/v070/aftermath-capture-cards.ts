import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_ASSIMILATION_ID = 'neutral-assimilation' as const;
export const V070_ASSIMILATION_BATTLE_TEXT =
  'In the Aftermath, if you win as the attacker on a Territory the opponent controls, advance Front Line 1, if able, instead of occupying it. Put this card in your Graveyard after the Front Line advance.' as const;
export const CURRENT_ASSIMILATION_BATTLE_TEXT =
  'In the Aftermath, if you win as the attacker on a Territory the opponent controls, capture that Territory, if able, instead of occupying it. Then put this card in your Graveyard.' as const;

export const V070_FORECLOSURE_ID = 'financiers-foreclosure' as const;
export const V070_FORECLOSURE_BATTLE_TEXT =
  'In the Aftermath, if you initiated the battle on a Territory whose Deed you owned when the battle began and you won, advance Front Line 1, if able, instead of becoming the occupier.' as const;
export const CURRENT_FORECLOSURE_BATTLE_TEXT =
  'In the Aftermath, if you initiated and won this battle on a Territory whose Deed you owned when the battle began, capture that Territory, if able, instead of becoming the occupier.' as const;

function validateBattleCaptureAuthority(): void {
  for (const [cardId, frozenText, currentText] of [
    [
      V070_ASSIMILATION_ID,
      V070_ASSIMILATION_BATTLE_TEXT,
      CURRENT_ASSIMILATION_BATTLE_TEXT,
    ],
    [
      V070_FORECLOSURE_ID,
      V070_FORECLOSURE_BATTLE_TEXT,
      CURRENT_FORECLOSURE_BATTLE_TEXT,
    ],
  ] as const) {
    const frozen = v070CanonicalContent.cardsById.get(cardId);
    const current = currentCanonicalContent.cardsById.get(cardId);
    const frozenBattle = frozen?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    const currentBattle = current?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    if (frozenBattle !== frozenText) {
      throw new Error(
        `${cardId} battle text drifted from frozen v0.7.0 authority.`,
      );
    }
    if (currentBattle !== currentText) {
      throw new Error(
        `${cardId} battle text drifted from current gameplay authority.`,
      );
    }
  }
}

validateBattleCaptureAuthority();

function registerBattleCapture(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
  options: {
    requiresDeedOwnedAtOnset?: boolean;
    sourceToGraveyard?: boolean;
  } = {},
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime || !battle) {
    throw new V070GameActionError(
      'Battle capture registration requires an active battle.',
    );
  }
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory) {
    throw new V070GameActionError(
      'Battle capture registration requires the contested Territory.',
    );
  }

  if (runtime.battleCardAftermathCaptures.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }

  runtime.battleCardAftermathCaptures.push({
    owner,
    sourceInstanceId,
    sourceCardId,
    territoryInstanceId: territory.territoryInstanceId,
    condition: 'owner_win_as_attacker_on_opponent_controlled',
    requiresDeedOwnedAtOnset: options.requiresDeedOwnedAtOnset,
    sourceToGraveyard: options.sourceToGraveyard,
  });
}

export function registerV070AssimilationBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  registerBattleCapture(
    state,
    owner,
    sourceInstanceId,
    V070_ASSIMILATION_ID,
    { sourceToGraveyard: true },
  );
}

export function registerV070ForeclosureBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  registerBattleCapture(
    state,
    owner,
    sourceInstanceId,
    V070_FORECLOSURE_ID,
    { requiresDeedOwnedAtOnset: true },
  );
}
