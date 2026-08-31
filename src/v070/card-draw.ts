import {
  V070GameActionError,
  appendV070Event,
  deterministicV070Shuffle,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export interface V070DrawResult {
  drawn: string[];
  reshuffles: number;
  exhausted: boolean;
}

export function drawV070Cards(
  state: V070GameState,
  playerId: PlayerId,
  count: number,
  purpose: string,
): V070DrawResult {
  if (!Number.isInteger(count) || count < 0) {
    throw new V070GameActionError('Draw count must be a nonnegative integer.');
  }

  const player = state.players[playerId];
  const drawn: string[] = [];
  let reshuffles = 0;

  while (drawn.length < count) {
    if (player.zones.drawPile.length === 0) {
      if (player.zones.discardPile.length === 0) break;

      player.reshuffleCount += 1;
      player.zones.drawPile = deterministicV070Shuffle(
        player.zones.discardPile,
        `${state.seed}:${playerId}:reshuffle:${player.reshuffleCount}`,
      );
      player.zones.discardPile = [];
      reshuffles += 1;

      appendV070Event(state, {
        type: 'discard_reshuffled',
        actor: playerId,
        visibility: 'public',
        payload: {
          reshuffleCount: player.reshuffleCount,
          cardCount: player.zones.drawPile.length,
          purpose,
        },
      });
    }

    const instanceId = player.zones.drawPile.shift();
    if (!instanceId) break;
    drawn.push(instanceId);
  }

  return {
    drawn,
    reshuffles,
    exhausted: drawn.length < count,
  };
}
