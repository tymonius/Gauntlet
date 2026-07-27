import type {
  BegunMysticRiteState,
  CardID,
  GameEvent,
  GameState,
  MysticRiteId,
  MysticsState,
  PlayerID,
  PlayerState,
  PublicMysticsState,
  SpaceID,
} from '../types';

export const MYSTICS_ARCANE_CARD_IDS = [
  'mystics-dark-omens',
  'mystics-accursed-wager',
  'mystics-fates-toll',
  'mystics-grave-ward',
  'mystics-spirit-hollow',
  'mystics-soul-for-soul',
  'mystics-rend-the-veil',
  'mystics-paths-of-shadow',
  'mystics-witchcraft',
  'mystics-black-covenant',
  'mystics-circle-of-bones',
  'mystics-necromancy',
] as const satisfies readonly CardID[];

export const MYSTIC_RITE_IDS = [
  'rite_of_echoes',
  'rite_of_blood',
  'rite_of_crossing',
] as const satisfies readonly MysticRiteId[];

const ARCANE_CARD_IDS = new Set<CardID>(MYSTICS_ARCANE_CARD_IDS);

export class MysticsRitualError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MysticsRitualError';
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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function requireMystic(game: GameState, playerId: PlayerID): PlayerState & { mystics: MysticsState } {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'mystics' || !player.mystics) {
    throw new MysticsRitualError(`${playerId} is not a Mystics player.`);
  }
  return player as PlayerState & { mystics: MysticsState };
}

function requireRiteActionOpportunity(game: GameState, playerId: PlayerID): PlayerState & { mystics: MysticsState } {
  const player = requireMystic(game, playerId);
  if (game.phase !== 'action_after_movement') {
    throw new MysticsRitualError('A Rite may begin only during the Action Opportunity after movement.');
  }
  if (game.activePlayer !== playerId || game.priorityPlayer !== playerId) {
    throw new MysticsRitualError(`${playerId} does not currently have priority.`);
  }
  if (player.actionsRemaining < 1 || player.hasPlayedActionThisTurn) {
    throw new MysticsRitualError(`${playerId} has no Action Opportunity available.`);
  }
  if (player.mystics.begunRite) {
    throw new MysticsRitualError('Only one Rite may be begun at a time.');
  }
  return player;
}

function requireIncompleteRite(player: PlayerState & { mystics: MysticsState }, riteId: MysticRiteId): void {
  if (player.mystics.completedRites.includes(riteId)) {
    throw new MysticsRitualError(`${riteId} is already complete.`);
  }
}

function consumeRiteAction(player: PlayerState): void {
  player.actionsRemaining -= 1;
  player.hasPlayedActionThisTurn = true;
}

function cardsInPlayableDeck(player: PlayerState): CardID[] {
  const cards = [
    ...player.zones.deck,
    ...player.zones.hand,
    ...player.zones.discard,
    ...player.zones.graveyard,
    ...player.zones.assetBank,
    ...player.zones.removed,
  ];
  const rite = player.mystics?.begunRite;
  if (rite?.kind === 'rite_of_echoes') {
    cards.push(rite.faceUpBoundCardId, rite.faceDownBoundCardId);
  }
  return cards;
}

export function isArcaneCard(cardId: CardID): boolean {
  return ARCANE_CARD_IDS.has(cardId);
}

export function invocationUnlocked(mystics: MysticsState | undefined): boolean {
  return (mystics?.completedRites.length ?? 0) >= 1;
}

export function transmutationUnlocked(mystics: MysticsState | undefined): boolean {
  return (mystics?.completedRites.length ?? 0) >= 2;
}

export function toPublicMysticsState(mystics: MysticsState | undefined): PublicMysticsState | undefined {
  if (!mystics) return undefined;
  const begunRite = mystics.begunRite?.kind === 'rite_of_echoes'
    ? {
        kind: mystics.begunRite.kind,
        startedTurn: mystics.begunRite.startedTurn,
        faceUpBoundCardId: mystics.begunRite.faceUpBoundCardId,
        faceDownBoundCardCount: 1 as const,
      }
    : structuredClone(mystics.begunRite);
  return {
    completedRites: [...mystics.completedRites],
    begunRite,
    invocationUnlocked: invocationUnlocked(mystics),
    transmutationUnlocked: transmutationUnlocked(mystics),
  };
}

export function beginRiteOfEchoes(
  game: GameState,
  playerId: PlayerID,
  faceUpGraveyardCardId: CardID,
  faceDownHandCardId: CardID,
): void {
  const player = requireRiteActionOpportunity(game, playerId);
  requireIncompleteRite(player, 'rite_of_echoes');
  if (!player.zones.graveyard.includes(faceUpGraveyardCardId)) {
    throw new MysticsRitualError('Rite of Echoes requires a chosen card from your Graveyard.');
  }
  if (!player.zones.hand.includes(faceDownHandCardId)) {
    throw new MysticsRitualError('Rite of Echoes requires a chosen card from your hand.');
  }
  const matchingCopies = cardsInPlayableDeck(player).filter((cardId) => cardId === faceDownHandCardId).length;
  if (matchingCopies < 2) {
    throw new MysticsRitualError('The face-down card must share its title with another card in your Playable Deck.');
  }

  removeOne(player.zones.graveyard, faceUpGraveyardCardId);
  removeOne(player.zones.hand, faceDownHandCardId);
  player.mystics.begunRite = {
    kind: 'rite_of_echoes',
    startedTurn: game.turn,
    faceUpBoundCardId: faceUpGraveyardCardId,
    faceDownBoundCardId: faceDownHandCardId,
  };
  consumeRiteAction(player);
  publicLog(game, playerId, 'mystics_rite_begun', `${player.name} began Rite of Echoes.`, {
    riteId: 'rite_of_echoes',
    faceUpBoundCardId: faceUpGraveyardCardId,
    faceDownBoundCardCount: 1,
  });
}

export function beginRiteOfBlood(game: GameState, playerId: PlayerID, sacrificeCardId: CardID): void {
  const player = requireRiteActionOpportunity(game, playerId);
  requireIncompleteRite(player, 'rite_of_blood');
  if (!removeOne(player.zones.hand, sacrificeCardId)) {
    throw new MysticsRitualError('Rite of Blood requires one chosen card from your hand.');
  }
  player.zones.graveyard.push(sacrificeCardId);
  player.mystics.begunRite = { kind: 'rite_of_blood', startedTurn: game.turn };
  consumeRiteAction(player);
  publicLog(game, playerId, 'mystics_rite_begun', `${player.name} began Rite of Blood.`, {
    riteId: 'rite_of_blood',
    sacrificedCardId: sacrificeCardId,
  });
}

function qualifyingCrossingSpace(game: GameState, playerId: PlayerID): SpaceID | undefined {
  const result = game.recentBattleResult;
  if (!result || result.turn !== game.turn || result.winner !== playerId || result.attacker !== playerId) return undefined;
  const player = game.players[playerId];
  const space = game.board.spaces.find((candidate) => candidate.id === result.location);
  if (!space || space.kind !== 'territory' || player.occupiedSpaceId !== space.id) return undefined;
  if (!space.controller || space.controller === playerId) return undefined;
  return space.id;
}

export function canBeginRiteOfCrossing(game: GameState, playerId: PlayerID): boolean {
  try {
    const player = requireRiteActionOpportunity(game, playerId);
    requireIncompleteRite(player, 'rite_of_crossing');
    if (!qualifyingCrossingSpace(game, playerId)) return false;
    return player.zones.hand.some(isArcaneCard) || player.zones.discard.some(isArcaneCard);
  } catch {
    return false;
  }
}

export function beginRiteOfCrossing(
  game: GameState,
  playerId: PlayerID,
  sacrificeCardId: CardID,
  source: 'hand' | 'discard',
): void {
  const player = requireRiteActionOpportunity(game, playerId);
  requireIncompleteRite(player, 'rite_of_crossing');
  const requiredSpaceId = qualifyingCrossingSpace(game, playerId);
  if (!requiredSpaceId) {
    throw new MysticsRitualError('Rite of Crossing requires a qualifying attacking victory this turn.');
  }
  if (!isArcaneCard(sacrificeCardId)) {
    throw new MysticsRitualError('Rite of Crossing requires an Arcane card.');
  }

  const arcaneInHand = player.zones.hand.some(isArcaneCard);
  if (arcaneInHand && source !== 'hand') {
    throw new MysticsRitualError('An Arcane card from hand must be used while one is available.');
  }
  if (source === 'hand') {
    if (!removeOne(player.zones.hand, sacrificeCardId)) {
      throw new MysticsRitualError('The chosen Arcane card is not in your hand.');
    }
  } else {
    if (arcaneInHand) {
      throw new MysticsRitualError('The Discard Pile fallback is legal only when no Arcane card is in hand.');
    }
    if (!removeOne(player.zones.discard, sacrificeCardId)) {
      throw new MysticsRitualError('The chosen Arcane card is not in your Discard Pile.');
    }
    publicLog(game, playerId, 'mystics_hand_revealed_for_crossing', `${player.name} revealed their hand for Rite of Crossing.`, {
      cards: [...player.zones.hand],
    });
  }

  player.zones.graveyard.push(sacrificeCardId);
  player.mystics.begunRite = {
    kind: 'rite_of_crossing',
    startedTurn: game.turn,
    requiredSpaceId,
  };
  consumeRiteAction(player);
  publicLog(game, playerId, 'mystics_rite_begun', `${player.name} began Rite of Crossing.`, {
    riteId: 'rite_of_crossing',
    requiredSpaceId,
    sacrificedCardId: sacrificeCardId,
    source,
  });
}

export function resetBegunRite(game: GameState, playerId: PlayerID, reason: string): MysticRiteId | undefined {
  const player = requireMystic(game, playerId);
  const rite = player.mystics.begunRite;
  if (!rite) return undefined;
  if (rite.kind === 'rite_of_echoes') {
    player.zones.graveyard.push(rite.faceUpBoundCardId, rite.faceDownBoundCardId);
  }
  player.mystics.begunRite = undefined;
  publicLog(game, playerId, 'mystics_rite_reset', `${player.name}'s ${rite.kind} was interrupted and reset.`, {
    riteId: rite.kind,
    reason,
  });
  return rite.kind;
}

export function completeBegunRite(game: GameState, playerId: PlayerID, riteId: MysticRiteId): void {
  const player = requireMystic(game, playerId);
  const rite = player.mystics.begunRite;
  if (!rite || rite.kind !== riteId) throw new MysticsRitualError(`${riteId} is not currently begun.`);
  if (rite.startedTurn >= game.turn) throw new MysticsRitualError('A Rite cannot complete during the turn it begins.');
  if (player.mystics.riteCompletedTurn === game.turn) throw new MysticsRitualError('Only one Rite may be completed per turn.');

  if (rite.kind === 'rite_of_echoes') {
    player.zones.discard.push(rite.faceUpBoundCardId);
    player.zones.graveyard.push(rite.faceDownBoundCardId);
  }
  player.mystics.begunRite = undefined;
  if (!player.mystics.completedRites.includes(riteId)) player.mystics.completedRites.push(riteId);
  player.mystics.riteCompletedTurn = game.turn;

  publicLog(game, playerId, 'mystics_rite_completed', `${player.name} completed ${riteId}.`, {
    riteId,
    completedRiteCount: player.mystics.completedRites.length,
    invocationUnlocked: invocationUnlocked(player.mystics),
    transmutationUnlocked: transmutationUnlocked(player.mystics),
  });

  if (player.mystics.completedRites.length >= 3) {
    game.winner = playerId;
    game.phase = 'game_over';
    game.priorityPlayer = undefined;
    publicLog(game, playerId, 'mystics_ritual_victory', `${player.name} completed Ritual and won the game.`, {
      completedRites: [...player.mystics.completedRites],
    });
  }
}

export function begunRite(game: GameState, playerId: PlayerID): BegunMysticRiteState | undefined {
  return requireMystic(game, playerId).mystics.begunRite;
}
