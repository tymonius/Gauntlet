import { elementFromMarkup, esc, slugify } from './common.mjs';

function renderMeta(feature, { showName = false } = {}) {
  const parts = [];
  if (showName && feature.cost) parts.push(`<strong class="leader-feature-item-name">${esc(feature.name)}</strong>`);
  if (feature.cost) parts.push(`<strong class="leader-feature-cost">${esc(feature.cost)}</strong>`);
  if (feature.descriptor) parts.push(`<em class="leader-feature-descriptor">${esc(feature.descriptor)}</em>`);
  if (!parts.length) return '';
  return `<span class="leader-feature-meta">${parts.join('<span class="leader-feature-separator" aria-hidden="true">—</span>')}</span>`;
}

function renderFeatureLine(feature, options = {}) {
  const meta = renderMeta(feature, options);
  const text = feature.text ? `<span class="leader-feature-text">${esc(feature.text)}</span>` : '';
  return `<p class="leader-feature-line">${meta}${text}</p>`;
}

function renderSection(section) {
  const classification = section.classification || section.heading || '';
  const content = Array.isArray(section.items) && section.items.length
    ? `<div class="leader-rule-content leader-rule-content--grouped">${section.items.map(item => renderFeatureLine(item, { showName: true })).join('')}</div>`
    : `<div class="leader-rule-content">${renderFeatureLine(section)}</div>`;
  return `<section class="leader-rule-section leader-rule-section--${slugify(classification)}"><div class="leader-section-label"><h4 class="leader-section-name">${esc(section.name)}</h4><span class="leader-section-kind">${esc(classification)}</span></div>${content}</section>`;
}

export function render(spec) {
  const leader = spec.content.leader;
  const image = spec.artwork?.source?.src || leader.image || '';
  const version = spec.provenance.displayVersion || 'Current';
  const extraClass = leader.id === 'commandant' ? ' commandant-card' : '';
  const element = elementFromMarkup(`
    <article class="gauntlet-card faction-component-card leader-card leader-card--standardized ${esc(leader.faction)}-card${extraClass}"
      data-faction="${esc(leader.faction)}"
      data-art-max="1.86"
      data-art-min="0.98"
      data-title-min="10"
      data-leader-copy-version="${esc(version)}"
      data-leader-copy-source="${esc(spec.provenance.gameplay)}"
      aria-label="${esc(spec.label)}">
      <div class="card-interior">
        <header class="card-heading">
          <h3 class="card-title">${esc(leader.name)}</h3>
          <div class="leader-faction-line">
            <span class="leader-faction-emblem" aria-hidden="true"></span>
            <span>${esc(leader.factionLabel)}</span>
          </div>
        </header>
        <figure class="card-art has-image">
          <img src="${esc(image)}" alt="Portrait of the ${esc(leader.name)}" />
        </figure>
        <div class="card-rules">${leader.sections.map(renderSection).join('')}</div>
        <footer class="card-footer"><span>${esc(leader.factionLabel)}</span><span>Leader</span><span>${esc(version)}</span></footer>
      </div>
    </article>`
  );
  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element, artworkImage: element.querySelector('.card-art img') };
}
