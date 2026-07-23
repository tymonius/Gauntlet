import { applyMilitaryActionEffect, removeCapturedEncampments, resolveMilitaryEndTurn } from '../cards';
import type { GameAction, StateAction, UseDiplomatCardAction } from './actions';
import { applyGameAction as applyGameActionWithoutAutomation, GameActionError, type ApplyGameActionResult } from './reducer';
import { defaultLeaderAbilityRegistry, legalLeaderAbilitiesFor, resetLeaderAbilityUsageAfterBattle, resetLeaderAbilityUsageForNewTurn, useLeaderAbility } from './leader-abilities';
import { buildMilitaryAftermathChoices, enrichRecentBattleResult, resolveMilitaryChoice } from './military-interactions';
import { maybeOpenBrothersSelection, openMilitaryAfterRevealWindows, openMilitaryPrecommitWindows, resolveMilitaryTimingChoice } from './military-timing';
import { applyLeverage, checkPeaceTreatyVictory, declineTerms, offerTerms, openDiplomatTermsWindow, resolvePoliticalCapital, resolveProposalCardChoice, resolveRefusedTermsBattle, respondToTerms } from './diplomat-terms';
import { DIPLOMAT_REACTIVE_CARDS, resolveNonbindingResolution, resolveTradeConcessions, useDiplomaticLatitude, useGoodFaith, useGunboatDiplomacy, useNeutralObservers, useNonbindingResolution, useSafeConduct, useTradeConcessions } from './diplomat-cards';
import { bankSanctionAfterRefusal, effectiveAssetBankLimit, openBlockadeMovementChoice, openCensureChoiceAfterAction, openDemilitarizedZoneUpkeep, playClemency, playDemilitarizedZone, removeBlockadesAfterControlChange, removeSanctionsAfterAcceptedTerms, requireDemilitarizedEntryCost, resolveBlockadeMovement, resolveClemency, resolveCensure, resolveDemilitarizedZoneBattle, resolveDemilitarizedZoneUpkeep, DIPLOMAT_PERSISTENT_CARDS } from './diplomat-persistent';
import { applyFinancierActionEffect, reconcileFinancierCardState, requireTariffsMayLeavePlay, resolveFinancierCardChoice, resolveFinancierCardTurnStart, shouldSkipNormalDrawForTariffs } from './financier-cards';
import { beginDeedPurchase, beginHostileTakeover, beginPlayTheMarket, clearFinancierBattleState, maybeOpenSubsidizeWindow, placeTreasuryCardAction, recordHostileTakeoverEligibility, resolveFinancierChoice, resolveFinancierEndTurn, resolveFinancierTurnStart } from './financier-integration';
import { gainFactionResource } from './resources';
import { runPostActionAutomationPipeline } from './pipeline';
import { isOpponentBeyondGauntletSpace, isOwnBeyondGauntletSpace } from './v06-board';
import type { BattleState, GameEvent, GameState, PlayerID, RecentBattleResult, SpaceID } from '../types';

const LAST_STAND_DEFENDER_BONUS_EFFECT = 'last_stand_defender_bonus';
const LAST_STAND_DEFENDER_BONUS = 1;
const MILITARY_COMMAND_TRIGGER = 'military_first_battle_win';

function validateV06EndpointMovement(game: GameState, action: GameAction): void {
  if (game.version !== 'v0.6.0' || action.type !== 'move_player') return;
  const destination = game.board.spaces.find((space) => space.id === action.toSpaceId);
  const origin = game.board.spaces.find((space) => space.occupant === action.playerId);
  if (!destination || !origin) return;
  if (isOwnBeyondGauntletSpace(destination, action.playerId)) throw new GameActionError('A player cannot voluntarily withdraw beyond their own end of the Gauntlet.');
  if (isOpponentBeyondGauntletSpace(destination, action.playerId)) {
    if (!destination.occupant || destination.occupant === action.playerId) throw new GameActionError('A player advances beyond the Gauntlet only to initiate the opponent’s Last Stand.');
    if (origin.kind !== 'territory' || origin.controller !== action.playerId) throw new GameActionError('The final Territory must be captured before initiating the opponent’s Last Stand.');
  }
}
function markLastStand(result: ApplyGameActionResult, action: GameAction): void {
  if (result.state.version !== 'v0.6.0' || action.type !== 'move_player' || !result.state.battle) return;
  const location = result.state.board.spaces.find((space) => space.id === result.state.battle?.location);
  if (location && isOpponentBeyondGauntletSpace(location, action.playerId)) { result.state.battle.lastStand = true; result.state.battle.tiePolicy = 'defender'; }
}
function prepareLastStandResolution(game: GameState, action: GameAction): { game: GameState; attacker?: PlayerID; defender?: PlayerID } {
  if (game.version !== 'v0.6.0' || action.type !== 'resolve_battle' || !game.battle?.lastStand) return { game };
  const prepared = structuredClone(game); const battle = prepared.battle!;
  if (!battle.effectsResolved.includes(LAST_STAND_DEFENDER_BONUS_EFFECT)) { battle.defender.modifiers += LAST_STAND_DEFENDER_BONUS; battle.effectsResolved.push(LAST_STAND_DEFENDER_BONUS_EFFECT); }
  battle.tiePolicy = 'defender'; return { game: prepared, attacker: battle.attacker.playerId, defender: battle.defender.playerId };
}
function lastResolvedBattleWinner(game: GameState): PlayerID | undefined { const event = [...game.log].reverse().find((candidate) => candidate.type === 'battle_resolved'); return event?.payload && typeof event.payload === 'object' ? (event.payload as { winner?: PlayerID }).winner : undefined; }
function recentBattleResult(game: GameState, battle: BattleState, winner: PlayerID): RecentBattleResult {
  const location = game.board.spaces.find((space) => space.id === battle.location)!; const origin = game.board.spaces.find((space) => space.id === battle.attackerOrigin)!; const attackerDirection = location.index > origin.index ? 1 : -1;
  return enrichRecentBattleResult({ battleId: battle.id, turn: game.turn, winner, loser: winner === battle.attacker.playerId ? battle.defender.playerId : battle.attacker.playerId, attacker: battle.attacker.playerId, defender: battle.defender.playerId, location: battle.location, attackerOrigin: battle.attackerOrigin, retreatDirection: (winner === battle.attacker.playerId ? attackerDirection : -attackerDirection) as -1 | 1, battleHandCards: {}, handCommittedCards: {}, ordersUsed: {} }, battle, game);
}
function applyMilitaryCommandTrigger(game: GameState, winner: PlayerID): void { const player = game.players[winner]; if (player?.factionId !== 'military') return; player.factionTriggerUsage ??= {}; if (player.factionTriggerUsage[MILITARY_COMMAND_TRIGGER] === game.turn) return; player.factionTriggerUsage[MILITARY_COMMAND_TRIGGER] = game.turn; gainFactionResource(game, winner, 'command', 1, 'First battle victory this turn'); }
function openPostBattleOrderWindow(game: GameState, winner: PlayerID): void { if (game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingFinancierChoice || game.players[winner].military?.victoryRestrictions?.noOrders) return; const options = legalLeaderAbilitiesFor(game, winner).filter((option) => option.timing === 'after_battle'); if (options.length) { game.pendingLeaderAbilityWindow = { playerId: winner, timing: 'after_battle', battleId: game.recentBattleResult!.battleId }; game.priorityPlayer = winner; } }
function correctAddedCardDestinations(game: GameState, battle: BattleState): void { for (const side of [battle.attacker, battle.defender]) { const player = game.players[side.playerId]; for (const card of side.battleDrawPlayed.filter((played) => played.origin === 'hand')) { const index = player.zones.discard.indexOf(card.cardId); if (index >= 0) player.zones.discard.splice(index, 1); if (!player.zones.graveyard.includes(card.cardId)) player.zones.graveyard.push(card.cardId); } } }
function applyHoldTheLineLoss(game: GameState, battle: BattleState, winner: PlayerID): void { const defender = battle.defender.playerId; if (winner === defender || !battle.effectsResolved.includes(`hold_capture_if_lost:${defender}`)) return; const space = game.board.spaces.find((candidate) => candidate.id === battle.location); if (!space?.territoryId || space.kind !== 'territory') return; const previous = space.controller; if (previous && previous !== winner) game.players[previous].controlledTerritories = game.players[previous].controlledTerritories.filter((id) => id !== space.territoryId); if (!game.players[winner].controlledTerritories.includes(space.territoryId)) game.players[winner].controlledTerritories.push(space.territoryId); space.controller = winner; delete space.capturePendingBy; }
function recordBattleAftermath(result: ApplyGameActionResult, battle?: BattleState): void {
  if (!battle) return; const winner = lastResolvedBattleWinner(result.state); if (!winner) return;
  correctAddedCardDestinations(result.state, battle); applyHoldTheLineLoss(result.state, battle, winner); result.state.recentBattleResult = recentBattleResult(result.state, battle, winner); applyMilitaryCommandTrigger(result.state, winner); resolveRefusedTermsBattle(result.state, winner); resolveDemilitarizedZoneBattle(result.state, battle.location); removeBlockadesAfterControlChange(result.state); recordHostileTakeoverEligibility(result.state, battle, winner); clearFinancierBattleState(result.state); buildMilitaryAftermathChoices(result.state, battle); openPostBattleOrderWindow(result.state, winner);
}
function closePostBattleOrderWindow(game: GameState): void { game.pendingLeaderAbilityWindow = undefined; if (game.phase !== 'game_over') game.priorityPlayer = game.activePlayer; }
function appendLastStandVictoryLog(game: GameState, winner: PlayerID, defeatedPlayer: PlayerID): void { game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor: winner, type: 'last_stand_won', message: `${game.players[winner].name} won ${game.players[defeatedPlayer].name}’s Last Stand and ran the Gauntlet.`, payload: { winner, defeatedPlayer }, visibility: 'public' } satisfies GameEvent); }
function finalizeLastStandResolution(result: ApplyGameActionResult, attacker?: PlayerID, defender?: PlayerID): void { if (!attacker || !defender || lastResolvedBattleWinner(result.state) !== attacker) return; result.state.winner = attacker; result.state.phase = 'game_over'; result.state.priorityPlayer = attacker; result.state.pendingMilitaryChoice = undefined; result.state.militaryChoiceQueue = undefined; result.state.pendingMilitaryTimingChoice = undefined; result.state.militaryTimingChoiceQueue = undefined; result.state.pendingDiplomatChoice = undefined; result.state.pendingFinancierChoice = undefined; result.state.pendingLeaderAbilityWindow = undefined; result.state.pendingAssetBankDiscards = undefined; appendLastStandVictoryLog(result.state, attacker, defender); }
function continueAfterDiplomatChoice(game: GameState): void { if (game.battle && !game.pendingDiplomatChoice) openMilitaryPrecommitWindows(game); }

function enforceDiplomatAssetLimits(game: GameState): void {
  for (const player of Object.values(game.players)) {
    const limit = effectiveAssetBankLimit(game, player.id);
    const excess = player.zones.assetBank.length - limit;
    if (excess > 0) {
      game.pendingAssetBankDiscards ??= {};
      game.pendingAssetBankDiscards[player.id] = { playerId: player.id, limit, discardCount: excess, options: [...player.zones.assetBank] };
    } else if (game.pendingAssetBankDiscards?.[player.id]) delete game.pendingAssetBankDiscards[player.id];
  }
  if (game.pendingAssetBankDiscards && Object.keys(game.pendingAssetBankDiscards).length === 0) game.pendingAssetBankDiscards = undefined;
}

function useDiplomatCard(game: GameState, action: UseDiplomatCardAction): void {
  const { playerId, cardId } = action;
  if (cardId === DIPLOMAT_PERSISTENT_CARDS.clemency) { if (!action.opponentId || !action.targetCardId) throw new GameActionError('Clemency requires an opponent and a Graveyard card.'); playClemency(game, playerId, action.opponentId, action.targetCardId); }
  else if (cardId === DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone) { if (!action.spaceId) throw new GameActionError('Demilitarized Zone requires a Territory.'); playDemilitarizedZone(game, playerId, action.spaceId); }
  else if ([DIPLOMAT_PERSISTENT_CARDS.censure, DIPLOMAT_PERSISTENT_CARDS.embargo, DIPLOMAT_PERSISTENT_CARDS.blockade].includes(cardId as never)) { if (!action.opponentId) throw new GameActionError('A Sanction requires an opponent.'); bankSanctionAfterRefusal(game, playerId, action.opponentId, cardId, action.spaceId); }
  else if (cardId === DIPLOMAT_REACTIVE_CARDS.tradeConcessions) useTradeConcessions(game, playerId);
  else if (cardId === DIPLOMAT_REACTIVE_CARDS.goodFaith) { if (!action.targetCardId) throw new GameActionError('Good Faith requires a card from hand.'); useGoodFaith(game, playerId, action.targetCardId); }
  else if (cardId === DIPLOMAT_REACTIVE_CARDS.diplomaticLatitude) { if (!action.proposalId) throw new GameActionError('Diplomatic Latitude requires a second Proposal.'); useDiplomaticLatitude(game, playerId, action.proposalId); }
  else if (cardId === DIPLOMAT_REACTIVE_CARDS.nonbindingResolution) useNonbindingResolution(game, playerId);
  else if (cardId === DIPLOMAT_REACTIVE_CARDS.gunboatDiplomacy) useGunboatDiplomacy(game, playerId);
  else if (cardId === DIPLOMAT_REACTIVE_CARDS.neutralObservers) useNeutralObservers(game, playerId);
  else if (cardId === DIPLOMAT_REACTIVE_CARDS.safeConduct) useSafeConduct(game, playerId);
  else throw new GameActionError(`${cardId} is not an integrated Diplomat card.`);
}

function resolveDiplomatPendingChoice(game: GameState, action: Extract<StateAction, { type: 'resolve_diplomat_choice' }>): void {
  const pending = game.pendingDiplomatChoice!;
  if (pending.kind === 'offer_terms') { if (action.choice === 'decline') declineTerms(game, action.playerId); else if (action.choice === 'offer' && action.proposalId) offerTerms(game, action.playerId, action.proposalId); else throw new GameActionError('Choose an eligible Proposal or decline.'); }
  else if (pending.kind === 'respond_to_terms') { const diplomatId = pending.diplomatId; const opponentId = pending.playerId; respondToTerms(game, action.playerId, action.choice as 'accept' | 'refuse'); if (action.choice === 'accept') removeSanctionsAfterAcceptedTerms(game, diplomatId, opponentId); }
  else if (pending.kind === 'leverage') applyLeverage(game, action.playerId, action.amount ?? Number(action.choice));
  else if (pending.kind === 'political_capital') resolvePoliticalCapital(game, action.playerId, action.cardIds ?? []);
  else if (pending.kind === 'trade_concessions') resolveTradeConcessions(game, action.playerId, action.choice as 'draw_two' | 'bank_asset', action.cardId);
  else if (pending.kind === 'nonbinding_resolution') resolveNonbindingResolution(game, action.playerId, action.choice as 'ratify' | 'decline_ratification');
  else if (pending.kind === 'clemency') resolveClemency(game, action.playerId, action.choice as 'release' | 'leave');
  else if (pending.kind === 'censure') resolveCensure(game, action.playerId, action.choice as 'discard' | 'diplomat_draw', action.cardId);
  else if (pending.kind === 'demilitarized_zone_upkeep') resolveDemilitarizedZoneUpkeep(game, action.playerId, action.choice as 'discard' | 'withdraw', action.cardId);
  else if (pending.kind === 'sanction_movement') resolveBlockadeMovement(game, action.playerId, action.choice as 'discard' | 'influence', action.cardId);
  else if (pending.kind === 'latitude_refusal') {
    if (!action.proposalId || !pending.proposalIds.includes(action.proposalId)) throw new GameActionError('Choose one of the offered Proposals.');
    const terms = game.players[pending.diplomatId].diplomats?.activeTerms; if (!terms) throw new GameActionError('Active Terms are missing.');
    terms.selectedProposalId = action.proposalId; game.players[pending.diplomatId].zones.discard.push(DIPLOMAT_REACTIVE_CARDS.diplomaticLatitude); game.pendingDiplomatChoice = undefined; game.priorityPlayer = pending.diplomatId;
  } else resolveProposalCardChoice(game, action.playerId, action.cardIds ?? (action.cardId ? [action.cardId] : []));
}

function movementBlockadeSpace(game: GameState, playerId: PlayerID, origin?: SpaceID, destination?: SpaceID): SpaceID | undefined {
  for (const spaceId of [origin, destination]) {
    if (!spaceId) continue;
    const already = game.log.some((event) => event.turn === game.turn && event.type === 'blockade_movement_triggered' && (event.payload as { playerId?: PlayerID })?.playerId === playerId);
    if (already) return undefined;
    const has = Object.values(game.players).flatMap((player) => player.diplomats?.sanctionStates ?? []).some((sanction) => sanction.opponentId === playerId && sanction.cardId === DIPLOMAT_PERSISTENT_CARDS.blockade && sanction.spaceId === spaceId);
    if (has) return spaceId;
  }
  return undefined;
}

function skipTariffsDraw(game: GameState, playerId: PlayerID): ApplyGameActionResult {
  if (game.activePlayer !== playerId || game.phase !== 'turn_start') throw new GameActionError('Tariffs can replace only your normal turn-start draw.');
  const next = structuredClone(game);
  next.phase = 'action_before_movement';
  next.log.push({ id: `${next.id}-event-${next.log.length + 1}`, turn: next.turn, actor: playerId, type: 'financier_tariffs_draw_skipped', message: `${next.players[playerId].name} skipped their normal draw because Tariffs is banked.`, visibility: 'public' });
  runPostActionAutomationPipeline(next);
  return { state: next };
}

function applyFinancierStateAction(game: GameState, action: Extract<StateAction, { type: 'place_treasury_card' | 'begin_deed_purchase' | 'begin_play_the_market' | 'use_hostile_takeover' }>): void {
  if (action.type === 'place_treasury_card') placeTreasuryCardAction(game, action.playerId, action.cardId);
  else if (action.type === 'begin_deed_purchase') beginDeedPurchase(game, action.playerId, action.spaceId);
  else if (action.type === 'begin_play_the_market') beginPlayTheMarket(game, action.playerId, action.cardId);
  else beginHostileTakeover(game, action.playerId);
}

export function applyGameAction(game: GameState, action: StateAction): ApplyGameActionResult {
  if (action.type === 'resolve_financier_choice') { const next = structuredClone(game); if (!resolveFinancierCardChoice(next, action)) resolveFinancierChoice(next, action); reconcileFinancierCardState(next); enforceDiplomatAssetLimits(next); runPostActionAutomationPipeline(next); return { state: next }; }
  if (action.type === 'place_treasury_card' || action.type === 'begin_deed_purchase' || action.type === 'begin_play_the_market' || action.type === 'use_hostile_takeover') {
    if (game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingFinancierChoice || game.pendingLeaderAbilityWindow) throw new GameActionError('Resolve the pending choice first.');
    const next = structuredClone(game); applyFinancierStateAction(next, action); enforceDiplomatAssetLimits(next); runPostActionAutomationPipeline(next); return { state: next };
  }
  if (action.type === 'use_diplomat_card') { const next = structuredClone(game); if (next.pendingDiplomatChoice && next.pendingDiplomatChoice.playerId !== action.playerId) throw new GameActionError('Resolve the pending Diplomat choice first.'); useDiplomatCard(next, action); enforceDiplomatAssetLimits(next); runPostActionAutomationPipeline(next); return { state: next }; }
  if (action.type === 'resolve_diplomat_choice') {
    const next = structuredClone(game); const pending = next.pendingDiplomatChoice;
    if (!pending || pending.playerId !== action.playerId) throw new GameActionError(`${action.playerId} has no pending Diplomat choice.`);
    resolveDiplomatPendingChoice(next, action); continueAfterDiplomatChoice(next); enforceDiplomatAssetLimits(next); maybeOpenSubsidizeWindow(next); runPostActionAutomationPipeline(next); return { state: next };
  }
  if (action.type === 'resolve_military_timing_choice') { const next = structuredClone(game); resolveMilitaryTimingChoice(next, action.playerId, action.choice, action.cardId, action.secondaryCardId); maybeOpenBrothersSelection(next); openMilitaryAfterRevealWindows(next); maybeOpenSubsidizeWindow(next); runPostActionAutomationPipeline(next); return { state: next }; }
  if (action.type === 'resolve_military_choice') { const next = structuredClone(game); resolveMilitaryChoice(next, action.playerId, action.choice, action.cardId); if (!next.pendingMilitaryChoice && next.recentBattleResult) openPostBattleOrderWindow(next, next.recentBattleResult.winner); runPostActionAutomationPipeline(next); return { state: next }; }
  if (action.type === 'pass_leader_ability_window') { if (game.pendingLeaderAbilityWindow?.playerId !== action.playerId) throw new GameActionError(`${action.playerId} has no Leader ability window to pass.`); const next = structuredClone(game); closePostBattleOrderWindow(next); return { state: next }; }
  if (action.type === 'use_leader_ability') { if (game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingFinancierChoice) throw new GameActionError('Resolve the pending faction choice first.'); const next = structuredClone(game); const definition = defaultLeaderAbilityRegistry.get(action.abilityId); useLeaderAbility(next, action.playerId, action.abilityId); if (definition?.timing === 'after_battle') closePostBattleOrderWindow(next); runPostActionAutomationPipeline(next); return { state: next }; }
  if (game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingFinancierChoice) throw new GameActionError('Resolve the pending faction choice first.');
  if (game.pendingLeaderAbilityWindow) throw new GameActionError('Resolve or pass the pending post-battle Order window first.');
  if (action.type === 'draw_card' && game.phase === 'turn_start' && shouldSkipNormalDrawForTariffs(game, action.playerId)) return skipTariffsDraw(game, action.playerId);
  if (action.type === 'resolve_asset_bank_discard') requireTariffsMayLeavePlay(game, action.playerId, action.cardIds);

  validateV06EndpointMovement(game, action);
  const prepared = prepareLastStandResolution(game, action);
  let working = prepared.game;
  const originSpace = action.type === 'move_player' ? working.board.spaces.find((space) => space.occupant === action.playerId)?.id : undefined;
  if (action.type === 'move_player') { working = structuredClone(working); requireDemilitarizedEntryCost(working, action.playerId, action.toSpaceId, action.cardId); }
  if (action.type === 'end_turn') { working = structuredClone(working); resolveFinancierEndTurn(working, action.playerId); }
  const battleBeforeResolution = action.type === 'resolve_battle' && working.battle ? structuredClone(working.battle) : undefined;
  const hadBattle = Boolean(working.battle); const endingPlayer = action.type === 'end_turn' ? action.playerId : undefined;
  const result = applyGameActionWithoutAutomation(working, action);
  if (action.type === 'play_action_card') { applyMilitaryActionEffect(result.state, action.playerId, action.cardId, action.targets); applyFinancierActionEffect(result.state, action.playerId, action.cardId, action.targets); openCensureChoiceAfterAction(result.state, action.playerId); }
  if (endingPlayer) resolveMilitaryEndTurn(result.state, endingPlayer);
  markLastStand(result, action);
  if (action.type === 'move_player') {
    const blockadeSpace = movementBlockadeSpace(result.state, action.playerId, originSpace, action.toSpaceId);
    if (blockadeSpace && openBlockadeMovementChoice(result.state, action.playerId, blockadeSpace)) result.state.log.push({ id: `${result.state.id}-event-${result.state.log.length + 1}`, turn: result.state.turn, actor: action.playerId, type: 'blockade_movement_triggered', message: 'Sanctions: Blockade triggered on movement.', payload: { playerId: action.playerId, spaceId: blockadeSpace }, visibility: 'public' });
  }
  if (!hadBattle && result.state.battle) { if (!openDiplomatTermsWindow(result.state)) openMilitaryPrecommitWindows(result.state); }
  maybeOpenBrothersSelection(result.state); openMilitaryAfterRevealWindows(result.state); maybeOpenSubsidizeWindow(result.state);
  if (action.type === 'resolve_battle') recordBattleAftermath(result, battleBeforeResolution);
  if (endingPlayer && result.state.activePlayer !== endingPlayer) { resolveFinancierTurnStart(result.state, result.state.activePlayer); resolveFinancierCardTurnStart(result.state, result.state.activePlayer); }
  reconcileFinancierCardState(result.state); removeCapturedEncampments(result.state); removeBlockadesAfterControlChange(result.state); enforceDiplomatAssetLimits(result.state); runPostActionAutomationPipeline(result.state); finalizeLastStandResolution(result, prepared.attacker, prepared.defender);
  if (action.type === 'resolve_battle') resetLeaderAbilityUsageAfterBattle(result.state);
  if (action.type === 'end_turn') {
    result.state.recentBattleResult = undefined; result.state.pendingMilitaryChoice = undefined; result.state.militaryChoiceQueue = undefined; result.state.pendingMilitaryTimingChoice = undefined; result.state.militaryTimingChoiceQueue = undefined; result.state.pendingLeaderAbilityWindow = undefined;
    for (const player of Object.values(result.state.players)) { if (player.military) player.military.victoryRestrictions = undefined; if (player.id === result.state.activePlayer && checkPeaceTreatyVictory(result.state, player.id)) break; }
    if (!result.state.pendingDiplomatChoice && !result.state.pendingFinancierChoice) openDemilitarizedZoneUpkeep(result.state, result.state.activePlayer);
    resetLeaderAbilityUsageForNewTurn(result.state, result.state.activePlayer);
  }
  return result;
}
