import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  registerV070DeferredBattleAftermathDestination,
  v070InitialReserveSnapshot,
} from './battle-aftermath-deferred';

export const V070_ATTRITION_ID = 'neutral-attrition' as const;
export const V070_ATTRITION_BATTLE_TEXT =
  'In the Aftermath, if the opponent loses, put every card from their initial Reserve in their Graveyard.' as const;

function validateV070AttritionAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_ATTRITION_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_ATTRITION_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Attrition battle text drifted from released authority.',
    );
  }
}

validateV070AttritionAuthority();

export function registerV070AttritionBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Attrition battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_ATTRITION_ID) {
    throw new V070GameActionError(
      'Attrition battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const initialReserve = v070InitialReserveSnapshot(state, opponent);
  registerV070DeferredBattleAftermathDestination(state, {
    sourceInstanceId,
    sourceCardId: V070_ATTRITION_ID,
    owner,
    targetPlayer: opponent,
    targetInstanceIds: initialReserve,
    destination: 'graveyard',
    condition: 'target_loses',
  });

  appendV070Event(state, {
    type: 'attrition_battle_aftermath_registered',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ATTRITION_ID,
      opponent,
      initialReserveCount: initialReserve.length,
    },
  });
}
