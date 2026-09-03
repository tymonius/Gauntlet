import { elementFromMarkup, esc, ruleSection } from './common.mjs';

function riteTypeLine(label = 'Rite') {
  return `<div class="rite-type-line"><span class="rite-faction-emblem" aria-hidden="true"></span><span>${esc(label)}</span></div>`;
}

function unlockSection(unlock) {
  if (unlock.headerLines?.length) {
    const header = unlock.headerLines.map(line => `<span>${esc(line)}</span>`).join(' ');
    return `<section class="rite-unlock-section rite-unlock-section--ritual"><h4><strong class="rite-unlock-ritual-heading">${header}</strong></h4><p>${esc(unlock.text)}</p></section>`;
  }
  return `<section class="rite-unlock-section"><h4>${esc(unlock.count)}</h4><p><strong>${esc(unlock.name)}</strong> ${esc(unlock.text)}</p></section>`;
}

export function render(spec) {
  const { rite, mode, unlocks = [] } = spec.content;
  const completed = mode === 'completed';
  const type = completed ? 'Completed Rite' : 'Rite';
  const hasReminder = Boolean(!completed && rite.reminder?.text);
  const dense = completed || hasReminder || rite.id === 'crossing' || rite.id === 'echoes' ? ' dense-card' : '';
  const version = spec.provenance.displayVersion || 'Current';
  const rules = completed
    ? unlocks.map(unlockSection).join('')
    : `${ruleSection('Begin', rite.begin)}${ruleSection('Complete', rite.complete)}${hasReminder ? `<p class="rite-reminder"><em>${esc(rite.reminder.text)}</em></p>` : ''}${ruleSection('Interrupted', rite.interrupted)}`;
  const artworkSource = spec.artwork?.source?.src || '';
  const artwork = `<figure class="card-art has-image${completed ? ' rite-completed-panel' : ''}" aria-label="${completed ? 'Completed' : 'Artwork for'} ${esc(rite.name)}">
    <img src="${esc(artworkSource)}" alt="${completed ? 'Completed rite parchment' : `Artwork for ${esc(rite.name)}`}" />
  </figure>`;

  const element = elementFromMarkup(`
    <article class="gauntlet-card faction-component-card rite-card mystic-card${dense}${completed ? ' completed-rite-card' : ''}"
      data-faction="mystics"
      data-art-max="1.72"
      data-art-min="0.62"
      data-title-min="9"
      ${hasReminder ? 'data-has-reminder="true"' : ''}
      aria-label="${esc(rite.name)} ${esc(type)} card">
      <div class="card-interior">
        <header class="card-heading">
          <h3 class="card-title">${esc(rite.name)}</h3>
          ${riteTypeLine()}
        </header>
        ${artwork}
        <div class="card-rules">${rules}</div>
        <footer class="card-footer"><span>Mystics</span><span>${esc(type)}</span><span>${esc(version)}</span></footer>
      </div>
    </article>`
  );
  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element, artworkImage: element.querySelector('.card-art img'), preparation: { parchment: true, fit: 'generic' } };
}
