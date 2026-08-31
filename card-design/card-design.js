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
  const INSPECTION_MAX_SCALE = 2.4;
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
  let inspectionDialog;
  let inspectionStage;
  let inspectionSource;
  let inspectionSubject;
  let inspectionWidth = 0;
  let inspectionHeight = 0;
  let inspectionMessageBound = false;
  let inspectionLabelText = 'Gauntlet card';
  let artworkInspectionOpen = false;
  let artworkInspectionTrigger;

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
    if (document.body?.classList.contains('developer-catalog-page')) return;
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

  function inspectionLabel(card) {
    return card.getAttribute('aria-label')
      || card.querySelector('.card-title, .territory-title')?.textContent?.trim()
      || 'Gauntlet card';
  }

  function ensureArtworkInspectionStyles() {
    if (document.querySelector('link[data-card-art-inspection-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('/card-design/card-art-lightbox.css', window.location.href).href;
    link.dataset.cardArtInspectionStyles = 'true';
    document.head.append(link);
  }

  function makeInspectable(card, activate) {
    if (!card || card.dataset.inspectionReady === 'true') return;
    card.dataset.inspectionReady = 'true';
    card.classList.add('card-inspectable');
    if (!card.hasAttribute('tabindex')) card.tabIndex = 0;
    if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
    card.title = 'Open enlarged card view';

    card.addEventListener('click', event => {
      if (event.button !== 0) return;
      activate(card);
    });
    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate(card);
    });
  }

  function makeArtworkInspectable(card, activate) {
    const image = card?.querySelector('.card-art img, .territory-art img');
    const frame = image?.closest('.card-art, .territory-art');
    if (!image || !frame || frame.dataset.artInspectionReady === 'true') return;

    frame.dataset.artInspectionReady = 'true';
    frame.classList.add('art-inspectable');
    if (!frame.hasAttribute('tabindex')) frame.tabIndex = 0;
    if (!frame.hasAttribute('role')) frame.setAttribute('role', 'button');
    frame.setAttribute('aria-haspopup', 'dialog');
    frame.setAttribute('aria-label', `View full uncropped artwork for ${inspectionLabel(card)}`);
    frame.title = 'View full uncropped artwork';

    const openArtwork = () => {
      const source = image.currentSrc || image.src;
      if (!source) return;
      activate(new URL(source, document.baseURI).href, inspectionLabel(card), frame);
    };

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

  function ensureInspectionDialog() {
    if (inspectionDialog) return inspectionDialog;

    inspectionDialog = document.createElement('dialog');
    inspectionDialog.className = 'card-inspection-dialog';
    inspectionDialog.innerHTML = `
      <button class="card-art-inspection-back" type="button">← Back to card</button>
      <button class="card-inspection-close" type="button" aria-label="Close enlarged card view">×</button>
      <div class="card-inspection-stage"></div>
      <div class="card-art-inspection" aria-hidden="true">
        <img class="card-art-inspection-image" alt="" />
      </div>`;
    document.body.append(inspectionDialog);
    inspectionStage = inspectionDialog.querySelector('.card-inspection-stage');

    inspectionDialog.querySelector('.card-art-inspection-back')?.addEventListener('click', () => closeArtworkInspection());
    inspectionDialog.querySelector('.card-inspection-close')?.addEventListener('click', () => inspectionDialog.close());
    inspectionDialog.addEventListener('cancel', event => {
      if (!artworkInspectionOpen) return;
      event.preventDefault();
      closeArtworkInspection();
    });
    inspectionDialog.addEventListener('click', event => {
      if (event.target !== inspectionDialog && !event.target.classList?.contains('card-art-inspection')) return;
      if (artworkInspectionOpen) closeArtworkInspection();
      else inspectionDialog.close();
    });
    inspectionDialog.addEventListener('close', () => {
      document.body.classList.remove('card-inspection-open');
      resetArtworkInspection();
      clearInspectionStage();
      if (inspectionSource instanceof HTMLElement) inspectionSource.focus({ preventScroll: true });
      inspectionSource = null;
    });
    return inspectionDialog;
  }

  function resetArtworkInspection() {
    if (!inspectionDialog) return;
    const artworkImage = inspectionDialog.querySelector('.card-art-inspection-image');
    inspectionDialog.classList.remove('artwork-inspection-open');
    inspectionDialog.querySelector('.card-art-inspection')?.setAttribute('aria-hidden', 'true');
    artworkImage?.removeAttribute('src');
    if (artworkImage) artworkImage.alt = '';
    artworkInspectionOpen = false;
    artworkInspectionTrigger = null;
  }

  function openArtworkInspection(source, label, trigger) {
    const dialog = ensureInspectionDialog();
    const url = new URL(source, window.location.href);
    if (url.origin !== window.location.origin) return;

    const artworkImage = dialog.querySelector('.card-art-inspection-image');
    if (!artworkImage) return;

    artworkInspectionOpen = true;
    artworkInspectionTrigger = trigger || null;
    artworkImage.src = url.href;
    artworkImage.alt = `Full uncropped artwork for ${label}`;
    dialog.classList.add('artwork-inspection-open');
    dialog.querySelector('.card-art-inspection')?.setAttribute('aria-hidden', 'false');
    dialog.setAttribute('aria-label', `Full uncropped artwork for ${label}`);
    dialog.querySelector('.card-art-inspection-back')?.focus({ preventScroll: true });
  }

  function closeArtworkInspection({ restoreFocus = true } = {}) {
    if (!inspectionDialog || !artworkInspectionOpen) return;
    const trigger = artworkInspectionTrigger;
    resetArtworkInspection();
    inspectionDialog.setAttribute('aria-label', `Enlarged view of ${inspectionLabelText}`);
    if (restoreFocus && trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
  }

  function clearInspectionStage() {
    inspectionStage?.replaceChildren();
    inspectionSubject = null;
    inspectionWidth = 0;
    inspectionHeight = 0;
  }

  function layoutInspection() {
    if (!inspectionStage || !inspectionSubject || !inspectionWidth || !inspectionHeight) return;
    const horizontalMargin = Math.min(96, window.innerWidth * 0.1);
    const verticalMargin = Math.min(96, window.innerHeight * 0.1);
    const availableWidth = Math.max(1, window.innerWidth - horizontalMargin);
    const availableHeight = Math.max(1, window.innerHeight - verticalMargin);
    const scale = Math.min(
      INSPECTION_MAX_SCALE,
      availableWidth / inspectionWidth,
      availableHeight / inspectionHeight,
    );

    inspectionStage.style.width = `${inspectionWidth * scale}px`;
    inspectionStage.style.height = `${inspectionHeight * scale}px`;
    inspectionSubject.style.width = `${inspectionWidth}px`;
    inspectionSubject.style.height = `${inspectionHeight}px`;
    inspectionSubject.style.transform = `scale(${scale})`;
  }

  function showInspection(label) {
    const dialog = ensureInspectionDialog();
    closeArtworkInspection({ restoreFocus: false });
    inspectionLabelText = label;
    dialog.setAttribute('aria-label', `Enlarged view of ${label}`);
    document.body.classList.add('card-inspection-open');
    if (!dialog.open) dialog.showModal();
    layoutInspection();
    dialog.querySelector('.card-inspection-close')?.focus({ preventScroll: true });
  }

  function openCloneInspection(card) {
    ensureInspectionDialog();
    clearInspectionStage();
    inspectionSource = card;

    const nativeWidth = card.offsetWidth;
    const nativeHeight = card.offsetHeight;
    const clone = card.cloneNode(true);
    clone.classList.remove('card-inspectable');
    clone.classList.add('card-inspection-clone');
    clone.removeAttribute('tabindex');
    clone.removeAttribute('role');
    clone.removeAttribute('aria-haspopup');
    clone.removeAttribute('title');
    delete clone.dataset.inspectionReady;
    clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));

    inspectionStage.append(clone);
    inspectionSubject = clone;
    inspectionWidth = nativeWidth;
    inspectionHeight = nativeHeight;
    makeArtworkInspectable(clone, openArtworkInspection);
    showInspection(inspectionLabel(card));
  }

  function openFrameInspection(href, label, sourceFrame) {
    ensureInspectionDialog();
    clearInspectionStage();
    inspectionSource = sourceFrame || null;

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    url.searchParams.set('inspection', '1');

    const frame = document.createElement('iframe');
    frame.className = 'card-inspection-frame';
    frame.src = url.href;
    frame.title = `Enlarged ${label}`;
    inspectionStage.append(frame);
    inspectionSubject = frame;
    inspectionWidth = 2.5 * CSS_PIXELS_PER_INCH;
    inspectionHeight = 3.5 * CSS_PIXELS_PER_INCH;
    showInspection(label);
  }

  function installEmbeddedInspectionBridge() {
    document.querySelectorAll('.gauntlet-card, .territory-card').forEach(card => {
      makeInspectable(card, selected => {
        window.parent.postMessage({
          type: 'gauntlet-card-inspect',
          href: window.location.href,
          label: inspectionLabel(selected),
        }, window.location.origin);
      });
    });
  }

  function installEmbeddedArtworkBridge() {
    document.querySelectorAll('.gauntlet-card, .territory-card').forEach(card => {
      makeArtworkInspectable(card, (source, label) => {
        window.parent.postMessage({
          type: 'gauntlet-art-inspect',
          source,
          label,
        }, window.location.origin);
      });
    });
  }

  function handleInspectionMessage(event) {
    if (event.origin !== window.location.origin) return;

    const sourceFrame = Array.from(document.querySelectorAll('iframe'))
      .find(frame => frame.contentWindow === event.source);

    if (event.data?.type === 'gauntlet-art-inspect') {
      const source = String(event.data.source || '');
      if (!source) return;
      openArtworkInspection(source, String(event.data.label || inspectionLabelText), sourceFrame);
      return;
    }

    if (event.data?.type !== 'gauntlet-card-inspect') return;
    const href = String(event.data.href || '');
    if (!href) return;
    openFrameInspection(href, String(event.data.label || 'Gauntlet card'), sourceFrame);
  }

  function installCardInspection() {
    ensureArtworkInspectionStyles();
    const inspectionRender = new URLSearchParams(window.location.search).get('inspection') === '1';

    if (inspectionRender) {
      if (window.self !== window.top) installEmbeddedArtworkBridge();
      return;
    }

    if (window.self !== window.top) {
      installEmbeddedInspectionBridge();
      return;
    }

    const inspectionPage = document.querySelector('.card-section, .faction-card-sheet, .territory-specimen-wrap');
    if (!inspectionPage) return;

    ensureInspectionDialog();
    document.querySelectorAll('.gauntlet-card:not(.card-inspection-clone), .territory-card:not(.card-inspection-clone)')
      .forEach(card => makeInspectable(card, openCloneInspection));

    if (!inspectionMessageBound) {
      window.addEventListener('message', handleInspectionMessage);
      inspectionMessageBound = true;
    }
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
    integrateLongCardReview();
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
      installCardInspection();
    }));
  }

  window.addEventListener('load', prepareCards);
  window.addEventListener('beforeprint', fitAllCards);
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      fitAllCards();
      layoutInspection();
    }, 120);
  });
})();