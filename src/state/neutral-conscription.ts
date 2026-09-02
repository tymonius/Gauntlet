import { cardCanBePlayedAt, destinationForCardPlay } from '../cards';
import type {
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type {
  PlayActionCardAction,
  ResolveNeutralChoiceAction,
} from './actions';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const CONSCRIPTION = 'neutral-conscription';

export interface PreparedConscriptionAction {
  remainingHand: CardID[];
}

export interface ConscriptionAssetPlaySnapshot {
  actionsRemaining: number;
  hasPlayedActionThisTurn: boolean;
  hasPlayedBattleThisTurn: boolean;
}

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

export function conscriptionAssetCardCanBePlayed(cardId: CardID): boolean {
  return cardCanBePlayedAt(cardId, 'action', 'hand')
    && destinationForCardPlay(cardId, 'hand') === 'asset_bank';
}

function eligibleAssetCards(game: GameState, playerId: PlayerID): CardID[] {
  const player = game.players[playerId];
  if (!player || player.zones.assetBank.length >= player.controlledTerritories.length) return [];
  return [...new Set(player.zones.hand.filter(conscriptionAssetCardCanBePlayed))];
}

export function prepareConscriptionAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedConscriptionAction | undefined {
  if (action.cardId !== CONSCRIPTION) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);

  const remainingHand = [...player.zones.hand];
  if (!removeOne(remainingHand, CONSCRIPTION)) {
    throw new GameActionError(`${player.name} does not have Conscription in hand.`);
  }
  return { remainingHand };
}

export function applyConscriptionAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedConscriptionAction,
): CardID[] {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];

  const draw = drawFromDeck(player, { count: 1 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    playerId,
    'neutral_conscription_action_draw',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Conscription.`,
    {
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );

  const cardOptions = eligibleAssetCards(game, playerId);
  if (cardOptions.length > 0) {
    game.pendingNeutralChoice = {
      kind: 'conscription_action',
      playerId,
      cardOptions,
      options: ['pass', 'play_action_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = playerId;
  }
  return draw.drawnCards;
}

export function beginConscriptionAssetPlay(
  game: GameState,
  action: PlayActionCardAction,
): ConscriptionAssetPlaySnapshot {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'conscription_action' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Conscription Asset play.`);
  }
  if (!pending.cardOptions.includes(action.cardId) || !conscriptionAssetCardCanBePlayed(action.cardId)) {
    throw new GameActionError('Conscription may immediately play only an eligible Asset card from hand.');
  }

  const player = game.players[action.playerId];
  if (!player.zones.hand.includes(action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in hand.`);
  }
  if (player.zones.assetBank.length >= player.controlledTerritories.length) {
    throw new GameActionError(`${player.name}'s Asset Bank is full.`);
  }

  const snapshot: ConscriptionAssetPlaySnapshot = {
    actionsRemaining: player.actionsRemaining,
    hasPlayedActionThisTurn: player.hasPlayedActionThisTurn,
    hasPlayedBattleThisTurn: player.hasPlayedBattleThisTurn,
  };
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;

  // Give the ordinary Action-card pipeline a temporary opportunity. The
  // snapshot is restored after the selected card and its complete Action
  // effect resolve, so Conscription never spends another Action.
  player.actionsRemaining += 1;
  player.hasPlayedActionThisTurn = false;
  player.hasPlayedBattleThisTurn = false;
  return snapshot;
}

export function finishConscriptionAssetPlay(
  game: GameState,
  playerId: PlayerID,
  snapshot: ConscriptionAssetPlaySnapshot,
): void {
  const player = game.players[playerId];
  player.actionsRemaining = snapshot.actionsRemaining;
  player.hasPlayedActionThisTurn = snapshot.hasPlayedActionThisTurn || player.hasPlayedActionThisTurn;
  player.hasPlayedBattleThisTurn = snapshot.hasPlayedBattleThisTurn || player.hasPlayedBattleThisTurn;
  appendPublicLog(
    game,
    playerId,
    'neutral_conscription_action_asset',
    `${player.name} immediately played an Asset with Conscription without spending another Action.`,
  );
}

export function resolveConscriptionChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'conscription_action' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Conscription choice.`);
  }
  if (action.choice !== 'pass') {
    throw new GameActionError('Play an eligible Asset card or pass Conscription.');
  }

  const player = game.players[action.playerId];
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  appendPublicLog(
    game,
    action.playerId,
    'neutral_conscription_action_pass',
    `${player.name} declined to play an Asset with Conscription.`,
  );
}
