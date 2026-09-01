import { cardCanBePlayedAt } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import {
  counterintelligenceBlocksFaceDownBattleCardInspection,
  counterintelligenceBlocksHandInspection,
  logCounterintelligenceBlock,
} from './neutral-counterintelligence';

export const CONFESSION = 'inquisition-confession';

export class ConfessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfessionError';
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

function privateLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'private',
    visibleTo: [actor],
  } satisfies GameEvent);
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.values(game.players).find((player) => player.id !== playerId);
  if (!opponent) throw new ConfessionError('Confession requires an opponent.');
  return opponent.id;
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new ConfessionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new ConfessionError(`${playerId} is not participating in the battle.`);
}

function opposingParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new ConfessionError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender : battle.attacker;
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

export function confessionActionOptions(game: GameState, inquisitorId: PlayerID): CardID[] {
  const opponent = opponentId(game, inquisitorId);
  if (counterintelligenceBlocksHandInspection(game, inquisitorId, opponent)) return [];
  return unique(game.players[opponent].zones.hand.filter((cardId) => cardCanBePlayedAt(cardId, 'battle_hand_commit', 'hand')));
}

function setConfessionConstraint(
  game: GameState,
  inquisitorId: PlayerID,
  opponent: PlayerID,
  cardId: CardID,
): void {
  game.inquisitionConfessionConstraint = {
    inquisitorId,
    opponentId: opponent,
    cardId,
    expiresTurn: game.turn,
  };
  publicLog(
    game,
    inquisitorId,
    'inquisition_confession_constraint',
    `${game.players[inquisitorId].name} chose one card from ${game.players[opponent].name}’s hand for Confession.`,
    { opponentId: opponent },
  );
  privateLog(
    game,
    inquisitorId,
    'inquisition_confession_constraint_private',
    `You chose ${cardId} for Confession.`,
    { opponentId: opponent, cardId },
  );
  privateLog(
    game,
    opponent,
    'inquisition_confession_constraint_private',
    `${cardId} was chosen for Confession.`,
    { inquisitorId, cardId },
  );
}

export function applyConfessionAction(game: GameState, inquisitorId: PlayerID, cardId: CardID): boolean {
  if (cardId !== CONFESSION) return false;
  if (game.players[inquisitorId]?.factionId !== 'inquisition') {
    throw new ConfessionError('Only an Inquisition player can use Confession.');
  }
  const opponent = opponentId(game, inquisitorId);
  if (counterintelligenceBlocksHandInspection(game, inquisitorId, opponent)) {
    logCounterintelligenceBlock(game, inquisitorId, opponent, 'hand', 'Confession');
    return true;
  }
  const hand = [...game.players[opponent].zones.hand];
  const handOptions = confessionActionOptions(game, inquisitorId);
  publicLog(
    game,
    inquisitorId,
    'inquisition_confession_hand_inspected',
    `${game.players[inquisitorId].name} looked at ${game.players[opponent].name}’s hand with Confession.`,
    { opponentId: opponent },
  );
  privateLog(
    game,
    inquisitorId,
    'inquisition_confession_hand_inspected_private',
    `You inspected ${game.players[opponent].name}’s hand.`,
    { opponentId: opponent, hand },
  );
  if (handOptions.length === 0) return true;
  if (handOptions.length === 1) {
    setConfessionConstraint(game, inquisitorId, opponent, handOptions[0]);
    return true;
  }
  game.pendingInquisitionChoice = {
    kind: 'confession_action',
    playerId: inquisitorId,
    opponentId: opponent,
    handOptions,
    options: ['select_card'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = inquisitorId;
  return true;
}

export function activeConfessionConstraint(game: GameState, playerId: PlayerID) {
  const constraint = game.inquisitionConfessionConstraint;
  const battle = game.battle;
  if (!constraint || constraint.expiresTurn !== game.turn || constraint.opponentId !== playerId || !battle) return undefined;
  if (battle.attacker.playerId !== constraint.inquisitorId && battle.defender.playerId !== constraint.inquisitorId) return undefined;
  const chosenIsAble = game.players[playerId].zones.hand.includes(constraint.cardId)
    && cardCanBePlayedAt(constraint.cardId, 'battle_hand_commit', 'hand');
  return chosenIsAble ? constraint : undefined;
}

export function validateConfessionHandCommit(game: GameState, playerId: PlayerID, cardId: CardID): void {
  const constraint = activeConfessionConstraint(game, playerId);
  if (constraint && cardId !== constraint.cardId) {
    throw new ConfessionError(`Confession requires ${constraint.cardId} if a card is committed from hand.`);
  }
}

export function confessionLegalHandCommitCards(game: GameState, playerId: PlayerID, cards: CardID[]): CardID[] {
  const constraint = activeConfessionConstraint(game, playerId);
  return constraint ? cards.filter((cardId) => cardId === constraint.cardId) : cards;
}

export function clearExpiredConfessionConstraint(game: GameState): void {
  if (game.inquisitionConfessionConstraint?.expiresTurn !== game.turn) {
    game.inquisitionConfessionConstraint = undefined;
  }
}

function activeConfession(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === CONFESSION
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

interface ConfessionSource {
  participant: BattleParticipantState;
  card: BattlePlayedCard;
}

function unresolvedSource(participant: BattleParticipantState): ConfessionSource | undefined {
  if (activeConfession(participant.handCommit) && !participant.handCommit.earlyEffectResolved) {
    return { participant, card: participant.handCommit };
  }
  const card = participant.battleDrawPlayed.find((candidate) => activeConfession(candidate) && !candidate.earlyEffectResolved);
  return card ? { participant, card } : undefined;
}

function nextConfessionSource(game: GameState): ConfessionSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

export function battleHasUnresolvedConfessionPreReveal(game: GameState, incomingCardId?: CardID): boolean {
  return incomingCardId === CONFESSION || Boolean(nextConfessionSource(game));
}

function replacementOptions(game: GameState, inquisitorId: PlayerID): CardID[] {
  return unique(game.players[inquisitorId].zones.hand.filter((cardId) => cardCanBePlayedAt(cardId, 'battle_hand_commit', 'hand')));
}

export function openNextConfessionPreRevealWindow(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'normal_reveal' || game.pendingInquisitionChoice) return false;

  while (true) {
    const source = nextConfessionSource(game);
    if (!source) return false;
    source.card.earlyEffectResolved = true;
    source.card.faceDown = false;
    const inquisitorId = source.participant.playerId;
    const opponent = opposingParticipant(game, inquisitorId);
    const handCommitProtected = Boolean(opponent.handCommit)
      && counterintelligenceBlocksFaceDownBattleCardInspection(game, inquisitorId, opponent.playerId);
    if (handCommitProtected) {
      logCounterintelligenceBlock(game, inquisitorId, opponent.playerId, 'face_down_battle_card', 'Confession');
    } else if (opponent.handCommit) {
      opponent.handCommit.faceDown = false;
    }
    publicLog(
      game,
      inquisitorId,
      'inquisition_confession_battle_revealed',
      `${game.players[inquisitorId].name} revealed Confession before the normal battle reveal.`,
      {
        battleId: battle.id,
        opponentId: opponent.playerId,
        opponentHandCommitCardId: handCommitProtected ? undefined : opponent.handCommit?.cardId,
      },
    );

    const originalCommit = source.participant.handCommit;
    const options = originalCommit ? replacementOptions(game, inquisitorId) : [];
    if (!originalCommit || options.length === 0) continue;

    game.pendingInquisitionChoice = {
      kind: 'confession_battle',
      playerId: inquisitorId,
      opponentId: opponent.playerId,
      battleId: battle.id,
      replacementOptions: options,
      originalCommitCardId: originalCommit.cardId,
      options: ['pass', 'replace'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = inquisitorId;
    return true;
  }
}

export function isConfessionChoice(kind: unknown): kind is 'confession_action' | 'confession_battle' {
  return kind === 'confession_action' || kind === 'confession_battle';
}

export function resolveConfessionChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending
    || (pending.kind !== 'confession_action' && pending.kind !== 'confession_battle')
    || pending.playerId !== action.playerId) {
    throw new ConfessionError(`${action.playerId} has no pending Confession choice.`);
  }

  if (pending.kind === 'confession_action') {
    if (action.choice !== 'select_card'
      || !pending.handOptions.includes(action.cardId)
      || !game.players[pending.opponentId].zones.hand.includes(action.cardId)
      || !cardCanBePlayedAt(action.cardId, 'battle_hand_commit', 'hand')) {
      throw new ConfessionError('Choose an eligible Battle card that remains in the opponent’s hand.');
    }
    const resumePriority = pending.resumePriorityPlayer;
    setConfessionConstraint(game, pending.playerId, pending.opponentId, action.cardId);
    game.pendingInquisitionChoice = undefined;
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    return;
  }

  if (action.choice !== 'pass' && action.choice !== 'replace') {
    throw new ConfessionError('Choose whether to replace your hand commitment with Confession.');
  }
  const participant = participantFor(game, pending.playerId);
  if (game.battle?.id !== pending.battleId || participant.handCommit?.cardId !== pending.originalCommitCardId) {
    throw new ConfessionError('The original Confession hand commitment is no longer available to replace.');
  }
  if (action.choice === 'replace') {
    if (!pending.replacementOptions.includes(action.cardId)
      || !game.players[pending.playerId].zones.hand.includes(action.cardId)
      || !cardCanBePlayedAt(action.cardId, 'battle_hand_commit', 'hand')) {
      throw new ConfessionError('Choose an eligible replacement card that remains in your hand.');
    }
    const player = game.players[pending.playerId];
    if (!removeOne(player.zones.hand, action.cardId)) {
      throw new ConfessionError('The replacement card is no longer in hand.');
    }
    const original = participant.handCommit;
    player.zones.hand.push(original.cardId);
    participant.handCommit = {
      cardId: action.cardId,
      owner: pending.playerId,
      origin: 'hand',
      faceDown: false,
      canceled: false,
    };
    publicLog(
      game,
      pending.playerId,
      'inquisition_confession_battle_replacement',
      `${game.players[pending.playerId].name} returned their hand commitment and replaced it face up with ${action.cardId}.`,
      { battleId: pending.battleId, returnedCardId: original.cardId, replacementCardId: action.cardId },
    );
  } else {
    publicLog(
      game,
      pending.playerId,
      'inquisition_confession_battle_passed',
      `${game.players[pending.playerId].name} kept their original hand commitment after revealing Confession.`,
      { battleId: pending.battleId },
    );
  }

  const resumePriority = pending.resumePriorityPlayer;
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
}
