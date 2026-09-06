import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type {
  ResolveMysticsChoiceAction,
  UseMysticGraveWardAssetAction,
} from './actions';
import { activeBankedAssetCopies, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';

export const GRAVE_WARD_CARD_ID = 'mystics-grave-ward';

export type GraveyardSnapshot = Record<PlayerID, CardID[]>;

export class GraveWardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraveWardError';
  }
}

function publicLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
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

function active(card: BattlePlayedCard | undefined): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === GRAVE_WARD_CARD_ID
    && !card.canceled
    && !card.negated);
}

function multisetDifference(after: CardID[], before: CardID[]): CardID[] {
  const remaining = [...before];
  const entered: CardID[] = [];
  for (const cardId of after) {
    const index = remaining.indexOf(cardId);
    if (index >= 0) remaining.splice(index, 1);
    else entered.push(cardId);
  }
  return entered;
}

export function captureGraveyardSnapshot(game: GameState): GraveyardSnapshot {
  return Object.fromEntries(
    Object.values(game.players).map((player) => [player.id, [...player.zones.graveyard]]),
  );
}

export function registerGraveyardEntries(
  game: GameState,
  before: GraveyardSnapshot,
  battleId?: string,
): number {
  let registered = 0;
  for (const player of Object.values(game.players)) {
    const mystics = player.mystics;
    const battleSuppressed = Boolean(
      battleId
      && game.recentBattleResult?.battleId === battleId
      && game.recentBattleResult.bankedAssetUseProhibitedFor?.includes(player.id),
    );
    if (!mystics || battleSuppressed || !bankedAssetCardUseAllowed(game, player.id, GRAVE_WARD_CARD_ID)) continue;
    const triggerCount = activeBankedAssetCopies(game, player.id, GRAVE_WARD_CARD_ID);
    if (triggerCount < 1) continue;
    const entered = multisetDifference(player.zones.graveyard, before[player.id] ?? []);
    if (entered.length < 1) continue;

    const queue = mystics.graveWardEntries ?? [];
    for (const cardId of entered) {
      mystics.graveWardEntrySequence = (mystics.graveWardEntrySequence ?? 0) + 1;
      queue.push({
        id: `${game.id}-grave-ward-entry-${player.id}-${mystics.graveWardEntrySequence}`,
        cardId,
        triggersRemaining: triggerCount,
        battleId,
      });
      registered += 1;
    }
    mystics.graveWardEntries = queue;
  }
  return registered;
}

function battleSources(battle: BattleState): Array<{
  playerId: PlayerID;
  sourceKey: string;
  sourceOrigin: 'hand' | 'battle_draw';
}> {
  const result: Array<{
    playerId: PlayerID;
    sourceKey: string;
    sourceOrigin: 'hand' | 'battle_draw';
  }> = [];
  for (const participant of [battle.attacker, battle.defender]) {
    if (active(participant.handCommit)) {
      result.push({
        playerId: participant.playerId,
        sourceKey: `${participant.playerId}:hand`,
        sourceOrigin: 'hand',
      });
    }
    participant.battleDrawPlayed.forEach((card, index) => {
      if (!active(card)) return;
      result.push({
        playerId: participant.playerId,
        sourceKey: `${participant.playerId}:battle_draw:${index}`,
        sourceOrigin: 'battle_draw',
      });
    });
  }
  return result;
}

export function queueGraveWardBattleEffects(game: GameState, battle: BattleState): number {
  const result = game.recentBattleResult;
  if (!result || result.battleId !== battle.id || game.phase === 'game_over') return 0;
  let queued = 0;
  for (const source of battleSources(battle)) {
    const player = game.players[source.playerId];
    const mystics = player.mystics;
    if (!mystics) continue;
    const participant = battle.attacker.playerId === source.playerId ? battle.attacker : battle.defender;
    const committed = result.handCommittedCards?.[source.playerId]
      ?? (participant.handCommit ? [participant.handCommit.cardId] : []);
    const queue = mystics.graveWardBattleQueue ?? [];
    queue.push({
      battleId: battle.id,
      sourceKey: source.sourceKey,
      sourceOrigin: source.sourceOrigin,
      handCommittedCardIds: [...committed],
    });
    mystics.graveWardBattleQueue = queue;
    queued += 1;
  }
  return queued;
}

function removeEntry(game: GameState, playerId: PlayerID, entryId: string): void {
  const mystics = game.players[playerId].mystics;
  if (!mystics?.graveWardEntries) return;
  mystics.graveWardEntries = mystics.graveWardEntries.filter((entry) => entry.id !== entryId);
  if (mystics.graveWardEntries.length === 0) mystics.graveWardEntries = undefined;
}

function entryFor(game: GameState, playerId: PlayerID, entryId: string) {
  return game.players[playerId].mystics?.graveWardEntries?.find((entry) => entry.id === entryId);
}

function openAssetEntry(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  const mystics = player.mystics;
  if (!mystics?.graveWardEntries?.length || !bankedAssetCardUseAllowed(game, playerId, GRAVE_WARD_CARD_ID)) return false;

  while (mystics.graveWardEntries.length > 0) {
    const entry = mystics.graveWardEntries[0];
    const assetCount = activeBankedAssetCopies(game, playerId, GRAVE_WARD_CARD_ID);
    if (!player.zones.graveyard.includes(entry.cardId) || entry.triggersRemaining < 1 || assetCount < 1) {
      mystics.graveWardEntries.shift();
      continue;
    }
    entry.triggersRemaining = Math.min(entry.triggersRemaining, assetCount);
    game.pendingMysticsChoice = {
      kind: 'grave_ward_asset',
      playerId,
      entryId: entry.id,
      cardId: entry.cardId,
      battleId: entry.battleId,
      triggersRemaining: entry.triggersRemaining,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = playerId;
    return true;
  }
  mystics.graveWardEntries = undefined;
  return false;
}

function availableBattleCards(
  game: GameState,
  playerId: PlayerID,
  sourceOrigin: 'hand' | 'battle_draw',
  committedCardIds: CardID[],
): CardID[] {
  const candidates = [...committedCardIds];
  if (sourceOrigin === 'hand') removeOne(candidates, GRAVE_WARD_CARD_ID);
  const graveyard = [...game.players[playerId].zones.graveyard];
  const available: CardID[] = [];
  for (const cardId of candidates) {
    const index = graveyard.indexOf(cardId);
    if (index < 0) continue;
    graveyard.splice(index, 1);
    available.push(cardId);
  }
  return [...new Set(available)];
}

function openBattleEffect(game: GameState, playerId: PlayerID): boolean {
  const mystics = game.players[playerId].mystics;
  if (!mystics?.graveWardBattleQueue?.length) return false;

  while (mystics.graveWardBattleQueue.length > 0) {
    const effect = mystics.graveWardBattleQueue[0];
    const options = availableBattleCards(
      game,
      playerId,
      effect.sourceOrigin,
      effect.handCommittedCardIds,
    );
    if (options.length < 1) {
      mystics.graveWardBattleQueue.shift();
      continue;
    }
    game.pendingMysticsChoice = {
      kind: 'grave_ward_battle',
      playerId,
      battleId: effect.battleId,
      sourceKey: effect.sourceKey,
      handOptions: options,
      options: ['select'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = playerId;
    return true;
  }
  mystics.graveWardBattleQueue = undefined;
  return false;
}

export function openNextGraveWardChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  for (const player of Object.values(game.players)) {
    if (openAssetEntry(game, player.id)) return true;
  }
  for (const player of Object.values(game.players)) {
    if (openBattleEffect(game, player.id)) return true;
  }
  return false;
}

export function isGraveWardAssetChoice(choice: unknown): choice is Extract<NonNullable<GameState['pendingMysticsChoice']>, { kind: 'grave_ward_asset' }> {
  return Boolean(choice && typeof choice === 'object' && (choice as { kind?: string }).kind === 'grave_ward_asset');
}

export function isGraveWardBattleChoice(kind?: string): boolean {
  return kind === 'grave_ward_battle';
}

export function resolveGraveWardAssetAction(game: GameState, action: UseMysticGraveWardAssetAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending
    || pending.kind !== 'grave_ward_asset'
    || pending.playerId !== action.playerId
    || pending.entryId !== action.entryId) {
    throw new GraveWardError(`${action.playerId} has no matching Grave Ward Asset choice.`);
  }
  const player = game.players[action.playerId];
  const entry = entryFor(game, action.playerId, action.entryId);
  if (!entry) throw new GraveWardError('The Grave Ward entry is no longer pending.');

  game.pendingMysticsChoice = undefined;
  if (action.choice === 'use') {
    if (!removeOne(player.zones.assetBank, GRAVE_WARD_CARD_ID)) {
      throw new GraveWardError('Grave Ward is no longer banked.');
    }
    if (!removeOne(player.zones.graveyard, entry.cardId)) {
      throw new GraveWardError(`${entry.cardId} is no longer in the Graveyard.`);
    }
    player.zones.discard.push(GRAVE_WARD_CARD_ID, entry.cardId);
    removeEntry(game, action.playerId, entry.id);
    publicLog(game, action.playerId, 'mystics_grave_ward_asset_used', `${player.name} discarded Grave Ward and moved ${entry.cardId} to their Discard Pile.`, {
      cardId: entry.cardId,
      battleId: entry.battleId,
    });
  } else {
    entry.triggersRemaining -= 1;
    if (entry.triggersRemaining < 1) removeEntry(game, action.playerId, entry.id);
    publicLog(game, action.playerId, 'mystics_grave_ward_asset_passed', `${player.name} declined Grave Ward for ${entry.cardId}.`, {
      cardId: entry.cardId,
      battleId: entry.battleId,
    });
  }
  if (game.phase !== 'game_over') game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}

export function resolveGraveWardBattleChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'grave_ward_battle' || pending.playerId !== action.playerId) {
    throw new GraveWardError(`${action.playerId} has no pending Grave Ward Battle choice.`);
  }
  if (action.choice !== 'select' || !action.cardId || !pending.handOptions.includes(action.cardId)) {
    throw new GraveWardError('Choose one eligible card committed from hand during this battle.');
  }
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.graveyard, action.cardId)) {
    throw new GraveWardError(`${action.cardId} is no longer in the Graveyard.`);
  }
  player.zones.discard.push(action.cardId);
  const mystics = player.mystics;
  if (mystics?.graveWardBattleQueue) {
    mystics.graveWardBattleQueue = mystics.graveWardBattleQueue.filter((effect) => effect.sourceKey !== pending.sourceKey);
    if (mystics.graveWardBattleQueue.length === 0) mystics.graveWardBattleQueue = undefined;
  }
  game.pendingMysticsChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  publicLog(game, action.playerId, 'mystics_grave_ward_battle_used', `${player.name} moved ${action.cardId} from their Graveyard to their Discard Pile with Grave Ward.`, {
    cardId: action.cardId,
    battleId: pending.battleId,
  });
}
