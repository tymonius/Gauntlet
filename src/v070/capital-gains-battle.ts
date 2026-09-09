import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_CAPITAL_GAINS_ID = 'financiers-capital-gains' as const;
export const V070_CAPITAL_GAINS_BATTLE_TEXT =
  'Opponent gains Disadvantage. If they lose, after their normal retreat: Retreat +1, if able.' as const;

function validateV070CapitalGainsAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_CAPITAL_GAINS_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_CAPITAL_GAINS_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Capital Gains battle text drifted from released authority.',
    );
  }
}

validateV070CapitalGainsAuthority();

export function applyV070CapitalGainsBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  const source = state.cardInstances[sourceInstanceId];
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Capital Gains battle resolution requires an active battle.',
    );
  }
  if (source?.owner !== owner || source.cardId !== V070_CAPITAL_GAINS_ID) {
    throw new V070GameActionError(
      'Capital Gains battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  runtime.participants[opponent].disadvantage += 1;
  runtime.additionalRetreatEffects.push({
    sourceInstanceId,
    sourceCardId: V070_CAPITAL_GAINS_ID,
    targetPlayer: opponent,
    steps: 1,
  });

  appendV070Event(state, {
    type: 'capital_gains_battle_effect_registered',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_CAPITAL_GAINS_ID,
      opponent,
      disadvantage: 1,
      additionalRetreatIfLost: 1,
    },
  });
}
