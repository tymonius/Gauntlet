import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';

const FOG_OF_WAR = 'intelligence-fog-of-war';

export class FogOfWarBattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FogOfWarBattleError';
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

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function used(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled);
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new FogOfWarBattleError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new FogOfWarBattleError(`${playerId} is not participating in this battle.`);
}

function opponentParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new FogOfWarBattleError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender : battle.attacker;
}

function nextUnresolvedFogOfWar(game: GameState): { participant: BattleParticipantState; card: BattlePlayedCard } | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  for (const participant of [battle.attacker, battle.defender]) {
    if (active(participant.handCommit)
      && participant.handCommit.cardId === FOG_OF_WAR
      && !participant.handCommit.earlyEffectResolved) {
      return { participant, card: participant.handCommit };
    }
    const card = participant.battleDrawPlayed.find((candidate) => (
      active(candidate)
      && candidate.cardId === FOG_OF_WAR
      && !candidate.earlyEffectResolved
    ));
    if (card) return { participant, card };
  }
  return undefined;
}

function selectedBattleHandCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return participant.battleDrawPlayed.filter((card) => used(card) && card.origin === 'battle_draw');
}

export function battleHasUnresolvedFogOfWar(game: GameState, incomingCardId?: CardID): boolean {
  if (incomingCardId === FOG_OF_WAR) return true;
  return Boolean(nextUnresolvedFogOfWar(game));
}

export function resolveFogOfWarPreRevealCard(
  game: GameState,
  participant: BattleParticipantState,
  card: BattlePlayedCard,
): boolean {
  const battle = game.battle;
  if (!battle || game.pendingIntelligenceChoice) return false;
  if (!active(card) || card.cardId !== FOG_OF_WAR || card.earlyEffectResolved) return false;

  card.faceDown = false;
  card.earlyEffectResolved = true;
  publicLog(
    game,
    participant.playerId,
    'intelligence_fog_of_war_revealed_early',
    `${game.players[participant.playerId].name} revealed Fog of War before the normal battle reveal.`,
  );

  const opponent = opponentParticipant(game, participant.playerId);
  const handCommit = used(opponent.handCommit) ? opponent.handCommit : undefined;
  const battleHandCards = selectedBattleHandCards(opponent);
  if (!handCommit || battleHandCards.length === 0) return false;

  game.pendingIntelligenceChoice = {
    kind: 'fog_of_war_return',
    playerId: opponent.playerId,
    fogOwnerId: participant.playerId,
    battleId: battle.id,
    handCardId: handCommit.cardId,
    battleHandCardIds: battleHandCards.map((candidate) => candidate.cardId),
    options: ['return_hand', 'return_battle_hand'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = opponent.playerId;
  return true;
}

export function openNextFogOfWarBattleWindow(game: GameState): boolean {
  const source = nextUnresolvedFogOfWar(game);
  return source ? resolveFogOfWarPreRevealCard(game, source.participant, source.card) : false;
}

function returnHandCommit(game: GameState, playerId: PlayerID, expectedCardId: CardID): CardID {
  const participant = participantFor(game, playerId);
  const card = participant.handCommit;
  if (!used(card) || card.cardId !== expectedCardId) {
    throw new FogOfWarBattleError('The opposing hand commitment is no longer available to return.');
  }
  participant.handCommit = undefined;
  participant.passedHandCommit = true;
  game.players[playerId].zones.hand.push(card.cardId);
  return card.cardId;
}

function returnBattleHandCard(game: GameState, playerId: PlayerID, cardId: CardID): CardID {
  const participant = participantFor(game, playerId);
  const index = participant.battleDrawPlayed.findIndex((candidate) => (
    used(candidate) && candidate.origin === 'battle_draw' && candidate.cardId === cardId
  ));
  if (index < 0) throw new FogOfWarBattleError('That selected Battle Hand card is no longer available to return.');
  const [returned] = participant.battleDrawPlayed.splice(index, 1);
  participant.battleDraw.push(returned.cardId);
  participant.passedBattleDrawPlay = true;
  return returned.cardId;
}

export function resolveFogOfWarBattleChoice(
  game: GameState,
  action: ResolveIntelligenceChoiceAction,
): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'fog_of_war_return' || pending.playerId !== action.playerId) {
    throw new FogOfWarBattleError(`${action.playerId} has no pending Fog of War choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId) {
    throw new FogOfWarBattleError('The Fog of War choice no longer matches the active battle.');
  }

  let returnedCardId: CardID;
  let source: 'hand' | 'battle_hand';
  if (action.choice === 'return_hand') {
    returnedCardId = returnHandCommit(game, action.playerId, pending.handCardId);
    source = 'hand';
  } else if (action.choice === 'return_battle_hand') {
    const selected = action.cardId ?? (pending.battleHandCardIds.length === 1 ? pending.battleHandCardIds[0] : undefined);
    if (!selected || !pending.battleHandCardIds.includes(selected)) {
      throw new FogOfWarBattleError('Choose one eligible selected Battle Hand card to return.');
    }
    returnedCardId = returnBattleHandCard(game, action.playerId, selected);
    source = 'battle_hand';
  } else {
    throw new FogOfWarBattleError('Choose whether to return the hand commitment or a selected Battle Hand card.');
  }

  privateLog(
    game,
    action.playerId,
    'intelligence_fog_of_war_card_returned_private',
    `You returned ${returnedCardId} to its source because of Fog of War.`,
    { cardId: returnedCardId, source },
  );
  publicLog(
    game,
    pending.fogOwnerId,
    'intelligence_fog_of_war_card_returned',
    `${game.players[action.playerId].name} returned one used card to its ${source === 'hand' ? 'hand' : 'Battle Hand'} because of Fog of War.`,
    { playerId: action.playerId, source },
  );

  game.pendingIntelligenceChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}
