(() => {
  const RENDER_TIMEOUT_MS = 30000;
  const ART_SAMPLE_MAX_DIMENSION = 128;
  const ART_MIN_CROP_FRACTION = 0.985;
  const COMPACT_INSTRUCTION_PATTERN = /(?:[+−-]\d+\s+(?:Reserve|Cards?|Actions?|Capital|Influence|Command|Conviction|Battle Total)|[+−-]\d+\s+Tactics?(?:\s+(?:(?:from|using)\s+(?:Hand|those cards|that card|the stored card)))?|Retreat\s+\+\d+|Advance Front Line\s+\d+|(?:Capital|Influence|Command|Conviction)\s*=\s*\d+)/g;
  const catalog = window.GAUNTLET_TTS_CATALOG;
  const emphasizeCompactInstructions = catalog?.gameVersion === 'v0.6.3';
  const target = document.getElementById('renderTarget');
  const cardId = new URLSearchParams(window.location.search).get('card');
  const card = catalog?.playableCards?.find((item) => item.id === cardId);
  const artworkAnalysisCache = new Map();

  if (!card) {
    target.textContent = cardId ? `Unknown card: ${cardId}` : 'No card selected.';
    document.body.dataset.renderReady = 'error';
    return;
  }

  const sectionEntries = Object.entries(card.sections || {});
  const reminder = sectionEntries.find(([label]) => label.toLowerCase() === 'reminder');
  const sections = sectionEntries.filter(([label]) => label.toLowerCase() !== 'reminder');
  const isOverlayCard = /\boverlay\b/i.test(card.form || '')
    || sectionEntries.some(([label]) => label.toLowerCase() === 'overlay');
  const usesOverlayTemplate = isOverlayCard || card.id === 'neutral-manifest-destiny';
  const overlayClasses = usesOverlayTemplate
    ? ` overlay-card${card.faction === 'neutral' ? ' overlay-neutral' : ''}`
    : '';
  const longTitleClass = catalog?.gameVersion === 'v0.6.3' && String(card.name).length > 21
    ? ' long-title'
    : '';
  const footerCenter = card.unique
    ? 'Unique'
    : (card.form || (card.complexity !== 'Unspecified' ? card.complexity : ''));
  const art = card.artwork
    ? `<img src="/${escapeAttribute(card.artwork)}" alt="">`
    : '<span class="pending-label">Artwork pending</span>';

  target.innerHTML = `
    <article class="gauntlet-card${overlayClasses}${longTitleClass}" data-faction="${escapeAttribute(card.faction)}" data-art-max="1.72" data-art-min="0.62" data-overlay-card="${usesOverlayTemplate}" aria-label="${escapeAttribute(card.name)} card">
      <div class="card-interior">
        ${usesOverlayTemplate ? `
          <aside class="overlay-title-bar" aria-hidden="true">
            <span class="overlay-title">${escapeHtml(card.name)}</span>
          </aside>` : ''}
        <header class="card-heading">
          <h1 class="card-title">${escapeHtml(card.name)}</h1>
          <div class="value-medallion" aria-label="Card value ${card.cost}">${card.cost}</div>
        </header>
        <figure class="card-art${card.artwork ? '' : ' pending-art'}">${art}</figure>
        <div class="card-rules">
          ${sections.map(([label, text]) => renderRuleSection(label, text)).join('')}
          ${reminder ? `<aside class="card-reminder"><strong>Reminder:</strong> ${formatText(reminder[1])}</aside>` : ''}
        </div>
        <footer class="card-footer">
          <span>${escapeHtml(card.factionLabel)}</span>
          <span>${escapeHtml(footerCenter)}</span>
          <span>${escapeHtml(catalog?.gameVersion || 'v0.6.2')}</span>
        </footer>
      </div>
    </article>`;

  const artImage = target.querySelector('.card-art img');
  artImage?.addEventListener('error', () => {
    const frame = artImage.closest('.card-art');
    frame.classList.add('pending-art');
    frame.innerHTML = '<span class="pending-label">Artwork unavailable</span>';
  }, { once: true });

  window.addEventListener('load', async () => {
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    const element = target.querySelector('.gauntlet-card');
    const interior = element?.querySelector('.card-interior');
    await waitFor(() => element?.dataset.parchmentLoaded !== undefined, RENDER_TIMEOUT_MS);
    if (element?.dataset.parchmentLoaded !== 'true') {
      element.classList.add('tts-parchment-fallback');
      element.dataset.parchmentFallback = 'true';
      element.dataset.parchmentLoaded = 'true';
    }
    await waitFor(() => Boolean(interior?.style.getPropertyValue('--art-height')), RENDER_TIMEOUT_MS);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    fitForTts(element);
    applyArtworkCrop(artImage, card.artDirection);
    document.body.dataset.renderReady = 'true';
  }, { once: true });

  function renderRuleSection(label, text) {
    const dualRole = String(label).toLowerCase() === 'gambit/tactic';
    const heading = dualRole
      ? '<h4 class="dual-role-heading" aria-label="Gambit or Tactic"><span aria-hidden="true">Gambit/<br>Tactic</span></h4>'
      : `<h4>${escapeHtml(label)}</h4>`;
    return `
      <section class="rule-section${dualRole ? ' dual-role-section' : ''}">
        ${heading}
        <p>${formatText(text)}</p>
      </section>`;
  }

  function elementOverflows(element) {
    return Boolean(element)
      && (element.scrollWidth > element.clientWidth + 0.5
        || element.scrollHeight > element.clientHeight + 0.5);
  }

  function cardOverflows(element) {
    const interior = element?.querySelector('.card-interior');
    const title = element?.querySelector('.card-title');
    const overlayTitle = element?.querySelector('.overlay-title');
    const rules = element?.querySelector('.card-rules');
    const footer = element?.querySelector('.card-footer');
    if (!interior || !title || !rules || !footer) return false;

    const interiorRect = interior.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return title.scrollWidth > title.clientWidth + 0.5
      || elementOverflows(overlayTitle)
      || footerRect.bottom > interiorRect.bottom + 0.5
      || rules.scrollHeight > rules.clientHeight + 0.5
      || interior.scrollHeight > interior.clientHeight + 0.5;
  }

  function forceLayout(element) {
    void element.offsetHeight;
  }

  function fitForTts(element) {
    if (new URLSearchParams(window.location.search).get('fit') === 'production') {
      element.dataset.productionFit = element?.classList.contains('fit-warning') ? 'warning' : 'fit';
      return;
    }

    if (!element?.classList.contains('fit-warning')) return;

    const interior = element.querySelector('.card-interior');
    let artHeight = Number.parseFloat(interior.style.getPropertyValue('--art-height')) || 59.52;
    let rulesScale = Number.parseFloat(element.style.getPropertyValue('--rules-scale')) || 0.93;
    const minimumRulesScale = 0.48;

    while (cardOverflows(element) && artHeight > 0) {
      artHeight = Math.max(0, artHeight - 1);
      interior.style.setProperty('--art-height', `${artHeight}px`);
      forceLayout(interior);
    }

    if (cardOverflows(element)) {
      element.classList.add('tts-text-only');
      artHeight = 0;
      interior.style.setProperty('--art-height', '0px');
      forceLayout(interior);
    }

    while (cardOverflows(element) && rulesScale > minimumRulesScale) {
      rulesScale = Math.max(minimumRulesScale, rulesScale - 0.01);
      element.style.setProperty('--rules-scale', String(Number(rulesScale.toFixed(2))));
      forceLayout(interior);
    }

    element.dataset.ttsFit = element.classList.contains('tts-text-only') ? 'text-only' : 'extended';
    element.dataset.ttsArtHeight = artHeight.toFixed(2);
    element.dataset.ttsRulesScale = rulesScale.toFixed(2);
    if (!cardOverflows(element)) element.classList.remove('fit-warning');
  }

  function applyArtworkCrop(image, direction = null) {
    if (!image?.naturalWidth || !image?.naturalHeight) return;

    const frame = image.closest('.card-art, .territory-art');
    if (!frame || frame.clientWidth < 1 || frame.clientHeight < 1) return;

    const authored = normalizeArtDirection(direction);
    image.style.objectFit = authored.fit;
    image.style.transform = authored.zoom === 1 ? '' : `scale(${authored.zoom})`;

    if (authored.fit !== 'cover' || authored.smart === false || authored.hasFocus) {
      const x = authored.focusX ?? 0.5;
      const y = authored.focusY ?? 0.52;
      setArtworkPosition(image, x, y, authored.hasFocus ? 'manual' : 'default');
      return;
    }

    try {
      const frameAspect = frame.clientWidth / frame.clientHeight;
      const imageAspect = image.naturalWidth / image.naturalHeight;
      const analysis = analyzeArtwork(image);
      let x = 0.5;
      let y = 0.52;

      if (imageAspect > frameAspect) {
        const visibleFraction = frameAspect / imageAspect;
        if (visibleFraction < ART_MIN_CROP_FRACTION) {
          x = bestObjectPosition(analysis.columns, visibleFraction, 0.5);
        }
      } else {
        const visibleFraction = imageAspect / frameAspect;
        if (visibleFraction < ART_MIN_CROP_FRACTION) {
          y = bestObjectPosition(analysis.rows, visibleFraction, 0.46);
        }
      }

      setArtworkPosition(image, x, y, 'smart');
    } catch (error) {
      setArtworkPosition(image, 0.5, 0.52, 'fallback');
      console.warn(`Smart artwork crop fell back to centered positioning for ${card.name}.`, error);
    }
  }

  function normalizeArtDirection(direction) {
    const source = direction && typeof direction === 'object' ? direction : {};
    const focus = Array.isArray(source.focus) ? source.focus : [];
    const focusX = normalizeFocus(source.focusX ?? source.x ?? focus[0]);
    const focusY = normalizeFocus(source.focusY ?? source.y ?? focus[1]);
    const zoomValue = Number.parseFloat(source.zoom);
    const fit = source.fit === 'contain' ? 'contain' : 'cover';

    return {
      fit,
      focusX,
      focusY,
      hasFocus: focusX !== null || focusY !== null,
      smart: source.smart !== false,
      zoom: Number.isFinite(zoomValue) ? clamp(zoomValue, 1, 1.8) : 1,
    };
  }

  function normalizeFocus(value) {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return null;
    return clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
  }

  function setArtworkPosition(image, x, y, mode) {
    const xPercent = Number((clamp(x, 0, 1) * 100).toFixed(2));
    const yPercent = Number((clamp(y, 0, 1) * 100).toFixed(2));
    image.style.objectPosition = `${xPercent}% ${yPercent}%`;
    image.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    image.dataset.artCrop = mode;
    image.dataset.artFocusX = String(xPercent);
    image.dataset.artFocusY = String(yPercent);
  }

  function analyzeArtwork(image) {
    const key = `${image.currentSrc || image.src}|${image.naturalWidth}x${image.naturalHeight}`;
    if (artworkAnalysisCache.has(key)) return artworkAnalysisCache.get(key);

    const scale = Math.min(1, ART_SAMPLE_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(8, Math.round(image.naturalWidth * scale));
    const height = Math.max(8, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D context unavailable.');

    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const luminance = new Float32Array(width * height);
    const columns = new Float64Array(width);
    const rows = new Float64Array(height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixel = (y * width + x) * 4;
        luminance[y * width + x] = (
          pixels[pixel] * 0.2126
          + pixels[pixel + 1] * 0.7152
          + pixels[pixel + 2] * 0.0722
        ) / 255;
      }
    }

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const offset = y * width + x;
        const pixel = offset * 4;
        const r = pixels[pixel];
        const g = pixels[pixel + 1];
        const b = pixels[pixel + 2];
        const gradient = (
          Math.abs(luminance[offset + 1] - luminance[offset - 1])
          + Math.abs(luminance[offset + width] - luminance[offset - width])
        ) * 0.5;
        const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
        const skin = skinLikelihood(r, g, b);
        const centerDistance = Math.hypot(
          (x / (width - 1) - 0.5) * 1.35,
          (y / (height - 1) - 0.48),
        );
        const compositionPrior = 0.9 + 0.1 * Math.max(0, 1 - centerDistance);
        const score = (0.02 + gradient * 1.7 + saturation * 0.14 + skin * 0.9) * compositionPrior;
        columns[x] += score;
        rows[y] += score;
      }
    }

    const analysis = { columns, rows };
    artworkAnalysisCache.set(key, analysis);
    return analysis;
  }

  function skinLikelihood(r, g, b) {
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (cb < 75 || cb > 135 || cr < 128 || cr > 180) return 0;

    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    if (maxChannel - minChannel < 10 || r < 45 || g < 25 || b < 15) return 0;
    return clamp((cr - 128) / 35, 0.25, 1);
  }

  function bestObjectPosition(scores, visibleFraction, preferredCenter) {
    const count = scores.length;
    const windowSize = Math.max(1, Math.min(count, Math.round(count * visibleFraction)));
    const movable = count - windowSize;
    if (movable <= 0) return 0.5;

    const prefix = new Float64Array(count + 1);
    for (let index = 0; index < count; index += 1) {
      prefix[index + 1] = prefix[index] + scores[index];
    }

    let bestStart = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let start = 0; start <= movable; start += 1) {
      const end = start + windowSize;
      const retainedSaliency = prefix[end] - prefix[start];
      const center = (start + windowSize / 2) / count;
      const centerPreference = Math.max(0, 1 - Math.abs(center - preferredCenter) * 2);
      const score = retainedSaliency * (0.96 + centerPreference * 0.04);
      if (score > bestScore) {
        bestScore = score;
        bestStart = start;
      }
    }

    return clamp(bestStart / movable, 0, 1);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  async function waitFor(predicate, timeoutMs) {
    const started = performance.now();
    while (!predicate()) {
      if (performance.now() - started > timeoutMs) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  function formatText(value) {
    const escaped = escapeHtml(value);
    const emphasized = emphasizeCompactInstructions
      ? escaped.replace(COMPACT_INSTRUCTION_PATTERN, '<strong>$&</strong>')
      : escaped;
    return emphasized.replaceAll('\n', '<br>');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
