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

  let arcaneCardsByName = new Map();
  let decorateScheduled = false;

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

  function markerFor(card) {
    const marker = document.createElement('i');
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

  function decorateTitle(element, nestedSelector) {
    if (!element || element.querySelector(':scope > .gauntlet-arcane-title-marker')) return;
    const card = arcaneCardsByName.get(titleText(element, nestedSelector));
    if (!card) return;
    element.classList.add('arcane-marked-title');
    const anchor = nestedSelector ? element.querySelector(nestedSelector) : element.firstChild;
    const marker = markerFor(card);
    if (anchor) element.insertBefore(marker, anchor);
    else element.prepend(marker);
  }

  function decorate(root = document) {
    for (const [selector, nestedSelector] of TITLE_TARGETS) {
      root.querySelectorAll(selector).forEach((element) => decorateTitle(element, nestedSelector));
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
    try {
      await loadArcaneCards();
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
