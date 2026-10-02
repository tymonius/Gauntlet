import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  queueV070LateAdditionalTacticBattleRevealChoice,
} from './battle-reveal-choices';
import { recordV070MysticBattleEffectApplied } from './mystics';

export const V070_BLACK_COVENANT_ID =
  'mystics-black-covenant' as const;
export const V070_BLACK_COVENANT_BATTLE_TEXT =
  'Gain Advantage. +1 Tactic from Hand. In the Aftermath, put this card and that card in your Graveyard.' as const;

function validateAuthority(): void {
  for (const source of [
    v070CanonicalContent.cardsById.get(V070_BLACK_COVENANT_ID),
    currentCanonicalContent.cardsById.get(V070_BLACK_COVENANT_ID),
  ]) {
    const text = source?.effects.find(
      effect => effect.label === 'Tactic',
    )?.text;
    if (source?.trait !== 'Arcane'
      || text !== V070_BLACK_COVENANT_BATTLE_TEXT) {
      throw new Error(
        'Black Covenant Tactic text drifted from frozen/current authority.',
      );
    }
  }
}

validateAuthority();

function tacticEligible(cardId: string | undefined): boolean {
  if (!cardId) return false;
  const card = currentCanonicalContent.cardsById.get(cardId);
  return Boolean(card?.effects.some(
    effect =>
      effect.label === 'Tactic'
      || effect.label === 'Gambit/Tactic',
  ));
}

function forceBattleCardToGraveyard(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  const runtime = state.battleRuntime!;
  const existing =
    runtime.battleCardAftermathDestinationOverrides.find(
      override =>
        override.playerId === playerId
        && override.instanceId === instanceId,
    );
  if (existing) {
    existing.destination = 'graveyard';
    existing.sourceCardId = V070_BLACK_COVENANT_ID;
    return;
  }
  runtime.battleCardAftermathDestinationOverrides.push({
    sourceCardId: V070_BLACK_COVENANT_ID,
    playerId,
    instanceId,
    destination: 'graveyard',
  });
}

export function registerV070BlackCovenantBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Black Covenant requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId
      !== V070_BLACK_COVENANT_ID) {
    throw new V070GameActionError(
      'Black Covenant source does not match the revealed Tactic.',
    );
  }

  runtime.participants[owner].advantage += 1;
  forceBattleCardToGraveyard(state, owner, sourceInstanceId);

  appendV070Event(state, {
    type: 'black_covenant_advantage_gained',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_BLACK_COVENANT_ID,
      advantageGained: 1,
      totalAdvantage: runtime.participants[owner].advantage,
    },
  });

  const candidates = state.players[owner].zones.hand.filter(
    instanceId =>
      instanceId !== sourceInstanceId
      && tacticEligible(state.cardInstances[instanceId]?.cardId),
  );

  if (candidates.length > 0) {
    queueV070LateAdditionalTacticBattleRevealChoice(state, {
      kind: 'late_additional_tactic',
      owner,
      sourceInstanceId,
      sourceCardId: V070_BLACK_COVENANT_ID,
      candidateInstanceIds: candidates,
      candidateZone: 'hand',
      chosenDestination: 'graveyard',
    });
  } else {
    appendV070Event(state, {
      type: 'black_covenant_additional_tactic_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_BLACK_COVENANT_ID,
        reason: 'no_eligible_tactic_in_hand',
      },
    });
  }

  recordV070MysticBattleEffectApplied(
    state,
    owner,
    sourceInstanceId,
  );
}
