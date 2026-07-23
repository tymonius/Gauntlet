import type { ResolveFinancierChoiceAction } from './actions';
import type { BattlePlayedCard, BattleState, CardID, GameEvent, GameState, PendingFinancierChoice, PlayerID } from '../types';
import { buildCornerTheMarketChoice } from './financier-acquisition-cards';
import { buyDeed, cardValue, checkControllingInterest, deedCost, deedOwner } from './financiers';
import { gainFactionResource } from './resources';

export const FINANCIER_BATTLE_CARDS = {
  monetaryCrisis: 'financiers-monetary-crisis',
  underwriting: 'financiers-underwriting',
  capitalGains: 'financiers-capital-gains',
  leveragedBuyout: 'financiers-leveraged-buyout',
  foreclosure: 'financiers-foreclosure',
  cornerTheMarket: 'financiers-corner-the-market',
} as const satisfies Record<string, CardID>;

export class FinancierBattleCardError extends Error {
  constructor(message: string) { super(message); this.name = 'FinancierBattleCardError'; }
}

function log(game: GameState, actor: PlayerID | undefined, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function playedCards(participant: BattleState['attacker']): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed].filter((card): card is BattlePlayedCard => Boolean(card));
}

function latestBattleCancellations(game: GameState, battleId: string): Array<{ cardId: CardID; owner: PlayerID }> {
  const event = [...game.log].reverse().find((candidate) => candidate.type === 'battle_resolved' && (candidate.payload as { battleId?: string } | undefined)?.battleId === battleId)
    ?? [...game.log].reverse().find((candidate) => candidate.type === 'battle_resolved');
  const cancellations = event?.payload && typeof event.payload === 'object'
    ? (event.payload as { cancellations?: Array<{ cardId: CardID; owner: PlayerID }> }).cancellations
    : undefined;
  return cancellations ?? [];
}

function wasCanceled(game: GameState, battle: BattleState, owner: PlayerID, cardId: CardID): boolean {
  return latestBattleCancellations(game, battle.id).some((cancellation) => cancellation.owner === owner && cancellation.cardId === cardId);
}

function activeCopies(game: GameState, battle: BattleState, owner: PlayerID, cardId: CardID): BattlePlayedCard[] {
  const participant = battle.attacker.playerId === owner ? battle.attacker : battle.defender;
  return playedCards(participant).filter((card) => card.cardId === cardId && !wasCanceled(game, battle, owner, cardId));
}

function removeOne(source: CardID[], cardId: CardID): boolean {
  const index = source.indexOf(cardId);
  if (index < 0) return false;
  source.splice(index, 1);
  return true;
}

function availableAfterBattle(game: GameState, playerId: PlayerID, cardIds: CardID[]): CardID[] {
  const discard = [...game.players[playerId].zones.discard];
  const graveyard = [...game.players[playerId].zones.graveyard];
  return cardIds.filter((cardId) => removeOne(discard, cardId) || removeOne(graveyard, cardId));
}

function queueChoice(game: GameState, choice: PendingFinancierChoice): void {
  game.financierChoiceQueue ??= [];
  game.financierChoiceQueue.push(choice);
}

function refreshQueuedChoice(game: GameState, choice: PendingFinancierChoice): PendingFinancierChoice | undefined {
  if (choice.kind !== 'battle_leveraged_buyout') return choice;
  const collateralOptions = availableAfterBattle(game, choice.playerId, choice.collateralOptions);
  const capitalAvailable = game.players[choice.playerId].resources?.capital?.value ?? 0;
  if (capitalAvailable + collateralOptions.reduce((sum, cardId) => sum + cardValue(cardId), 0) < choice.cost) return undefined;
  return { ...choice, collateralOptions, capitalAvailable, minimumCollateralValue: Math.max(choice.cost - capitalAvailable, 0) };
}

export function openNextFinancierChoice(game: GameState): boolean {
  if (game.phase === 'game_over') {
    game.pendingFinancierChoice = undefined;
    game.financierChoiceQueue = undefined;
    return false;
  }
  if (game.pendingFinancierChoice) return true;
  if (game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingLeaderAbilityWindow || game.pendingAssetBankDiscards) return false;
  while (game.financierChoiceQueue?.length) {
    const refreshed = refreshQueuedChoice(game, game.financierChoiceQueue.shift()!);
    if (!refreshed) continue;
    game.pendingFinancierChoice = refreshed;
    game.priorityPlayer = refreshed.playerId;
    if (game.financierChoiceQueue.length === 0) game.financierChoiceQueue = undefined;
    return true;
  }
  game.financierChoiceQueue = undefined;
  game.priorityPlayer = game.activePlayer;
  return false;
}

function forceForeclosureCapture(game: GameState, battle: BattleState, winner: PlayerID): void {
  if (winner !== battle.attacker.playerId) return;
  if (activeCopies(game, battle, winner, FINANCIER_BATTLE_CARDS.foreclosure).length === 0) return;
  if (deedOwner(game, battle.location) !== winner) return;
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!space || space.kind !== 'territory' || !space.territoryId) return;
  const previousController = space.controller;
  if (previousController && previousController !== winner) {
    game.players[previousController].controlledTerritories = game.players[previousController].controlledTerritories.filter((id) => id !== space.territoryId);
  }
  if (!game.players[winner].controlledTerritories.includes(space.territoryId)) game.players[winner].controlledTerritories.push(space.territoryId);
  space.controller = winner;
  delete space.capturePendingBy;
  log(game, winner, 'financier_foreclosure_battle_capture', `${game.players[winner].name} captured ${space.territoryId} immediately with Foreclosure.`, { spaceId: space.id, previousController });
}

function resolveUnderwriting(game: GameState, battle: BattleState, winner: PlayerID): void {
  const loser = winner === battle.attacker.playerId ? battle.defender.playerId : battle.attacker.playerId;
  const player = game.players[loser];
  const bonus = player?.financiers?.subsidizeBonusThisBattle ?? 0;
  if (bonus < 1) return;
  const copies = activeCopies(game, battle, loser, FINANCIER_BATTLE_CARDS.underwriting).length;
  if (copies < 1) return;
  gainFactionResource(game, loser, 'capital', bonus * copies, 'Underwriting battle refund');
  log(game, loser, 'financier_underwriting_battle_refund', `${player.name} recovered ${bonus * copies} Capital through Underwriting.`, { bonus, copies });
}

function queueCapitalGains(game: GameState, battle: BattleState, winner: PlayerID): void {
  const participant = battle.attacker.playerId === winner ? battle.attacker : battle.defender;
  const activeSources = activeCopies(game, battle, winner, FINANCIER_BATTLE_CARDS.capitalGains);
  if (activeSources.length === 0) return;
  const allPlayed = playedCards(participant).map((card) => card.cardId);
  for (let sourceIndex = 0; sourceIndex < activeSources.length; sourceIndex += 1) {
    const candidates = [...allPlayed];
    const sourcePosition = candidates.indexOf(FINANCIER_BATTLE_CARDS.capitalGains);
    if (sourcePosition >= 0) candidates.splice(sourcePosition, 1);
    const eligibleCardIds = availableAfterBattle(game, winner, candidates);
    if (eligibleCardIds.length === 0) continue;
    queueChoice(game, { kind: 'battle_capital_gains', playerId: winner, battleId: battle.id, sourceCardId: FINANCIER_BATTLE_CARDS.capitalGains, eligibleCardIds });
  }
}

function queueLeveragedBuyout(game: GameState, battle: BattleState, winner: PlayerID): void {
  if (winner !== battle.attacker.playerId) return;
  if (activeCopies(game, battle, winner, FINANCIER_BATTLE_CARDS.leveragedBuyout).length === 0) return;
  if (deedOwner(game, battle.location) === winner) return;
  const participant = battle.attacker;
  const candidates = playedCards(participant).map((card) => card.cardId);
  const sourceIndex = candidates.indexOf(FINANCIER_BATTLE_CARDS.leveragedBuyout);
  if (sourceIndex >= 0) candidates.splice(sourceIndex, 1);
  const collateralOptions = availableAfterBattle(game, winner, candidates);
  const cost = deedCost(game, winner, battle.location);
  const capitalAvailable = game.players[winner].resources?.capital?.value ?? 0;
  if (capitalAvailable + collateralOptions.reduce((sum, cardId) => sum + cardValue(cardId), 0) < cost) return;
  queueChoice(game, {
    kind: 'battle_leveraged_buyout',
    playerId: winner,
    battleId: battle.id,
    spaceId: battle.location,
    cost,
    capitalAvailable,
    collateralOptions,
    minimumCollateralValue: Math.max(cost - capitalAvailable, 0),
    options: ['pass', 'purchase'],
  });
}

function queueCornerTheMarket(game: GameState, battle: BattleState, winner: PlayerID): void {
  if (activeCopies(game, battle, winner, FINANCIER_BATTLE_CARDS.cornerTheMarket).length === 0) return;
  const choice = buildCornerTheMarketChoice(game, winner, battle.id);
  if (choice) queueChoice(game, choice);
}

function queueMonetaryCrisis(game: GameState, battle: BattleState): void {
  const sources = [battle.attacker, battle.defender].flatMap((participant) => activeCopies(game, battle, participant.playerId, FINANCIER_BATTLE_CARDS.monetaryCrisis).map(() => participant.playerId));
  for (const sourceOwner of sources) {
    for (const player of Object.values(game.players)) {
      if (player.zones.hand.length <= 1) continue;
      queueChoice(game, { kind: 'battle_monetary_crisis', playerId: player.id, battleId: battle.id, sourceOwner, handOptions: [...player.zones.hand] });
    }
  }
}

export function buildFinancierBattleAftermath(game: GameState, battle: BattleState, winner: PlayerID): void {
  resolveUnderwriting(game, battle, winner);
  forceForeclosureCapture(game, battle, winner);
  queueCapitalGains(game, battle, winner);
  queueLeveragedBuyout(game, battle, winner);
  queueCornerTheMarket(game, battle, winner);
  queueMonetaryCrisis(game, battle);
  openNextFinancierChoice(game);
}

function finishChoice(game: GameState): void {
  game.pendingFinancierChoice = undefined;
  openNextFinancierChoice(game);
}

function resolveCapitalGains(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_capital_gains' || pending.playerId !== action.playerId) return false;
  const cardId = action.cardId ?? action.choice;
  if (!pending.eligibleCardIds.includes(cardId)) throw new FinancierBattleCardError('Choose an eligible card played in the won battle.');
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.discard, cardId) && !removeOne(player.zones.graveyard, cardId)) throw new FinancierBattleCardError('That card is no longer available for Capital Gains.');
  player.financiers!.treasury.push(cardId);
  log(game, action.playerId, 'financier_capital_gains_battle', `${player.name} placed ${cardId} in Treasury through Capital Gains.`, { battleId: pending.battleId, cardId });
  finishChoice(game);
  return true;
}

function removeBattleCollateral(game: GameState, playerId: PlayerID, selected: CardID[]): number {
  const player = game.players[playerId];
  const discard = [...player.zones.discard];
  const graveyard = [...player.zones.graveyard];
  let contribution = 0;
  for (const cardId of selected) {
    if (!removeOne(discard, cardId) && !removeOne(graveyard, cardId)) throw new FinancierBattleCardError(`${cardId} is no longer available as battle collateral.`);
    contribution += cardValue(cardId);
  }
  player.zones.discard = discard;
  player.zones.graveyard = [...graveyard, ...selected];
  return contribution;
}

function resolveLeveragedBuyout(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_leveraged_buyout' || pending.playerId !== action.playerId) return false;
  if (action.choice === 'pass') {
    log(game, action.playerId, 'financier_leveraged_buyout_battle_passed', `${game.players[action.playerId].name} declined the battle Leveraged Buyout.`, { battleId: pending.battleId });
    finishChoice(game);
    return true;
  }
  if (action.choice !== 'purchase') throw new FinancierBattleCardError('Choose to purchase the Deed or pass.');
  const selected = action.cardIds ?? [];
  const available = availableAfterBattle(game, action.playerId, pending.collateralOptions);
  const availableCopy = [...available];
  for (const cardId of selected) if (!removeOne(availableCopy, cardId)) throw new FinancierBattleCardError(`${cardId} is not eligible Leveraged Buyout collateral.`);
  const contribution = selected.reduce((sum, cardId) => sum + cardValue(cardId), 0);
  const capitalAvailable = game.players[action.playerId].resources?.capital?.value ?? 0;
  if (capitalAvailable + contribution < pending.cost) throw new FinancierBattleCardError('Selected collateral does not cover the Deed cost.');
  removeBattleCollateral(game, action.playerId, selected);
  buyDeed(game, action.playerId, pending.spaceId, undefined, undefined, contribution);
  log(game, action.playerId, 'financier_leveraged_buyout_battle_completed', `${game.players[action.playerId].name} bought the contested Deed through Leveraged Buyout.`, { battleId: pending.battleId, spaceId: pending.spaceId, collateral: selected, contribution });
  if (checkControllingInterest(game, action.playerId)) {
    game.pendingFinancierChoice = undefined;
    game.financierChoiceQueue = undefined;
    return true;
  }
  finishChoice(game);
  return true;
}

function resolveMonetaryCrisis(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'battle_monetary_crisis' || pending.playerId !== action.playerId) return false;
  const player = game.players[action.playerId];
  if (player.zones.hand.length <= 1) {
    finishChoice(game);
    return true;
  }
  const cardId = action.cardId ?? action.choice;
  if (!pending.handOptions.includes(cardId) || !player.zones.hand.includes(cardId)) throw new FinancierBattleCardError('Choose one card to keep in hand.');
  const remaining = [...player.zones.hand];
  const keepIndex = remaining.indexOf(cardId);
  remaining.splice(keepIndex, 1);
  player.zones.hand = [cardId];
  player.zones.discard.push(...remaining);
  log(game, action.playerId, 'financier_monetary_crisis_battle', `${player.name} kept one card and discarded the rest during Monetary Crisis.`, { battleId: pending.battleId, keptCardId: cardId, discarded: remaining });
  finishChoice(game);
  return true;
}

export function resolveFinancierBattleChoice(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  return resolveCapitalGains(game, action)
    || resolveLeveragedBuyout(game, action)
    || resolveMonetaryCrisis(game, action);
}

export function isFinancierBattleChoice(choice: PendingFinancierChoice | undefined): boolean {
  return choice?.kind === 'battle_capital_gains'
    || choice?.kind === 'battle_monetary_crisis'
    || choice?.kind === 'battle_leveraged_buyout'
    || choice?.kind === 'corner_the_market_purchase' && Boolean(choice.battleId)
    || choice?.kind === 'deed_purchase' && choice.continuation === 'corner_the_market' && Boolean(choice.battleId);
}
