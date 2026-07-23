import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
} from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';

const EXFILTRATION = 'intelligence-exfiltration';

export class ExfiltrationBattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExfiltrationBattleError';
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

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function participantUsedExfiltration(participant: BattleParticipantState): boolean {
  return active(participant.handCommit) && participant.handCommit.cardId === EXFILTRATION
    || participant.battleDrawPlayed.some((card) => active(card) && card.cardId === EXFILTRATION);
}

export function exfiltrationBattlePlayers(game: GameState): PlayerID[] {
  const battle = game.battle;
  if (!battle) return [];
  return [battle.attacker, battle.defender]
    .filter((participant) => participantUsedExfiltration(participant))
    .map((participant) => participant.playerId);
}

function currentSpace(game: GameState, playerId: PlayerID) {
  const occupiedSpaceId = game.players[playerId]?.occupiedSpaceId;
  return game.board.spaces.find((space) => space.id === occupiedSpaceId)
    ?? game.board.spaces.find((space) => space.occupant === playerId);
}

function ownBeforeGauntlet(game: GameState, playerId: PlayerID) {
  return game.board.spaces.find((space) => (
    space.kind === 'endpoint'
    && space.endpointOwner === playerId
    && space.endpointRole === 'before_gauntlet'
  ));
}

export function exfiltrationBattleDestination(game: GameState, playerId: PlayerID): SpaceID | undefined {
  const current = currentSpace(game, playerId);
  const ownEnd = ownBeforeGauntlet(game, playerId);
  if (!current || !ownEnd) return undefined;
  const direction = Math.sign(ownEnd.index - current.index);
  if (direction === 0) return undefined;
  const destination = game.board.spaces.find((space) => space.index === current.index + direction);
  if (!destination || destination.occupant) return undefined;
  return destination.id;
}

function resumePriority(game: GameState, fallback?: PlayerID): PlayerID | undefined {
  return game.pendingMilitaryChoice?.playerId
    ?? game.pendingMilitaryTimingChoice?.playerId
    ?? game.pendingDiplomatChoice?.playerId
    ?? game.pendingFinancierChoice?.playerId
    ?? game.pendingLeaderAbilityWindow?.playerId
    ?? Object.keys(game.pendingAssetBankDiscards ?? {})[0]
    ?? fallback
    ?? game.activePlayer;
}

export function openExfiltrationBattleWindow(
  game: GameState,
  eligiblePlayers: PlayerID[],
  expectedBattleId: string,
): boolean {
  if (game.phase === 'game_over' || game.pendingIntelligenceChoice || game.battle?.id === expectedBattleId) return false;
  const result = game.recentBattleResult;
  const winner = result?.winner;
  if (!result || result.battleId !== expectedBattleId || !winner || !eligiblePlayers.includes(winner)) return false;
  const destinationId = exfiltrationBattleDestination(game, winner);
  if (!destinationId) return false;

  const previousPriority = game.priorityPlayer;
  game.pendingIntelligenceChoice = {
    kind: 'exfiltration_battle_withdraw',
    playerId: winner,
    battleId: result.battleId,
    destinationId,
    options: ['pass', 'withdraw'],
    resumePriorityPlayer: previousPriority,
  };
  game.priorityPlayer = winner;
  return true;
}

function withdraw(game: GameState, playerId: PlayerID, destinationId: SpaceID): void {
  const current = currentSpace(game, playerId);
  const destination = game.board.spaces.find((space) => space.id === destinationId);
  if (!current || !destination || destination.occupant) {
    throw new ExfiltrationBattleError('The Exfiltration withdrawal destination is no longer available.');
  }
  current.occupant = undefined;
  destination.occupant = playerId;
  game.players[playerId].occupiedSpaceId = destination.id;
  publicLog(
    game,
    playerId,
    'intelligence_exfiltration_battle_withdrawal',
    `${game.players[playerId].name} withdrew one position with Exfiltration after winning the battle.`,
    { from: current.id, to: destination.id, battleId: game.recentBattleResult?.battleId },
  );
}

export function resolveExfiltrationBattleChoice(
  game: GameState,
  action: ResolveIntelligenceChoiceAction,
): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'exfiltration_battle_withdraw' || pending.playerId !== action.playerId) {
    throw new ExfiltrationBattleError(`${action.playerId} has no pending Exfiltration Battle choice.`);
  }

  if (action.choice === 'withdraw') {
    withdraw(game, action.playerId, pending.destinationId);
  } else if (action.choice !== 'pass') {
    throw new ExfiltrationBattleError('Choose whether to withdraw with Exfiltration.');
  }

  const fallback = pending.resumePriorityPlayer;
  game.pendingIntelligenceChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = resumePriority(game, fallback);
}
