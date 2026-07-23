import {
  cardCanBePlayedAt,
  diplomatCardDefinitions,
  financierCardDefinitions,
  militaryCardDefinitions,
} from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';

const OPERATIONAL_REASSESSMENT = 'intelligence-operational-reassessment';
const NEUTRAL_RESOLVABLE_BATTLE_CARDS = new Set<CardID>([
  'card-valor',
  'card-fortifications',
  'card-embargo',
  'card-attrition',
]);
const LATE_INTELLIGENCE_BATTLE_CARDS = new Set<CardID>([
  'intelligence-deep-cover',
  OPERATIONAL_REASSESSMENT,
]);
const IMPLEMENTED_FACTION_BATTLE_CARDS = new Set<CardID>([
  ...militaryCardDefinitions.map((card) => card.id),
  ...diplomatCardDefinitions.map((card) => card.id),
  ...financierCardDefinitions.map((card) => card.id),
]);
const REPLACEMENT_PREFIX = 'operational_reassessment_replacement:';

export class OperationalReassessmentBattleError extends Error {
  constructor(message: string) { super(message); this.name = 'OperationalReassessmentBattleError'; }
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
  if (!battle) throw new OperationalReassessmentBattleError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new OperationalReassessmentBattleError(`${playerId} is not participating in this battle.`);
}

function nextUnresolvedOperationalReassessment(
  game: GameState,
): { participant: BattleParticipantState; card: BattlePlayedCard } | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  for (const participant of [battle.attacker, battle.defender]) {
    const card = participantCards(participant).find((candidate) => (
      candidate.cardId === OPERATIONAL_REASSESSMENT && !candidate.earlyEffectResolved
    ));
    if (card) return { participant, card };
  }
  return undefined;
}

export function battleEffectCanStillResolve(cardId: CardID): boolean {
  if (!cardCanBePlayedAt(cardId, 'battle_hand_commit', 'hand')) return false;
  return NEUTRAL_RESOLVABLE_BATTLE_CARDS.has(cardId)
    || IMPLEMENTED_FACTION_BATTLE_CARDS.has(cardId)
    || LATE_INTELLIGENCE_BATTLE_CARDS.has(cardId);
}

function eligibleReplacementCards(game: GameState, playerId: PlayerID): CardID[] {
  return game.players[playerId].zones.hand.filter((cardId) => battleEffectCanStillResolve(cardId));
}

export function openNextOperationalReassessmentBattleWindow(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice' || game.pendingIntelligenceChoice) return false;

  while (true) {
    const source = nextUnresolvedOperationalReassessment(game);
    if (!source) return false;
    source.card.earlyEffectResolved = true;
    const eligibleCardIds = eligibleReplacementCards(game, source.participant.playerId);
    if (eligibleCardIds.length === 0) continue;

    game.pendingIntelligenceChoice = {
      kind: 'operational_reassessment_battle',
      playerId: source.participant.playerId,
      battleId: battle.id,
      eligibleCardIds: [...new Set(eligibleCardIds)],
      options: ['pass', 'select'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.participant.playerId;
    return true;
  }
}

function removeSourceCard(participant: BattleParticipantState): BattlePlayedCard {
  if (active(participant.handCommit)
    && participant.handCommit.cardId === OPERATIONAL_REASSESSMENT
    && participant.handCommit.earlyEffectResolved) {
    const source = participant.handCommit;
    participant.handCommit = undefined;
    return source;
  }
  const index = participant.battleDrawPlayed.findIndex((card) => (
    active(card) && card.cardId === OPERATIONAL_REASSESSMENT && card.earlyEffectResolved
  ));
  if (index < 0) throw new OperationalReassessmentBattleError('The resolving Operational Reassessment is no longer in the battle.');
  return participant.battleDrawPlayed.splice(index, 1)[0];
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

export function resolveOperationalReassessmentBattleChoice(
  game: GameState,
  action: ResolveIntelligenceChoiceAction,
): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'operational_reassessment_battle' || pending.playerId !== action.playerId) {
    throw new OperationalReassessmentBattleError(`${action.playerId} has no pending Operational Reassessment Battle choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) {
    throw new OperationalReassessmentBattleError('The Operational Reassessment choice no longer matches the active battle.');
  }

  if (action.choice === 'pass') {
    game.pendingIntelligenceChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    return;
  }
  if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) {
    throw new OperationalReassessmentBattleError('Choose a replacement card whose Battle effect can still resolve or pass.');
  }

  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) {
    throw new OperationalReassessmentBattleError('The replacement card is no longer in hand.');
  }
  const participant = participantFor(game, action.playerId);
  const source = removeSourceCard(participant);
  player.zones.graveyard.push(source.cardId);
  participant.battleDrawPlayed.push({
    cardId: action.cardId,
    owner: action.playerId,
    origin: 'replayed',
    faceDown: false,
    canceled: false,
  });
  battle.effectsResolved.push(`${REPLACEMENT_PREFIX}${action.playerId}:${action.cardId}`);

  privateLog(
    game,
    action.playerId,
    'intelligence_operational_reassessment_battle_replaced',
    `You replaced Operational Reassessment with ${action.cardId}.`,
    { replacementCardId: action.cardId },
  );
  publicLog(
    game,
    action.playerId,
    'intelligence_operational_reassessment_battle_used',
    `${player.name} put Operational Reassessment in the Graveyard and revealed ${action.cardId} from hand as its replacement.`,
    { replacementCardId: action.cardId },
  );
  game.pendingIntelligenceChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}

export function operationalReassessmentReplacementCards(
  game: GameState,
): Array<{ playerId: PlayerID; cardId: CardID }> {
  const effects = game.battle?.effectsResolved ?? [];
  return effects
    .filter((entry) => entry.startsWith(REPLACEMENT_PREFIX))
    .map((entry) => {
      const [, playerId, cardId] = entry.split(':');
      return { playerId, cardId };
    });
}

export function moveOperationalReassessmentReplacementsToGraveyard(
  game: GameState,
  replacements: Array<{ playerId: PlayerID; cardId: CardID }>,
): void {
  for (const replacement of replacements) {
    const player = game.players[replacement.playerId];
    const index = player.zones.discard.lastIndexOf(replacement.cardId);
    if (index < 0) continue;
    player.zones.discard.splice(index, 1);
    player.zones.graveyard.push(replacement.cardId);
    publicLog(
      game,
      replacement.playerId,
      'intelligence_operational_reassessment_replacement_graveyard',
      `${player.name}'s Operational Reassessment replacement went to the Graveyard during cleanup.`,
      { cardId: replacement.cardId },
    );
  }
}
