import { loadCurrentGame } from '../game-data/current-game.mjs';
import { mergeArtDirectionDrafts } from './art-direction-drafts.mjs';

await (async () => {
  const params = new URLSearchParams(window.location.search);
  const territoryId = params.get('territory');
  const inspectionRender = params.get('inspection') === '1';
  const versionOverride = String(params.get('version') || '').trim();
  const target = document.getElementById('renderTarget');

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), { once: true });
      document.body.append(script);
    });
  }

  async function waitFor(predicate, timeoutMs = 30000) {
    const started = performance.now();
    while (!predicate()) {
      if (performance.now() - started > timeoutMs) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }

  function installEmbeddedBridges() {
    if (window.self === window.top) return;
    const card = target?.querySelector('.territory-card');
    if (!card) return;
    const label = card.getAttribute('aria-label')
      || card.querySelector('.territory-title')?.textContent?.trim()
      || 'Gauntlet Territory';

    if (!inspectionRender) {
      card.classList.add('card-inspectable');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-haspopup', 'dialog');
      card.title = 'Open enlarged card view';
      const openCard = () => window.parent.postMessage({
        type: 'gauntlet-territory-inspect',
        href: window.location.href,
        label,
      }, window.location.origin);
      card.addEventListener('click', event => {
        if (event.button !== 0) return;
        openCard();
      });
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openCard();
      });
    }

    const image = card.querySelector('.territory-art img:not([hidden])');
    const frame = image?.closest('.territory-art');
    if (!image || !frame || !(image.currentSrc || image.src)) return;
    frame.classList.add('art-inspectable');
    frame.tabIndex = 0;
    frame.setAttribute('role', 'button');
    frame.setAttribute('aria-haspopup', 'dialog');
    frame.setAttribute('aria-label', `View full uncropped artwork for ${label}`);
    frame.title = 'View full uncropped artwork';
    const openArtwork = () => window.parent.postMessage({
      type: 'gauntlet-territory-art-inspect',
      source: image.currentSrc || image.src,
      label,
    }, window.location.origin);
    frame.addEventListener('click', event => {
      if (event.button !== 0) return;
      event.stopPropagation();
      openArtwork();
    });
    frame.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      openArtwork();
    });
  }

  try {
    if (!territoryId) throw new Error('No Territory selected.');
    const currentGame = await loadCurrentGame();
    const territory = currentGame.findTerritory(territoryId);
    if (!territory) throw new Error(`Unknown current Territory: ${territoryId}`);

    const preview = {
      id: territory.id,
      kind: 'territory',
      name: territory.name,
      arena: Boolean(territory.arena),
      complexity: territory.complexity || 'Unspecified',
      watchlist: territory.watchlist || 'None',
      status: territory.status || 'Current candidate',
      text: String(territory.text || '').trim(),
      source: currentGame.authorityUrl,
      artDirection: currentGame.artDirectionFor(territory.id) || territory.artDirection,
    };
    window.GAUNTLET_TTS_CATALOG = {
      schemaVersion: 1,
      gameVersion: versionOverride || currentGame.displayVersion,
      sourceHierarchy: [currentGame.authorityUrl],
      territories: [preview],
    };
    window.GAUNTLET_ART_DIRECTION = mergeArtDirectionDrafts(currentGame.artDirection || {});
    document.body.dataset.artDirectionDraftsApplied = 'true';

    await loadScript('/tts/artwork-crop.js');
    await loadScript('/tts/territory-renderer/territory-renderer.js');

    if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
    await waitFor(() => document.body.dataset.renderReady === 'true');
    installEmbeddedBridges();
  } catch (error) {
    if (target) target.textContent = error.message;
    document.body.dataset.renderReady = 'error';
    console.error(error);
  }
})();