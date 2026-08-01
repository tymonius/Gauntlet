(() => {
  const catalog = window.GAUNTLET_TERRITORY_CATALOG;
  const target = document.getElementById('renderTarget');
  const parameters = new URLSearchParams(window.location.search);
  const renderBack = parameters.get('back') === '1';
  const territoryId = parameters.get('territory');

  if (renderBack) {
    target.innerHTML = `
      <article class="territory-card back" aria-label="Gauntlet Territory card back">
        <div class="territory-interior">
          <div class="territory-back-cartouche">
            <div class="territory-back-mark">Gauntlet</div>
            <div class="territory-back-label">Territory</div>
            <div class="territory-back-edition">v0.6.1 playtest component</div>
          </div>
        </div>
      </article>`;
    finishRender();
    return;
  }

  const territory = catalog?.territories?.find((item) => item.id === territoryId);
  if (!territory) {
    target.textContent = territoryId ? `Unknown Territory: ${territoryId}` : 'No Territory selected.';
    document.body.dataset.renderReady = 'error';
    return;
  }

  const displayName = territory.arena
    ? territory.name.replace(/^Arena:\s*/i, '')
    : territory.name;
  const paragraphs = String(territory.text || '')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  target.innerHTML = `
    <article class="territory-card${territory.arena ? ' arena' : ''}" aria-label="${escapeAttribute(territory.name)} Territory card">
      <div class="territory-interior">
        <header class="territory-heading">
          <div class="territory-kind">${territory.arena ? 'Arena' : 'Territory'}</div>
          <div class="territory-title-wrap">
            <h1 class="territory-title">${escapeHtml(displayName)}</h1>
            <span class="territory-number">Territory ${String(territory.number).padStart(2, '0')} of 25</span>
          </div>
          <div class="territory-complexity">${escapeHtml(territory.complexity)}</div>
        </header>
        <section class="territory-effect">
          <h2 class="territory-effect-label">Effect</h2>
          ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        </section>
        <footer class="territory-footer">
          <span>${territory.arena ? 'Arena' : 'Standard Territory'}</span>
          <span>Gauntlet</span>
          <span>v0.6.1</span>
        </footer>
      </div>
    </article>`;

  finishRender();

  async function finishRender() {
    window.addEventListener('load', async () => {
      await loadRequiredFonts();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const card = target.querySelector('.territory-card');
      if (!card?.classList.contains('back')) fitCard(card);
      document.body.dataset.renderReady = 'true';
    }, { once: true });
  }

  async function loadRequiredFonts() {
    if (!document.fonts) return;
    await Promise.all([
      document.fonts.load('700 16px "p22-1722-pro"', 'Gauntlet Territory'),
      document.fonts.load('600 12px "adobe-caslon-pro"', 'Territory effect text'),
    ]).catch(() => {});
    await document.fonts.ready.catch(() => {});
  }

  function fitCard(card) {
    fitTitle(card.querySelector('.territory-title'));
    const effect = card.querySelector('.territory-effect');
    let scale = 1;
    const minimumScale = 0.62;

    card.style.setProperty('--rules-scale', String(scale));
    forceLayout(effect);
    while (effectOverflows(effect) && scale > minimumScale) {
      scale = Math.max(minimumScale, scale - 0.02);
      card.style.setProperty('--rules-scale', String(Number(scale.toFixed(2))));
      forceLayout(effect);
    }

    card.dataset.rulesScale = scale.toFixed(2);
    if (effectOverflows(effect)) card.classList.add('fit-warning');
  }

  function fitTitle(title) {
    if (!title) return;
    let size = Number.parseFloat(window.getComputedStyle(title).fontSize);
    const minimum = 9;
    while (title.scrollWidth > title.clientWidth + 0.5 && size > minimum) {
      size = Math.max(minimum, size - 0.5);
      title.style.fontSize = `${size}px`;
      forceLayout(title);
    }
  }

  function effectOverflows(effect) {
    return Boolean(effect && (
      effect.scrollHeight > effect.clientHeight + 0.5
      || effect.scrollWidth > effect.clientWidth + 0.5
    ));
  }

  function forceLayout(element) {
    if (element) void element.offsetHeight;
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
