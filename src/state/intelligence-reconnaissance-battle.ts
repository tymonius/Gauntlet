import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
} from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';
import { gainFactionResource } from './resources';

const RECONNAISSANCE = 'intelligence-reconnaissance';

type SourceSlot = 'hand_commit' | 'battle_draw_played';

interface ReconnaissanceSource {
  participant: BattleParticipantState;
  card: BattlePlayedCard;
  sourceSlot: SourceSlot;
  sourceIndex?: number;
}

export class ReconnaissanceBattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReconnaissanceBattleError';
  }
}

function publicLog(game: GameState, actor: PlayerID | undefined, type: string, message: string, payload?: unknown): void {
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

function sourceFor(participant: BattleParticipantState): ReconnaissanceSource | undefined {
  if (active(participant.handCommit)
    && participant.handCommit.cardId === RECONNAISSANCE
    && participant.handCommit.earlyEffectResolved
    && !participant.handCommit.postRevealEffectResolved) {
    return { participant, card: participant.handCommit, sourceSlot: 'hand_commit' };
  }
  const sourceIndex = participant.battleDrawPlayed.findIndex((card) => (
    active(card)
    && card.cardId === RECONNAISSANCE
    && card.earlyEffectResolved
    && !card.postRevealEffectResolved
  ));
  if (sourceIndex < 0) return undefined;
  return {
    participant,
    card: participant.battleDrawPlayed[sourceIndex],
    sourceSlot: 'battle_draw_played',
    sourceIndex,
  };
}

function nextReconnaissanceSource(game: GameState): ReconnaissanceSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return sourceFor(battle.attacker) ?? sourceFor(battle.defender);
}

export function resolveReconnaissancePreRevealCard(
  game: GameState,
  participant: BattleParticipantState,
  card: BattlePlayedCard,
): void {
  if (!active(card) || card.cardId !== RECONNAISSANCE || card.earlyEffectResolved) return;
  card.faceDown = false;
  card.earlyEffectResolved = true;
  publicLog(
    game,
    participant.playerId,
    'intelligence_reconnaissance_revealed_early',
    `${game.players[participant.playerId].name} revealed Reconnaissance before the normal battle reveal.`,
  );
}

function battleDirection(game: GameState): number {
  const battle = game.battle;
  if (!battle) throw new ReconnaissanceBattleError('There is no active battle.');
  const location = game.board.spaces.find((space) => space.id === battle.location);
  const origin = game.board.spaces.find((space) => space.id === battle.attackerOrigin);
  if (!location || !origin) throw new ReconnaissanceBattleError('The battle position is invalid.');
  return Math.sign(location.index - origin.index);
}

function defenderWithdrawalDestination(game: GameState): SpaceID | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  const location = game.board.spaces.find((space) => space.id === battle.location);
  if (!location) return undefined;
  const destination = game.board.spaces.find((space) => space.index === location.index + battleDirection(game));
  return destination && !destination.occupant ? destination.id : undefined;
}

export function reconnaissanceWithdrawalAvailable(game: GameState, playerId: PlayerID): boolean {
  const battle = game.battle;
  if (!battle) return false;
  if (battle.attacker.playerId === playerId) return true;
  if (battle.defender.playerId === playerId) return Boolean(defenderWithdrawalDestination(game));
  return false;
}

export function openNextReconnaissanceBattleWindow(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice' || game.pendingIntelligenceChoice) return false;
  const source = nextReconnaissanceSource(game);
  if (!source) return false;

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

function isSourceCard(
  participant: BattleParticipantState,
  playerId: PlayerID,
  sourceSlot: SourceSlot,
  sourceIndex: number | undefined,
  candidateSlot: SourceSlot,
  candidateIndex?: number,
): boolean {
  return participant.playerId === playerId
    && sourceSlot === candidateSlot
    && (candidateSlot === 'hand_commit' || sourceIndex === candidateIndex);
}

function settleRefusedTermsWithoutWinner(game: GameState): void {
  for (const player of Object.values(game.players)) {
    const terms = player.diplomats?.activeTerms;
    if (!terms || terms.response !== 'refused') continue;
    if (terms.stake > 0) gainFactionResource(game, player.id, 'influence', terms.stake, 'Return Stake after Reconnaissance withdrawal');
    player.diplomats!.activeTerms = undefined;
  }
}

function returnOtherCardsAndCleanBattleHands(
  game: GameState,
  sourcePlayerId: PlayerID,
  sourceSlot: SourceSlot,
  sourceIndex?: number,
): void {
  const battle = game.battle!;
  for (const participant of [battle.attacker, battle.defender]) {
    const player = game.players[participant.playerId];
    if (participant.handCommit) {
      if (isSourceCard(participant, sourcePlayerId, sourceSlot, sourceIndex, 'hand_commit')) {
        player.zones.graveyard.push(participant.handCommit.cardId);
      } else {
        player.zones.hand.push(participant.handCommit.cardId);
      }
      participant.handCommit = undefined;
    }

    for (let index = 0; index < participant.battleDrawPlayed.length; index += 1) {
      const card = participant.battleDrawPlayed[index];
      if (isSourceCard(participant, sourcePlayerId, sourceSlot, sourceIndex, 'battle_draw_played', index)) {
        player.zones.discard.push(card.cardId);
      } else {
        participant.battleDraw.push(card.cardId);
      }
    }
    participant.battleDrawPlayed = [];
    player.zones.discard.push(...participant.battleDraw);
    participant.battleDraw = [];
  }
}

function moveDefenderOutAndAttackerIn(game: GameState): void {
  const battle = game.battle!;
  const destinationId = defenderWithdrawalDestination(game);
  if (!destinationId) throw new ReconnaissanceBattleError('The defender has no legal withdrawal position.');
  const destination = game.board.spaces.find((space) => space.id === destinationId)!;
  const location = game.board.spaces.find((space) => space.id === battle.location)!;
  const origin = game.board.spaces.find((space) => space.id === battle.attackerOrigin)!;

  location.occupant = undefined;
  destination.occupant = battle.defender.playerId;
  game.players[battle.defender.playerId].occupiedSpaceId = destination.id;
  origin.occupant = undefined;
  location.occupant = battle.attacker.playerId;
  game.players[battle.attacker.playerId].occupiedSpaceId = location.id;
}

function clearBattleWindows(game: GameState): void {
  game.pendingIntelligenceChoice = undefined;
  game.pendingMilitaryChoice = undefined;
  game.militaryChoiceQueue = undefined;
  game.pendingMilitaryTimingChoice = undefined;
  game.militaryTimingChoiceQueue = undefined;
  game.pendingDiplomatChoice = undefined;
  game.pendingFinancierChoice = undefined;
  game.financierChoiceQueue = undefined;
  game.pendingLeaderAbilityWindow = undefined;
}

function endBattleWithoutWinner(
  game: GameState,
  playerId: PlayerID,
  sourceSlot: SourceSlot,
  sourceIndex?: number,
): void {
  const battle = game.battle;
  if (!battle) throw new ReconnaissanceBattleError('There is no active battle.');
  const wasDefender = battle.defender.playerId === playerId;

  if (wasDefender) moveDefenderOutAndAttackerIn(game);
  returnOtherCardsAndCleanBattleHands(game, playerId, sourceSlot, sourceIndex);
  settleRefusedTermsWithoutWinner(game);
  clearBattleWindows(game);
  game.battle = undefined;
  game.phase = 'action_after_movement';
  game.priorityPlayer = game.activePlayer;
  publicLog(
    game,
    playerId,
    'intelligence_reconnaissance_battle_withdrawal',
    `${game.players[playerId].name} withdrew with Reconnaissance; the battle ended without a winner.`,
    { playerId, wasDefender },
  );
}

export function resolveReconnaissanceBattleChoice(
  game: GameState,
  action: ResolveIntelligenceChoiceAction,
): 'stay' | 'withdraw' {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'reconnaissance_battle_withdraw' || pending.playerId !== action.playerId) {
    throw new ReconnaissanceBattleError(`${action.playerId} has no pending Reconnaissance Battle choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId) {
    throw new ReconnaissanceBattleError('The Reconnaissance choice no longer matches the active battle.');
  }

  if (action.choice === 'stay') {
    game.pendingIntelligenceChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    return 'stay';
  }
  if (action.choice !== 'withdraw' || !pending.canWithdraw) {
    throw new ReconnaissanceBattleError('Reconnaissance cannot withdraw from this position.');
  }

  endBattleWithoutWinner(game, action.playerId, pending.sourceSlot, pending.sourceIndex);
  return 'withdraw';
}
