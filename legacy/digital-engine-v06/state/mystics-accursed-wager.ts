import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveMysticsChoiceAction } from './actions';
import { sacrificeMysticHandCard } from './mystics-conversion';

export const ACCURSED_WAGER_CARD_ID = 'mystics-accursed-wager';

export class AccursedWagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccursedWagerError';
  }
}

function publicLog(game: GameState, actor: PlayerID | undefined, type: string, message: string, payload?: unknown): void {
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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

function activeAccursedWager(card: BattlePlayedCard | undefined): boolean {
  return Boolean(card
    && card.cardId === ACCURSED_WAGER_CARD_ID
    && !card.canceled
    && !card.negated);
}

function battleCopyCount(battle: BattleState): number {
  let count = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    if (activeAccursedWager(participant.handCommit)) count += 1;
    count += participant.battleDrawPlayed.filter(activeAccursedWager).length;
  }
  return count;
}

export function isAccursedWagerChoice(kind?: string): boolean {
  return kind === 'accursed_wager_after_battle';
}

export function applyAccursedWagerAction(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  if (cardId !== ACCURSED_WAGER_CARD_ID) return false;
  const player = game.players[playerId];
  if (!player || player.factionId !== 'mystics' || !player.mystics) {
    throw new AccursedWagerError(`${playerId} is not a Mystics player.`);
  }
  const mystics = player.mystics;
  if (mystics.accursedWagerArmedTurn !== game.turn) {
    mystics.accursedWagerArmedTurn = game.turn;
    mystics.accursedWagerArmedCount = 0;
  }
  mystics.accursedWagerArmedCount = (mystics.accursedWagerArmedCount ?? 0) + 1;
  publicLog(game, playerId, 'mystics_accursed_wager_armed', `${player.name} wagered on the next battle they initiate this turn.`, {
    count: mystics.accursedWagerArmedCount,
    turn: game.turn,
  });
  return true;
}

export function bindAccursedWagerToNewBattle(game: GameState): void {
  const battle = game.battle;
  if (!battle) return;
  const attacker = game.players[battle.attacker.playerId];
  const mystics = attacker?.mystics;
  if (!mystics
    || mystics.accursedWagerArmedTurn !== game.turn
    || !mystics.accursedWagerArmedCount) return;

  mystics.accursedWagerBattleId = battle.id;
  mystics.accursedWagerBattleCount = mystics.accursedWagerArmedCount;
  mystics.accursedWagerArmedTurn = undefined;
  mystics.accursedWagerArmedCount = undefined;
  publicLog(game, attacker.id, 'mystics_accursed_wager_bound', `${attacker.name}'s Accursed Wager attached to the initiated battle.`, {
    battleId: battle.id,
    count: mystics.accursedWagerBattleCount,
  });
}

export function expireAccursedWagerAtEndTurn(game: GameState, playerId: PlayerID): void {
  const mystics = game.players[playerId]?.mystics;
  if (!mystics) return;
  if (mystics.accursedWagerArmedTurn !== undefined) {
    publicLog(game, playerId, 'mystics_accursed_wager_expired', `${game.players[playerId].name}'s unused Accursed Wager expired.`, {
      count: mystics.accursedWagerArmedCount ?? 0,
    });
  }
  mystics.accursedWagerArmedTurn = undefined;
  mystics.accursedWagerArmedCount = undefined;
}

function consumeBoundActionCopies(game: GameState, battleId: string): number {
  let count = 0;
  for (const player of Object.values(game.players)) {
    const mystics = player.mystics;
    if (!mystics || mystics.accursedWagerBattleId !== battleId) continue;
    count += mystics.accursedWagerBattleCount ?? 0;
    mystics.accursedWagerBattleId = undefined;
    mystics.accursedWagerBattleCount = undefined;
  }
  return count;
}

export function queueAccursedWagerAfterBattle(game: GameState, battle: BattleState): boolean {
  const actionCopies = consumeBoundActionCopies(game, battle.id);
  const battleCopies = battleCopyCount(battle);
  const total = actionCopies + battleCopies;
  const result = game.recentBattleResult;
  if (!result || result.battleId !== battle.id || total < 1 || game.phase === 'game_over') return false;

  game.pendingMysticsAftermath = {
    kind: 'accursed_wager',
    battleId: battle.id,
    loserId: result.loser,
    remaining: total,
  };
  publicLog(game, undefined, 'mystics_accursed_wager_triggered', `Accursed Wager demands ${total} card${total === 1 ? '' : 's'} from the losing player's hand, if able.`, {
    battleId: battle.id,
    loserId: result.loser,
    actionCopies,
    battleCopies,
    total,
  });
  return true;
}

export function openAccursedWagerAftermathIfReady(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  const pending = game.pendingMysticsAftermath;
  if (!pending || pending.kind !== 'accursed_wager') return false;
  const player = game.players[pending.loserId];
  if (!player || pending.remaining < 1 || player.zones.hand.length === 0 || game.phase === 'game_over') {
    game.pendingMysticsAftermath = undefined;
    return false;
  }

  game.pendingMysticsChoice = {
    kind: 'accursed_wager_after_battle',
    playerId: pending.loserId,
    battleId: pending.battleId,
    handOptions: [...new Set(player.zones.hand)],
    remaining: pending.remaining,
    options: ['select'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = pending.loserId;
  return true;
}

function putHandCardInGraveyard(game: GameState, playerId: PlayerID, cardId: CardID): void {
  const player = game.players[playerId];
  if (!player.zones.hand.includes(cardId)) {
    throw new AccursedWagerError(`${cardId} is not in ${player.name}'s hand.`);
  }
  if (player.factionId === 'mystics' && player.mystics) {
    sacrificeMysticHandCard(game, playerId, cardId, ACCURSED_WAGER_CARD_ID);
    return;
  }
  removeOne(player.zones.hand, cardId);
  player.zones.graveyard.push(cardId);
  publicLog(game, playerId, 'mystics_accursed_wager_card_lost', `${player.name} put ${cardId} in their Graveyard because of Accursed Wager.`, {
    cardId,
  });
}

export function resolveAccursedWagerChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const choice = game.pendingMysticsChoice;
  const aftermath = game.pendingMysticsAftermath;
  if (!choice
    || choice.kind !== 'accursed_wager_after_battle'
    || choice.playerId !== action.playerId
    || !aftermath
    || aftermath.kind !== 'accursed_wager'
    || aftermath.battleId !== choice.battleId) {
    throw new AccursedWagerError(`${action.playerId} has no pending Accursed Wager choice.`);
  }
  if (action.choice !== 'select' || !action.cardId || !choice.handOptions.includes(action.cardId)) {
    throw new AccursedWagerError('Choose one eligible card from hand for Accursed Wager.');
  }

  putHandCardInGraveyard(game, action.playerId, action.cardId);
  aftermath.remaining -= 1;
  game.pendingMysticsChoice = undefined;
  if (aftermath.remaining < 1 || game.players[action.playerId].zones.hand.length === 0) {
    game.pendingMysticsAftermath = undefined;
  }
  if (game.phase !== 'game_over') game.priorityPlayer = choice.resumePriorityPlayer ?? game.activePlayer;
}
