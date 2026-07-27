import { destinationForCardPlay } from '../cards';
import type { CardID, DiplomatSanctionState, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import { drawFromDeck } from './draw';
import { gainFactionResource } from './resources';

export const DIPLOMAT_PERSISTENT_CARDS = {
  clemency: 'diplomats-clemency',
  demilitarizedZone: 'diplomats-demilitarized-zone',
  censure: 'diplomats-sanctions-censure',
  embargo: 'diplomats-sanctions-embargo',
  blockade: 'diplomats-sanctions-blockade',
} as const;

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function removeOne(zone: CardID[], cardId: CardID): void {
  const index = zone.indexOf(cardId);
  if (index < 0) throw new Error(`${cardId} is not in the required zone.`);
  zone.splice(index, 1);
}

function draw(game: GameState, playerId: PlayerID, count: number): void {
  const result = drawFromDeck(game.players[playerId], { count });
  game.players[playerId].zones.hand.push(...result.drawnCards);
}

function sanctions(game: GameState, diplomatId: PlayerID): DiplomatSanctionState[] {
  const diplomat = game.players[diplomatId];
  diplomat.diplomats ??= { ratifiedProposals: [] };
  diplomat.diplomats.sanctionStates ??= [];
  return diplomat.diplomats.sanctionStates;
}

function addSanction(game: GameState, sanction: DiplomatSanctionState): void {
  sanctions(game, sanction.diplomatId).push(sanction);
  const map = game.players[sanction.diplomatId].diplomats!.sanctionsAgainst ??= {};
  map[sanction.opponentId] = [...(map[sanction.opponentId] ?? []), sanction.cardId];
}

function removeSanction(game: GameState, diplomatId: PlayerID, sanction: DiplomatSanctionState): void {
  const diplomat = game.players[diplomatId];
  diplomat.diplomats!.sanctionStates = sanctions(game, diplomatId).filter((candidate) => candidate !== sanction);
  const mapped = diplomat.diplomats!.sanctionsAgainst?.[sanction.opponentId] ?? [];
  if (diplomat.diplomats!.sanctionsAgainst) diplomat.diplomats!.sanctionsAgainst[sanction.opponentId] = mapped.filter((id) => id !== sanction.cardId);
  const overlaySpace = sanction.spaceId ? game.board.spaces.find((space) => space.id === sanction.spaceId) : undefined;
  if (overlaySpace?.overlays) overlaySpace.overlays = overlaySpace.overlays.filter((overlay) => !(overlay.cardId === sanction.cardId && overlay.owner === diplomatId));
  diplomat.zones.discard.push(sanction.cardId);
}

export function playClemency(game: GameState, diplomatId: PlayerID, opponentId: PlayerID, cardId: CardID): void {
  const diplomat = game.players[diplomatId];
  if (!diplomat.zones.hand.includes(DIPLOMAT_PERSISTENT_CARDS.clemency)) throw new Error('Clemency is not in hand.');
  if (!game.players[opponentId].zones.graveyard.includes(cardId)) throw new Error('Choose a card in the opponent’s Graveyard.');
  removeOne(diplomat.zones.hand, DIPLOMAT_PERSISTENT_CARDS.clemency);
  diplomat.zones.discard.push(DIPLOMAT_PERSISTENT_CARDS.clemency);
  game.pendingDiplomatChoice = { kind: 'clemency', playerId: opponentId, diplomatId, cardId, options: ['release', 'leave'] };
  game.priorityPlayer = opponentId;
  log(game, diplomatId, 'clemency_played', `${diplomat.name} offered Clemency.`, { opponentId, cardId });
}

export function resolveClemency(game: GameState, opponentId: PlayerID, choice: 'release' | 'leave'): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'clemency' || pending.playerId !== opponentId) throw new Error('No Clemency choice is pending.');
  if (choice === 'release') {
    removeOne(game.players[opponentId].zones.graveyard, pending.cardId);
    game.players[opponentId].zones.discard.push(pending.cardId);
    gainFactionResource(game, pending.diplomatId, 'influence', 1, 'Clemency');
  } else draw(game, pending.diplomatId, 1);
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.activePlayer;
}

export function playDemilitarizedZone(game: GameState, diplomatId: PlayerID, spaceId: SpaceID): void {
  const diplomat = game.players[diplomatId];
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space || space.kind !== 'territory') throw new Error('Demilitarized Zone must be played on a Territory.');
  if (!diplomat.zones.hand.includes(DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone)) throw new Error('Demilitarized Zone is not in hand.');
  removeOne(diplomat.zones.hand, DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone);
  space.overlays ??= [];
  space.overlays.push({ cardId: DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone, owner: diplomatId, faceUp: true });
  for (const playerId of Object.keys(game.players)) if (space.occupant === playerId) withdrawFrom(game, playerId, space.index);
  log(game, diplomatId, 'demilitarized_zone_played', `${diplomat.name} established a Demilitarized Zone.`, { spaceId, placedTurn: game.turn });
}

function withdrawFrom(game: GameState, playerId: PlayerID, fromIndex: number): void {
  const current = game.board.spaces.find((space) => space.occupant === playerId);
  const candidates = game.board.spaces.filter((space) => Math.abs(space.index - fromIndex) === 1 && !space.occupant);
  const destination = candidates.find((space) => space.controller === playerId) ?? candidates[0];
  if (!current || !destination) return;
  delete current.occupant;
  destination.occupant = playerId;
  game.players[playerId].occupiedSpaceId = destination.id;
}

export function isDemilitarized(game: GameState, spaceId: SpaceID): boolean {
  return Boolean(game.board.spaces.find((space) => space.id === spaceId)?.overlays?.some((overlay) => overlay.cardId === DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone));
}

export function canCaptureSpace(game: GameState, spaceId: SpaceID): boolean {
  return !isDemilitarized(game, spaceId);
}

export function requireDemilitarizedEntryCost(game: GameState, playerId: PlayerID, spaceId: SpaceID, discardedCardId?: CardID): void {
  if (!isDemilitarized(game, spaceId)) return;
  const player = game.players[playerId];
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId)!;
  const placed = [...game.log].reverse().find((event) => event.type === 'demilitarized_zone_played' && (event.payload as { spaceId?: string })?.spaceId === spaceId);
  if (placed?.turn === game.turn) throw new Error('Neither player may enter this Territory during the turn Demilitarized Zone is placed.');
  if (space.occupant) return;
  if (!discardedCardId || !player.zones.hand.includes(discardedCardId)) throw new Error('Entering an unoccupied Demilitarized Zone requires discarding one card.');
  removeOne(player.zones.hand, discardedCardId);
  player.zones.discard.push(discardedCardId);
}

export function resolveDemilitarizedZoneBattle(game: GameState, spaceId: SpaceID): void {
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  const overlay = space?.overlays?.find((candidate) => candidate.cardId === DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone);
  if (!space || !overlay) return;
  space.overlays = space.overlays!.filter((candidate) => candidate !== overlay);
  game.players[overlay.owner].zones.discard.push(overlay.cardId);
}

export function openDemilitarizedZoneUpkeep(game: GameState, playerId: PlayerID): boolean {
  const space = game.board.spaces.find((candidate) => candidate.occupant === playerId && isDemilitarized(game, candidate.id));
  if (!space) return false;
  const overlay = space.overlays!.find((candidate) => candidate.cardId === DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone)!;
  game.pendingDiplomatChoice = { kind: 'demilitarized_zone_upkeep', playerId, diplomatId: overlay.owner, spaceId: space.id, options: ['discard', 'withdraw'] };
  game.priorityPlayer = playerId;
  return true;
}

export function resolveDemilitarizedZoneUpkeep(game: GameState, playerId: PlayerID, choice: 'discard' | 'withdraw', cardId?: CardID): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'demilitarized_zone_upkeep' || pending.playerId !== playerId) throw new Error('No Demilitarized Zone upkeep is pending.');
  if (choice === 'discard') {
    if (!cardId || !game.players[playerId].zones.hand.includes(cardId)) throw new Error('Choose a card to discard.');
    removeOne(game.players[playerId].zones.hand, cardId);
    game.players[playerId].zones.discard.push(cardId);
  } else {
    const space = game.board.spaces.find((candidate) => candidate.id === pending.spaceId)!;
    withdrawFrom(game, playerId, space.index);
  }
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.activePlayer;
}

export function bankSanctionAfterRefusal(game: GameState, diplomatId: PlayerID, opponentId: PlayerID, cardId: CardID, spaceId?: SpaceID): void {
  const diplomat = game.players[diplomatId];
  const valid = [DIPLOMAT_PERSISTENT_CARDS.censure, DIPLOMAT_PERSISTENT_CARDS.embargo, DIPLOMAT_PERSISTENT_CARDS.blockade];
  if (!valid.includes(cardId as typeof valid[number]) || !diplomat.zones.hand.includes(cardId)) throw new Error('That Sanction cannot be applied.');
  if (cardId === DIPLOMAT_PERSISTENT_CARDS.blockade) {
    const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
    if (!space || !space.revealed || space.controller !== opponentId || space.kind !== 'territory') throw new Error('Blockade requires a revealed Territory the opponent controls.');
    removeOne(diplomat.zones.hand, cardId);
    space.overlays ??= [];
    space.overlays.push({ cardId, owner: diplomatId, faceUp: true });
    addSanction(game, { cardId, diplomatId, opponentId, territoryId: space.territoryId, spaceId });
  } else {
    removeOne(diplomat.zones.hand, cardId);
    diplomat.zones.assetBank.push(cardId);
    addSanction(game, { cardId, diplomatId, opponentId });
  }
  log(game, diplomatId, 'sanction_applied', `${diplomat.name} applied ${cardId}.`, { opponentId, spaceId });
}

export function effectiveAssetBankLimit(game: GameState, playerId: PlayerID): number {
  const embargoes = Object.values(game.players).flatMap((player) => player.diplomats?.sanctionStates ?? []).filter((sanction) => sanction.opponentId === playerId && sanction.cardId === DIPLOMAT_PERSISTENT_CARDS.embargo).length;
  return Math.max(game.players[playerId].controlledTerritories.length - embargoes, 0);
}

export function openCensureChoiceAfterAction(game: GameState, opponentId: PlayerID): boolean {
  const sanction = Object.values(game.players).flatMap((player) => player.diplomats?.sanctionStates ?? []).find((candidate) => candidate.opponentId === opponentId && candidate.cardId === DIPLOMAT_PERSISTENT_CARDS.censure && candidate.censureLastTriggeredTurn !== game.turn);
  if (!sanction) return false;
  sanction.censureLastTriggeredTurn = game.turn;
  game.pendingDiplomatChoice = { kind: 'censure', playerId: opponentId, diplomatId: sanction.diplomatId, options: ['discard', 'diplomat_draw'] };
  game.priorityPlayer = opponentId;
  return true;
}

export function resolveCensure(game: GameState, opponentId: PlayerID, choice: 'discard' | 'diplomat_draw', cardId?: CardID): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'censure' || pending.playerId !== opponentId) throw new Error('No Censure choice is pending.');
  if (choice === 'discard') {
    if (!cardId || !game.players[opponentId].zones.hand.includes(cardId)) throw new Error('Choose a card to discard.');
    removeOne(game.players[opponentId].zones.hand, cardId);
    game.players[opponentId].zones.discard.push(cardId);
  } else draw(game, pending.diplomatId, 1);
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.activePlayer;
}

export function openBlockadeMovementChoice(game: GameState, playerId: PlayerID, spaceId: SpaceID): boolean {
  const sanction = Object.values(game.players).flatMap((player) => player.diplomats?.sanctionStates ?? []).find((candidate) => candidate.opponentId === playerId && candidate.cardId === DIPLOMAT_PERSISTENT_CARDS.blockade && candidate.spaceId === spaceId);
  if (!sanction) return false;
  game.pendingDiplomatChoice = { kind: 'sanction_movement', playerId, diplomatId: sanction.diplomatId, cardId: sanction.cardId, spaceId, options: ['discard', 'influence'] };
  game.priorityPlayer = playerId;
  return true;
}

export function resolveBlockadeMovement(game: GameState, playerId: PlayerID, choice: 'discard' | 'influence', cardId?: CardID): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'sanction_movement' || pending.playerId !== playerId) throw new Error('No Blockade movement choice is pending.');
  if (choice === 'discard') {
    if (!cardId || !game.players[playerId].zones.hand.includes(cardId)) throw new Error('Choose a card to discard.');
    removeOne(game.players[playerId].zones.hand, cardId);
    game.players[playerId].zones.discard.push(cardId);
  } else gainFactionResource(game, pending.diplomatId, 'influence', 1, 'Sanctions: Blockade');
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.activePlayer;
}

export function removeSanctionsAfterAcceptedTerms(game: GameState, diplomatId: PlayerID, opponentId: PlayerID): void {
  for (const sanction of [...sanctions(game, diplomatId)]) if (sanction.opponentId === opponentId) removeSanction(game, diplomatId, sanction);
}

export function removeBlockadesAfterControlChange(game: GameState): void {
  for (const diplomat of Object.values(game.players).filter((player) => player.factionId === 'diplomats')) {
    for (const sanction of [...(diplomat.diplomats?.sanctionStates ?? [])]) {
      if (sanction.cardId !== DIPLOMAT_PERSISTENT_CARDS.blockade || !sanction.spaceId) continue;
      const space = game.board.spaces.find((candidate) => candidate.id === sanction.spaceId);
      if (!space || space.controller !== sanction.opponentId) removeSanction(game, diplomat.id, sanction);
    }
  }
}

export function bankableAssetCards(game: GameState, playerId: PlayerID): CardID[] {
  return game.players[playerId].zones.hand.filter((cardId) => destinationForCardPlay(cardId, 'hand') === 'asset_bank');
}
