import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAuthorityEmbeddedFacts } from '../rulebook/player-facing/rule-facts.js';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CURRENT_GAME_AUTHORITY_SOURCE = 'game-data/current-game.json';

let authorityPromise = null;

export function validateCurrentGameAuthority(authority) {
  if (authority?.schemaVersion !== 2 || authority?.authority !== 'current-game') {
    throw new Error('Invalid complete current-game authority.');
  }
  if (!authority.version || !authority.gameplay || !authority.provenance) {
    throw new Error('Current-game authority is missing version, gameplay, or provenance.');
  }
  for (const forbidden of ['sources', 'resolution', 'baseVersion', 'factionOverrides']) {
    if (Object.prototype.hasOwnProperty.call(authority, forbidden)) {
      throw new Error(`Current-game authority still exposes transitional field ${forbidden}.`);
    }
  }
  const mystics = authority.mystics;
  const selectedCount = Number(mystics?.selectionPolicy?.selectedCount);
  const riteIds = new Set((mystics?.rites || []).map(rite => rite?.id).filter(Boolean));
  if (Number.isInteger(selectedCount) && selectedCount > 0) {
    for (const deck of authority.starterDecks?.decks || []) {
      if (deck.factionId !== 'mystics') continue;
      const selected = Array.isArray(deck.selectedRites) ? deck.selectedRites : [];
      const order = Array.isArray(deck.recommendedRiteOrder) ? deck.recommendedRiteOrder : [];
      const selectedSorted = [...selected].sort();
      const orderSorted = [...order].sort();
      if (
        selected.length !== selectedCount
        || new Set(selected).size !== selected.length
        || selected.some(id => !riteIds.has(id))
        || order.length !== selected.length
        || new Set(order).size !== order.length
        || selectedSorted.some((id, index) => id !== orderSorted[index])
      ) {
        throw new Error(`Invalid Mystics starter Rite package for ${deck.id || 'unknown starter'}.`);
      }
    }
  }
  validateAuthorityEmbeddedFacts(authority);
  return authority;
}

export async function loadCurrentGameAuthority() {
  if (!authorityPromise) {
    authorityPromise = readFile(resolve(ROOT, CURRENT_GAME_AUTHORITY_SOURCE), 'utf8')
      .then(JSON.parse)
      .then(validateCurrentGameAuthority)
      .catch(error => {
        authorityPromise = null;
        throw error;
      });
  }
  return authorityPromise;
}
