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
      <img class="gauntlet-card-back__pattern" src="/card-design/card-back-pattern.svg" alt="" />
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
