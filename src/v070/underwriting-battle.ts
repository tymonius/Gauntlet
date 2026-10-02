import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  gainV070Capital,
  v070SubsidizeBonusThisBattle,
} from './financiers';
import type { PlayerId } from './rules';

export const V070_UNDERWRITING_ID = 'financiers-underwriting' as const;
export const V070_UNDERWRITING_BATTLE_TEXT =
  'In the Aftermath, if you lost and used Subsidize, gain Capital equal to the bonus you purchased.' as const;

export interface V070UnderwritingAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    underwritingAftermathEffects?: V070UnderwritingAftermathEffect[];
  }
}

function validateUnderwritingAuthority(): void {
  const frozen = v070CanonicalContent.cardsById.get(V070_UNDERWRITING_ID);
  const current = currentCanonicalContent.cardsById.get(V070_UNDERWRITING_ID);
  const frozenText = frozen?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  )?.text;
  const currentText = current?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  )?.text;
  if (frozenText !== V070_UNDERWRITING_BATTLE_TEXT
    || currentText !== V070_UNDERWRITING_BATTLE_TEXT) {
    throw new Error(
      'Underwriting battle text drifted between frozen and current authority.',
    );
  }
}

validateUnderwritingAuthority();

export function registerV070UnderwritingBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Underwriting battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_UNDERWRITING_ID) {
    throw new V070GameActionError(
      'Underwriting battle source does not match the revealed card instance.',
    );
  }

  runtime.underwritingAftermathEffects ??= [];
  if (runtime.underwritingAftermathEffects.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) return;
  runtime.underwritingAftermathEffects.push({
    owner,
    sourceInstanceId,
  });

  appendV070Event(state, {
    type: 'underwriting_battle_registered',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_UNDERWRITING_ID,
    },
  });
}

export function applyV070UnderwritingAftermathEffects(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath') return;
  const effects = runtime.underwritingAftermathEffects ?? [];
  if (effects.length === 0) return;

  runtime.underwritingAftermathEffects = [];
  for (const effect of effects) {
    const bonus = v070SubsidizeBonusThisBattle(state, effect.owner);
    if (battle.loser !== effect.owner || bonus < 1) {
      appendV070Event(state, {
        type: 'underwriting_battle_condition_not_met',
        actor: effect.owner,
        visibility: 'public',
        payload: {
          sourceInstanceId: effect.sourceInstanceId,
          sourceCardId: V070_UNDERWRITING_ID,
          ownerLost: battle.loser === effect.owner,
          subsidizeBonus: bonus,
        },
      });
      continue;
    }

    gainV070Capital(
      state,
      effect.owner,
      bonus,
      'Underwriting battle Aftermath',
    );
    appendV070Event(state, {
      type: 'underwriting_battle_capital_gained',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        sourceCardId: V070_UNDERWRITING_ID,
        amount: bonus,
        subsidizeBonus: bonus,
      },
    });
  }
}
