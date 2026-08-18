const PROPOSAL_SOURCE = '/docs/v0.6.4-diplomat-proposals.json';
const PROPOSAL_ART_ROOT = '/images/artwork/cards/diplomats/proposals';
const RATIFIED_SEAL_SOURCE = '/images/artwork/supplemental/diplomats/ratified-wax-seal.webp';
const EXPECTED_PROPOSAL_COUNT = 9;
const EXPECTED_SOURCE_ISSUE = 617;

const root = document.querySelector('#proposalReviewSections');

function esc(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '\"': '&quot;',
  })[character]);
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
    <img alt="Artwork for ${esc(proposal.name)}" hidden />
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

async function loadProposalArtwork() {
  if (!root) return;
  const figures = Array.from(root.querySelectorAll('[data-proposal-artwork]'));
  await Promise.all(figures.map(async figure => {
    const source = figure.dataset.proposalArtwork;
    const image = figure.querySelector('img');
    const pending = figure.querySelector('span');
    if (!source || !image || !await imageExists(source)) return;

    image.src = source;
    image.hidden = false;
    if (pending) pending.hidden = true;
    figure.classList.add('has-image');
    figure.classList.remove('proposal-art-pending');
  }));
}

function proposalFace(proposal, ratified = false) {
  const type = ratified ? 'Treaty Article' : 'Proposal';
  const longTitle = proposal.name.length >= 20 ? ' long-title' : '';
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
      <footer class="card-footer"><span>Diplomats</span><span>${esc(type)}</span><span>v0.6.4 candidate</span></footer>
    </div>
  </article>`;
}

function reviewPair(proposal) {
  return `<section class="proposal-review-pair" id="proposal-${esc(proposal.id)}" aria-labelledby="proposal-${esc(proposal.id)}-title">
    <div class="review-faction-heading screen-only">
      <h3 id="proposal-${esc(proposal.id)}-title">${esc(proposal.name)}</h3>
      <span>Stake ${Number(proposal.stake)} Influence</span>
    </div>
    <div class="proposal-face-grid">
      <div class="proposal-face">
        <p class="proposal-face-label screen-only"><strong>Proposal</strong><span>Unratified face</span></p>
        ${proposalFace(proposal, false)}
      </div>
      <div class="proposal-face">
        <p class="proposal-face-label screen-only"><strong>Treaty Article</strong><span>Ratified face</span></p>
        ${proposalFace(proposal, true)}
      </div>
    </div>
  </section>`;
}

function updateProposalCounts(count) {
  document.querySelectorAll('[data-proposal-count]').forEach(node => {
    node.textContent = String(count);
  });
}

function validateApprovedProposalSource(source, proposals) {
  if (source.source_issue !== EXPECTED_SOURCE_ISSUE) {
    throw new Error(`Expected approved Proposal source from issue #${EXPECTED_SOURCE_ISSUE}`);
  }
  if (source.mechanics_changed !== false) {
    throw new Error('Proposal rewrite source must remain wording-only');
  }
  if (proposals.length !== EXPECTED_PROPOSAL_COUNT) {
    throw new Error(`Expected ${EXPECTED_PROPOSAL_COUNT} approved Proposals, found ${proposals.length}`);
  }

  const requiredFields = ['id', 'name', 'stake', 'requirement', 'accepted', 'refused'];
  for (const proposal of proposals) {
    const missing = requiredFields.filter(field => proposal[field] === undefined || proposal[field] === null || proposal[field] === '');
    if (missing.length) throw new Error(`Proposal ${proposal.id || proposal.name || '(unknown)'} is missing: ${missing.join(', ')}`);
  }
}

async function renderProposalCatalog() {
  if (!root) return;
  try {
    const response = await fetch(PROPOSAL_SOURCE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = await response.json();
    const proposals = Array.isArray(source.proposals) ? source.proposals : [];
    validateApprovedProposalSource(source, proposals);
    updateProposalCounts(proposals.length);
    root.dataset.proposalCount = String(proposals.length);
    root.dataset.proposalSourceIssue = String(source.source_issue);
    root.innerHTML = `<div class="proposal-review-block">${proposals.map(reviewPair).join('')}</div>`;
    await loadProposalArtwork();
  } catch (error) {
    root.innerHTML = `<p class="review-note">Unable to load complete Proposal set: ${esc(error.message)}</p>`;
    console.error(error);
  }
}

await renderProposalCatalog();

// Proposal data is fetched asynchronously. If it arrives after the native load
// event, replay the established card preparation lifecycle so these late-added
// cards still receive parchment loading, fitting, and inspection behavior.
if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
