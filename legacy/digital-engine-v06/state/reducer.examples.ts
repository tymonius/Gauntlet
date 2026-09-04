import { exampleGame } from './examples';
import { applyGameAction } from './reducer';

const afterDraw = applyGameAction(exampleGame, {
  type: 'draw_card',
  playerId: 'player_1',
}).state;

export const exampleAfterReveal = applyGameAction(afterDraw, {
  type: 'reveal_space',
  playerId: 'player_1',
  spaceId: 'space-1',
}).state;
