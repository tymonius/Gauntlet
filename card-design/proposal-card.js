import { loadCurrentGame } from '../game-data/current-game.mjs';

const PROPOSAL_ART_ROOT = '/images/artwork/cards/diplomats/proposals';
const RATIFIED_SEAL_SOURCE = '/images/artwork/supplemental/diplomats/ratified-wax-seal.webp';
const root = document.querySelector('#proposalReviewSections');
const catalogFilter = document.body?.classList.contains('developer-catalog-page')
  ? window.GauntletCatalogFilter || null
  : null;
let currentDisplayVersion = 'Current';

function esc(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '\"': '&quot;',
  })[character]);
}

function componentRenderSource(id, side = 'front') {
  const params = new URLSearchParams({ kind: 'proposal', id, side });
  const rules = new URLSearchParams(window.location.search).get('rules');
  if (rules) params.set('rules', rules);
  return `/card-design/component-render.html?${params.toString()}`;
}

function componentReviewFrame(id, label, side = 'front') {
  return `<iframe class="component-review-frame" loading="lazy" src="${esc(componentRenderSource(id, side))}" title="${esc(label)} canonical Card Design render"></iframe>`;
}

function ruleSection(label, text) {
  return `<section class="rule-section"><h4>${esc(label)}</h4><p>${esc(text)}</p></section>`;
}

function supplementalLabel(type) {
  return `<div class="proposal-type-line"><span class="proposal-faction-emblem" aria-hidden="true"></span><span>${esc(type)}</span></div>`;
}

function proposalArtwork(proposal) {
  const source = `${PROPOSAL_ART_ROOT}/${proposal.id}.png`;
  return `<figure class="card-art proposal-art-pending" data-proposal-artwork="${esc(source)}" aria-label="Artwork for ${esc(proposal.name)}">
    <span>Artwork pending</span>
  </figure>`;
}

function imageExists(source) {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = loaded => {
      if (settled) return;
      settled = true;
      resolve(loaded);
    };
    image.addEventListener('load', () => finish(true), { once: true });
    image.addEventListener('error', () => finish(false), { once: true });
    image.src = source;
    if (image.complete) finish(image.naturalWidth > 0);
  });
}

export async function loadProposalArtwork(scope = root) {
  if (!scope) return;
  const figures = Array.from(scope.querySelectorAll('[data-proposal-artwork]'));
  await Promise.all(figures.map(async figure => {
    const source = figure.dataset.proposalArtwork;
    if (!source || !await imageExists(source)) return;

    const image = document.createElement('img');
    image.src = source;
    image.alt = figure.getAttribute('aria-label') || 'Proposal artwork';
    figure.replaceChildren(image);
    figure.classList.add('has-image');
    figure.classList.remove('proposal-art-pending');
  }));
}

export function proposalFace(proposal, ratified = false, version = currentDisplayVersion) {
  const type = ratified ? 'Treaty Article' : 'Proposal';
  // The Proposal heading is narrower than an ordinary card heading because the
  // Influence stake medallion reserves the right edge. Titles of 17+ characters
  // need the compact tracking treatment before the generic production fitter
  // runs; otherwise names such as Prisoner Exchange can remain clipped even at
  // the title-size floor.
  const longTitle = proposal.name.length >= 17 ? ' long-title' : '';
  const art = ratified
    ? `<figure class="card-art proposal-ratified-panel" aria-label="Ratified treaty article"><div class="proposal-ratified-word">Ratified</div><img class="proposal-wax-seal" src="${RATIFIED_SEAL_SOURCE}" alt="" aria-hidden="true" /></figure>`
    : proposalArtwork(proposal);

  return `<article class="gauntlet-card faction-component-card proposal-card diplomat-card${longTitle}" data-faction="diplomats" data-art-max="1.52" data-art-min="1.04" data-title-min="8.5" aria-label="${esc(proposal.name)} ${esc(type)} card">
    <div class="card-interior">
      <header class="card-heading">
        <h3 class="card-title">${esc(proposal.name)}</h3>
        ${supplementalLabel(type)}
        <div class="value-medallion" title="Influence Stake: ${Number(proposal.stake)}" aria-label="Influence Stake ${Number(proposal.stake)}">${Number(proposal.stake)}</div>
      </header>
      ${art}
      <div class="card-rules">
        ${ruleSection('Requirement', proposal.requirement)}
        ${ruleSection('Accepted', proposal.accepted)}
        ${ruleSection('Refused', proposal.refused)}
      </div>
      <footer class="card-footer"><span>Diplomats</span><span>${esc(type)}</span><span>${esc(version)}</span></footer>
    </div>
  </article>`;
}

function reviewPair(proposal) {
  const faces = catalogFilter
    ? `<div class="proposal-face">${componentReviewFrame(proposal.id, `${proposal.name} Proposal`, 'front')}</div>
      <div class="proposal-face">${componentReviewFrame(proposal.id, `${proposal.name} Treaty Article`, 'reverse')}</div>`
    : `<div class="proposal-face">${proposalFace(proposal, false)}</div>
      <div class="proposal-face">${proposalFace(proposal, true)}</div>`;

  return `<article class="proposal-review-pair catalog-pair-tile" id="proposal-${esc(proposal.id)}" aria-labelledby="proposal-${esc(proposal.id)}-title">
    <header class="catalog-item-heading screen-only">
      <strong id="proposal-${esc(proposal.id)}-title">${esc(proposal.name)}</strong>
      <span>Stake ${Number(proposal.stake)}</span>
    </header>
    <div class="proposal-face-grid">
      ${faces}
    </div>
  </article>`;
}

function updateProposalCounts(count) {
  document.querySelectorAll('[data-proposal-count]').forEach(node => {
    node.textContent = String(count);
  });
}

async function renderProposalCatalog() {
  if (!root) return;
  if (catalogFilter && (!catalogFilter.typeMatches('proposal') || !catalogFilter.factionMatches('diplomats'))) {
    root.replaceChildren();
    return;
  }
  try {
    const currentGame = await loadCurrentGame();
    let proposals = Array.isArray(currentGame.proposals) ? currentGame.proposals : [];
    if (catalogFilter?.sort === 'name') proposals = proposals.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!proposals.length) throw new Error('Current-game authority has no Proposals.');
    currentDisplayVersion = currentGame.displayVersion;
    updateProposalCounts(proposals.length);
    root.dataset.proposalCount = String(proposals.length);
    root.dataset.proposalAuthority = currentGame.authorityUrl;
    root.innerHTML = `<div class="proposal-review-block">${proposals.map(reviewPair).join('')}</div>`;
    if (!catalogFilter) await loadProposalArtwork(root);
  } catch (error) {
    root.innerHTML = `<p class="review-note">Unable to load complete Proposal set: ${esc(error.message)}</p>`;
    console.error(error);
  }
}

await renderProposalCatalog();

// Current-game data is resolved asynchronously. If it arrives after the native
// load event, replay the established card preparation lifecycle so these
// late-added cards still receive parchment loading, fitting, and inspection.
if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
