import { v070CanonicalContent } from '../content/v070';
import {
  advanceV070TurnPhase,
  applyV070BattleOutcome,
  defenderHasV070DefensiveEdge,
  proceedV070ToGambits,
  resolveV070BattleOutcome,
  resolveV070Withdrawal,
  type PlayerId,
  type V070BattleOutcome,
} from './rules';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  completeV070RelentlessPursuitTransition,
  drawV070Cards,
} from './turn-engine';
import {
  applyV070BattleCardAdditionalRetreats,
  resolveV070AftermathDrawEffects,
  resolveV070SupportedRevealEffects,
  resolveV070UnbrokenRanksCommand,
} from './battle-effects';
import {
  activeV070OverlayAtBattleOnset,
  resolveV070OverlayAfterBattle,
} from './overlays';
import {
  applyV070Leverage,
  initializeV070TermsWindow,
  offerV070Terms,
  passV070Terms,
  respondToV070Terms,
  resolveV070PoliticalCapital,
  resolveV070ProposalChoice,
  useV070DiplomaticLatitude,
  useV070DiplomaticDivination,
  useV070TradeConcessions,
  useV070GoodFaith,
  useV070NonbindingResolution,
  useV070GunboatDiplomacy,
  useV070NeutralObserversAfterRefusal,
  resolveV070TermsCardChoice,
  useV070PlenipotentiaryAfterRefusal,
  settleV070RefusedTermsOutcome,
  settleV070RefusedTermsWithoutWinner,
  v070LeverageRequiresDecision,
  v070PoliticalCapitalPending,
  v070ProposalChoicePending,
  v070TermsReadyForGambits,
} from './diplomats';
import {
  createV070BattleRuntime,
  type V070BattleCardCommitment,
  type V070BattleRuntime
} from './battle-types';
import { resolveV070AssetLimitRemoval } from './assets';
import {
  recordV070ExecutiveHostileTakeoverEligibility,
  resolveV070CapitalGainsOnBattleLoss,
} from './financiers';
import {
  recordV070IntelligenceBattleOutcomeForMission,
  useV070RangerFieldcraft,
} from './intelligence';
import {
  clearV070AccursedWagersForCurrentBattle,
  v070AccursedWagersForCurrentBattle,
} from './accursed-wager';
import {
  activeV070PrintedBattleTerritory,
  applyV070CoreBattleTerritoryEffects,
  chooseV070DisruptedSupplyLinesActiveAsset,
  applyV070AdvancedBattleTerritoryEffects,
  applyV070NoQuarterAdditionalRetreat,
  V070_ARENA_SPOILS_OF_WAR_ID,
  V070_FIELD_HOSPITAL_ID,
  V070_OLD_BATTLEFIELD_ID,
  V070_POISONOUS_GAS_ID,
  v070DisruptedSupplyLinesSelectionRequired,
} from './territories';
import { releaseV070SmugglersRunStashForUse } from './smugglers-run';
import {
  useV070SanctionsBlockadeInAftermath,
  useV070SanctionsCensureAfterRefusal,
  useV070SanctionsEmbargoAfterRefusal,
} from './sanctions';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';
import {
  clearV070AssetFaceState,
  isV070AssetActive,
} from './asset-face-state';
import {
  applyV070BlasphemyForBattleReveal,
  applyV070NormalAftermathConviction,
  v070CondemnationAppliesToPlayerTactic,
} from './inquisition';
import {
  gainV070MilitaryCommandForBattleWin,
  useV070CommandantEntrench,
  useV070CommandantFortify,
  useV070CommandantRepel,
  useV070GeneralRally,
  useV070GeneralRout,
  v070GeneralRoutAvailableAtEndOfAftermath,
} from './military';
import {
  useV070GrandInquisitorFinalJudgment,
  useV070WitchHunterRelentlessPursuit,
  v070GrandInquisitorFinalJudgmentAvailable,
  v070WitchHunterRelentlessPursuitAvailable,
} from './inquisition-leaders';
import {
  resolveV070PurgeHandChoice,
  type V070PurgePrintedCost,
} from './purge';
import {
  applyV070MysticConvergence,
  completeV070MysticBloodAfterBattleWin,
  passV070GuardiansOfTheCircle,
  prepareV070MysticLossInterruption,
  recordV070MysticCrossingEligibility,
  passV070MysticInvocation,
  resolveV070MateriaPrimaAfterAftermath,
  resolveV070MysticRitualVictory,
  useV070GuardiansOfTheCircle,
  useV070MysticInvocation,
  useV070MysticTransmutation,
  v070MysticInvocationPendingPlayers,
} from './mystics';

export const V070_NORMAL_BATTLE_DICE = 1 as const;

export type V070BattleAction =
  | { type: 'pass_terms'; playerId: PlayerId }
  | { type: 'offer_terms'; playerId: PlayerId; proposalId: string }
  | { type: 'respond_to_terms'; playerId: PlayerId; response: 'accept' | 'refuse' }
  | {
      type: 'use_diplomatic_latitude';
      playerId: PlayerId;
      cardInstanceId: string;
      secondProposalId: string;
    }
  | { type: 'use_plenipotentiary'; playerId: PlayerId; cardInstanceId: string }
  | {
      type: 'use_diplomatic_divination';
      playerId: PlayerId;
      cardInstanceId: string;
      prediction: 'accept' | 'refuse';
    }
  | { type: 'use_trade_concessions'; playerId: PlayerId; cardInstanceId: string }
  | { type: 'use_good_faith'; playerId: PlayerId; cardInstanceId: string }
  | { type: 'use_nonbinding_resolution'; playerId: PlayerId; cardInstanceId: string }
  | { type: 'use_gunboat_diplomacy'; playerId: PlayerId; cardInstanceId: string }
  | { type: 'use_neutral_observers'; playerId: PlayerId; cardInstanceId: string }
  | {
      type: 'use_sanctions_blockade';
      playerId: PlayerId;
      cardInstanceId: string;
      territoryPosition: number;
    }
  | {
      type: 'use_sanctions_censure';
      playerId: PlayerId;
      cardInstanceId: string;
      replaceAssetInstanceId?: string;
    }
  | {
      type: 'use_sanctions_embargo';
      playerId: PlayerId;
      cardInstanceId: string;
      replaceAssetInstanceId?: string;
    }
  | {
      type: 'resolve_asset_limit_removal';
      playerId: PlayerId;
      instanceIds: readonly string[];
    }
  | {
      type: 'resolve_terms_card_choice';
      playerId: PlayerId;
      choice?:
        | 'ratify'
        | 'decline_ratification'
        | 'draw_two'
        | 'bank_asset'
        | 'place_overlay'
        | 'decline_overlay';
      cardInstanceId?: string;
      replaceAssetInstanceId?: string;
    }
  | {
      type: 'resolve_proposal_choice';
      playerId: PlayerId;
      cardInstanceId?: string;
      replaceAssetInstanceId?: string;
      proposalId?: string;
    }
  | { type: 'use_leverage'; playerId: PlayerId; bonus: number }
  | { type: 'resolve_political_capital'; playerId: PlayerId; cardInstanceIds: readonly string[] }
  | { type: 'proceed_from_onset'; playerId: PlayerId }
  | { type: 'set_gambit'; playerId: PlayerId; cardInstanceId?: string }
  | { type: 'set_smugglers_run_gambit'; playerId: PlayerId }
  | { type: 'reveal_gambits'; playerId: PlayerId }
  | { type: 'choose_tactic'; playerId: PlayerId; cardInstanceId?: string }
  | { type: 'reveal_tactics'; playerId: PlayerId }
  | { type: 'submit_battle_dice'; playerId: PlayerId; values: readonly number[] }
  | { type: 'submit_tiebreak_roll'; playerId: PlayerId; value: number }
  | { type: 'use_safe_conduct'; playerId: PlayerId; cardInstanceId: string }
  | { type: 'pass_loss_replacement'; playerId: PlayerId }
  | {
      type: 'resolve_accursed_wager_discard';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'resolve_territory_aftermath_choice';
      playerId: PlayerId;
      cardInstanceId?: string;
    }
  | {
      type: 'resolve_training_grounds_redraw';
      playerId: PlayerId;
      use: boolean;
    }
  | {
      type: 'resolve_poisonous_gas_reserve_graveyard';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'choose_disrupted_supply_lines_active_asset';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | { type: 'use_general_rally'; playerId: PlayerId }
  | { type: 'use_commandant_entrench'; playerId: PlayerId }
  | { type: 'use_commandant_repel'; playerId: PlayerId }
  | { type: 'use_commandant_fortify'; playerId: PlayerId }
  | { type: 'use_general_rout'; playerId: PlayerId }
  | {
      type: 'use_mystic_transmutation';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'use_mystic_invocation';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | { type: 'pass_mystic_invocation'; playerId: PlayerId }
  | {
      type: 'use_guardians_of_the_circle';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | { type: 'pass_guardians_of_the_circle'; playerId: PlayerId }
  | {
      type: 'use_grand_inquisitor_final_judgment';
      playerId: PlayerId;
      printedCost: V070PurgePrintedCost;
      discardMode?: 'top' | 'combined';
      targetInstanceIds?: readonly string[];
      assetInstanceId?: string;
    }
  | { type: 'pass_grand_inquisitor_final_judgment'; playerId: PlayerId }
  | { type: 'use_witch_hunter_relentless_pursuit'; playerId: PlayerId }
  | { type: 'pass_witch_hunter_relentless_pursuit'; playerId: PlayerId }
  | {
      type: 'resolve_inquisition_purge_hand_choice';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'use_ranger_fieldcraft';
      playerId: PlayerId;
      territoryPosition: number;
    }
  | { type: 'complete_aftermath'; playerId: PlayerId };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  if (state.stage !== 'playing' || !state.battle || !state.activePlayer) {
    throw new V070GameActionError('Battle actions require an active v0.7.0 battle.');
  }
  if (action.playerId !== state.battle.attacker && action.playerId !== state.battle.defender) {
    throw new V070GameActionError('Only battle participants may act in this battle.');
  }
  const disruptedSelectionPlayers = [
    state.battle.attacker,
    state.battle.defender,
  ].filter(playerId =>
    v070DisruptedSupplyLinesSelectionRequired(state, playerId)
  );
  if (disruptedSelectionPlayers.length > 0
    && action.type !== 'use_ranger_fieldcraft'
    && (
      action.type !== 'choose_disrupted_supply_lines_active_asset'
      || !disruptedSelectionPlayers.includes(action.playerId)
    )) {
    throw new V070GameActionError(
      'Choose each required active Asset for Disrupted Supply Lines before continuing the battle.',
    );
  }
  if (state.battleRuntime?.pendingAccursedWager
    && action.type !== 'resolve_accursed_wager_discard') {
    throw new V070GameActionError(
      'Resolve the pending Accursed Wager discard before continuing the Aftermath.',
    );
  }
  if (state.battleRuntime?.pendingTerritoryAftermathChoice
    && action.type !== 'resolve_territory_aftermath_choice') {
    throw new V070GameActionError(
      'Resolve the pending Territory Aftermath choice before continuing the Aftermath.',
    );
  }
  if (state.battleRuntime?.pendingPoisonousGasAftermath
    && action.type !== 'resolve_poisonous_gas_reserve_graveyard') {
    throw new V070GameActionError(
      'Resolve the pending Poisonous Gas Reserve loss before continuing the Aftermath.',
    );
  }
  const invocationPlayers = v070MysticInvocationPendingPlayers(state);
  if (invocationPlayers.length > 0) {
    const resolvingInvocation =
      (action.type === 'use_mystic_invocation'
        || action.type === 'pass_mystic_invocation')
      && invocationPlayers.includes(action.playerId);
    if (!resolvingInvocation) {
      throw new V070GameActionError(
        'Resolve or decline the pending Mystics Invocation before continuing the battle.',
      );
    }
  }
  if (state.battleRuntime?.stage === 'choose_tactics'
    && state.battleRuntime.trainingGroundsRedrawPlayer
    && !state.battleRuntime.trainingGroundsRedrawResolved
    && action.type !== 'resolve_training_grounds_redraw') {
    throw new V070GameActionError(
      'Resolve the pending Training Grounds Reserve redraw choice before choosing Tactics.',
    );
  }
  if (state.pendingAssetLimitChoice && action.type !== 'resolve_asset_limit_removal') {
    throw new V070GameActionError(
      'Resolve the pending Asset-limit Removal before continuing the battle.',
    );
  }
  if (state.pendingSanctionChoices.length > 0) {
    throw new V070GameActionError(
      'Resolve the pending Sanction movement choice before continuing the battle.',
    );
  }
  if (state.pendingPurgeChoice
    && action.type !== 'resolve_inquisition_purge_hand_choice') {
    throw new V070GameActionError(
      'Resolve the pending Final Judgment Purge choice before continuing the battle.',
    );
  }
  if (state.battleRuntime?.guardiansWindowOpen
    && action.type !== 'use_guardians_of_the_circle'
    && action.type !== 'pass_guardians_of_the_circle') {
    throw new V070GameActionError(
      'Resolve or decline the pending Guardians of the Circle opportunity before continuing.',
    );
  }
  if (state.battleRuntime?.finalJudgmentWindowOpen
    && action.type !== 'use_grand_inquisitor_final_judgment'
    && action.type !== 'pass_grand_inquisitor_final_judgment') {
    throw new V070GameActionError(
      'Resolve or decline the pending Final Judgment opportunity before continuing.',
    );
  }
  if (state.battleRuntime?.relentlessPursuitWindowOpen
    && action.type !== 'use_witch_hunter_relentless_pursuit'
    && action.type !== 'pass_witch_hunter_relentless_pursuit') {
    throw new V070GameActionError(
      'Resolve or decline the pending Relentless Pursuit opportunity before continuing.',
    );
  }
  if (state.battleRuntime?.routWindowOpen
    && action.type !== 'use_general_rout'
    && action.type !== 'complete_aftermath') {
    throw new V070GameActionError(
      'Resolve or decline the pending General Rout opportunity before continuing.',
    );
  }

  const next = structuredClone(state) as V070GameState;

  if (action.type === 'use_ranger_fieldcraft' && !next.battleRuntime) {
    useV070RangerFieldcraft(
      next,
      action.playerId,
      action.territoryPosition,
    );
    ensureBattleRuntime(next);
    return next;
  }

  ensureBattleRuntime(next);

  switch (action.type) {
    case 'pass_terms':
      passV070Terms(next, action.playerId);
      break;
    case 'offer_terms':
      offerV070Terms(next, action.playerId, action.proposalId);
      break;
    case 'respond_to_terms':
      respondToV070Terms(next, action.playerId, action.response);
      break;
    case 'use_diplomatic_latitude':
      useV070DiplomaticLatitude(
        next,
        action.playerId,
        action.cardInstanceId,
        action.secondProposalId,
      );
      break;
    case 'use_plenipotentiary':
      useV070PlenipotentiaryAfterRefusal(next, action.playerId, action.cardInstanceId);
      break;
    case 'use_diplomatic_divination':
      useV070DiplomaticDivination(next, action.playerId, action.cardInstanceId, action.prediction);
      break;
    case 'use_trade_concessions':
      useV070TradeConcessions(next, action.playerId, action.cardInstanceId);
      break;
    case 'use_good_faith':
      useV070GoodFaith(next, action.playerId, action.cardInstanceId);
      break;
    case 'use_nonbinding_resolution':
      useV070NonbindingResolution(next, action.playerId, action.cardInstanceId);
      break;
    case 'use_gunboat_diplomacy':
      useV070GunboatDiplomacy(next, action.playerId, action.cardInstanceId);
      break;
    case 'use_neutral_observers':
      useV070NeutralObserversAfterRefusal(next, action.playerId, action.cardInstanceId);
      break;
    case 'use_sanctions_blockade':
      useV070SanctionsBlockadeInAftermath(
        next,
        action.playerId,
        action.cardInstanceId,
        action.territoryPosition,
      );
      break;
    case 'use_sanctions_censure':
      useV070SanctionsCensureAfterRefusal(
        next,
        action.playerId,
        action.cardInstanceId,
        action.replaceAssetInstanceId,
      );
      break;
    case 'use_sanctions_embargo':
      useV070SanctionsEmbargoAfterRefusal(
        next,
        action.playerId,
        action.cardInstanceId,
        action.replaceAssetInstanceId,
      );
      break;
    case 'resolve_asset_limit_removal':
      resolveV070AssetLimitRemoval(next, action.playerId, action.instanceIds);
      break;
    case 'resolve_terms_card_choice':
      resolveV070TermsCardChoice(
        next,
        action.playerId,
        action.choice,
        action.cardInstanceId,
        action.replaceAssetInstanceId,
      );
      break;
    case 'resolve_proposal_choice':
      resolveV070ProposalChoice(
        next,
        action.playerId,
        action.cardInstanceId,
        action.replaceAssetInstanceId,
        action.proposalId,
      );
      break;
    case 'use_leverage':
      applyV070Leverage(next, action.playerId, action.bonus);
      break;
    case 'resolve_political_capital':
      resolveV070PoliticalCapital(next, action.playerId, action.cardInstanceIds);
      break;
    case 'proceed_from_onset':
      proceedFromOnset(next, action.playerId);
      break;
    case 'set_gambit':
      setGambit(next, action.playerId, action.cardInstanceId);
      break;
    case 'set_smugglers_run_gambit':
      setSmugglersRunGambit(next, action.playerId);
      break;
    case 'reveal_gambits':
      revealBattleRole(next, action.playerId, 'gambit');
      break;
    case 'choose_tactic':
      chooseTactic(next, action.playerId, action.cardInstanceId);
      break;
    case 'reveal_tactics':
      revealBattleRole(next, action.playerId, 'tactic');
      break;
    case 'submit_battle_dice':
      submitBattleDice(next, action.playerId, action.values);
      break;
    case 'submit_tiebreak_roll':
      submitTiebreak(next, action.playerId, action.value);
      break;
    case 'use_safe_conduct':
      useSafeConduct(next, action.playerId, action.cardInstanceId);
      break;
    case 'pass_loss_replacement':
      passLossReplacement(next, action.playerId);
      break;
    case 'resolve_accursed_wager_discard':
      resolveAccursedWagerDiscard(
        next,
        action.playerId,
        action.cardInstanceId,
      );
      break;
    case 'resolve_territory_aftermath_choice':
      resolveTerritoryAftermathChoice(
        next,
        action.playerId,
        action.cardInstanceId,
      );
      break;
    case 'resolve_training_grounds_redraw':
      resolveTrainingGroundsRedraw(
        next,
        action.playerId,
        action.use,
      );
      break;
    case 'resolve_poisonous_gas_reserve_graveyard':
      resolvePoisonousGasReserveGraveyard(
        next,
        action.playerId,
        action.cardInstanceId,
      );
      break;
    case 'choose_disrupted_supply_lines_active_asset':
      chooseV070DisruptedSupplyLinesActiveAsset(
        next,
        action.playerId,
        action.assetInstanceId,
      );
      break;
    case 'use_general_rally':
      useV070GeneralRally(next, action.playerId);
      break;
    case 'use_commandant_entrench':
      useV070CommandantEntrench(next, action.playerId);
      break;
    case 'use_commandant_repel':
      useV070CommandantRepel(next, action.playerId);
      break;
    case 'use_commandant_fortify': {
      const result = useV070CommandantFortify(next, action.playerId);
      if (result.reachedOpponentEnd) {
        requireRuntime(next).pendingGameVictory = {
          winner: action.playerId,
          route: 'final_territory_capture',
        };
      }
      break;
    }
    case 'use_general_rout':
      useGeneralRoutAtEndOfAftermath(next, action.playerId);
      break;
    case 'use_mystic_transmutation':
      useV070MysticTransmutation(
        next,
        action.playerId,
        action.cardInstanceId,
      );
      break;
    case 'use_mystic_invocation':
      useV070MysticInvocation(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'pass_mystic_invocation':
      passV070MysticInvocation(next, action.playerId);
      break;
    case 'use_guardians_of_the_circle':
      useV070GuardiansOfTheCircle(
        next,
        action.playerId,
        action.cardInstanceId,
      );
      break;
    case 'pass_guardians_of_the_circle':
      passV070GuardiansOfTheCircle(next, action.playerId);
      break;
    case 'use_grand_inquisitor_final_judgment':
      useGrandInquisitorFinalJudgmentAtEndOfAftermath(
        next,
        action.playerId,
        action.printedCost,
        {
          discardMode: action.discardMode,
          targetInstanceIds: action.targetInstanceIds,
          assetInstanceId: action.assetInstanceId,
        },
      );
      break;
    case 'pass_grand_inquisitor_final_judgment':
      passGrandInquisitorFinalJudgment(next, action.playerId);
      break;
    case 'use_witch_hunter_relentless_pursuit':
      useWitchHunterRelentlessPursuitAtEndOfAftermath(
        next,
        action.playerId,
      );
      break;
    case 'pass_witch_hunter_relentless_pursuit':
      passWitchHunterRelentlessPursuit(next, action.playerId);
      break;
    case 'resolve_inquisition_purge_hand_choice':
      resolveFinalJudgmentPurgeHandChoice(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'use_ranger_fieldcraft': {
      const runtime = requireRuntime(next);
      if (runtime.stage !== 'onset' && runtime.stage !== 'aftermath') {
        throw new V070GameActionError(
          'Fieldcraft may be used during a battle only before the relevant printed Territory effect resolves.',
        );
      }
      useV070RangerFieldcraft(
        next,
        action.playerId,
        action.territoryPosition,
      );
      break;
    }
    case 'complete_aftermath':
      completeAftermath(next, action.playerId);
      break;
  }

  return next;
}

export function cardEligibleForV070BattleRole(
  cardId: string,
  role: 'gambit' | 'tactic',
): boolean {
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) return false;

  return card.effects.some(effect => {
    if (effect.label === 'Gambit/Tactic') return true;
    return role === 'gambit'
      ? effect.label === 'Gambit'
      : effect.label === 'Tactic';
  });
}

export function requiredV070BattleDice(runtime: V070BattleRuntime, playerId: PlayerId): number {
  const participant = runtime.participants[playerId];
  const net = participant.advantage - participant.disadvantage;
  return V070_NORMAL_BATTLE_DICE + Math.abs(net);
}

export function selectV070BattleDie(runtime: V070BattleRuntime, playerId: PlayerId): number {
  const participant = runtime.participants[playerId];
  const required = requiredV070BattleDice(runtime, playerId);
  if (participant.battleDice.length !== required) {
    throw new V070GameActionError(`${playerId} must roll exactly ${required} battle die/dice.`);
  }

  const net = participant.advantage - participant.disadvantage;
  if (net > 0) return Math.max(...participant.battleDice);
  if (net < 0) return Math.min(...participant.battleDice);
  return participant.battleDice[0];
}

function ensureBattleRuntime(state: V070GameState): V070BattleRuntime {
  if (!state.battleRuntime) {
    state.battleRuntime = createV070BattleRuntime();
    if (!state.battle) throw new V070GameActionError('There is no active battle.');
    state.battleRuntime.activeOverlayAtOnset = activeV070OverlayAtBattleOnset(
      state,
      state.battle.contestedPosition,
    );
    applyV070MysticConvergence(state);
    applyV070CoreBattleTerritoryEffects(state);
    applyV070AdvancedBattleTerritoryEffects(state);
    initializeV070TermsWindow(state);
  }
  return state.battleRuntime;
}

function proceedFromOnset(state: V070GameState, playerId: PlayerId): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'onset');
  if (playerId !== battle.attacker) {
    throw new V070GameActionError('The attacker advances the shared battle procedure out of Onset.');
  }
  if (!v070TermsReadyForGambits(state)) {
    throw new V070GameActionError('Resolve or pass the current Terms opportunity before leaving Onset.');
  }

  const blockers = unsupportedOnsetFeatures(state);
  if (blockers.length > 0) {
    throw new V070GameActionError(
      `Cannot leave Onset while unimplemented current effects are available: ${blockers.join(', ')}.`,
    );
  }

  state.battle = proceedV070ToGambits(battle);
  runtime.stage = 'set_gambits';
  appendV070Event(state, {
    type: 'battle_onset_complete',
    actor: playerId,
    visibility: 'public',
  });
}

function unsupportedOnsetFeatures(state: V070GameState): string[] {
  const battle = requireBattle(state);
  const result: string[] = [];

  for (const playerId of [battle.attacker, battle.defender]) {
    const player = state.players[playerId];

    for (const instanceId of player.zones.assetBank) {
      if (!isV070AssetActive(state, instanceId)) continue;
      const cardId = state.cardInstances[instanceId]?.cardId;
      const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
      const onsetAsset = card?.effects.find(effect =>
        effect.label === 'Asset' && /during onset|before gambits are set|after terms are refused|after the opponent refuses/i.test(effect.text),
      );
      const implementedOnsetAsset = cardId === 'diplomats-plenipotentiary'
        || cardId === 'diplomats-neutral-observers';
      if (onsetAsset && card && !implementedOnsetAsset) result.push(`${playerId}:${card.name}`);
    }
  }

  return result;
}

function setSmugglersRunGambit(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const instanceId = releaseV070SmugglersRunStashForUse(
    state,
    playerId,
    'battle',
  );
  setGambit(state, playerId, instanceId);
}

function setGambit(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string | undefined,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'set_gambits');
  const order = runtime.gambitOrderOverride;
  if (order?.nextPlayer && order.nextPlayer !== playerId) {
    throw new V070GameActionError(`${order.nextPlayer} must make the next Gambit choice.`);
  }

  const participant = runtime.participants[playerId];
  const battle = requireBattle(state);
  const gambitProhibited =
    (battle.attackerGambitProhibited
      && playerId === battle.attacker)
    || runtime.gambitProhibitedPlayers.includes(playerId);
  if (gambitProhibited && instanceId !== undefined) {
    const message = battle.attackerGambitProhibited
      && playerId === battle.attacker
        ? 'The attacker cannot set a Gambit in this battle.'
        : `${playerId} cannot set a Gambit in this battle.`;
    throw new V070GameActionError(message);
  }

  const ableMandates = (state.turnState?.gambitMandates ?? []).filter(
    mandate =>
      mandate.playerId === playerId
      && state.players[playerId].zones.hand.includes(mandate.instanceId)
      && cardEligibleForV070BattleRole(
        state.cardInstances[mandate.instanceId]?.cardId ?? '',
        'gambit',
      )
      && !gambitProhibited,
  );
  if (instanceId !== undefined
    && ableMandates.some(mandate => mandate.instanceId !== instanceId)) {
    throw new V070GameActionError(
      'Confession requires every still-able mandated Gambit instruction to be satisfied if the player sets a Gambit.',
    );
  }

  if (participant.gambit !== undefined) {
    throw new V070GameActionError(`${playerId} has already made a Gambit choice.`);
  }

  if (instanceId === undefined) {
    participant.gambit = null;
    appendV070Event(state, {
      type: 'gambit_passed',
      actor: playerId,
      visibility: 'public',
    });
  } else {
    const player = state.players[playerId];
    const index = player.zones.hand.indexOf(instanceId);
    if (index < 0) throw new V070GameActionError('A Gambit must be set from the player’s Hand.');

    const cardId = requireCardInstance(state, instanceId).cardId;
    if (!cardEligibleForV070BattleRole(cardId, 'gambit')) {
      throw new V070GameActionError(`${cardId} is not eligible to be set as a Gambit.`);
    }

    player.zones.hand.splice(index, 1);
    participant.gambit = commitment(instanceId, playerId, 'gambit');
    const forcedFaceUp = Boolean(
      order
      && playerId === order.firstPlayer
      && order.firstCommitmentFaceUp,
    );
    if (forcedFaceUp) participant.gambit.faceUp = true;

    appendV070Event(state, {
      type: 'gambit_set',
      actor: playerId,
      visibility: 'public',
      payload: { faceDown: !forcedFaceUp },
    });
    appendV070Event(state, {
      type: 'gambit_identity',
      actor: playerId,
      visibility: forcedFaceUp ? 'public' : playerId,
      payload: { instanceId, cardId },
    });
  }

  if (order) {
    if (playerId === order.firstPlayer) {
      order.nextPlayer = order.secondPlayer;
      return;
    }
    if (playerId === order.secondPlayer) {
      order.nextPlayer = null;
    }
  }

  if (bothBattleChoicesMade(runtime, 'gambit')) formReserves(state);
}

function formReserves(state: V070GameState): void {
  const runtime = requireRuntime(state);

  for (const playerId of ['A', 'B'] as const) {
    const result = drawV070Cards(
      state,
      playerId,
      v070CanonicalContent.content.battle.normal_reserve_size
        + runtime.participants[playerId].reserveBonus,
      'battle_reserve',
    );
    runtime.participants[playerId].reserve = result.drawn;

    appendV070Event(state, {
      type: 'reserve_formed',
      actor: playerId,
      visibility: 'public',
      payload: {
        count: result.drawn.length,
        reshuffles: result.reshuffles,
        exhausted: result.exhausted,
      },
    });
    appendV070Event(state, {
      type: 'reserve_identity',
      actor: playerId,
      visibility: playerId,
      payload: { cardInstanceIds: [...result.drawn] },
    });
  }

  runtime.stage = 'reveal_gambits';
}

function revealBattleRole(
  state: V070GameState,
  playerId: PlayerId,
  role: 'gambit' | 'tactic',
): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  const expectedStage = role === 'gambit' ? 'reveal_gambits' : 'reveal_tactics';
  requireRuntimeStage(runtime, expectedStage);
  if (playerId !== battle.attacker) {
    throw new V070GameActionError(`The attacker advances the shared ${role} reveal procedure.`);
  }

  const commitments = (['A', 'B'] as const)
    .flatMap(owner => {
      const participant = runtime.participants[owner];
      const normal = participant[role];
      if (role === 'gambit') {
        return [
          ...(normal ? [normal] : []),
          ...participant.additionalGambits,
        ];
      }
      return [
        ...(normal ? [normal] : []),
        ...participant.additionalTactics,
      ];
    })
    .filter((item): item is V070BattleCardCommitment => Boolean(item));

  for (const item of commitments) {
    item.faceUp = true;
    const cardId = requireCardInstance(state, item.instanceId).cardId;
    appendV070Event(state, {
      type: `${role}_revealed`,
      actor: item.owner,
      visibility: 'public',
      payload: {
        instanceId: item.instanceId,
        cardId,
      },
    });
    applyV070BlasphemyForBattleReveal(
      state,
      item.owner,
      cardId,
      role,
    );
  }

  const unsupported = resolveV070SupportedRevealEffects(
    state,
    commitments,
    expectedStage,
  );
  if (unsupported.length > 0) {
    runtime.unsupportedEffects.push(...unsupported);
    runtime.stage = 'halted';
    appendV070Event(state, {
      type: 'battle_halted_unsupported_effect',
      visibility: 'public',
      payload: {
        effects: unsupported.map(effect => ({
          owner: effect.owner,
          cardId: effect.cardId,
          role: effect.role,
          label: effect.label,
          text: effect.text,
          encounteredAt: effect.encounteredAt,
        })),
      },
    });
    return;
  }

  runtime.stage = role === 'gambit' ? 'choose_tactics' : 'outcome';
  if (role === 'gambit') openTrainingGroundsRedrawChoice(state);
}

function openTrainingGroundsRedrawChoice(
  state: V070GameState,
): void {
  const runtime = requireRuntime(state);
  const playerId = runtime.trainingGroundsRedrawPlayer;
  if (!playerId || runtime.trainingGroundsRedrawResolved) return;

  const reserveCount = runtime.participants[playerId].reserve.length;
  if (reserveCount === 0) {
    runtime.trainingGroundsRedrawResolved = true;
    appendV070Event(state, {
      type: 'training_grounds_redraw_unavailable',
      actor: playerId,
      visibility: 'public',
      payload: { reserveCount: 0 },
    });
    return;
  }

  appendV070Event(state, {
    type: 'training_grounds_redraw_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      reserveCount,
      optional: true,
    },
  });
}

function resolveTrainingGroundsRedraw(
  state: V070GameState,
  playerId: PlayerId,
  use: boolean,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'choose_tactics');
  if (runtime.trainingGroundsRedrawPlayer !== playerId
    || runtime.trainingGroundsRedrawResolved) {
    throw new V070GameActionError(
      'No Training Grounds Reserve redraw is pending for that player.',
    );
  }

  const participant = runtime.participants[playerId];
  const oldReserve = [...participant.reserve];
  runtime.trainingGroundsRedrawResolved = true;

  if (!use) {
    appendV070Event(state, {
      type: 'training_grounds_redraw_declined',
      actor: playerId,
      visibility: 'public',
      payload: { reserveCount: oldReserve.length },
    });
    return;
  }

  participant.reserve = [];
  state.players[playerId].zones.discardPile.push(...oldReserve);
  for (const instanceId of oldReserve) {
    appendV070Event(state, {
      type: 'card_discarded',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
        purpose: 'Training Grounds Reserve redraw',
      },
    });
  }

  const result = drawV070Cards(
    state,
    playerId,
    oldReserve.length,
    'training_grounds_reserve_redraw',
  );
  participant.reserve = result.drawn;

  appendV070Event(state, {
    type: 'training_grounds_redraw_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      discardedCount: oldReserve.length,
      drawnCount: result.drawn.length,
      reshuffles: result.reshuffles,
      exhausted: result.exhausted,
    },
  });
  appendV070Event(state, {
    type: 'reserve_identity',
    actor: playerId,
    visibility: playerId,
    payload: {
      cardInstanceIds: [...result.drawn],
      purpose: 'Training Grounds',
    },
  });
}

function chooseTactic(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string | undefined,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'choose_tactics');
  if (runtime.trainingGroundsRedrawPlayer
    && !runtime.trainingGroundsRedrawResolved) {
    throw new V070GameActionError(
      'Resolve Training Grounds before choosing Tactics.',
    );
  }

  const participant = runtime.participants[playerId];
  const poisonousGas =
    runtime.activePrintedTerritoryAtOnset?.territoryId ===
      V070_POISONOUS_GAS_ID;
  const usedGambit = Boolean(
    participant.gambit
    || participant.additionalGambits.length > 0,
  );
  if (poisonousGas && usedGambit && instanceId !== undefined) {
    throw new V070GameActionError(
      'Poisonous Gas allows a player to employ Gambits or Tactics, but not both.',
    );
  }
  if (participant.tacticChoicesMade >= participant.tacticLimit) {
    throw new V070GameActionError(
      `${playerId} has already made all allowed Tactic choices.`,
    );
  }

  const choiceNumber = participant.tacticChoicesMade + 1;
  if (instanceId === undefined) {
    if (choiceNumber === 1) participant.tactic = null;
    participant.tacticChoicesMade += 1;
    appendV070Event(state, {
      type: 'tactic_passed',
      actor: playerId,
      visibility: 'public',
      payload: {
        choiceNumber,
        tacticLimit: participant.tacticLimit,
      },
    });
  } else {
    const index = participant.reserve.indexOf(instanceId);
    if (index < 0) {
      throw new V070GameActionError(
        'A normal Tactic must be chosen from Reserve.',
      );
    }

    const cardId = requireCardInstance(state, instanceId).cardId;
    if (!cardEligibleForV070BattleRole(cardId, 'tactic')) {
      throw new V070GameActionError(
        `${cardId} is not eligible to be chosen as a Tactic.`,
      );
    }

    participant.reserve.splice(index, 1);
    const chosen = commitment(instanceId, playerId, 'tactic');
    if (choiceNumber === 1) {
      participant.tactic = chosen;
    } else {
      participant.additionalTactics.push(chosen);
    }
    participant.tacticChoicesMade += 1;

    appendV070Event(state, {
      type: 'tactic_chosen',
      actor: playerId,
      visibility: 'public',
      payload: {
        faceDown: true,
        choiceNumber,
        tacticLimit: participant.tacticLimit,
      },
    });
    appendV070Event(state, {
      type: 'tactic_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        instanceId,
        cardId,
        choiceNumber,
      },
    });
  }

  if (bothBattleChoicesMade(runtime, 'tactic')) {
    runtime.stage = 'reveal_tactics';
  }
}

function submitBattleDice(
  state: V070GameState,
  playerId: PlayerId,
  values: readonly number[],
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'outcome');
  if (v070LeverageRequiresDecision(state)) {
    throw new V070GameActionError('Resolve Leverage, including a +0 pass, before battle dice are rolled.');
  }
  const participant = runtime.participants[playerId];
  if (participant.battleDice.length > 0) {
    throw new V070GameActionError(`${playerId} has already submitted battle dice.`);
  }

  const required = requiredV070BattleDice(runtime, playerId);
  if (values.length !== required) {
    throw new V070GameActionError(`${playerId} must roll exactly ${required} battle die/dice.`);
  }
  for (const value of values) assertDie(value);

  participant.battleDice = [...values];
  participant.selectedBattleDie = selectV070BattleDie(runtime, playerId);
  participant.battleTotal = participant.selectedBattleDie + participant.battleModifier;

  appendV070Event(state, {
    type: 'battle_dice_rolled',
    actor: playerId,
    visibility: 'public',
    payload: {
      values: [...values],
      selected: participant.selectedBattleDie,
      modifier: participant.battleModifier,
      battleTotal: participant.battleTotal,
    },
  });

  if (bothBattleTotalsReady(runtime)) resolveOrEnterTiebreak(state);
}

function resolveOrEnterTiebreak(state: V070GameState): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  const attackerTotal = requireBattleTotal(runtime, battle.attacker);
  const defenderTotal = requireBattleTotal(runtime, battle.defender);

  if (attackerTotal === defenderTotal && !defenderHasV070DefensiveEdge(battle)) {
    runtime.stage = 'tiebreak';
    appendV070Event(state, {
      type: 'battle_tiebreak_required',
      visibility: 'public',
      payload: { attackerTotal, defenderTotal },
    });
    return;
  }

  const outcome = resolveV070BattleOutcome({
    attacker: battle.attacker,
    defender: battle.defender,
    attackerTotal,
    defenderTotal,
    defenderHasDefensiveEdge: defenderHasV070DefensiveEdge(battle),
  });
  applyOutcome(state, outcome);
}

function submitTiebreak(state: V070GameState, playerId: PlayerId, value: number): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'tiebreak');
  assertDie(value);

  const own = runtime.participants[playerId].tiebreakRolls;
  const other = runtime.participants[otherPlayer(playerId)].tiebreakRolls;
  if (own.length > other.length) {
    throw new V070GameActionError(`${playerId} has already submitted a roll for this Tiebreak round.`);
  }
  own.push(value);

  appendV070Event(state, {
    type: 'battle_tiebreak_roll',
    actor: playerId,
    visibility: 'public',
    payload: { round: own.length, value },
  });

  const attackerRolls = runtime.participants[battle.attacker].tiebreakRolls;
  const defenderRolls = runtime.participants[battle.defender].tiebreakRolls;
  if (attackerRolls.length !== defenderRolls.length) return;

  const index = attackerRolls.length - 1;
  if (attackerRolls[index] === defenderRolls[index]) {
    appendV070Event(state, {
      type: 'battle_tiebreak_tied',
      visibility: 'public',
      payload: { round: index + 1, value: attackerRolls[index] },
    });
    return;
  }

  const tiebreakRolls = attackerRolls.map((attackerRoll, round) =>
    [attackerRoll, defenderRolls[round]] as [number, number],
  );
  const outcome = resolveV070BattleOutcome({
    attacker: battle.attacker,
    defender: battle.defender,
    attackerTotal: requireBattleTotal(runtime, battle.attacker),
    defenderTotal: requireBattleTotal(runtime, battle.defender),
    defenderHasDefensiveEdge: false,
    tiebreakRolls,
  });
  applyOutcome(state, outcome);
}

function applyOutcome(state: V070GameState, outcome: V070BattleOutcome): void {
  const runtime = requireRuntime(state);
  if (safeConductAvailable(state, outcome.loser)) {
    runtime.pendingOutcome = outcome;
    runtime.stage = 'loss_replacement';

    appendV070Event(state, {
      type: 'loss_replacement_pending',
      actor: outcome.loser,
      visibility: 'public',
      payload: {
        playerId: outcome.loser,
        source: 'safe_conduct',
        wouldLoseTo: outcome.winner,
      },
    });
    return;
  }

  finalizeOutcome(state, outcome);
}

function useSafeConduct(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'loss_replacement');

  const pending = runtime.pendingOutcome;
  if (!pending || pending.loser !== playerId) {
    throw new V070GameActionError('Safe Conduct is not pending for that player.');
  }
  if (!safeConductAvailable(state, playerId)) {
    throw new V070GameActionError('Safe Conduct is not available for this loss.');
  }

  const player = state.players[playerId];
  const index = player.zones.assetBank.indexOf(cardInstanceId);
  if (index < 0
    || state.cardInstances[cardInstanceId]?.cardId !== 'diplomats-safe-conduct'
    || !isV070AssetActive(state, cardInstanceId)) {
    throw new V070GameActionError('Choose a banked Safe Conduct to use.');
  }

  player.zones.assetBank.splice(index, 1);
  clearV070AssetFaceState(state, cardInstanceId);
  player.zones.discardPile.push(cardInstanceId);

  state.battle = resolveV070Withdrawal(battle, [playerId]);
  openBattlePositionChangeSanctions(state, state.battle.positions);
  runtime.pendingOutcome = null;
  runtime.stage = 'aftermath';

  appendV070Event(state, {
    type: 'safe_conduct_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      cardInstanceId,
      wouldHaveLostTo: pending.winner,
      positions: structuredClone(state.battle.positions),
    },
  });

  settleV070RefusedTermsWithoutWinner(state);
}

function passLossReplacement(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'loss_replacement');

  const pending = runtime.pendingOutcome;
  if (!pending || pending.loser !== playerId) {
    throw new V070GameActionError('That player does not have the pending loss replacement.');
  }

  runtime.pendingOutcome = null;
  appendV070Event(state, {
    type: 'loss_replacement_passed',
    actor: playerId,
    visibility: 'public',
    payload: { source: 'safe_conduct' },
  });
  finalizeOutcome(state, pending);
}

function safeConductAvailable(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  if (terms.stage !== 'refused'
    || terms.response !== 'refused'
    || terms.offerer !== playerId) {
    return false;
  }

  return state.players[playerId].zones.assetBank.some(instanceId =>
    state.cardInstances[instanceId]?.cardId === 'diplomats-safe-conduct'
    && isV070AssetActive(state, instanceId)
  );
}

function finalizeOutcome(
  state: V070GameState,
  outcome: V070BattleOutcome,
): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  const resolution = applyV070BattleOutcome(battle, outcome);
  state.battle = resolution.state;
  recordV070IntelligenceBattleOutcomeForMission(state, outcome);
  recordV070ExecutiveHostileTakeoverEligibility(
    state,
    outcome.winner,
    battle.attacker,
    battle.contestedPosition,
  );
  recordV070MysticCrossingEligibility(
    state,
    outcome.winner,
    battle.attacker,
    battle.contestedPosition,
  );
  completeV070MysticBloodAfterBattleWin(state, outcome.winner);
  resolveV070MysticRitualVictory(state, outcome.winner);
  gainV070MilitaryCommandForBattleWin(state, outcome.winner);
  resolveV070UnbrokenRanksCommand(state, outcome.winner);
  applyV070NoQuarterAdditionalRetreat(state);
  applyV070BattleCardAdditionalRetreats(state);
  openBattlePositionChangeSanctions(state, state.battle.positions);
  runtime.pendingOutcome = null;
  runtime.stage = 'aftermath';

  appendV070Event(state, {
    type: 'battle_outcome',
    visibility: 'public',
    payload: {
      winner: outcome.winner,
      loser: outcome.loser,
      method: outcome.method,
      tiebreakRounds: outcome.tiebreakRounds,
    },
  });
  resolveV070AftermathDrawEffects(state, outcome.winner);

  if (!runtime.pendingGameVictory) {
    prepareV070MysticLossInterruption(state, outcome.loser);
  }

  resolveV070CapitalGainsOnBattleLoss(state, outcome.loser);
  settleV070RefusedTermsOutcome(state, outcome);
  if (state.stage === 'ended') return;
  if (resolution.victory) completeAftermathInternal(state, resolution.victory.winner);
}

function openBattlePositionChangeSanctions(
  state: V070GameState,
  positions: Record<PlayerId, number>,
): void {
  for (const playerId of ['A', 'B'] as const) {
    const from = state.players[playerId].position;
    const to = positions[playerId];
    if (from !== null && from !== to) {
      openV070BlockadeChoicesForPositionChange(state, playerId, from, to);
    }
  }
}

function openAccursedWagerAftermathChoice(
  state: V070GameState,
  immediateWinner: PlayerId | null,
): boolean {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  const actionWagers = v070AccursedWagersForCurrentBattle(state);
  const sourceInstanceIds = [
    ...actionWagers.map(wager => wager.sourceActionInstanceId),
    ...runtime.battleAccursedWagerInstanceIds,
  ];
  if (sourceInstanceIds.length === 0) return false;

  if (!battle.loser) {
    clearV070AccursedWagersForCurrentBattle(
      state,
      'battle ended without a losing player',
    );
    runtime.battleAccursedWagerInstanceIds = [];
    return false;
  }

  const loser = battle.loser;
  const hand = state.players[loser].zones.hand;
  if (hand.length === 0) {
    appendV070Event(state, {
      type: 'accursed_wager_no_discard',
      actor: loser,
      visibility: 'public',
      payload: {
        loser,
        sourceActionInstanceIds: [...sourceInstanceIds],
        reason: 'loser_hand_empty',
      },
    });
    clearV070AccursedWagersForCurrentBattle(
      state,
      'losing player had no card in Hand',
    );
    runtime.battleAccursedWagerInstanceIds = [];
    return false;
  }

  runtime.pendingAccursedWager = {
    loser,
    remainingSourceActionInstanceIds: [...sourceInstanceIds],
    immediateWinner,
  };
  appendV070Event(state, {
    type: 'accursed_wager_discard_pending',
    actor: loser,
    visibility: 'public',
    payload: {
      loser,
      sourceActionInstanceId:
        runtime.pendingAccursedWager.remainingSourceActionInstanceIds[0],
      remainingCount:
        runtime.pendingAccursedWager.remainingSourceActionInstanceIds.length,
      candidateCount: hand.length,
    },
  });
  appendV070Event(state, {
    type: 'accursed_wager_discard_options',
    actor: loser,
    visibility: loser,
    payload: {
      sourceActionInstanceId:
        runtime.pendingAccursedWager.remainingSourceActionInstanceIds[0],
      targetInstanceIds: [...hand],
    },
  });
  return true;
}

function resolveAccursedWagerDiscard(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'aftermath');
  const pending = runtime.pendingAccursedWager;
  if (!pending || pending.loser !== playerId) {
    throw new V070GameActionError(
      'No Accursed Wager discard is pending for that player.',
    );
  }

  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(cardInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'Accursed Wager must put one card from the losing player’s Hand in their Graveyard.',
    );
  }

  const sourceActionInstanceId =
    pending.remainingSourceActionInstanceIds[0];
  hand.splice(index, 1);
  state.players[playerId].zones.graveyard.push(cardInstanceId);
  appendV070Event(state, {
    type: 'card_graveyarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: cardInstanceId,
      cardId: state.cardInstances[cardInstanceId]?.cardId,
      purpose: 'Accursed Wager',
      sourceActionInstanceId,
    },
  });
  appendV070Event(state, {
    type: 'accursed_wager_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      loser: playerId,
      sourceActionInstanceId,
      discardedInstanceId: cardInstanceId,
      discardedCardId: state.cardInstances[cardInstanceId]?.cardId,
    },
  });

  pending.remainingSourceActionInstanceIds.shift();

  if (pending.remainingSourceActionInstanceIds.length > 0
    && state.players[playerId].zones.hand.length > 0) {
    appendV070Event(state, {
      type: 'accursed_wager_discard_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        loser: playerId,
        sourceActionInstanceId:
          pending.remainingSourceActionInstanceIds[0],
        remainingCount: pending.remainingSourceActionInstanceIds.length,
        candidateCount: state.players[playerId].zones.hand.length,
      },
    });
    appendV070Event(state, {
      type: 'accursed_wager_discard_options',
      actor: playerId,
      visibility: playerId,
      payload: {
        sourceActionInstanceId:
          pending.remainingSourceActionInstanceIds[0],
        targetInstanceIds: [...state.players[playerId].zones.hand],
      },
    });
    return;
  }

  if (pending.remainingSourceActionInstanceIds.length > 0) {
    appendV070Event(state, {
      type: 'accursed_wager_no_discard',
      actor: playerId,
      visibility: 'public',
      payload: {
        loser: playerId,
        sourceActionInstanceIds: [
          ...pending.remainingSourceActionInstanceIds,
        ],
        reason: 'loser_hand_exhausted',
      },
    });
  }

  const immediateWinner = pending.immediateWinner;
  runtime.pendingAccursedWager = null;
  clearV070AccursedWagersForCurrentBattle(
    state,
    'Accursed Wager Aftermath resolved',
  );
  runtime.battleAccursedWagerInstanceIds = [];
  completeAftermathInternal(state, immediateWinner);
}

function poisonousGasTactics(
  runtime: V070BattleRuntime,
  playerId: PlayerId,
): V070BattleCardCommitment[] {
  const participant = runtime.participants[playerId];
  return [
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ];
}

function openPoisonousGasAftermathChoice(
  state: V070GameState,
  immediateWinner: PlayerId | null,
): boolean {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  if (runtime.poisonousGasAftermathResolved
    || runtime.pendingPoisonousGasAftermath) {
    return Boolean(runtime.pendingPoisonousGasAftermath);
  }
  if (runtime.activePrintedTerritoryAtOnset?.territoryId !==
    V070_POISONOUS_GAS_ID) {
    return false;
  }

  const needingChoice: PlayerId[] = [];
  for (const playerId of [battle.attacker, battle.defender]) {
    if (poisonousGasTactics(runtime, playerId).length > 0) continue;
    const candidates = runtime.participants[playerId].reserve;
    if (candidates.length > 0) {
      needingChoice.push(playerId);
    } else {
      appendV070Event(state, {
        type: 'poisonous_gas_reserve_loss_unavailable',
        actor: playerId,
        visibility: 'public',
        payload: {
          playerId,
          reason: 'reserve_empty',
        },
      });
    }
  }

  if (needingChoice.length === 0) {
    runtime.poisonousGasAftermathResolved = true;
    return false;
  }

  const playerId = needingChoice[0];
  const candidates = [
    ...runtime.participants[playerId].reserve,
  ];
  runtime.pendingPoisonousGasAftermath = {
    playerId,
    candidateInstanceIds: candidates,
    remainingPlayerIds: needingChoice.slice(1),
    immediateWinner,
  };
  appendV070Event(state, {
    type: 'poisonous_gas_reserve_loss_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      candidateCount: candidates.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'poisonous_gas_reserve_loss_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      candidateInstanceIds: candidates,
    },
  });
  return true;
}

function resolvePoisonousGasReserveGraveyard(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'aftermath');
  const pending = runtime.pendingPoisonousGasAftermath;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Poisonous Gas Reserve loss is pending for that player.',
    );
  }

  const currentReserve = runtime.participants[playerId].reserve;
  if (!pending.candidateInstanceIds.includes(cardInstanceId)
    || !currentReserve.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'Poisonous Gas must choose a card still in that player’s Reserve.',
    );
  }

  if (!runtime.poisonousGasReserveGraveyardInstanceIds
    .includes(cardInstanceId)) {
    runtime.poisonousGasReserveGraveyardInstanceIds.push(
      cardInstanceId,
    );
  }

  appendV070Event(state, {
    type: 'poisonous_gas_reserve_loss_selected',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      instanceId: cardInstanceId,
      cardId: state.cardInstances[cardInstanceId]?.cardId,
    },
  });

  const remaining = [...pending.remainingPlayerIds];
  const immediateWinner = pending.immediateWinner;
  runtime.pendingPoisonousGasAftermath = null;

  while (remaining.length > 0) {
    const nextPlayer = remaining.shift()!;
    const candidates = [
      ...runtime.participants[nextPlayer].reserve,
    ];
    if (candidates.length === 0) {
      appendV070Event(state, {
        type: 'poisonous_gas_reserve_loss_unavailable',
        actor: nextPlayer,
        visibility: 'public',
        payload: {
          playerId: nextPlayer,
          reason: 'reserve_empty',
        },
      });
      continue;
    }
    runtime.pendingPoisonousGasAftermath = {
      playerId: nextPlayer,
      candidateInstanceIds: candidates,
      remainingPlayerIds: remaining,
      immediateWinner,
    };
    appendV070Event(state, {
      type: 'poisonous_gas_reserve_loss_pending',
      actor: nextPlayer,
      visibility: 'public',
      payload: {
        playerId: nextPlayer,
        candidateCount: candidates.length,
        mandatory: true,
      },
    });
    appendV070Event(state, {
      type: 'poisonous_gas_reserve_loss_options',
      actor: nextPlayer,
      visibility: nextPlayer,
      payload: {
        candidateInstanceIds: candidates,
      },
    });
    return;
  }

  runtime.poisonousGasAftermathResolved = true;
  completeAftermathInternal(state, immediateWinner);
}

function poisonousGasAftermathDestination(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  role: 'tactic' | 'reserve',
  normalDestination: 'discard' | 'graveyard',
): 'discard' | 'graveyard' {
  const runtime = requireRuntime(state);
  if (runtime.activePrintedTerritoryAtOnset?.territoryId !==
    V070_POISONOUS_GAS_ID) {
    return normalDestination;
  }
  if (role === 'tactic') return 'graveyard';
  if (runtime.poisonousGasReserveGraveyardInstanceIds
    .includes(instanceId)) {
    return 'graveyard';
  }
  return normalDestination;
}

function territoryAftermathCandidates(
  state: V070GameState,
  kind: 'field_hospital' | 'old_battlefield' | 'spoils_of_war',
  playerId: PlayerId,
): string[] {
  const runtime = requireRuntime(state);
  const participant = runtime.participants[playerId];

  if (kind === 'old_battlefield' || kind === 'spoils_of_war') {
    return [...participant.reserve];
  }

  const candidates: string[] = [];
  if (participant.gambit) {
    candidates.push(participant.gambit.instanceId);
  }
  for (const additional of participant.additionalGambits) {
    candidates.push(additional.instanceId);
  }
  if (participant.tactic
    && v070CondemnationAppliesToPlayerTactic(state, playerId)) {
    candidates.push(participant.tactic.instanceId);
  }
  return candidates;
}

function openTerritoryAftermathChoice(
  state: V070GameState,
  immediateWinner: PlayerId | null,
): boolean {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  if (runtime.territoryAftermathChoiceResolved
    || runtime.pendingTerritoryAftermathChoice) {
    return Boolean(runtime.pendingTerritoryAftermathChoice);
  }

  const territory = activeV070PrintedBattleTerritory(state);
  if (!territory) return false;

  let kind:
    | 'field_hospital'
    | 'old_battlefield'
    | 'spoils_of_war'
    | null = null;
  let playerId: PlayerId | null = null;

  if (territory.territoryId === V070_FIELD_HOSPITAL_ID) {
    kind = 'field_hospital';
    playerId = territory.controller;
  } else if (territory.territoryId === V070_OLD_BATTLEFIELD_ID) {
    kind = 'old_battlefield';
    playerId = territory.controller;
  } else if (territory.territoryId === V070_ARENA_SPOILS_OF_WAR_ID
    && battle.winner) {
    kind = 'spoils_of_war';
    playerId = battle.winner;
  }

  if (!kind || !playerId) return false;

  const candidates = territoryAftermathCandidates(
    state,
    kind,
    playerId,
  );
  if (candidates.length === 0) {
    runtime.territoryAftermathChoiceResolved = true;
    appendV070Event(state, {
      type: 'territory_aftermath_choice_unavailable',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind,
        playerId,
        territoryInstanceId: territory.territoryInstanceId,
        territoryId: territory.territoryId,
      },
    });
    return false;
  }

  runtime.pendingTerritoryAftermathChoice = {
    kind,
    playerId,
    candidateInstanceIds: [...candidates],
    immediateWinner,
  };
  appendV070Event(state, {
    type: 'territory_aftermath_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind,
      playerId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryId: territory.territoryId,
      candidateCount: candidates.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'territory_aftermath_choice_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      kind,
      candidateInstanceIds: [...candidates],
    },
  });
  return true;
}

function resolveTerritoryAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId?: string,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'aftermath');
  const pending = runtime.pendingTerritoryAftermathChoice;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Territory Aftermath choice is pending for that player.',
    );
  }

  if (cardInstanceId === undefined) {
    runtime.pendingTerritoryAftermathChoice = null;
    runtime.territoryAftermathChoiceResolved = true;
    appendV070Event(state, {
      type: 'territory_aftermath_choice_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind: pending.kind,
        playerId,
      },
    });
    completeAftermathInternal(state, pending.immediateWinner);
    return;
  }

  const currentCandidates = territoryAftermathCandidates(
    state,
    pending.kind,
    playerId,
  );
  if (!pending.candidateInstanceIds.includes(cardInstanceId)
    || !currentCandidates.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'The chosen Territory Aftermath card is no longer an eligible candidate.',
    );
  }

  const override = pending.kind === 'field_hospital'
    ? {
        source: 'Field Hospital' as const,
        playerId,
        instanceId: cardInstanceId,
        destination: 'discard' as const,
      }
    : pending.kind === 'old_battlefield'
      ? {
          source: 'Old Battlefield' as const,
          playerId,
          instanceId: cardInstanceId,
          destination: 'graveyard' as const,
        }
      : {
          source: 'Arena: Spoils of War' as const,
          playerId,
          instanceId: cardInstanceId,
          destination: 'hand' as const,
        };

  runtime.pendingTerritoryAftermathChoice = null;
  runtime.territoryAftermathChoiceResolved = true;
  runtime.territoryAftermathOverride = override;

  appendV070Event(state, {
    type: 'territory_aftermath_choice_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: pending.kind,
      playerId,
      source: override.source,
      destination: override.destination,
    },
  });
  appendV070Event(state, {
    type: 'territory_aftermath_choice_identity',
    actor: playerId,
    visibility: playerId,
    payload: {
      kind: pending.kind,
      instanceId: cardInstanceId,
      cardId: state.cardInstances[cardInstanceId]?.cardId,
    },
  });

  completeAftermathInternal(state, pending.immediateWinner);
}

function territoryAftermathDestination(
  runtime: V070BattleRuntime,
  playerId: PlayerId,
  instanceId: string,
  normalDestination: 'discard' | 'graveyard',
): 'discard' | 'graveyard' | 'hand' {
  const cardOverride =
    runtime.battleCardAftermathDestinationOverrides.find(
      override =>
        override.playerId === playerId
        && override.instanceId === instanceId,
    );
  if (cardOverride) return cardOverride.destination;

  const territoryOverride = runtime.territoryAftermathOverride;
  return territoryOverride
    && territoryOverride.playerId === playerId
    && territoryOverride.instanceId === instanceId
      ? territoryOverride.destination
      : normalDestination;
}

function placeAftermathCard(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  destination: 'discard' | 'graveyard' | 'hand',
  graveyarded: string[],
): void {
  if (destination === 'graveyard') {
    state.players[playerId].zones.graveyard.push(instanceId);
    graveyarded.push(instanceId);
    return;
  }
  if (destination === 'hand') {
    state.players[playerId].zones.hand.push(instanceId);
    return;
  }
  state.players[playerId].zones.discardPile.push(instanceId);
}

function completeAftermath(state: V070GameState, playerId: PlayerId): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'aftermath');
  if (v070PoliticalCapitalPending(state)) {
    throw new V070GameActionError('Resolve Senator Political Capital before completing the Aftermath.');
  }
  if (v070ProposalChoicePending(state)) {
    throw new V070GameActionError('Resolve the pending Proposal choice before completing the Aftermath.');
  }
  if (playerId !== battle.attacker) {
    throw new V070GameActionError('The attacker advances the shared Aftermath procedure.');
  }

  if (runtime.routWindowOpen) {
    runtime.routWindowOpen = false;
    finalizeCompletedAftermath(state);
    return;
  }

  completeAftermathInternal(state, null);
}

function completeAftermathInternal(
  state: V070GameState,
  immediateWinner: PlayerId | null,
): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);

  if (immediateWinner && !runtime.pendingGameVictory) {
    runtime.pendingGameVictory = {
      winner: immediateWinner,
      route: 'last_stand',
    };
  }

  state.players.A.position = battle.positions.A;
  state.players.B.position = battle.positions.B;
  syncBoardOccupants(state);

  if (!runtime.aftermathCardsCleared) {
    if (openAccursedWagerAftermathChoice(state, immediateWinner)) return;
    if (openPoisonousGasAftermathChoice(state, immediateWinner)) return;
    if (openTerritoryAftermathChoice(state, immediateWinner)) return;

    const graveyardedDuringAftermath: Record<PlayerId, string[]> = {
      A: [],
      B: [],
    };

    for (const playerId of ['A', 'B'] as const) {
      const participant = runtime.participants[playerId];
      if (participant.gambit) {
        const instanceId = participant.gambit.instanceId;
        placeAftermathCard(
          state,
          playerId,
          instanceId,
          territoryAftermathDestination(runtime, playerId, instanceId, 'graveyard'),
          graveyardedDuringAftermath[playerId],
        );
      }
      for (const additional of participant.additionalGambits) {
        const instanceId = additional.instanceId;
        placeAftermathCard(
          state,
          playerId,
          instanceId,
          territoryAftermathDestination(runtime, playerId, instanceId, 'graveyard'),
          graveyardedDuringAftermath[playerId],
        );
      }
      if (participant.tactic) {
        const instanceId = participant.tactic.instanceId;
        const condemned = v070CondemnationAppliesToPlayerTactic(state, playerId);
        placeAftermathCard(
          state,
          playerId,
          instanceId,
          territoryAftermathDestination(
            runtime,
            playerId,
            instanceId,
            poisonousGasAftermathDestination(
              state,
              playerId,
              instanceId,
              'tactic',
              condemned ? 'graveyard' : 'discard',
            ),
          ),
          graveyardedDuringAftermath[playerId],
        );
        if (condemned) {
          appendV070Event(state, {
            type: 'condemnation_applied',
            actor: otherPlayer(playerId),
            visibility: 'public',
            payload: {
              tacticOwner: playerId,
              instanceId,
              cardId: state.cardInstances[instanceId]?.cardId,
            },
          });
        }
      }
      for (const additionalTactic of participant.additionalTactics) {
        const instanceId = additionalTactic.instanceId;
        const condemned = v070CondemnationAppliesToPlayerTactic(state, playerId);
        placeAftermathCard(
          state,
          playerId,
          instanceId,
          territoryAftermathDestination(
            runtime,
            playerId,
            instanceId,
            poisonousGasAftermathDestination(
              state,
              playerId,
              instanceId,
              'tactic',
              condemned ? 'graveyard' : 'discard',
            ),
          ),
          graveyardedDuringAftermath[playerId],
        );
        if (condemned) {
          appendV070Event(state, {
            type: 'condemnation_applied',
            actor: otherPlayer(playerId),
            visibility: 'public',
            payload: {
              tacticOwner: playerId,
              instanceId,
              cardId: state.cardInstances[instanceId]?.cardId,
            },
          });
        }
      }
      for (const instanceId of participant.reserve) {
        placeAftermathCard(
          state,
          playerId,
          instanceId,
          territoryAftermathDestination(
            runtime,
            playerId,
            instanceId,
            poisonousGasAftermathDestination(state, playerId, instanceId, 'reserve', 'discard'),
          ),
          graveyardedDuringAftermath[playerId],
        );
      }
    }

    for (const playerId of ['A', 'B'] as const) {
      applyV070NormalAftermathConviction(
        state,
        playerId,
        graveyardedDuringAftermath[otherPlayer(playerId)],
      );
    }

    resolveV070OverlayAfterBattle(
      state,
      battle.contestedPosition,
      runtime.activeOverlayAtOnset,
    );
    runtime.aftermathCardsCleared = true;
  }

  if (runtime.pendingGameVictory) {
    finalizeCompletedAftermath(state);
    return;
  }

  const finalJudgmentPlayer =
    v070GrandInquisitorFinalJudgmentAvailable(state);
  if (finalJudgmentPlayer) {
    runtime.finalJudgmentWindowOpen = true;
    appendV070Event(state, {
      type: 'inquisition_leader_window_opened',
      actor: finalJudgmentPlayer,
      visibility: 'public',
      payload: {
        ability: 'Final Judgment',
        timing: 'after_battle_cards_cleared',
      },
    });
    return;
  }

  const relentlessPursuitPlayer =
    v070WitchHunterRelentlessPursuitAvailable(state);
  if (relentlessPursuitPlayer) {
    runtime.relentlessPursuitWindowOpen = true;
    appendV070Event(state, {
      type: 'inquisition_leader_window_opened',
      actor: relentlessPursuitPlayer,
      visibility: 'public',
      payload: {
        ability: 'Relentless Pursuit',
        timing: 'after_battle_cards_cleared',
      },
    });
    return;
  }

  if (v070GeneralRoutAvailableAtEndOfAftermath(state)) {
    runtime.routWindowOpen = true;
    appendV070Event(state, {
      type: 'military_order_window_opened',
      actor: battle.attacker,
      visibility: 'public',
      payload: { order: 'Rout', timing: 'end_of_aftermath' },
    });
    return;
  }

  finalizeCompletedAftermath(state);
}


function useGrandInquisitorFinalJudgmentAtEndOfAftermath(
  state: V070GameState,
  playerId: PlayerId,
  printedCost: V070PurgePrintedCost,
  options: {
    discardMode?: 'top' | 'combined';
    targetInstanceIds?: readonly string[];
    assetInstanceId?: string;
  },
): void {
  const runtime = requireRuntime(state);
  if (!runtime.finalJudgmentWindowOpen
    || v070GrandInquisitorFinalJudgmentAvailable(state) !== playerId) {
    throw new V070GameActionError(
      'Final Judgment is not pending for that player.',
    );
  }

  const result = useV070GrandInquisitorFinalJudgment(
    state,
    playerId,
    printedCost,
    options,
  );
  runtime.finalJudgmentWindowOpen = false;
  if (!result.pendingChoice) {
    completeAftermathInternal(state, null);
  }
}

function passGrandInquisitorFinalJudgment(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = requireRuntime(state);
  if (!runtime.finalJudgmentWindowOpen
    || v070GrandInquisitorFinalJudgmentAvailable(state) !== playerId) {
    throw new V070GameActionError(
      'Final Judgment is not pending for that player.',
    );
  }

  runtime.finalJudgmentWindowOpen = false;
  appendV070Event(state, {
    type: 'inquisition_leader_window_declined',
    actor: playerId,
    visibility: 'public',
    payload: { ability: 'Final Judgment' },
  });
  finalizeCompletedAftermath(state);
}

function resolveFinalJudgmentPurgeHandChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = state.pendingPurgeChoice;
  if (!pending || pending.source !== 'final_judgment') {
    throw new V070GameActionError(
      'No Final Judgment Purge choice is pending.',
    );
  }
  resolveV070PurgeHandChoice(state, playerId, targetInstanceId);
  completeAftermathInternal(state, null);
}

function useWitchHunterRelentlessPursuitAtEndOfAftermath(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = requireRuntime(state);
  if (!runtime.relentlessPursuitWindowOpen
    || v070WitchHunterRelentlessPursuitAvailable(state) !== playerId) {
    throw new V070GameActionError(
      'Relentless Pursuit is not pending for that player.',
    );
  }

  useV070WitchHunterRelentlessPursuit(state, playerId);
  runtime.relentlessPursuitWindowOpen = false;
  finalizeAftermathForRelentlessPursuit(state, playerId);
}

function passWitchHunterRelentlessPursuit(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = requireRuntime(state);
  if (!runtime.relentlessPursuitWindowOpen
    || v070WitchHunterRelentlessPursuitAvailable(state) !== playerId) {
    throw new V070GameActionError(
      'Relentless Pursuit is not pending for that player.',
    );
  }

  runtime.relentlessPursuitWindowOpen = false;
  appendV070Event(state, {
    type: 'inquisition_leader_window_declined',
    actor: playerId,
    visibility: 'public',
    payload: { ability: 'Relentless Pursuit' },
  });
  finalizeCompletedAftermath(state);
}

function finalizeAftermathForRelentlessPursuit(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = requireRuntime(state);

  appendV070Event(state, {
    type: 'battle_aftermath_complete',
    visibility: 'public',
    payload: {
      positions: {
        A: state.players.A.position,
        B: state.players.B.position,
      },
    },
  });
  resolveV070MateriaPrimaAfterAftermath(state);

  state.battle = null;
  state.battleRuntime = null;

  let turnState = state.turnState;
  if (!turnState) {
    throw new Error(
      'Relentless Pursuit requires the defeated attacker to have an active turn.',
    );
  }
  while (turnState.phase !== 'cleanup') {
    turnState = advanceV070TurnPhase(turnState);
  }
  state.turnState = turnState;

  appendV070Event(state, {
    type: 'turn_ended_by_relentless_pursuit',
    actor: playerId,
    visibility: 'public',
    payload: {
      defeatedAttackerId:
        state.pendingRelentlessPursuit?.defeatedAttackerId,
      nextPhase: 'cleanup',
    },
  });
}

function useGeneralRoutAtEndOfAftermath(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  useV070GeneralRout(state, playerId);
  runtime.routWindowOpen = false;

  appendV070Event(state, {
    type: 'battle_aftermath_complete',
    visibility: 'public',
    payload: {
      positions: {
        A: state.players.A.position,
        B: state.players.B.position,
      },
    },
  });
  resolveV070MateriaPrimaAfterAftermath(state);

  state.battle = null;
  state.battleRuntime = null;

  appendV070Event(state, {
    type: 'military_rout_movement_started',
    actor: playerId,
    visibility: 'public',
    payload: {
      from: state.players[playerId].position,
      contestedPosition: battle.contestedPosition,
    },
  });
}

function finalizeCompletedAftermath(state: V070GameState): void {
  const runtime = requireRuntime(state);
  const pendingGameVictory = runtime.pendingGameVictory;

  appendV070Event(state, {
    type: 'battle_aftermath_complete',
    visibility: 'public',
    payload: {
      positions: {
        A: state.players.A.position,
        B: state.players.B.position,
      },
    },
  });
  resolveV070MateriaPrimaAfterAftermath(state);

  state.battle = null;
  state.battleRuntime = null;

  if (pendingGameVictory) {
    state.stage = 'ended';
    state.winner = pendingGameVictory.winner;
    state.turnState = null;
    appendV070Event(state, {
      type: 'game_won',
      actor: pendingGameVictory.winner,
      visibility: 'public',
      payload: { route: pendingGameVictory.route },
    });
    return;
  }

  if (!state.turnState) {
    throw new Error(
      'A completed battle requires an active turn boundary.',
    );
  }
  if (state.pendingSanctionChoices.length > 0) return;

  if (state.pendingRelentlessPursuit
    && state.activePlayer === state.pendingRelentlessPursuit.playerId
    && state.turnState.phase === 'capture'
    && !state.turnState.movementSequenceOpen) {
    completeV070RelentlessPursuitTransition(
      state,
      state.pendingRelentlessPursuit.playerId,
    );
    return;
  }

  if (state.turnState.phase === 'movement') {
    state.turnState = advanceV070TurnPhase(state.turnState);
    appendV070Event(state, {
      type: 'turn_phase',
      actor: state.activePlayer ?? undefined,
      visibility: 'public',
      payload: {
        turnNumber: state.turnNumber,
        phase: state.turnState.phase,
      },
    });
  }
}

function bothBattleChoicesMade(
  runtime: V070BattleRuntime,
  role: 'gambit' | 'tactic',
): boolean {
  if (role === 'tactic') {
    return (['A', 'B'] as const).every(playerId => {
      const participant = runtime.participants[playerId];
      return participant.tacticChoicesMade >= participant.tacticLimit;
    });
  }
  return runtime.participants.A.gambit !== undefined
    && runtime.participants.B.gambit !== undefined;
}

function bothBattleTotalsReady(runtime: V070BattleRuntime): boolean {
  return runtime.participants.A.battleTotal !== null
    && runtime.participants.B.battleTotal !== null;
}

function requireBattleTotal(runtime: V070BattleRuntime, playerId: PlayerId): number {
  const value = runtime.participants[playerId].battleTotal;
  if (value === null) throw new V070GameActionError(`${playerId} has no battle total yet.`);
  return value;
}

function commitment(
  instanceId: string,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): V070BattleCardCommitment {
  return {
    instanceId,
    owner,
    role,
    faceUp: false,
  };
}

function requireCardInstance(state: V070GameState, instanceId: string) {
  const instance = state.cardInstances[instanceId];
  if (!instance) throw new V070GameActionError(`Unknown card instance ${instanceId}.`);
  return instance;
}

function requireBattle(state: V070GameState) {
  if (!state.battle) throw new V070GameActionError('There is no active battle.');
  return state.battle;
}

function requireRuntime(state: V070GameState) {
  if (!state.battleRuntime) throw new V070GameActionError('There is no active battle runtime.');
  return state.battleRuntime;
}

function requireRuntimeStage(
  runtime: V070BattleRuntime,
  stage: V070BattleRuntime['stage'],
): void {
  if (runtime.stage === 'halted') {
    throw new V070GameActionError('Battle execution is halted on an unsupported current card effect.');
  }
  if (runtime.stage !== stage) {
    throw new V070GameActionError(`Expected battle stage ${stage}, received ${runtime.stage}.`);
  }
}

function syncBoardOccupants(state: V070GameState): void {
  for (const territory of state.board) territory.occupant = null;

  for (const playerId of ['A', 'B'] as const) {
    const position = state.players[playerId].position;
    if (position === null) continue;
    const territory = state.board.find(candidate => candidate.position === position);
    if (territory) territory.occupant = playerId;
  }
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

function assertDie(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new V070GameActionError('Battle dice must be unmodified d6 results before applicable battle modifiers.');
  }
}
