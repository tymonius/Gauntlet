import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
  ResolvedBattleModifier,
  SpaceID,
} from '../types/v06';
import type { PlayActionCardAction } from './actions';
import { GameActionError } from './reducer';
import { territoryPrintedEffectIsActive } from './territory-printed-effects';

export const PATHFINDERS = 'neutral-pathfinders';
const PATHFINDERS_BATTLE_RESOLUTION = 'neutral_pathfinders_battle';

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

export function preparePathfindersAction(
  game: GameState,
  action: PlayActionCardAction,
): SpaceID | undefined {
  if (action.cardId !== PATHFINDERS) return undefined;
  const targets = action.targets ?? [];
  const target = targets[0];
  if (targets.length !== 1 || !target || target.kind !== 'space') {
    throw new GameActionError('Pathfinders requires exactly one Territory target.');
  }
  const space = game.board.spaces.find((candidate) => candidate.id === target.spaceId);
  if (!space || space.kind !== 'territory') {
    throw new GameActionError('Pathfinders can target only a Territory.');
  }
  return space.id;
}

export function applyPathfindersAction(
  game: GameState,
  playerId: PlayerID,
  spaceId: SpaceID,
): void {
  const retained = game.neutralPathfindersSuppressions?.filter((suppression) => !(
    suppression.playerId === playerId
    && suppression.spaceId === spaceId
    && suppression.turn === game.turn
  )) ?? [];
  game.neutralPathfindersSuppressions = [
    ...retained,
    { playerId, spaceId, turn: game.turn },
  ];
  appendPublicLog(
    game,
    playerId,
    'neutral_pathfinders_action',
    `${game.players[playerId].name} made the printed effect of ${spaceId} inactive during their movement this turn.`,
    { playerId, spaceId, turn: game.turn },
  );
}

function activePathfinders(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === PATHFINDERS && !card.canceled && !card.negated);
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activePathfinders(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activePathfinders).length;
}

export function applyPathfindersBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(PATHFINDERS_BATTLE_RESOLUTION)) return;

  const contestedSpace = game.board.spaces.find((space) => space.id === battle.location);
  const printedEffectActive = territoryPrintedEffectIsActive(
    game,
    contestedSpace,
    battle.attacker.playerId,
  );
  const modifiers: ResolvedBattleModifier[] = [];

  if (printedEffectActive) {
    for (const participant of [battle.attacker, battle.defender]) {
      const count = activeCopyCount(participant);
      if (count === 0) continue;
      participant.modifiers += count;
      modifiers.push({
        playerId: participant.playerId,
        source: PATHFINDERS,
        amount: count,
        reason: `Pathfinders Battle: +${count} because the contested Territory has an active printed effect.`,
      });
      appendPublicLog(
        game,
        participant.playerId,
        'neutral_pathfinders_battle',
        `${game.players[participant.playerId].name} gained +${count} from Pathfinders.`,
        { battleId: battle.id, spaceId: battle.location, count },
      );
    }
  }

  battle.resolvedModifiers = [...(battle.resolvedModifiers ?? []), ...modifiers];
  battle.effectsResolved.push(PATHFINDERS_BATTLE_RESOLUTION);
}
