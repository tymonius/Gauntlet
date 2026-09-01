import type {
  BattleParticipantState,
  BattleState,
  GameEvent,
  GameState,
  PendingPathsOfShadowChoice,
  PlayerID,
  SpaceID,
} from '../types/v06';
import type { ActionCardTarget, ResolveMysticsChoiceAction } from './actions';
import { GameActionError } from './reducer';
import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';

export const PATHS_OF_SHADOW = 'mystics-paths-of-shadow';

interface BattleResolvedPayload {
  cancellations?: Array<{ cardId?: string; owner?: PlayerID }>;
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

function participantFor(battle: BattleState, playerId: PlayerID): BattleParticipantState | undefined {
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  return undefined;
}

function latestBattleCancellations(game: GameState): NonNullable<BattleResolvedPayload['cancellations']> {
  for (let index = game.log.length - 1; index >= 0; index -= 1) {
    const event = game.log[index];
    if (event.type !== 'battle_resolved') continue;
    return ((event.payload ?? {}) as BattleResolvedPayload).cancellations ?? [];
  }
  return [];
}

function activePathsOfShadowCount(game: GameState, battle: BattleState, playerId: PlayerID): number {
  const participant = participantFor(battle, playerId);
  if (!participant) return 0;
  const playedCount = [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((played) => played?.cardId === PATHS_OF_SHADOW && !played.canceled)
    .length;
  const canceledDuringResolution = latestBattleCancellations(game)
    .filter((cancellation) => cancellation.owner === playerId && cancellation.cardId === PATHS_OF_SHADOW)
    .length;
  return Math.max(playedCount - canceledDuringResolution, 0);
}

function controlledOpenTerritories(game: GameState, playerId: PlayerID): SpaceID[] {
  const current = game.players[playerId]?.occupiedSpaceId;
  return game.board.spaces
    .filter((space) => (
      space.kind === 'territory'
      && space.controller === playerId
      && !space.occupant
      && space.id !== current
    ))
    .map((space) => space.id);
}

function clearAbandonedOccupation(game: GameState, playerId: PlayerID): void {
  const origin = game.board.spaces.find((space) => space.occupant === playerId);
  if (!origin) return;
  origin.occupant = undefined;
  if (origin.capturePendingBy === playerId) delete origin.capturePendingBy;
}

function relocateToControlledTerritory(game: GameState, playerId: PlayerID, spaceId: SpaceID): void {
  const destination = game.board.spaces.find((space) => space.id === spaceId);
  if (!destination) throw new GameActionError(`Unknown space: ${spaceId}.`);
  if (destination.kind !== 'territory' || destination.controller !== playerId) {
    throw new GameActionError('Paths of Shadow must move you to a Territory you control.');
  }
  if (destination.occupant) {
    throw new GameActionError('Paths of Shadow cannot move you to an occupied Territory or initiate a battle.');
  }

  clearAbandonedOccupation(game, playerId);
  destination.occupant = playerId;
  delete destination.capturePendingBy;
  game.players[playerId].occupiedSpaceId = destination.id;
}

function actionDestination(
  game: GameState,
  playerId: PlayerID,
  cardId: string,
  targets?: ActionCardTarget[],
): SpaceID | undefined {
  if (cardId !== PATHS_OF_SHADOW) return undefined;
  if (targets?.length !== 1 || targets[0]?.kind !== 'space') {
    throw new GameActionError('Paths of Shadow requires exactly one controlled Territory target.');
  }
  const destination = targets[0].spaceId;
  const origin = game.players[playerId]?.occupiedSpaceId;
  if (destination === origin) throw new GameActionError('Paths of Shadow must move you to a different Territory.');

  const space = game.board.spaces.find((candidate) => candidate.id === destination);
  if (!space) throw new GameActionError(`Unknown space: ${destination}.`);
  if (space.kind !== 'territory' || space.controller !== playerId) {
    throw new GameActionError('Paths of Shadow requires a Territory you control.');
  }
  if (space.occupant) {
    throw new GameActionError('Paths of Shadow cannot move you to an occupied Territory or initiate a battle.');
  }
  return destination;
}

export function requirePathsOfShadowActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: string,
  targets?: ActionCardTarget[],
): void {
  actionDestination(game, playerId, cardId, targets);
}

export function applyPathsOfShadowAction(
  game: GameState,
  playerId: PlayerID,
  cardId: string,
  targets?: ActionCardTarget[],
): void {
  const destination = actionDestination(game, playerId, cardId, targets);
  if (!destination) return;
  const origin = game.players[playerId].occupiedSpaceId;
  relocateToControlledTerritory(game, playerId, destination);
  publicLog(
    game,
    playerId,
    'mystics_paths_of_shadow_action',
    `${game.players[playerId].name} moved through Paths of Shadow to ${destination}.`,
    { fromSpaceId: origin, toSpaceId: destination },
  );
}

export function queuePathsOfShadowAfterBattle(game: GameState, battle: BattleState): void {
  const result = game.recentBattleResult;
  if (!result || result.battleId !== battle.id) return;
  const player = game.players[result.loser];
  if (player?.factionId !== 'mystics' || !player.mystics) return;
  if (lossOrRetreatBenefitsSuppressed(game, result.loser, battle.id)) return;
  if (activePathsOfShadowCount(game, battle, result.loser) < 1) return;

  const spaceOptions = controlledOpenTerritories(game, result.loser);
  if (spaceOptions.length === 0) return;
  player.mystics.pathsOfShadowBattleQueue ??= [];
  if (player.mystics.pathsOfShadowBattleQueue.some((entry) => entry.battleId === battle.id)) return;
  player.mystics.pathsOfShadowBattleQueue.push({
    battleId: battle.id,
    normalRetreatSpaceId: player.occupiedSpaceId,
    spaceOptions,
  });
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

function validQueuedSpaces(game: GameState, playerId: PlayerID, options: SpaceID[]): SpaceID[] {
  const current = game.players[playerId]?.occupiedSpaceId;
  return options.filter((spaceId) => {
    const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
    return Boolean(
      space
      && space.kind === 'territory'
      && space.controller === playerId
      && !space.occupant
      && space.id !== current,
    );
  });
}

export function openPathsOfShadowChoiceIfReady(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;

  for (const player of Object.values(game.players)) {
    const queue = player.mystics?.pathsOfShadowBattleQueue;
    while (queue && queue.length > 0) {
      const entry = queue[0];
      const spaceOptions = validQueuedSpaces(game, player.id, entry.spaceOptions);
      if (spaceOptions.length === 0) {
        queue.shift();
        continue;
      }
      const pending: PendingPathsOfShadowChoice = {
        kind: 'paths_of_shadow_battle',
        playerId: player.id,
        battleId: entry.battleId,
        normalRetreatSpaceId: entry.normalRetreatSpaceId,
        spaceOptions,
        options: ['pass', 'move'],
        resumePriorityPlayer: game.priorityPlayer,
      };
      game.pendingMysticsChoice = pending;
      game.priorityPlayer = player.id;
      return true;
    }
    if (queue?.length === 0) player.mystics!.pathsOfShadowBattleQueue = undefined;
  }
  return false;
}

export function isPathsOfShadowChoice(kind: unknown): kind is PendingPathsOfShadowChoice['kind'] {
  return kind === 'paths_of_shadow_battle';
}

export function resolvePathsOfShadowChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'paths_of_shadow_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Paths of Shadow choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'move') {
    throw new GameActionError('Choose whether to use Paths of Shadow.');
  }

  const queue = game.players[action.playerId].mystics?.pathsOfShadowBattleQueue;
  const resumePriorityPlayer = pending.resumePriorityPlayer;
  game.pendingMysticsChoice = undefined;
  if (queue?.[0]?.battleId === pending.battleId) queue.shift();
  if (queue?.length === 0) game.players[action.playerId].mystics!.pathsOfShadowBattleQueue = undefined;

  if (action.choice === 'pass') {
    game.priorityPlayer = resumePriorityPlayer ?? game.activePlayer;
    publicLog(
      game,
      action.playerId,
      'mystics_paths_of_shadow_passed',
      `${game.players[action.playerId].name} retreated normally instead of using Paths of Shadow.`,
      { battleId: pending.battleId, retreatSpaceId: pending.normalRetreatSpaceId },
    );
    return;
  }

  if (!action.spaceId || !pending.spaceOptions.includes(action.spaceId)) {
    throw new GameActionError('Choose an eligible controlled Territory for Paths of Shadow.');
  }
  const fromSpaceId = game.players[action.playerId].occupiedSpaceId;
  relocateToControlledTerritory(game, action.playerId, action.spaceId);
  game.priorityPlayer = resumePriorityPlayer ?? game.activePlayer;
  publicLog(
    game,
    action.playerId,
    'mystics_paths_of_shadow_battle',
    `${game.players[action.playerId].name} used Paths of Shadow instead of retreating normally.`,
    { battleId: pending.battleId, fromSpaceId, toSpaceId: action.spaceId },
  );
}
