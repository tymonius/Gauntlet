import type { BattlePlayedCard, BattleState, CardID, GameEvent, GameState, PendingFinancierChoice, PlayerID } from '../types';
import type { ResolveFinancierChoiceAction } from './actions';
import { cardValue, deedOwner, subsidizeCost } from './financiers';
import { gainFactionResource, spendFactionResource } from './resources';

export const FINANCIER_PRE_DICE_CARDS = {
  speculation: 'financiers-speculation',
  liquidation: 'financiers-liquidation',
  tariffs: 'financiers-tariffs',
  divestment: 'financiers-divestment',
  marginLoan: 'financiers-margin-loan',
  propertyDues: 'financiers-property-dues',
} as const satisfies Record<string, CardID>;

export class FinancierPreDiceError extends Error {
  constructor(message: string) { super(message); this.name = 'FinancierPreDiceError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'public',
  } satisfies GameEvent);
}

function requireBattle(game: GameState, battleId: string): BattleState {
  if (!game.battle || game.phase !== 'battle' || game.battle.stage !== 'dice' || game.battle.id !== battleId) {
    throw new FinancierPreDiceError('This Financier choice no longer belongs to the active battle.');
  }
  return game.battle;
}

function participantFor(game: GameState, playerId: PlayerID) {
  const battle = game.battle;
  if (!battle) return undefined;
  return battle.attacker.playerId === playerId
    ? battle.attacker
    : battle.defender.playerId === playerId
      ? battle.defender
      : undefined;
}

function opponentOf(battle: BattleState, playerId: PlayerID): PlayerID {
  return battle.attacker.playerId === playerId ? battle.defender.playerId : battle.attacker.playerId;
}

function activePlayedCards(participant: BattleState['attacker']): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled);
}

function queue(game: GameState, choice: PendingFinancierChoice): void {
  game.financierChoiceQueue ??= [];
  game.financierChoiceQueue.push(choice);
}

function financierPlayer(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player?.financiers || player.factionId !== 'financiers') throw new FinancierPreDiceError(`${playerId} is not a Financier.`);
  return player;
}

function addTariffsBonus(game: GameState, ownerId: PlayerID): void {
  const participant = participantFor(game, ownerId);
  if (!participant) return;
  participant.modifiers += 1;
  log(game, ownerId, 'financier_tariffs_battle_bonus', `${game.players[ownerId].name} gained +1 from Tariffs.`, { battleId: game.battle?.id });
}

function schedulePropertyDues(game: GameState, ownerId: PlayerID, battleId: string): void {
  const owner = financierPlayer(game, ownerId);
  owner.financiers!.battlePropertyDues ??= [];
  owner.financiers!.battlePropertyDues.push({ battleId, amount: 3 });
  log(game, ownerId, 'financier_property_dues_scheduled', `${owner.name} will gain 3 Capital during battle cleanup.`, { battleId });
}

function choiceForCard(game: GameState, battle: BattleState, ownerId: PlayerID, card: BattlePlayedCard): PendingFinancierChoice | undefined {
  const player = game.players[ownerId];
  if (!player?.financiers || player.factionId !== 'financiers') return undefined;
  const opponentId = opponentOf(battle, ownerId);
  const opponent = game.players[opponentId];

  switch (card.cardId) {
    case FINANCIER_PRE_DICE_CARDS.speculation:
      if (ownerId !== battle.attacker.playerId || (player.resources?.capital?.value ?? 0) < 1) return undefined;
      return { kind: 'battle_speculation', playerId: ownerId, battleId: battle.id, sourceOrigin: card.origin, options: ['pass', 'spend'] };
    case FINANCIER_PRE_DICE_CARDS.liquidation:
      if (player.financiers.treasury.length === 0) return undefined;
      return { kind: 'battle_liquidation', playerId: ownerId, battleId: battle.id, treasuryOptions: [...player.financiers.treasury], options: ['pass', 'liquidate'] };
    case FINANCIER_PRE_DICE_CARDS.tariffs:
      if (opponent.zones.hand.length === 0) { addTariffsBonus(game, ownerId); return undefined; }
      return { kind: 'battle_tariffs', playerId: opponentId, battleId: battle.id, ownerId, handOptions: [...opponent.zones.hand], options: ['discard', 'grant_bonus'] };
    case FINANCIER_PRE_DICE_CARDS.divestment:
      if (player.financiers.deedsOwned.length === 0) return undefined;
      return { kind: 'battle_divestment', playerId: ownerId, battleId: battle.id, deedOptions: [...player.financiers.deedsOwned], options: ['pass', 'divest'] };
    case FINANCIER_PRE_DICE_CARDS.marginLoan: {
      const collateralOptions = [...player.zones.hand, ...player.financiers.treasury];
      if (collateralOptions.length === 0) return undefined;
      return { kind: 'battle_margin_loan', playerId: ownerId, battleId: battle.id, sourceOrigin: card.origin, collateralOptions, options: ['pass', 'collateralize'] };
    }
    case FINANCIER_PRE_DICE_CARDS.propertyDues:
      if (deedOwner(game, battle.location) !== ownerId) return undefined;
      if (opponent.zones.hand.length === 0) { schedulePropertyDues(game, ownerId, battle.id); return undefined; }
      return { kind: 'battle_property_dues', playerId: opponentId, battleId: battle.id, ownerId, handOptions: [...opponent.zones.hand], options: ['discard', 'pay_dues'] };
    default:
      return undefined;
  }
}

export function buildFinancierPreDiceChoices(game: GameState): number {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice' || !battle.effectsResolved.includes('before_battle_resolution')) return 0;
  if (battle.effectsResolved.includes('financier_pre_dice_choices_built')) return 0;
  let count = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    for (const card of activePlayedCards(participant)) {
      const choice = choiceForCard(game, battle, participant.playerId, card);
      if (!choice) continue;
      queue(game, choice);
      count += 1;
    }
  }
  battle.effectsResolved.push('financier_pre_dice_choices_built');
  return count;
}

function removeOne(source: CardID[], cardId: CardID): boolean {
  const index = source.indexOf(cardId);
  if (index < 0) return false;
  source.splice(index, 1);
  return true;
}

function openImmediateSubsidize(game: GameState, playerId: PlayerID, battleId: string): void {
  const player = financierPlayer(game, playerId);
  player.financiers!.subsidizeOfferedBattleId = undefined;
  const capital = player.resources?.capital?.value ?? 0;
  let maximumBonus = 0;
  while (subsidizeCost(maximumBonus + 1) <= capital) maximumBonus += 1;
  if (maximumBonus < 1) {
    game.pendingFinancierChoice = undefined;
    return;
  }
  game.pendingFinancierChoice = {
    kind: 'subsidize',
    playerId,
    battleId,
    maximumBonus,
    options: Array.from({ length: maximumBonus + 1 }, (_, index) => index),
  };
  game.priorityPlayer = playerId;
}

function resolveSpeculation(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_speculation' || pending.playerId !== action.playerId) return false;
  requireBattle(game, pending.battleId);
  if (action.choice === 'pass') { game.pendingFinancierChoice = undefined; return true; }
  if (action.choice !== 'spend') throw new FinancierPreDiceError('Choose to spend 1 Capital or pass Speculation.');
  const player = financierPlayer(game, action.playerId);
  spendFactionResource(game, action.playerId, 'capital', 1, 'Battle Speculation');
  player.financiers!.battleSpeculations ??= [];
  player.financiers!.battleSpeculations.push({ battleId: pending.battleId, cardId: FINANCIER_PRE_DICE_CARDS.speculation, sourceOrigin: pending.sourceOrigin });
  game.pendingFinancierChoice = undefined;
  log(game, action.playerId, 'financier_speculation_battle_funded', `${player.name} spent 1 Capital on Speculation.`, { battleId: pending.battleId });
  return true;
}

function resolveLiquidation(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_liquidation' || pending.playerId !== action.playerId) return false;
  requireBattle(game, pending.battleId);
  if (action.choice === 'pass') { game.pendingFinancierChoice = undefined; return true; }
  const cardId = action.cardId;
  if (action.choice !== 'liquidate' || !cardId || !pending.treasuryOptions.includes(cardId)) throw new FinancierPreDiceError('Choose a Treasury card to liquidate or pass.');
  const player = financierPlayer(game, action.playerId);
  if (!removeOne(player.financiers!.treasury, cardId)) throw new FinancierPreDiceError('That card is no longer in Treasury.');
  player.zones.discard.push(cardId);
  const value = cardValue(cardId);
  gainFactionResource(game, action.playerId, 'capital', value, 'Battle Liquidation');
  log(game, action.playerId, 'financier_liquidation_battle', `${player.name} liquidated ${cardId} for ${value} Capital.`, { battleId: pending.battleId, cardId, value });
  openImmediateSubsidize(game, action.playerId, pending.battleId);
  return true;
}

function resolveTariffs(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_tariffs' || pending.playerId !== action.playerId) return false;
  requireBattle(game, pending.battleId);
  if (action.choice === 'grant_bonus') {
    addTariffsBonus(game, pending.ownerId);
    game.pendingFinancierChoice = undefined;
    return true;
  }
  const cardId = action.cardId;
  if (action.choice !== 'discard' || !cardId || !pending.handOptions.includes(cardId)) throw new FinancierPreDiceError('Discard a hand card or grant the Tariffs bonus.');
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, cardId)) throw new FinancierPreDiceError('That card is no longer in hand.');
  player.zones.discard.push(cardId);
  game.pendingFinancierChoice = undefined;
  log(game, action.playerId, 'financier_tariffs_paid', `${player.name} discarded ${cardId} to avoid Tariffs.`, { battleId: pending.battleId, ownerId: pending.ownerId });
  return true;
}

function resolveDivestment(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_divestment' || pending.playerId !== action.playerId) return false;
  requireBattle(game, pending.battleId);
  if (action.choice === 'pass') { game.pendingFinancierChoice = undefined; return true; }
  const spaceId = action.spaceId;
  if (action.choice !== 'divest' || !spaceId || !pending.deedOptions.includes(spaceId)) throw new FinancierPreDiceError('Choose a Deed to divest or pass.');
  const player = financierPlayer(game, action.playerId);
  const priorCount = player.financiers!.deedsOwned.length;
  if (!player.financiers!.deedsOwned.includes(spaceId)) throw new FinancierPreDiceError('You no longer own that Deed.');
  player.financiers!.deedsOwned = player.financiers!.deedsOwned.filter((id) => id !== spaceId);
  gainFactionResource(game, action.playerId, 'capital', priorCount, 'Battle Divestment');
  log(game, action.playerId, 'financier_divestment_battle', `${player.name} divested ${spaceId} for ${priorCount} Capital.`, { battleId: pending.battleId, spaceId, priorCount });
  openImmediateSubsidize(game, action.playerId, pending.battleId);
  return true;
}

function resolveMarginLoan(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_margin_loan' || pending.playerId !== action.playerId) return false;
  requireBattle(game, pending.battleId);
  if (action.choice === 'pass') { game.pendingFinancierChoice = undefined; return true; }
  const cardId = action.cardId;
  if (action.choice !== 'collateralize' || !cardId || !pending.collateralOptions.includes(cardId)) throw new FinancierPreDiceError('Choose collateral for Margin Loan or pass.');
  const player = financierPlayer(game, action.playerId);
  if (!removeOne(player.zones.hand, cardId) && !removeOne(player.financiers!.treasury, cardId)) throw new FinancierPreDiceError('That collateral is no longer available.');
  const value = cardValue(cardId);
  player.financiers!.battleMarginLoans ??= [];
  player.financiers!.battleMarginLoans.push({ battleId: pending.battleId, cardId: FINANCIER_PRE_DICE_CARDS.marginLoan, sourceOrigin: pending.sourceOrigin, collateralCardId: cardId, collateralValue: value });
  gainFactionResource(game, action.playerId, 'capital', value, 'Battle Margin Loan');
  log(game, action.playerId, 'financier_margin_loan_battle', `${player.name} collateralized ${cardId} for ${value} Capital.`, { battleId: pending.battleId, cardId, value });
  openImmediateSubsidize(game, action.playerId, pending.battleId);
  return true;
}

function resolvePropertyDues(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_property_dues' || pending.playerId !== action.playerId) return false;
  requireBattle(game, pending.battleId);
  if (action.choice === 'pay_dues') {
    schedulePropertyDues(game, pending.ownerId, pending.battleId);
    game.pendingFinancierChoice = undefined;
    return true;
  }
  const cardId = action.cardId;
  if (action.choice !== 'discard' || !cardId || !pending.handOptions.includes(cardId)) throw new FinancierPreDiceError('Discard a hand card or allow Property Dues.');
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, cardId)) throw new FinancierPreDiceError('That card is no longer in hand.');
  player.zones.discard.push(cardId);
  game.pendingFinancierChoice = undefined;
  log(game, action.playerId, 'financier_property_dues_avoided', `${player.name} discarded ${cardId} to avoid Property Dues.`, { battleId: pending.battleId, ownerId: pending.ownerId });
  return true;
}

export function resolveFinancierPreDiceChoice(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  return resolveSpeculation(game, action)
    || resolveLiquidation(game, action)
    || resolveTariffs(game, action)
    || resolveDivestment(game, action)
    || resolveMarginLoan(game, action)
    || resolvePropertyDues(game, action);
}

export function isFinancierPreDiceChoice(choice: PendingFinancierChoice | undefined): boolean {
  return choice?.kind === 'battle_speculation'
    || choice?.kind === 'battle_liquidation'
    || choice?.kind === 'battle_tariffs'
    || choice?.kind === 'battle_divestment'
    || choice?.kind === 'battle_margin_loan'
    || choice?.kind === 'battle_property_dues';
}

function movePlayedSourceToGraveyard(game: GameState, playerId: PlayerID, cardId: CardID, sourceOrigin: BattlePlayedCard['origin']): void {
  if (sourceOrigin === 'hand') return;
  const player = game.players[playerId];
  if (removeOne(player.zones.discard, cardId)) player.zones.graveyard.push(cardId);
}

export function resolveFinancierPreDiceAftermath(game: GameState, battle: BattleState, winner: PlayerID): void {
  for (const participant of [battle.attacker, battle.defender]) {
    const player = game.players[participant.playerId];
    if (!player?.financiers) continue;

    const speculations = player.financiers.battleSpeculations ?? [];
    for (const speculation of speculations.filter((state) => state.battleId === battle.id)) {
      if (winner === player.id) {
        gainFactionResource(game, player.id, 'capital', 2, 'Battle Speculation succeeded');
        log(game, player.id, 'financier_speculation_battle_succeeded', `${player.name} gained 2 Capital from Speculation.`, { battleId: battle.id });
      } else {
        movePlayedSourceToGraveyard(game, player.id, speculation.cardId, speculation.sourceOrigin);
        log(game, player.id, 'financier_speculation_battle_failed', `${player.name} lost their Speculation.`, { battleId: battle.id });
      }
    }
    player.financiers.battleSpeculations = speculations.filter((state) => state.battleId !== battle.id);

    const loans = player.financiers.battleMarginLoans ?? [];
    for (const loan of loans.filter((state) => state.battleId === battle.id)) {
      if (winner === player.id) {
        player.zones.hand.push(loan.collateralCardId);
        log(game, player.id, 'financier_margin_loan_collateral_returned', `${player.name} recovered ${loan.collateralCardId}.`, { battleId: battle.id });
      } else {
        player.zones.graveyard.push(loan.collateralCardId);
        movePlayedSourceToGraveyard(game, player.id, loan.cardId, loan.sourceOrigin);
        log(game, player.id, 'financier_margin_loan_defaulted', `${player.name} lost Margin Loan and ${loan.collateralCardId}.`, { battleId: battle.id });
      }
    }
    player.financiers.battleMarginLoans = loans.filter((state) => state.battleId !== battle.id);

    const dues = player.financiers.battlePropertyDues ?? [];
    for (const due of dues.filter((state) => state.battleId === battle.id)) {
      gainFactionResource(game, player.id, 'capital', due.amount, 'Property Dues');
      log(game, player.id, 'financier_property_dues_collected', `${player.name} collected ${due.amount} Capital in Property Dues.`, { battleId: battle.id, amount: due.amount });
    }
    player.financiers.battlePropertyDues = dues.filter((state) => state.battleId !== battle.id);
  }
}
