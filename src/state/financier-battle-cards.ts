import type { ResolveFinancierChoiceAction } from './actions';
import type { BattlePlayedCard, BattleState, CardID, GameEvent, GameState, PendingFinancierChoice, PlayerID } from '../types';
import { deedOwner } from './financiers';
import { gainFactionResource } from './resources';

export const FINANCIER_BATTLE_CARDS = {
  monetaryCrisis: 'financiers-monetary-crisis',
  underwriting: 'financiers-underwriting',
  capitalGains: 'financiers-capital-gains',
  foreclosure: 'financiers-foreclosure',
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

function queueChoice(game: GameState, choice: PendingFinancierChoice): void {
  game.financierChoiceQueue ??= [];
  game.financierChoiceQueue.push(choice);
}

export function openNextFinancierChoice(game: GameState): boolean {
  if (game.pendingFinancierChoice) return true;
  if (game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingLeaderAbilityWindow || game.pendingAssetBankDiscards) return false;
  const next = game.financierChoiceQueue?.shift();
  if (!next) {
    game.financierChoiceQueue = undefined;
    if (game.phase !== 'game_over') game.priorityPlayer = game.activePlayer;
    return false;
  }
  game.pendingFinancierChoice = next;
  game.priorityPlayer = next.playerId;
  if (game.financierChoiceQueue?.length === 0) game.financierChoiceQueue = undefined;
  return true;
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
    const player = game.players[winner];
    const eligibleCardIds = candidates.filter((cardId) => player.zones.discard.includes(cardId) || player.zones.graveyard.includes(cardId));
    if (eligibleCardIds.length === 0) continue;
    queueChoice(game, { kind: 'battle_capital_gains', playerId: winner, battleId: battle.id, sourceCardId: FINANCIER_BATTLE_CARDS.capitalGains, eligibleCardIds });
  }
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
  return resolveCapitalGains(game, action) || resolveMonetaryCrisis(game, action);
}

export function isFinancierBattleChoice(choice: PendingFinancierChoice | undefined): boolean {
  return choice?.kind === 'battle_capital_gains' || choice?.kind === 'battle_monetary_crisis';
}
