(() => {
  const CSS_PIXELS_PER_INCH = 96;
  const CSS_PIXELS_PER_POINT = CSS_PIXELS_PER_INCH / 72;
  const HEIGHT_STEP = 1;
  const TITLE_STEP = 0.05 * CSS_PIXELS_PER_POINT;
  const RULE_SCALE_STEP = 0.01;
  const DEFAULT_MINIMUM_TITLE_SIZE = 9.5 * CSS_PIXELS_PER_POINT;
  const DEFAULT_MINIMUM_RULE_SCALE = 0.93;
  const PARCHMENT_PARTS = [
    '../images/artwork/card-backgrounds/parchments-grid.webp.b64.0',
    '../images/artwork/card-backgrounds/parchments-grid.webp.b64.1',
    '../images/artwork/card-backgrounds/parchments-grid.webp.b64.2',
    '../images/artwork/card-backgrounds/parchments-grid.webp.b64.3',
  ];
  let parchmentPromise;
  let parchmentObjectUrl;
  let resizeTimer;

  function forceLayout(element) {
    void element.offsetHeight;
  }

  function decodeParchment(base64Text) {
    const binary = window.atob(base64Text.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
  }

  function parchmentUrl() {
    if (!parchmentPromise) {
      parchmentPromise = Promise.all(PARCHMENT_PARTS.map(path => {
        const source = new URL(path, document.baseURI);
        return fetch(source, { cache: 'force-cache' }).then(response => {
          if (!response.ok) {
            throw new Error(`Parchment request failed with ${response.status}: ${source}`);
          }
          return response.text();
        });
      })).then(parts => {
        parchmentObjectUrl = decodeParchment(parts.join(''));
        return parchmentObjectUrl;
      });
    }

    return parchmentPromise;
  }

  async function loadParchments() {
    const cards = Array.from(document.querySelectorAll('.gauntlet-card'));
    try {
      const objectUrl = await parchmentUrl();
      cards.forEach(card => {
        card.style.setProperty('--parchment-image', `url("${objectUrl}")`);
        card.dataset.parchmentLoaded = 'true';
      });
    } catch (error) {
      cards.forEach(card => {
        card.dataset.parchmentLoaded = 'false';
      });
      console.warn('Using fallback parchment color.', error);
    }
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

  function cardOverflows(card) {
    const interior = card.querySelector('.card-interior');
    const rules = card.querySelector('.card-rules');
    const footer = card.querySelector('.card-footer');
    if (!interior || !rules || !footer) return false;

    const interiorRect = interior.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const footerPastFrame = footerRect.bottom > interiorRect.bottom + 0.5;
    const rulesClip = rules.scrollHeight > rules.clientHeight + 0.5;
    const frameClip = interior.scrollHeight > interior.clientHeight + 0.5;

    return footerPastFrame || rulesClip || frameClip;
  }

  function fitTitle(card) {
    const title = card.querySelector('.card-title');
    if (!title) return;

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
  }

  function fitCard(card) {
    const interior = card.querySelector('.card-interior');
    const art = card.querySelector('.card-art');
    if (!interior || !art) return;

    fitTitle(card);

    const maximum = Number(card.dataset.artMax || 1.72) * CSS_PIXELS_PER_INCH;
    const minimum = Number(card.dataset.artMin || 0.62) * CSS_PIXELS_PER_INCH;
    let height = maximum;
    let ruleScale = 1;

    card.classList.remove('fit-warning');
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

    if (cardOverflows(card)) {
      card.classList.add('fit-warning');
      console.warn(`Card content still exceeds the available area: ${card.getAttribute('aria-label') || 'unnamed card'}`);
    }
  }

  function fitAllCards() {
    document.querySelectorAll('.gauntlet-card[data-art-max]').forEach(fitCard);
  }

  async function prepareCards() {
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
  window.addEventListener('beforeunload', () => {
    if (parchmentObjectUrl) URL.revokeObjectURL(parchmentObjectUrl);
  });
})();
