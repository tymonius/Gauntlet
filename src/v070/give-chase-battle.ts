import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { isV070BattleCardEffectNegated, v070BattleCommitment } from './battle-effect-status';
import type { PlayerId } from './rules';

export const V070_GIVE_CHASE_ID = 'military-give-chase' as const;
export const V070_GIVE_CHASE_BATTLE_TEXT =
  'Following the Aftermath, if you won as the attacker, you may advance 1 Position. Put this card in your Graveyard.\n\nIf an advance from this card starts a battle, you cannot set a Gambit or use Orders in it. In that battle, −1 Reserve for each battle you already fought this turn beyond the first, to a minimum of 0.' as const;

for (const [name, authority] of [
  ['frozen', v070CanonicalContent],
  ['current', currentCanonicalContent],
] as const) {
  if (authority.cardsById.get(V070_GIVE_CHASE_ID)?.effects
    .find(effect => effect.label === 'Gambit/Tactic')?.text
      !== V070_GIVE_CHASE_BATTLE_TEXT) {
    throw new Error('Give Chase ' + name + ' battle text differs from registered handler.');
  }
}

/** Stage only physical revealed/active Give Chase copies, not an Action play. */
export function stageV070GiveChaseBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const commitment = v070BattleCommitment(state, sourceInstanceId);
  const instance = state.cardInstances[sourceInstanceId];
  if (!runtime || !state.battle || runtime.stage === 'aftermath'
    || !commitment || commitment.owner !== owner
    || (commitment.role !== 'gambit' && commitment.role !== 'tactic')
    || !commitment.faceUp
    || instance?.cardId !== V070_GIVE_CHASE_ID
    || instance.owner !== owner
    || isV070BattleCardEffectNegated(state, sourceInstanceId)) {
    throw new V070GameActionError('Give Chase requires a live non-negated revealed battle commitment.');
  }
  runtime.giveChaseBattleSourceInstanceIds ??= [];
  if (runtime.giveChaseBattleSourceInstanceIds.includes(sourceInstanceId)) return;
  runtime.giveChaseBattleSourceInstanceIds.push(sourceInstanceId);
  appendV070Event(state, {
    type: 'give_chase_battle_effect_staged',
    actor: owner,
    visibility: 'public',
    payload: { sourceInstanceId },
  });
}
