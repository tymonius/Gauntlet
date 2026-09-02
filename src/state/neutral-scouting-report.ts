import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  ScoutingReportActionMode,
  ScoutingReportBattleTargetOption,
} from '../types/v06';
import type { PlayActionCardAction, ResolveNeutralChoiceAction } from './actions';
import {
  counterintelligenceBlocksFaceDownBattleCardInspection,
  counterintelligenceBlocksHandInspection,
  logCounterintelligenceBlock,
} from './neutral-counterintelligence';
import { GameActionError } from './reducer';

export const SCOUTING_REPORT = 'neutral-scouting-report';

export interface PreparedScoutingReportAction {
  remainingHand: CardID[];
}

export interface ResolvedScoutingReportChoice {
  resumeBattleReveal?: boolean;
}

interface ScoutingSource {
  participant: BattleParticipantState;
  card: BattlePlayedCard;
  sourceKey: string;
}

function appendPublicLog(
  game: GameState,
  actor: PlayerID,
  type: string,
  message: string,
  payload?: unknown,
): void {
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

function appendPrivateLog(
  game: GameState,
  actor: PlayerID,
  type: string,
  message: string,
  payload?: unknown,
): void {
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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function unique(cards: CardID[]): CardID[] {
  return [...new Set(cards)];
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.values(game.players).find((player) => player.id !== playerId);
  if (!opponent) throw new GameActionError('Scouting Report requires an opponent.');
  return opponent.id;
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in the battle.`);
}

function opposingParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender : battle.attacker;
}

export function prepareScoutingReportAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedScoutingReportAction | undefined {
  if (action.cardId !== SCOUTING_REPORT) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);
  const remainingHand = [...player.zones.hand];
  if (!removeOne(remainingHand, SCOUTING_REPORT)) {
    throw new GameActionError(`${player.name} does not have Scouting Report in hand.`);
  }
  return { remainingHand };
}

export function applyScoutingReportAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedScoutingReportAction,
): void {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];
  const opponent = opponentId(game, playerId);
  game.pendingNeutralChoice = {
    kind: 'scouting_report_action',
    playerId,
    opponentId: opponent,
    options: ['inspect_own_draw', 'inspect_opponent_draw', 'inspect_opponent_hand'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
}

function inspectActionCard(
  game: GameState,
  playerId: PlayerID,
  opponent: PlayerID,
  mode: ScoutingReportActionMode,
): CardID | undefined {
  if (mode === 'inspect_own_draw') return game.players[playerId].zones.deck[0];
  if (mode === 'inspect_opponent_draw') return game.players[opponent].zones.deck[0];
  if (counterintelligenceBlocksHandInspection(game, playerId, opponent)) {
    logCounterintelligenceBlock(game, playerId, opponent, 'hand', 'Scouting Report');
    return undefined;
  }
  const hand = game.players[opponent].zones.hand;
  if (hand.length === 0) return undefined;
  return hand[Math.floor(Math.random() * hand.length)];
}

function resolveActionChoice(game: GameState, action: ResolveNeutralChoiceAction): ResolvedScoutingReportChoice {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'scouting_report_action' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Scouting Report Action choice.`);
  }
  if (!pending.options.includes(action.choice as ScoutingReportActionMode)) {
    throw new GameActionError('Choose which hidden card to inspect with Scouting Report.');
  }
  const mode = action.choice as ScoutingReportActionMode;
  const cardId = inspectActionCard(game, action.playerId, pending.opponentId, mode);
  const targetPlayerId = mode === 'inspect_own_draw' ? action.playerId : pending.opponentId;

  appendPublicLog(
    game,
    action.playerId,
    'neutral_scouting_report_action_used',
    `${game.players[action.playerId].name} used Scouting Report to inspect hidden information.`,
    { mode, targetPlayerId, foundCard: cardId !== undefined },
  );
  appendPrivateLog(
    game,
    action.playerId,
    'neutral_scouting_report_action_inspection',
    cardId ? `You inspected ${cardId}.` : 'There was no card to inspect.',
    { mode, targetPlayerId, cardId },
  );

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  return {};
}

function activeScoutingReport(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === SCOUTING_REPORT
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function unresolvedSource(participant: BattleParticipantState): ScoutingSource | undefined {
  if (activeScoutingReport(participant.handCommit) && !participant.handCommit.earlyEffectResolved) {
    return {
      participant,
      card: participant.handCommit,
      sourceKey: `${participant.playerId}:hand`,
    };
  }
  const index = participant.battleDrawPlayed.findIndex((card) => (
    activeScoutingReport(card) && !card.earlyEffectResolved
  ));
  return index < 0 ? undefined : {
    participant,
    card: participant.battleDrawPlayed[index],
    sourceKey: `${participant.playerId}:battle_draw:${index}`,
  };
}

function nextSource(game: GameState): ScoutingSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

function sourceForKey(game: GameState, playerId: PlayerID, sourceKey: string): ScoutingSource | undefined {
  const participant = participantFor(game, playerId);
  if (sourceKey === `${playerId}:hand`) {
    const card = participant.handCommit;
    return activeScoutingReport(card) ? { participant, card, sourceKey } : undefined;
  }
  const prefix = `${playerId}:battle_draw:`;
  if (!sourceKey.startsWith(prefix)) return undefined;
  const index = Number(sourceKey.slice(prefix.length));
  const card = participant.battleDrawPlayed[index];
  return activeScoutingReport(card) ? { participant, card, sourceKey } : undefined;
}

function targetOptions(game: GameState, playerId: PlayerID): ScoutingReportBattleTargetOption[] {
  const opponent = opposingParticipant(game, playerId);
  const options: ScoutingReportBattleTargetOption[] = [];
  if (opponent.handCommit?.faceDown && !opponent.handCommit.canceled && !opponent.handCommit.virtual) {
    options.push({
      targetKey: `${opponent.playerId}:hand`,
      targetOwner: opponent.playerId,
      targetSource: 'hand',
    });
  }
  opponent.battleDrawPlayed.forEach((card, index) => {
    if (!card.faceDown || card.canceled || card.virtual) return;
    options.push({
      targetKey: `${opponent.playerId}:battle_draw:${index}`,
      targetOwner: opponent.playerId,
      targetSource: 'battle_draw',
    });
  });
  return options;
}

function targetForKey(game: GameState, option: ScoutingReportBattleTargetOption): BattlePlayedCard | undefined {
  const participant = participantFor(game, option.targetOwner);
  if (option.targetSource === 'hand') return participant.handCommit;
  const prefix = `${option.targetOwner}:battle_draw:`;
  if (!option.targetKey.startsWith(prefix)) return undefined;
  return participant.battleDrawPlayed[Number(option.targetKey.slice(prefix.length))];
}

function inspectBattleTarget(
  game: GameState,
  playerId: PlayerID,
  option: ScoutingReportBattleTargetOption,
): void {
  const target = targetForKey(game, option);
  if (!target?.faceDown || target.canceled || target.virtual) {
    throw new GameActionError('The selected opposing card is no longer available to inspect.');
  }
  target.visibleTo = [...new Set([...(target.visibleTo ?? []), playerId])];
  appendPrivateLog(
    game,
    playerId,
    'neutral_scouting_report_battle_inspection',
    `You inspected ${target.cardId}.`,
    {
      battleId: game.battle?.id,
      cardId: target.cardId,
      owner: option.targetOwner,
      source: option.targetSource,
    },
  );
}

function openReplacementChoice(game: GameState, source: ScoutingSource, resumePriorityPlayer?: PlayerID): boolean {
  const replacements = unique(source.participant.battleDraw);
  if (replacements.length === 0) return false;
  game.pendingNeutralChoice = {
    kind: 'scouting_report_battle_replace',
    playerId: source.participant.playerId,
    battleId: game.battle!.id,
    sourceKey: source.sourceKey,
    replacementOptions: replacements,
    options: ['pass', 'replace'],
    resumePriorityPlayer,
  };
  game.priorityPlayer = source.participant.playerId;
  return true;
}

export function battleHasUnresolvedScoutingReportPreReveal(
  game: GameState,
  incomingCardId?: CardID,
): boolean {
  return incomingCardId === SCOUTING_REPORT || Boolean(nextSource(game));
}

export function openNextScoutingReportPreRevealWindow(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'normal_reveal' || game.pendingNeutralChoice) return false;

  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    source.card.earlyEffectResolved = true;
    source.card.faceDown = false;
    const playerId = source.participant.playerId;
    const opponent = opposingParticipant(game, playerId);
    const resumePriorityPlayer = game.priorityPlayer;

    appendPublicLog(
      game,
      playerId,
      'neutral_scouting_report_battle_revealed',
      `${game.players[playerId].name} revealed Scouting Report before the normal battle reveal.`,
      { battleId: battle.id, opponentId: opponent.playerId },
    );

    const blocked = counterintelligenceBlocksFaceDownBattleCardInspection(
      game,
      playerId,
      opponent.playerId,
    );
    if (blocked) {
      logCounterintelligenceBlock(
        game,
        playerId,
        opponent.playerId,
        'face_down_battle_card',
        'Scouting Report',
      );
      if (openReplacementChoice(game, source, resumePriorityPlayer)) return true;
      continue;
    }

    const targets = targetOptions(game, playerId);
    if (targets.length === 1) {
      inspectBattleTarget(game, playerId, targets[0]);
      if (openReplacementChoice(game, source, resumePriorityPlayer)) return true;
      continue;
    }
    if (targets.length > 1) {
      game.pendingNeutralChoice = {
        kind: 'scouting_report_battle_inspect',
        playerId,
        battleId: battle.id,
        sourceKey: source.sourceKey,
        targetOptions: targets,
        options: ['inspect'],
        resumePriorityPlayer,
      };
      game.priorityPlayer = playerId;
      return true;
    }
    if (openReplacementChoice(game, source, resumePriorityPlayer)) return true;
  }
}

function clearPending(game: GameState, resumePriorityPlayer?: PlayerID): void {
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriorityPlayer ?? game.activePlayer;
}

function resolveBattleInspectChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): ResolvedScoutingReportChoice {
  const pending = game.pendingNeutralChoice;
  if (!pending
    || pending.kind !== 'scouting_report_battle_inspect'
    || pending.playerId !== action.playerId
    || action.choice !== 'inspect') {
    throw new GameActionError(`${action.playerId} has no matching Scouting Report inspection choice.`);
  }
  const option = pending.targetOptions.find((candidate) => candidate.targetKey === action.targetKey);
  if (!option) throw new GameActionError('Choose one eligible opposing face-down Battle card to inspect.');
  inspectBattleTarget(game, action.playerId, option);
  const source = sourceForKey(game, action.playerId, pending.sourceKey);
  if (!source || game.battle?.id !== pending.battleId) {
    throw new GameActionError('The Scouting Report source is no longer in the battle.');
  }
  if (openReplacementChoice(game, source, pending.resumePriorityPlayer)) return {};
  clearPending(game, pending.resumePriorityPlayer);
  return { resumeBattleReveal: true };
}

function removeSourceForReplacement(game: GameState, source: ScoutingSource): void {
  const player = game.players[source.participant.playerId];
  if (source.sourceKey === `${source.participant.playerId}:hand`) {
    if (source.participant.handCommit !== source.card) {
      throw new GameActionError('The Scouting Report hand commitment is no longer available.');
    }
    source.participant.handCommit = undefined;
    source.participant.passedHandCommit = true;
  } else {
    const prefix = `${source.participant.playerId}:battle_draw:`;
    const index = Number(source.sourceKey.slice(prefix.length));
    if (source.participant.battleDrawPlayed[index] !== source.card) {
      throw new GameActionError('The Scouting Report Battle Hand card is no longer available.');
    }
    source.participant.battleDrawPlayed.splice(index, 1);
  }
  player.zones.graveyard.push(source.card.cardId);
}

function resolveBattleReplaceChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): ResolvedScoutingReportChoice {
  const pending = game.pendingNeutralChoice;
  if (!pending
    || pending.kind !== 'scouting_report_battle_replace'
    || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Scouting Report replacement choice.`);
  }
  if (game.battle?.id !== pending.battleId) {
    throw new GameActionError('The Scouting Report battle is no longer active.');
  }
  if (action.choice === 'pass') {
    appendPublicLog(
      game,
      action.playerId,
      'neutral_scouting_report_battle_passed',
      `${game.players[action.playerId].name} kept Scouting Report in the battle.`,
      { battleId: pending.battleId },
    );
    clearPending(game, pending.resumePriorityPlayer);
    return { resumeBattleReveal: true };
  }
  if (action.choice !== 'replace'
    || !action.cardId
    || !pending.replacementOptions.includes(action.cardId)) {
    throw new GameActionError('Choose an eligible unchosen Battle Hand card or pass Scouting Report.');
  }

  const source = sourceForKey(game, action.playerId, pending.sourceKey);
  if (!source) throw new GameActionError('The Scouting Report source is no longer in the battle.');
  if (!removeOne(source.participant.battleDraw, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer an unchosen Battle Hand card.`);
  }
  removeSourceForReplacement(game, source);
  source.participant.battleDrawPlayed.push({
    cardId: action.cardId,
    owner: action.playerId,
    origin: 'battle_draw',
    faceDown: true,
    canceled: false,
    fromInitialBattleHand: true,
  });

  appendPublicLog(
    game,
    action.playerId,
    'neutral_scouting_report_battle_replaced',
    `${game.players[action.playerId].name} placed Scouting Report in their Graveyard and replaced it face down.`,
    { battleId: pending.battleId },
  );
  appendPrivateLog(
    game,
    action.playerId,
    'neutral_scouting_report_battle_replacement_private',
    `You replaced Scouting Report with ${action.cardId}.`,
    { battleId: pending.battleId, replacementCardId: action.cardId },
  );
  clearPending(game, pending.resumePriorityPlayer);
  return { resumeBattleReveal: true };
}

export function resolveScoutingReportChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): ResolvedScoutingReportChoice {
  const kind = game.pendingNeutralChoice?.kind;
  if (kind === 'scouting_report_action') return resolveActionChoice(game, action);
  if (kind === 'scouting_report_battle_inspect') return resolveBattleInspectChoice(game, action);
  return resolveBattleReplaceChoice(game, action);
}
