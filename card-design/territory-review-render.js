await (async () => {
  const CANONICAL_SOURCE = '/artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json';
  const territoryId = new URLSearchParams(window.location.search).get('territory');
  const inspectionRender = new URLSearchParams(window.location.search).get('inspection') === '1';
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
    const response = await fetch(CANONICAL_SOURCE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Unable to load canonical Territories (HTTP ${response.status}).`);
    const canonical = await response.json();
    const territory = (canonical.territories || []).find(item => item.id === territoryId);
    if (!territory) throw new Error(`Unknown Territory: ${territoryId}`);

    const preview = {
      id: territory.id,
      kind: 'territory',
      name: territory.name,
      arena: Boolean(territory.arena),
      complexity: territory.complexity || 'Basic',
      watchlist: territory.watchlist || 'None',
      status: territory.status || 'Approved',
      text: String(territory.text || '').trim(),
      source: territory.source || CANONICAL_SOURCE,
      artDirection: territory.artDirection,
    };
    window.GAUNTLET_TTS_CATALOG = {
      schemaVersion: 1,
      gameVersion: 'v0.6.3',
      sourceHierarchy: [CANONICAL_SOURCE],
      territories: [preview],
    };

    await loadScript('/tts/artwork-direction-overrides.js');
    await loadScript('/tts/artwork-crop.js');
    await loadScript('/tts/territory-renderer/territory-renderer.js');

    // Dynamic loading may finish after the document's native load event. Replay
    // it once in that case so the shared Territory fitting/cropping lifecycle runs.
    if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
    await waitFor(() => document.body.dataset.renderReady === 'true');
    installEmbeddedBridges();
  } catch (error) {
    if (target) target.textContent = error.message;
    document.body.dataset.renderReady = 'error';
    console.error(error);
  }
})();
