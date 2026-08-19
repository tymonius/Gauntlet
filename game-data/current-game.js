(() => {
  let modulePromise = null;

  const module = () => {
    if (!modulePromise) modulePromise = import('/game-data/current-game.mjs');
    return modulePromise;
  };

  window.GAUNTLET_CURRENT_GAME = Object.freeze({
    authorityUrl: '/game-data/current-game.json',
    load: () => module().then(current => current.loadCurrentGame()),
    slugify: value => String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  });
})();
