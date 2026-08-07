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

  function ensureStylesheet(href) {
    const resolved = new URL(href, document.baseURI).href;
    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find(link => link.href === resolved);
    if (existing) return Promise.resolve();

    return new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
      document.head.append(link);
    });
  }

  async function integrateLeaderSpecimens() {
    const territorySection = document.querySelector('.territory-specimen-section');
    if (!territorySection || document.querySelector('.leader-specimen-section')) return;

    await Promise.all([
      ensureStylesheet('leader-card.css'),
      ensureStylesheet('leader-card-section.css'),
    ]);

    const section = document.createElement('section');
    section.className = 'card-section leader-specimen-section';
    section.setAttribute('aria-labelledby', 'leaders-title');
    section.innerHTML = `
      <div class="section-shell card-section-heading screen-only">
        <p class="section-label">Faction component</p>
        <h2 id="leaders-title">Leader card mockups</h2>
        <p>Leader cards use the shared poker-card shell with full-color portraits, faction-tinted parchment, a dedicated faction symbol beside the faction name, no deckbuilding-value medallion, and a component metadata footer.</p>
      </div>
      <div class="card-sheet">
        <div class="specimen-column">
          <p class="specimen-label screen-only"><strong>General</strong><span>Movement and attack</span></p>
          <article class="gauntlet-card military-card faction-component-card leader-card general-card" data-faction="military" data-art-max="1.86" data-art-min="1.34" data-title-min="10" aria-label="General Military card-front prototype">
            <div class="card-interior">
              <header class="card-heading">
                <h3 class="card-title">General</h3>
                <div class="leader-faction-line"><span class="leader-faction-emblem" aria-hidden="true"></span><span>Military</span></div>
              </header>
              <figure class="card-art has-image">
                <img src="../images/general.png" alt="Portrait of the General" />
              </figure>
              <div class="card-rules">
                <section class="leader-rule-section">
                  <h4>Command</h4>
                  <p>Maximum 2. The first time each turn you win a battle, gain 1 Command.</p>
                </section>
                <section class="leader-rule-section">
                  <h4>Onward<span>1 Command</span></h4>
                  <p>During your Movement, before a pending battle is created, move one additional Position. This movement may create a pending battle.</p>
                </section>
                <section class="leader-rule-section">
                  <h4>Rally<span>1 Command</span></h4>
                  <p>Before dice are rolled in a battle you initiated, add +1 to your battle total.</p>
                </section>
                <section class="leader-rule-section">
                  <h4>Rout<span>2 Command</span></h4>
                  <p>At the end of the Aftermath of a battle you initiated and won, advance one Position. This movement may create a pending battle.</p>
                </section>
              </div>
              <footer class="card-footer">
                <span>Military</span>
                <span>Leader</span>
                <span>v0.6.2</span>
              </footer>
            </div>
          </article>
        </div>
        <div class="specimen-column">
          <p class="specimen-label screen-only"><strong>Commandant</strong><span>Defense and control</span></p>
          <article class="gauntlet-card military-card faction-component-card leader-card commandant-card" data-faction="military" data-art-max="1.86" data-art-min="1.34" data-title-min="10" aria-label="Commandant Military card-front prototype">
            <div class="card-interior">
              <header class="card-heading">
                <h3 class="card-title">Commandant</h3>
                <div class="leader-faction-line"><span class="leader-faction-emblem" aria-hidden="true"></span><span>Military</span></div>
              </header>
              <figure class="card-art has-image">
                <img src="../images/commandant.png" alt="Portrait of the Commandant" />
              </figure>
              <div class="card-rules">
                <section class="leader-rule-section">
                  <h4>Command</h4>
                  <p>Maximum 2. The first time each turn you win a battle, gain 1 Command.</p>
                </section>
                <section class="leader-rule-section">
                  <h4>Entrench<span>1 Command</span></h4>
                  <p>Before dice are rolled in a battle you did not initiate, add +1 to your battle total.</p>
                </section>
                <section class="leader-rule-section">
                  <h4>Repel<span>1 Command</span></h4>
                  <p>During the Aftermath of a battle you did not initiate and won, after the opponent's normal retreat, they retreat one additional Position, if able.</p>
                </section>
                <section class="leader-rule-section">
                  <h4>Fortify<span>2 Command</span></h4>
                  <p>During the Aftermath of a battle you won while occupying an enemy-controlled Territory, advance your Front Line by one Territory, if able.</p>
                </section>
              </div>
              <footer class="card-footer">
                <span>Military</span>
                <span>Leader</span>
                <span>v0.6.2</span>
              </footer>
            </div>
          </article>
        </div>
      </div>`;

    territorySection.before(section);
  }

  async function prepareCards() {
    await integrateLeaderSpecimens();

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
