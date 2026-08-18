const CANDIDATE_SOURCE = '/docs/v0.6.4-card-additions.json';
const EXPECTED_CARD_COUNT = 14;
const EXPECTED_COUNTS = new Map([
  ['neutral', 2],
  ['military', 2],
  ['diplomats', 2],
  ['financiers', 2],
  ['intelligence', 2],
  ['mystics', 2],
  ['inquisition', 2],
]);

const slugify = value => String(value ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
})[character]);

function validateCandidateSource(source) {
  if (source.base_version !== 'v0.6.3' || source.version !== 'v0.6.4-candidate') {
    throw new Error('Card candidates must be a v0.6.4 candidate overlay on v0.6.3');
  }
  if (source.ready_for_game_data !== false) {
    throw new Error('Prototype cards must remain explicitly outside canonical game data until design is locked');
  }
  if (source.target_pool_sizes?.neutral !== 52 || source.target_pool_sizes?.each_faction !== 15 || source.target_pool_sizes?.total_playable_cards !== 142) {
    throw new Error('Unexpected v0.6.4 target pool sizes');
  }

  const cards = Array.isArray(source.cards) ? source.cards : [];
  if (cards.length !== EXPECTED_CARD_COUNT) {
    throw new Error(`Expected ${EXPECTED_CARD_COUNT} card candidates, found ${cards.length}`);
  }

  const counts = new Map([...EXPECTED_COUNTS.keys()].map(key => [key, 0]));
  for (const card of cards) {
    const allegiance = slugify(card.allegiance);
    if (!counts.has(allegiance)) throw new Error(`Unexpected candidate allegiance: ${card.allegiance}`);
    counts.set(allegiance, counts.get(allegiance) + 1);
    if (!card.id || !card.name || !Number.isFinite(Number(card.cost)) || !Array.isArray(card.effects)) {
      throw new Error(`Incomplete candidate card record: ${card.id || card.name || 'unknown'}`);
    }
  }

  for (const [allegiance, expected] of EXPECTED_COUNTS) {
    if (counts.get(allegiance) !== expected) {
      throw new Error(`Expected ${expected} ${allegiance} candidates, found ${counts.get(allegiance)}`);
    }
  }
  return cards;
}

async function waitForBaseCatalog() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const grids = [...EXPECTED_COUNTS.keys()].map(allegiance => document.querySelector(`#playable-${allegiance} .full-card-review-grid`));
    if (grids.every(Boolean)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for the released v0.6.3 playable-card catalog');
}

function candidateSpecimen(card) {
  const titleStatus = card.title_status ? ' · working title' : '';
  return `<div class="specimen-column v064-candidate-card" data-v064-candidate-card="${esc(card.id)}">
    <p class="review-card-label screen-only">
      <strong title="${esc(card.name)}">${esc(card.name)}</strong>
      <span>Value ${Number(card.cost)} · v0.6.4 candidate${titleStatus}</span>
    </p>
    <iframe class="full-card-review-frame" loading="lazy" src="card-review-render.html?fit=production&amp;card=${encodeURIComponent(card.id)}" title="${esc(card.name)} v0.6.4 candidate production render"></iframe>
  </div>`;
}

function updateCatalogCopy(totalCards) {
  document.querySelectorAll('[data-playable-count]').forEach(node => {
    node.textContent = String(totalCards);
  });

  const eyebrow = document.querySelector('.developer-catalog-hero .eyebrow');
  if (eyebrow) eyebrow.textContent = 'Released v0.6.3 base · v0.6.4 candidate review surface';

  const playableHeading = document.querySelector('#playable-cards .card-section-heading');
  const sectionLabel = playableHeading?.querySelector('.section-label');
  if (sectionLabel) sectionLabel.textContent = 'Released base + 14 candidate additions';

  const description = playableHeading?.querySelector(':scope > p:last-child');
  if (description) {
    description.innerHTML = 'The complete 128-card v0.6.3 release plus fourteen proposed v0.6.4 additions, targeting 52 Neutral cards and 15 cards in each faction. Candidates use the production card renderer but remain outside canonical game data until their final balance and wording are approved.';
  }

  const overviewNote = document.querySelector('.catalog-overview-note');
  if (overviewNote) {
    overviewNote.textContent = 'Released v0.6.3 remains the canonical base. The fourteen v0.6.4 cards shown here are review candidates only.';
  }
}

function addCandidateNotice(cards) {
  const section = document.querySelector('#playable-cards');
  const heading = section?.querySelector('.card-section-heading');
  if (!section || !heading || section.querySelector('[data-v064-card-notice]')) return;
  const names = cards.map(card => card.name).join(', ');
  heading.insertAdjacentHTML('afterend', `
    <p class="section-shell review-note screen-only" data-v064-card-notice>
      <strong>v0.6.4 candidates:</strong> ${esc(names)}. Costs remain provisional; the earlier Mystics sacrifice/recovery card still has an unresolved title.
    </p>`);
}

async function renderCandidateCards() {
  try {
    await waitForBaseCatalog();
    const response = await fetch(CANDIDATE_SOURCE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = await response.json();
    const cards = validateCandidateSource(source);

    const existingCount = document.querySelectorAll('#playableReviewSections .specimen-column:not([data-v064-candidate-card])').length;
    for (const [allegiance, expectedCandidates] of EXPECTED_COUNTS) {
      const block = document.querySelector(`#playable-${allegiance}`);
      const grid = block?.querySelector('.full-card-review-grid');
      if (!grid) continue;
      const additions = cards
        .filter(card => slugify(card.allegiance) === allegiance)
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const card of additions) {
        if (grid.querySelector(`[data-v064-candidate-card="${CSS.escape(card.id)}"]`)) continue;
        grid.insertAdjacentHTML('beforeend', candidateSpecimen(card));
      }
      const count = grid.querySelectorAll('.specimen-column').length;
      const headingCount = block.querySelector('.review-faction-heading span');
      if (headingCount) headingCount.textContent = `${count} cards · ${expectedCandidates} candidates`;
    }

    updateCatalogCopy(existingCount + cards.length);
    addCandidateNotice(cards);
    document.body.dataset.v064Cards = 'ready';
  } catch (error) {
    console.error(error);
    document.body.dataset.v064Cards = 'error';
    const section = document.querySelector('#playable-cards');
    if (section && !section.querySelector('[data-v064-card-error]')) {
      section.insertAdjacentHTML('beforeend', `<p class="section-shell review-note" data-v064-card-error>Unable to load v0.6.4 card candidates: ${esc(error.message)}</p>`);
    }
  }
}

if (document.readyState === 'complete') {
  renderCandidateCards();
} else {
  window.addEventListener('load', renderCandidateCards, { once: true });
}
