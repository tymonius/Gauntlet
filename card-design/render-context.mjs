import { loadCurrentGame } from '../game-data/current-game.mjs';

let renderContextPromise = null;

function freezeContext(game) {
  const context = {
    game,
    gameplayAuthorityUrl: game.authorityUrl,
    visualAuthorityUrl: game.visualAuthorityUrl || '/game-data/current-game.json',
    displayVersion: game.displayVersion,
    componentContract: game.componentContract,
    visualPolicy: game.visualPolicy,
    artDirection: game.artDirection,
    artDirectionFor(id) {
      return game.artDirectionFor(id);
    },
  };
  return Object.freeze(context);
}


export function loadRenderContext() {
  if (!renderContextPromise) {
    // loadCurrentGame() already resolves the requested rules= mode and uses the
    // Deckbuilder production authority bridge when present.
    renderContextPromise = loadCurrentGame()
      .then(freezeContext)
      .catch(error => {
        renderContextPromise = null;
        throw error;
      });
  }
  return renderContextPromise;
}

export async function loadRenderGame() {
  return (await loadRenderContext()).game;
}
