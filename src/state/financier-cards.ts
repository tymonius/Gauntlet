import type { ActionCardTarget, ResolveFinancierChoiceAction } from './actions';
import type { CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import { drawFromDeck } from './draw';
import { cardValue, deedCost, deedOwner } from './financiers';
import { openDeedPurchaseChoice } from './financier-integration';
import { gainFactionResource, spendFactionResource } from './resources';

export const FINANCIER_CARDS = {
  speculation: 'financiers-speculation',
  monetaryCrisis: 'financiers-monetary-crisis',
  liquidation: 'financiers-liquidation',
  underwriting: 'financiers-underwriting',
  capitalGains: 'financiers-capital-gains',
  tariffs: 'financiers-tariffs',
  divestment: 'financiers-divestment',
  marginLoan: 'financiers-margin-loan',
  leveragedBuyout: 'financiers-leveraged-buyout',
  foreclosure: 'financiers-foreclosure',
  propertyDues: 'financiers-property-dues',
  cornerTheMarket: 'financiers-corner-the-market',
} as const satisfies Record<string, CardID>;

export class FinancierCardError extends Error {
  constructor(message: string) { super(message); this.name = 'FinancierCardError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function requireFinancier(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'financiers' || !player.financiers) throw new FinancierCardError(`${playerId} is not a Financier.`);
  return player;
}

function targetSpace(targets?: ActionCardTarget[]): SpaceID | undefined {
  return targets?.find((target): target is Extract<ActionCardTarget, { kind: 'space' }> => target.kind === 'space')?.spaceId;
}

function targetCards(targets?: ActionCardTarget[]): CardID[] {
  return targets?.filter((target): target is Extract<ActionCardTarget, { kind: 'card' }> => target.kind === 'card').map((target) => target.cardId) ?? [];
}

function removeOne(source: CardID[], cardId: CardID): boolean {
  const index = source.indexOf(cardId);
  if (index < 0) return false;
  source.splice(index, 1);
  return true;
}

function removeCollateral(player: ReturnType<typeof requireFinancier>, cardId: CardID): 'hand' | 'treasury' | undefined {
  if (removeOne(player.zones.hand, cardId)) return 'hand';
  if (removeOne(player.financiers!.treasury, cardId)) return 'treasury';
  return undefined;
}

function legalImmediateDeedOptions(game: GameState, playerId: PlayerID): SpaceID[] {
  const player = requireFinancier(game, playerId);
  const capital = player.resources?.capital?.value ?? 0;
  const collateral = player.leaderName === 'Banker' && player.financiers!.lineOfCreditUsedTurn !== game.turn
    ? [...player.zones.hand, ...player.financiers!.treasury]
    : [];
  return game.board.spaces
    .filter((space) => space.kind === 'territory' && deedOwner(game, space.id) !== playerId)
    .filter((space) => {
      const cost = deedCost(game, playerId, space.id);
      return capital >= cost || collateral.some((cardId) => capital + Math.min(cardValue(cardId), Math.floor(cost / 2)) >= cost);
    })
    .map((space) => space.id);
}

function playSpeculationAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const spaceId = targetSpace(targets);
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space || space.kind !== 'territory' || !space.revealed) throw new FinancierCardError('Speculation requires a revealed Territory.');
  if (space.controller === playerId || space.occupant === playerId) throw new FinancierCardError('Speculation requires a Territory you neither control nor occupy.');
  removeOne(player.zones.removed, FINANCIER_CARDS.speculation);
  player.financiers!.speculations ??= [];
  player.financiers!.speculations.push({ cardId: FINANCIER_CARDS.speculation, spaceId: space.id, resolvesTurn: game.turn + Object.keys(game.players).length });
  log(game, playerId, 'financier_speculation_placed', `${player.name} placed Speculation beside ${space.territoryId ?? space.id}.`, { spaceId: space.id, resolvesTurn: game.turn + Object.keys(game.players).length });
}

function playMonetaryCrisisAction(game: GameState, playerId: PlayerID): void {
  for (const player of Object.values(game.players)) {
    player.zones.discard.push(...player.zones.hand);
    player.zones.hand = [];
    const result = drawFromDeck(player, { count: 2 });
    player.zones.hand.push(...result.drawnCards);
  }
  log(game, playerId, 'financier_monetary_crisis', `${game.players[playerId].name} forced every player to discard their hand and draw two cards.`);
}

function playLiquidationAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const treasuryCardId = targetCards(targets)[0];
  if (!treasuryCardId || !removeOne(player.financiers!.treasury, treasuryCardId)) throw new FinancierCardError('Liquidation requires one card from your Treasury.');
  player.zones.discard.push(treasuryCardId);
  const value = cardValue(treasuryCardId);
  gainFactionResource(game, playerId, 'capital', value, 'Liquidation');
  const spaceOptions = legalImmediateDeedOptions(game, playerId);
  if (spaceOptions.length > 0) {
    game.pendingFinancierChoice = { kind: 'liquidation_purchase', playerId, spaceOptions, options: ['pass', 'purchase'] };
    game.priorityPlayer = playerId;
  }
  log(game, playerId, 'financier_liquidation', `${player.name} liquidated ${treasuryCardId} for ${value} Capital.`, { treasuryCardId, value, spaceOptions });
}

function playCapitalGainsAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const treasuryCardId = targetCards(targets)[0];
  if (!treasuryCardId || !player.financiers!.treasury.includes(treasuryCardId)) throw new FinancierCardError('Capital Gains requires one card in your Treasury.');
  removeOne(player.zones.removed, FINANCIER_CARDS.capitalGains);
  player.financiers!.capitalGains ??= [];
  const investmentId = `${game.id}-capital-gains-${game.turn}-${player.financiers!.capitalGains.length + 1}`;
  player.financiers!.capitalGains.push({ investmentId, cardId: FINANCIER_CARDS.capitalGains, treasuryCardId, resolvesTurn: game.turn + Object.keys(game.players).length });
  log(game, playerId, 'financier_capital_gains_invested', `${player.name} placed Capital Gains beneath ${treasuryCardId}.`, { investmentId, treasuryCardId });
}

function playTariffsAction(game: GameState, playerId: PlayerID): void {
  const player = requireFinancier(game, playerId);
  if (player.zones.assetBank.filter((cardId) => cardId === FINANCIER_CARDS.tariffs).length > 1) throw new FinancierCardError('You cannot bank Tariffs while you already control a banked Tariffs.');
  const result = drawFromDeck(player, { count: 2 });
  player.zones.hand.push(...result.drawnCards);
  player.actionsRemaining += 1;
  player.hasPlayedActionThisTurn = false;
  player.financiers!.tariffsBankedTurn = game.turn;
  log(game, playerId, 'financier_tariffs_banked', `${player.name} banked Tariffs, drew two cards, and gained an extra action.`, { drawn: result.drawnCards.length });
}

function playDivestmentAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const spaceId = targetSpace(targets);
  if (!spaceId || !player.financiers!.deedsOwned.includes(spaceId)) throw new FinancierCardError('Divestment requires one Deed you own.');
  const priorCount = player.financiers!.deedsOwned.length;
  player.financiers!.deedsOwned = player.financiers!.deedsOwned.filter((id) => id !== spaceId);
  gainFactionResource(game, playerId, 'capital', priorCount, 'Divestment');
  player.actionsRemaining += 1;
  player.hasPlayedActionThisTurn = false;
  log(game, playerId, 'financier_divestment', `${player.name} divested the Deed to ${spaceId} and gained ${priorCount} Capital.`, { spaceId, priorCount });
}

function playMarginLoanAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const collateralCardId = targetCards(targets)[0];
  if (!collateralCardId) throw new FinancierCardError('Margin Loan requires one other card from hand or Treasury as collateral.');
  const source = removeCollateral(player, collateralCardId);
  if (!source) throw new FinancierCardError('Margin Loan collateral must come from your hand or Treasury.');
  const collateralValue = cardValue(collateralCardId);
  player.financiers!.marginLoans ??= [];
  const loanId = `${game.id}-margin-loan-${game.turn}-${player.financiers!.marginLoans.length + 1}`;
  player.financiers!.marginLoans.push({ loanId, cardId: FINANCIER_CARDS.marginLoan, collateralCardId, collateralValue, resolvesTurn: game.turn + Object.keys(game.players).length });
  gainFactionResource(game, playerId, 'capital', collateralValue + 2, 'Margin Loan');
  player.actionsRemaining += 1;
  player.hasPlayedActionThisTurn = false;
  log(game, playerId, 'financier_margin_loan_opened', `${player.name} opened a Margin Loan for ${collateralValue + 2} Capital.`, { loanId, collateralCardId, collateralValue, source });
}

function playForeclosureAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const spaceId = targetSpace(targets);
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space || space.kind !== 'territory' || !space.territoryId) throw new FinancierCardError('Foreclosure requires a Territory.');
  if (space.occupant) throw new FinancierCardError('Foreclosure requires an unoccupied Territory.');
  if (!player.financiers!.deedsOwned.includes(space.id)) throw new FinancierCardError('You must own that Territory’s Deed.');
  const adjacentControlled = game.board.spaces.some((candidate) => candidate.kind === 'territory' && candidate.territoryId && Math.abs(candidate.index - space.index) === 1 && player.controlledTerritories.includes(candidate.territoryId));
  if (!adjacentControlled) throw new FinancierCardError('Foreclosure requires adjacency to a Territory you control.');
  const previousController = space.controller;
  if (previousController && previousController !== playerId) game.players[previousController].controlledTerritories = game.players[previousController].controlledTerritories.filter((id) => id !== space.territoryId);
  if (!player.controlledTerritories.includes(space.territoryId)) player.controlledTerritories.push(space.territoryId);
  space.controller = playerId;
  delete space.capturePendingBy;
  log(game, playerId, 'financier_foreclosure', `${player.name} took control of ${space.territoryId} through Foreclosure.`, { spaceId: space.id, previousController });
}

export function applyFinancierActionEffect(game: GameState, playerId: PlayerID, cardId: CardID, targets?: ActionCardTarget[]): void {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'financiers' || !player.financiers) return;
  switch (cardId) {
    case FINANCIER_CARDS.speculation: playSpeculationAction(game, playerId, targets); break;
    case FINANCIER_CARDS.monetaryCrisis: playMonetaryCrisisAction(game, playerId); break;
    case FINANCIER_CARDS.liquidation: playLiquidationAction(game, playerId, targets); break;
    case FINANCIER_CARDS.capitalGains: playCapitalGainsAction(game, playerId, targets); break;
    case FINANCIER_CARDS.tariffs: playTariffsAction(game, playerId); break;
    case FINANCIER_CARDS.divestment: playDivestmentAction(game, playerId, targets); break;
    case FINANCIER_CARDS.marginLoan: playMarginLoanAction(game, playerId, targets); break;
    case FINANCIER_CARDS.foreclosure: playForeclosureAction(game, playerId, targets); break;
    case FINANCIER_CARDS.underwriting:
      log(game, playerId, 'financier_underwriting_banked', `${player.name} banked Underwriting.`);
      break;
    case FINANCIER_CARDS.propertyDues:
      log(game, playerId, 'financier_property_dues_banked', `${player.name} banked Property Dues.`);
      break;
  }
}

function resolveSpeculations(game: GameState, playerId: PlayerID): void {
  const player = requireFinancier(game, playerId);
  const retained = [];
  for (const speculation of player.financiers!.speculations ?? []) {
    if (speculation.resolvesTurn > game.turn) { retained.push(speculation); continue; }
    const space = game.board.spaces.find((candidate) => candidate.id === speculation.spaceId);
    if (space && (space.controller === playerId || space.occupant === playerId)) {
      gainFactionResource(game, playerId, 'capital', 2, 'Speculation matured');
      player.zones.discard.push(speculation.cardId);
      log(game, playerId, 'financier_speculation_succeeded', `${player.name} gained 2 Capital from Speculation.`, { spaceId: speculation.spaceId });
    } else {
      player.zones.graveyard.push(speculation.cardId);
      log(game, playerId, 'financier_speculation_failed', `${player.name} lost Speculation.`, { spaceId: speculation.spaceId });
    }
  }
  player.financiers!.speculations = retained;
}

function resolveCapitalGains(game: GameState, playerId: PlayerID): void {
  const player = requireFinancier(game, playerId);
  const retained = [];
  for (const investment of player.financiers!.capitalGains ?? []) {
    if (investment.resolvesTurn > game.turn) { retained.push(investment); continue; }
    if (removeOne(player.financiers!.treasury, investment.treasuryCardId)) {
      player.zones.hand.push(investment.treasuryCardId);
      const value = cardValue(investment.treasuryCardId);
      gainFactionResource(game, playerId, 'capital', value, 'Capital Gains matured');
      player.zones.discard.push(investment.cardId);
      log(game, playerId, 'financier_capital_gains_matured', `${player.name} realized ${value} Capital from Capital Gains.`, { investmentId: investment.investmentId, treasuryCardId: investment.treasuryCardId, value });
    } else {
      player.zones.discard.push(investment.cardId);
      log(game, playerId, 'financier_capital_gains_canceled', `${player.name} discarded Capital Gains because its Treasury card was gone.`, { investmentId: investment.investmentId });
    }
  }
  player.financiers!.capitalGains = retained;
}

function openNextMarginLoanRepayment(game: GameState, playerId: PlayerID): boolean {
  if (game.pendingFinancierChoice) return false;
  const player = requireFinancier(game, playerId);
  const loan = (player.financiers!.marginLoans ?? []).find((candidate) => candidate.resolvesTurn <= game.turn);
  if (!loan) return false;
  game.pendingFinancierChoice = { kind: 'margin_loan_repayment', playerId, loanId: loan.loanId, collateralCardId: loan.collateralCardId, repaymentCost: loan.collateralValue + 3, options: ['repay', 'default'] };
  game.priorityPlayer = playerId;
  return true;
}

export function resolveFinancierCardTurnStart(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (!player?.financiers) return;
  resolveSpeculations(game, playerId);
  resolveCapitalGains(game, playerId);
  reconcileFinancierCardState(game);
  openNextMarginLoanRepayment(game, playerId);
}

export function reconcileFinancierCardState(game: GameState): void {
  for (const player of Object.values(game.players)) {
    if (!player.financiers) continue;

    const retainedInvestments = [];
    const availableTreasuryCounts = new Map<CardID, number>();
    for (const cardId of player.financiers.treasury) availableTreasuryCounts.set(cardId, (availableTreasuryCounts.get(cardId) ?? 0) + 1);
    for (const investment of player.financiers.capitalGains ?? []) {
      const available = availableTreasuryCounts.get(investment.treasuryCardId) ?? 0;
      if (available > 0) {
        availableTreasuryCounts.set(investment.treasuryCardId, available - 1);
        retainedInvestments.push(investment);
      } else {
        player.zones.discard.push(investment.cardId);
        log(game, player.id, 'financier_capital_gains_canceled', `${player.name} discarded Capital Gains because its Treasury card left early.`, { investmentId: investment.investmentId });
      }
    }
    player.financiers.capitalGains = retainedInvestments;

    const bankedLoanCount = player.zones.assetBank.filter((cardId) => cardId === FINANCIER_CARDS.marginLoan).length;
    const loans = [...(player.financiers.marginLoans ?? [])];
    while (loans.length > bankedLoanCount) {
      const defaulted = loans.shift()!;
      player.zones.graveyard.push(defaulted.cardId, defaulted.collateralCardId);
      log(game, player.id, 'financier_margin_loan_defaulted', `${player.name} defaulted because Margin Loan left play.`, { loanId: defaulted.loanId });
    }
    player.financiers.marginLoans = loans;
  }
}

function resolveMarginLoanRepayment(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.playerId !== action.playerId || pending.kind !== 'margin_loan_repayment') return false;
  const player = requireFinancier(game, action.playerId);
  const loanIndex = (player.financiers!.marginLoans ?? []).findIndex((loan) => loan.loanId === pending.loanId);
  if (loanIndex < 0) throw new FinancierCardError('The pending Margin Loan no longer exists.');
  const loan = player.financiers!.marginLoans![loanIndex];
  if (action.choice === 'repay') {
    spendFactionResource(game, action.playerId, 'capital', pending.repaymentCost, 'Repay Margin Loan');
    removeOne(player.zones.assetBank, loan.cardId);
    player.zones.hand.push(loan.collateralCardId);
    player.zones.discard.push(loan.cardId);
    log(game, action.playerId, 'financier_margin_loan_repaid', `${player.name} repaid Margin Loan for ${pending.repaymentCost} Capital.`, { loanId: loan.loanId });
  } else if (action.choice === 'default') {
    removeOne(player.zones.assetBank, loan.cardId);
    player.zones.graveyard.push(loan.cardId, loan.collateralCardId);
    log(game, action.playerId, 'financier_margin_loan_defaulted', `${player.name} defaulted on Margin Loan.`, { loanId: loan.loanId });
  } else {
    throw new FinancierCardError('Choose to repay or default on Margin Loan.');
  }
  player.financiers!.marginLoans!.splice(loanIndex, 1);
  game.pendingFinancierChoice = undefined;
  if (!openNextMarginLoanRepayment(game, action.playerId)) game.priorityPlayer = game.activePlayer;
  return true;
}

export function resolveFinancierCardChoice(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  if (resolveMarginLoanRepayment(game, action)) return true;
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.playerId !== action.playerId || pending.kind !== 'liquidation_purchase') return false;
  if (action.choice === 'pass') {
    game.pendingFinancierChoice = undefined;
    game.priorityPlayer = game.activePlayer;
    return true;
  }
  const spaceId = action.spaceId ?? action.choice;
  if (!pending.spaceOptions.includes(spaceId)) throw new FinancierCardError('Choose an eligible Deed or pass.');
  game.pendingFinancierChoice = undefined;
  openDeedPurchaseChoice(game, action.playerId, spaceId, { consumeAction: false });
  return true;
}

export function shouldSkipNormalDrawForTariffs(game: GameState, playerId: PlayerID): boolean {
  return game.players[playerId]?.zones.assetBank.includes(FINANCIER_CARDS.tariffs) ?? false;
}

export function requireTariffsMayLeavePlay(game: GameState, playerId: PlayerID, cardIds: CardID[]): void {
  const player = game.players[playerId];
  if (!player?.financiers || player.financiers.tariffsBankedTurn !== game.turn) return;
  if (cardIds.includes(FINANCIER_CARDS.tariffs)) throw new FinancierCardError('You cannot cause Tariffs to leave play during the turn it was banked.');
}
