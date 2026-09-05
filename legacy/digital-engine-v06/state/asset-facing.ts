import type { CardID, PlayerState } from '../types/v06';

export {
  faceDownAssetCount,
  faceUpAssetCopies,
  faceUpAssetCount,
} from '../effects/asset-policy';

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

/** Removes stale face-down markers for cards no longer in the Asset Bank. */
export function reconcileFaceDownAssets(player: PlayerState): void {
  const remaining = [...player.zones.assetBank];
  const reconciled: CardID[] = [];
  for (const cardId of player.faceDownAssets ?? []) {
    if (!removeOne(remaining, cardId)) continue;
    reconciled.push(cardId);
  }
  player.faceDownAssets = reconciled.length > 0 ? reconciled : undefined;
}
