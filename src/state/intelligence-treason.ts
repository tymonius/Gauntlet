import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
  TreasonTargetOption,
} from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';
import { wasBattleCardObservedBeforeNormalReveal } from './battle-observation';
import { reconnaissanceWithdrawalAvailable } from './intelligence-reconnaissance-battle';
import {
  applyCopiedSubversionRestriction,
  bankedAssetUseAllowed,
  subversionRestrictionResolved,
} from './intelligence-subversion-battle';
import { gainFactionResource } from './resources';

export const TREASON = 'intelligence-treason';
export const TREASON_COPY_PREFIX = 'treason_copy:';
const ASSET_INITIAL_PREFIX = 'treason_asset_initial:';
const ASSET_PROCESSED_PREFIX = 'treason_asset_processed:';

type SourceSlot = 'hand_commit' | 'battle_draw_played';

export interface TreasonBattleSource {
  kind: 'battle_card';
  playerId: PlayerID;
  card: BattlePlayedCard;
  sourceSlot: SourceSlot;
  sourceIndex?: number;
}

export interface TreasonAssetSource {
  kind: 'asset';
  playerId: PlayerID;
}

export type TreasonSource = TreasonBattleSource | TreasonAssetSource;

export class TreasonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TreasonError';
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

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new TreasonError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new TreasonError(`${playerId} is not participating in this battle.`);
}

function opponentFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new TreasonError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender : battle.attacker;
}

function targetCard(option: TreasonTargetOption, participant: BattleParticipantState): BattlePlayedCard | undefined {
  if (option.targetKey === 'hand_commit') return participant.handCommit;
  const index = Number(option.targetKey.split(':')[1]);
  return participant.battleDrawPlayed[index];
}

function ownCardWasObserved(game: GameState, playerId: PlayerID): boolean {
  const participant = participantFor(game, playerId);
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => Boolean(card))
    .some((card) => wasBattleCardObservedBeforeNormalReveal(game, playerId, card.cardId));
}

function copiedEffectCanResolve(
  game: GameState,
  playerId: PlayerID,
  target: BattlePlayedCard,
): boolean {
  const battle = game.battle;
  if (!battle || !active(target)) return false;
  switch (target.cardId) {
    case 'card-valor':
    case 'card-attrition':
    case 'intelligence-exfiltration':
      return true;
    case 'card-fortifications':
      return battle.defender.playerId === playerId;
    case 'intelligence-deep-cover':
      return ownCardWasObserved(game, playerId);
    case 'intelligence-reconnaissance':
      return !target.postRevealEffectResolved && reconnaissanceWithdrawalAvailable(game, playerId);
    case 'intelligence-subversion':
      return !subversionRestrictionResolved(game, target.owner);
    default:
      return false;
  }
}

export function treasonTargetOptions(game: GameState, playerId: PlayerID): TreasonTargetOption[] {
  const opponent = opponentFor(game, playerId);
  const options: TreasonTargetOption[] = [];
  if (active(opponent.handCommit) && copiedEffectCanResolve(game, playerId, opponent.handCommit)) {
    options.push({
      targetKey: 'hand_commit',
      cardId: opponent.handCommit.cardId,
      targetOwner: opponent.playerId,
      targetOrigin: opponent.handCommit.origin,
    });
  }
  for (let index = 0; index < opponent.battleDrawPlayed.length; index += 1) {
    const card = opponent.battleDrawPlayed[index];
    if (!active(card) || !copiedEffectCanResolve(game, playerId, card)) continue;
    options.push({
      targetKey: `battle_draw_played:${index}`,
      cardId: card.cardId,
      targetOwner: opponent.playerId,
      targetOrigin: card.origin,
    });
  }
  return options;
}

export function resolveTreasonPreRevealCard(
  game: GameState,
  participant: BattleParticipantState,
  card: BattlePlayedCard,
): void {
  if (!active(card) || card.cardId !== TREASON || card.earlyEffectResolved) return;
  card.faceDown = false;
  card.earlyEffectResolved = true;
  publicLog(
    game,
    participant.playerId,
    'intelligence_treason_revealed_early',
    `${game.players[participant.playerId].name} revealed Treason before the normal battle reveal.`,
  );
}

export function unresolvedTreasonBattleSource(participant: BattleParticipantState): TreasonBattleSource | undefined {
  if (active(participant.handCommit)
    && participant.handCommit.cardId === TREASON
    && participant.handCommit.earlyEffectResolved
    && !participant.handCommit.postRevealEffectResolved) {
    return {
      kind: 'battle_card',
      playerId: participant.playerId,
      card: participant.handCommit,
      sourceSlot: 'hand_commit',
    };
  }
  const sourceIndex = participant.battleDrawPlayed.findIndex((card) => (
    active(card)
    && card.cardId === TREASON
    && card.earlyEffectResolved
    && !card.postRevealEffectResolved
  ));
  if (sourceIndex < 0) return undefined;
  return {
    kind: 'battle_card',
    playerId: participant.playerId,
    card: participant.battleDrawPlayed[sourceIndex],
    sourceSlot: 'battle_draw_played',
    sourceIndex,
  };
}

function assetInitialCount(game: GameState, playerId: PlayerID): number {
  const battle = game.battle!;
  const prefix = `${ASSET_INITIAL_PREFIX}${playerId}:`;
  const existing = battle.effectsResolved.find((entry) => entry.startsWith(prefix));
  if (existing) return Number(existing.slice(prefix.length));
  const count = game.players[playerId].zones.assetBank.filter((cardId) => cardId === TREASON).length;
  battle.effectsResolved.push(`${prefix}${count}`);
  return count;
}

function assetProcessedCount(game: GameState, playerId: PlayerID): number {
  return game.battle!.effectsResolved.filter((entry) => entry === `${ASSET_PROCESSED_PREFIX}${playerId}`).length;
}

export function unresolvedTreasonAssetSource(game: GameState, playerId: PlayerID): TreasonAssetSource | undefined {
  if (!game.battle || !bankedAssetUseAllowed(game, playerId)) return undefined;
  return assetProcessedCount(game, playerId) < assetInitialCount(game, playerId)
    ? { kind: 'asset', playerId }
    : undefined;
}

export function openTreasonWindow(game: GameState, source: TreasonSource): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice' || game.pendingIntelligenceChoice) return false;
  const targetOptions = treasonTargetOptions(game, source.playerId);
  if (source.kind === 'battle_card') source.card.postRevealEffectResolved = true;
  else battle.effectsResolved.push(`${ASSET_PROCESSED_PREFIX}${source.playerId}`);

  if (targetOptions.length === 0) {
    if (source.kind === 'battle_card') {
      publicLog(game, source.playerId, 'intelligence_treason_no_target', `${game.players[source.playerId].name}'s Treason had no eligible opposing Battle effect.`);
    }
    return false;
  }

  game.pendingIntelligenceChoice = {
    kind: 'treason_battle_target',
    playerId: source.playerId,
    battleId: battle.id,
    sourceKind: source.kind,
    sourceSlot: source.kind === 'battle_card' ? source.sourceSlot : undefined,
    sourceIndex: source.kind === 'battle_card' ? source.sourceIndex : undefined,
    targetOptions,
    options: source.kind === 'asset' ? ['pass', 'select'] : ['select'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = source.playerId;
  return true;
}

function addCopyMarker(game: GameState, playerId: PlayerID, cardId: CardID): void {
  game.battle!.effectsResolved.push(`${TREASON_COPY_PREFIX}${playerId}:${cardId}`);
}

export function treasonCopyCount(game: GameState, playerId: PlayerID, cardId: CardID): number {
  return game.battle?.effectsResolved.filter((entry) => entry === `${TREASON_COPY_PREFIX}${playerId}:${cardId}`).length ?? 0;
}

function resolveCopiedEffect(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  sourceSlot?: SourceSlot,
  sourceIndex?: number,
): void {
  const participant = participantFor(game, playerId);
  addCopyMarker(game, playerId, cardId);
  switch (cardId) {
    case 'card-valor':
      participant.modifiers += 2;
      break;
    case 'card-fortifications':
      participant.modifiers += 1;
      break;
    case 'intelligence-deep-cover':
      participant.advantage = (participant.advantage ?? 0) + 1;
      break;
    case 'intelligence-subversion':
      applyCopiedSubversionRestriction(game, playerId);
      break;
    case 'intelligence-reconnaissance': {
      const canWithdraw = reconnaissanceWithdrawalAvailable(game, playerId);
      game.pendingIntelligenceChoice = {
        kind: 'treason_reconnaissance_withdraw',
        playerId,
        battleId: game.battle!.id,
        sourceSlot,
        sourceIndex,
        canWithdraw,
        options: canWithdraw ? ['stay', 'withdraw'] : ['stay'],
        resumePriorityPlayer: game.priorityPlayer,
      };
      game.priorityPlayer = playerId;
      break;
    }
  }
}

function consumeAsset(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  const index = player.zones.assetBank.indexOf(TREASON);
  if (index < 0) throw new TreasonError('Treason is no longer banked.');
  player.zones.assetBank.splice(index, 1);
  player.zones.discard.push(TREASON);
}

export function resolveTreasonChoice(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'treason_battle_target' || pending.playerId !== action.playerId) {
    throw new TreasonError(`${action.playerId} has no pending Treason target choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId) throw new TreasonError('The Treason battle is no longer active.');

  if (action.choice === 'pass') {
    if (pending.sourceKind !== 'asset') throw new TreasonError('A Treason Battle effect must choose an eligible target.');
    game.pendingIntelligenceChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    return;
  }

  const option = pending.targetOptions.find((candidate) => candidate.targetKey === action.choice);
  if (!option) throw new TreasonError('Choose an eligible opposing Battle card for Treason.');
  const opponent = opponentFor(game, action.playerId);
  const target = targetCard(option, opponent);
  if (!target || target.cardId !== option.cardId || !copiedEffectCanResolve(game, action.playerId, target)) {
    throw new TreasonError('The chosen Treason target can no longer resolve.');
  }

  if (pending.sourceKind === 'asset') consumeAsset(game, action.playerId);
  target.negated = true;
  game.pendingIntelligenceChoice = undefined;
  resolveCopiedEffect(game, action.playerId, target.cardId, pending.sourceSlot, pending.sourceIndex);
  publicLog(
    game,
    action.playerId,
    'intelligence_treason_resolved',
    `${game.players[action.playerId].name} negated ${target.cardId} with Treason and resolved its Battle effect.`,
    { targetOwner: target.owner, targetCardId: target.cardId, sourceKind: pending.sourceKind },
  );
  if (!game.pendingIntelligenceChoice) game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}

function battleDirection(game: GameState): number {
  const battle = game.battle!;
  const location = game.board.spaces.find((space) => space.id === battle.location)!;
  const origin = game.board.spaces.find((space) => space.id === battle.attackerOrigin)!;
  return Math.sign(location.index - origin.index);
}

function defenderWithdrawalDestination(game: GameState): SpaceID | undefined {
  const battle = game.battle!;
  const location = game.board.spaces.find((space) => space.id === battle.location)!;
  const destination = game.board.spaces.find((space) => space.index === location.index + battleDirection(game));
  return destination && !destination.occupant ? destination.id : undefined;
}

function isSourceCard(
  participant: BattleParticipantState,
  playerId: PlayerID,
  sourceSlot: SourceSlot | undefined,
  sourceIndex: number | undefined,
  candidateSlot: SourceSlot,
  candidateIndex?: number,
): boolean {
  return sourceSlot !== undefined
    && participant.playerId === playerId
    && sourceSlot === candidateSlot
    && (candidateSlot === 'hand_commit' || sourceIndex === candidateIndex);
}

function settleRefusedTermsWithoutWinner(game: GameState): void {
  for (const player of Object.values(game.players)) {
    const terms = player.diplomats?.activeTerms;
    if (!terms || terms.response !== 'refused') continue;
    if (terms.stake > 0) gainFactionResource(game, player.id, 'influence', terms.stake, 'Return Stake after Treason copied Reconnaissance');
    player.diplomats!.activeTerms = undefined;
  }
}

function returnCardsAndCleanBattleHands(
  game: GameState,
  sourcePlayerId: PlayerID,
  sourceSlot?: SourceSlot,
  sourceIndex?: number,
): void {
  const battle = game.battle!;
  for (const participant of [battle.attacker, battle.defender]) {
    const player = game.players[participant.playerId];
    if (participant.handCommit) {
      if (isSourceCard(participant, sourcePlayerId, sourceSlot, sourceIndex, 'hand_commit')) player.zones.graveyard.push(participant.handCommit.cardId);
      else player.zones.hand.push(participant.handCommit.cardId);
      participant.handCommit = undefined;
    }
    for (let index = 0; index < participant.battleDrawPlayed.length; index += 1) {
      const card = participant.battleDrawPlayed[index];
      if (isSourceCard(participant, sourcePlayerId, sourceSlot, sourceIndex, 'battle_draw_played', index)) player.zones.discard.push(card.cardId);
      else participant.battleDraw.push(card.cardId);
    }
    participant.battleDrawPlayed = [];
    player.zones.discard.push(...participant.battleDraw);
    participant.battleDraw = [];
  }
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
  sourceSlot?: SourceSlot,
  sourceIndex?: number,
): void {
  const battle = game.battle!;
  const wasDefender = battle.defender.playerId === playerId;
  if (wasDefender) {
    const destinationId = defenderWithdrawalDestination(game);
    if (!destinationId) throw new TreasonError('The defender has no legal withdrawal position.');
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
  returnCardsAndCleanBattleHands(game, playerId, sourceSlot, sourceIndex);
  settleRefusedTermsWithoutWinner(game);
  clearBattleWindows(game);
  game.battle = undefined;
  game.phase = 'action_after_movement';
  game.priorityPlayer = game.activePlayer;
  publicLog(game, playerId, 'intelligence_treason_reconnaissance_withdrawal', `${game.players[playerId].name} withdrew using a Reconnaissance effect copied by Treason; the battle ended without a winner.`, { wasDefender });
}

export function resolveTreasonReconnaissanceChoice(game: GameState, action: ResolveIntelligenceChoiceAction): 'stay' | 'withdraw' {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'treason_reconnaissance_withdraw' || pending.playerId !== action.playerId) {
    throw new TreasonError(`${action.playerId} has no pending copied Reconnaissance choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId) throw new TreasonError('The copied Reconnaissance battle is no longer active.');
  if (action.choice === 'stay') {
    game.pendingIntelligenceChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    return 'stay';
  }
  if (action.choice !== 'withdraw' || !pending.canWithdraw) throw new TreasonError('The copied Reconnaissance effect cannot withdraw from this position.');
  endBattleWithoutWinner(game, action.playerId, pending.sourceSlot, pending.sourceIndex);
  return 'withdraw';
}
