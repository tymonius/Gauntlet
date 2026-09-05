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

export const TACTICAL_PLANNING = 'neutral-tactical-planning';

export interface PreparedTacticalPlanningAction {
  remainingHand: CardID[];
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

function unique(cards: CardID[]): CardID[] {
  return [...new Set(cards)];
}

export function prepareTacticalPlanningAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedTacticalPlanningAction | undefined {
  if (action.cardId !== TACTICAL_PLANNING) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);

  const remainingHand = [...player.zones.hand];
  if (!removeOne(remainingHand, TACTICAL_PLANNING)) {
    throw new GameActionError(`${player.name} does not have Tactical Planning in hand.`);
  }
  return { remainingHand };
}

export function applyTacticalPlanningAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedTacticalPlanningAction,
): CardID[] {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];

  const draw = drawFromDeck(player, { count: 2 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    playerId,
    'neutral_tactical_planning_action_draw',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Tactical Planning.`,
    {
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );

  if (player.zones.hand.length > 0) {
    game.pendingNeutralChoice = {
      kind: 'tactical_planning_action',
      playerId,
      cardOptions: unique(player.zones.hand),
      options: ['select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = playerId;
  }
  return draw.drawnCards;
}

export function resolveTacticalPlanningChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'tactical_planning_action' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Tactical Planning choice.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one card from your hand to place on the bottom of your Draw Pile.');
  }

  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in hand.`);
  }
  player.zones.deck.push(action.cardId);
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  appendPublicLog(
    game,
    action.playerId,
    'neutral_tactical_planning_action_bottomdeck',
    `${player.name} placed one card from hand on the bottom of their Draw Pile with Tactical Planning.`,
  );
}
