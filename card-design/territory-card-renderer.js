(() => {
  const CSS_PIXELS_PER_INCH = 96;
  const CSS_PIXELS_PER_POINT = CSS_PIXELS_PER_INCH / 72;
  const TITLE_STEP = 0.05 * CSS_PIXELS_PER_POINT;
  const EFFECT_STEP = 0.01;
  const MINIMUM_TITLE_SIZE = 8 * CSS_PIXELS_PER_POINT;
  const MINIMUM_ART_HEIGHT = 0.55 * CSS_PIXELS_PER_INCH;
  const MINIMUM_EFFECT_SCALE = 0.68;
  const PARCHMENT_SOURCE = '/images/artwork/card-backgrounds/neutral-parchment-v2.png';
  const ARTWORK_MANIFEST_SOURCE = '/images/artwork/manifest.json';
  const catalog = window.GAUNTLET_TTS_CATALOG;
  const target = document.getElementById('renderTarget');
  const territoryId = new URLSearchParams(window.location.search).get('territory');
  const territory = catalog?.territories?.find((item) => item.id === territoryId);

  if (!territory) {
    target.textContent = territoryId ? `Unknown Territory: ${territoryId}` : 'No Territory selected.';
    document.body.dataset.renderReady = 'error';
    return;
  }

  const displayName = territory.arena
    ? territory.name.replace(/^Arena:\s*/i, '')
    : territory.name;
  const paragraphs = territory.text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  target.innerHTML = `
    <article class="territory-card${territory.arena ? ' arena' : ''}" aria-label="${escapeAttribute(territory.name)} Territory card">
      <div class="territory-interior">
        <header class="territory-heading">
          <h1 class="territory-title">${escapeHtml(displayName)}</h1>
        </header>
        <div class="territory-body">
          <figure class="territory-art" aria-label="Territory artwork">
            <img alt="" hidden>
            <span>Artwork pending</span>
          </figure>
          <section class="territory-effect" aria-label="Territory effect">
            ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
          </section>
        </div>
        <footer class="territory-footer">
          <span>Shared</span>
          <span>${territory.arena ? 'Arena' : 'Territory'}</span>
          <span>${escapeHtml(catalog?.gameVersion || 'v0.6.3')}</span>
        </footer>
      </div>
    </article>`;

  window.addEventListener('load', prepareTerritory, { once: true });

  async function prepareTerritory() {
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    const card = target.querySelector('.territory-card');
    const artworkCandidates = await territoryArtworkCandidates(territory, displayName);
    await Promise.all([
      loadParchment(card),
      loadArtwork(card, artworkCandidates),
    ]);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    fitTerritory(card);
    if (!territory.artDirection || typeof territory.artDirection !== 'object') {
      throw new Error(`Canonical artwork direction is missing for ${territory.id}.`);
    }
    const cropResult = window.GauntletArtworkCrop?.apply(
      card.querySelector('.territory-art img:not([hidden])'),
      territory.artDirection,
      { id: territory.id, label: territory.name },
    );
    if (!cropResult) throw new Error(`Canonical artwork direction failed for ${territory.id}.`);
    card.dataset.artDirectionApplied = territory.id;
    document.body.dataset.renderReady = 'true';
  }

  function loadParchment(card) {
    return loadImage(PARCHMENT_SOURCE).then((loaded) => {
      card.dataset.parchmentLoaded = loaded ? 'true' : 'false';
      if (loaded) card.style.setProperty('--parchment-image', `url("${PARCHMENT_SOURCE}")`);
    });
  }

  async function loadArtwork(card, candidates) {
    const figure = card.querySelector('.territory-art');
    const image = figure?.querySelector('img');
    if (!figure || !image) {
      card.dataset.artworkLoaded = 'false';
      return;
    }

    for (const source of candidates) {
      if (!await loadImage(source)) continue;
      image.src = source;
      image.alt = `${displayName} Territory artwork`;
      image.hidden = false;
      figure.classList.add('has-image');
      card.dataset.artworkLoaded = 'true';
      card.dataset.artworkSource = source;
      if (image.decode) await image.decode().catch(() => {});
      return;
    }

    card.dataset.artworkLoaded = 'false';
  }

  function loadImage(source) {
    return new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      const finish = (loaded) => {
        if (settled) return;
        settled = true;
        resolve(loaded);
      };
      image.addEventListener('load', () => finish(true), { once: true });
      image.addEventListener('error', () => finish(false), { once: true });
      image.src = source;
      if (image.complete) finish(image.naturalWidth > 0);
    });
  }

  function fitTerritory(card) {
    const title = card.querySelector('.territory-title');
    const body = card.querySelector('.territory-body');
    const art = card.querySelector('.territory-art');
    const effect = card.querySelector('.territory-effect');
    const footer = card.querySelector('.territory-footer');
    const interior = card.querySelector('.territory-interior');
    let titleSize = Number.parseFloat(getComputedStyle(title).fontSize);
    let effectScale = 1;

    while (textOverflows(title) && titleSize > MINIMUM_TITLE_SIZE) {
      titleSize = Math.max(MINIMUM_TITLE_SIZE, titleSize - TITLE_STEP);
      title.style.fontSize = `${titleSize}px`;
      forceLayout(card);
    }

    /* The flex column does the art fitting itself: effect copy keeps its natural
       height and artwork receives every remaining pixel, down to the 0.78in CSS
       floor. Only after that floor is exhausted do we compact or scale type. */
    if (bodyOverflows(body, art, effect)) {
      card.classList.add('compact');
      forceLayout(card);
    }

    while (bodyOverflows(body, art, effect) && effectScale > 0.78) {
      effectScale = Math.max(0.78, effectScale - EFFECT_STEP);
      card.style.setProperty('--effect-scale', effectScale.toFixed(2));
      forceLayout(card);
    }

    /* Emergency compatibility fallback for copy denser than the v0.6.4 set. */
    if (bodyOverflows(body, art, effect)) {
      art.style.minHeight = `${MINIMUM_ART_HEIGHT}px`;
      forceLayout(card);
    }

    while (bodyOverflows(body, art, effect) && effectScale > MINIMUM_EFFECT_SCALE) {
      effectScale = Math.max(MINIMUM_EFFECT_SCALE, effectScale - EFFECT_STEP);
      card.style.setProperty('--effect-scale', effectScale.toFixed(2));
      forceLayout(card);
    }

    const bodyRect = body?.getBoundingClientRect();
    const artRect = art?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const interiorRect = interior?.getBoundingClientRect();
    const artSpansBody = Boolean(
      bodyRect
      && artRect
      && Math.abs(artRect.left - bodyRect.left) <= 0.75
      && Math.abs(artRect.right - bodyRect.right) <= 0.75
    );
    const footerFits = Boolean(
      footer
      && footerRect
      && interiorRect
      && footerRect.bottom <= interiorRect.bottom + 0.5
      && !footerOverflows(footer)
    );

    card.dataset.titleFit = textOverflows(title) ? 'false' : 'true';
    card.dataset.effectScale = effectScale.toFixed(2);
    card.dataset.artHeight = artRect ? artRect.height.toFixed(2) : '0';
    card.dataset.artWidth = artRect ? artRect.width.toFixed(2) : '0';
    card.dataset.artSpansBody = String(artSpansBody);

    const fits = !bodyOverflows(body, art, effect)
      && !textOverflows(title)
      && footerFits
      && Boolean(effect.textContent.trim())
      && Boolean(artRect && artRect.height >= MINIMUM_ART_HEIGHT - 0.5 && artRect.width > 0)
      && artSpansBody;
    card.classList.toggle('fit-warning', !fits);
  }

  function textOverflows(element) {
    return Boolean(element && element.scrollWidth > element.clientWidth + 0.5);
  }

  function footerOverflows(footer) {
    if (!footer || footer.scrollHeight > footer.clientHeight + 0.5) return true;
    return Array.from(footer.querySelectorAll('span')).some((label) => (
      label.scrollWidth > label.clientWidth + 0.5
      || label.scrollHeight > label.clientHeight + 0.5
    ));
  }

  function bodyOverflows(body, art, effect) {
    if (!body || !art || !effect) return true;
    const bodyRect = body.getBoundingClientRect();
    const artRect = art.getBoundingClientRect();
    const effectRect = effect.getBoundingClientRect();
    const bodyStyle = getComputedStyle(body);
    const gap = Number.parseFloat(bodyStyle.rowGap || bodyStyle.gap || '0') || 0;

    /* The effect is a non-shrinking flex item sized from its own content. Its
       integer scroll metrics can exceed its fractional client box by a pixel at
       some type sizes even when nothing is clipped, so use flow geometry here. */
    return artRect.height + gap + effectRect.height > bodyRect.height + 0.5;
  }

  async function territoryArtworkCandidates(item, name) {
    const explicit = String(item.artwork || '').trim();
    if (explicit) return [`/${explicit.replace(/^\/+/, '')}`];

    const candidates = [];
    try {
      const response = await fetch(ARTWORK_MANIFEST_SOURCE, { cache: 'force-cache' });
      if (response.ok) {
        const manifest = await response.json();
        const approved = (manifest.assets || []).find((asset) => (
          asset.id === item.id
          && asset.status === 'approved-final'
          && asset.canonical_component === true
          && ['territory', 'arena'].includes(asset.usage)
          && asset.path
        ));
        if (approved?.path) candidates.push(`/${String(approved.path).replace(/^\/+/, '')}`);
      }
    } catch {
      // The production inventory is an optimization, not the only artwork path.
    }

    const slugs = [...new Set([
      String(item.id || '').replace(/^territory-/, ''),
      slugify(name),
    ].filter(Boolean))];
    for (const slug of slugs) {
      for (const extension of ['png', 'webp', 'jpg', 'jpeg']) {
        candidates.push(`/images/artwork/cards/territories/${slug}.${extension}`);
      }
    }
    return [...new Set(candidates)];
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function forceLayout(element) {
    void element.offsetHeight;
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
