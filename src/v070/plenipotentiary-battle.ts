import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { drawV070Cards } from './card-draw';
import {
  bankableV070AssetInstanceIds,
} from './assets';
import {
  bankOptionalAssetFromHand,
  discardOptionalHandCard,
  drawIntoHand,
  moveOptionalGraveyardCardToDiscard,
  proposalRequirementMet,
  revealHandTo,
} from './diplomats';
import {
  markV070BattleCardEffectApplied,
} from './battle-effect-status';
import {
  queueV070PlenipotentiaryBattleRevealChoice,
  completeV070PlenipotentiaryBattleRevealChoice,
} from './battle-reveal-choices';
import {
  advanceV070FrontLine,
  nextV070FrontLineTarget,
} from './front-line';
import {
  recordV070VictoryResultBenefit,
  v070VictoryResultBenefitProhibited,
} from './victory-result-restrictions';
import { v070MonasteryBlocksGraveyardExit } from './territories';

export const V070_PLENIPOTENTIARY_ID = 'diplomats-plenipotentiary';
export const V070_PLENIPOTENTIARY_BATTLE_TEXT =
  'If this battle follows refused Terms, apply the Refused effect of one other ratified Proposal whose requirement is met.';

export interface V070PlenipotentiaryAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
  proposalId:
    | 'capitulation'
    | 'prisoner-exchange'
    | 'rebuilding-pact'
    | 'diplomatic-recognition';
}

declare module './battle-types' {
  interface V070BattleRuntime {
    plenipotentiaryAftermathEffects?: V070PlenipotentiaryAftermathEffect[];
  }
}

function requireRuntime(state: V070GameState) {
  if (!state.battleRuntime || !state.battle) {
    throw new V070GameActionError(
      'Plenipotentiary battle resolution requires an active battle.',
    );
  }
  return state.battleRuntime;
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

function assertAuthority(): void {
  for (const content of [v070CanonicalContent, currentCanonicalContent]) {
    const card = content.cardsById.get(V070_PLENIPOTENTIARY_ID);
    const text = card?.effects.find(
      effect => effect.label === 'Gambit',
    )?.text;
    if (text !== V070_PLENIPOTENTIARY_BATTLE_TEXT) {
      throw new Error(
        'Plenipotentiary battle text drifted from the implemented authority.',
      );
    }
  }
}

function candidateProposalIds(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = requireRuntime(state);
  const battle = state.battle!;
  const context = runtime.refusedTermsContext;
  if (!context) return [];

  const ratified = state.players[owner].diplomats?.ratifiedProposals ?? [];
  const refusedProposalId = runtime.terms.proposalId;
  const opponent = otherPlayer(owner);

  return ratified.filter(proposalId => {
    if (proposalId === refusedProposalId) return false;
    const proposal = v070CanonicalContent.proposalsById.get(proposalId);
    return Boolean(
      proposal
      && proposalRequirementMet(
        state,
        owner,
        opponent,
        battle.attacker,
        proposal,
      ),
    );
  });
}

function addReserveCard(
  state: V070GameState,
  owner: PlayerId,
  proposalId: string,
): void {
  const runtime = requireRuntime(state);
  const result = drawV070Cards(
    state,
    owner,
    1,
    `Plenipotentiary: ${proposalId} Refused effect`,
  );
  runtime.participants[owner].reserve.push(...result.drawn);
  appendV070Event(state, {
    type: 'proposal_reserve_bonus',
    actor: owner,
    visibility: 'public',
    payload: {
      proposalId,
      amount: result.drawn.length,
      sourceCardId: V070_PLENIPOTENTIARY_ID,
      immediate: true,
    },
  });
  if (result.drawn.length > 0) {
    appendV070Event(state, {
      type: 'battle_reserve_card_identity',
      actor: owner,
      visibility: owner,
      payload: {
        proposalId,
        sourceCardId: V070_PLENIPOTENTIARY_ID,
        instanceIds: [...result.drawn],
      },
    });
  }
}

function registerAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  proposalId: V070PlenipotentiaryAftermathEffect['proposalId'],
): void {
  const runtime = requireRuntime(state);
  runtime.plenipotentiaryAftermathEffects ??= [];
  runtime.plenipotentiaryAftermathEffects.push({
    owner,
    sourceInstanceId,
    proposalId,
  });
}

export function registerV070PlenipotentiaryBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  assertAuthority();
  const candidates = candidateProposalIds(state, owner);
  if (candidates.length === 0) {
    markV070BattleCardEffectApplied(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'plenipotentiary_battle_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_PLENIPOTENTIARY_ID,
        reason: 'no_eligible_other_ratified_proposal',
      },
    });
    return;
  }

  queueV070PlenipotentiaryBattleRevealChoice(state, {
    kind: 'plenipotentiary',
    owner,
    sourceInstanceId,
    candidateProposalIds: candidates,
  });
}

export function resolveV070PlenipotentiaryBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  proposalId: string,
  discardInstanceId?: string,
): void {
  const pending = completeV070PlenipotentiaryBattleRevealChoice(state);
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Plenipotentiary controller may choose its Proposal.',
    );
  }
  const currentCandidates = candidateProposalIds(state, playerId);
  if (!pending.candidateProposalIds.includes(proposalId)
    || !currentCandidates.includes(proposalId)) {
    throw new V070GameActionError(
      'That Proposal is not an eligible Plenipotentiary choice.',
    );
  }

  const runtime = requireRuntime(state);
  const refusingPlayer = runtime.refusedTermsContext?.opponent;
  if (!refusingPlayer) {
    throw new V070GameActionError(
      'Plenipotentiary requires a battle following refused Terms.',
    );
  }
  switch (proposalId) {
    case 'de-escalation':
      if (discardInstanceId) {
        throw new V070GameActionError(
          'A Hand discard applies only to Mutual Disarmament.',
        );
      }
      drawIntoHand(
        state,
        playerId,
        1,
        'Plenipotentiary: De-escalation Refused effect',
      );
      break;
    case 'orderly-withdrawal':
    case 'ultimatum':
      if (discardInstanceId) {
        throw new V070GameActionError(
          'A Hand discard applies only to Mutual Disarmament.',
        );
      }
      runtime.participants[playerId].battleModifier += 1;
      break;
    case 'open-channels':
      if (discardInstanceId) {
        throw new V070GameActionError(
          'A Hand discard applies only to Mutual Disarmament.',
        );
      }
      revealHandTo(state, refusingPlayer, playerId);
      addReserveCard(state, playerId, proposalId);
      break;
    case 'mutual-disarmament':
      if (discardInstanceId) {
        discardOptionalHandCard(
          state,
          playerId,
          discardInstanceId,
          'Plenipotentiary: Mutual Disarmament Refused effect',
        );
        addReserveCard(state, playerId, proposalId);
      }
      break;
    case 'capitulation':
    case 'prisoner-exchange':
    case 'rebuilding-pact':
    case 'diplomatic-recognition':
      if (discardInstanceId) {
        throw new V070GameActionError(
          'A Hand discard applies only to Mutual Disarmament.',
        );
      }
      registerAftermathEffect(
        state,
        playerId,
        pending.sourceInstanceId,
        proposalId,
      );
      break;
    default:
      throw new V070GameActionError(
        'That Proposal has no implemented Plenipotentiary Refused effect.',
      );
  }

  markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
  appendV070Event(state, {
    type: 'plenipotentiary_battle_proposal_selected',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_PLENIPOTENTIARY_ID,
      proposalId,
      mutualDisarmamentDiscarded: proposalId === 'mutual-disarmament'
        ? Boolean(discardInstanceId)
        : undefined,
    },
  });
}

export function applyV070PlenipotentiaryBattleOutcome(
  state: V070GameState,
  outcome: { winner: PlayerId; loser: PlayerId },
): void {
  const runtime = requireRuntime(state);
  const effects = runtime.plenipotentiaryAftermathEffects ?? [];
  const capitulations = effects.filter(
    effect => effect.proposalId === 'capitulation',
  );
  runtime.plenipotentiaryAftermathEffects = effects.filter(
    effect => effect.proposalId !== 'capitulation',
  );

  for (const effect of capitulations) {
    if (outcome.loser !== effect.owner) continue;
    drawIntoHand(
      state,
      effect.owner,
      2,
      'Plenipotentiary: Capitulation Refused-loss effect',
    );
    appendV070Event(state, {
      type: 'plenipotentiary_battle_outcome_resolved',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        sourceCardId: V070_PLENIPOTENTIARY_ID,
        proposalId: effect.proposalId,
        winner: outcome.winner,
        loser: outcome.loser,
      },
    });
  }
}

export function v070PlenipotentiaryAftermathEffects(
  state: V070GameState,
): V070PlenipotentiaryAftermathEffect[] {
  return (state.battleRuntime?.plenipotentiaryAftermathEffects ?? [])
    .map(effect => ({ ...effect }));
}

export function v070PlenipotentiaryAftermathTargetInstanceIds(
  state: V070GameState,
  effect: V070PlenipotentiaryAftermathEffect,
): string[] {
  if (effect.proposalId === 'prisoner-exchange') {
    if (v070MonasteryBlocksGraveyardExit(state)) return [];
    return [...state.players[effect.owner].zones.graveyard];
  }
  if (effect.proposalId === 'rebuilding-pact') {
    return bankableV070AssetInstanceIds(state, effect.owner);
  }
  return [];
}

export function v070PlenipotentiaryAftermathEffectEligible(
  state: V070GameState,
  effect: V070PlenipotentiaryAftermathEffect,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath') return false;
  if (effect.proposalId === 'capitulation') return false;
  if (effect.proposalId === 'prisoner-exchange') {
    return battle.loser === effect.owner
      && v070PlenipotentiaryAftermathTargetInstanceIds(
        state,
        effect,
      ).length > 0;
  }
  if (effect.proposalId === 'rebuilding-pact') {
    return v070PlenipotentiaryAftermathTargetInstanceIds(
      state,
      effect,
    ).length > 0;
  }
  if (battle.winner !== effect.owner
    || v070VictoryResultBenefitProhibited(
      state,
      effect.owner,
      'capture',
    )) {
    return false;
  }
  const territory = state.board.find(
    space => space.position === battle.contestedPosition,
  );
  const target = nextV070FrontLineTarget(state, effect.owner);
  return Boolean(
    territory
    && territory.occupant === effect.owner
    && territory.controller !== effect.owner
    && target?.territoryInstanceId === territory.territoryInstanceId,
  );
}

export function v070PlenipotentiaryAftermathEffectIsOptional(
  effect: V070PlenipotentiaryAftermathEffect,
): boolean {
  return effect.proposalId === 'prisoner-exchange'
    || effect.proposalId === 'rebuilding-pact';
}

function takeAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): V070PlenipotentiaryAftermathEffect {
  const runtime = requireRuntime(state);
  const effects = runtime.plenipotentiaryAftermathEffects ?? [];
  const index = effects.findIndex(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (index < 0) {
    throw new V070GameActionError(
      'That Plenipotentiary Aftermath effect is no longer pending.',
    );
  }
  const [effect] = effects.splice(index, 1);
  return effect;
}

export function resolveV070PlenipotentiaryAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId?: string,
  replaceAssetInstanceId?: string,
): void {
  const pending = v070PlenipotentiaryAftermathEffects(state).find(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (!pending || !v070PlenipotentiaryAftermathEffectEligible(state, pending)) {
    throw new V070GameActionError(
      'That Plenipotentiary Aftermath effect is not currently eligible.',
    );
  }

  if (pending.proposalId === 'prisoner-exchange') {
    if (replaceAssetInstanceId) {
      throw new V070GameActionError(
        'Prisoner Exchange cannot replace an Asset.',
      );
    }
    const candidates = v070PlenipotentiaryAftermathTargetInstanceIds(
      state,
      pending,
    );
    if (!targetInstanceId || !candidates.includes(targetInstanceId)) {
      throw new V070GameActionError(
        'Choose an eligible Graveyard card for Prisoner Exchange.',
      );
    }
    takeAftermathEffect(state, owner, sourceInstanceId);
    moveOptionalGraveyardCardToDiscard(
      state,
      owner,
      targetInstanceId,
      'Plenipotentiary: Prisoner Exchange Refused-loss effect',
    );
  } else if (pending.proposalId === 'rebuilding-pact') {
    const candidates = v070PlenipotentiaryAftermathTargetInstanceIds(
      state,
      pending,
    );
    if (!targetInstanceId || !candidates.includes(targetInstanceId)) {
      throw new V070GameActionError(
        'Choose an eligible Hand card to bank for Rebuilding Pact.',
      );
    }
    takeAftermathEffect(state, owner, sourceInstanceId);
    bankOptionalAssetFromHand(
      state,
      owner,
      targetInstanceId,
      replaceAssetInstanceId,
      'Plenipotentiary: Rebuilding Pact Refused Aftermath effect',
    );
  } else {
    if (targetInstanceId || replaceAssetInstanceId) {
      throw new V070GameActionError(
        'Diplomatic Recognition does not choose an Aftermath card.',
      );
    }
    const battle = state.battle!;
    const territory = state.board.find(
      space => space.position === battle.contestedPosition,
    );
    takeAftermathEffect(state, owner, sourceInstanceId);
    if (territory) {
      const result = advanceV070FrontLine(
        state,
        owner,
        1,
        'Plenipotentiary: Diplomatic Recognition Refused effect',
      );
      if (result.captures.some(
        capture => capture.position === territory.position,
      )) {
        recordV070VictoryResultBenefit(state, owner, 'capture');
      }
    }
  }

  appendV070Event(state, {
    type: 'plenipotentiary_battle_aftermath_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_PLENIPOTENTIARY_ID,
      proposalId: pending.proposalId,
      targetInstanceId: targetInstanceId ?? null,
    },
  });
}

export function declineV070PlenipotentiaryAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const pending = v070PlenipotentiaryAftermathEffects(state).find(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (!pending || !v070PlenipotentiaryAftermathEffectIsOptional(pending)) {
    throw new V070GameActionError(
      'That Plenipotentiary Aftermath effect cannot be declined.',
    );
  }
  takeAftermathEffect(state, owner, sourceInstanceId);
}
