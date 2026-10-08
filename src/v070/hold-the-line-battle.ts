import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import { drawV070Cards } from './card-draw';
import {
  queueV070LateAdditionalTacticBattleRevealChoice,
} from './battle-reveal-choices';
import type { PlayerId } from './rules';

export const V070_HOLD_THE_LINE_ID =
  'military-hold-the-line' as const;
export const V070_HOLD_THE_LINE_BATTLE_TEXT =
  'If you are defending a Territory you control, after Tactics are revealed, +2 Reserve; +1 Tactic from those cards. If you lose, after you retreat, the attacker captures that Territory. In the Aftermath, put this card in your Graveyard.' as const;

declare module './battle-types' {
  interface V070BattleRuntime {
    deferredHoldTheLineGambitCommitments?: V070BattleCardCommitment[];
  }
}

function validateAuthority(): void {
  for (const [label, content] of [
    ['frozen v0.7.0', v070CanonicalContent],
    ['current', currentCanonicalContent],
  ] as const) {
    const text = content.cardsById.get(V070_HOLD_THE_LINE_ID)
      ?.effects.find(effect => effect.label === 'Gambit/Tactic')
      ?.text;
    if (text !== V070_HOLD_THE_LINE_BATTLE_TEXT) {
      throw new Error(
        `Hold the Line battle text drifted from ${label} gameplay authority.`,
      );
    }
  }
}

validateAuthority();

export function deferV070HoldTheLineGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredHoldTheLineGambitCommitments ??= [];
  if (runtime.deferredHoldTheLineGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) {
    return;
  }
  runtime.deferredHoldTheLineGambitCommitments.push({ ...commitment });
}

export function takeV070DeferredHoldTheLineGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred = runtime.deferredHoldTheLineGambitCommitments ?? [];
  runtime.deferredHoldTheLineGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId
      === V070_HOLD_THE_LINE_ID
    && battleContainsCommitment(state, commitment)
  );
}

export function registerV070HoldTheLineBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  commitment: V070BattleCardCommitment,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Hold the Line requires an active battle.',
    );
  }
  if (state.cardInstances[commitment.instanceId]?.cardId
      !== V070_HOLD_THE_LINE_ID
    || commitment.owner !== owner) {
    throw new V070GameActionError(
      'Hold the Line source does not match its battle controller.',
    );
  }

  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  const conditionMet =
    battle.defender === owner
    && territory?.controller === owner;

  if (!conditionMet) {
    appendV070Event(state, {
      type: 'battle_card_condition_not_met',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: commitment.instanceId,
        sourceCardId: V070_HOLD_THE_LINE_ID,
        condition: 'defending_controlled_territory',
      },
    });
    return;
  }

  forceSourceToGraveyard(
    state,
    owner,
    commitment.instanceId,
  );

  const draw = drawV070Cards(
    state,
    owner,
    2,
    'Hold the Line battle Reserve',
  );
  runtime.participants[owner].reserve.push(...draw.drawn);

  appendV070Event(state, {
    type: 'battle_reserve_cards_added',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: commitment.instanceId,
      sourceCardId: V070_HOLD_THE_LINE_ID,
      count: draw.drawn.length,
      reshuffles: draw.reshuffles,
      exhausted: draw.exhausted,
    },
  });
  if (draw.drawn.length > 0) {
    appendV070Event(state, {
      type: 'reserve_identity',
      actor: owner,
      visibility: owner,
      payload: {
        cardInstanceIds: [...draw.drawn],
        purpose: 'Hold the Line battle Reserve',
      },
    });
  }

  const tacticCandidates = draw.drawn.filter(instanceId =>
    tacticEligible(state.cardInstances[instanceId]?.cardId)
  );
  appendV070Event(state, {
    type: 'battle_additional_tactic_granted',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: commitment.instanceId,
      sourceCardId: V070_HOLD_THE_LINE_ID,
      timing: 'after_tactics_revealed',
      source: 'drawn_reserve_cards',
      candidateCount: tacticCandidates.length,
    },
  });

  if (tacticCandidates.length > 0) {
    queueV070LateAdditionalTacticBattleRevealChoice(state, {
      kind: 'late_additional_tactic',
      owner,
      sourceInstanceId: commitment.instanceId,
      sourceCardId: V070_HOLD_THE_LINE_ID,
      candidateInstanceIds: tacticCandidates,
      candidateZone: 'reserve',
    });
  } else {
    appendV070Event(state, {
      type: 'late_additional_tactic_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: commitment.instanceId,
        sourceCardId: V070_HOLD_THE_LINE_ID,
        reason: 'no_eligible_drawn_tactic',
      },
    });
  }

  if (!runtime.battleCardAftermathCaptures.some(
    capture => capture.sourceInstanceId === commitment.instanceId,
  )) {
    runtime.battleCardAftermathCaptures.push({
      owner,
      capturePlayer: battle.attacker,
      sourceInstanceId: commitment.instanceId,
      sourceCardId: V070_HOLD_THE_LINE_ID,
      territoryInstanceId: territory.territoryInstanceId,
      condition: 'owner_loss_after_retreat',
    });
  }
}

function tacticEligible(cardId: string | undefined): boolean {
  if (!cardId) return false;
  return Boolean(currentCanonicalContent.cardsById.get(cardId)
    ?.effects.some(effect =>
      effect.label === 'Tactic'
      || effect.label === 'Gambit/Tactic'
    ));
}

function forceSourceToGraveyard(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime!;
  const existing =
    runtime.battleCardAftermathDestinationOverrides.find(
      override =>
        override.playerId === owner
        && override.instanceId === sourceInstanceId,
    );
  if (existing) {
    existing.destination = 'graveyard';
    existing.sourceCardId = V070_HOLD_THE_LINE_ID;
    return;
  }
  runtime.battleCardAftermathDestinationOverrides.push({
    sourceCardId: V070_HOLD_THE_LINE_ID,
    playerId: owner,
    instanceId: sourceInstanceId,
    destination: 'graveyard',
  });
}

function battleContainsCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): boolean {
  const participant = state.battleRuntime?.participants[commitment.owner];
  if (!participant) return false;
  const candidates = commitment.role === 'gambit'
    ? [
        ...(participant.gambit ? [participant.gambit] : []),
        ...participant.additionalGambits,
      ]
    : [
        ...(participant.tactic ? [participant.tactic] : []),
        ...participant.additionalTactics,
      ];
  return candidates.some(
    candidate => candidate.instanceId === commitment.instanceId,
  );
}
