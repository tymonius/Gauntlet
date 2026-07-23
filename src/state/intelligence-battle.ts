import { cardCanBePlayedAt } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  IntelligenceBattleSource,
  PlayerID,
} from '../types';
import type { PlayBattleDrawCardAction, ResolveIntelligenceChoiceAction } from './actions';
import { hasFactionResource, spendFactionResource } from './resources';

export class IntelligenceBattleError extends Error {
  constructor(message: string) { super(message); this.name = 'IntelligenceBattleError'; }
}

interface DeferredBattleDrawState {
  otherPlayerId: PlayerID;
  passedBattleDrawPlay: boolean;
  battleDrawPlayLimit: number;
  battleDraw: CardID[];
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

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new IntelligenceBattleError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new IntelligenceBattleError(`${playerId} is not participating in this battle.`);
}

function opponentParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new IntelligenceBattleError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.defender;
  if (battle.defender.playerId === playerId) return battle.attacker;
  throw new IntelligenceBattleError(`${playerId} is not participating in this battle.`);
}

function completedHandCommit(participant: BattleParticipantState): boolean {
  return participant.passedHandCommit || participant.handCommit !== undefined;
}

function completedBattleDrawPlay(participant: BattleParticipantState): boolean {
  return participant.passedBattleDrawPlay
    || participant.battleDrawPlayed.length >= participant.battleDrawPlayLimit
    || participant.battleDraw.length === 0;
}

function playedCard(
  participant: BattleParticipantState,
  cardId: CardID,
  source: IntelligenceBattleSource,
): BattlePlayedCard | undefined {
  if (source === 'hand') return participant.handCommit?.cardId === cardId ? participant.handCommit : undefined;
  return participant.battleDrawPlayed.find((card) => card.cardId === cardId && card.origin === 'battle_draw');
}

function intelligenceOpponent(game: GameState, targetOwner: PlayerID): PlayerID | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  const candidate = opponentParticipant(game, targetOwner).playerId;
  const player = game.players[candidate];
  if (player?.factionId !== 'intelligence' || !player.intelligence) return undefined;
  if (player.intelligence.surveillanceUsedBattleId === battle.id) return undefined;
  if (!hasFactionResource(player, 'intel', 1)) return undefined;
  return candidate;
}

function revealDeferredBattleCards(game: GameState): void {
  const battle = game.battle;
  if (!battle || battle.stage !== 'normal_reveal') return;
  for (const participant of [battle.attacker, battle.defender]) {
    if (participant.handCommit) participant.handCommit.faceDown = false;
    participant.battleDrawPlayed = participant.battleDrawPlayed.map((card) => ({ ...card, faceDown: false }));
  }
  battle.stage = 'dice';
  publicLog(game, battle.attacker.playerId, 'battle_cards_revealed', 'Battle cards were revealed.');
}

function continueBattle(game: GameState): void {
  if (game.pendingIntelligenceChoice) return;
  revealDeferredBattleCards(game);
}

export function shouldDeferBattleDrawReveal(game: GameState, action: PlayBattleDrawCardAction): boolean {
  if (!game.battle || game.battle.stage !== 'battle_play_selection') return false;
  if (!intelligenceOpponent(game, action.playerId)) return false;
  const participant = participantFor(game, action.playerId);
  return participant.battleDraw.includes(action.cardId);
}

export function prepareDeferredBattleDrawReveal(game: GameState, action: PlayBattleDrawCardAction): DeferredBattleDrawState | undefined {
  if (!shouldDeferBattleDrawReveal(game, action)) return undefined;
  const other = opponentParticipant(game, action.playerId);
  const snapshot: DeferredBattleDrawState = {
    otherPlayerId: other.playerId,
    passedBattleDrawPlay: other.passedBattleDrawPlay,
    battleDrawPlayLimit: other.battleDrawPlayLimit,
    battleDraw: [...other.battleDraw],
  };
  other.passedBattleDrawPlay = false;
  other.battleDrawPlayLimit = Math.max(other.battleDrawPlayLimit, other.battleDrawPlayed.length + 1);
  if (other.battleDraw.length === 0) other.battleDraw = ['__deferred_intelligence_reveal__'];
  return snapshot;
}

export function restoreDeferredBattleDrawReveal(game: GameState, snapshot?: DeferredBattleDrawState): void {
  if (!snapshot || !game.battle) return;
  const other = participantFor(game, snapshot.otherPlayerId);
  other.passedBattleDrawPlay = snapshot.passedBattleDrawPlay;
  other.battleDrawPlayLimit = snapshot.battleDrawPlayLimit;
  other.battleDraw = snapshot.battleDraw;
  if (completedBattleDrawPlay(game.battle.attacker) && completedBattleDrawPlay(game.battle.defender)) {
    game.battle.stage = 'normal_reveal';
  }
}

export function openSurveillanceWindowAfterChoice(
  game: GameState,
  targetOwner: PlayerID,
  targetCardId: CardID,
  targetSource: IntelligenceBattleSource,
): boolean {
  const battle = game.battle;
  if (!battle || game.pendingIntelligenceChoice) return false;
  const target = playedCard(participantFor(game, targetOwner), targetCardId, targetSource);
  if (!target?.faceDown) return false;
  const intelligencePlayerId = intelligenceOpponent(game, targetOwner);
  if (!intelligencePlayerId) return false;
  game.pendingIntelligenceChoice = {
    kind: 'surveillance',
    playerId: intelligencePlayerId,
    battleId: battle.id,
    targetOwner,
    targetCardId,
    targetSource,
    options: ['pass', 'surveil'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = intelligencePlayerId;
  return true;
}

function clearPending(game: GameState, resumePriorityPlayer?: PlayerID): void {
  game.pendingIntelligenceChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = resumePriorityPlayer ?? game.activePlayer;
}

function resolveSurveillance(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'surveillance') throw new IntelligenceBattleError('There is no Surveillance choice to resolve.');
  if (action.choice === 'pass') {
    clearPending(game, pending.resumePriorityPlayer);
    continueBattle(game);
    return;
  }
  if (action.choice !== 'surveil') throw new IntelligenceBattleError('Choose whether to use Surveillance.');
  const player = game.players[action.playerId];
  spendFactionResource(game, action.playerId, 'intel', 1, 'Surveillance');
  player.intelligence!.surveillanceUsedBattleId = pending.battleId;
  const target = playedCard(participantFor(game, pending.targetOwner), pending.targetCardId, pending.targetSource);
  if (!target) throw new IntelligenceBattleError('The card selected for Surveillance is no longer in the battle.');
  target.visibleTo = [...new Set([...(target.visibleTo ?? []), action.playerId])];
  privateLog(game, action.playerId, 'intelligence_surveillance_inspection', `You inspected ${pending.targetCardId}.`, {
    battleId: pending.battleId,
    cardId: pending.targetCardId,
    owner: pending.targetOwner,
    source: pending.targetSource,
  });
  publicLog(game, action.playerId, 'intelligence_surveillance_used', `${player.name} used Surveillance.`, {
    battleId: pending.battleId,
    targetOwner: pending.targetOwner,
    source: pending.targetSource,
  });
  game.pendingIntelligenceChoice = {
    ...pending,
    kind: 'interference',
    options: ['pass', 'interfere'],
  };
}

function removeInspectedCard(game: GameState, pending: Extract<NonNullable<GameState['pendingIntelligenceChoice']>, { kind: 'interference' }>): CardID[] {
  const participant = participantFor(game, pending.targetOwner);
  const owner = game.players[pending.targetOwner];
  if (pending.targetSource === 'hand') {
    if (participant.handCommit?.cardId !== pending.targetCardId) throw new IntelligenceBattleError('The inspected hand commitment is no longer in the battle.');
    participant.handCommit = undefined;
    participant.passedHandCommit = false;
    owner.zones.hand.push(pending.targetCardId);
    game.battle!.stage = 'hand_commit';
    return owner.zones.hand.filter((cardId) => cardCanBePlayedAt(cardId, 'battle_hand_commit', 'hand'));
  }

  const index = participant.battleDrawPlayed.findIndex((card) => card.cardId === pending.targetCardId && card.origin === 'battle_draw');
  if (index < 0) throw new IntelligenceBattleError('The inspected Battle Hand card is no longer in the battle.');
  participant.battleDrawPlayed.splice(index, 1);
  participant.passedBattleDrawPlay = false;
  if (!participant.battleDraw.includes(pending.targetCardId)) participant.battleDraw.push(pending.targetCardId);
  game.battle!.stage = 'battle_play_selection';
  return participant.battleDraw.filter((cardId) => cardCanBePlayedAt(cardId, 'battle_draw_play', 'battle_draw'));
}

function resolveInterference(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'interference') throw new IntelligenceBattleError('There is no Interference choice to resolve.');
  if (action.choice === 'pass') {
    clearPending(game, pending.resumePriorityPlayer);
    continueBattle(game);
    return;
  }
  if (action.choice !== 'interfere') throw new IntelligenceBattleError('Choose whether to use Interference.');
  spendFactionResource(game, action.playerId, 'intel', 2, 'Interference');
  const eligibleCardIds = removeInspectedCard(game, pending);
  publicLog(game, action.playerId, 'intelligence_interference_used', `${game.players[action.playerId].name} used Interference and returned a face-down card to its source.`, {
    battleId: pending.battleId,
    targetOwner: pending.targetOwner,
    source: pending.targetSource,
  });
  game.pendingIntelligenceChoice = {
    kind: 'interference_replacement',
    playerId: pending.targetOwner,
    intelligencePlayerId: action.playerId,
    battleId: pending.battleId,
    source: pending.targetSource,
    removedCardId: pending.targetCardId,
    eligibleCardIds,
    options: ['pass', 'select'],
    resumePriorityPlayer: pending.resumePriorityPlayer,
  };
  game.priorityPlayer = pending.targetOwner;
}

function selectReplacement(game: GameState, pending: Extract<NonNullable<GameState['pendingIntelligenceChoice']>, { kind: 'interference_replacement' }>, cardId: CardID): void {
  if (!pending.eligibleCardIds.includes(cardId)) throw new IntelligenceBattleError('Choose an eligible replacement card from the same source.');
  const participant = participantFor(game, pending.playerId);
  const owner = game.players[pending.playerId];
  if (pending.source === 'hand') {
    const index = owner.zones.hand.indexOf(cardId);
    if (index < 0) throw new IntelligenceBattleError('The replacement card is no longer in hand.');
    owner.zones.hand.splice(index, 1);
    participant.handCommit = { cardId, owner: pending.playerId, origin: 'hand', faceDown: true, canceled: false };
    participant.passedHandCommit = false;
    return;
  }
  const index = participant.battleDraw.indexOf(cardId);
  if (index < 0) throw new IntelligenceBattleError('The replacement card is no longer in the Battle Hand.');
  participant.battleDraw.splice(index, 1);
  participant.battleDrawPlayed.push({ cardId, owner: pending.playerId, origin: 'battle_draw', faceDown: true, canceled: false });
  participant.passedBattleDrawPlay = false;
}

function progressAfterReplacement(game: GameState, source: IntelligenceBattleSource): void {
  const battle = game.battle;
  if (!battle) return;
  if (source === 'hand') {
    if (completedHandCommit(battle.attacker) && completedHandCommit(battle.defender)) battle.stage = 'battle_draw';
    return;
  }
  if (completedBattleDrawPlay(battle.attacker) && completedBattleDrawPlay(battle.defender)) {
    battle.stage = 'normal_reveal';
    revealDeferredBattleCards(game);
  }
}

function resolveReplacement(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'interference_replacement') throw new IntelligenceBattleError('There is no Interference replacement choice to resolve.');
  if (action.choice === 'select') {
    if (!action.cardId) throw new IntelligenceBattleError('Choose a replacement card.');
    selectReplacement(game, pending, action.cardId);
  } else if (action.choice === 'pass') {
    const participant = participantFor(game, pending.playerId);
    if (pending.source === 'hand') participant.passedHandCommit = true;
    else participant.passedBattleDrawPlay = true;
  } else {
    throw new IntelligenceBattleError('Choose a replacement card or decline.');
  }
  clearPending(game, pending.resumePriorityPlayer);
  progressAfterReplacement(game, pending.source);
}

export function resolveIntelligenceBattleChoice(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.playerId !== action.playerId) throw new IntelligenceBattleError(`${action.playerId} has no pending Intelligence choice.`);
  if (!game.battle || game.battle.id !== pending.battleId) throw new IntelligenceBattleError('The Intelligence choice no longer matches the active battle.');
  if (pending.kind === 'surveillance') resolveSurveillance(game, action);
  else if (pending.kind === 'interference') resolveInterference(game, action);
  else resolveReplacement(game, action);
}
