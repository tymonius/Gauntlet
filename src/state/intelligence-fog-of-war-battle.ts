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
const SPIES = 'intelligence-spies';

type EarlyEffectKind = 'fog_of_war' | 'spies';

interface EarlyEffectSource {
  kind: EarlyEffectKind;
  participant: BattleParticipantState;
  card: BattlePlayedCard;
}

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

function effectKind(cardId: CardID): EarlyEffectKind | undefined {
  if (cardId === FOG_OF_WAR) return 'fog_of_war';
  if (cardId === SPIES) return 'spies';
  return undefined;
}

function unresolvedSource(participant: BattleParticipantState): EarlyEffectSource | undefined {
  if (active(participant.handCommit) && !participant.handCommit.earlyEffectResolved) {
    const kind = effectKind(participant.handCommit.cardId);
    if (kind) return { kind, participant, card: participant.handCommit };
  }
  for (const card of participant.battleDrawPlayed) {
    if (!active(card) || card.earlyEffectResolved) continue;
    const kind = effectKind(card.cardId);
    if (kind) return { kind, participant, card };
  }
  return undefined;
}

function nextEarlyEffect(game: GameState): EarlyEffectSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

function opponentParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new FogOfWarBattleError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender : battle.attacker;
}

function selectedBattleHandCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return participant.battleDrawPlayed.filter((card) => active(card) && card.origin === 'battle_draw');
}

export function battleHasUnresolvedFogOfWar(game: GameState, incomingCardId?: CardID): boolean {
  if (incomingCardId === FOG_OF_WAR) return true;
  const battle = game.battle;
  if (!battle) return false;
  return [battle.attacker, battle.defender].some((participant) => (
    (active(participant.handCommit)
      && participant.handCommit.cardId === FOG_OF_WAR
      && !participant.handCommit.earlyEffectResolved)
    || participant.battleDrawPlayed.some((card) => (
      active(card) && card.cardId === FOG_OF_WAR && !card.earlyEffectResolved
    ))
  ));
}

export function openNextFogOfWarBattleWindow(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'normal_reveal' || game.pendingIntelligenceChoice) return false;

  while (true) {
    const source = nextEarlyEffect(game);
    if (!source || source.kind !== 'fog_of_war') return false;

    source.card.faceDown = false;
    source.card.earlyEffectResolved = true;
    publicLog(
      game,
      source.participant.playerId,
      'intelligence_fog_of_war_revealed_early',
      `${game.players[source.participant.playerId].name} revealed Fog of War before the normal battle reveal.`,
    );

    const opponent = opponentParticipant(game, source.participant.playerId);
    const handCommit = active(opponent.handCommit) ? opponent.handCommit : undefined;
    const battleHandCards = selectedBattleHandCards(opponent);
    if (!handCommit || battleHandCards.length === 0) continue;

    game.pendingIntelligenceChoice = {
      kind: 'fog_of_war_return',
      playerId: opponent.playerId,
      fogOwnerId: source.participant.playerId,
      battleId: battle.id,
      handCardId: handCommit.cardId,
      battleHandCardIds: battleHandCards.map((card) => card.cardId),
      options: ['return_hand', 'return_battle_hand'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = opponent.playerId;
    return true;
  }
}

function returnHandCommit(game: GameState, playerId: PlayerID, expectedCardId: CardID): CardID {
  const participant = opponentParticipant(game, game.pendingIntelligenceChoice?.kind === 'fog_of_war_return'
    ? game.pendingIntelligenceChoice.fogOwnerId
    : playerId);
  const card = participant.handCommit;
  if (!active(card) || card.cardId !== expectedCardId) {
    throw new FogOfWarBattleError('The opposing hand commitment is no longer available to return.');
  }
  participant.handCommit = undefined;
  participant.passedHandCommit = true;
  game.players[playerId].zones.hand.push(card.cardId);
  return card.cardId;
}

function returnBattleHandCard(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
): CardID {
  const participant = opponentParticipant(game, game.pendingIntelligenceChoice?.kind === 'fog_of_war_return'
    ? game.pendingIntelligenceChoice.fogOwnerId
    : playerId);
  const index = participant.battleDrawPlayed.findIndex((card) => (
    active(card) && card.origin === 'battle_draw' && card.cardId === cardId
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
