import { elementFromMarkup, esc, ruleSection } from './common.mjs';

function riteTypeLine(label = 'Ritual') {
  return `<div class="rite-type-line"><span class="rite-faction-emblem" aria-hidden="true"></span><span>${esc(label)}</span></div>`;
}

export function render(spec) {
  const { ritual, mode } = spec.content;
  const reverse = mode === 'reverse';
  const version = spec.provenance.displayVersion || 'Current';

  if (reverse) {
    const element = elementFromMarkup(`
      <article class="gauntlet-card ritual-card-back mystic-card" data-faction="mystics" aria-label="${esc(ritual.name)} card back">
        <div class="ritual-card-back__image-window">
          <img src="${esc(spec.artwork?.source?.src || ritual.cardBack || '')}" alt="Ritual working sheet" />
        </div>
      </article>`
    );
    element.dataset.faceId = spec.id;
    element.dataset.faceTemplate = spec.template;
    return { element, artworkImage: null };
  }

  const rules = [
    ruleSection('Begin', ritual.begin),
    ruleSection('Convergence', ritual.convergence),
    ruleSection('Complete', ritual.complete),
    ruleSection('Interrupted', ritual.interrupted),
  ].join('');

  const element = elementFromMarkup(`
    <article class="gauntlet-card faction-component-card rite-card ritual-card mystic-card dense-card"
      data-faction="mystics"
      data-art-max="1.16"
      data-art-min="0.64"
      data-title-min="8.5"
      data-card-back="ritual-ascension"
      aria-label="${esc(ritual.name)} Ritual card">
      <div class="card-interior">
        <header class="card-heading">
          <h3 class="card-title">${esc(ritual.name)}</h3>
          ${riteTypeLine()}
        </header>
        <figure class="card-art has-image" aria-label="Artwork for ${esc(ritual.name)}">
          <img src="${esc(spec.artwork?.source?.src || ritual.artwork || '')}" alt="Artwork for ${esc(ritual.name)}" />
        </figure>
        <div class="card-rules">${rules}</div>
        <footer class="card-footer"><span>Mystics</span><span>Ritual</span><span>${esc(version)}</span></footer>
      </div>
    </article>`
  );
  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element, artworkImage: element.querySelector('.card-art img') };
}
