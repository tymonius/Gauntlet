import { cardCanBePlayedAt } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';
import { markBattleCardsObservedBeforeNormalReveal } from './battle-observation';
import { recordFaceDownCardObservedBeforeReveal } from './intelligence-mission-triggers';

const SPIES_CARD_ID = 'intelligence-spies';

export class IntelligenceSpiesBattleError extends Error {
  constructor(message: string) { super(message); this.name = 'IntelligenceSpiesBattleError'; }
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

function participantCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => active(card));
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new IntelligenceSpiesBattleError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new IntelligenceSpiesBattleError(`${playerId} is not participating in this battle.`);
}

function opposingParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new IntelligenceSpiesBattleError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender : battle.attacker;
}

function nextUnresolvedSpies(game: GameState): { participant: BattleParticipantState; card: BattlePlayedCard } | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  for (const participant of [battle.attacker, battle.defender]) {
    if (active(participant.handCommit)
      && participant.handCommit.cardId === SPIES_CARD_ID
      && !participant.handCommit.earlyEffectResolved) {
      return { participant, card: participant.handCommit };
    }
    const card = participant.battleDrawPlayed.find((candidate) => (
      active(candidate)
      && candidate.cardId === SPIES_CARD_ID
      && !candidate.earlyEffectResolved
    ));
    if (card) return { participant, card };
  }
  return undefined;
}

function eligibleReplacements(participant: BattleParticipantState): CardID[] {
  return participant.battleDraw
    .filter((cardId) => cardCanBePlayedAt(cardId, 'battle_draw_play', 'battle_draw'));
}

function inspectOpposingCards(game: GameState, playerId: PlayerID): CardID[] {
  const opponent = opposingParticipant(game, playerId);
  const inspected = participantCards(opponent).filter((card) => card.faceDown);
  for (const card of inspected) {
    card.visibleTo = [...new Set([...(card.visibleTo ?? []), playerId])];
  }
  const cardIds = inspected.map((card) => card.cardId);
  markBattleCardsObservedBeforeNormalReveal(game, opponent.playerId, cardIds);
  if (cardIds.length > 0 && game.battle) {
    recordFaceDownCardObservedBeforeReveal(game, playerId, game.battle.id, 'Spies');
  }
  return cardIds;
}

export function battleHasUnresolvedSpies(game: GameState, incomingCardId?: CardID): boolean {
  if (incomingCardId === SPIES_CARD_ID) return true;
  return Boolean(nextUnresolvedSpies(game));
}

export function resolveSpiesPreRevealCard(
  game: GameState,
  participant: BattleParticipantState,
  card: BattlePlayedCard,
): boolean {
  const battle = game.battle;
  if (!battle || game.pendingIntelligenceChoice) return false;
  if (!active(card) || card.cardId !== SPIES_CARD_ID || card.earlyEffectResolved) return false;

  card.faceDown = false;
  card.earlyEffectResolved = true;
  const inspectedCards = inspectOpposingCards(game, participant.playerId);
  publicLog(
    game,
    participant.playerId,
    'intelligence_spies_revealed_early',
    `${game.players[participant.playerId].name} revealed Spies before the normal battle reveal.`,
  );
  privateLog(
    game,
    participant.playerId,
    'intelligence_spies_battle_inspection',
    `You inspected ${inspectedCards.length} opposing face-down card${inspectedCards.length === 1 ? '' : 's'} with Spies.`,
    { cards: inspectedCards },
  );

  const currentSelected = participant.battleDrawPlayed.find((candidate) => active(candidate));
  const eligibleCardIds = eligibleReplacements(participant);
  if (!currentSelected || eligibleCardIds.length === 0) return false;

  game.pendingIntelligenceChoice = {
    kind: 'spies_battle_reselect',
    playerId: participant.playerId,
    battleId: battle.id,
    currentSelectedCardId: currentSelected.cardId,
    eligibleCardIds: [...new Set(eligibleCardIds)],
    options: ['pass', 'select'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = participant.playerId;
  return true;
}

export function openNextSpiesBattleWindow(game: GameState): boolean {
  const source = nextUnresolvedSpies(game);
  return source ? resolveSpiesPreRevealCard(game, source.participant, source.card) : false;
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

export function resolveSpiesBattleChoice(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'spies_battle_reselect' || pending.playerId !== action.playerId) {
    throw new IntelligenceSpiesBattleError(`${action.playerId} has no pending Spies Battle choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) throw new IntelligenceSpiesBattleError('The Spies choice no longer matches the active battle.');
  const participant = participantFor(game, action.playerId);

  if (action.choice === 'pass') {
    game.pendingIntelligenceChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    return;
  }
  if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) {
    throw new IntelligenceSpiesBattleError('Choose an eligible replacement from the remaining Battle Hand or pass.');
  }

  const currentIndex = participant.battleDrawPlayed.findIndex((candidate) => (
    active(candidate) && candidate.cardId === pending.currentSelectedCardId
  ));
  if (currentIndex < 0) throw new IntelligenceSpiesBattleError('The currently selected Battle Hand card is no longer in the battle.');
  if (!removeOne(participant.battleDraw, action.cardId)) {
    throw new IntelligenceSpiesBattleError('The replacement card is no longer in the Battle Hand.');
  }

  const [returned] = participant.battleDrawPlayed.splice(currentIndex, 1);
  participant.battleDraw.push(returned.cardId);
  participant.battleDrawPlayed.push({
    cardId: action.cardId,
    owner: action.playerId,
    origin: 'battle_draw',
    faceDown: true,
    canceled: false,
  });
  privateLog(
    game,
    action.playerId,
    'intelligence_spies_battle_reselected',
    `You returned ${returned.cardId} to your Battle Hand and selected ${action.cardId}.`,
    { returnedCardId: returned.cardId, replacementCardId: action.cardId },
  );
  publicLog(
    game,
    action.playerId,
    'intelligence_spies_battle_selection_changed',
    `${game.players[action.playerId].name} changed their face-down Battle Hand selection with Spies.`,
  );
  game.pendingIntelligenceChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}
