import currentGame from '../../packages/game-data/current-game.json';
import type { V070MysticRiteId } from './engine';

/**
 * Names and package policy are checked against the CURRENT gameplay authority,
 * not historical three-Rite engine defaults. This helper does not claim that
 * all six printed Rite effects are executable yet.
 */
export const CURRENT_MYSTIC_RITE_IDS: readonly V070MysticRiteId[] =
  currentGame.mystics.rites.map(rite => rite.id as V070MysticRiteId);

export const LEGACY_STARTER_MYSTIC_RITE_IDS: readonly V070MysticRiteId[] =
  ['echoes', 'blood', 'crossing'];

export function selectV070MysticRitePackage(
  proposed?: readonly V070MysticRiteId[],
): V070MysticRiteId[] {
  const authority = currentGame.mystics;
  const pool = CURRENT_MYSTIC_RITE_IDS;
  const selectedCount = authority.selectionPolicy.selectedCount;
  if (pool.length !== authority.selectionPolicy.poolSize
    || new Set(pool).size !== pool.length) {
    throw new Error('Current Mystics six-Rite pool is invalid or contains duplicate IDs.');
  }
  const chosen = [...(proposed ?? LEGACY_STARTER_MYSTIC_RITE_IDS)];
  if (chosen.length !== selectedCount
    || new Set(chosen).size !== chosen.length
    || chosen.some(id => !pool.includes(id))) {
    throw new Error(
      `Mystics game package requires exactly ${selectedCount} different Rites from the current ${pool.length}-Rite pool.`,
    );
  }
  return chosen;
}

export function initialV070MysticRites(): Record<V070MysticRiteId, {
  status: 'incomplete';
  begunTurn: null;
  completedTurn: null;
  territoryInstanceId: null;
}> {
  return Object.fromEntries(CURRENT_MYSTIC_RITE_IDS.map(id => [id, {
    status: 'incomplete' as const,
    begunTurn: null,
    completedTurn: null,
    territoryInstanceId: null,
  }])) as ReturnType<typeof initialV070MysticRites>;
}
