import { v070CanonicalContent } from '../content/v070';
import {
  advanceV070TurnPhase,
  applyV070MovementChoice,
  beginNormalV070Movement,
  canInitiateV070LastStand,
  createV070BattleOnset,
  createV070LastStandOnset,
  createV070TurnState,
  spendV070Action,
  type MovementChoice,
  type PlayerId,
  type TurnPhase,
} from './rules';
import {
  V070GameActionError,
  appendV070Event,
  deterministicV070Shuffle,
  type V070GameState,
  type V070PlayerState,
} from './engine';
import {
  advanceV070FrontLine,
  nextV070FrontLineTarget,
} from './front-line';
import {
  expireV070TerritoryTurnRestrictions,
  openV070StartTurnOverlayChoice,
  resolveV070OverlayEntryRequirements,
  resolveV070StartTurnOverlayChoice,
} from './overlays';
import {
  completeV070CensureChoice,
  currentV070CensureChoice,
  openV070CensureChoicesForActionPlay,
} from './sanctions';

export type V070TurnAction =
  | { type: 'resolve_capture'; playerId: PlayerId }
  | { type: 'draw_turn_card'; playerId: PlayerId }
  | { type: 'pass_opening'; playerId: PlayerId }
  | { type: 'play_action_card'; playerId: PlayerId; cardInstanceId: string }
  | {
      type: 'resolve_censure_choice';
      playerId: PlayerId;
      sanctionInstanceId: string;
      choice: 'discard' | 'draw';
      discardInstanceId?: string;
    }
  | {
      type: 'choose_movement';
      playerId: PlayerId;
      choice: MovementChoice;
      discardInstanceId?: string;
    }
  | {
      type: 'resolve_start_turn_overlay_choice';
      playerId: PlayerId;
      choice: 'discard' | 'withdraw';
      discardInstanceId?: string;
    }
  | { type: 'pass_denouement'; playerId: PlayerId }
  | { type: 'complete_cleanup'; playerId: PlayerId; discardInstanceIds?: readonly string[] };

export interface V070DrawResult {
  drawn: string[];
  reshuffles: number;
  exhausted: boolean;
}

export function reduceV070TurnAction(
  state: V070GameState,
  action: V070TurnAction,
): V070GameState {
  requirePlayingTurn(state, action.playerId);
  if (state.battle) {
    throw new V070GameActionError('Resolve the active battle before continuing the turn.');
  }
  if (state.pendingTurnChoice && action.type !== 'resolve_start_turn_overlay_choice') {
    throw new V070GameActionError('Resolve the pending start-of-turn Overlay choice first.');
  }
  if (state.pendingSanctionChoices.length > 0 && action.type !== 'resolve_censure_choice') {
    throw new V070GameActionError('Resolve the pending Sanctions: Censure choice first.');
  }
  if (state.pendingActionCard
    && state.pendingSanctionChoices.length === 0
    && action.type !== 'resolve_censure_choice') {
    throw new V070GameActionError('Resolve the pending Action card before continuing the turn.');
  }

  const next = structuredClone(state) as V070GameState;

  switch (action.type) {
    case 'resolve_capture':
      resolveCapture(next, action.playerId);
      break;
    case 'draw_turn_card':
      drawTurnCard(next, action.playerId);
      break;
    case 'pass_opening':
      passOpening(next, action.playerId);
      break;
    case 'play_action_card':
      playActionCard(next, action.playerId, action.cardInstanceId);
      break;
    case 'resolve_censure_choice':
      resolveCensureChoice(
        next,
        action.playerId,
        action.sanctionInstanceId,
        action.choice,
        action.discardInstanceId,
      );
      break;
    case 'choose_movement':
      chooseMovement(next, action.playerId, action.choice, action.discardInstanceId);
      break;
    case 'resolve_start_turn_overlay_choice':
      resolveV070StartTurnOverlayChoice(
        next,
        action.playerId,
        action.choice,
        action.discardInstanceId,
      );
      break;
    case 'pass_denouement':
      passDenouement(next, action.playerId);
      break;
    case 'complete_cleanup':
      completeCleanup(next, action.playerId, action.discardInstanceIds ?? []);
      break;
  }

  return next;
}

export function drawV070Cards(
  state: V070GameState,
  playerId: PlayerId,
  count: number,
  purpose: string,
): V070DrawResult {
  if (!Number.isInteger(count) || count < 0) {
    throw new V070GameActionError('Draw count must be a nonnegative integer.');
  }

  const player = state.players[playerId];
  const drawn: string[] = [];
  let reshuffles = 0;

  while (drawn.length < count) {
    if (player.zones.drawPile.length === 0) {
      if (player.zones.discardPile.length === 0) break;

      player.reshuffleCount += 1;
      player.zones.drawPile = deterministicV070Shuffle(
        player.zones.discardPile,
        `${state.seed}:${playerId}:reshuffle:${player.reshuffleCount}`,
      );
      player.zones.discardPile = [];
      reshuffles += 1;

      appendV070Event(state, {
        type: 'discard_reshuffled',
        actor: playerId,
        visibility: 'public',
        payload: {
          reshuffleCount: player.reshuffleCount,
          cardCount: player.zones.drawPile.length,
          purpose,
        },
      });
    }

    const instanceId = player.zones.drawPile.shift();
    if (!instanceId) break;
    drawn.push(instanceId);
  }

  return {
    drawn,
    reshuffles,
    exhausted: drawn.length < count,
  };
}

function resolveCapture(state: V070GameState, playerId: PlayerId): void {
  requirePhase(state, 'capture');
  const target = nextV070FrontLineTarget(state, playerId);

  if (target) {
    const position = requirePosition(state.players[playerId]);
    const supportsCapture = playerId === 'A'
      ? position >= target.position
      : position <= target.position;

    if (supportsCapture && target.controller === otherPlayer(playerId)) {
      const advance = advanceV070FrontLine(state, playerId, 1, 'normal_capture');

      if (advance.reachedOpponentEnd) {
        state.stage = 'ended';
        state.winner = playerId;
        state.turnState = null;
        appendV070Event(state, {
          type: 'game_won',
          actor: playerId,
          visibility: 'public',
          payload: { route: 'final_territory_capture' },
        });
        return;
      }
    }
  }

  const diplomat = state.players[playerId].diplomats;
  const peaceTreatyThreshold = v070CanonicalContent.content.faction_rules.diplomats.peace_treaty_threshold;
  if (diplomat && diplomat.ratifiedProposals.length >= peaceTreatyThreshold) {
    state.stage = 'ended';
    state.winner = playerId;
    state.turnState = null;
    appendV070Event(state, {
      type: 'game_won',
      actor: playerId,
      visibility: 'public',
      payload: { route: 'peace_treaty', ratifiedProposals: diplomat.ratifiedProposals.length },
    });
    return;
  }

  state.turnState = advanceV070TurnPhase(requireTurnState(state));
  appendPhaseEvent(state);
}

function drawTurnCard(state: V070GameState, playerId: PlayerId): void {
  requirePhase(state, 'draw');
  const result = drawV070Cards(state, playerId, 1, 'turn_draw');
  const player = state.players[playerId];
  player.zones.hand.push(...result.drawn);

  appendV070Event(state, {
    type: 'turn_card_drawn',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: result.drawn.length,
      reshuffles: result.reshuffles,
      exhausted: result.exhausted,
    },
  });
  if (result.drawn.length > 0) {
    appendV070Event(state, {
      type: 'turn_card_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        cardInstanceIds: [...result.drawn],
      },
    });
  }

  state.turnState = advanceV070TurnPhase(requireTurnState(state));
  appendPhaseEvent(state);
}

export const V070_EXECUTABLE_ACTION_CARD_IDS = [
  'neutral-rallying-cry',
] as const;

function playActionCard(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  const turnState = requireTurnState(state);
  if (turnState.phase !== 'opening' && turnState.phase !== 'denouement') {
    throw new V070GameActionError(
      'A printed Action card may normally be played only during Opening or Denouement.',
    );
  }

  const player = state.players[playerId];
  const handIndex = player.zones.hand.indexOf(cardInstanceId);
  if (handIndex < 0) {
    throw new V070GameActionError('An Action card must be played from Hand.');
  }

  const instance = state.cardInstances[cardInstanceId];
  const card = instance ? v070CanonicalContent.cardsById.get(instance.cardId) : undefined;
  if (!instance || instance.owner !== playerId || !card) {
    throw new V070GameActionError('Unknown or incorrectly owned Action card instance.');
  }
  if (!card.effects.some(effect => effect.label === 'Action')) {
    throw new V070GameActionError('That card has no printed Action effect.');
  }
  if (!(V070_EXECUTABLE_ACTION_CARD_IDS as readonly string[]).includes(card.id)) {
    throw new V070GameActionError(
      `The printed Action effect of ${card.name} is not yet executable in v0.7.0.`,
    );
  }

  try {
    state.turnState = spendV070Action(turnState);
  } catch (error) {
    throw new V070GameActionError(
      error instanceof Error ? error.message : 'That Action cannot be spent now.',
    );
  }

  player.zones.hand.splice(handIndex, 1);
  state.pendingActionCard = {
    playerId,
    instanceId: cardInstanceId,
    cardId: card.id,
    phase: turnState.phase,
  };

  appendV070Event(state, {
    type: 'action_card_played',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: cardInstanceId,
      cardId: card.id,
      phase: turnState.phase,
      actionsRemaining: state.turnState.actionsAvailable,
    },
  });

  const censureCount = openV070CensureChoicesForActionPlay(
    state,
    playerId,
    cardInstanceId,
  );
  if (censureCount === 0) continuePendingActionCard(state);
}

function resolveCensureChoice(
  state: V070GameState,
  playerId: PlayerId,
  sanctionInstanceId: string,
  choice: 'discard' | 'draw',
  discardInstanceId?: string,
): void {
  const pending = currentV070CensureChoice(state, playerId);
  if (pending.sanctionInstanceId !== sanctionInstanceId) {
    throw new V070GameActionError('Resolve Sanctions: Censure choices in trigger order.');
  }
  if (!state.pendingActionCard
    || state.pendingActionCard.instanceId !== pending.sourceActionInstanceId) {
    throw new V070GameActionError('The Censure trigger is missing its pending Action card.');
  }

  if (choice === 'discard') {
    if (!discardInstanceId) {
      throw new V070GameActionError('Sanctions: Censure requires one chosen Hand discard.');
    }
    const hand = state.players[playerId].zones.hand;
    const index = hand.indexOf(discardInstanceId);
    if (index < 0) {
      throw new V070GameActionError('Sanctions: Censure must discard a card from Hand.');
    }
    hand.splice(index, 1);
    state.players[playerId].zones.discardPile.push(discardInstanceId);
    appendV070Event(state, {
      type: 'card_discarded',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: discardInstanceId,
        cardId: state.cardInstances[discardInstanceId]?.cardId,
        purpose: 'Sanctions: Censure',
      },
    });
  } else {
    if (discardInstanceId) {
      throw new V070GameActionError('The +1 Card Censure choice does not discard a Hand card.');
    }
    drawIntoHand(state, playerId, 1, 'Sanctions: Censure');
  }

  completeV070CensureChoice(
    state,
    playerId,
    sanctionInstanceId,
    choice,
    discardInstanceId,
  );

  if (state.pendingSanctionChoices.length === 0) {
    continuePendingActionCard(state);
  }
}

function continuePendingActionCard(state: V070GameState): void {
  const pending = state.pendingActionCard;
  if (!pending) throw new V070GameActionError('No Action card is pending resolution.');
  if (state.pendingSanctionChoices.length > 0) {
    throw new V070GameActionError('Resolve all Censure choices before the Action effect.');
  }

  switch (pending.cardId) {
    case 'neutral-rallying-cry':
      drawIntoHand(state, pending.playerId, 1, 'Rallying Cry');
      break;
    default:
      throw new V070GameActionError(
        `Unsupported pending Action effect: ${pending.cardId}.`,
      );
  }

  state.players[pending.playerId].zones.discardPile.push(pending.instanceId);
  appendV070Event(state, {
    type: 'action_card_resolved',
    actor: pending.playerId,
    visibility: 'public',
    payload: {
      instanceId: pending.instanceId,
      cardId: pending.cardId,
      destination: 'discard',
    },
  });
  state.pendingActionCard = null;
}

function drawIntoHand(
  state: V070GameState,
  playerId: PlayerId,
  count: number,
  purpose: string,
): void {
  const result = drawV070Cards(state, playerId, count, purpose);
  state.players[playerId].zones.hand.push(...result.drawn);

  appendV070Event(state, {
    type: 'cards_drawn',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: result.drawn.length,
      purpose,
      reshuffles: result.reshuffles,
      exhausted: result.exhausted,
    },
  });
  if (result.drawn.length > 0) {
    appendV070Event(state, {
      type: 'drawn_card_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        cardInstanceIds: [...result.drawn],
        purpose,
      },
    });
  }
}

function passOpening(state: V070GameState, playerId: PlayerId): void {
  requirePhase(state, 'opening');
  const turnState = advanceV070TurnPhase(requireTurnState(state));
  state.turnState = beginNormalV070Movement(turnState);

  appendV070Event(state, {
    type: 'opening_passed',
    actor: playerId,
    visibility: 'public',
  });
  appendPhaseEvent(state);
}

function chooseMovement(
  state: V070GameState,
  playerId: PlayerId,
  choice: MovementChoice,
  discardInstanceId?: string,
): void {
  requirePhase(state, 'movement');
  const turnState = requireTurnState(state);
  if (!turnState.movementSequenceOpen) {
    throw new V070GameActionError('No normal movement sequence is currently open.');
  }

  if (choice === 'hold') {
    if (discardInstanceId) {
      throw new V070GameActionError('Hold has no Territory Overlay entry cost.');
    }
    state.turnState = applyV070MovementChoice(turnState, choice);
    state.turnState = advanceV070TurnPhase(state.turnState);
    appendV070Event(state, {
      type: 'movement_hold',
      actor: playerId,
      visibility: 'public',
    });
    appendPhaseEvent(state);
    return;
  }

  const player = state.players[playerId];
  const opponentId = otherPlayer(playerId);
  const opponent = state.players[opponentId];
  const origin = requirePosition(player);
  const delta = movementDelta(playerId, choice);
  const destination = origin + delta;

  assertMovementDestination(playerId, choice, destination, state.board.length);
  resolveV070OverlayEntryRequirements(
    state,
    playerId,
    destination,
    discardInstanceId,
  );

  if (opponent.position === destination) {
    const lastStand = canInitiateV070LastStand({
      attacker: playerId,
      defender: opponentId,
      territoryCount: state.board.length,
      attackerPosition: origin,
      defenderPosition: destination,
      separateMovementSequence: true,
      advancingBeyondOpponentEnd: isBeyondOpponentEnd(playerId, destination, state.board.length),
    });

    moveSettledOccupantOffOrigin(state, playerId, origin);
    player.position = destination;

    state.battle = lastStand
      ? createV070LastStandOnset({
          attacker: playerId,
          defender: opponentId,
          territoryCount: state.board.length,
          attackerPosition: origin,
          defenderPosition: destination,
          separateMovementSequence: true,
          advancingBeyondOpponentEnd: true,
        })
      : createV070BattleOnset({
          territoryCount: state.board.length,
          attacker: playerId,
          defender: opponentId,
          attackerOrigin: origin,
          contestedPosition: destination,
          positions: {
            A: state.players.A.position!,
            B: state.players.B.position!,
          },
          defenderControlsContested: territoryAt(state, destination)?.controller === opponentId,
        });

    state.turnState = applyV070MovementChoice(turnState, choice, { initiatesBattle: true });

    appendV070Event(state, {
      type: 'battle_initiated',
      actor: playerId,
      visibility: 'public',
      payload: {
        attacker: playerId,
        defender: opponentId,
        attackerOrigin: origin,
        contestedPosition: destination,
        lastStand,
      },
    });
    return;
  }

  if (isBeyondOpponentEnd(playerId, destination, state.board.length)) {
    throw new V070GameActionError('Advancing beyond the opponent’s end is legal only when it initiates a Last Stand.');
  }

  if (wouldPassOpponent(playerId, origin, destination, opponent.position)) {
    throw new V070GameActionError('Player Tokens cannot move through or past one another.');
  }

  moveSettledOccupantOffOrigin(state, playerId, origin);
  player.position = destination;
  setSettledOccupant(state, playerId, destination);

  state.turnState = applyV070MovementChoice(turnState, choice);
  appendV070Event(state, {
    type: 'player_moved',
    actor: playerId,
    visibility: 'public',
    payload: { choice, from: origin, to: destination },
  });

  if (!state.turnState.movementSequenceOpen) {
    state.turnState = advanceV070TurnPhase(state.turnState);
    appendPhaseEvent(state);
  }
}

function passDenouement(state: V070GameState, playerId: PlayerId): void {
  requirePhase(state, 'denouement');
  state.turnState = advanceV070TurnPhase(requireTurnState(state));

  appendV070Event(state, {
    type: 'denouement_passed',
    actor: playerId,
    visibility: 'public',
  });
  appendPhaseEvent(state);
}

function completeCleanup(
  state: V070GameState,
  playerId: PlayerId,
  discardInstanceIds: readonly string[],
): void {
  requirePhase(state, 'cleanup');
  const player = state.players[playerId];
  const excess = Math.max(0, player.zones.hand.length - 3);

  if (discardInstanceIds.length !== excess || new Set(discardInstanceIds).size !== discardInstanceIds.length) {
    throw new V070GameActionError(`Cleanup requires exactly ${excess} Hand discard(s).`);
  }
  for (const instanceId of discardInstanceIds) {
    if (!player.zones.hand.includes(instanceId)) {
      throw new V070GameActionError('Cleanup discards must come from the active player’s Hand.');
    }
  }

  for (const instanceId of discardInstanceIds) {
    const index = player.zones.hand.indexOf(instanceId);
    player.zones.hand.splice(index, 1);
    player.zones.discardPile.push(instanceId);
  }

  if (discardInstanceIds.length > 0) {
    appendV070Event(state, {
      type: 'cleanup_discard',
      actor: playerId,
      visibility: 'public',
      payload: {
        cards: discardInstanceIds.map(instanceId => ({
          instanceId,
          cardId: state.cardInstances[instanceId].cardId,
        })),
      },
    });
  }

  const next = otherPlayer(playerId);
  state.activePlayer = next;
  state.turnNumber += 1;
  state.turnState = createV070TurnState();
  expireV070TerritoryTurnRestrictions(state);

  appendV070Event(state, {
    type: 'turn_started',
    actor: next,
    visibility: 'public',
    payload: { turnNumber: state.turnNumber, phase: state.turnState.phase },
  });

  openV070StartTurnOverlayChoice(state, next);
}

function movementDelta(playerId: PlayerId, choice: Exclude<MovementChoice, 'hold'>): number {
  const advance = playerId === 'A' ? 1 : -1;
  return choice === 'advance' ? advance : -advance;
}

function assertMovementDestination(
  playerId: PlayerId,
  choice: Exclude<MovementChoice, 'hold'>,
  destination: number,
  territoryCount: number,
): void {
  const ownOutside = playerId === 'A' ? -1 : territoryCount;
  const opponentOutside = playerId === 'A' ? territoryCount : -1;

  if (choice === 'fall_back' && destination === ownOutside) {
    throw new V070GameActionError('A player cannot voluntarily Fall Back beyond their own end of the Gauntlet.');
  }
  if (destination < -1 || destination > territoryCount) {
    throw new V070GameActionError('Movement would leave the legal Gauntlet Position range.');
  }
  if (destination === opponentOutside && choice !== 'advance') {
    throw new V070GameActionError('Only an Advance can move beyond the opponent’s end.');
  }
}

function wouldPassOpponent(
  playerId: PlayerId,
  origin: number,
  destination: number,
  opponentPosition: number | null,
): boolean {
  if (opponentPosition === null) return false;
  if (playerId === 'A') return origin < opponentPosition && destination > opponentPosition;
  return origin > opponentPosition && destination < opponentPosition;
}

function isBeyondOpponentEnd(playerId: PlayerId, position: number, territoryCount: number): boolean {
  return playerId === 'A' ? position === territoryCount : position === -1;
}

function moveSettledOccupantOffOrigin(
  state: V070GameState,
  playerId: PlayerId,
  origin: number,
): void {
  const territory = territoryAt(state, origin);
  if (territory?.occupant === playerId) territory.occupant = null;
}

function setSettledOccupant(
  state: V070GameState,
  playerId: PlayerId,
  position: number,
): void {
  const territory = territoryAt(state, position);
  if (!territory) return;
  if (territory.occupant && territory.occupant !== playerId) {
    throw new V070GameActionError('Cannot settle on an occupied Territory without initiating a battle.');
  }
  territory.occupant = playerId;
}

function territoryAt(state: V070GameState, position: number) {
  return state.board.find(territory => territory.position === position);
}

function requirePlayingTurn(state: V070GameState, playerId: PlayerId): void {
  if (state.stage !== 'playing' || !state.turnState || !state.activePlayer) {
    throw new V070GameActionError('Turn actions require an active v0.7.0 game.');
  }
  if (state.activePlayer !== playerId) {
    throw new V070GameActionError(`It is not ${playerId}’s turn.`);
  }
}

function requireTurnState(state: V070GameState) {
  if (!state.turnState) throw new V070GameActionError('There is no active turn.');
  return state.turnState;
}

function requirePhase(state: V070GameState, phase: TurnPhase): void {
  if (requireTurnState(state).phase !== phase) {
    throw new V070GameActionError(`Expected ${phase} phase.`);
  }
}

function requirePosition(player: V070PlayerState): number {
  if (player.position === null) throw new V070GameActionError(`${player.id} has no legal Position.`);
  return player.position;
}

function appendPhaseEvent(state: V070GameState): void {
  const turnState = requireTurnState(state);
  appendV070Event(state, {
    type: 'turn_phase',
    actor: state.activePlayer ?? undefined,
    visibility: 'public',
    payload: { turnNumber: state.turnNumber, phase: turnState.phase },
  });
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
