import { elementFromMarkup, esc } from './common.mjs';

export function render(spec) {
  const territory = spec.content.territory;
  const displayName = territory.arena
    ? String(territory.name || '').replace(/^Arena:\s*/i, '')
    : territory.name;
  const paragraphs = String(territory.text || territory.effects?.map(effect => effect?.text).filter(Boolean).join('\n') || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const version = spec.provenance.displayVersion || 'Current';

  const element = elementFromMarkup(`
    <article class="territory-card${territory.arena ? ' arena' : ''}" aria-label="${esc(territory.name)} Territory card">
      <div class="territory-interior">
        <header class="territory-heading"><h1 class="territory-title">${esc(displayName)}</h1></header>
        <div class="territory-body">
          <figure class="territory-art" aria-label="Territory artwork">
            <img alt="" hidden><span>Artwork pending</span>
          </figure>
          <section class="territory-effect" aria-label="Territory effect">
            ${paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}
          </section>
        </div>
        <footer class="territory-footer"><span>Shared</span><span>${territory.arena ? 'Arena' : 'Territory'}</span><span>${esc(version)}</span></footer>
      </div>
    </article>`
  );

  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element, artworkImage: element.querySelector('.territory-art img'), preparation: { parchment: 'neutral', fit: 'territory' } };
}
