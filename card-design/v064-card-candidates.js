const CANDIDATE_SOURCE = '/docs/v0.6.4-card-additions.json';
const EXPECTED_CARD_COUNT = 15;
const EXPECTED_RETIREMENT_COUNT = 1;
const EXPECTED_COUNTS = new Map([
  ['neutral', 2],
  ['military', 2],
  ['diplomats', 2],
  ['financiers', 2],
  ['intelligence', 2],
  ['mystics', 2],
  ['inquisition', 3],
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

  const retiredCards = Array.isArray(source.retired_cards) ? source.retired_cards : [];
  if (retiredCards.length !== EXPECTED_RETIREMENT_COUNT) {
    throw new Error(`Expected ${EXPECTED_RETIREMENT_COUNT} retired base card, found ${retiredCards.length}`);
  }
  for (const retired of retiredCards) {
    if (!retired.id || !retired.name || !retired.archive) {
      throw new Error(`Incomplete retired-card record: ${retired.id || retired.name || 'unknown'}`);
    }
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
  return { cards, retiredCards };
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

function removeRetiredCards(retiredCards) {
  const retiredIds = new Set(retiredCards.map(card => card.id));
  let removed = 0;
  for (const frame of document.querySelectorAll('#playableReviewSections .full-card-review-frame')) {
    const cardId = new URL(frame.src, window.location.href).searchParams.get('card');
    if (!retiredIds.has(cardId)) continue;
    frame.closest('.specimen-column')?.remove();
    removed += 1;
  }
  if (removed !== retiredCards.length) {
    throw new Error(`Expected to retire ${retiredCards.length} released card specimen, removed ${removed}`);
  }
}

function updateCatalogCopy(totalCards) {
  document.querySelectorAll('[data-playable-count]').forEach(node => {
    node.textContent = String(totalCards);
  });

  const eyebrow = document.querySelector('.developer-catalog-hero .eyebrow');
  if (eyebrow) eyebrow.textContent = 'Released v0.6.3 base · v0.6.4 candidate review surface';

  const playableHeading = document.querySelector('#playable-cards .card-section-heading');
  const sectionLabel = playableHeading?.querySelector('.section-label');
  if (sectionLabel) sectionLabel.textContent = 'Released base + 15 candidates − 1 retirement';

  const description = playableHeading?.querySelector(':scope > p:last-child');
  if (description) {
    description.innerHTML = 'The v0.6.3 release with one retired Inquisition card removed and fifteen proposed v0.6.4 candidates added, targeting 52 Neutral cards and 15 cards in each faction. Candidates use the production card renderer but remain outside canonical game data until their final balance and wording are approved.';
  }

  const overviewNote = document.querySelector('.catalog-overview-note');
  if (overviewNote) {
    overviewNote.textContent = 'Released v0.6.3 remains the canonical base. The v0.6.4 review overlay removes one retired base card and adds fifteen candidates.';
  }
}

function addCandidateNotice(cards, retiredCards) {
  const section = document.querySelector('#playable-cards');
  const heading = section?.querySelector('.card-section-heading');
  if (!section || !heading || section.querySelector('[data-v064-card-notice]')) return;
  const names = cards.map(card => card.name).join(', ');
  const retiredNames = retiredCards.map(card => card.name).join(', ');
  heading.insertAdjacentHTML('afterend', `
    <p class="section-shell review-note screen-only" data-v064-card-notice>
      <strong>v0.6.4 candidates:</strong> ${esc(names)}. <strong>Retired from the active v0.6.4 pool:</strong> ${esc(retiredNames)}. Candidate costs and unresolved wording remain provisional.
    </p>`);
}

async function renderCandidateCards() {
  try {
    await waitForBaseCatalog();
    const response = await fetch(CANDIDATE_SOURCE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = await response.json();
    const { cards, retiredCards } = validateCandidateSource(source);

    removeRetiredCards(retiredCards);
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
    addCandidateNotice(cards, retiredCards);
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
