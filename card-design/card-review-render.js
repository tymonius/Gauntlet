await (async () => {
  const CANONICAL_SOURCE = '/artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json';
  const ART_EXTENSIONS = ['png', 'jpg', 'webp', 'jpeg'];
  const cardId = new URLSearchParams(window.location.search).get('card');
  const target = document.getElementById('renderTarget');

  function slugify(value) {
    return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

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

  async function resolveArtwork(card, faction) {
    const stem = `/images/artwork/cards/${faction}/${slugify(card.name)}`;
    for (const extension of ART_EXTENSIONS) {
      const src = `${stem}.${extension}`;
      if (await imageExists(src)) return src.replace(/^\//, '');
    }
    return null;
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
    const card = (canonical.cards || []).find(item => item.id === cardId);
    if (!card) throw new Error(`Unknown card: ${cardId}`);
    const faction = slugify(card.allegiance);
    const artwork = await resolveArtwork(card, faction);
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
