(() => {
  const RENDER_TIMEOUT_MS = 30000;
  const catalog = window.GAUNTLET_TTS_CATALOG;
  const target = document.getElementById('renderTarget');
  const cardId = new URLSearchParams(window.location.search).get('card');
  const card = catalog?.playableCards?.find((item) => item.id === cardId);

  if (!card) {
    target.textContent = cardId ? `Unknown card: ${cardId}` : 'No card selected.';
    document.body.dataset.renderReady = 'error';
    return;
  }

  const sectionEntries = Object.entries(card.sections || {});
  const action = sectionEntries.find(([label]) => label.toLowerCase() === 'action');
  const battle = sectionEntries.find(([label]) => label.toLowerCase() === 'battle');
  const reminder = sectionEntries.find(([label]) => label.toLowerCase() === 'reminder');
  const other = sectionEntries.filter(([label]) => !['action', 'battle', 'reminder'].includes(label.toLowerCase()));
  const sections = [action, battle, ...other].filter(Boolean);
  const footerCenter = card.unique
    ? 'Unique'
    : (card.form || (card.complexity !== 'Unspecified' ? card.complexity : ''));
  const art = card.artwork
    ? `<img src="/${escapeAttribute(card.artwork)}" alt="">`
    : '<span class="pending-label">Artwork pending</span>';

  target.innerHTML = `
    <article class="gauntlet-card" data-faction="${escapeAttribute(card.faction)}" data-art-max="1.72" data-art-min="0.62" aria-label="${escapeAttribute(card.name)} card">
      <div class="card-interior">
        <header class="card-heading">
          <h1 class="card-title">${escapeHtml(card.name)}</h1>
          <div class="value-medallion" aria-label="Deckbuilding value ${card.cost}">${card.cost}</div>
        </header>
        <figure class="card-art${card.artwork ? '' : ' pending-art'}">${art}</figure>
        <div class="card-rules">
          ${sections.map(([label, text]) => `
            <section class="rule-section">
              <h4>${escapeHtml(label)}</h4>
              <p>${formatText(text)}</p>
            </section>`).join('')}
          ${reminder ? `<aside class="card-reminder"><strong>Reminder:</strong> ${formatText(reminder[1])}</aside>` : ''}
        </div>
        <footer class="card-footer">
          <span>${escapeHtml(card.factionLabel)}</span>
          <span>${escapeHtml(footerCenter)}</span>
          <span>v0.6.1</span>
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
    document.body.dataset.renderReady = 'true';
  }, { once: true });

  function cardOverflows(element) {
    const interior = element?.querySelector('.card-interior');
    const rules = element?.querySelector('.card-rules');
    const footer = element?.querySelector('.card-footer');
    if (!interior || !rules || !footer) return false;

    const interiorRect = interior.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return footerRect.bottom > interiorRect.bottom + 0.5
      || rules.scrollHeight > rules.clientHeight + 0.5
      || interior.scrollHeight > interior.clientHeight + 0.5;
  }

  function forceLayout(element) {
    void element.offsetHeight;
  }

  function fitForTts(element) {
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

  async function waitFor(predicate, timeoutMs) {
    const started = performance.now();
    while (!predicate()) {
      if (performance.now() - started > timeoutMs) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  function formatText(value) {
    return escapeHtml(value).replaceAll('\n', '<br>');
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
