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

const OPERATIONAL_REASSESSMENT = 'intelligence-operational-reassessment';
const RESOLVABLE_NEUTRAL_CARDS = new Set<CardID>([
  'card-valor',
  'card-fortifications',
  'card-embargo',
  'card-attrition',
]);
const RESOLVABLE_LATE_INTELLIGENCE_CARDS = new Set<CardID>([
  'intelligence-deep-cover',
  OPERATIONAL_REASSESSMENT,
]);
const REPLACEMENT_PREFIX = 'operational_reassessment_replacement:';

type SourceSlot = 'hand_commit' | 'battle_draw_played';

interface ReassessmentSource {
  participant: BattleParticipantState;
  card: BattlePlayedCard;
  sourceSlot: SourceSlot;
  sourceIndex?: number;
}

export class OperationalReassessmentBattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationalReassessmentBattleError';
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

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new OperationalReassessmentBattleError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new OperationalReassessmentBattleError(`${playerId} is not participating in this battle.`);
}

function unresolvedSource(participant: BattleParticipantState): ReassessmentSource | undefined {
  if (active(participant.handCommit)
    && participant.handCommit.cardId === OPERATIONAL_REASSESSMENT
    && !participant.handCommit.earlyEffectResolved) {
    return {
      participant,
      card: participant.handCommit,
      sourceSlot: 'hand_commit',
    };
  }

  const sourceIndex = participant.battleDrawPlayed.findIndex((card) => (
    active(card)
    && card.cardId === OPERATIONAL_REASSESSMENT
    && !card.earlyEffectResolved
  ));
  if (sourceIndex < 0) return undefined;
  return {
    participant,
    card: participant.battleDrawPlayed[sourceIndex],
    sourceSlot: 'battle_draw_played',
    sourceIndex,
  };
}

function nextUnresolvedOperationalReassessment(game: GameState): ReassessmentSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

function factionBattleEffectCanStillResolve(cardId: CardID): boolean {
  return cardId.startsWith('military-') || cardId.startsWith('financiers-');
}

export function battleEffectCanStillResolve(cardId: CardID): boolean {
  if (!cardCanBePlayedAt(cardId, 'battle_hand_commit', 'hand')) return false;
  return RESOLVABLE_NEUTRAL_CARDS.has(cardId)
    || RESOLVABLE_LATE_INTELLIGENCE_CARDS.has(cardId)
    || factionBattleEffectCanStillResolve(cardId);
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
      sourceSlot: source.sourceSlot,
      sourceIndex: source.sourceIndex,
      eligibleCardIds: [...new Set(eligibleCardIds)],
      options: ['pass', 'select'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.participant.playerId;
    return true;
  }
}

function removeSourceCard(
  participant: BattleParticipantState,
  sourceSlot: SourceSlot,
  sourceIndex?: number,
): BattlePlayedCard {
  if (sourceSlot === 'hand_commit') {
    const source = participant.handCommit;
    if (!active(source)
      || source.cardId !== OPERATIONAL_REASSESSMENT
      || !source.earlyEffectResolved) {
      throw new OperationalReassessmentBattleError('The resolving Operational Reassessment is no longer the hand commitment.');
    }
    participant.handCommit = undefined;
    return source;
  }

  if (sourceIndex === undefined) {
    throw new OperationalReassessmentBattleError('The resolving Operational Reassessment has no Battle-card index.');
  }
  const source = participant.battleDrawPlayed[sourceIndex];
  if (!active(source)
    || source.cardId !== OPERATIONAL_REASSESSMENT
    || !source.earlyEffectResolved) {
    throw new OperationalReassessmentBattleError('The resolving Operational Reassessment is no longer in the expected Battle-card slot.');
  }
  participant.battleDrawPlayed.splice(sourceIndex, 1);
  return source;
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
  const source = removeSourceCard(participant, pending.sourceSlot, pending.sourceIndex);
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
