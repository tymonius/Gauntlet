import type { CardID, PlayerState } from '../types';

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

/** Counts only physical banked Assets that are currently face up. */
export function faceUpAssetCount(player: PlayerState): number {
  const remaining = [...player.zones.assetBank];
  let faceDown = 0;
  for (const cardId of player.faceDownAssets ?? []) {
    if (removeOne(remaining, cardId)) faceDown += 1;
  }
  return Math.max(0, player.zones.assetBank.length - faceDown);
}

export function faceDownAssetCount(player: PlayerState, cardId?: CardID): number {
  const remaining = [...player.zones.assetBank];
  let count = 0;
  for (const candidate of player.faceDownAssets ?? []) {
    if (!removeOne(remaining, candidate)) continue;
    if (!cardId || candidate === cardId) count += 1;
  }
  return count;
}

export function faceUpAssetCopies(player: PlayerState, cardId: CardID): number {
  const total = player.zones.assetBank.filter((candidate) => candidate === cardId).length;
  return Math.max(0, total - faceDownAssetCount(player, cardId));
}
