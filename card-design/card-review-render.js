import { resolveFirstArtwork, slugify } from './card-artwork-resolver.js';
import { normalizePrintArtworkSource } from './print-artwork-normalizer.js';
import { loadCurrentGame } from '../game-data/current-game.mjs';

await (async () => {
  const params = new URLSearchParams(window.location.search);
  const cardId = params.get('card');
  const productionFit = params.get('fit') === 'production';
  const versionOverride = String(params.get('version') || '').trim();
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

  async function loadCardFonts(card) {
    if (!document.fonts?.load) {
      if (productionFit) throw new Error('This browser cannot verify the production card fonts.');
      return;
    }

    const titleSample = String(card?.name || 'Gauntlet');
    const rulesSample = (card?.effects || [])
      .map(effect => `${String(effect?.label || '')} ${String(effect?.text || '')}`)
      .join(' ')
      .trim() || 'Gauntlet';
    const requests = [
      ['400 12.1pt "p22-1722-pro"', titleSample],
      ['400 7.05pt "adobe-caslon-pro"', rulesSample],
      ['700 7.05pt "adobe-caslon-pro"', rulesSample],
    ];

    const results = await Promise.all(requests.map(async ([font, sample]) => {
      try {
        return await document.fonts.load(font, sample);
      } catch (error) {
        console.warn(`Unable to preload card font ${font}.`, error);
        return [];
      }
    }));

    try {
      await document.fonts.ready;
    } catch (error) {
      console.warn('Card fonts did not report ready before rendering.', error);
    }

    if (productionFit && results.some(faces => !faces.length)) {
      throw new Error('One or more production card fonts failed to load.');
    }
    document.body.dataset.renderFontsReady = 'true';
  }

  async function resolveDisplayVersion(currentGame) {
    return currentGame.displayVersion;
  }

  try {
    if (!cardId) throw new Error('No card selected.');

    const currentGame = await loadCurrentGame();
    const sourceCard = currentGame.findCard(cardId);
    if (!sourceCard) throw new Error(`Unknown current card: ${cardId}`);

    const displayVersion = versionOverride || await resolveDisplayVersion(currentGame);
    const card = sourceCard;
    const faction = slugify(card.allegiance);
    const sourceArtwork = await resolveFirstArtwork(card, faction, imageExists);
    const artwork = await normalizePrintArtworkSource(sourceArtwork);
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
      source: currentGame.authorityUrl,
      artwork,
    };
    window.GAUNTLET_TTS_CATALOG = {
      schemaVersion: 1,
      gameVersion: displayVersion,
      sourceHierarchy: [currentGame.authorityUrl],
      playableCards: [preview],
      missingArtwork: artwork ? [] : [preview.id],
    };
    window.GAUNTLET_ART_DIRECTION = currentGame.artDirection;

    // Production layout is content-sensitive. Explicitly request the exact
    // display and reading faces before either shared renderer is allowed to
    // measure the card; FontFaceSet.ready alone can resolve before a newly
    // inserted card has caused those faces to be requested.
    await loadCardFonts(card);
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
