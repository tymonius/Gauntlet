(() => {
  const CSS_PIXELS_PER_INCH = 96;
  const CSS_PIXELS_PER_POINT = CSS_PIXELS_PER_INCH / 72;
  const HEIGHT_STEP = 1;
  const TITLE_STEP = 0.05 * CSS_PIXELS_PER_POINT;
  const RULE_SCALE_STEP = 0.01;
  const DEFAULT_MINIMUM_TITLE_SIZE = 8 * CSS_PIXELS_PER_POINT;
  const DEFAULT_MINIMUM_OVERLAY_TITLE_SIZE = 12.1 * CSS_PIXELS_PER_POINT;
  const DEFAULT_MINIMUM_RULE_SCALE = 0.93;
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

    const maximum = Number(card.dataset.artMax || 1.72) * CSS_PIXELS_PER_INCH;
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
    document.querySelectorAll('.gauntlet-card[data-art-max]').forEach(fitCard);
  }

  const LONG_CARD_REVIEW = Object.freeze([
    ['military-shock-and-awe', 'Shock and Awe'],
    ['financiers-margin-loan', 'Margin Loan'],
    ['diplomats-trade-concessions', 'Trade Concessions'],
    ['intelligence-sleeper-network', 'Sleeper Network'],
    ['intelligence-fog-of-war', 'Fog of War'],
    ['diplomats-nonbinding-resolution', 'Nonbinding Resolution'],
    ['military-reserve-force', 'Reserve Force'],
    ['mystics-spirit-hollow', 'Spirit Hollow'],
    ['diplomats-demilitarized-zone', 'Demilitarized Zone'],
    ['financiers-leveraged-buyout', 'Leveraged Buyout'],
    ['mystics-nature-s-altar', "Nature's Altar"],
    ['military-field-command', 'Field Command'],
  ]);

  function integrateLongCardReview() {
    const territorySection = document.querySelector('.territory-specimen-section');
    if (!territorySection || document.querySelector('.long-card-review-section')) return;

    const section = document.createElement('section');
    section.className = 'card-section long-card-review-section';
    section.setAttribute('aria-labelledby', 'long-card-review-title');
    section.innerHTML = `
      <div class="section-shell card-section-heading screen-only">
        <p class="section-label">v0.6.3 production check</p>
        <h2 id="long-card-review-title">Long-card render review</h2>
        <p>Manual visual review of the twelve longest or tightest v0.6.3 card faces. These specimens use the v0.6.3 production catalog and the shared production renderer; the embedded cards do not use the TTS emergency-fitting fallback.</p>
      </div>
      <div class="card-sheet long-card-review-grid">
        ${LONG_CARD_REVIEW.map(([id, name]) => `
          <div class="specimen-column">
            <p class="specimen-label screen-only"><strong>${name}</strong><span>v0.6.3 production</span></p>
            <iframe
              class="long-card-review-frame"
              src="long-card-render.html?fit=production&amp;card=${encodeURIComponent(id)}"
              title="${name} v0.6.3 production render"
              style="width:2.5in;height:3.5in;border:0;display:block;background:transparent;box-shadow:0 0.16in 0.36in var(--card-shadow);border-radius:0.12in"
            ></iframe>
          </div>`).join('')}
      </div>`;

    territorySection.before(section);
  }

  async function prepareCards() {
    integrateLongCardReview();

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (error) {
        console.warn('Card fonts did not report ready before fitting.', error);
      }
    }

    await Promise.all(Array.from(document.images).map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));

    await loadParchments();
    requestAnimationFrame(() => requestAnimationFrame(fitAllCards));
  }

  window.addEventListener('load', prepareCards);
  window.addEventListener('beforeprint', fitAllCards);
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fitAllCards, 120);
  });
})();
