import { loadRenderContext } from './render-context.mjs';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), { once: true });
    document.body.append(script);
  });
}

try {
  const catalog = window.GAUNTLET_TTS_CATALOG;
  if (!catalog?.playableCards?.length) throw new Error('Long-card review catalog is unavailable.');

  const renderContext = await loadRenderContext();
  window.GAUNTLET_ART_DIRECTION = renderContext.artDirection || {};
  for (const card of catalog.playableCards) {
    card.artDirection = renderContext.artDirectionFor(card.id);
  }

  await loadScript('/card-design/artwork-crop.js');
  await loadScript('/card-design/playable-card-renderer.js');
  await loadScript('/card-design/card-design.js');

  if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
} catch (error) {
  document.body.dataset.renderReady = 'error';
  document.body.dataset.renderErrorMessage = error?.message || String(error);
  console.error(error);
}
