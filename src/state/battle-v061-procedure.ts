import type {
  CardID,
  PlayerID,
  V061BattleCard,
  V061BattleStage,
  V061BattleState,
} from '../types';
import {
  advanceV061BattleStage,
  createV061BattleCard,
  createV061BattleState,
  type CreateV061BattleOptions,
  v061BattleParticipant,
} from './battle-v061';

export class V061BattleProcedureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'V061BattleProcedureError';
  }
}

export interface V061BattleProcedureState extends V061BattleState {
  gambitOrder: [PlayerID, PlayerID];
  tacticOrder: [PlayerID, PlayerID];
  priorityPlayer?: PlayerID;
}

export type V061BattleProcedureAction =
  | { type: 'complete_opening_effects' }
  | { type: 'set_gambit'; playerId: PlayerID; cardId: CardID; faceUp?: boolean }
  | { type: 'pass_gambit'; playerId: PlayerID }
  | { type: 'form_reserve'; playerId: PlayerID; cardIds: CardID[] }
  | { type: 'reveal_gambits' }
  | { type: 'choose_tactics'; playerId: PlayerID; cardIds: CardID[]; faceUp?: boolean }
  | { type: 'pass_tactics'; playerId: PlayerID }
  | { type: 'reveal_tactics' }
  | { type: 'record_battle_result'; winner: PlayerID; loser: PlayerID }
  | { type: 'record_withdrawal'; withdrawingPlayers: PlayerID[] }
  | { type: 'begin_aftermath' };

export interface CreateV061BattleProcedureOptions extends CreateV061BattleOptions {
  gambitOrder?: [PlayerID, PlayerID];
  tacticOrder?: [PlayerID, PlayerID];
}

export function createV061BattleProcedureState(
  options: CreateV061BattleProcedureOptions,
): V061BattleProcedureState {
  const battle = createV061BattleState(options);
  return {
    ...battle,
    gambitOrder: options.gambitOrder ?? [options.attacker, options.defender],
    tacticOrder: options.tacticOrder ?? [options.attacker, options.defender],
  };
}

function requireStage(
  battle: V061BattleProcedureState,
  stage: V061BattleStage,
): void {
  if (battle.stage !== stage) {
    throw new V061BattleProcedureError(`Action requires ${stage}; battle is in ${battle.stage}.`);
  }
}

function requirePriority(
  battle: V061BattleProcedureState,
  playerId: PlayerID,
): void {
  if (battle.priorityPlayer !== playerId) {
    throw new V061BattleProcedureError(`It is not ${playerId}'s battle-choice priority.`);
  }
}

function participantOrThrow(
  battle: V061BattleProcedureState,
  playerId: PlayerID,
) {
  const participant = v061BattleParticipant(battle, playerId);
  if (!participant) throw new V061BattleProcedureError(`${playerId} is not participating in battle ${battle.id}.`);
  return participant;
}

function nextIncompletePlayer(
  order: [PlayerID, PlayerID],
  complete: (playerId: PlayerID) => boolean,
): PlayerID | undefined {
  return order.find((playerId) => !complete(playerId));
}

function updateGambitPriority(battle: V061BattleProcedureState): void {
  const next = nextIncompletePlayer(
    battle.gambitOrder,
    (playerId) => participantOrThrow(battle, playerId).gambitChoiceComplete,
  );
  battle.priorityPlayer = next;
  if (!next) advanceV061BattleStage(battle);
}

function updateTacticPriority(battle: V061BattleProcedureState): void {
  const next = nextIncompletePlayer(
    battle.tacticOrder,
    (playerId) => participantOrThrow(battle, playerId).tacticChoiceComplete,
  );
  battle.priorityPlayer = next;
  if (!next) advanceV061BattleStage(battle);
}

function setGambit(
  battle: V061BattleProcedureState,
  playerId: PlayerID,
  cardId?: CardID,
  faceUp = false,
): void {
  requireStage(battle, 'set_gambits');
  requirePriority(battle, playerId);
  const participant = participantOrThrow(battle, playerId);
  if (participant.gambitChoiceComplete) {
    throw new V061BattleProcedureError(`${playerId} already completed their Gambit choice.`);
  }
  if (cardId && participant.gambitLimit < 1) {
    throw new V061BattleProcedureError(`${playerId} cannot set a Gambit in this battle.`);
  }

  participant.gambit = cardId
    ? createV061BattleCard({
        cardId,
        owner: playerId,
        role: 'gambit',
        source: 'hand',
        faceDown: !faceUp,
      })
    : undefined;
  participant.gambitChoiceComplete = true;
  updateGambitPriority(battle);
}

function formReserve(
  battle: V061BattleProcedureState,
  playerId: PlayerID,
  cardIds: CardID[],
): void {
  requireStage(battle, 'form_reserves');
  const participant = participantOrThrow(battle, playerId);
  if (participant.reserveFormed) {
    throw new V061BattleProcedureError(`${playerId} already formed a Reserve.`);
  }
  if (cardIds.length > participant.reserveSize) {
    throw new V061BattleProcedureError(
      `${playerId} supplied ${cardIds.length} Reserve cards but may draw at most ${participant.reserveSize}.`,
    );
  }

  participant.reserve = [...cardIds];
  participant.initialReserve = [...cardIds];
  participant.reserveFormed = true;

  if (battle.attacker.reserveFormed && battle.defender.reserveFormed) {
    advanceV061BattleStage(battle);
  }
}

function revealCards(cards: Array<V061BattleCard | undefined>): void {
  for (const card of cards) {
    if (card) card.faceDown = false;
  }
}

function chooseTactics(
  battle: V061BattleProcedureState,
  playerId: PlayerID,
  cardIds: CardID[],
  faceUp = false,
): void {
  requireStage(battle, 'choose_tactics');
  requirePriority(battle, playerId);
  const participant = participantOrThrow(battle, playerId);
  if (participant.tacticChoiceComplete) {
    throw new V061BattleProcedureError(`${playerId} already completed their Tactic choice.`);
  }
  if (cardIds.length > participant.tacticLimit) {
    throw new V061BattleProcedureError(
      `${playerId} chose ${cardIds.length} Tactics but the current limit is ${participant.tacticLimit}.`,
    );
  }

  const remaining = [...participant.reserve];
  const tactics = cardIds.map((cardId) => {
    const index = remaining.indexOf(cardId);
    if (index < 0) {
      throw new V061BattleProcedureError(`${cardId} is not available in ${playerId}'s Reserve.`);
    }
    remaining.splice(index, 1);
    return createV061BattleCard({
      cardId,
      owner: playerId,
      role: 'tactic',
      source: 'reserve',
      faceDown: !faceUp,
    });
  });

  participant.reserve = remaining;
  participant.tactics = tactics;
  participant.tacticChoiceComplete = true;
  updateTacticPriority(battle);
}

function recordBattleResult(
  battle: V061BattleProcedureState,
  winner: PlayerID,
  loser: PlayerID,
): void {
  requireStage(battle, 'resolve_battle');
  participantOrThrow(battle, winner);
  participantOrThrow(battle, loser);
  if (winner === loser) throw new V061BattleProcedureError('Winner and loser must be different players.');

  battle.winner = winner;
  battle.loser = loser;
  battle.noWinner = false;
}

function recordWithdrawal(
  battle: V061BattleProcedureState,
  withdrawingPlayers: PlayerID[],
): void {
  if (!['opening_effects', 'set_gambits', 'form_reserves', 'reveal_gambits', 'choose_tactics', 'reveal_tactics', 'resolve_battle']
    .includes(battle.stage)) {
    throw new V061BattleProcedureError(`Withdrawal cannot be recorded during ${battle.stage}.`);
  }
  const unique = [...new Set(withdrawingPlayers)];
  if (unique.length < 1 || unique.length > 2) {
    throw new V061BattleProcedureError('Withdrawal must identify one or both battle participants.');
  }
  for (const playerId of unique) participantOrThrow(battle, playerId).withdrew = true;

  battle.winner = undefined;
  battle.loser = undefined;
  battle.noWinner = true;
  battle.priorityPlayer = undefined;
  battle.stage = 'aftermath';
}

export function applyV061BattleProcedureAction(
  state: V061BattleProcedureState,
  action: V061BattleProcedureAction,
): V061BattleProcedureState {
  const battle = structuredClone(state);

  switch (action.type) {
    case 'complete_opening_effects':
      requireStage(battle, 'opening_effects');
      battle.openingEffectsComplete = true;
      advanceV061BattleStage(battle);
      battle.priorityPlayer = battle.gambitOrder[0];
      return battle;

    case 'set_gambit':
      setGambit(battle, action.playerId, action.cardId, action.faceUp);
      return battle;

    case 'pass_gambit':
      setGambit(battle, action.playerId);
      return battle;

    case 'form_reserve':
      formReserve(battle, action.playerId, action.cardIds);
      return battle;

    case 'reveal_gambits':
      requireStage(battle, 'reveal_gambits');
      revealCards([battle.attacker.gambit, battle.defender.gambit]);
      battle.gambitRevealComplete = true;
      advanceV061BattleStage(battle);
      battle.priorityPlayer = battle.tacticOrder[0];
      return battle;

    case 'choose_tactics':
      chooseTactics(battle, action.playerId, action.cardIds, action.faceUp);
      return battle;

    case 'pass_tactics':
      chooseTactics(battle, action.playerId, []);
      return battle;

    case 'reveal_tactics':
      requireStage(battle, 'reveal_tactics');
      revealCards([...battle.attacker.tactics, ...battle.defender.tactics]);
      battle.tacticRevealComplete = true;
      advanceV061BattleStage(battle);
      battle.priorityPlayer = undefined;
      return battle;

    case 'record_battle_result':
      recordBattleResult(battle, action.winner, action.loser);
      return battle;

    case 'record_withdrawal':
      recordWithdrawal(battle, action.withdrawingPlayers);
      return battle;

    case 'begin_aftermath':
      requireStage(battle, 'resolve_battle');
      if (!battle.winner && !battle.noWinner) {
        throw new V061BattleProcedureError('A battle result or withdrawal must be recorded before the Aftermath.');
      }
      advanceV061BattleStage(battle);
      battle.priorityPlayer = undefined;
      return battle;
  }
}
