import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { PlayActionCardAction } from './actions';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const INSURRECTION = 'neutral-insurrection';
const INSURRECTION_BATTLE_RESOLUTION = 'neutral_insurrection_battle';

export interface PreparedInsurrectionAction {
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

function fisherYatesShuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === INSURRECTION
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (active(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(active).length;
}

function isCounterattack(game: GameState): boolean {
  const battle = game.battle;
  if (!battle) return false;
  const location = game.board.spaces.find((space) => space.id === battle.location);
  return Boolean(
    location
    && location.kind === 'territory'
    && location.controller === battle.attacker.playerId
    && location.occupant === battle.defender.playerId,
  );
}

export function insurrectionActionOpportunityActive(
  game: GameState,
  playerId: PlayerID,
): boolean {
  const opportunity = game.neutralInsurrectionActionOpportunity;
  return opportunity?.playerId === playerId && opportunity.turn === game.turn;
}

export function consumeInsurrectionActionOpportunity(
  game: GameState,
  playerId: PlayerID,
): void {
  if (insurrectionActionOpportunityActive(game, playerId)) {
    game.neutralInsurrectionActionOpportunity = undefined;
  }
}

export function clearInsurrectionActionOpportunity(
  game: GameState,
  playerId: PlayerID,
): void {
  if (game.neutralInsurrectionActionOpportunity?.playerId === playerId) {
    game.neutralInsurrectionActionOpportunity = undefined;
  }
}

export function prepareInsurrectionAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedInsurrectionAction | undefined {
  if (action.cardId !== INSURRECTION) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);

  const remainingHand = [...player.zones.hand];
  const sourceIndex = remainingHand.indexOf(INSURRECTION);
  if (sourceIndex < 0) {
    throw new GameActionError(`${player.name} does not have Insurrection in hand.`);
  }
  remainingHand.splice(sourceIndex, 1);
  return { remainingHand };
}

/** Resolves the Action form after the source card has reached its normal destination. */
export function applyInsurrectionAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedInsurrectionAction,
  random: () => number = Math.random,
): CardID[] {
  const player = game.players[playerId];

  player.zones.hand = [];
  player.zones.discard.push(...prepared.remainingHand);

  const recycled: Partial<Record<PlayerID, number>> = {};
  for (const participant of Object.values(game.players)) {
    const discardCount = participant.zones.discard.length;
    if (discardCount < 1) continue;
    participant.zones.deck = fisherYatesShuffle(
      [...participant.zones.deck, ...participant.zones.discard],
      random,
    );
    participant.zones.discard = [];
    recycled[participant.id] = discardCount;
  }

  const draw = drawFromDeck(player, { count: 3, shuffleDiscardIntoDeck: false });
  player.zones.hand.push(...draw.drawnCards);
  player.actionsRemaining += 1;
  game.neutralInsurrectionActionOpportunity = { playerId, turn: game.turn };

  appendPublicLog(
    game,
    playerId,
    'neutral_insurrection_action',
    `${player.name} discarded their hand, recycled both Discard Piles, drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'}, and gained 1 Action and another Action Opportunity with Insurrection.`,
    {
      discardedHandCount: prepared.remainingHand.length,
      recycled,
      drawCount: draw.drawnCards.length,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}

/** Applies one advantage per attacking copy, or two per copy while counterattacking. */
export function applyInsurrectionBattleEffects(game: GameState): boolean {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || battle.effectsResolved.includes(INSURRECTION_BATTLE_RESOLUTION)) return false;

  battle.effectsResolved.push(INSURRECTION_BATTLE_RESOLUTION);
  const copies = activeCopyCount(battle.attacker);
  if (copies < 1) return false;

  const counterattacking = isCounterattack(game);
  const advantage = copies * (counterattacking ? 2 : 1);
  battle.attacker.advantage = (battle.attacker.advantage ?? 0) + advantage;

  appendPublicLog(
    game,
    battle.attacker.playerId,
    'neutral_insurrection_battle',
    counterattacking
      ? `${game.players[battle.attacker.playerId].name} gained ${advantage} advantage while counterattacking with Insurrection.`
      : `${game.players[battle.attacker.playerId].name} gained ${advantage} advantage while attacking with Insurrection.`,
    { battleId: battle.id, copies, advantage, counterattacking },
  );
  return true;
}
