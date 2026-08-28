import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
