import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  RevolutionBattleExchangeState,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const REVOLUTION = 'neutral-revolution';
const REVOLUTION_EXCHANGE_RESOLVED = 'neutral_revolution_exchange_resolved';

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

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.values(game.players).find((player) => player.id !== playerId);
  if (!opponent || Object.keys(game.players).length !== 2) {
    throw new GameActionError('Revolution currently requires exactly two players.');
  }
  return opponent.id;
}

export function applyRevolutionAction(game: GameState, playerId: PlayerID): CardID[] {
  const otherId = opponentId(game, playerId);
  const player = game.players[playerId];
  const opponent = game.players[otherId];
  const playerDiscarded = [...player.zones.hand];
  const opponentDiscarded = [...opponent.zones.hand];

  player.zones.hand = [];
  opponent.zones.hand = [];
  player.zones.discard.push(...playerDiscarded);
  opponent.zones.discard.push(...opponentDiscarded);

  const playerDraw = drawFromDeck(player, { count: opponentDiscarded.length });
  const opponentDraw = drawFromDeck(opponent, { count: playerDiscarded.length });
  player.zones.hand.push(...playerDraw.drawnCards);
  opponent.zones.hand.push(...opponentDraw.drawnCards);

  appendPublicLog(
    game,
    playerId,
    'neutral_revolution_action',
    `${player.name} discarded ${playerDiscarded.length} card${playerDiscarded.length === 1 ? '' : 's'} and drew ${playerDraw.drawnCards.length}; ${opponent.name} discarded ${opponentDiscarded.length} and drew ${opponentDraw.drawnCards.length} with Revolution.`,
    {
      playerId,
      opponentId: otherId,
      discardedCounts: {
        [playerId]: playerDiscarded.length,
        [otherId]: opponentDiscarded.length,
      },
      drawnCounts: {
        [playerId]: playerDraw.drawnCards.length,
        [otherId]: opponentDraw.drawnCards.length,
      },
      reshuffled: {
        [playerId]: playerDraw.reshuffled,
        [otherId]: opponentDraw.reshuffled,
      },
      exhausted: {
        [playerId]: playerDraw.exhausted,
        [otherId]: opponentDraw.exhausted,
      },
    },
  );
  return playerDraw.drawnCards;
}

function activeRevolution(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === REVOLUTION
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function participantHasRevolution(participant: BattleParticipantState): boolean {
  return activeRevolution(participant.handCommit)
    || participant.battleDrawPlayed.some(activeRevolution);
}

function eligiblePlayers(game: GameState): PlayerID[] {
  const battle = game.battle;
  if (!battle) return [];
  return [battle.attacker, battle.defender]
    .filter(participantHasRevolution)
    .map((participant) => participant.playerId);
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingNeutralChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingInquisitionChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

function activeExchangeState(game: GameState): RevolutionBattleExchangeState | undefined {
  const state = game.neutralRevolutionBattleExchange;
  if (!state) return undefined;
  if (state.battleId !== game.battle?.id) {
    game.neutralRevolutionBattleExchange = undefined;
    return undefined;
  }
  return state;
}

function nextUndecidedPlayer(state: RevolutionBattleExchangeState): PlayerID | undefined {
  return state.eligiblePlayerIds.find((playerId) => state.decisions[playerId] === undefined);
}

function openPendingChoice(game: GameState, state: RevolutionBattleExchangeState): boolean {
  const playerId = nextUndecidedPlayer(state);
  if (!playerId) return false;
  game.pendingNeutralChoice = {
    kind: 'revolution_battle',
    playerId,
    battleId: state.battleId,
    options: ['keep', 'exchange'],
    resumePriorityPlayer: state.resumePriorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

export function openNextRevolutionChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  const battle = game.battle;
  if (!battle || battle.stage !== 'resolution') return false;
  if (battle.attacker.diceRoll === undefined || battle.defender.diceRoll === undefined) return false;
  if (battle.effectsResolved.includes(REVOLUTION_EXCHANGE_RESOLVED)) return false;

  let exchange = activeExchangeState(game);
  if (!exchange) {
    const eligiblePlayerIds = eligiblePlayers(game);
    if (eligiblePlayerIds.length === 0) return false;
    exchange = {
      battleId: battle.id,
      eligiblePlayerIds,
      decisions: {},
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.neutralRevolutionBattleExchange = exchange;
  }
  return openPendingChoice(game, exchange);
}

function finalizeExchange(game: GameState, exchange: RevolutionBattleExchangeState): void {
  const battle = game.battle;
  if (!battle || battle.id !== exchange.battleId) {
    throw new GameActionError('The Revolution battle is no longer active.');
  }
  const exchangingPlayers = exchange.eligiblePlayerIds.filter(
    (playerId) => exchange.decisions[playerId] === 'exchange',
  );
  const before = {
    [battle.attacker.playerId]: battle.attacker.diceRoll!,
    [battle.defender.playerId]: battle.defender.diceRoll!,
  };

  if (exchangingPlayers.length === 1) {
    const attackerRoll = battle.attacker.diceRoll!;
    battle.attacker.diceRoll = battle.defender.diceRoll!;
    battle.defender.diceRoll = attackerRoll;
  }
  battle.effectsResolved.push(REVOLUTION_EXCHANGE_RESOLVED);
  game.neutralRevolutionBattleExchange = undefined;
  game.priorityPlayer = exchange.resumePriorityPlayer ?? game.activePlayer;

  const message = exchangingPlayers.length === 1
    ? `${game.players[exchangingPlayers[0]].name} exchanged the players' selected die results with Revolution.`
    : exchangingPlayers.length > 1
      ? 'Both players chose to exchange the selected die results with Revolution, so no exchange occurred.'
      : 'No player exchanged the selected die results with Revolution.';
  appendPublicLog(
    game,
    exchangingPlayers.length === 1 ? exchangingPlayers[0] : undefined,
    'neutral_revolution_battle_resolved',
    message,
    {
      battleId: battle.id,
      decisions: { ...exchange.decisions },
      exchangingPlayers,
      before,
      after: {
        [battle.attacker.playerId]: battle.attacker.diceRoll!,
        [battle.defender.playerId]: battle.defender.diceRoll!,
      },
    },
  );
}

export function resolveRevolutionChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'revolution_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Revolution choice.`);
  }
  const battle = game.battle;
  const exchange = activeExchangeState(game);
  if (!battle || battle.id !== pending.battleId || !exchange) {
    throw new GameActionError('The Revolution exchange decision is no longer available.');
  }
  if (action.choice !== 'keep' && action.choice !== 'exchange') {
    throw new GameActionError('Choose whether to keep or exchange the selected die results.');
  }
  if (!exchange.eligiblePlayerIds.includes(action.playerId)
    || exchange.decisions[action.playerId] !== undefined) {
    throw new GameActionError(`${action.playerId} cannot make another Revolution decision.`);
  }

  exchange.decisions[action.playerId] = action.choice;
  game.pendingNeutralChoice = undefined;
  if (openPendingChoice(game, exchange)) return;
  finalizeExchange(game, exchange);
}
