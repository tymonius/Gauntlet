import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import type { ResolveMysticsChoiceAction } from './actions';
import { drawFromDeck } from './draw';
import { sacrificeMysticHandCard } from './mystics-conversion';

export const DARK_OMENS_CARD_ID = 'mystics-dark-omens';

export class DarkOmensError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DarkOmensError';
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

function removeLast(cards: CardID[], cardId: CardID): boolean {
  const index = cards.lastIndexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new DarkOmensError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new DarkOmensError(`${playerId} is not participating in this battle.`);
}

function active(card: BattlePlayedCard | undefined): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated && card.cardId === DARK_OMENS_CARD_ID);
}

function darkOmensBattleSources(battle: BattleState): Array<{ playerId: PlayerID; sourceKey: string }> {
  const result: Array<{ playerId: PlayerID; sourceKey: string }> = [];
  for (const participant of [battle.attacker, battle.defender]) {
    if (active(participant.handCommit)) {
      result.push({ playerId: participant.playerId, sourceKey: `${participant.playerId}:hand` });
    }
    participant.battleDrawPlayed.forEach((card, index) => {
      if (active(card)) result.push({ playerId: participant.playerId, sourceKey: `${participant.playerId}:battle_draw:${index}` });
    });
  }
  return result;
}

export function isDarkOmensChoice(kind?: string): boolean {
  return kind === 'dark_omens_action' || kind === 'dark_omens_battle';
}

export function applyDarkOmensAction(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  if (cardId !== DARK_OMENS_CARD_ID) return false;
  const player = game.players[playerId];
  if (!player || player.factionId !== 'mystics' || !player.mystics) {
    throw new DarkOmensError(`${playerId} is not a Mystics player.`);
  }
  if (game.pendingMysticsChoice) throw new DarkOmensError('Resolve the pending Mystics choice first.');

  const restoreSourceToDiscard = removeLast(player.zones.discard, cardId);
  const draw = drawFromDeck(player, { count: 2 });
  player.zones.hand.push(...draw.drawnCards);
  publicLog(game, playerId, 'mystics_dark_omens_action_draw', `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Dark Omens.`, {
    count: draw.drawnCards.length,
    reshuffled: draw.reshuffled,
    exhausted: draw.exhausted,
  });

  if (draw.drawnCards.length === 0) {
    if (restoreSourceToDiscard) player.zones.discard.push(cardId);
    return true;
  }

  game.pendingMysticsChoice = {
    kind: 'dark_omens_action',
    playerId,
    drawnCardIds: [...draw.drawnCards],
    sourceCardId: cardId,
    restoreSourceToDiscard,
    options: ['select'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

export function openNextDarkOmensBattleChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice') return false;

  for (const source of darkOmensBattleSources(battle)) {
    const marker = `mystics_dark_omens_resolved:${source.sourceKey}`;
    if (battle.effectsResolved.includes(marker)) continue;
    battle.effectsResolved.push(marker);

    const player = game.players[source.playerId];
    const draw = drawFromDeck(player, { count: 1 });
    const drawnCardId = draw.drawnCards[0];
    if (drawnCardId) player.zones.hand.push(drawnCardId);
    publicLog(game, source.playerId, 'mystics_dark_omens_battle_draw', `${player.name} drew ${drawnCardId ? 1 : 0} card with Dark Omens.`, {
      count: drawnCardId ? 1 : 0,
      battleId: battle.id,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    });
    if (!drawnCardId) continue;

    game.pendingMysticsChoice = {
      kind: 'dark_omens_battle',
      playerId: source.playerId,
      battleId: battle.id,
      sourceKey: source.sourceKey,
      drawnCardId,
      options: ['keep', 'sacrifice'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.playerId;
    return true;
  }
  return false;
}

function resolveActionChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'dark_omens_action' || pending.playerId !== action.playerId) {
    throw new DarkOmensError(`${action.playerId} has no pending Dark Omens Action choice.`);
  }
  if (action.choice !== 'select' || !action.cardId || !pending.drawnCardIds.includes(action.cardId)) {
    throw new DarkOmensError('Choose one of the cards drawn by Dark Omens.');
  }

  sacrificeMysticHandCard(game, action.playerId, action.cardId, DARK_OMENS_CARD_ID);
  if (pending.restoreSourceToDiscard) game.players[action.playerId].zones.discard.push(pending.sourceCardId);
  game.pendingMysticsChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  publicLog(game, action.playerId, 'mystics_dark_omens_action_resolved', `${game.players[action.playerId].name} completed Dark Omens.`, {
    graveyardCardId: action.cardId,
  });
}

function resolveBattleChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'dark_omens_battle' || pending.playerId !== action.playerId) {
    throw new DarkOmensError(`${action.playerId} has no pending Dark Omens Battle choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId) {
    throw new DarkOmensError('The Dark Omens battle is no longer active.');
  }
  if (action.choice !== 'keep' && action.choice !== 'sacrifice') {
    throw new DarkOmensError('Choose whether to keep or sacrifice the card drawn by Dark Omens.');
  }

  if (action.choice === 'sacrifice') {
    if (action.cardId && action.cardId !== pending.drawnCardId) {
      throw new DarkOmensError('Only the card drawn by Dark Omens may be sacrificed.');
    }
    sacrificeMysticHandCard(game, action.playerId, pending.drawnCardId, DARK_OMENS_CARD_ID);
    participantFor(game, action.playerId).advantage = (participantFor(game, action.playerId).advantage ?? 0) + 1;
    publicLog(game, action.playerId, 'mystics_dark_omens_advantage', `${game.players[action.playerId].name} sacrificed the Dark Omens draw and gained advantage.`, {
      cardId: pending.drawnCardId,
      battleId: pending.battleId,
    });
  } else {
    publicLog(game, action.playerId, 'mystics_dark_omens_kept', `${game.players[action.playerId].name} kept the card drawn by Dark Omens.`, {
      battleId: pending.battleId,
    });
  }

  game.pendingMysticsChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}

export function resolveDarkOmensChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  if (game.pendingMysticsChoice?.kind === 'dark_omens_action') resolveActionChoice(game, action);
  else if (game.pendingMysticsChoice?.kind === 'dark_omens_battle') resolveBattleChoice(game, action);
  else throw new DarkOmensError(`${action.playerId} has no pending Dark Omens choice.`);
}
