import type {
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
} from '../types/v06';
import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';
import { GameActionError } from './reducer';

export const ENTRENCHMENT = 'neutral-entrenchment';
const ENTRENCHMENT_BATTLE_RESOLUTION = 'neutral_entrenchment_battle';

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

function activeEntrenchment(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === ENTRENCHMENT
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID | undefined {
  return Object.keys(game.players).find((candidate) => candidate !== playerId);
}

function playerStartIndex(game: GameState, playerId: PlayerID): number | undefined {
  return game.board.spaces.find((space) => (
    space.kind === 'endpoint'
    && space.endpointOwner === playerId
    && space.endpointRole === 'before_gauntlet'
  ))?.index ?? game.board.spaces.find((space) => (
    space.kind === 'heartland' && space.controller === playerId
  ))?.index;
}

function movementIsAdvance(
  game: GameState,
  playerId: PlayerID,
  originSpaceId: SpaceID,
  destinationSpaceId: SpaceID,
): boolean {
  const origin = game.board.spaces.find((space) => space.id === originSpaceId);
  const destination = game.board.spaces.find((space) => space.id === destinationSpaceId);
  const startIndex = playerStartIndex(game, playerId);
  if (!origin || !destination || startIndex === undefined) return false;
  return Math.abs(destination.index - startIndex) > Math.abs(origin.index - startIndex);
}

function ownerTokenAdjacentTo(game: GameState, ownerId: PlayerID, destinationSpaceId: SpaceID): boolean {
  const ownerSpace = game.board.spaces.find((space) => space.occupant === ownerId);
  const destination = game.board.spaces.find((space) => space.id === destinationSpaceId);
  return Boolean(ownerSpace && destination && Math.abs(ownerSpace.index - destination.index) === 1);
}

export function applyEntrenchmentMovementTrigger(
  game: GameState,
  movingPlayerId: PlayerID,
  originSpaceId: SpaceID | undefined,
  destinationSpaceId: SpaceID,
  initiatedBattle: boolean,
): boolean {
  if (!originSpaceId || initiatedBattle) return false;
  const destination = game.board.spaces.find((space) => space.id === destinationSpaceId);
  if (!destination || destination.kind !== 'territory' || destination.occupant !== movingPlayerId) return false;
  if (!movementIsAdvance(game, movingPlayerId, originSpaceId, destinationSpaceId)) return false;

  const ownerId = opponentId(game, movingPlayerId);
  const owner = ownerId ? game.players[ownerId] : undefined;
  if (!owner || !bankedAssetCardUseAllowed(game, owner.id, ENTRENCHMENT)) return false;
  if (!ownerTokenAdjacentTo(game, owner.id, destinationSpaceId)) return false;

  const movingPlayer = game.players[movingPlayerId];
  movingPlayer.movementRemaining = 0;
  movingPlayer.nonBattleMovementRemaining = 0;
  movingPlayer.advanceGuardMovementRemaining = 0;
  movingPlayer.invasionAdvanceMovementRemaining = 0;
  game.neutralEntrenchmentActionLocks = [
    ...(game.neutralEntrenchmentActionLocks ?? []).filter((lock) => lock.playerId !== movingPlayerId),
    { playerId: movingPlayerId, sourcePlayerId: owner.id, turn: game.turn },
  ];
  if (game.phase !== 'game_over') game.phase = 'action_after_movement';
  game.priorityPlayer = movingPlayerId;

  appendPublicLog(
    game,
    owner.id,
    'neutral_entrenchment_triggered',
    `${owner.name}'s Entrenchment ended ${movingPlayer.name}'s movement and prevented an Action card after movement.`,
    { movingPlayerId, sourcePlayerId: owner.id, destinationSpaceId },
  );
  return true;
}

export function entrenchmentActionPlayProhibited(game: GameState, playerId: PlayerID): boolean {
  return game.phase === 'action_after_movement'
    && Boolean(game.neutralEntrenchmentActionLocks?.some((lock) => (
      lock.playerId === playerId && lock.turn === game.turn
    )));
}

export function requireEntrenchmentActionAllowed(game: GameState, playerId: PlayerID): void {
  if (entrenchmentActionPlayProhibited(game, playerId)) {
    throw new GameActionError('Entrenchment prevents this player from playing a card for its Action effect after movement this turn.');
  }
}

export function clearExpiredEntrenchmentLocks(game: GameState): void {
  const active = (game.neutralEntrenchmentActionLocks ?? [])
    .filter((lock) => lock.turn >= game.turn);
  game.neutralEntrenchmentActionLocks = active.length > 0 ? active : undefined;
}

export function applyEntrenchmentBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(ENTRENCHMENT_BATTLE_RESOLUTION)) return;

  const defender = battle.defender;
  const count = (activeEntrenchment(defender.handCommit) ? 1 : 0)
    + defender.battleDrawPlayed.filter(activeEntrenchment).length;
  if (count > 0) {
    battle.attacker.disadvantage = (battle.attacker.disadvantage ?? 0) + count;
    appendPublicLog(
      game,
      defender.playerId,
      'neutral_entrenchment_battle',
      `${game.players[defender.playerId].name} imposed ${count} disadvantage with Entrenchment while defending.`,
      { battleId: battle.id, count },
    );
  }
  battle.effectsResolved.push(ENTRENCHMENT_BATTLE_RESOLUTION);
}
