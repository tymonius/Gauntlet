import { elementFromMarkup, esc, ruleSection } from './common.mjs';

function proposalTypeLine(type) {
  return `<div class="proposal-type-line"><span class="proposal-faction-emblem" aria-hidden="true"></span><span>${esc(type)}</span></div>`;
}

export function render(spec) {
  const { proposal, mode } = spec.content;
  const ratified = mode === 'ratified';
  const type = ratified ? 'Treaty Article' : 'Proposal';
  const longTitle = proposal.name.length >= 17 ? ' long-title' : '';
  const version = spec.provenance.displayVersion || 'Current';

  const artwork = ratified
    ? `<figure class="card-art proposal-ratified-panel" aria-label="Ratified treaty article">
        <div class="proposal-ratified-word">Ratified</div>
        <img class="proposal-wax-seal" src="/images/artwork/supplemental/diplomats/ratified-wax-seal.webp" alt="" aria-hidden="true" />
      </figure>`
    : `<figure class="card-art has-image" aria-label="Artwork for ${esc(proposal.name)}">
        <img src="${esc(spec.artwork?.source?.src || '')}" alt="Artwork for ${esc(proposal.name)}" />
      </figure>`;

  const element = elementFromMarkup(`
    <article class="gauntlet-card faction-component-card proposal-card diplomat-card${longTitle}"
      data-faction="diplomats"
      data-art-max="1.52"
      data-art-min="1.04"
      data-title-min="8.5"
      aria-label="${esc(proposal.name)} ${esc(type)} card">
      <div class="card-interior">
        <header class="card-heading">
          <h3 class="card-title">${esc(proposal.name)}</h3>
          ${proposalTypeLine(type)}
          <div class="value-medallion" title="Influence Stake: ${Number(proposal.stake)}" aria-label="Influence Stake ${Number(proposal.stake)}">${Number(proposal.stake)}</div>
        </header>
        ${artwork}
        <div class="card-rules">
          ${ruleSection('Requirement', proposal.requirement)}
          ${ruleSection('Accepted', proposal.accepted)}
          ${ruleSection('Refused', proposal.refused)}
        </div>
        <footer class="card-footer"><span>Diplomats</span><span>${esc(type)}</span><span>${esc(version)}</span></footer>
      </div>
    </article>`
  );

  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return {
    element,
    artworkImage: ratified ? null : element.querySelector('.card-art img'),
  };
}
