const DEED_SELECTOR = '[data-contract-component-id="financiers-deed"]';

function dividerElement() {
  const divider = document.createElement('span');
  divider.className = 'deed-divider';
  divider.setAttribute('aria-hidden', 'true');
  return divider;
}

export function deedCardMarkup() {
  return `<article class="gauntlet-card faction-component-card deed-card financiers-card" data-faction="financiers" data-component-id="financiers-deed" data-contract-component-id="financiers-deed" data-production-status="ready" data-design-status="final" aria-label="Financiers Deed Card">
    <div class="card-interior">
      <header class="card-heading">
        <h3 class="card-title">Deed Card</h3>
        <div class="supplemental-type-line" aria-hidden="true"><span class="deed-divider"></span></div>
      </header>
    </div>
  </article>`;
}

function normalizeDeedShell(card) {
  card.classList.remove('supplemental-placeholder-card');
  card.classList.add('deed-card');
  card.setAttribute('aria-label', 'Financiers Deed Card');

  const interior = card.querySelector('.card-interior');
  const heading = interior?.querySelector('.card-heading');
  if (interior && heading) {
    [...interior.children].forEach(child => {
      if (child !== heading) child.remove();
    });
  }
}

export function hydrateDeedDivider(scope = document) {
  scope.querySelectorAll(DEED_SELECTOR).forEach(card => {
    normalizeDeedShell(card);

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
  const observer = new MutationObserver(() => hydrateDeedDivider(supplementalRoot));
  observer.observe(supplementalRoot, { childList: true, subtree: true });
}

if (document.fonts?.ready) {
  document.fonts.ready.then(() => hydrateDeedDivider());
}
