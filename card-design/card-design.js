(() => {
  const CSS_PIXELS_PER_INCH = 96;
  const CSS_PIXELS_PER_POINT = CSS_PIXELS_PER_INCH / 72;
  const HEIGHT_STEP = 1;
  const TITLE_STEP = 0.05 * CSS_PIXELS_PER_POINT;
  const RULE_SCALE_STEP = 0.01;
  const DEFAULT_MINIMUM_TITLE_SIZE = 8 * CSS_PIXELS_PER_POINT;
  const DEFAULT_MINIMUM_OVERLAY_TITLE_SIZE = 12.1 * CSS_PIXELS_PER_POINT;
  const DEFAULT_MINIMUM_RULE_SCALE = 0.93;
  const LEGACY_DEFAULT_ART_MAX = 1.72;
  const DEFAULT_ART_MAX = 1.88;
  const PARCHMENT_SOURCES = Object.freeze({
    neutral: '../images/artwork/card-backgrounds/neutral-parchment-v2.png',
    military: '../images/artwork/card-backgrounds/military-parchment-v2.png',
    diplomats: '../images/artwork/card-backgrounds/diplomats-parchment-v2.png',
    financiers: '../images/artwork/card-backgrounds/financiers-parchment-v2.png',
    intelligence: '../images/artwork/card-backgrounds/intelligence-parchment-v2.png',
    mystics: '../images/artwork/card-backgrounds/mystics-parchment-v2.png',
    inquisition: '../images/artwork/card-backgrounds/inquisition-parchment-v2.png',
  });
  const parchmentPromises = new Map();
  let resizeTimer;
  const PRODUCTION_FONT_REQUESTS = Object.freeze([
    ['400 12px "p22-1722-pro"', 'Gauntlet'],
    ['400 12px "adobe-caslon-pro"', 'Gauntlet rules text'],
    ['700 12px "adobe-caslon-pro"', 'Gauntlet rules text'],
    ['italic 400 12px "adobe-caslon-pro"', 'Gauntlet reminder text'],
    ['400 12px "Inter"', 'Gauntlet interface label'],
    ['600 12px "Inter"', 'Gauntlet interface label'],
    ['700 12px "Inter"', 'Gauntlet interface label'],
    ['800 12px "Inter"', 'Gauntlet interface label'],
  ]);

  function forceLayout(element) {
    void element.offsetHeight;
  }

  function factionForCard(card) {
    const explicitFaction = card.dataset.faction?.trim().toLowerCase();
    if (explicitFaction && PARCHMENT_SOURCES[explicitFaction]) return explicitFaction;

    const classMappings = [
      ['neutral', ['neutral-card', 'faction-neutral']],
      ['military', ['military-card', 'faction-military']],
      ['diplomats', ['diplomat-card', 'diplomats-card', 'faction-diplomats']],
      ['financiers', ['financier-card', 'financiers-card', 'faction-financiers']],
      ['intelligence', ['intelligence-card', 'faction-intelligence']],
      ['mystics', ['mystic-card', 'mystics-card', 'faction-mystics']],
      ['inquisition', ['inquisition-card', 'faction-inquisition']],
    ];

    return classMappings.find(([, classes]) => classes.some(className => card.classList.contains(className)))?.[0]
      || 'neutral';
  }

  function preloadParchment(sourcePath) {
    const source = new URL(sourcePath, document.baseURI).href;
    return new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };

      image.addEventListener('load', () => finish(resolve, source), { once: true });
      image.addEventListener('error', () => {
        finish(reject, new Error(`Parchment image failed to load: ${source}`));
      }, { once: true });
      image.src = source;

      if (image.complete) {
        if (image.naturalWidth > 0) finish(resolve, source);
        else finish(reject, new Error(`Parchment image failed to load: ${source}`));
      }
    });
  }

  function parchmentUrlFor(faction) {
    if (!parchmentPromises.has(faction)) {
      parchmentPromises.set(faction, preloadParchment(PARCHMENT_SOURCES[faction]));
    }
    return parchmentPromises.get(faction);
  }

  async function loadParchments() {
    const cards = Array.from(document.querySelectorAll('.gauntlet-card'));
    await Promise.all(cards.map(async card => {
      const faction = factionForCard(card);
      try {
        const parchmentUrl = await parchmentUrlFor(faction);
        card.style.setProperty('--parchment-image', `url("${parchmentUrl}")`);
        card.dataset.parchmentLoaded = 'true';
        card.dataset.parchmentSource = faction;
        card.dataset.parchmentFallback = 'false';
      } catch (error) {
        card.dataset.parchmentLoaded = 'false';
        card.dataset.parchmentFallback = 'true';
        console.warn(`Using fallback parchment color for ${faction}.`, error);
      }
    }));
  }

  function setArtHeight(card, height) {
    card.querySelector('.card-interior')?.style.setProperty('--art-height', `${height}px`);
  }

  function setRuleScale(card, scale) {
    card.style.setProperty('--rules-scale', String(scale));
  }

  function minimumRuleScale(card) {
    const declared = Number.parseFloat(
      window.getComputedStyle(card).getPropertyValue('--minimum-rules-scale')
    );
    return Number.isFinite(declared) ? Math.max(declared, DEFAULT_MINIMUM_RULE_SCALE) : DEFAULT_MINIMUM_RULE_SCALE;
  }

  function maximumArtHeight(card) {
    const declared = Number.parseFloat(card.dataset.artMax);
    if (!Number.isFinite(declared)) return DEFAULT_ART_MAX * CSS_PIXELS_PER_INCH;
    const maximum = Math.abs(declared - LEGACY_DEFAULT_ART_MAX) < 0.001
      ? DEFAULT_ART_MAX
      : declared;
    return maximum * CSS_PIXELS_PER_INCH;
  }

  function elementOverflows(element) {
    return Boolean(element)
      && (element.scrollWidth > element.clientWidth + 0.5
        || element.scrollHeight > element.clientHeight + 0.5);
  }

  function cardOverflows(card) {
    const interior = card.querySelector('.card-interior');
    const rules = card.querySelector('.card-rules');
    const footer = card.querySelector('.card-footer');
    const overlayTitle = card.querySelector('.overlay-title');
    if (!interior || !rules || !footer) return false;

    const interiorRect = interior.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const footerPastFrame = footerRect.bottom > interiorRect.bottom + 0.5;
    const rulesClip = rules.scrollHeight > rules.clientHeight + 0.5;
    const frameClip = interior.scrollHeight > interior.clientHeight + 0.5;

    return footerPastFrame || rulesClip || frameClip || elementOverflows(overlayTitle);
  }

  function fitTitle(card) {
    const title = card.querySelector('.card-title');
    if (!title) return true;

    title.style.removeProperty('font-size');
    forceLayout(title);

    let size = Number.parseFloat(window.getComputedStyle(title).fontSize);
    const minimum = Number(card.dataset.titleMin || DEFAULT_MINIMUM_TITLE_SIZE / CSS_PIXELS_PER_POINT)
      * CSS_PIXELS_PER_POINT;

    while (title.scrollWidth > title.clientWidth + 0.5 && size > minimum) {
      size = Math.max(minimum, size - TITLE_STEP);
      title.style.fontSize = `${size}px`;
      forceLayout(title);
    }

    const fits = title.scrollWidth <= title.clientWidth + 0.5;
    card.classList.toggle('title-fit-warning', !fits);
    card.dataset.titleFit = fits ? 'true' : 'false';
    return fits;
  }

  function fitOverlayTitle(card) {
    const title = card.querySelector('.overlay-title');
    if (!title) {
      card.classList.remove('overlay-title-fit-warning');
      delete card.dataset.overlayTitleFit;
      return true;
    }

    title.style.removeProperty('font-size');
    forceLayout(title);

    let size = Number.parseFloat(window.getComputedStyle(title).fontSize);
    const minimum = Number(
      card.dataset.overlayTitleMin
        || DEFAULT_MINIMUM_OVERLAY_TITLE_SIZE / CSS_PIXELS_PER_POINT,
    ) * CSS_PIXELS_PER_POINT;

    while (elementOverflows(title) && size > minimum) {
      size = Math.max(minimum, size - TITLE_STEP);
      title.style.fontSize = `${size}px`;
      forceLayout(title);
    }

    const fits = !elementOverflows(title);
    card.classList.toggle('overlay-title-fit-warning', !fits);
    card.dataset.overlayTitleFit = fits ? 'true' : 'false';
    return fits;
  }

  function fitCard(card) {
    const interior = card.querySelector('.card-interior');
    const art = card.querySelector('.card-art');
    if (!interior || !art) return;

    card.classList.remove('fit-warning');
    const titleFits = fitTitle(card);
    fitOverlayTitle(card);

    const maximum = maximumArtHeight(card);
    const minimum = Number(card.dataset.artMin || 0.62) * CSS_PIXELS_PER_INCH;
    let height = maximum;
    let ruleScale = 1;

    setRuleScale(card, ruleScale);
    setArtHeight(card, height);
    forceLayout(interior);

    /* Preserve the largest possible illustration before touching typography. */
    while (cardOverflows(card) && height > minimum) {
      height = Math.max(minimum, height - HEIGHT_STEP);
      setArtHeight(card, height);
      forceLayout(interior);
    }

    /* Typography may compact only to the print-legibility floor. Cards that
       still do not fit require a different layout rather than microscopic type. */
    const minimumScale = minimumRuleScale(card);
    while (cardOverflows(card) && ruleScale > minimumScale) {
      ruleScale = Math.max(minimumScale, ruleScale - RULE_SCALE_STEP);
      setRuleScale(card, Number(ruleScale.toFixed(2)));
      forceLayout(interior);
    }

    if (!titleFits || cardOverflows(card)) {
      card.classList.add('fit-warning');
      console.warn(`Card content still exceeds the available area: ${card.getAttribute('aria-label') || 'unnamed card'}`);
    }
  }

  function fitAllCards() {
    document.querySelectorAll('.gauntlet-card[data-art-max]:not(.card-inspection-clone)').forEach(fitCard);
  }

  async function loadProductionFonts() {
    if (!document.fonts?.load) {
      document.body.dataset.productionFontsReady = 'false';
      document.body.dataset.productionFontError = 'CSS Font Loading API unavailable.';
      return false;
    }

    try {
      const loaded = await Promise.all(
        PRODUCTION_FONT_REQUESTS.map(([font, sample]) => document.fonts.load(font, sample))
      );
      await document.fonts.ready;
      const missing = PRODUCTION_FONT_REQUESTS
        .filter((_, index) => !loaded[index].length)
        .map(([font]) => font);
      if (missing.length) {
        document.body.dataset.productionFontsReady = 'false';
        document.body.dataset.productionFontError = `Missing production fonts: ${missing.join('; ')}`;
        console.warn(document.body.dataset.productionFontError);
        return false;
      }
      document.body.dataset.productionFontsReady = 'true';
      delete document.body.dataset.productionFontError;
      return true;
    } catch (error) {
      document.body.dataset.productionFontsReady = 'false';
      document.body.dataset.productionFontError = error instanceof Error ? error.message : String(error);
      console.warn('Production card fonts failed to load before fitting.', error);
      return false;
    }
  }

  async function prepareCards() {
    await loadProductionFonts();

    await Promise.all(Array.from(document.images).map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));

    await loadParchments();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fitAllCards();
    }));
  }

  window.addEventListener('load', prepareCards);
  window.addEventListener('beforeprint', fitAllCards);
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      fitAllCards();
    }, 120);
  });
})();