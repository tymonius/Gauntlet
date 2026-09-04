(() => {
  const VERSION = 'v0.6.1';
  const CANONICAL_PATH = '../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json';
  const packageMode = document.body.dataset.package;
  const root = document.getElementById('sheets');
  const status = document.getElementById('sheet-status');

  const FACTION_PAGES = [
    'military.html',
    'diplomat.html',
    'financier.html',
    'intelligence.html',
    'mystics.html',
    'inquisition.html'
  ];

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cardMeta(card) {
    return [card.allegiance, card.complexity, card.trait, card.card_form].filter(Boolean).join(' • ');
  }

  function cardHtml(card) {
    const effects = (card.effects || []).map(effect => `
      <section class="rules-section">
        <div class="card-label">${escapeHtml(effect.label)}</div>
        <div class="card-text">${escapeHtml(effect.text)}</div>
      </section>`).join('');

    return `<article class="print-card main-card fit-target" data-card-name="${escapeHtml(card.name)}">
      <header class="card-header"><span class="card-name">${escapeHtml(card.name)}</span><span class="cost-circle">${escapeHtml(card.cost)}</span></header>
      ${card.unique ? '<div class="unique-flag">Unique</div>' : ''}
      <div class="card-meta">${escapeHtml(cardMeta(card))}</div>
      <div class="card-body">${effects}</div>
      <footer class="card-footer"><span>${escapeHtml(card.allegiance)}</span><span>© 2026 T. Scott</span><span>${VERSION}</span></footer>
    </article>`;
  }

  function territoryHtml(territory) {
    return `<article class="print-card territory-card fit-target" data-card-name="${escapeHtml(territory.name)}">
      <header class="territory-header">
        <span class="territory-kind">${territory.arena ? 'Arena Territory' : 'Territory'}</span>
        <span class="territory-name">${escapeHtml(territory.name)}</span>
      </header>
      <div class="territory-body"><div class="card-text">${escapeHtml(territory.text || '—')}</div></div>
      <footer class="territory-footer"><span>${escapeHtml(territory.complexity || '')}</span><span>${VERSION}</span></footer>
    </article>`;
  }

  function pageHtml(items, className = '') {
    const padded = [...items];
    while (padded.length < 9) padded.push('<div class="print-card placeholder-card"></div>');
    return `<section class="sheet ${className}">${padded.slice(0, 9).join('')}</section>`;
  }

  function pagesFor(items, className = '') {
    const pages = [];
    for (let index = 0; index < items.length; index += 9) {
      pages.push(pageHtml(items.slice(index, index + 9), className));
    }
    return pages;
  }

  async function loadCanonical() {
    const response = await fetch(CANONICAL_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Canonical data returned ${response.status}.`);
    const canonical = await response.json();
    if (canonical.version !== VERSION) throw new Error(`Expected ${VERSION}; found ${canonical.version}.`);
    return canonical;
  }

  async function waitForFactionFrame(filename) {
    const frame = document.createElement('iframe');
    frame.className = 'package-source-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.src = filename;
    document.body.appendChild(frame);

    await new Promise((resolve, reject) => {
      frame.addEventListener('load', resolve, { once: true });
      frame.addEventListener('error', () => reject(new Error(`Unable to load ${filename}.`)), { once: true });
    });

    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const body = frame.contentDocument?.body;
      if (body?.dataset.ready === 'true') break;
      if (body?.querySelector('.load-error')) throw new Error(`${filename} failed to render.`);
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }

    if (frame.contentDocument?.body?.dataset.ready !== 'true') {
      throw new Error(`${filename} did not become ready.`);
    }

    const sheets = [...frame.contentDocument.querySelectorAll('.sheet')].map(sheet => sheet.outerHTML);
    if (!sheets.length) throw new Error(`${filename} rendered no sheets.`);
    return { frame, sheets };
  }

  async function factionPackagePages() {
    const loaded = [];
    for (const filename of FACTION_PAGES) loaded.push(await waitForFactionFrame(filename));
    const pages = loaded.flatMap(entry => entry.sheets);
    loaded.forEach(entry => entry.frame.remove());
    return pages;
  }

  function fitCards() {
    const results = [];
    document.querySelectorAll('.fit-target').forEach(target => {
      let textSize = target.classList.contains('territory-card') ? 7.2 : target.classList.contains('leader-card') ? 5.7 : target.classList.contains('proposal-card') ? 6.3 : target.classList.contains('rite-card') ? 6 : target.classList.contains('reference-card') || target.classList.contains('purge-card') ? 5.6 : 7;
      let labelSize = Math.max(4.8, textSize - .25);
      const minimum = target.classList.contains('leader-card') ? 4.05 : 4.25;
      while (target.scrollHeight > target.clientHeight && textSize > minimum) {
        textSize = Math.max(minimum, textSize - .12);
        labelSize = Math.max(4, labelSize - .08);
        target.style.setProperty('--card-text-size', `${textSize.toFixed(2)}pt`);
        target.style.setProperty('--card-label-size', `${labelSize.toFixed(2)}pt`);
      }
      results.push({
        name: target.dataset.cardName || '',
        fits: target.scrollHeight <= target.clientHeight,
        overflow: Math.max(0, target.scrollHeight - target.clientHeight),
        fontSize: textSize
      });
    });
    window.__cardFitResults = results;
  }

  async function load() {
    if (!['neutral', 'territories', 'all-components'].includes(packageMode)) {
      throw new Error(`Unknown release package: ${packageMode || 'missing'}.`);
    }

    const canonical = await loadCanonical();
    const neutralCards = canonical.cards.filter(card => card.allegiance === 'Neutral');
    const territories = canonical.territories || [];
    if (neutralCards.length !== 50) throw new Error(`Expected 50 Neutral cards; found ${neutralCards.length}.`);
    if (territories.length !== 25) throw new Error(`Expected 25 Territories; found ${territories.length}.`);

    const pages = [];
    if (packageMode === 'neutral' || packageMode === 'all-components') {
      pages.push(...pagesFor(neutralCards.map(cardHtml), 'neutral-package-sheet'));
    }
    if (packageMode === 'territories' || packageMode === 'all-components') {
      pages.push(...pagesFor(territories.map(territoryHtml), 'territory-package-sheet'));
    }
    if (packageMode === 'all-components') {
      pages.push(...await factionPackagePages());
    }

    root.innerHTML = pages.join('');

    const labels = {
      neutral: ['Neutral Card Sheets', `${neutralCards.length} Neutral playable cards.`],
      territories: ['Territory Sheets', `${territories.length} Territories, including ${territories.filter(item => item.arena).length} Arenas.`],
      'all-components': ['All Components Package', `${neutralCards.length + canonical.cards.filter(card => card.allegiance !== 'Neutral').length} playable cards, ${territories.length} Territories, twelve Leaders, and all faction supplemental components.`]
    };
    const [title, description] = labels[packageMode];
    document.title = `Gauntlet ${VERSION} ${title}`;
    document.querySelector('[data-package-title]').textContent = title;
    document.querySelector('[data-sheet-description]').textContent = description;
    if (status) status.textContent = `${pages.length} Letter-size page${pages.length === 1 ? '' : 's'} · 2.5 × 3.5 inch cards · ${VERSION}`;

    await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    })));
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});

    fitCards();
    const failures = window.__cardFitResults.filter(result => !result.fits || result.overflow > 0);
    if (failures.length) throw new Error(`Card overflow: ${failures.map(result => `${result.name} (+${result.overflow}px)`).join(', ')}`);
    document.body.dataset.ready = 'true';
  }

  load().catch(error => {
    console.error(error);
    if (status) status.textContent = `Unable to load release sheets: ${error.message}`;
    root.innerHTML = `<div class="load-error">${escapeHtml(error.message)}</div>`;
  });
})();
