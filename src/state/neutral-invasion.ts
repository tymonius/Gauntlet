import { cardCanBePlayedAt } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
} from '../types';
import type {
  ResolveBattleRevealAction,
  ResolveNeutralChoiceAction,
} from './actions';
import { resolveBattleRevealCancellations } from './battle-reveal';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const INVASION = 'neutral-invasion';

const TOO_LATE_AFTER_REVEAL = new Set([
  'card-embargo',
  'neutral-disruption',
  'neutral-sabotage',
  'neutral-palisade-wall',
  'neutral-scouting-report',
  'intelligence-spies',
  'intelligence-intercepted-orders',
  'intelligence-treason',
  'inquisition-confession',
]);

export interface InvasionMovementSnapshot {
  invasionBefore: number;
  forcedMarchBefore: number;
  advance: boolean;
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

function moveWouldInitiateBattle(game: GameState, playerId: PlayerID, toSpaceId: SpaceID): boolean {
  const destination = game.board.spaces.find((space) => space.id === toSpaceId);
  return Boolean(destination?.occupant && destination.occupant !== playerId);
}

export function canPlayInvasionAction(game: GameState, playerId: PlayerID): boolean {
  return game.activePlayer === playerId
    && game.priorityPlayer === playerId
    && game.phase === 'action_before_movement';
}

export function requireInvasionActionTiming(game: GameState, playerId: PlayerID): void {
  if (!canPlayInvasionAction(game, playerId)) {
    throw new GameActionError('Invasion can be played only during the Action Opportunity before movement.');
  }
}

export function applyInvasionAction(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  player.movementRemaining += 2;
  player.invasionAdvanceMovementRemaining = (player.invasionAdvanceMovementRemaining ?? 0) + 2;
  appendPublicLog(
    game,
    playerId,
    'neutral_invasion_action',
    `${player.name} gained two additional advance-only movements from Invasion.`,
    {
      movementRemaining: player.movementRemaining,
      invasionAdvanceMovementRemaining: player.invasionAdvanceMovementRemaining,
    },
  );
}

export function prepareInvasionMove(
  game: GameState,
  playerId: PlayerID,
  toSpaceId: SpaceID,
): InvasionMovementSnapshot {
  const player = game.players[playerId];
  const origin = game.board.spaces.find((space) => space.occupant === playerId);
  const destination = game.board.spaces.find((space) => space.id === toSpaceId);
  if (!player || !origin || !destination) {
    return { invasionBefore: 0, forcedMarchBefore: 0, advance: false };
  }

  const invasionBefore = player.invasionAdvanceMovementRemaining ?? 0;
  const forcedMarchBefore = player.nonBattleMovementRemaining ?? 0;
  const advance = movementIsAdvance(game, playerId, origin.id, destination.id);
  if (!advance && invasionBefore > 0) {
    const unavailable = invasionBefore + (moveWouldInitiateBattle(game, playerId, toSpaceId) ? forcedMarchBefore : 0);
    if (player.movementRemaining <= unavailable) {
      throw new GameActionError('The remaining Invasion movement may be used only to advance.');
    }
  }
  return { invasionBefore, forcedMarchBefore, advance };
}

/**
 * Unopposed forward movement spends Forced March first, then Invasion, and
 * preserves ordinary movement. Beginning a battle ends all unused movement.
 */
export function reconcileInvasionMove(
  game: GameState,
  playerId: PlayerID,
  snapshot: InvasionMovementSnapshot,
  initiatedBattle: boolean,
): void {
  const player = game.players[playerId];
  if (!player) return;
  if (initiatedBattle) {
    player.movementRemaining = 0;
    player.invasionAdvanceMovementRemaining = 0;
    return;
  }
  if (snapshot.advance && snapshot.forcedMarchBefore < 1 && snapshot.invasionBefore > 0) {
    player.invasionAdvanceMovementRemaining = Math.max(snapshot.invasionBefore - 1, 0);
  }
  if (game.phase !== 'game_over') {
    game.phase = player.movementRemaining > 0 ? 'movement' : 'action_after_movement';
  }
}

export function clearInvasionMovement(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (player) player.invasionAdvanceMovementRemaining = 0;
}

export function clearInvasionMovementForTurnTransition(
  game: GameState,
  endingPlayerId: PlayerID,
): void {
  clearInvasionMovement(game, endingPlayerId);
  clearInvasionMovement(game, game.activePlayer);
}

function participant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in the battle.`);
}

function activeSource(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === INVASION
    && !card.canceled
    && !card.negated
    && !card.virtual
    && !card.earlyEffectResolved,
  );
}

function nextSource(game: GameState): BattlePlayedCard | undefined {
  const attacker = game.battle?.attacker;
  if (!attacker) return undefined;
  return [attacker.handCommit, ...attacker.battleDrawPlayed].find(activeSource);
}

function cardCanStillResolve(cardId: CardID): boolean {
  return cardCanBePlayedAt(cardId, 'battle_draw_play', 'battle_draw')
    && !TOO_LATE_AFTER_REVEAL.has(cardId);
}

function openNextBattleChoice(game: GameState, action: ResolveBattleRevealAction): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice') return false;

  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    source.earlyEffectResolved = true;
    const playerId = battle.attacker.playerId;
    const player = game.players[playerId];
    const drawn = drawFromDeck(player, { count: 1 }).drawnCards;
    if (drawn.length === 0) {
      appendPublicLog(game, playerId, 'neutral_invasion_battle_empty', `${player.name} could not draw with Invasion.`);
      continue;
    }
    const drawnCardId = drawn[0];
    battle.attacker.battleDraw.push(drawnCardId);
    const canPlay = cardCanStillResolve(drawnCardId);
    appendPublicLog(
      game,
      playerId,
      'neutral_invasion_battle_draw',
      `${player.name} drew one additional card into their Battle Hand with Invasion.`,
      { canPlay },
    );
    if (!canPlay) continue;

    game.pendingNeutralChoice = {
      kind: 'invasion_battle',
      playerId,
      battleId: battle.id,
      drawnCardId,
      canPlay,
      resolverPlayerId: action.playerId,
      battleCardTargets: action.battleCardTargets,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = playerId;
    return true;
  }
}

/** Returns true when reveal resolution is paused for an Invasion choice. */
export function prepareInvasionBattleReveal(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  resolveBattleRevealCancellations(game, action);
  return openNextBattleChoice(game, action);
}

export function resolveInvasionChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): { deferredBattleAction?: ResolveBattleRevealAction } {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'invasion_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Invasion choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId || battle.stage !== 'dice') {
    throw new GameActionError('The Invasion battle trigger is no longer available.');
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to reveal the card drawn with Invasion.');
  }

  const deferredBattleAction: ResolveBattleRevealAction = {
    type: 'resolve_battle_reveal',
    playerId: pending.resolverPlayerId,
    battleCardTargets: pending.battleCardTargets,
  };
  const resumePriorityPlayer = pending.resumePriorityPlayer;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriorityPlayer ?? pending.resolverPlayerId;

  if (action.choice === 'use') {
    if (!pending.canPlay) throw new GameActionError('That card’s Battle effect can no longer resolve.');
    const side = participant(game, action.playerId);
    const index = side.battleDraw.indexOf(pending.drawnCardId);
    if (index < 0) throw new GameActionError('The Invasion card is no longer in the Battle Hand.');
    side.battleDraw.splice(index, 1);
    side.battleDrawPlayed.push({
      cardId: pending.drawnCardId,
      owner: action.playerId,
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
      fromInitialBattleHand: false,
    });
    game.players[action.playerId].hasPlayedBattleThisTurn = true;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_invasion_battle_played',
      `${game.players[action.playerId].name} revealed ${pending.drawnCardId} with Invasion.`,
      { cardId: pending.drawnCardId },
    );
  }

  if (openNextBattleChoice(game, deferredBattleAction)) return {};
  return { deferredBattleAction };
}
