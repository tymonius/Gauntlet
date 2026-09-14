import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_COURT_MARTIAL_ID = 'neutral-court-martial' as const;

const courtMartialCard = v070CanonicalContent.cardsById.get(
  V070_COURT_MARTIAL_ID,
);
const courtMartialBattleEffect = courtMartialCard?.effects.find(
  effect => effect.label === 'Gambit/Tactic',
);
if (!courtMartialBattleEffect) {
  throw new Error(
    'Released v0.7.0 Court Martial is missing its Gambit/Tactic effect.',
  );
}

export const V070_COURT_MARTIAL_BATTLE_TEXT = courtMartialBattleEffect.text;

export function applyV070CourtMartialBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  opponent: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Court Martial requires an active battle runtime.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.cardId !== V070_COURT_MARTIAL_ID
    || state.cardInstances[sourceInstanceId]?.owner !== owner) {
    throw new V070GameActionError(
      'Court Martial battle resolution requires its committed card.',
    );
  }

  runtime.participants[opponent].disadvantage += 1;
  runtime.additionalRetreatEffects.push({
    sourceInstanceId,
    sourceCardId: V070_COURT_MARTIAL_ID,
    targetPlayer: opponent,
    steps: 1,
  });
}
