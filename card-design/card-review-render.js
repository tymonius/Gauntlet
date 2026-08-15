import { resolveFirstArtwork, slugify } from './card-artwork-resolver.js';
import { normalizeV063CardForPresentation } from './v063-card-heading-normalizer.js';

await (async () => {
  const CANONICAL_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
  const cardId = new URLSearchParams(window.location.search).get('card');
  const target = document.getElementById('renderTarget');

  function sectionsFromEffects(effects) {
    const sections = {};
    for (const effect of effects || []) {
      const label = String(effect?.label || '').trim();
      const text = String(effect?.text || '').trim();
      if (!label || !text) continue;
      sections[label] = sections[label] ? `${sections[label]}\n${text}` : text;
    }
    return sections;
  }

  function imageExists(src) {
    return new Promise(resolve => {
      const image = new Image();
      image.addEventListener('load', () => resolve(true), { once: true });
      image.addEventListener('error', () => resolve(false), { once: true });
      image.src = src;
    });
  }

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
    if (!cardId) throw new Error('No card selected.');
    const response = await fetch(CANONICAL_SOURCE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Unable to load canonical cards (HTTP ${response.status}).`);
    const canonical = await response.json();
    const sourceCard = (canonical.cards || []).find(item => item.id === cardId);
    if (!sourceCard) throw new Error(`Unknown card: ${cardId}`);
    const card = normalizeV063CardForPresentation(sourceCard);
    const faction = slugify(card.allegiance);
    const artwork = await resolveFirstArtwork(card, faction, imageExists);
    const preview = {
      id: card.id,
      kind: 'playable',
      name: card.name,
      faction,
      factionLabel: card.allegiance,
      cost: Number(card.cost),
      complexity: card.complexity || 'Unspecified',
      trait: card.trait || '',
      form: card.card_form || '',
      unique: Boolean(card.unique),
      sections: sectionsFromEffects(card.effects),
      source: card.v063_source || card.source || CANONICAL_SOURCE,
      artwork,
    };
    window.GAUNTLET_TTS_CATALOG = {
      schemaVersion: 1,
      gameVersion: 'v0.6.3',
      sourceHierarchy: [CANONICAL_SOURCE],
      playableCards: [preview],
      missingArtwork: artwork ? [] : [preview.id],
    };

    await loadScript('/tts/artwork-direction-overrides.js');
    await loadScript('/tts/artwork-crop.js');
    await loadScript('/tts/renderer/renderer.js');
    await loadScript('/card-design/card-design.js');

    // Dynamic loading may finish after the document's native load event. Replay
    // it once in that case so the shared fitting/cropping/inspection lifecycle
    // runs exactly as it does on the production render surface.
    if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
  } catch (error) {
    if (target) target.textContent = error.message;
    document.body.dataset.renderReady = 'error';
    console.error(error);
  }
})();