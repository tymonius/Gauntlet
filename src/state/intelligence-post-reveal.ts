import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameState,
} from '../types';
import { battleEffectCanStillResolve } from './intelligence-operational-reassessment-battle';
import { reconnaissanceWithdrawalAvailable } from './intelligence-reconnaissance-battle';
import {
  applySubversionRestrictionForPlayer,
  SUBVERSION_BATTLE_CARD,
} from './intelligence-subversion-battle';
import {
  openTreasonWindow,
  TREASON,
  unresolvedTreasonAssetSource,
  type TreasonAssetSource,
} from './intelligence-treason';

const POST_REVEAL_CARDS = {
  reconnaissance: 'intelligence-reconnaissance',
  operationalReassessment: 'intelligence-operational-reassessment',
} as const;

const LATE_REPLACEMENT_CARDS = new Set<CardID>([
  SUBVERSION_BATTLE_CARD,
  TREASON,
]);

type SourceSlot = 'hand_commit' | 'battle_draw_played';
type PostRevealKind = 'reconnaissance' | 'operational_reassessment' | 'treason' | 'subversion';

interface PhysicalPostRevealSource {
  kind: PostRevealKind;
  participant: BattleParticipantState;
  card: BattlePlayedCard;
  sourceSlot: SourceSlot;
  sourceIndex?: number;
}

type PostRevealSource = PhysicalPostRevealSource | TreasonAssetSource;

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function sourceKind(card: BattlePlayedCard): PostRevealKind | undefined {
  if (card.cardId === POST_REVEAL_CARDS.reconnaissance
    && card.earlyEffectResolved
    && !card.postRevealEffectResolved) return 'reconnaissance';
  if (card.cardId === POST_REVEAL_CARDS.operationalReassessment
    && !card.earlyEffectResolved) return 'operational_reassessment';
  if (card.cardId === TREASON && !card.postRevealEffectResolved) return 'treason';
  if (card.cardId === SUBVERSION_BATTLE_CARD && !card.postRevealEffectResolved) return 'subversion';
  return undefined;
}

function unresolvedPhysicalSource(participant: BattleParticipantState): PhysicalPostRevealSource | undefined {
  if (active(participant.handCommit)) {
    const kind = sourceKind(participant.handCommit);
    if (kind) {
      return {
        kind,
        participant,
        card: participant.handCommit,
        sourceSlot: 'hand_commit',
      };
    }
  }

  for (let sourceIndex = 0; sourceIndex < participant.battleDrawPlayed.length; sourceIndex += 1) {
    const card = participant.battleDrawPlayed[sourceIndex];
    if (!active(card)) continue;
    const kind = sourceKind(card);
    if (!kind) continue;
    return {
      kind,
      participant,
      card,
      sourceSlot: 'battle_draw_played',
      sourceIndex,
    };
  }
  return undefined;
}

function nextSourceForParticipant(game: GameState, participant: BattleParticipantState): PostRevealSource | undefined {
  return unresolvedPhysicalSource(participant)
    ?? unresolvedTreasonAssetSource(game, participant.playerId);
}

function nextSource(game: GameState): PostRevealSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return nextSourceForParticipant(game, battle.attacker)
    ?? nextSourceForParticipant(game, battle.defender);
}

function operationalReassessmentOptions(game: GameState, playerId: string): CardID[] {
  return game.players[playerId].zones.hand.filter((cardId) => (
    battleEffectCanStillResolve(cardId) || LATE_REPLACEMENT_CARDS.has(cardId)
  ));
}

function openReconnaissance(game: GameState, source: PhysicalPostRevealSource): boolean {
  const battle = game.battle!;
  source.card.postRevealEffectResolved = true;
  const canWithdraw = reconnaissanceWithdrawalAvailable(game, source.participant.playerId);
  game.pendingIntelligenceChoice = {
    kind: 'reconnaissance_battle_withdraw',
    playerId: source.participant.playerId,
    battleId: battle.id,
    sourceSlot: source.sourceSlot,
    sourceIndex: source.sourceIndex,
    canWithdraw,
    options: canWithdraw ? ['stay', 'withdraw'] : ['stay'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = source.participant.playerId;
  return true;
}

function openOperationalReassessment(game: GameState, source: PhysicalPostRevealSource): boolean {
  const battle = game.battle!;
  source.card.earlyEffectResolved = true;
  const eligibleCardIds = operationalReassessmentOptions(game, source.participant.playerId);
  if (eligibleCardIds.length === 0) return false;
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

function resolveSubversion(game: GameState, source: PhysicalPostRevealSource): void {
  source.card.postRevealEffectResolved = true;
  applySubversionRestrictionForPlayer(game, source.participant.playerId);
}

export function openNextIntelligencePostRevealWindow(game: GameState): boolean {
  if (!game.battle || game.battle.stage !== 'dice' || game.pendingIntelligenceChoice) return false;
  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    if (source.kind === 'asset') {
      if (openTreasonWindow(game, source)) return true;
      continue;
    }
    if (source.kind === 'reconnaissance') return openReconnaissance(game, source);
    if (source.kind === 'operational_reassessment') {
      if (openOperationalReassessment(game, source)) return true;
      continue;
    }
    if (source.kind === 'treason') {
      if (openTreasonWindow(game, {
        kind: 'battle_card',
        playerId: source.participant.playerId,
        card: source.card,
        sourceSlot: source.sourceSlot,
        sourceIndex: source.sourceIndex,
      })) return true;
      continue;
    }
    resolveSubversion(game, source);
  }
}
