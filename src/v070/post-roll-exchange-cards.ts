import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_REVOLUTION_ID = 'neutral-revolution' as const;
export const V070_REVOLUTION_BATTLE_TEXT =
  "After all rerolls, you may exchange the players' final selected die results. Each player retains their own modifiers." as const;

function validateRevolutionAuthority(): void {
  const frozen = v070CanonicalContent.cardsById.get(V070_REVOLUTION_ID);
  const current = currentCanonicalContent.cardsById.get(V070_REVOLUTION_ID);
  const frozenText = frozen?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  )?.text;
  const currentText = current?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  )?.text;

  if (frozenText !== V070_REVOLUTION_BATTLE_TEXT
    || currentText !== V070_REVOLUTION_BATTLE_TEXT) {
    throw new Error(
      'Revolution battle text drifted between frozen and current authority.',
    );
  }
  if (!current?.rules_notes?.includes(
    'If both players exchange results, no exchange occurs.',
  )) {
    throw new Error(
      'Revolution both-player exchange rule drifted from current authority.',
    );
  }
}

validateRevolutionAuthority();

export function registerV070RevolutionBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Revolution battle resolution requires an active battle.',
    );
  }

  if (runtime.battleCardPostRollExchanges.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }

  runtime.battleCardPostRollExchanges.push({
    owner,
    sourceInstanceId,
    sourceCardId: V070_REVOLUTION_ID,
  });
}
