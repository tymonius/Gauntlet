import { v070CanonicalContent } from '../content/v070';
import {
  advanceV070TurnPhase,
  applyV070BattleOutcome,
  defenderHasV070DefensiveEdge,
  proceedV070ToGambits,
  resolveV070BattleOutcome,
  type PlayerId,
  type V070BattleOutcome,
} from './rules';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { drawV070Cards } from './turn-engine';
import { resolveV070SupportedRevealEffects } from './battle-effects';
import {
  applyV070Leverage,
  initializeV070TermsWindow,
  offerV070Terms,
  passV070Terms,
  respondToV070Terms,
  resolveV070PoliticalCapital,
  resolveV070ProposalChoice,
  useV070DiplomaticLatitude,
  useV070PlenipotentiaryAfterRefusal,
  settleV070RefusedTermsOutcome,
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
  | { type: 'reveal_gambits'; playerId: PlayerId }
  | { type: 'choose_tactic'; playerId: PlayerId; cardInstanceId?: string }
  | { type: 'reveal_tactics'; playerId: PlayerId }
  | { type: 'submit_battle_dice'; playerId: PlayerId; values: readonly number[] }
  | { type: 'submit_tiebreak_roll'; playerId: PlayerId; value: number }
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

  const next = structuredClone(state) as V070GameState;
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
      const cardId = state.cardInstances[instanceId]?.cardId;
      const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
      const onsetAsset = card?.effects.find(effect =>
        effect.label === 'Asset' && /during onset|before gambits are set|after terms are refused|after the opponent refuses/i.test(effect.text),
      );
      const implementedOnsetAsset = cardId === 'diplomats-plenipotentiary';
      if (onsetAsset && card && !implementedOnsetAsset) result.push(`${playerId}:${card.name}`);
    }
  }

  return result;
}

function setGambit(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string | undefined,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'set_gambits');
  const participant = runtime.participants[playerId];
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
    appendV070Event(state, {
      type: 'gambit_set',
      actor: playerId,
      visibility: 'public',
      payload: { faceDown: true },
    });
    appendV070Event(state, {
      type: 'gambit_identity',
      actor: playerId,
      visibility: playerId,
      payload: { instanceId, cardId },
    });
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
    .map(owner => runtime.participants[owner][role])
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
}

function chooseTactic(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string | undefined,
): void {
  const runtime = requireRuntime(state);
  requireRuntimeStage(runtime, 'choose_tactics');
  const participant = runtime.participants[playerId];
  if (participant.tactic !== undefined) {
    throw new V070GameActionError(`${playerId} has already made a Tactic choice.`);
  }

  if (instanceId === undefined) {
    participant.tactic = null;
    appendV070Event(state, {
      type: 'tactic_passed',
      actor: playerId,
      visibility: 'public',
    });
  } else {
    const index = participant.reserve.indexOf(instanceId);
    if (index < 0) throw new V070GameActionError('A normal Tactic must be chosen from Reserve.');

    const cardId = requireCardInstance(state, instanceId).cardId;
    if (!cardEligibleForV070BattleRole(cardId, 'tactic')) {
      throw new V070GameActionError(`${cardId} is not eligible to be chosen as a Tactic.`);
    }

    participant.reserve.splice(index, 1);
    participant.tactic = commitment(instanceId, playerId, 'tactic');
    appendV070Event(state, {
      type: 'tactic_chosen',
      actor: playerId,
      visibility: 'public',
      payload: { faceDown: true },
    });
    appendV070Event(state, {
      type: 'tactic_identity',
      actor: playerId,
      visibility: playerId,
      payload: { instanceId, cardId },
    });
  }

  if (bothBattleChoicesMade(runtime, 'tactic')) runtime.stage = 'reveal_tactics';
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
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  const resolution = applyV070BattleOutcome(battle, outcome);
  state.battle = resolution.state;
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

  settleV070RefusedTermsOutcome(state, outcome);
  if (state.stage === 'ended') return;
  if (resolution.victory) completeAftermathInternal(state, resolution.victory.winner);
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
  completeAftermathInternal(state, null);
}

function completeAftermathInternal(
  state: V070GameState,
  immediateWinner: PlayerId | null,
): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);

  state.players.A.position = battle.positions.A;
  state.players.B.position = battle.positions.B;
  syncBoardOccupants(state);

  for (const playerId of ['A', 'B'] as const) {
    const participant = runtime.participants[playerId];
    if (participant.gambit) {
      state.players[playerId].zones.graveyard.push(participant.gambit.instanceId);
    }
    if (participant.tactic) {
      state.players[playerId].zones.discardPile.push(participant.tactic.instanceId);
    }
    state.players[playerId].zones.discardPile.push(...participant.reserve);
  }

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

  state.battle = null;
  state.battleRuntime = null;

  if (immediateWinner) {
    state.stage = 'ended';
    state.winner = immediateWinner;
    state.turnState = null;
    appendV070Event(state, {
      type: 'game_won',
      actor: immediateWinner,
      visibility: 'public',
      payload: { route: 'last_stand' },
    });
    return;
  }

  if (!state.turnState || state.turnState.phase !== 'movement') {
    throw new Error('A completed movement battle must return to the Movement phase boundary.');
  }
  state.turnState = advanceV070TurnPhase(state.turnState);
  appendV070Event(state, {
    type: 'turn_phase',
    actor: state.activePlayer ?? undefined,
    visibility: 'public',
    payload: { turnNumber: state.turnNumber, phase: state.turnState.phase },
  });
}

function bothBattleChoicesMade(
  runtime: V070BattleRuntime,
  role: 'gambit' | 'tactic',
): boolean {
  return runtime.participants.A[role] !== undefined
    && runtime.participants.B[role] !== undefined;
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
