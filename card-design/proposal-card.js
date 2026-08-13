const PROPOSAL_SOURCE = '/releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json';
const RATIFIED_SEAL_SOURCE = '/images/artwork/supplemental/diplomats/ratified-wax-seal.webp';
const EXPECTED_PROPOSAL_COUNT = 9;

const root = document.querySelector('#proposalReviewSections');

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function ruleSection(label, text) {
  return `<section class="rule-section"><h4>${esc(label)}</h4><p>${esc(text)}</p></section>`;
}

function supplementalLabel(type) {
  return `<div class="proposal-type-line"><span class="proposal-faction-emblem" aria-hidden="true"></span><span>${esc(type)}</span></div>`;
}

function proposalFace(proposal, ratified = false) {
  const type = ratified ? 'Treaty Article' : 'Proposal';
  const longTitle = proposal.name.length >= 20 ? ' long-title' : '';
  const art = ratified
    ? `<figure class="card-art proposal-ratified-panel" aria-label="Ratified treaty article"><div class="proposal-ratified-word">Ratified</div><img class="proposal-wax-seal" src="${RATIFIED_SEAL_SOURCE}" alt="" aria-hidden="true" /></figure>`
    : `<figure class="card-art proposal-art-pending" aria-label="Artwork pending"><span>Artwork pending</span></figure>`;

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
      <footer class="card-footer"><span>Diplomats</span><span>${esc(type)}</span><span>v0.6.3</span></footer>
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

function validateCanonicalProposals(proposals) {
  if (proposals.length !== EXPECTED_PROPOSAL_COUNT) {
    throw new Error(`Expected ${EXPECTED_PROPOSAL_COUNT} canonical Proposals, found ${proposals.length}`);
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
    const canonical = await response.json();
    const proposals = Array.isArray(canonical.proposals) ? canonical.proposals : [];
    validateCanonicalProposals(proposals);
    updateProposalCounts(proposals.length);
    root.dataset.proposalCount = String(proposals.length);
    root.innerHTML = `<div class="proposal-review-block">${proposals.map(reviewPair).join('')}</div>`;
  } catch (error) {
    root.innerHTML = `<p class="review-note">Unable to load complete Proposal set: ${esc(error.message)}</p>`;
    console.error(error);
  }
}

await renderProposalCatalog();
