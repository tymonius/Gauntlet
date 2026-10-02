(() => {
  const RENDER_TIMEOUT_MS = 30000;
  const COMPACT_INSTRUCTION_PATTERN = /(?:[+−-]\d+\s+(?:Reserve|Cards?|Actions?|Capital|Influence|Command|Conviction|Battle Total)|[+−-]\d+\s+Tactics?(?:\s+(?:(?:from|using)\s+(?:Hand|those cards|that card|the stored card)))?|Retreat\s+\+\d+|Advance Front Line\s+\d+|(?:Capital|Influence|Command|Conviction)\s*=\s*\d+)/g;
  const catalog = window.GAUNTLET_TTS_CATALOG;
  const emphasizeCompactInstructions = catalog?.gameVersion === 'v0.6.3';
  const target = document.getElementById('renderTarget');
  const cardId = new URLSearchParams(window.location.search).get('card');
  const card = catalog?.playableCards?.find((item) => item.id === cardId);

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
  const footerCenter = card.unique ? 'Unique' : '';
  const isArcane = hasTrait(card.trait, 'arcane');
  const arcaneMarker = isArcane
    ? '<i class="arcane-trait-marker" role="img" aria-label="Arcane trait" title="Arcane"></i>'
    : '';
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
          <h1 class="card-title">${arcaneMarker}${escapeHtml(card.name)}</h1>
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
    if (!card.artDirection || typeof card.artDirection !== 'object') {
      throw new Error(`Canonical artwork direction is missing for ${card.id}.`);
    }
    const cropResult = window.GauntletArtworkCrop?.apply(
      artImage,
      card.artDirection,
      { id: card.id, label: card.name },
    );
    if (!cropResult) throw new Error(`Canonical artwork direction failed for ${card.id}.`);
    element.dataset.artDirectionApplied = card.id;

    if (typeof window.GAUNTLET_RENDER_FINALIZE === 'function') {
      try {
        await window.GAUNTLET_RENDER_FINALIZE({ element, artImage, card });
      } catch (error) {
        document.body.dataset.renderReady = 'error';
        document.body.dataset.renderErrorMessage = error?.message || String(error);
        console.error(error);
        return;
      }
    }
    document.body.dataset.renderReady = 'true';
  }, { once: true });

  function renderRuleSection(label, text) {
    const normalizedLabel = String(label).toLowerCase();
    const dualRole = normalizedLabel === 'gambit/tactic';
    const placement = normalizedLabel === 'placement';
    const heading = dualRole
      ? '<h4 class="dual-role-heading" aria-label="Gambit or Tactic"><span aria-hidden="true">Gambit/<br>Tactic</span></h4>'
      : `<h4>${escapeHtml(label)}</h4>`;
    return `
      <section class="rule-section${dualRole ? ' dual-role-section' : ''}${placement ? ' placement-section' : ''}">
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

  async function waitFor(predicate, timeoutMs) {
    const started = performance.now();
    while (!predicate()) {
      if (performance.now() - started > timeoutMs) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  function hasTrait(value, expected) {
    const traits = Array.isArray(value)
      ? value
      : String(value ?? '').split(/[,/•]/);
    return traits.some((trait) => String(trait).trim().toLowerCase() === expected);
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