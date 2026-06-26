import { cardCanBePlayedAt, destinationForCardPlay } from '../cards';
import {
  EffectRegistry,
  baseBattleEffectHandlers,
  totalModifiersFor,
} from '../effects';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleTiePolicy,
  BoardSpaceState,
  GameEvent,
  GamePhase,
  GameState,
  PlayerID,
  PlayerState,
  SpaceID,
} from '../types';
import type { ActionResult, GameAction } from './actions';
import { drawFromDeck } from './draw';

export class GameActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameActionError';
  }
}

export interface ApplyGameActionResult {
  state: GameState;
  result?: ActionResult;
}

function cloneGameState(game: GameState): GameState {
  return structuredClone(game);
}

function requirePlayerTurn(game: GameState, playerId: PlayerID): void {
  if (game.activePlayer !== playerId) throw new GameActionError(`It is not ${playerId}'s turn.`);
}

function requirePlayer(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player) throw new GameActionError(`Unknown player: ${playerId}.`);
  return player;
}

function findSpace(game: GameState, spaceId: SpaceID): BoardSpaceState {
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space) throw new GameActionError(`Unknown space: ${spaceId}.`);
  return space;
}

function appendPublicLog(game: GameState, actor: PlayerID | undefined, type: string, message: string, payload?: unknown): void {
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

function nextPlayerId(game: GameState): PlayerID {
  const ids = Object.keys(game.players);
  const currentIndex = ids.indexOf(game.activePlayer);
  return ids[(currentIndex + 1) % ids.length];
}

function phaseAllowsAction(game: GameState, allowed: GamePhase[]): void {
  if (!allowed.includes(game.phase)) throw new GameActionError(`Action is not allowed during phase ${game.phase}.`);
}

function createBattleParticipant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: false,
    passedBattleDrawPlay: false,
    hasDrawnBattleCards: false,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function getBattleParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  if (!game.battle) throw new GameActionError('There is no active battle.');
  if (game.battle.attacker.playerId === playerId) return game.battle.attacker;
  if (game.battle.defender.playerId === playerId) return game.battle.defender;
  throw new GameActionError(`${playerId} is not a participant in this battle.`);
}

function bothParticipants(game: GameState, predicate: (participant: BattleParticipantState) => boolean): boolean {
  if (!game.battle) return false;
  return predicate(game.battle.attacker) && predicate(game.battle.defender);
}

function hasCompletedHandCommit(participant: BattleParticipantState): boolean {
  return participant.passedHandCommit || participant.handCommit !== undefined;
}

function hasCompletedBattleDrawPlay(participant: BattleParticipantState): boolean {
  return participant.passedBattleDrawPlay || participant.battleDrawPlayed.length >= participant.battleDrawPlayLimit || participant.battleDraw.length === 0;
}

function playedCardIds(participant: BattleParticipantState): string[] {
  return [participant.handCommit?.cardId, ...participant.battleDrawPlayed.map((played) => played.cardId)]
    .filter((cardId): cardId is string => Boolean(cardId));
}

function applyBattleSetupEffects(participant: BattleParticipantState): void {
  if (playedCardIds(participant).includes('card-conscription')) {
    participant.battleDrawCount = Math.max(participant.battleDrawCount, 4);
    participant.battleDrawPlayLimit = Math.max(participant.battleDrawPlayLimit, 2);
  }
}

function tiePolicyForDefense(space: BoardSpaceState, defenderId: PlayerID): BattleTiePolicy {
  return space.controller === defenderId ? 'defender' : 'reroll';
}

function isWatchtower(space: BoardSpaceState): boolean {
  return space.revealed && (space.territoryId === 'territory-watchtower' || space.territoryId === 'watchtower');
}

function requireCardPlayable(cardId: string, timing: 'battle_hand_commit' | 'battle_draw_play', origin: 'hand' | 'battle_draw'): void {
  if (!cardCanBePlayedAt(cardId, timing, origin)) {
    throw new GameActionError(`${cardId} cannot be played from ${origin} during ${timing}.`);
  }
}

function pushCardToDestination(player: PlayerState, cardId: string, destination: 'discard' | 'graveyard' | 'hand' | 'removed'): void {
  switch (destination) {
    case 'discard':
      player.zones.discard.push(cardId);
      break;
    case 'graveyard':
      player.zones.graveyard.push(cardId);
      break;
    case 'hand':
      player.zones.hand.push(cardId);
      break;
    case 'removed':
      player.zones.removed.push(cardId);
      break;
  }
}

function pushActionCardToDestination(player: PlayerState, cardId: string): string {
  const destination = destinationForCardPlay(cardId, 'hand');
  switch (destination) {
    case 'asset_bank':
      player.zones.assetBank.push(cardId);
      return 'Asset Bank';
    case 'condition':
      player.zones.conditions.push(cardId);
      return 'Conditions';
    case 'discard':
      player.zones.discard.push(cardId);
      return 'discard';
    case 'graveyard':
      player.zones.graveyard.push(cardId);
      return 'Graveyard';
    case 'hand':
      player.zones.hand.push(cardId);
      return 'hand';
    case 'removed':
      player.zones.removed.push(cardId);
      return 'removed';
  }
}

function expireTurnLongConditions(game: GameState, player: PlayerState): void {
  const expiring = player.zones.conditions.filter((cardId) => cardId === 'card-attrition');
  if (expiring.length === 0) return;

  player.zones.conditions = player.zones.conditions.filter((cardId) => cardId !== 'card-attrition');
  player.zones.discard.push(...expiring);
  appendPublicLog(game, player.id, 'conditions_expired', `${player.name}'s turn-long Conditions expired.`, { cards: expiring });
}

function revealBattleCards(game: GameState): void {
  if (!game.battle) return;

  for (const side of [game.battle.attacker, game.battle.defender]) {
    if (side.handCommit) side.handCommit.faceDown = false;
    side.battleDrawPlayed = side.battleDrawPlayed.map((played): BattlePlayedCard => ({ ...played, faceDown: false }));
  }

  game.battle.stage = 'dice';
  appendPublicLog(game, undefined, 'battle_cards_revealed', 'Battle cards were revealed.');
}

function maybeRevealAfterBattleDrawPlay(game: GameState): void {
  if (bothParticipants(game, hasCompletedBattleDrawPlay)) revealBattleCards(game);
}

function findRetreatSpace(game: GameState, loser: PlayerID): BoardSpaceState | undefined {
  if (!game.battle) return undefined;

  const battle = game.battle;
  const location = findSpace(game, battle.location);
  const attackerOrigin = findSpace(game, battle.attackerOrigin);
  const directionFromAttacker = location.index > attackerOrigin.index ? 1 : -1;
  const retreatIndex = loser === battle.attacker.playerId
    ? attackerOrigin.index
    : location.index + directionFromAttacker;

  const retreatSpace = game.board.spaces.find((space) => space.index === retreatIndex);
  if (!retreatSpace || retreatSpace.occupant) return undefined;
  return retreatSpace;
}

function applyCancellations(game: GameState, cancellations: NonNullable<ReturnType<EffectRegistry['resolve']>['cancellations']>): Set<string> {
  const canceled = new Set<string>();
  if (!game.battle) return canceled;

  for (const cancellation of cancellations) {
    const participant = getBattleParticipant(game, cancellation.owner);
    const candidates = [participant.handCommit, ...participant.battleDrawPlayed];
    const target = candidates.find((played) => played?.cardId === cancellation.cardId && !played.canceled);
    if (!target) continue;

    target.canceled = true;
    canceled.add(`${target.owner}:${target.cardId}`);
  }

  return canceled;
}

function applyResolutionEffects(game: GameState, action: Extract<GameAction, { type: 'resolve_battle' }>) {
  if (!game.battle) return { activeModifiers: [], cancellations: [] };
  const battle = game.battle;

  if (battle.effectsResolved.includes('before_battle_resolution')) {
    return { activeModifiers: [], cancellations: [] };
  }

  const effectRegistry = new EffectRegistry(baseBattleEffectHandlers);
  const effectResult = effectRegistry.resolve({
    game,
    battle,
    timing: 'before_battle_resolution',
    actor: action.playerId,
    location: battle.location,
    battleCardTargets: action.battleCardTargets,
  });

  const canceledSet = applyCancellations(game, effectResult.cancellations ?? []);
  const activeModifiers = (effectResult.modifiers ?? [])
    .filter((modifier) => !canceledSet.has(`${modifier.playerId}:${String(modifier.source)}`));
  battle.attacker.modifiers += totalModifiersFor(activeModifiers, battle.attacker.playerId);
  battle.defender.modifiers += totalModifiersFor(activeModifiers, battle.defender.playerId);
  battle.effectsResolved.push('before_battle_resolution');

  for (const message of effectResult.logMessages ?? []) appendPublicLog(game, undefined, 'effect_resolved', message);

  return { activeModifiers, cancellations: effectResult.cancellations ?? [] };
}

function applyPostResolutionEffects(game: GameState, action: Extract<GameAction, { type: 'resolve_battle' }>) {
  if (!game.battle) return { destinationOverrides: [] };
  const battle = game.battle;

  if (battle.effectsResolved.includes('after_battle_resolution')) return { destinationOverrides: [] };

  const effectRegistry = new EffectRegistry(baseBattleEffectHandlers);
  const effectResult = effectRegistry.resolve({
    game,
    battle,
    timing: 'after_battle_resolution',
    actor: action.playerId,
    location: battle.location,
  });

  battle.effectsResolved.push('after_battle_resolution');
  for (const message of effectResult.logMessages ?? []) appendPublicLog(game, undefined, 'effect_resolved', message);

  return { destinationOverrides: effectResult.destinationOverrides ?? [] };
}

function destinationOverrideFor(
  overrides: NonNullable<ReturnType<EffectRegistry['resolve']>['destinationOverrides']>,
  owner: PlayerID,
  cardId: string,
): 'discard' | 'graveyard' | 'hand' | 'removed' | undefined {
  return overrides.find((override) => override.owner === owner && override.cardId === cardId)?.destination;
}

function drawCards(game: GameState, action: Extract<GameAction, { type: 'draw_card' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);
  phaseAllowsAction(game, ['turn_start', 'action_before_movement', 'action_after_movement']);

  const player = requirePlayer(game, action.playerId);
  const count = action.count ?? 1;
  const result = drawFromDeck(player, { count });
  player.zones.hand = [...player.zones.hand, ...result.drawnCards];

  appendPublicLog(game, action.playerId, 'draw_card', `${player.name} drew ${result.drawnCards.length} card${result.drawnCards.length === 1 ? '' : 's'}.`, {
    count: result.drawnCards.length,
    reshuffled: result.reshuffled,
    exhausted: result.exhausted,
  });
  if (game.phase === 'turn_start') game.phase = 'action_before_movement';

  return { state: game, result: { drawnCards: result.drawnCards } };
}

function revealSpace(game: GameState, action: Extract<GameAction, { type: 'reveal_space' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);
  phaseAllowsAction(game, ['turn_start', 'action_before_movement', 'movement', 'action_after_movement']);

  const player = requirePlayer(game, action.playerId);
  const space = findSpace(game, action.spaceId);
  if (space.controller !== action.playerId) throw new GameActionError(`${player.name} cannot reveal a space they do not control.`);
  if (space.revealed) throw new GameActionError('That space is already revealed.');

  space.revealed = true;
  appendPublicLog(game, action.playerId, 'reveal_space', `${player.name} revealed ${space.territoryId ?? space.id}.`, { spaceId: space.id, territoryId: space.territoryId });
  return { state: game };
}

function playActionCard(game: GameState, action: Extract<GameAction, { type: 'play_action_card' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);
  phaseAllowsAction(game, ['action_before_movement', 'action_after_movement']);

  const player = requirePlayer(game, action.playerId);
  if (!player.zones.hand.includes(action.cardId)) throw new GameActionError(`${player.name} does not have that card in hand.`);
  if (!cardCanBePlayedAt(action.cardId, 'action', 'hand')) throw new GameActionError(`${action.cardId} cannot be played as an Action card.`);
  if (player.actionsRemaining < 1) throw new GameActionError(`${player.name} has no actions remaining.`);
  if (player.hasPlayedActionThisTurn || player.hasPlayedBattleThisTurn) throw new GameActionError(`${player.name} has already played a card this turn.`);

  player.zones.hand = player.zones.hand.filter((cardId) => cardId !== action.cardId);
  const destination = pushActionCardToDestination(player, action.cardId);
  player.actionsRemaining -= 1;
  player.hasPlayedActionThisTurn = true;

  appendPublicLog(game, action.playerId, 'play_action_card', `${player.name} played ${action.cardId} as an Action.`, {
    cardId: action.cardId,
    targets: action.targets ?? [],
    destination,
  });

  return { state: game };
}

function movePlayer(game: GameState, action: Extract<GameAction, { type: 'move_player' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);
  phaseAllowsAction(game, ['movement']);

  const player = requirePlayer(game, action.playerId);
  if (player.movementRemaining < 1) throw new GameActionError(`${player.name} has no movement remaining.`);

  const origin = game.board.spaces.find((space) => space.occupant === action.playerId);
  if (!origin) throw new GameActionError(`${player.name} does not occupy a board space.`);

  const destination = findSpace(game, action.toSpaceId);
  if (Math.abs(destination.index - origin.index) !== 1) throw new GameActionError('Basic movement currently only allows moving to an adjacent space.');

  if (destination.occupant && destination.occupant !== action.playerId) {
    const defenderId = destination.occupant;
    const watchtowerMakesAttackerHandCommitFaceUp = isWatchtower(destination) && destination.controller === defenderId;
    player.movementRemaining -= 1;
    game.phase = 'battle';
    game.priorityPlayer = action.playerId;
    game.battle = {
      id: `${game.id}-battle-${game.turn}`,
      stage: 'hand_commit',
      location: destination.id,
      attackerOrigin: origin.id,
      attacker: createBattleParticipant(action.playerId),
      defender: createBattleParticipant(defenderId),
      tiePolicy: tiePolicyForDefense(destination, defenderId),
      attackerHandCommitVisibleTo: watchtowerMakesAttackerHandCommitFaceUp ? [defenderId] : undefined,
      effectsResolved: [],
    };

    appendPublicLog(game, action.playerId, 'battle_started', `${player.name} started a battle.`, { fromSpaceId: origin.id, toSpaceId: destination.id, defender: defenderId });
    return { state: game };
  }

  origin.occupant = undefined;
  destination.occupant = action.playerId;
  player.occupiedSpaceId = destination.id;
  player.movementRemaining -= 1;

  if (destination.controller && destination.controller !== action.playerId) destination.capturePendingBy = action.playerId;

  appendPublicLog(game, action.playerId, 'move_player', `${player.name} moved to ${destination.id}.`, { fromSpaceId: origin.id, toSpaceId: destination.id });
  game.phase = 'action_after_movement';
  return { state: game };
}

function commitBattleHandCard(game: GameState, action: Extract<GameAction, { type: 'commit_battle_hand_card' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'hand_commit') throw new GameActionError('Battle hand commitments are not currently open.');

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);
  if (hasCompletedHandCommit(participant)) throw new GameActionError(`${player.name} has already made a hand commitment choice.`);
  if (!player.zones.hand.includes(action.cardId)) throw new GameActionError(`${player.name} does not have that card in hand.`);
  requireCardPlayable(action.cardId, 'battle_hand_commit', 'hand');

  const isAttackerHandCommit = action.playerId === game.battle.attacker.playerId;
  const isFaceUpWatchtowerCommit = isAttackerHandCommit && Boolean(game.battle.attackerHandCommitVisibleTo);
  player.zones.hand = player.zones.hand.filter((cardId) => cardId !== action.cardId);
  participant.handCommit = {
    cardId: action.cardId,
    owner: action.playerId,
    origin: 'hand',
    faceDown: !isFaceUpWatchtowerCommit,
    canceled: false,
  };
  applyBattleSetupEffects(participant);
  player.hasPlayedBattleThisTurn = true;

  appendPublicLog(game, action.playerId, 'commit_battle_hand_card', `${player.name} committed a card from hand ${isFaceUpWatchtowerCommit ? 'face up' : 'face down'}.`);
  if (bothParticipants(game, hasCompletedHandCommit)) game.battle.stage = 'battle_draw';
  return { state: game };
}

function passBattleHandCommit(game: GameState, action: Extract<GameAction, { type: 'pass_battle_hand_commit' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'hand_commit') throw new GameActionError('Battle hand commitments are not currently open.');

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);
  if (hasCompletedHandCommit(participant)) throw new GameActionError(`${player.name} has already made a hand commitment choice.`);

  participant.passedHandCommit = true;
  appendPublicLog(game, action.playerId, 'pass_battle_hand_commit', `${player.name} passed their hand commitment.`);
  if (bothParticipants(game, hasCompletedHandCommit)) game.battle.stage = 'battle_draw';
  return { state: game };
}

function drawBattleCards(game: GameState, action: Extract<GameAction, { type: 'draw_battle_cards' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'battle_draw') throw new GameActionError('Battle draw is not currently open.');

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);
  const count = action.count ?? participant.battleDrawCount;
  if (!Number.isInteger(count) || count < 1) throw new GameActionError('Battle draw count must be a positive integer.');
  if (participant.hasDrawnBattleCards) throw new GameActionError(`${player.name} has already drawn battle cards.`);

  const result = drawFromDeck(player, { count });
  participant.battleDraw = result.drawnCards;
  participant.hasDrawnBattleCards = true;

  appendPublicLog(game, action.playerId, 'draw_battle_cards', `${player.name} drew ${result.drawnCards.length} battle card${result.drawnCards.length === 1 ? '' : 's'}.`, {
    count: result.drawnCards.length,
    requested: count,
    reshuffled: result.reshuffled,
    exhausted: result.exhausted,
  });
  if (bothParticipants(game, (candidate) => candidate.hasDrawnBattleCards)) game.battle.stage = 'battle_play_selection';
  return { state: game, result: { battleDrawnCards: result.drawnCards } };
}

function playBattleDrawCard(game: GameState, action: Extract<GameAction, { type: 'play_battle_draw_card' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'battle_play_selection') throw new GameActionError('Battle draw card selection is not currently open.');

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);
  if (hasCompletedBattleDrawPlay(participant)) throw new GameActionError(`${player.name} has already made all allowed battle-draw play choices.`);
  if (!participant.battleDraw.includes(action.cardId)) throw new GameActionError(`${player.name} did not draw that battle card.`);
  requireCardPlayable(action.cardId, 'battle_draw_play', 'battle_draw');

  participant.battleDraw = participant.battleDraw.filter((cardId) => cardId !== action.cardId);
  participant.battleDrawPlayed.push({ cardId: action.cardId, owner: action.playerId, origin: 'battle_draw', faceDown: true, canceled: false });
  applyBattleSetupEffects(participant);
  player.hasPlayedBattleThisTurn = true;

  appendPublicLog(game, action.playerId, 'play_battle_draw_card', `${player.name} selected a battle-draw card face down.`);
  maybeRevealAfterBattleDrawPlay(game);
  return { state: game };
}

function passBattleDrawPlay(game: GameState, action: Extract<GameAction, { type: 'pass_battle_draw_play' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'battle_play_selection') throw new GameActionError('Battle draw card selection is not currently open.');

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);
  if (participant.passedBattleDrawPlay) throw new GameActionError(`${player.name} has already passed their battle-draw play choice.`);

  participant.passedBattleDrawPlay = true;
  appendPublicLog(game, action.playerId, 'pass_battle_draw_play', `${player.name} played no more battle-draw cards.`);
  maybeRevealAfterBattleDrawPlay(game);
  return { state: game };
}

function rollBattleDie(game: GameState, action: Extract<GameAction, { type: 'roll_battle_die' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'dice') throw new GameActionError('Battle dice are not currently open.');

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);
  const value = action.value ?? Math.floor(Math.random() * 6) + 1;
  if (!Number.isInteger(value) || value < 1 || value > 6) throw new GameActionError('Battle die value must be an integer from 1 to 6.');
  if (participant.diceRoll !== undefined) throw new GameActionError(`${player.name} has already rolled.`);

  participant.diceRoll = value;
  appendPublicLog(game, action.playerId, 'roll_battle_die', `${player.name} rolled a ${value}.`, { value });
  if (bothParticipants(game, (candidate) => candidate.diceRoll !== undefined)) game.battle.stage = 'resolution';
  return { state: game };
}

function resolveBattle(game: GameState, action: Extract<GameAction, { type: 'resolve_battle' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'resolution') throw new GameActionError('Battle is not ready to resolve.');

  const battle = game.battle;
  if (action.playerId !== battle.attacker.playerId && action.playerId !== battle.defender.playerId) throw new GameActionError(`${action.playerId} cannot resolve a battle they are not in.`);

  const { activeModifiers, cancellations } = applyResolutionEffects(game, action);

  const attackerTotal = (battle.attacker.diceRoll ?? 0) + battle.attacker.modifiers;
  const defenderTotal = (battle.defender.diceRoll ?? 0) + battle.defender.modifiers;

  if (attackerTotal === defenderTotal && battle.tiePolicy === 'reroll') {
    battle.attacker.diceRoll = undefined;
    battle.defender.diceRoll = undefined;
    battle.stage = 'dice';
    appendPublicLog(game, undefined, 'battle_tie_reroll', 'The battle was tied. Both players reroll.', { attackerTotal, defenderTotal });
    return { state: game };
  }

  const winner = attackerTotal > defenderTotal
    ? battle.attacker.playerId
    : attackerTotal < defenderTotal
      ? battle.defender.playerId
      : battle.defender.playerId;
  const loser = winner === battle.attacker.playerId ? battle.defender.playerId : battle.attacker.playerId;
  const location = findSpace(game, battle.location);
  const attackerOrigin = findSpace(game, battle.attackerOrigin);
  const winnerState = requirePlayer(game, winner);
  const loserState = requirePlayer(game, loser);
  const loserParticipant = getBattleParticipant(game, loser);
  const retreatSpace = findRetreatSpace(game, loser);

  battle.winner = winner;
  battle.loser = loser;
  loserParticipant.retreated = true;

  if (winner === battle.attacker.playerId) {
    attackerOrigin.occupant = undefined;
    location.occupant = winner;
    winnerState.occupiedSpaceId = location.id;
    location.capturePendingBy = winner;

    if (retreatSpace) {
      retreatSpace.occupant = loser;
      loserState.occupiedSpaceId = retreatSpace.id;
    } else {
      loserState.occupiedSpaceId = undefined;
    }
  } else {
    attackerOrigin.occupant = battle.attacker.playerId;
    winnerState.occupiedSpaceId = location.id;
    if (retreatSpace) {
      retreatSpace.occupant = loser;
      loserState.occupiedSpaceId = retreatSpace.id;
    }
  }

  const { destinationOverrides } = applyPostResolutionEffects(game, action);

  for (const participant of [battle.attacker, battle.defender]) {
    const player = requirePlayer(game, participant.playerId);
    if (participant.handCommit) {
      if (participant.handCommit.canceled) player.zones.hand.push(participant.handCommit.cardId);
      else player.zones.graveyard.push(participant.handCommit.cardId);
    }

    for (const played of participant.battleDrawPlayed) {
      pushCardToDestination(
        player,
        played.cardId,
        destinationOverrideFor(destinationOverrides, participant.playerId, played.cardId) ?? 'discard',
      );
    }

    for (const cardId of participant.battleDraw) {
      pushCardToDestination(
        player,
        cardId,
        destinationOverrideFor(destinationOverrides, participant.playerId, cardId) ?? 'discard',
      );
    }
  }

  appendPublicLog(game, winner, 'battle_resolved', `${winnerState.name} won the battle.`, {
    winner,
    loser,
    attackerTotal,
    defenderTotal,
    tiePolicy: battle.tiePolicy,
    modifiers: activeModifiers,
    cancellations,
    destinationOverrides,
  });
  game.battle = undefined;
  game.phase = 'action_after_movement';
  game.priorityPlayer = game.activePlayer;
  return { state: game };
}

function endTurn(game: GameState, action: Extract<GameAction, { type: 'end_turn' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);

  const endingPlayer = requirePlayer(game, action.playerId);
  const nextPlayer = nextPlayerId(game);
  expireTurnLongConditions(game, endingPlayer);
  endingPlayer.actionsRemaining = 0;
  endingPlayer.movementRemaining = 0;

  const nextPlayerState = requirePlayer(game, nextPlayer);
  nextPlayerState.actionsRemaining = 1;
  nextPlayerState.movementRemaining = 1;
  nextPlayerState.hasPlayedActionThisTurn = false;
  nextPlayerState.hasPlayedBattleThisTurn = false;

  game.activePlayer = nextPlayer;
  game.priorityPlayer = nextPlayer;
  game.turn += 1;
  game.phase = 'turn_start';
  appendPublicLog(game, action.playerId, 'end_turn', `${endingPlayer.name} ended their turn.`);
  return { state: game };
}

export function applyGameAction(game: GameState, action: GameAction): ApplyGameActionResult {
  const next = cloneGameState(game);

  switch (action.type) {
    case 'draw_card':
      return drawCards(next, action);
    case 'reveal_space':
      return revealSpace(next, action);
    case 'play_action_card':
      return playActionCard(next, action);
    case 'move_player':
      return movePlayer(next, action);
    case 'commit_battle_hand_card':
      return commitBattleHandCard(next, action);
    case 'pass_battle_hand_commit':
      return passBattleHandCommit(next, action);
    case 'draw_battle_cards':
      return drawBattleCards(next, action);
    case 'play_battle_draw_card':
      return playBattleDrawCard(next, action);
    case 'pass_battle_draw_play':
      return passBattleDrawPlay(next, action);
    case 'roll_battle_die':
      return rollBattleDie(next, action);
    case 'resolve_battle':
      return resolveBattle(next, action);
    case 'end_turn':
      return endTurn(next, action);
    default: {
      const exhaustive: never = action;
      throw new GameActionError(`Unhandled action: ${JSON.stringify(exhaustive)}.`);
    }
  }
}
