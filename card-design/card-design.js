(() => {
  const CSS_PIXELS_PER_INCH = 96;
  const CSS_PIXELS_PER_POINT = CSS_PIXELS_PER_INCH / 72;
  const HEIGHT_STEP = 1;
  const TITLE_STEP = 0.05 * CSS_PIXELS_PER_POINT;
  const RULE_SCALE_STEP = 0.01;
  const DEFAULT_MINIMUM_TITLE_SIZE = 9.5 * CSS_PIXELS_PER_POINT;
  const DEFAULT_MINIMUM_RULE_SCALE = 0.93;
  const PARCHMENT_GRID_COLUMNS = 3;
  const PARCHMENT_GRID_ROWS = 3;
  const PARCHMENT_PARTS = [
    '../images/artwork/card-backgrounds/parchments-grid.webp.b64.0',
    '../images/artwork/card-backgrounds/parchments-grid.webp.b64.1',
    '../images/artwork/card-backgrounds/parchments-grid.webp.b64.2',
    '../images/artwork/card-backgrounds/parchments-grid.webp.b64.3',
  ];
  const PARCHMENT_FRAMES = Object.freeze({
    neutral: { column: 0, row: 0, contrast: 1.10 },
    military: { column: 1, row: 0, contrast: 1.40 },
    diplomats: { column: 2, row: 0, contrast: 1.50 },
    financiers: { column: 0, row: 1, contrast: 1.12 },
    intelligence: { column: 1, row: 1, contrast: 1.48 },
    mystics: { column: 2, row: 1, contrast: 1.42 },
    inquisition: { column: 0, row: 2, contrast: 1.00 },
  });
  const parchmentPanelPromises = new Map();
  const parchmentObjectUrls = new Set();
  let parchmentGridPromise;
  let resizeTimer;

  function forceLayout(element) {
    void element.offsetHeight;
  }

  function factionForCard(card) {
    const explicitFaction = card.dataset.faction?.trim().toLowerCase();
    if (explicitFaction && PARCHMENT_FRAMES[explicitFaction]) return explicitFaction;

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

  function decodeParchmentBlob(base64Text) {
    const binary = window.atob(base64Text.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: 'image/webp' });
  }

  function imageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      image.decoding = 'async';
      image.addEventListener('load', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      }, { once: true });
      image.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Decoded parchment grid could not be loaded as an image.'));
      }, { once: true });
      image.src = objectUrl;
    });
  }

  function parchmentGridImage() {
    if (!parchmentGridPromise) {
      parchmentGridPromise = Promise.all(PARCHMENT_PARTS.map(path => {
        const source = new URL(path, document.baseURI);
        return fetch(source, { cache: 'force-cache' }).then(response => {
          if (!response.ok) {
            throw new Error(`Parchment request failed with ${response.status}: ${source}`);
          }
          return response.text();
        });
      }))
        .then(parts => decodeParchmentBlob(parts.join('')))
        .then(imageFromBlob);
    }

    return parchmentGridPromise;
  }

  function clampChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function normalizeParchmentContrast(context, width, height, factor) {
    if (factor === 1) return;

    const imageData = context.getImageData(0, 0, width, height);
    const { data } = imageData;
    let red = 0;
    let green = 0;
    let blue = 0;
    let samples = 0;

    /* Most pixels are the paper field. Sampling every fourth pixel establishes
       a source-local paper pivot without hard-coding a replacement color. */
    for (let index = 0; index < data.length; index += 16) {
      if (data[index + 3] === 0) continue;
      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
      samples += 1;
    }

    if (!samples) return;
    const pivotRed = red / samples;
    const pivotGreen = green / samples;
    const pivotBlue = blue / samples;

    for (let index = 0; index < data.length; index += 4) {
      data[index] = clampChannel(pivotRed + (data[index] - pivotRed) * factor);
      data[index + 1] = clampChannel(pivotGreen + (data[index + 1] - pivotGreen) * factor);
      data[index + 2] = clampChannel(pivotBlue + (data[index + 2] - pivotBlue) * factor);
    }

    context.putImageData(imageData, 0, 0);
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Parchment panel could not be encoded.'));
      }, 'image/webp', 0.96);
    });
  }

  function parchmentPanelUrl(faction) {
    if (!parchmentPanelPromises.has(faction)) {
      parchmentPanelPromises.set(faction, parchmentGridImage().then(async image => {
        const frame = PARCHMENT_FRAMES[faction];
        const frameWidth = image.naturalWidth / PARCHMENT_GRID_COLUMNS;
        const frameHeight = image.naturalHeight / PARCHMENT_GRID_ROWS;

        if (!Number.isInteger(frameWidth) || !Number.isInteger(frameHeight)) {
          throw new Error(`Unexpected parchment grid dimensions: ${image.naturalWidth} × ${image.naturalHeight}`);
        }

        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        if (!context) throw new Error('A 2D canvas context is required for parchment extraction.');

        context.drawImage(
          image,
          frame.column * frameWidth,
          frame.row * frameHeight,
          frameWidth,
          frameHeight,
          0,
          0,
          frameWidth,
          frameHeight
        );
        normalizeParchmentContrast(context, frameWidth, frameHeight, frame.contrast);

        const panelBlob = await canvasToBlob(canvas);
        const objectUrl = URL.createObjectURL(panelBlob);
        parchmentObjectUrls.add(objectUrl);
        return objectUrl;
      }));
    }

    return parchmentPanelPromises.get(faction);
  }

  async function loadParchments() {
    const cards = Array.from(document.querySelectorAll('.gauntlet-card'));
    await Promise.all(cards.map(async card => {
      const faction = factionForCard(card);
      try {
        const objectUrl = await parchmentPanelUrl(faction);
        card.style.setProperty('--parchment-image', `url("${objectUrl}")`);
        card.dataset.parchmentLoaded = 'true';
        card.dataset.parchmentSource = faction;
      } catch (error) {
        card.dataset.parchmentLoaded = 'false';
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
    parchmentObjectUrls.forEach(objectUrl => URL.revokeObjectURL(objectUrl));
  });
})();
