import type {
  AppStateAction,
} from './actions';
import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import { HERESY } from './inquisition-heresy';
import { isArcaneCard } from './mystics-ritual';
import { gainFactionResource } from './resources';

export type InquisitionGraveyardSnapshot = Record<PlayerID, CardID[]>;

function publicLog(
  game: GameState,
  actor: PlayerID | undefined,
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

function arcaneTraitCard(cardId: CardID): boolean {
  return cardId === HERESY || isArcaneCard(cardId);
}

function removeLast(cards: CardID[], cardId: CardID): boolean {
  const index = cards.lastIndexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function physicalBattleCards(battle: BattleState, playerId: PlayerID): Array<{ key: string; card: BattlePlayedCard }> {
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  const cards: Array<{ key: string; card: BattlePlayedCard }> = [];
  if (participant.handCommit && !participant.handCommit.virtual) {
    cards.push({ key: `${playerId}:hand`, card: participant.handCommit });
  }
  participant.battleDrawPlayed.forEach((card, index) => {
    if (!card.virtual) cards.push({ key: `${playerId}:battle_draw:${index}`, card });
  });
  return cards;
}

function inquisitionPlayers(game: GameState): PlayerID[] {
  return Object.values(game.players)
    .filter((player) => player.factionId === 'inquisition' && player.inquisition)
    .map((player) => player.id);
}

function opponentInBattle(battle: BattleState, playerId: PlayerID): PlayerID | undefined {
  if (battle.attacker.playerId === playerId) return battle.defender.playerId;
  if (battle.defender.playerId === playerId) return battle.attacker.playerId;
  return undefined;
}

export function captureInquisitionGraveyards(game: GameState): InquisitionGraveyardSnapshot {
  return Object.fromEntries(
    Object.values(game.players).map((player) => [player.id, [...player.zones.graveyard]]),
  );
}

/**
 * Condemnation changes only cards actually used from a Battle Hand. Cards
 * committed from the normal hand already enter the Graveyard through core
 * cleanup, and unchosen Battle Hand cards remain normal discards.
 */
export function applyCondemnationAfterBattle(game: GameState, battle: BattleState): CardID[] {
  const condemned: CardID[] = [];
  for (const inquisitorId of inquisitionPlayers(game)) {
    const opponentId = opponentInBattle(battle, inquisitorId);
    if (!opponentId) continue;
    const opponent = battle.attacker.playerId === opponentId ? battle.attacker : battle.defender;
    for (const played of opponent.battleDrawPlayed) {
      if (played.virtual) continue;
      if (!removeLast(game.players[opponentId].zones.discard, played.cardId)) continue;
      game.players[opponentId].zones.graveyard.push(played.cardId);
      condemned.push(played.cardId);
    }
  }
  if (condemned.length > 0) {
    publicLog(
      game,
      undefined,
      'inquisition_condemnation',
      `Condemnation sent ${condemned.length} opposing Battle Hand card${condemned.length === 1 ? '' : 's'} to the Graveyard.`,
      { cardIds: condemned },
    );
  }
  return condemned;
}

export function awardNormalConvictionAfterBattle(
  game: GameState,
  battle: BattleState,
  before: InquisitionGraveyardSnapshot,
): PlayerID[] {
  const awarded: PlayerID[] = [];
  for (const inquisitorId of inquisitionPlayers(game)) {
    const opponentId = opponentInBattle(battle, inquisitorId);
    if (!opponentId) continue;
    const inquisition = game.players[inquisitorId].inquisition!;
    if (inquisition.convictionBattleGainTurn === game.turn) continue;
    const previousCount = before[opponentId]?.length ?? 0;
    if (game.players[opponentId].zones.graveyard.length <= previousCount) continue;
    gainFactionResource(
      game,
      inquisitorId,
      'conviction',
      1,
      'First opposing card entered the Graveyard after a battle this turn.',
    );
    inquisition.convictionBattleGainTurn = game.turn;
    awarded.push(inquisitorId);
  }
  return awarded;
}

function blasphemyMarker(inquisitorId: PlayerID, sourceKey: string): string {
  return `inquisition_blasphemy:${inquisitorId}:${sourceKey}`;
}

/** Awards Blasphemy only once a hidden Battle card has actually been revealed. */
export function awardBlasphemyForRevealedBattleCards(game: GameState): number {
  const battle = game.battle;
  if (!battle) return 0;
  let gains = 0;
  for (const inquisitorId of inquisitionPlayers(game)) {
    const opponentId = opponentInBattle(battle, inquisitorId);
    if (!opponentId) continue;
    for (const { key, card } of physicalBattleCards(battle, opponentId)) {
      if (card.faceDown || !arcaneTraitCard(card.cardId)) continue;
      const marker = blasphemyMarker(inquisitorId, key);
      if (battle.effectsResolved.includes(marker)) continue;
      battle.effectsResolved.push(marker);
      gainFactionResource(game, inquisitorId, 'conviction', 1, `Blasphemy: ${card.cardId} was used.`);
      gains += 1;
    }
  }
  return gains;
}

function blackCovenantBoundActionCard(game: GameState, playerId: PlayerID, bindingId: string): CardID | undefined {
  return game.players[playerId].mystics?.blackCovenantBindings?.find((binding) => binding.id === bindingId)?.cardId;
}

/** Returns a face-up Action-effect card use visible from the submitted action. */
export function actionArcaneUse(game: GameState, action: AppStateAction): { playerId: PlayerID; cardId: CardID } | undefined {
  if (action.type === 'play_action_card') {
    return arcaneTraitCard(action.cardId) ? { playerId: action.playerId, cardId: action.cardId } : undefined;
  }
  if (action.type === 'use_mystic_black_covenant_action') {
    const cardId = blackCovenantBoundActionCard(game, action.playerId, action.bindingId);
    return cardId && arcaneTraitCard(cardId) ? { playerId: action.playerId, cardId } : undefined;
  }
  return undefined;
}

export function awardBlasphemyForActionUse(
  game: GameState,
  use: { playerId: PlayerID; cardId: CardID } | undefined,
): number {
  if (!use) return 0;
  let gains = 0;
  for (const inquisitorId of inquisitionPlayers(game)) {
    if (inquisitorId === use.playerId) continue;
    gainFactionResource(game, inquisitorId, 'conviction', 1, `Blasphemy: ${use.cardId} was used for its Action effect.`);
    gains += 1;
  }
  return gains;
}

export function evaluatePurificationAfterNormalDraw(
  game: GameState,
  drawingPlayerId: PlayerID,
  drawnCards: readonly CardID[] | undefined,
): PlayerID | undefined {
  if ((drawnCards?.length ?? 0) > 0 || game.winner) return undefined;
  const drawingPlayer = game.players[drawingPlayerId];
  if (drawingPlayer.zones.deck.length > 0 || drawingPlayer.zones.discard.length > 0) return undefined;
  const inquisitor = Object.values(game.players).find((player) => (
    player.id !== drawingPlayerId && player.factionId === 'inquisition'
  ));
  if (!inquisitor) return undefined;
  game.winner = inquisitor.id;
  game.phase = 'game_over';
  game.priorityPlayer = inquisitor.id;
  publicLog(
    game,
    inquisitor.id,
    'inquisition_purification_victory',
    `${inquisitor.name} achieved Purification after ${drawingPlayer.name} could not complete their normal Draw step.`,
    { drawingPlayerId },
  );
  return inquisitor.id;
}
