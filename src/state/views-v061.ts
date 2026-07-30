import type { GameState, PlayerID, PrivateGameView, PublicGameView } from '../types';
import { toV061PublicBattleView } from './battle-v061';
import { toPrivateGameView, toPublicGameView } from './views';

export function toPublicV061GameView(game: GameState): PublicGameView {
  const view = toPublicGameView(game);
  return {
    ...view,
    battleV061: game.battleV061 ? toV061PublicBattleView(game.battleV061) : undefined,
  };
}

export function toPrivateV061GameView(game: GameState, viewer: PlayerID): PrivateGameView {
  const view = toPrivateGameView(game, viewer);
  return {
    ...view,
    battleV061: game.battleV061 ? toV061PublicBattleView(game.battleV061, viewer) : undefined,
  };
}
