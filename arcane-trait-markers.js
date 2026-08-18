(() => {
  const CANONICAL_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json';
  const FACTION_COLORS = Object.freeze({
    neutral: '#8a6535',
    military: '#9e262c',
    diplomats: '#264f91',
    financiers: '#227044',
    intelligence: '#282827',
    mystics: '#5d347e',
    inquisition: '#a67a27',
  });
  const TITLE_TARGETS = Object.freeze([
    ['.reference-row-title', null],
    ['.reference-preview h3', null],
    ['.compact-card-title', 'strong'],
    ['.deck-row .deck-title', 'strong'],
    ['.card-preview h3', null],
  ]);
  const PRINT_TITLE_TARGETS = Object.freeze([
    ['.print-card.main-card .card-header', '.card-name'],
  ]);

  let arcaneCardsByName = new Map();
  let decorateScheduled = false;
  let arcaneReady = Promise.resolve();

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function hasArcaneTrait(value) {
    const traits = Array.isArray(value)
      ? value
      : String(value ?? '').split(/[,/•]/);
    return traits.some((trait) => String(trait).trim().toLowerCase() === 'arcane');
  }

  function titleText(element, nestedSelector) {
    const source = nestedSelector ? element.querySelector(nestedSelector) : element;
    if (!source) return '';
    return String(source.textContent || '').trim();
  }

  function markerFor(card, ownerDocument = document) {
    const marker = ownerDocument.createElement('i');
    marker.className = 'gauntlet-arcane-title-marker';
    marker.setAttribute('role', 'img');
    marker.setAttribute('aria-label', 'Arcane trait');
    marker.title = 'Arcane';
    marker.style.setProperty(
      '--arcane-marker-color',
      FACTION_COLORS[slugify(card.allegiance)] || FACTION_COLORS.neutral,
    );
    return marker;
  }

  function decorateTitle(element, nestedSelector, ownerDocument = document) {
    if (!element || element.querySelector(':scope > .gauntlet-arcane-title-marker')) return;
    const card = arcaneCardsByName.get(titleText(element, nestedSelector));
    if (!card) return;
    element.classList.add('arcane-marked-title');
    const anchor = nestedSelector ? element.querySelector(nestedSelector) : element.firstChild;
    const marker = markerFor(card, ownerDocument);
    if (anchor) element.insertBefore(marker, anchor);
    else element.prepend(marker);
  }

  function decorate(root = document, targets = TITLE_TARGETS) {
    const ownerDocument = root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument || document;
    for (const [selector, nestedSelector] of targets) {
      root.querySelectorAll(selector).forEach((element) => decorateTitle(element, nestedSelector, ownerDocument));
    }
  }

  function scheduleDecorate() {
    if (decorateScheduled) return;
    decorateScheduled = true;
    requestAnimationFrame(() => {
      decorateScheduled = false;
      decorate();
    });
  }

  function ensurePrintStyles(ownerDocument) {
    if (ownerDocument.querySelector('style[data-arcane-title-marker-styles]')) return;
    const style = ownerDocument.createElement('style');
    style.dataset.arcaneTitleMarkerStyles = 'true';
    style.textContent = `
      .arcane-marked-title{display:flex!important;align-items:center;gap:.045in;min-width:0}
      .gauntlet-arcane-title-marker{display:inline-block;width:.12in;height:.12in;flex:0 0 .12in;background:var(--arcane-marker-color,#8a6535);-webkit-mask:url('/images/faction-symbols/mystics.svg') center/contain no-repeat;mask:url('/images/faction-symbols/mystics.svg') center/contain no-repeat;print-color-adjust:exact}
    `;
    ownerDocument.head?.append(style);
  }

  function decoratePopup(popup) {
    if (!popup || popup.closed) return;
    try {
      const ownerDocument = popup.document;
      if (!ownerDocument?.documentElement) return;
      ensurePrintStyles(ownerDocument);
      decorate(ownerDocument, PRINT_TITLE_TARGETS);
      if (ownerDocument.body && popup.MutationObserver && !ownerDocument.body.dataset.arcaneMarkerObserver) {
        ownerDocument.body.dataset.arcaneMarkerObserver = 'true';
        const observer = new popup.MutationObserver(() => decorate(ownerDocument, PRINT_TITLE_TARGETS));
        observer.observe(ownerDocument.body, { childList: true, subtree: true });
      }
    } catch {
      // Ignore cross-origin or already-closed windows. The hook exists only to
      // decorate same-origin Deckbuilder print documents.
    }
  }

  function installPopupHook() {
    if (window.__gauntletArcaneMarkerOpenWrapped) return;
    window.__gauntletArcaneMarkerOpenWrapped = true;
    const nativeOpen = window.open.bind(window);
    window.open = (...args) => {
      const popup = nativeOpen(...args);
      if (popup) {
        arcaneReady.finally(() => {
          [0, 25, 100, 250].forEach((delay) => {
            window.setTimeout(() => decoratePopup(popup), delay);
          });
        });
      }
      return popup;
    };
  }

  async function loadArcaneCards() {
    const response = await fetch(CANONICAL_SOURCE, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Arcane marker source returned ${response.status}.`);
    const data = await response.json();
    const cards = data?.gameplay?.cards;
    if (!Array.isArray(cards)) throw new Error('Arcane marker source has no playable-card list.');
    arcaneCardsByName = new Map(
      cards
        .filter((card) => hasArcaneTrait(card?.trait))
        .map((card) => [String(card.name || '').trim(), card])
        .filter(([name]) => name),
    );
  }

  async function start() {
    installPopupHook();
    try {
      arcaneReady = loadArcaneCards();
      await arcaneReady;
      decorate();
      const observer = new MutationObserver(scheduleDecorate);
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.error(error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
