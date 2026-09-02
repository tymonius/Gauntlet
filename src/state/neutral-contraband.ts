import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  ContrabandBattleSource,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { PlayActionCardAction, ResolveNeutralChoiceAction } from './actions';
import { GameActionError } from './reducer';

export const CONTRABAND = 'neutral-contraband';

export interface PreparedContrabandAction {
  targetCardId: CardID;
}

export interface ResolveContrabandChoiceResult {
  resumeBattleReveal?: boolean;
}

interface ContrabandSourceState {
  participant: BattleParticipantState;
  card: BattlePlayedCard;
  source: ContrabandBattleSource;
}

/**
 * These Battle effects have already missed their only useful timing window, or
 * depend on an original hand/Battle-Hand origin that a discard replacement
 * does not have.
 */
const CONTRABAND_EXCLUDED_BATTLE_EFFECTS = new Set<CardID>([
  'neutral-conscription',
  'neutral-tactical-planning',
  'card-conscription',
  'intelligence-disinformation',
  'neutral-scorched-earth',
  'mystics-spirit-hollow',
  'mystics-circle-of-bones',
]);

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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function unique(cards: readonly CardID[]): CardID[] {
  return [...new Set(cards)];
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function activeContraband(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === CONTRABAND
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

function unresolvedSource(participant: BattleParticipantState): ContrabandSourceState | undefined {
  if (activeContraband(participant.handCommit) && !participant.handCommit.earlyEffectResolved) {
    return {
      participant,
      card: participant.handCommit,
      source: { zone: 'hand_commit' },
    };
  }
  for (const [index, card] of participant.battleDrawPlayed.entries()) {
    if (!activeContraband(card) || card.earlyEffectResolved) continue;
    return {
      participant,
      card,
      source: { zone: 'battle_draw_played', index },
    };
  }
  return undefined;
}

function nextSource(game: GameState): ContrabandSourceState | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

function sourceCard(
  participant: BattleParticipantState,
  source: ContrabandBattleSource,
): BattlePlayedCard | undefined {
  return source.zone === 'hand_commit'
    ? participant.handCommit
    : participant.battleDrawPlayed[source.index];
}

export function contrabandBattleEffectCanStillResolve(cardId: CardID): boolean {
  if (CONTRABAND_EXCLUDED_BATTLE_EFFECTS.has(cardId)) return false;
  const rule = getCardPlayRule(cardId);
  if (!rule) return false;
  return rule.timings.includes('battle_hand_commit') || rule.timings.includes('battle_draw_play');
}

function replacementOptions(game: GameState, playerId: PlayerID): CardID[] {
  return unique(game.players[playerId].zones.discard)
    .filter(contrabandBattleEffectCanStillResolve);
}

export function prepareContrabandAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedContrabandAction | undefined {
  if (action.cardId !== CONTRABAND) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);
  if (!player.zones.hand.includes(CONTRABAND)) {
    throw new GameActionError(`${player.name} does not have Contraband in hand.`);
  }
  const targets = action.targets ?? [];
  if (targets.length !== 1 || targets[0].kind !== 'card' || targets[0].owner !== action.playerId) {
    throw new GameActionError('Contraband requires exactly one card from your own Discard Pile.');
  }
  if (!player.zones.discard.includes(targets[0].cardId)) {
    throw new GameActionError('The chosen Contraband card is not in your Discard Pile.');
  }
  return { targetCardId: targets[0].cardId };
}

export function applyContrabandAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedContrabandAction,
): void {
  const player = game.players[playerId];
  if (!removeOne(player.zones.discard, prepared.targetCardId)) {
    throw new GameActionError(`${prepared.targetCardId} is no longer in your Discard Pile.`);
  }
  player.zones.hand.push(prepared.targetCardId);
  appendPublicLog(
    game,
    playerId,
    'neutral_contraband_action',
    `${player.name} returned ${prepared.targetCardId} from their Discard Pile to their hand with Contraband.`,
    { cardId: prepared.targetCardId },
  );
}

export function battleHasUnresolvedContrabandPreReveal(
  game: GameState,
  incomingCardId?: CardID,
): boolean {
  return incomingCardId === CONTRABAND || Boolean(nextSource(game));
}

export function openNextContrabandPreRevealWindow(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'normal_reveal' || game.pendingNeutralChoice) return false;

  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    source.card.faceDown = false;
    source.card.earlyEffectResolved = true;
    const playerId = source.participant.playerId;
    appendPublicLog(
      game,
      playerId,
      'neutral_contraband_battle_revealed',
      `${game.players[playerId].name} revealed Contraband before the normal battle reveal.`,
      { battleId: battle.id, source: source.source },
    );

    const cardOptions = replacementOptions(game, playerId);
    if (cardOptions.length === 0) continue;
    game.pendingNeutralChoice = {
      kind: 'contraband_battle',
      playerId,
      battleId: battle.id,
      source: source.source,
      cardOptions,
      options: ['select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = playerId;
    return true;
  }
}

export function resolveContrabandChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): ResolveContrabandChoiceResult {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'contraband_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Contraband choice.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose an eligible Battle card from your Discard Pile for Contraband.');
  }
  if (game.battle?.id !== pending.battleId) {
    throw new GameActionError('The battle for this Contraband choice is no longer active.');
  }
  const participant = participantFor(game, pending.playerId);
  const contraband = sourceCard(participant, pending.source);
  if (!activeContraband(contraband) || !contraband.earlyEffectResolved) {
    throw new GameActionError('The revealed Contraband card is no longer available to replace.');
  }
  if (!contrabandBattleEffectCanStillResolve(action.cardId)) {
    throw new GameActionError(`${action.cardId} no longer has a Battle effect that can resolve now.`);
  }
  const player = game.players[pending.playerId];
  if (!removeOne(player.zones.discard, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in your Discard Pile.`);
  }

  const replacement: BattlePlayedCard = {
    cardId: action.cardId,
    owner: pending.playerId,
    origin: 'replayed',
    faceDown: false,
    canceled: false,
    cleanupDestination: 'graveyard',
  };
  if (pending.source.zone === 'hand_commit') {
    participant.handCommit = replacement;
  } else {
    participant.battleDrawPlayed[pending.source.index] = replacement;
  }
  player.zones.graveyard.push(CONTRABAND);

  appendPublicLog(
    game,
    pending.playerId,
    'neutral_contraband_battle_replacement',
    `${player.name} put Contraband in their Graveyard and revealed ${action.cardId} from their Discard Pile in its place.`,
    {
      battleId: pending.battleId,
      replacementCardId: action.cardId,
      source: pending.source,
    },
  );

  const resumePriority = pending.resumePriorityPlayer;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  return { resumeBattleReveal: true };
}
