const FACTIONS = Object.freeze([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);

const FACTION_LABELS = Object.freeze({
  military: 'Military',
  diplomats: 'Diplomats',
  financiers: 'Financiers',
  intelligence: 'Intelligence',
  mystics: 'Mystics',
  inquisition: 'Inquisition',
});

const PATTERN_ROWS = 36;
const PATTERN_COLUMNS = 36;
const ROW_SEQUENCE = Object.freeze([0, 3, 1, 4, 2, 5, 2, 4, 0, 5, 1, 3]);

function patternMarkup() {
  return Array.from({ length: PATTERN_ROWS }, (_, rowIndex) => {
    const offset = ROW_SEQUENCE[rowIndex % ROW_SEQUENCE.length];
    const symbols = Array.from(
      { length: PATTERN_COLUMNS },
      (_, index) => FACTIONS[(index + offset) % FACTIONS.length],
    );
    return `<div class="gauntlet-card-back__pattern-row">${symbols
      .map((faction) => `<span class="gauntlet-card-back__symbol ${faction}"></span>`)
      .join('')}</div>`;
  }).join('');
}

export function renderCardBack(element) {
  if (!(element instanceof HTMLElement)) return;
  const requestedFaction = element.dataset.cardBackFaction?.trim().toLowerCase();
  const faction = FACTIONS.includes(requestedFaction) ? requestedFaction : 'intelligence';

  element.dataset.cardBackFaction = faction;

  /* The shared review inspector discovers .gauntlet-card surfaces at page load.
     A card back is the same physical 2.5 × 3.5in surface, so opt it into that
     lifecycle while card-back.css protects its production appearance from the
     front-face frame rules attached to the shared class. */
  element.classList.add('gauntlet-card-back', 'gauntlet-card');
  element.setAttribute('aria-label', `${FACTION_LABELS[faction]} colorway of the Gauntlet playable-card back`);
  if (!document.body.classList.contains('developer-catalog-page')) {
    element.setAttribute('role', 'img');
  }
  element.innerHTML = `
    <div class="gauntlet-card-back__pattern-window" aria-hidden="true">
      <div class="gauntlet-card-back__pattern">${patternMarkup()}</div>
    </div>
    <div class="gauntlet-card-back__frame" aria-hidden="true"></div>
    <div class="gauntlet-card-back__wordmark" aria-hidden="true"></div>
  `;
}

function initializeCardBackSpecimens() {
  const filter = document.body?.classList.contains('developer-catalog-page')
    ? window.GauntletCatalogFilter || null
    : null;
  if (filter && (!filter.typeMatches('back') || (filter.faction !== 'all' && filter.faction !== 'neutral'))) return;
  document.querySelectorAll('[data-gauntlet-card-back]').forEach(renderCardBack);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCardBackSpecimens, { once: true });
} else {
  initializeCardBackSpecimens();
}
