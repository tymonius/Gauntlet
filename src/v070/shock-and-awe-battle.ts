import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import type { PlayerId } from './rules';
import {
  queueV070LateAdditionalTacticBattleRevealChoice,
} from './battle-reveal-choices';
import { advanceV070FrontLine, nextV070FrontLineTarget } from './front-line';
import {
  imposeV070VictoryResultRestrictions,
  recordV070VictoryResultBenefit,
  v070VictoryResultBenefitProhibited,
} from './victory-result-restrictions';

export const V070_SHOCK_AND_AWE_ID = 'military-shock-and-awe' as const;
export const V070_SHOCK_AND_AWE_BATTLE_TEXT =
  'When attacking on an enemy-controlled Territory, after Tactics are revealed: +1 Tactic from Hand. Lose — Retreat +1. Win — Choose one:\nBreakthrough — Opponent: Retreat +1, if able; then you advance one Position.\nConsolidate — Capture that Territory, if able; Command = 2.\n\nAfterward, you cannot move, advance your Front Line, or use an Order as a result of this victory.\nIn the Aftermath, put both cards in your Graveyard.' as const;

export const V070_FROZEN_SHOCK_AND_AWE_BATTLE_TEXT =
  V070_SHOCK_AND_AWE_BATTLE_TEXT.replace(
    'Consolidate — Capture that Territory, if able;',
    'Consolidate — Advance Front Line 1, if able;',
  );

export const V070_SHOCK_AND_AWE_ASSET_TEXT =
  'During Onset, you may put this card in your Graveyard to apply its Gambit/Tactic effect after Tactics are revealed.' as const;

export interface V070ShockAndAwePendingEffect {
  owner: PlayerId;
  sourceInstanceId: string;
  sourceMode: 'gambit' | 'tactic' | 'onset_asset';
  chosenTacticInstanceId: string | null;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    shockAndAwePendingEffects?: V070ShockAndAwePendingEffect[];
  }
}

export function assertV070ShockAndAweAuthority(): void {
  for (const [release, content] of [
    ['frozen v0.7.0', v070CanonicalContent],
    ['current', currentCanonicalContent],
  ] as const) {
    const effects = content.cardsById.get(V070_SHOCK_AND_AWE_ID)?.effects;
    if (effects?.find(e => e.label === 'Gambit/Tactic')?.text
      !== (release === 'frozen v0.7.0'
        ? V070_FROZEN_SHOCK_AND_AWE_BATTLE_TEXT
        : V070_SHOCK_AND_AWE_BATTLE_TEXT)
      || effects.find(e => e.label === 'Asset')?.text
      !== V070_SHOCK_AND_AWE_ASSET_TEXT) {
      throw new Error(
        `Shock and Awe card text drifted from ${release} authority.`,
      );
    }
  }
}

function requireBattle(state: V070GameState) {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Shock and Awe requires an active battle.',
    );
  }
  return { battle: state.battle, runtime: state.battleRuntime };
}

export function v070ShockAndAweAttackCondition(
  state: V070GameState,
  owner: PlayerId,
): boolean {
  const { battle } = requireBattle(state);
  const contested = state.board.find(
    t => t.position === battle.contestedPosition,
  );
  return battle.attacker === owner
    && contested?.controller !== owner
    && contested?.controller === battle.defender;
}

/**
 * Preparation only. This does not register Shock and Awe as supported in
 * battle-effects.ts. The mandatory Breakthrough alternative and its collision
 * with other end-of-Aftermath movement remain blocked by rules issue #1953.
 */
export function prepareV070ShockAndAweBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceMode: V070ShockAndAwePendingEffect['sourceMode'],
): boolean {
  assertV070ShockAndAweAuthority();
  const { runtime } = requireBattle(state);
  if (!v070ShockAndAweAttackCondition(state, owner)) {
    appendV070Event(state, {
      type: 'shock_and_awe_condition_not_met',
      actor: owner,
      visibility: 'public',
      payload: { sourceInstanceId, sourceMode },
    });
    return false;
  }
  if (runtime.shockAndAwePendingEffects?.some(
    e => e.sourceInstanceId === sourceInstanceId,
  )) return true;

  runtime.shockAndAwePendingEffects ??= [];
  runtime.shockAndAwePendingEffects.push({
    owner,
    sourceInstanceId,
    sourceMode,
    chosenTacticInstanceId: null,
  });

  // A Retreat bonus is attached to the actual losing player and is therefore
  // observed only if a real normal Retreat occurs. Paths of Shadow is not one.
  runtime.additionalRetreatEffects.push({
    sourceInstanceId,
    sourceCardId: V070_SHOCK_AND_AWE_ID,
    targetPlayer: owner,
    steps: 1,
  });

  if (sourceMode !== 'onset_asset') {
    const existing = runtime.battleCardAftermathDestinationOverrides.find(
      e => e.instanceId === sourceInstanceId && e.playerId === owner,
    );
    if (existing) existing.destination = 'graveyard';
    else runtime.battleCardAftermathDestinationOverrides.push({
      sourceCardId: V070_SHOCK_AND_AWE_ID,
      playerId: owner,
      instanceId: sourceInstanceId,
      destination: 'graveyard',
    });
  }

  const handCandidates = state.players[owner].zones.hand.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    return Boolean(cardId && currentCanonicalContent.cardsById.get(cardId)
      ?.effects.some(effect =>
        effect.label === 'Tactic' || effect.label === 'Gambit/Tactic'
      ));
  });
  if (handCandidates.length > 0) {
    queueV070LateAdditionalTacticBattleRevealChoice(state, {
      kind: 'late_additional_tactic',
      owner,
      sourceInstanceId,
      sourceCardId: V070_SHOCK_AND_AWE_ID,
      candidateInstanceIds: handCandidates,
      candidateZone: 'hand',
      chosenDestination: 'graveyard',
    });
  }

  appendV070Event(state, {
    type: 'shock_and_awe_post_tactics_prepared',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceMode,
      candidateTacticCount: handCandidates.length,
    },
  });
  return true;
}

/**
 * One mechanically complete win option, kept out of the live battle handler
 * until the other mandatory win option can be implemented without assuming
 * the answer to #1953.
 */
export function resolveV070ShockAndAweConsolidate(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): { captured: boolean; reachedOpponentEnd: boolean } {
  const { battle, runtime } = requireBattle(state);
  if (runtime.stage !== 'aftermath' || battle.winner !== owner) {
    throw new V070GameActionError(
      'Consolidate requires winning with Shock and Awe in the Aftermath.',
    );
  }
  const pending = runtime.shockAndAwePendingEffects?.find(
    e => e.owner === owner && e.sourceInstanceId === sourceInstanceId,
  );
  if (!pending) {
    throw new V070GameActionError('Shock and Awe is not pending.');
  }
  const target = state.board.find(
    t => t.position === battle.contestedPosition,
  );
  const next = nextV070FrontLineTarget(state, owner);
  const canCapture = Boolean(
    target && target.controller !== owner
    && next?.territoryInstanceId === target.territoryInstanceId
    && !v070VictoryResultBenefitProhibited(state, owner, 'capture'),
  );
  const result = canCapture
    ? advanceV070FrontLine(
        state, owner, 1, 'Shock and Awe — Consolidate',
      )
    : { captures: [], reachedOpponentEnd: false };
  const captured = result.captures.some(
    c => c.position === battle.contestedPosition,
  );
  if (captured) {
    recordV070VictoryResultBenefit(state, owner, 'capture');
    battle.occupier = null;
    if (result.reachedOpponentEnd) {
      runtime.pendingGameVictory = {
        winner: owner,
        route: 'final_territory_capture',
      };
    }
  }
  const military = state.players[owner].military;
  if (military) military.command = 2;

  imposeV070VictoryResultRestrictions(
    state, owner, sourceInstanceId, {
      noMovement: true,
      noCapture: true,
      noOrders: true,
    },
  );
  runtime.shockAndAwePendingEffects =
    (runtime.shockAndAwePendingEffects ?? []).filter(
      e => e.sourceInstanceId !== sourceInstanceId,
    );
  appendV070Event(state, {
    type: 'shock_and_awe_consolidated',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      captured,
      command: military?.command ?? null,
      reachedOpponentEnd: result.reachedOpponentEnd,
    },
  });
  return {
    captured,
    reachedOpponentEnd: result.reachedOpponentEnd,
  };
}

export function v070ShockAndAwePreparedSource(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): boolean {
  return Boolean(
    state.battleRuntime?.shockAndAwePendingEffects?.some(
      effect => effect.sourceInstanceId === commitment.instanceId
        && effect.owner === commitment.owner
        && effect.sourceMode === commitment.role,
    ),
  );
}
