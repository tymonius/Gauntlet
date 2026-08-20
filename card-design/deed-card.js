const DEED_SELECTOR = '.supplemental-placeholder-card[data-contract-component-id="financiers-deed"]';

function dividerElement() {
  const divider = document.createElement('span');
  divider.className = 'deed-divider';
  divider.setAttribute('aria-hidden', 'true');
  return divider;
}

function hydrateDeedDivider() {
  document.querySelectorAll(DEED_SELECTOR).forEach(card => {
    // The shared card-title rule clips overflow for ordinary card titles. P22
    // Declaration's capital D deliberately overhangs its advance box on the
    // top and left, so allow that ink to remain visible on this custom face.
    const title = card.querySelector('.card-title');
    if (title) {
      title.style.overflow = 'visible';
      title.style.maxWidth = 'none';
    }

    const row = card.querySelector('.supplemental-type-line');
    if (!row || row.dataset.deedDividerReady === 'true') return;

    row.replaceChildren(dividerElement());
    row.dataset.deedDividerReady = 'true';
    row.setAttribute('aria-hidden', 'true');
  });
}

const supplementalRoot = document.querySelector('#supplementalReviewSections');

hydrateDeedDivider();

if (supplementalRoot) {
  const observer = new MutationObserver(hydrateDeedDivider);
  observer.observe(supplementalRoot, { childList: true, subtree: true });
}

if (document.fonts?.ready) {
  document.fonts.ready.then(hydrateDeedDivider);
}
