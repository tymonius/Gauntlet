import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import type { ResolveBattleRevealAction } from './actions';
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

function activeArmistice(card?: BattlePlayedCard): boolean {
  return Boolean(card
    && card.cardId === ARMISTICE
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

function activeArmisticeConditions(game: GameState): NonNullable<GameState['neutralArmisticeConditions']> {
  return (game.neutralArmisticeConditions ?? []).filter((condition) => game.turn <= condition.expiresAtTurn);
}

export function registerArmisticeActionCondition(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (!player?.zones.removed.includes(ARMISTICE)) return;
  game.neutralArmisticeConditions ??= [];
  game.neutralArmisticeConditions.push({
    playerId,
    sourceCardId: ARMISTICE,
    playedTurn: game.turn,
    expiresAtTurn: game.turn + 1,
  });
  appendPublicLog(
    game,
    playerId,
    'neutral_armistice_condition_played',
    `${player.name} declared an Armistice through the end of the opponent's next turn.`,
    { playedTurn: game.turn, expiresAtTurn: game.turn + 1 },
  );
}

export function requireArmisticeBattleAllowed(
  game: GameState,
  playerId: PlayerID,
  toSpaceId: string,
): void {
  const destination = game.board.spaces.find((space) => space.id === toSpaceId);
  if (!destination?.occupant || destination.occupant === playerId) return;
  if (activeArmisticeConditions(game).length === 0) return;
  throw new GameActionError('A battle cannot be initiated while Armistice is in effect.');
}

export function expireArmisticeConditions(game: GameState, endedTurn: number): void {
  const conditions = game.neutralArmisticeConditions ?? [];
  if (conditions.length === 0) return;

  const remaining = [];
  for (const condition of conditions) {
    if (condition.expiresAtTurn > endedTurn) {
      remaining.push(condition);
      continue;
    }
    const player = game.players[condition.playerId];
    if (player && removeOne(player.zones.removed, condition.sourceCardId)) {
      player.zones.discard.push(condition.sourceCardId);
    }
    if (player) {
      appendPublicLog(
        game,
        condition.playerId,
        'neutral_armistice_condition_expired',
        `${player.name}'s Armistice ended.`,
        { playedTurn: condition.playedTurn, expiredAfterTurn: endedTurn },
      );
    }
  }
  game.neutralArmisticeConditions = remaining.length > 0 ? remaining : undefined;
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
