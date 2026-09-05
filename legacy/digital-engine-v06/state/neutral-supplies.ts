import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { drawFromDeck } from './draw';
import { activeBankedAssetCopies, bankedAssetUseAllowed } from './intelligence-subversion-battle';
import { GameActionError } from './reducer';

export const SUPPLIES = 'neutral-supplies';

function appendPublicLog(
  game: GameState,
  actor: PlayerID,
  type: string,
  message: string,
  payload?: unknown,
): void {
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

function unique(cards: CardID[]): CardID[] {
  return [...new Set(cards)];
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingNeutralChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingInquisitionChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

function activeSupplies(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === SUPPLIES && !card.canceled && !card.negated && !card.virtual);
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activeSupplies(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeSupplies).length;
}

export function queueSuppliesAfterNormalDraw(game: GameState, playerId: PlayerID): number {
  if (game.phase === 'game_over' || !bankedAssetUseAllowed(game, playerId)) return 0;
  const player = game.players[playerId];
  const count = activeBankedAssetCopies(game, playerId, SUPPLIES);
  if (count < 1) return 0;
  const queue = game.neutralSuppliesAssetQueue ?? [];
  queue.push({
    id: `${game.id}-supplies-asset-${game.turn}-${queue.length + 1}`,
    playerId,
    triggersRemaining: count,
  });
  game.neutralSuppliesAssetQueue = queue;
  return count;
}

export function queueSuppliesBattleEffects(game: GameState, battle: BattleState): number {
  const queue = game.neutralSuppliesBattleQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const count = activeCopyCount(participant);
    if (count < 1) continue;
    queue.push({
      id: `${game.id}-supplies-battle-${battle.id}-${queue.length + 1}`,
      playerId: participant.playerId,
      battleId: battle.id,
      triggersRemaining: count,
    });
    queued += count;
  }
  game.neutralSuppliesBattleQueue = queue.length > 0 ? queue : undefined;
  return queued;
}

function trimAssetQueue(game: GameState): void {
  const retained = (game.neutralSuppliesAssetQueue ?? []).filter((entry) => {
    if (!bankedAssetUseAllowed(game, entry.playerId)) return false;
    const available = activeBankedAssetCopies(game, entry.playerId, SUPPLIES);
    entry.triggersRemaining = Math.min(entry.triggersRemaining, available);
    return entry.triggersRemaining > 0;
  });
  game.neutralSuppliesAssetQueue = retained.length > 0 ? retained : undefined;
}

function trimBattleQueue(game: GameState): void {
  const retained = (game.neutralSuppliesBattleQueue ?? []).filter((entry) => entry.triggersRemaining > 0);
  game.neutralSuppliesBattleQueue = retained.length > 0 ? retained : undefined;
}

function drawSuppliesBattleCards(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  const draw = drawFromDeck(player, { count: 2 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    playerId,
    'neutral_supplies_battle_draw',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Supplies during battle cleanup.`,
    { drawCount: draw.drawnCards.length, reshuffled: draw.reshuffled, exhausted: draw.exhausted },
  );
}

export function openNextSuppliesChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  trimBattleQueue(game);
  const battleEntry = game.neutralSuppliesBattleQueue?.[0];
  if (battleEntry) {
    drawSuppliesBattleCards(game, battleEntry.playerId);
    const hand = game.players[battleEntry.playerId].zones.hand;
    if (hand.length === 0) {
      battleEntry.triggersRemaining -= 1;
      trimBattleQueue(game);
      return openNextSuppliesChoice(game);
    }
    game.pendingNeutralChoice = {
      kind: 'supplies_battle_discard',
      playerId: battleEntry.playerId,
      entryId: battleEntry.id,
      battleId: battleEntry.battleId,
      cardOptions: unique(hand),
      triggersRemaining: battleEntry.triggersRemaining,
      options: ['select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = battleEntry.playerId;
    return true;
  }

  trimAssetQueue(game);
  const assetEntry = game.neutralSuppliesAssetQueue?.[0];
  if (!assetEntry) return false;
  game.pendingNeutralChoice = {
    kind: 'supplies_asset',
    playerId: assetEntry.playerId,
    entryId: assetEntry.id,
    triggersRemaining: assetEntry.triggersRemaining,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = assetEntry.playerId;
  return true;
}

function resolveAssetChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'supplies_asset' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Supplies Asset choice.`);
  }
  const entry = game.neutralSuppliesAssetQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Supplies Asset trigger is no longer pending.');
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to discard Supplies and draw two cards.');
  }

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  if (action.choice === 'pass') {
    entry.triggersRemaining = 0;
    appendPublicLog(game, action.playerId, 'neutral_supplies_asset_passed', `${game.players[action.playerId].name} used no more banked Supplies this turn.`);
  } else {
    const player = game.players[action.playerId];
    if (!removeOne(player.zones.assetBank, SUPPLIES)) {
      throw new GameActionError('Supplies is no longer banked.');
    }
    player.zones.discard.push(SUPPLIES);
    entry.triggersRemaining -= 1;
    const draw = drawFromDeck(player, { count: 2 });
    player.zones.hand.push(...draw.drawnCards);
    appendPublicLog(
      game,
      action.playerId,
      'neutral_supplies_asset_used',
      `${player.name} discarded Supplies and drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'}.`,
      { drawCount: draw.drawnCards.length, reshuffled: draw.reshuffled, exhausted: draw.exhausted },
    );
  }
  trimAssetQueue(game);
  openNextSuppliesChoice(game);
}

function resolveBattleChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'supplies_battle_discard' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Supplies Battle discard.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one card from your hand to discard for Supplies.');
  }
  const entry = game.neutralSuppliesBattleQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Supplies Battle trigger is no longer pending.');
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in hand.`);
  }
  player.zones.discard.push(action.cardId);
  entry.triggersRemaining -= 1;
  appendPublicLog(
    game,
    action.playerId,
    'neutral_supplies_battle_discard',
    `${player.name} discarded one card after drawing with Supplies.`,
    { battleId: pending.battleId },
  );
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  trimBattleQueue(game);
  openNextSuppliesChoice(game);
}

export function resolveSuppliesChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  if (game.pendingNeutralChoice?.kind === 'supplies_asset') resolveAssetChoice(game, action);
  else resolveBattleChoice(game, action);
}
