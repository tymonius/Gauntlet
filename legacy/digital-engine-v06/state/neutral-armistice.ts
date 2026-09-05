import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveBattleRevealAction, ResolveNeutralChoiceAction } from './actions';
import { reconcileFaceDownAssets } from './asset-facing';
import { activeBankedAssetCopies } from './banked-assets';
import { resolveBattleRevealCancellations } from './battle-reveal';
import { GameActionError } from './reducer';

export const ARMISTICE = 'neutral-armistice';

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

function removeChosenCards(source: CardID[], chosen: CardID[]): CardID[] {
  const remaining = [...source];
  for (const cardId of chosen) {
    if (!removeOne(remaining, cardId)) {
      throw new GameActionError(`${cardId} is not available to discard for Armistice.`);
    }
  }
  return remaining;
}

function unique(cards: readonly CardID[]): CardID[] {
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

function activeArmistice(card?: BattlePlayedCard): boolean {
  return Boolean(card
    && card.cardId === ARMISTICE
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

export function armisticeCanBeVoluntarilyDiscarded(cardId: CardID): boolean {
  return cardId !== ARMISTICE;
}

export function activeArmisticeAssetCount(game: GameState): number {
  return Object.values(game.players).reduce(
    (total, player) => total + activeBankedAssetCopies(game, player.id, ARMISTICE),
    0,
  );
}

export function requireArmisticeBattleAllowed(
  game: GameState,
  playerId: PlayerID,
  toSpaceId: string,
): void {
  const destination = game.board.spaces.find((space) => space.id === toSpaceId);
  if (!destination?.occupant || destination.occupant === playerId) return;
  if (activeArmisticeAssetCount(game) === 0) return;
  throw new GameActionError('A battle cannot be initiated while an active Armistice is banked.');
}

export function queueArmisticeAfterNormalDraw(game: GameState, playerId: PlayerID): number {
  const count = activeBankedAssetCopies(game, playerId, ARMISTICE);
  if (count < 1 || game.phase === 'game_over') return 0;
  const queue = game.neutralArmisticeAssetQueue ?? [];
  queue.push({
    id: `${game.id}-armistice-upkeep-${game.turn}-${queue.length + 1}`,
    playerId,
    triggersRemaining: count,
  });
  game.neutralArmisticeAssetQueue = queue;
  return count;
}

function trimArmisticeQueue(game: GameState): void {
  const retained = (game.neutralArmisticeAssetQueue ?? []).filter((entry) => {
    const active = activeBankedAssetCopies(game, entry.playerId, ARMISTICE);
    entry.triggersRemaining = Math.min(entry.triggersRemaining, active);
    return entry.triggersRemaining > 0;
  });
  game.neutralArmisticeAssetQueue = retained.length > 0 ? retained : undefined;
}

export function openNextArmisticeChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  trimArmisticeQueue(game);
  const entry = game.neutralArmisticeAssetQueue?.[0];
  if (!entry) return false;

  const player = game.players[entry.playerId];
  const mayPayCards = player.zones.hand.length >= 2;
  game.pendingNeutralChoice = {
    kind: 'armistice_asset',
    playerId: entry.playerId,
    entryId: entry.id,
    triggersRemaining: entry.triggersRemaining,
    cardOptions: unique(player.zones.hand),
    options: mayPayCards ? ['select_cards', 'use'] : ['use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = entry.playerId;
  return true;
}

export function resolveArmisticeChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'armistice_asset' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Armistice upkeep choice.`);
  }
  const entry = game.neutralArmisticeAssetQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Armistice upkeep is no longer pending.');

  const player = game.players[action.playerId];
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;

  if (action.choice === 'select_cards') {
    const chosen = action.cardIds ?? [];
    if (chosen.length !== 2) {
      throw new GameActionError('Choose exactly two cards from hand to maintain Armistice.');
    }
    const remaining = removeChosenCards(player.zones.hand, chosen);
    player.zones.hand = remaining;
    player.zones.discard.push(...chosen);
    entry.triggersRemaining -= 1;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_armistice_upkeep_paid',
      `${player.name} discarded two cards to maintain Armistice.`,
      { cardIds: chosen, triggersRemaining: entry.triggersRemaining },
    );
  } else if (action.choice === 'use') {
    if (activeBankedAssetCopies(game, action.playerId, ARMISTICE) < 1
      || !removeOne(player.zones.assetBank, ARMISTICE)) {
      throw new GameActionError('No active Armistice remains to discard.');
    }
    reconcileFaceDownAssets(player);
    player.zones.discard.push(ARMISTICE);
    entry.triggersRemaining -= 1;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_armistice_upkeep_failed',
      `${player.name} discarded Armistice instead of paying its upkeep.`,
      { triggersRemaining: entry.triggersRemaining },
    );
  } else {
    throw new GameActionError('Discard two cards from hand or discard Armistice.');
  }

  trimArmisticeQueue(game);
  openNextArmisticeChoice(game);
}

function allPlayedCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [
    ...(participant.handCommit ? [participant.handCommit] : []),
    ...participant.battleDrawPlayed,
  ];
}

function cleanParticipantBattleCards(
  game: GameState,
  participant: BattleParticipantState,
): { armistices: number; discarded: number } {
  const player = game.players[participant.playerId];
  let armistices = 0;
  let discarded = 0;

  for (const card of allPlayedCards(participant)) {
    if (card.virtual) continue;
    if (activeArmistice(card)) {
      player.zones.graveyard.push(card.cardId);
      armistices += 1;
    } else {
      player.zones.discard.push(card.cardId);
      discarded += 1;
    }
  }
  player.zones.discard.push(...participant.battleDraw);
  discarded += participant.battleDraw.length;
  return { armistices, discarded };
}

/**
 * Resolves cancellation first, then ends the battle immediately if at least one
 * physical Armistice remains active. No winner, retreat, or aftermath exists.
 */
export function resolveArmisticeBattleAfterCancellation(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  resolveBattleRevealCancellations(game, action);
  const battle = game.battle;
  if (!battle) return false;

  const activeCopies = [battle.attacker, battle.defender]
    .flatMap(allPlayedCards)
    .filter(activeArmistice);
  if (activeCopies.length === 0) return false;

  const origin = game.board.spaces.find((space) => space.id === battle.attackerOrigin);
  const location = game.board.spaces.find((space) => space.id === battle.location);
  const attacker = game.players[battle.attacker.playerId];
  const defender = game.players[battle.defender.playerId];

  if (origin) origin.occupant = battle.attacker.playerId;
  if (location) location.occupant = battle.defender.playerId;
  attacker.occupiedSpaceId = battle.attackerOrigin;
  defender.occupiedSpaceId = battle.location;

  const attackerCleanup = cleanParticipantBattleCards(game, battle.attacker);
  const defenderCleanup = cleanParticipantBattleCards(game, battle.defender);
  appendPublicLog(
    game,
    activeCopies[0]!.owner,
    'neutral_armistice_battle_ended',
    'Armistice ended the battle immediately without a winner.',
    {
      battleId: battle.id,
      attacker: battle.attacker.playerId,
      defender: battle.defender.playerId,
      location: battle.location,
      attackerOrigin: battle.attackerOrigin,
      activeCopies: activeCopies.length,
      armisticesGraveyarded: attackerCleanup.armistices + defenderCleanup.armistices,
      otherCardsDiscarded: attackerCleanup.discarded + defenderCleanup.discarded,
      returnWasRetreat: false,
    },
  );

  game.battle = undefined;
  game.phase = 'action_after_movement';
  game.priorityPlayer = game.activePlayer;
  return true;
}
