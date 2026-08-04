(() => {
  const CSS_PIXELS_PER_POINT = 96 / 72;
  const TITLE_STEP = 0.05 * CSS_PIXELS_PER_POINT;
  const EFFECT_STEP = 0.01;
  const MINIMUM_TITLE_SIZE = 8 * CSS_PIXELS_PER_POINT;
  const MINIMUM_EFFECT_SCALE = 0.68;
  const PARCHMENT_SOURCE = '/images/artwork/card-backgrounds/neutral-parchment-v2.png';
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
        <section class="territory-effect" aria-label="Territory effect">
          ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        </section>
        <footer class="territory-footer">
          <span>${territory.arena ? 'Arena' : 'Territory'}</span>
          <span>${escapeHtml(territory.complexity)}</span>
          <span>v0.6.1</span>
        </footer>
      </div>
    </article>`;

  window.addEventListener('load', prepareTerritory, { once: true });

  async function prepareTerritory() {
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    const card = target.querySelector('.territory-card');
    await loadParchment(card);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    fitTerritory(card);
    document.body.dataset.renderReady = 'true';
  }

  function loadParchment(card) {
    return new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      const finish = (loaded) => {
        if (settled) return;
        settled = true;
        card.dataset.parchmentLoaded = loaded ? 'true' : 'false';
        if (loaded) card.style.setProperty('--parchment-image', `url("${PARCHMENT_SOURCE}")`);
        resolve();
      };
      image.addEventListener('load', () => finish(true), { once: true });
      image.addEventListener('error', () => finish(false), { once: true });
      image.src = PARCHMENT_SOURCE;
      if (image.complete) finish(image.naturalWidth > 0);
    });
  }

  function fitTerritory(card) {
    const title = card.querySelector('.territory-title');
    const effect = card.querySelector('.territory-effect');
    let titleSize = Number.parseFloat(getComputedStyle(title).fontSize);
    let effectScale = 1;

    while (textOverflows(title) && titleSize > MINIMUM_TITLE_SIZE) {
      titleSize = Math.max(MINIMUM_TITLE_SIZE, titleSize - TITLE_STEP);
      title.style.fontSize = `${titleSize}px`;
      forceLayout(card);
    }

    while (cardOverflows(card) && effectScale > 0.78) {
      effectScale = Math.max(0.78, effectScale - EFFECT_STEP);
      card.style.setProperty('--effect-scale', effectScale.toFixed(2));
      forceLayout(card);
    }

    if (cardOverflows(card)) {
      card.classList.add('compact');
      forceLayout(card);
    }

    while (cardOverflows(card) && effectScale > MINIMUM_EFFECT_SCALE) {
      effectScale = Math.max(MINIMUM_EFFECT_SCALE, effectScale - EFFECT_STEP);
      card.style.setProperty('--effect-scale', effectScale.toFixed(2));
      forceLayout(card);
    }

    card.dataset.titleFit = textOverflows(title) ? 'false' : 'true';
    card.dataset.effectScale = effectScale.toFixed(2);
    const fits = !cardOverflows(card) && !textOverflows(title) && Boolean(effect.textContent.trim());
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

  function cardOverflows(card) {
    const interior = card.querySelector('.territory-interior');
    const effect = card.querySelector('.territory-effect');
    const footer = card.querySelector('.territory-footer');
    if (!interior || !effect || !footer) return true;

    const interiorRect = interior.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return effect.scrollHeight > effect.clientHeight + 0.5
      || interior.scrollHeight > interior.clientHeight + 0.5
      || footerRect.bottom > interiorRect.bottom + 0.5
      || footerOverflows(footer);
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
