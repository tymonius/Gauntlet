import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  gainV070Capital,
  makeV070DeedUnowned,
  removeV070CardFromTreasury,
  useV070ImmediateSubsidize,
  v070DeedsOwned,
  v070FinancierCardValue,
  v070MaximumSubsidizeBonus,
  v070SubsidizeBonusThisBattle,
} from './financiers';
import {
  bindV070CardFromPlayerZone,
  releaseV070BoundCardsForPurpose,
} from './bindings';
import {
  completeV070FinancierPreDiceBattleRevealChoice,
  pendingV070BattleRevealChoice,
  queueV070FinancierPreDiceBattleRevealChoice,
} from './battle-reveal-choices';

export const V070_DIVESTMENT_ID = 'financiers-divestment' as const;
export const V070_LIQUIDATION_ID = 'financiers-liquidation' as const;
export const V070_MARGIN_LOAN_ID = 'financiers-margin-loan' as const;

export const V070_DIVESTMENT_BATTLE_TEXT =
  'Before dice are rolled, you may make one Deed you own unowned to gain Capital equal to the number of Deeds you owned before doing so, then you may immediately Subsidize.' as const;
export const V070_LIQUIDATION_BATTLE_TEXT =
  'Before dice are rolled, you may put one card from your Treasury in your Discard Pile to gain Capital equal to its value, then you may immediately Subsidize.' as const;
export const V070_MARGIN_LOAN_BATTLE_TEXT =
  'Before dice are rolled, you may bind 1 card from your Hand or Treasury to this card face up as collateral to gain Capital equal to its value; you may then Subsidize. In the Aftermath: Win — return collateral to your Hand. Otherwise — Default.' as const;

const MARGIN_LOAN_BATTLE_PURPOSE = 'Margin Loan battle collateral';

export interface V070MarginLoanBattleAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    marginLoanBattleAftermathEffects?: V070MarginLoanBattleAftermathEffect[];
  }
}

function validateFinancierPreDiceAuthority(): void {
  for (const [cardId, expectedText] of [
    [V070_DIVESTMENT_ID, V070_DIVESTMENT_BATTLE_TEXT],
    [V070_LIQUIDATION_ID, V070_LIQUIDATION_BATTLE_TEXT],
    [V070_MARGIN_LOAN_ID, V070_MARGIN_LOAN_BATTLE_TEXT],
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
        `${cardId} battle text drifted between frozen and current authority.`,
      );
    }
  }
}

validateFinancierPreDiceAuthority();

export function registerV070DivestmentBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  assertSource(state, owner, sourceInstanceId, V070_DIVESTMENT_ID);
  const candidateTerritoryInstanceIds = state.deeds
    .filter(deed => deed.owner === owner)
    .map(deed => deed.territoryInstanceId);
  if (candidateTerritoryInstanceIds.length === 0) {
    appendUnavailable(
      state,
      owner,
      sourceInstanceId,
      V070_DIVESTMENT_ID,
      'no_owned_deeds',
    );
    return;
  }

  queueV070FinancierPreDiceBattleRevealChoice(state, {
    kind: 'financier_divestment',
    owner,
    sourceInstanceId,
    candidateTerritoryInstanceIds,
  });
  appendV070Event(state, {
    type: 'financier_divestment_battle_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_DIVESTMENT_ID,
      candidateCount: candidateTerritoryInstanceIds.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'financier_divestment_battle_choice_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      territoryInstanceIds: [...candidateTerritoryInstanceIds],
    },
  });
}

export function registerV070LiquidationBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  assertSource(state, owner, sourceInstanceId, V070_LIQUIDATION_ID);
  const candidateInstanceIds = [
    ...(state.players[owner].financiers?.treasury ?? []),
  ];
  if (candidateInstanceIds.length === 0) {
    appendUnavailable(
      state,
      owner,
      sourceInstanceId,
      V070_LIQUIDATION_ID,
      'treasury_empty',
    );
    return;
  }

  queueV070FinancierPreDiceBattleRevealChoice(state, {
    kind: 'financier_liquidation',
    owner,
    sourceInstanceId,
    candidateInstanceIds,
  });
  appendV070Event(state, {
    type: 'financier_liquidation_battle_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_LIQUIDATION_ID,
      candidateCount: candidateInstanceIds.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'financier_liquidation_battle_choice_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      cardInstanceIds: [...candidateInstanceIds],
    },
  });
}

export function registerV070MarginLoanBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  assertSource(state, owner, sourceInstanceId, V070_MARGIN_LOAN_ID);
  const financier = state.players[owner].financiers;
  const candidateInstanceIds = [
    ...state.players[owner].zones.hand,
    ...(financier?.treasury ?? []),
  ];
  if (candidateInstanceIds.length === 0) {
    appendUnavailable(
      state,
      owner,
      sourceInstanceId,
      V070_MARGIN_LOAN_ID,
      'no_collateral_available',
    );
    return;
  }

  queueV070FinancierPreDiceBattleRevealChoice(state, {
    kind: 'financier_margin_loan',
    owner,
    sourceInstanceId,
    candidateInstanceIds,
  });
  appendV070Event(state, {
    type: 'financier_margin_loan_battle_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_MARGIN_LOAN_ID,
      candidateCount: candidateInstanceIds.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'financier_margin_loan_battle_choice_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      cardInstanceIds: [...candidateInstanceIds],
    },
  });
}

export function resolveV070DivestmentBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  territoryInstanceId?: string,
): void {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind !== 'financier_divestment') {
    throw new V070GameActionError(
      'No Divestment battle choice is pending.',
    );
  }
  assertOwner(pending.owner, playerId, 'Divestment');

  if (territoryInstanceId === undefined) {
    completeV070FinancierPreDiceBattleRevealChoice(
      state,
      'financier_divestment',
    );
    appendDeclined(
      state,
      playerId,
      pending.sourceInstanceId,
      V070_DIVESTMENT_ID,
    );
    return;
  }
  if (!pending.candidateTerritoryInstanceIds.includes(
    territoryInstanceId,
  )) {
    throw new V070GameActionError(
      'That Deed was not eligible for this Divestment battle effect.',
    );
  }
  const deed = state.deeds.find(
    candidate => candidate.territoryInstanceId === territoryInstanceId,
  );
  if (!deed || deed.owner !== playerId) {
    throw new V070GameActionError(
      'The selected Divestment Deed is no longer owned by that player.',
    );
  }

  const deedCountBefore = v070DeedsOwned(state, playerId);
  makeV070DeedUnowned(
    state,
    territoryInstanceId,
    'Divestment battle effect',
  );
  gainV070Capital(
    state,
    playerId,
    deedCountBefore,
    'Divestment battle effect',
  );
  completeV070FinancierPreDiceBattleRevealChoice(
    state,
    'financier_divestment',
  );

  appendV070Event(state, {
    type: 'financier_divestment_battle_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_DIVESTMENT_ID,
      territoryInstanceId,
      deedCountBefore,
      capitalGained: deedCountBefore,
    },
  });
  queueImmediateSubsidize(
    state,
    playerId,
    pending.sourceInstanceId,
    V070_DIVESTMENT_ID,
  );
}

export function resolveV070LiquidationBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId?: string,
): void {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind !== 'financier_liquidation') {
    throw new V070GameActionError(
      'No Liquidation battle choice is pending.',
    );
  }
  assertOwner(pending.owner, playerId, 'Liquidation');

  if (cardInstanceId === undefined) {
    completeV070FinancierPreDiceBattleRevealChoice(
      state,
      'financier_liquidation',
    );
    appendDeclined(
      state,
      playerId,
      pending.sourceInstanceId,
      V070_LIQUIDATION_ID,
    );
    return;
  }
  if (!pending.candidateInstanceIds.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'That Treasury card was not eligible for this Liquidation battle effect.',
    );
  }
  if (!state.players[playerId].financiers?.treasury.includes(
    cardInstanceId,
  )) {
    throw new V070GameActionError(
      'The selected Liquidation card is no longer in Treasury.',
    );
  }

  const value = v070FinancierCardValue(state, cardInstanceId);
  removeV070CardFromTreasury(
    state,
    playerId,
    cardInstanceId,
    'discard',
    'Liquidation battle effect',
  );
  gainV070Capital(
    state,
    playerId,
    value,
    'Liquidation battle effect',
  );
  completeV070FinancierPreDiceBattleRevealChoice(
    state,
    'financier_liquidation',
  );

  appendV070Event(state, {
    type: 'financier_liquidation_battle_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_LIQUIDATION_ID,
      targetInstanceId: cardInstanceId,
      targetCardId: state.cardInstances[cardInstanceId]?.cardId ?? null,
      value,
      capitalGained: value,
    },
  });
  queueImmediateSubsidize(
    state,
    playerId,
    pending.sourceInstanceId,
    V070_LIQUIDATION_ID,
  );
}

export function resolveV070MarginLoanBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId?: string,
): void {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind !== 'financier_margin_loan') {
    throw new V070GameActionError(
      'No Margin Loan battle choice is pending.',
    );
  }
  assertOwner(pending.owner, playerId, 'Margin Loan');

  if (cardInstanceId === undefined) {
    completeV070FinancierPreDiceBattleRevealChoice(
      state,
      'financier_margin_loan',
    );
    appendDeclined(
      state,
      playerId,
      pending.sourceInstanceId,
      V070_MARGIN_LOAN_ID,
    );
    return;
  }
  if (!pending.candidateInstanceIds.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'That card was not eligible as Margin Loan battle collateral.',
    );
  }

  const hand = state.players[playerId].zones.hand;
  const treasury = state.players[playerId].financiers?.treasury ?? [];
  const sourceZone = hand.includes(cardInstanceId)
    ? 'hand'
    : treasury.includes(cardInstanceId)
      ? 'treasury'
      : null;
  if (!sourceZone) {
    throw new V070GameActionError(
      'The selected Margin Loan collateral is no longer in Hand or Treasury.',
    );
  }

  const value = v070FinancierCardValue(state, cardInstanceId);
  bindV070CardFromPlayerZone(state, {
    hostId: pending.sourceInstanceId,
    owner: playerId,
    cardInstanceId,
    sourceZone,
    faceUp: true,
    purpose: MARGIN_LOAN_BATTLE_PURPOSE,
  });
  gainV070Capital(
    state,
    playerId,
    value,
    'Margin Loan battle effect',
  );

  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Margin Loan battle effect requires an active battle runtime.',
    );
  }
  runtime.marginLoanBattleAftermathEffects ??= [];
  runtime.marginLoanBattleAftermathEffects.push({
    owner: playerId,
    sourceInstanceId: pending.sourceInstanceId,
  });

  completeV070FinancierPreDiceBattleRevealChoice(
    state,
    'financier_margin_loan',
  );
  appendV070Event(state, {
    type: 'financier_margin_loan_battle_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_MARGIN_LOAN_ID,
      collateralInstanceId: cardInstanceId,
      collateralCardId: state.cardInstances[cardInstanceId]?.cardId ?? null,
      collateralValue: value,
      collateralSource: sourceZone,
      capitalGained: value,
    },
  });
  queueImmediateSubsidize(
    state,
    playerId,
    pending.sourceInstanceId,
    V070_MARGIN_LOAN_ID,
  );
}

export function resolveV070FinancierImmediateSubsidizeChoice(
  state: V070GameState,
  playerId: PlayerId,
  bonus: number,
): void {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind !== 'financier_immediate_subsidize') {
    throw new V070GameActionError(
      'No card-granted immediate Subsidize choice is pending.',
    );
  }
  assertOwner(pending.owner, playerId, 'Immediate Subsidize');
  if (!Number.isInteger(bonus)
    || bonus < pending.minimumBonus
    || bonus > pending.maximumBonus) {
    throw new V070GameActionError(
      `Immediate Subsidize must choose a total bonus from +${pending.minimumBonus} through +${pending.maximumBonus}.`,
    );
  }

  completeV070FinancierPreDiceBattleRevealChoice(
    state,
    'financier_immediate_subsidize',
  );
  if (bonus === pending.minimumBonus) {
    appendV070Event(state, {
      type: 'financier_immediate_subsidize_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: pending.sourceCardId,
        existingBonus: pending.minimumBonus,
      },
    });
    return;
  }

  useV070ImmediateSubsidize(state, playerId, bonus);
  appendV070Event(state, {
    type: 'financier_immediate_subsidize_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: pending.sourceCardId,
      previousBonus: pending.minimumBonus,
      bonus,
    },
  });
}

export function applyV070MarginLoanBattleAftermathEffects(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath') return;
  const effects = runtime.marginLoanBattleAftermathEffects ?? [];
  if (effects.length === 0) return;

  runtime.marginLoanBattleAftermathEffects = [];
  for (const effect of effects) {
    if (battle.winner === effect.owner) {
      const returned = releaseV070BoundCardsForPurpose(
        state,
        effect.sourceInstanceId,
        MARGIN_LOAN_BATTLE_PURPOSE,
        'hand',
        'Margin Loan battle win',
      );
      appendV070Event(state, {
        type: 'financier_margin_loan_battle_collateral_returned',
        actor: effect.owner,
        visibility: 'public',
        payload: {
          sourceInstanceId: effect.sourceInstanceId,
          sourceCardId: V070_MARGIN_LOAN_ID,
          collateralInstanceIds: returned,
        },
      });
      continue;
    }

    const defaulted = releaseV070BoundCardsForPurpose(
      state,
      effect.sourceInstanceId,
      MARGIN_LOAN_BATTLE_PURPOSE,
      'graveyard',
      'Margin Loan battle Default',
    );
    runtime.battleCardAftermathDestinationOverrides.push({
      sourceCardId: V070_MARGIN_LOAN_ID,
      playerId: effect.owner,
      instanceId: effect.sourceInstanceId,
      destination: 'graveyard',
    });
    appendV070Event(state, {
      type: 'financier_margin_loan_battle_defaulted',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        sourceCardId: V070_MARGIN_LOAN_ID,
        collateralInstanceIds: defaulted,
        winner: battle.winner,
      },
    });
  }
}

function queueImmediateSubsidize(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
): void {
  const minimumBonus = v070SubsidizeBonusThisBattle(state, owner);
  const maximumBonus = v070MaximumSubsidizeBonus(state, owner);
  if (maximumBonus <= minimumBonus) {
    appendV070Event(state, {
      type: 'financier_immediate_subsidize_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId,
        existingBonus: minimumBonus,
        reason: 'insufficient_capital_for_additional_bonus',
      },
    });
    return;
  }

  queueV070FinancierPreDiceBattleRevealChoice(state, {
    kind: 'financier_immediate_subsidize',
    owner,
    sourceInstanceId,
    sourceCardId,
    minimumBonus,
    maximumBonus,
  });
  appendV070Event(state, {
    type: 'financier_immediate_subsidize_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId,
      existingBonus: minimumBonus,
      maximumBonus,
      optional: true,
    },
  });
}

function assertSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Financier pre-dice battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== sourceCardId) {
    throw new V070GameActionError(
      'Financier pre-dice battle source does not match the revealed card instance.',
    );
  }
}

function assertOwner(
  owner: PlayerId,
  playerId: PlayerId,
  label: string,
): void {
  if (owner !== playerId) {
    throw new V070GameActionError(
      `Only the ${label} owner may resolve that battle choice.`,
    );
  }
}

function appendUnavailable(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
  reason: string,
): void {
  appendV070Event(state, {
    type: 'financier_pre_dice_battle_choice_unavailable',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId,
      reason,
    },
  });
}

function appendDeclined(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
): void {
  appendV070Event(state, {
    type: 'financier_pre_dice_battle_choice_declined',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId,
    },
  });
}
