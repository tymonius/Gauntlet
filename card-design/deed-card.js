const DEED_SELECTOR = '.supplemental-placeholder-card[data-contract-component-id="financiers-deed"]';

function ornamentGlyph(className, index) {
  const glyph = document.createElement('span');
  glyph.className = `deed-ornament ${className}`;
  glyph.textContent = '•';
  glyph.setAttribute('aria-hidden', 'true');
  // Match the proven ornament-study mechanism exactly: apply the numeric
  // Poetica `ornm` alternate directly to a real text node rather than to
  // generated ::before / ::after content.
  glyph.style.fontFeatureSettings = `"ornm" ${index}`;
  return glyph;
}

function hydrateDeedOrnaments() {
  document.querySelectorAll(DEED_SELECTOR).forEach(card => {
    const row = card.querySelector('.supplemental-type-line');
    if (!row || row.dataset.deedOrnamentsReady === 'true') return;

    row.replaceChildren(
      ornamentGlyph('deed-ornament-left', 11),
      ornamentGlyph('deed-ornament-center', 44),
      ornamentGlyph('deed-ornament-right', 11),
    );
    row.dataset.deedOrnamentsReady = 'true';
  });
}

const supplementalRoot = document.querySelector('#supplementalReviewSections');

hydrateDeedOrnaments();

if (supplementalRoot) {
  const observer = new MutationObserver(hydrateDeedOrnaments);
  observer.observe(supplementalRoot, { childList: true, subtree: true });
}

if (document.fonts?.ready) {
  document.fonts.ready.then(hydrateDeedOrnaments);
}
