import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type {
  V070BattleCardCommitment,
} from './battle-types';
import type { PlayerId } from './rules';
import { drawV070Cards } from './turn-engine';
import {
  queueV070LateAdditionalTacticBattleRevealChoice,
} from './battle-reveal-choices';

export const V070_INVASION_ID = 'military-invasion' as const;
export const V070_INVASION_BATTLE_TEXT =
  'Attacker — +1 Reserve, +1 Tactic.' as const;

export const V070_LIBERATION_ID = 'neutral-liberation' as const;
export const V070_LIBERATION_BATTLE_TEXT =
  'Counterattack — +1 Reserve, +1 Tactic.' as const;

export const V070_REINFORCEMENTS_ID = 'neutral-reinforcements' as const;
export const V070_REINFORCEMENTS_BATTLE_TEXT =
  'After Tactics are revealed: +1 Reserve; +1 Tactic using that card.' as const;

export type V070ReserveTacticGrantCardId =
  | typeof V070_INVASION_ID
  | typeof V070_LIBERATION_ID
  | typeof V070_REINFORCEMENTS_ID;

function validateReserveTacticGrantAuthority(): void {
  for (const [cardId, expectedText] of [
    [V070_INVASION_ID, V070_INVASION_BATTLE_TEXT],
    [V070_LIBERATION_ID, V070_LIBERATION_BATTLE_TEXT],
    [V070_REINFORCEMENTS_ID, V070_REINFORCEMENTS_BATTLE_TEXT],
  ] as const) {
    const frozen = v070CanonicalContent.cardsById.get(cardId);
    const current = currentCanonicalContent.cardsById.get(cardId);
    const frozenText = frozen?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    const currentText = current?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    if (frozenText !== expectedText || currentText !== expectedText) {
      throw new Error(
        `${cardId} Reserve/Tactic battle text drifted between frozen and current authority.`,
      );
    }
  }
}

validateReserveTacticGrantAuthority();

function tacticEligible(cardId: string | undefined): boolean {
  if (!cardId) return false;
  const card = v070CanonicalContent.cardsById.get(cardId);
  return Boolean(card?.effects.some(
    effect => effect.label === 'Tactic'
      || effect.label === 'Gambit/Tactic',
  ));
}

function isCounterattack(
  state: V070GameState,
  owner: PlayerId,
): boolean {
  const battle = state.battle;
  if (!battle
    || battle.lastStand
    || battle.attacker !== owner
    || battle.defenderControlsContested) {
    return false;
  }
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  return territory?.controller === owner;
}

function conditionMet(
  state: V070GameState,
  owner: PlayerId,
  cardId: V070ReserveTacticGrantCardId,
): boolean {
  const battle = state.battle;
  if (!battle) return false;
  if (cardId === V070_INVASION_ID) {
    return battle.attacker === owner;
  }
  if (cardId === V070_LIBERATION_ID) {
    return isCounterattack(state, owner);
  }
  return true;
}

function drawReserveCard(
  state: V070GameState,
  owner: PlayerId,
  sourceCardId: string,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'A Reserve grant requires an active battle runtime.',
    );
  }
  const draw = drawV070Cards(
    state,
    owner,
    1,
    `${sourceCardId} battle Reserve`,
  );
  runtime.participants[owner].reserve.push(...draw.drawn);

  appendV070Event(state, {
    type: 'battle_reserve_cards_added',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceCardId,
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
        purpose: `${sourceCardId} battle Reserve`,
      },
    });
  }
  return draw.drawn;
}

function openLateAdditionalTactic(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: V070ReserveTacticGrantCardId,
  candidates: readonly string[],
): void {
  const eligible = candidates.filter(instanceId =>
    tacticEligible(state.cardInstances[instanceId]?.cardId)
  );
  if (eligible.length === 0) {
    appendV070Event(state, {
      type: 'late_additional_tactic_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId,
        reason: 'no_eligible_card',
      },
    });
    return;
  }

  queueV070LateAdditionalTacticBattleRevealChoice(state, {
    kind: 'late_additional_tactic',
    owner,
    sourceInstanceId,
    sourceCardId,
    candidateInstanceIds: eligible,
  });
}

export function applyV070ReserveTacticGrantBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  commitment: V070BattleCardCommitment,
  sourceCardId: V070ReserveTacticGrantCardId,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'A Reserve/Tactic battle grant requires an active battle.',
    );
  }
  if (!conditionMet(state, owner, sourceCardId)) {
    appendV070Event(state, {
      type: 'battle_card_condition_not_met',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: commitment.instanceId,
        sourceCardId,
      },
    });
    return;
  }

  const drawn = drawReserveCard(state, owner, sourceCardId);
  const participant = runtime.participants[owner];
  const lateTiming = runtime.stage !== 'reveal_gambits';

  if (!lateTiming) {
    participant.tacticLimit += 1;
    appendV070Event(state, {
      type: 'battle_additional_tactic_granted',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: commitment.instanceId,
        sourceCardId,
        timing: 'before_tactic_choices',
        source: 'reserve',
        tacticLimit: participant.tacticLimit,
      },
    });
    return;
  }

  const candidates = sourceCardId === V070_REINFORCEMENTS_ID
    ? drawn
    : participant.reserve;
  appendV070Event(state, {
    type: 'battle_additional_tactic_granted',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: commitment.instanceId,
      sourceCardId,
      timing: 'after_tactics_revealed',
      source: sourceCardId === V070_REINFORCEMENTS_ID
        ? 'that_card'
        : 'reserve',
    },
  });
  openLateAdditionalTactic(
    state,
    owner,
    commitment.instanceId,
    sourceCardId,
    candidates,
  );
}
