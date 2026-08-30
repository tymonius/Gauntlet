(() => {
  const VALID_FACTIONS = new Set(['all', 'neutral', 'military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']);
  const VALID_TYPES = new Set(['all', 'playable', 'leader', 'territory', 'proposal', 'rite', 'tracker', 'reference', 'ledger', 'deed', 'supplemental', 'back']);
  const VALID_SORTS = new Set(['canonical', 'name']);

  const params = new URLSearchParams(window.location.search);
  const hasExplicitFaction = params.has('faction');
  const hasExplicitType = params.has('type');

  let faction = String(params.get('faction') || 'all').toLowerCase();
  let type = String(params.get('type') || '').toLowerCase();
  let sort = String(params.get('sort') || 'canonical').toLowerCase();

  if (!VALID_FACTIONS.has(faction)) faction = 'all';
  if (!VALID_TYPES.has(type)) type = '';
  if (!VALID_SORTS.has(sort)) sort = 'canonical';

  // The catalog should not instantiate the entire game on first visit. A
  // deliberate faction-only URL means "all types for this faction"; otherwise
  // the compact default view is the complete Leader set.
  if (!type) type = hasExplicitFaction && !hasExplicitType ? 'all' : 'leader';

  const factionLabels = {
    all: 'All factions',
    neutral: 'Neutral / universal',
    military: 'Military',
    diplomats: 'Diplomats',
    financiers: 'Financiers',
    intelligence: 'Intelligence',
    mystics: 'Mystics',
    inquisition: 'Inquisition',
  };

  const typeLabels = {
    all: 'All card types',
    playable: 'Playable cards',
    leader: 'Leaders',
    territory: 'Territories & Arenas',
    proposal: 'Proposals',
    rite: 'Rites & Ritual',
    tracker: 'Resource trackers',
    reference: 'Reference cards',
    ledger: 'Ledgers',
    deed: 'Deeds',
    supplemental: 'Other supplemental',
    back: 'Card backs',
  };

  function factionMatches(value) {
    if (faction === 'all') return true;
    return String(value || 'neutral').toLowerCase() === faction;
  }

  function typeMatches(...values) {
    if (type === 'all') return true;
    return values.includes(type);
  }

  function sectionVisible(kind) {
    if (kind === 'playable') return typeMatches('playable');
    if (kind === 'leader') return typeMatches('leader') && faction !== 'neutral';
    if (kind === 'territory') return typeMatches('territory') && (faction === 'all' || faction === 'neutral');
    if (kind === 'proposal') return typeMatches('proposal') && (faction === 'all' || faction === 'diplomats');
    if (kind === 'rite') return typeMatches('rite') && (faction === 'all' || faction === 'mystics');
    if (kind === 'supplemental') {
      return typeMatches('supplemental', 'tracker', 'reference', 'ledger', 'deed');
    }
    if (kind === 'back') return typeMatches('back') && (faction === 'all' || faction === 'neutral');
    return false;
  }

  window.GauntletCatalogFilter = Object.freeze({
    faction,
    type,
    sort,
    factionMatches,
    typeMatches,
    sectionVisible,
    factionLabels,
    typeLabels,
  });

  function applyFormState() {
    const form = document.getElementById('catalogFilters');
    if (!form) return;

    const factionSelect = form.elements.namedItem('faction');
    const typeSelect = form.elements.namedItem('type');
    const sortSelect = form.elements.namedItem('sort');
    if (factionSelect) factionSelect.value = faction;
    if (typeSelect) typeSelect.value = type;
    if (sortSelect) sortSelect.value = sort;

    form.addEventListener('change', event => {
      if (!(event.target instanceof HTMLSelectElement)) return;
      form.requestSubmit();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const next = new URLSearchParams();
      const nextFaction = String(factionSelect?.value || 'all');
      const nextType = String(typeSelect?.value || 'leader');
      const nextSort = String(sortSelect?.value || 'canonical');
      if (nextFaction !== 'all') next.set('faction', nextFaction);
      next.set('type', nextType);
      if (nextSort !== 'canonical') next.set('sort', nextSort);
      window.location.search = next.toString();
    });
  }

  function applySectionVisibility() {
    const sections = [...document.querySelectorAll('[data-catalog-kind]')];
    let visible = 0;
    for (const section of sections) {
      const show = sectionVisible(section.dataset.catalogKind);
      section.hidden = !show;
      if (show) visible += 1;
    }

    const empty = document.getElementById('catalogEmptyState');
    if (empty) empty.hidden = visible !== 0;
  }

  function updateSummary() {
    const summary = document.querySelector('[data-catalog-filter-summary]');
    if (!summary) return;
    const sortSuffix = sort === 'name' ? ' · alphabetical' : '';
    summary.textContent = `${factionLabels[faction]} · ${typeLabels[type]}${sortSuffix}`;
  }

  function updateSectionCopy() {
    const factionName = factionLabels[faction].replace(' / universal', '');

    const leaderTitle = document.getElementById('leaders-title');
    const leaderCopy = document.querySelector('#leader-cards .card-section-heading > p:last-child');
    if (leaderTitle && faction !== 'all') leaderTitle.textContent = `${factionName} Leaders`;
    if (leaderCopy && faction !== 'all') {
      leaderCopy.textContent = `Current ${factionName} Leader cards, rendered from the shared current-game authority.`;
    }

    const supplementalTitle = document.getElementById('supplemental-title');
    const supplementalCopy = document.querySelector('#supplemental-cards .card-section-heading > p:last-child');
    const supplementalTitles = {
      tracker: 'Resource trackers',
      reference: 'Reference cards',
      ledger: 'Ledgers',
      deed: 'Deeds',
    };
    if (supplementalTitle) {
      supplementalTitle.textContent = supplementalTitles[type]
        || (faction !== 'all' ? `${factionName} supplemental cards` : 'Other supplemental cards');
    }
    if (supplementalCopy && type !== 'all') {
      if (type === 'tracker') supplementalCopy.textContent = 'Current physical resource trackers across the selected faction scope.';
      else if (type === 'reference') supplementalCopy.textContent = 'Current double-sided reference cards across the selected faction scope.';
      else if (type === 'ledger') supplementalCopy.textContent = 'Current ledger components across the selected faction scope.';
      else if (type === 'deed') supplementalCopy.textContent = 'Current deed components across the selected faction scope.';
      else if (type === 'supplemental') supplementalCopy.textContent = 'Current supplemental card components across the selected faction scope.';
    } else if (supplementalCopy && faction !== 'all') {
      supplementalCopy.textContent = `Current supplemental components for ${factionName}, grouped and packed by component design.`;
    }

    const playableTitle = document.getElementById('cards-title');
    if (playableTitle && faction !== 'all') playableTitle.textContent = `${factionName} playable cards`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyFormState();
    applySectionVisibility();
    updateSummary();
    updateSectionCopy();
  });
})();
