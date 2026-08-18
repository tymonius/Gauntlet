const CANDIDATE_SOURCE = '/docs/v0.6.4-faction-card-additions.json';
const EXPECTED_SOURCE_ISSUE = 576;
const EXPECTED_CARD_COUNT = 6;
const EXPECTED_FACTIONS = new Set([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
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
  if (source.source_issue !== EXPECTED_SOURCE_ISSUE) {
    throw new Error(`Expected faction-card candidate source from issue #${EXPECTED_SOURCE_ISSUE}`);
  }
  if (source.base_version !== 'v0.6.3' || source.version !== 'v0.6.4-candidate') {
    throw new Error('Faction-card candidates must be a v0.6.4 candidate overlay on v0.6.3');
  }
  if (source.ready_for_game_data !== false) {
    throw new Error('Prototype faction cards must remain explicitly outside canonical game data until design is locked');
  }

  const cards = Array.isArray(source.cards) ? source.cards : [];
  if (cards.length !== EXPECTED_CARD_COUNT) {
    throw new Error(`Expected ${EXPECTED_CARD_COUNT} faction-card candidates, found ${cards.length}`);
  }

  const seenFactions = new Set();
  for (const card of cards) {
    const faction = slugify(card.allegiance);
    if (!EXPECTED_FACTIONS.has(faction)) {
      throw new Error(`Unexpected candidate faction: ${card.allegiance}`);
    }
    if (seenFactions.has(faction)) {
      throw new Error(`More than one candidate found for ${card.allegiance}`);
    }
    seenFactions.add(faction);
    if (!card.id || !card.name || !Number.isFinite(Number(card.cost)) || !Array.isArray(card.effects)) {
      throw new Error(`Incomplete candidate card record: ${card.id || card.name || 'unknown'}`);
    }
  }
  if (seenFactions.size !== EXPECTED_FACTIONS.size) {
    throw new Error('Candidate source must contain exactly one card for each current faction');
  }
  return cards;
}

async function waitForBaseCatalog() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const grids = [...EXPECTED_FACTIONS].map(faction => document.querySelector(`#playable-${faction} .full-card-review-grid`));
    if (grids.every(Boolean)) return grids;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for the released v0.6.3 playable-card catalog');
}

function candidateSpecimen(card) {
  return `<div class="specimen-column v064-candidate-card" data-v064-candidate-card="${esc(card.id)}">
    <p class="review-card-label screen-only">
      <strong title="${esc(card.name)}">${esc(card.name)}</strong>
      <span>Value ${Number(card.cost)} · v0.6.4 candidate</span>
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
  if (sectionLabel) sectionLabel.textContent = 'Released base + candidate additions';

  const description = playableHeading?.querySelector(':scope > p:last-child');
  if (description) {
    description.innerHTML = 'The complete 128-card v0.6.3 release plus six proposed v0.6.4 faction additions, grouped by allegiance and rendered through the same production card path. Candidate cards remain outside canonical game data until their mechanics, costs, restrictions, and final Mystic title are locked.';
  }

  const overviewNote = document.querySelector('.catalog-overview-note');
  if (overviewNote) {
    overviewNote.textContent = 'The catalog uses released v0.6.3 as its base and overlays current v0.6.4 design candidates. Candidate status is visual only until promotion into canonical game data.';
  }
}

function addCandidateNotice() {
  const section = document.querySelector('#playable-cards');
  const heading = section?.querySelector('.card-section-heading');
  if (!section || !heading || section.querySelector('[data-v064-faction-card-notice]')) return;

  heading.insertAdjacentHTML('afterend', `
    <p class="section-shell review-note screen-only" data-v064-faction-card-notice>
      <strong>v0.6.4 candidates:</strong> High Command, Plenipotentiary, War Bonds, Regime Change, the unnamed Mystics sacrifice/recovery card, and Retribution. These are rendered for review and playtest preparation; they are not yet part of canonical game data.
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
    for (const card of cards) {
      const faction = slugify(card.allegiance);
      const block = document.querySelector(`#playable-${faction}`);
      const grid = block?.querySelector('.full-card-review-grid');
      if (!grid || grid.querySelector(`[data-v064-candidate-card="${CSS.escape(card.id)}"]`)) continue;
      grid.insertAdjacentHTML('beforeend', candidateSpecimen(card));
      const count = grid.querySelectorAll('.specimen-column').length;
      const headingCount = block.querySelector('.review-faction-heading span');
      if (headingCount) headingCount.textContent = `${count} cards · 1 candidate`;
    }

    updateCatalogCopy(existingCount + cards.length);
    addCandidateNotice();
    document.body.dataset.v064FactionCards = 'ready';
  } catch (error) {
    console.error(error);
    document.body.dataset.v064FactionCards = 'error';
    const section = document.querySelector('#playable-cards');
    if (section && !section.querySelector('[data-v064-faction-card-error]')) {
      section.insertAdjacentHTML('beforeend', `<p class="section-shell review-note" data-v064-faction-card-error>Unable to load v0.6.4 faction-card candidates: ${esc(error.message)}</p>`);
    }
  }
}

if (document.readyState === 'complete') {
  renderCandidateCards();
} else {
  window.addEventListener('load', renderCandidateCards, { once: true });
}
