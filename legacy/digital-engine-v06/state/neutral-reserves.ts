import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type {
  PlayActionCardAction,
  ResolveBattleAction,
  ResolveNeutralChoiceAction,
} from './actions';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const RESERVES = 'neutral-reserves';

export interface PreparedReservesAction {
  remainingHand: CardID[];
}

export interface ResolvedReservesChoice {
  deferredBattleAction?: ResolveBattleAction;
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

function subtractMultiset(cards: CardID[], removed: CardID[]): CardID[] {
  const remaining = [...cards];
  for (const cardId of removed) removeOne(remaining, cardId);
  return remaining;
}

export function prepareReservesAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedReservesAction | undefined {
  if (action.cardId !== RESERVES) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);
  const remainingHand = [...player.zones.hand];
  if (!removeOne(remainingHand, RESERVES)) {
    throw new GameActionError(`${player.name} does not have Reserves in hand.`);
  }
  return { remainingHand };
}

export function applyReservesAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedReservesAction,
): CardID[] {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];
  const draw = drawFromDeck(player, { count: 1 });
  player.zones.hand.push(...draw.drawnCards);

  appendPublicLog(
    game,
    playerId,
    'neutral_reserves_action_draw',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Reserves.`,
    { drawCount: draw.drawnCards.length, reshuffled: draw.reshuffled, exhausted: draw.exhausted },
  );

  if (player.zones.hand.length > 0) {
    game.pendingNeutralChoice = {
      kind: 'reserves_action',
      playerId,
      cardOptions: unique(player.zones.hand),
      options: ['select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = playerId;
  }
  return draw.drawnCards;
}

function activeReserves(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === RESERVES && !card.canceled && !card.negated);
}

function activeBattleCopyCount(participant: BattleParticipantState): number {
  return (activeReserves(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeReserves).length;
}

function markCompleted(game: GameState, playerId: PlayerID): void {
  const plan = game.neutralReservesBattleTopdecks;
  if (!plan || plan.completedPlayers.includes(playerId)) return;
  plan.completedPlayers.push(playerId);
}

export function prepareReservesBattleResolution(
  game: GameState,
  action: ResolveBattleAction,
): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'resolution') return false;
  if (game.neutralReservesBattleTopdecks?.battleId !== battle.id) {
    game.neutralReservesBattleTopdecks = {
      battleId: battle.id,
      byPlayer: {},
      completedPlayers: [],
    };
  }
  const plan = game.neutralReservesBattleTopdecks;

  for (const participant of [battle.attacker, battle.defender]) {
    if (plan.completedPlayers.includes(participant.playerId)) continue;
    const selected = plan.byPlayer[participant.playerId] ?? [];
    const candidates = subtractMultiset(participant.battleDraw, selected);
    const remainingUses = activeBattleCopyCount(participant) - selected.length;
    if (remainingUses < 1 || candidates.length < 1) {
      markCompleted(game, participant.playerId);
      continue;
    }

    game.pendingNeutralChoice = {
      kind: 'reserves_battle',
      playerId: participant.playerId,
      battleId: battle.id,
      cardOptions: unique(candidates),
      triggersRemaining: Math.min(remainingUses, candidates.length),
      resolverPlayerId: action.playerId,
      battleCardTargets: action.battleCardTargets?.map((target) => ({ ...target })),
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = participant.playerId;
    return true;
  }
  return false;
}

function resolveActionChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'reserves_action' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Reserves Action choice.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one card from your hand to place on top of your Draw Pile.');
  }
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in hand.`);
  }
  player.zones.deck.unshift(action.cardId);
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  appendPublicLog(
    game,
    action.playerId,
    'neutral_reserves_action_topdeck',
    `${player.name} placed one card from hand on top of their Draw Pile with Reserves.`,
  );
}

function resumeActionForBattleChoice(
  pending: Extract<NonNullable<GameState['pendingNeutralChoice']>, { kind: 'reserves_battle' }>,
): ResolveBattleAction {
  return {
    type: 'resolve_battle',
    playerId: pending.resolverPlayerId,
    battleCardTargets: pending.battleCardTargets?.map((target) => ({ ...target })),
  };
}

function resolveBattleChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): ResolvedReservesChoice {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'reserves_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Reserves Battle choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId) {
    throw new GameActionError('The Reserves battle is no longer active.');
  }
  const plan = game.neutralReservesBattleTopdecks;
  if (!plan || plan.battleId !== pending.battleId) {
    throw new GameActionError('Reserves Battle cleanup state is missing.');
  }

  if (action.choice === 'pass') {
    markCompleted(game, action.playerId);
    game.pendingNeutralChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    appendPublicLog(game, action.playerId, 'neutral_reserves_battle_passed', `${game.players[action.playerId].name} declined Reserves during cleanup.`);
    return { deferredBattleAction: resumeActionForBattleChoice(pending) };
  }
  if (action.choice !== 'use' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one eligible unchosen Battle Hand card or pass Reserves.');
  }

  const selected = plan.byPlayer[action.playerId] ?? [];
  plan.byPlayer[action.playerId] = [...selected, action.cardId];
  const participant = game.battle.attacker.playerId === action.playerId
    ? game.battle.attacker
    : game.battle.defender;
  const candidates = subtractMultiset(participant.battleDraw, plan.byPlayer[action.playerId] ?? []);
  const remainingUses = pending.triggersRemaining - 1;

  appendPublicLog(
    game,
    action.playerId,
    'neutral_reserves_battle_selected',
    `${game.players[action.playerId].name} selected ${action.cardId} for Reserves cleanup.`,
    { battleId: pending.battleId, cardId: action.cardId },
  );

  if (remainingUses > 0 && candidates.length > 0) {
    game.pendingNeutralChoice = {
      ...pending,
      cardOptions: unique(candidates),
      triggersRemaining: Math.min(remainingUses, candidates.length),
    };
    game.priorityPlayer = action.playerId;
    return {};
  }

  markCompleted(game, action.playerId);
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  return { deferredBattleAction: resumeActionForBattleChoice(pending) };
}

export function resolveReservesChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): ResolvedReservesChoice {
  if (game.pendingNeutralChoice?.kind === 'reserves_action') {
    resolveActionChoice(game, action);
    return {};
  }
  return resolveBattleChoice(game, action);
}

export function applyReservesBattleTopdecks(
  game: GameState,
  battleId: string,
): number {
  const plan = game.neutralReservesBattleTopdecks;
  if (!plan || plan.battleId !== battleId) return 0;
  let moved = 0;
  for (const [playerId, cardIds] of Object.entries(plan.byPlayer)) {
    const player = game.players[playerId];
    if (!player) continue;
    for (const cardId of cardIds ?? []) {
      if (!removeOne(player.zones.discard, cardId)) continue;
      player.zones.deck.unshift(cardId);
      moved += 1;
    }
  }
  game.neutralReservesBattleTopdecks = undefined;
  return moved;
}
