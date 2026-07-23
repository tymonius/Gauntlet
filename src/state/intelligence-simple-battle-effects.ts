import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import { markBattleCardsObservedBeforeNormalReveal, wasBattleCardObservedBeforeNormalReveal } from './battle-observation';

export const SIMPLE_INTELLIGENCE_BATTLE_CARDS = {
  disinformation: 'intelligence-disinformation',
  deepCover: 'intelligence-deep-cover',
  assassins: 'intelligence-assassins',
} as const;

const RESOLUTION_KEY = 'intelligence_simple_reveal_effects';

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

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function playedCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => active(card));
}

function hasActiveCard(participant: BattleParticipantState, cardId: string): boolean {
  return playedCards(participant).some((card) => card.cardId === cardId);
}

function opposingParticipant(game: GameState, participant: BattleParticipantState): BattleParticipantState {
  const battle = game.battle!;
  return participant.playerId === battle.attacker.playerId ? battle.defender : battle.attacker;
}

function resolveAssassins(game: GameState, participant: BattleParticipantState): void {
  if (!hasActiveCard(participant, SIMPLE_INTELLIGENCE_BATTLE_CARDS.assassins)) return;
  const opponent = opposingParticipant(game, participant);
  if (active(opponent.handCommit)) {
    opponent.handCommit.faceDown = false;
    opponent.handCommit.negated = true;
    markBattleCardsObservedBeforeNormalReveal(game, opponent.playerId, [opponent.handCommit.cardId]);
    publicLog(
      game,
      participant.playerId,
      'intelligence_assassins_negated_hand_commitment',
      `${game.players[participant.playerId].name} revealed and negated ${opponent.handCommit.cardId} with Assassins.`,
      { targetOwner: opponent.playerId, targetCardId: opponent.handCommit.cardId },
    );
  } else {
    opponent.disadvantage = (opponent.disadvantage ?? 0) + 1;
    publicLog(
      game,
      participant.playerId,
      'intelligence_assassins_disadvantage',
      `${game.players[participant.playerId].name} gave ${game.players[opponent.playerId].name} disadvantage with Assassins.`,
      { targetPlayerId: opponent.playerId },
    );
  }
}

function resolveDisinformation(game: GameState, participant: BattleParticipantState): void {
  const card = participant.handCommit;
  if (!active(card) || card.cardId !== SIMPLE_INTELLIGENCE_BATTLE_CARDS.disinformation) return;
  const opponent = opposingParticipant(game, participant);
  if (!opponent.handCommit) return;
  participant.advantage = (participant.advantage ?? 0) + 1;
  publicLog(
    game,
    participant.playerId,
    'intelligence_disinformation_advantage',
    `${game.players[participant.playerId].name} gained advantage with Disinformation.`,
  );
}

function resolveDeepCover(game: GameState, participant: BattleParticipantState): void {
  if (!hasActiveCard(participant, SIMPLE_INTELLIGENCE_BATTLE_CARDS.deepCover)) return;
  const observed = playedCards(participant).some((card) => (
    wasBattleCardObservedBeforeNormalReveal(game, participant.playerId, card.cardId)
  ));
  if (!observed) return;
  participant.advantage = (participant.advantage ?? 0) + 1;
  publicLog(
    game,
    participant.playerId,
    'intelligence_deep_cover_advantage',
    `${game.players[participant.playerId].name} gained advantage with Deep Cover.`,
  );
}

export function resolveSimpleIntelligenceRevealEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle || battle.effectsResolved.includes(RESOLUTION_KEY)) return;

  const ordered = [battle.attacker, battle.defender];
  for (const participant of ordered) {
    resolveAssassins(game, participant);
    resolveDisinformation(game, participant);
  }
  for (const participant of ordered) resolveDeepCover(game, participant);
  battle.effectsResolved.push(RESOLUTION_KEY);
}

export function disinformationReturnOwners(game: GameState): PlayerID[] {
  const battle = game.battle;
  if (!battle) return [];
  return [battle.attacker, battle.defender]
    .filter((participant) => (
      active(participant.handCommit)
      && participant.handCommit.cardId === SIMPLE_INTELLIGENCE_BATTLE_CARDS.disinformation
    ))
    .map((participant) => participant.playerId);
}

export function returnDisinformationFromGraveyard(game: GameState, playerIds: PlayerID[]): void {
  for (const playerId of playerIds) {
    const player = game.players[playerId];
    const index = player.zones.graveyard.lastIndexOf(SIMPLE_INTELLIGENCE_BATTLE_CARDS.disinformation);
    if (index < 0) continue;
    player.zones.graveyard.splice(index, 1);
    player.zones.hand.push(SIMPLE_INTELLIGENCE_BATTLE_CARDS.disinformation);
    publicLog(
      game,
      playerId,
      'intelligence_disinformation_returned',
      `${player.name} returned Disinformation to hand during battle cleanup.`,
    );
  }
}
