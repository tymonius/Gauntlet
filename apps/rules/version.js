import { loadCurrentGame } from '/game-data/current-game.mjs';

try {
  const currentGame = await loadCurrentGame();
  const version = currentGame.displayVersion || currentGame.version || 'current development';
  document.querySelectorAll('[data-current-version]').forEach((badge) => {
    badge.textContent = version;
  });
} catch (error) {
  console.error('Could not load current rules authority version.', error);
}
