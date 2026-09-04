import type { CardID, GameEvent, GameState, PlayerID } from '../types/v06';
import type { PlayActionCardAction } from './actions';
import { faceUpAssetCopies, reconcileFaceDownAssets } from './asset-facing';
import { GameActionError } from './reducer';

export const SABOTAGE = 'neutral-sabotage';

export interface PreparedSabotageAction {
  targetPlayerId: PlayerID;
  targetCardId: CardID;
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
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

export function prepareSabotageAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedSabotageAction {
  if (action.cardId !== SABOTAGE) throw new GameActionError('Sabotage was not played.');
  if (action.targets?.length !== 1 || action.targets[0].kind !== 'card') {
    throw new GameActionError('Sabotage requires one face-up opposing Asset target.');
  }
  const target = action.targets[0];
  if (target.owner === action.playerId) {
    throw new GameActionError('Sabotage must target an opposing Asset.');
  }
  const targetPlayer = game.players[target.owner];
  if (!targetPlayer || faceUpAssetCopies(targetPlayer, target.cardId) < 1) {
    throw new GameActionError('Sabotage must target a face-up opposing Asset.');
  }
  return { targetPlayerId: target.owner, targetCardId: target.cardId };
}

export function applySabotageAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedSabotageAction,
): void {
  const targetPlayer = game.players[prepared.targetPlayerId];
  if (!targetPlayer || faceUpAssetCopies(targetPlayer, prepared.targetCardId) < 1) {
    throw new GameActionError('The chosen Sabotage target is no longer a face-up opposing Asset.');
  }
  targetPlayer.faceDownAssets = [...(targetPlayer.faceDownAssets ?? []), prepared.targetCardId];
  game.neutralSabotageAssetSuppressions = [
    ...(game.neutralSabotageAssetSuppressions ?? []),
    {
      id: `${game.id}-sabotage-${game.turn}-${(game.neutralSabotageAssetSuppressions?.length ?? 0) + 1}`,
      sourcePlayerId: playerId,
      targetPlayerId: prepared.targetPlayerId,
      cardId: prepared.targetCardId,
      appliedTurn: game.turn,
    },
  ];
  appendPublicLog(
    game,
    playerId,
    'neutral_sabotage_action',
    `${game.players[playerId].name} turned ${targetPlayer.name}'s ${prepared.targetCardId} face down with Sabotage.`,
    { targetPlayerId: prepared.targetPlayerId, cardId: prepared.targetCardId },
  );
}

/** Removes stale markers and suppression records when a targeted Asset leaves play. */
export function reconcileSabotageAssetState(game: GameState): void {
  for (const player of Object.values(game.players)) reconcileFaceDownAssets(player);

  const available = new Map<string, number>();
  for (const player of Object.values(game.players)) {
    for (const cardId of player.faceDownAssets ?? []) {
      const key = `${player.id}:${cardId}`;
      available.set(key, (available.get(key) ?? 0) + 1);
    }
  }

  const retained = [] as NonNullable<GameState['neutralSabotageAssetSuppressions']>;
  for (const suppression of game.neutralSabotageAssetSuppressions ?? []) {
    const key = `${suppression.targetPlayerId}:${suppression.cardId}`;
    const count = available.get(key) ?? 0;
    if (count < 1) continue;
    available.set(key, count - 1);
    retained.push(suppression);
  }
  game.neutralSabotageAssetSuppressions = retained.length > 0 ? retained : undefined;
}

/** Restores every Asset sabotaged by the active player at the start of that player's next turn. */
export function restoreSabotagedAssetsAtTurnStart(game: GameState): number {
  if (game.phase !== 'turn_start') return 0;
  const sourcePlayerId = game.activePlayer;
  const restoring = (game.neutralSabotageAssetSuppressions ?? []).filter((suppression) => (
    suppression.sourcePlayerId === sourcePlayerId && suppression.appliedTurn < game.turn
  ));
  if (restoring.length < 1) return 0;

  for (const suppression of restoring) {
    const target = game.players[suppression.targetPlayerId];
    if (target) removeOne(target.faceDownAssets ?? [], suppression.cardId);
    appendPublicLog(
      game,
      sourcePlayerId,
      'neutral_sabotage_restored',
      `${game.players[suppression.targetPlayerId]?.name ?? suppression.targetPlayerId}'s ${suppression.cardId} turned face up as Sabotage expired.`,
      { targetPlayerId: suppression.targetPlayerId, cardId: suppression.cardId },
    );
  }
  const restoringIds = new Set(restoring.map((suppression) => suppression.id));
  const remaining = (game.neutralSabotageAssetSuppressions ?? [])
    .filter((suppression) => !restoringIds.has(suppression.id));
  game.neutralSabotageAssetSuppressions = remaining.length > 0 ? remaining : undefined;
  reconcileSabotageAssetState(game);
  return restoring.length;
}
