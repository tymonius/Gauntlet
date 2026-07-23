import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameState,
} from '../types';
import { battleEffectCanStillResolve } from './intelligence-operational-reassessment-battle';
import { reconnaissanceWithdrawalAvailable } from './intelligence-reconnaissance-battle';

const POST_REVEAL_CARDS = {
  reconnaissance: 'intelligence-reconnaissance',
  operationalReassessment: 'intelligence-operational-reassessment',
} as const;

type SourceSlot = 'hand_commit' | 'battle_draw_played';

type PostRevealKind = 'reconnaissance' | 'operational_reassessment';

interface PostRevealSource {
  kind: PostRevealKind;
  participant: BattleParticipantState;
  card: BattlePlayedCard;
  sourceSlot: SourceSlot;
  sourceIndex?: number;
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function sourceKind(card: BattlePlayedCard): PostRevealKind | undefined {
  if (card.cardId === POST_REVEAL_CARDS.reconnaissance
    && card.earlyEffectResolved
    && !card.postRevealEffectResolved) return 'reconnaissance';
  if (card.cardId === POST_REVEAL_CARDS.operationalReassessment
    && !card.earlyEffectResolved) return 'operational_reassessment';
  return undefined;
}

function unresolvedSource(participant: BattleParticipantState): PostRevealSource | undefined {
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

function nextSource(game: GameState): PostRevealSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

function operationalReassessmentOptions(game: GameState, playerId: string): CardID[] {
  return game.players[playerId].zones.hand.filter((cardId) => battleEffectCanStillResolve(cardId));
}

function openReconnaissance(game: GameState, source: PostRevealSource): boolean {
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

function openOperationalReassessment(game: GameState, source: PostRevealSource): boolean {
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

export function openNextIntelligencePostRevealWindow(game: GameState): boolean {
  if (!game.battle || game.battle.stage !== 'dice' || game.pendingIntelligenceChoice) return false;
  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    if (source.kind === 'reconnaissance') return openReconnaissance(game, source);
    if (openOperationalReassessment(game, source)) return true;
  }
}
