import type {
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SequestrationActionState,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { GameActionError } from './reducer';

export const SEQUESTRATION = 'neutral-sequestration';
const SEQUESTRATION_BATTLE_RESOLVED = 'neutral_sequestration_battle_resolved';

function appendPublicLog(
  game: GameState,
  actor: PlayerID | undefined,
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

function unique(cards: readonly CardID[]): CardID[] {
  return [...new Set(cards)];
}

function nextUndecidedPlayer(state: SequestrationActionState): PlayerID | undefined {
  return state.playerIds.find((playerId) => !state.completedPlayerIds.includes(playerId));
}

function openNextActionChoice(game: GameState, state: SequestrationActionState): boolean {
  const playerId = nextUndecidedPlayer(state);
  if (!playerId) return false;
  const player = game.players[playerId];
  if (!player || player.zones.assetBank.length < 2) {
    state.completedPlayerIds.push(playerId);
    if (player?.zones.assetBank.length === 1) state.keptCardIds[playerId] = player.zones.assetBank[0];
    return openNextActionChoice(game, state);
  }
  game.pendingNeutralChoice = {
    kind: 'sequestration_action',
    playerId,
    sourcePlayerId: state.sourcePlayerId,
    cardOptions: unique(player.zones.assetBank),
    options: ['select_card'],
    resumePriorityPlayer: state.resumePriorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

function finalizeAction(game: GameState, state: SequestrationActionState): void {
  const discardedByPlayer: Partial<Record<PlayerID, CardID[]>> = {};
  for (const playerId of state.playerIds) {
    const player = game.players[playerId];
    if (!player) continue;
    const remaining = [...player.zones.assetBank];
    const keptCardId = state.keptCardIds[playerId];
    if (keptCardId && !removeOne(remaining, keptCardId)) {
      throw new GameActionError(`${keptCardId} is no longer available to keep with Sequestration.`);
    }
    player.zones.assetBank = keptCardId ? [keptCardId] : [];
    player.zones.discard.push(...remaining);
    discardedByPlayer[playerId] = remaining;
  }

  game.neutralSequestrationAction = undefined;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = state.resumePriorityPlayer ?? game.activePlayer;
  appendPublicLog(
    game,
    state.sourcePlayerId,
    'neutral_sequestration_action',
    'Each player kept up to one Asset and discarded the rest with Sequestration.',
    {
      sourcePlayerId: state.sourcePlayerId,
      keptCardIds: { ...state.keptCardIds },
      discardedByPlayer,
    },
  );
}

export function applySequestrationAction(game: GameState, playerId: PlayerID): void {
  const state: SequestrationActionState = {
    sourcePlayerId: playerId,
    playerIds: Object.keys(game.players),
    completedPlayerIds: [],
    keptCardIds: {},
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.neutralSequestrationAction = state;

  for (const currentPlayerId of state.playerIds) {
    const cards = game.players[currentPlayerId]?.zones.assetBank ?? [];
    if (cards.length > 1) continue;
    state.completedPlayerIds.push(currentPlayerId);
    if (cards.length === 1) state.keptCardIds[currentPlayerId] = cards[0];
  }

  if (openNextActionChoice(game, state)) return;
  finalizeAction(game, state);
}

export function resolveSequestrationChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  const state = game.neutralSequestrationAction;
  if (!pending || pending.kind !== 'sequestration_action' || pending.playerId !== action.playerId || !state) {
    throw new GameActionError(`${action.playerId} has no pending Sequestration choice.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one banked Asset to keep with Sequestration.');
  }
  const player = game.players[action.playerId];
  if (!player?.zones.assetBank.includes(action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer banked.`);
  }

  state.keptCardIds[action.playerId] = action.cardId;
  state.completedPlayerIds.push(action.playerId);
  game.pendingNeutralChoice = undefined;
  if (openNextActionChoice(game, state)) return;
  finalizeAction(game, state);
}

function activeSequestration(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === SEQUESTRATION
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

export function applySequestrationBattleRestriction(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.effectsResolved.includes(SEQUESTRATION_BATTLE_RESOLVED)) return false;
  const activeCopies = [battle.attacker.handCommit, ...battle.attacker.battleDrawPlayed,
    battle.defender.handCommit, ...battle.defender.battleDrawPlayed]
    .filter(activeSequestration);
  if (activeCopies.length === 0) return false;

  battle.bankedAssetUseProhibited = [battle.attacker.playerId, battle.defender.playerId];
  battle.effectsResolved.push(SEQUESTRATION_BATTLE_RESOLVED);
  appendPublicLog(
    game,
    activeCopies[0].owner,
    'neutral_sequestration_battle',
    'All banked Assets are inactive during this battle because of Sequestration.',
    { battleId: battle.id, activeCopies: activeCopies.length },
  );
  return true;
}
