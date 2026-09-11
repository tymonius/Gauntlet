import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { didV070OpponentEffectRevealBattleCardEarly } from './battle-early-reveal';

export const V070_DEEP_COVER_ID = 'intelligence-deep-cover' as const;
export const V070_DEEP_COVER_BATTLE_TEXT =
  'If an opposing effect revealed one of your Gambits or Tactics before its normal reveal, gain Advantage.' as const;

function validateV070DeepCoverAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_DEEP_COVER_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_DEEP_COVER_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Deep Cover battle text drifted from released authority.',
    );
  }
}

validateV070DeepCoverAuthority();

export function registerV070DeepCoverBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Deep Cover battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_DEEP_COVER_ID) {
    throw new V070GameActionError(
      'Deep Cover battle source does not match the revealed card instance.',
    );
  }

  const qualifies = didV070OpponentEffectRevealBattleCardEarly(state, owner);
  if (!qualifies) {
    appendV070Event(state, {
      type: 'deep_cover_battle_condition_not_met',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_DEEP_COVER_ID,
      },
    });
    return;
  }

  state.battleRuntime.participants[owner].advantage += 1;
  appendV070Event(state, {
    type: 'deep_cover_battle_advantage_gained',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_DEEP_COVER_ID,
      advantageGained: 1,
    },
  });
}
