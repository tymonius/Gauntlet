import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCurrentGameAuthority as validateSharedCurrentGameAuthority } from '../game-data/current-game-validation.mjs';
import { validateAuthorityEmbeddedFacts } from '../rulebook/player-facing/rule-facts.js';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CURRENT_GAME_AUTHORITY_SOURCE = 'game-data/current-game.json';

let authorityPromise = null;

export function validateCurrentGameAuthority(authority) {
  validateSharedCurrentGameAuthority(authority);
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
