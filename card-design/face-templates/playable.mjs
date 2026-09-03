import { elementFromMarkup, esc } from './common.mjs';

function hasTrait(value, expected) {
  const traits = Array.isArray(value) ? value : String(value ?? '').split(/[,/•]/);
  return traits.some(trait => String(trait).trim().toLowerCase() === expected);
}

function renderRuleSection(effect) {
  const label = String(effect?.label || '').trim();
  const text = String(effect?.text || '').trim();
  if (!label || !text) return '';
  const normalized = label.toLowerCase();
  const dualRole = normalized === 'gambit/tactic';
  const placement = normalized === 'placement';
  const heading = dualRole
    ? '<h4 class="dual-role-heading" aria-label="Gambit or Tactic"><span aria-hidden="true">Gambit/<br>Tactic</span></h4>'
    : `<h4>${esc(label)}</h4>`;
  return `<section class="rule-section${dualRole ? ' dual-role-section' : ''}${placement ? ' placement-section' : ''}">${heading}<p>${esc(text).replaceAll('\n', '<br>')}</p></section>`;
}

export function render(spec) {
  const card = spec.content.card;
  const usesOverlayTemplate = /\boverlay\b/i.test(card.card_form || '')
    || (card.effects || []).some(effect => String(effect?.label || '').trim().toLowerCase() === 'overlay')
    || card.id === 'neutral-manifest-destiny';
  const overlayClasses = usesOverlayTemplate
    ? ` overlay-card${spec.faction === 'neutral' ? ' overlay-neutral' : ''}`
    : '';
  const footerCenter = card.unique ? 'Unique' : '';
  const arcaneMarker = hasTrait(card.trait, 'arcane')
    ? '<i class="arcane-trait-marker" role="img" aria-label="Arcane trait" title="Arcane"></i>'
    : '';
  const version = spec.provenance.displayVersion || 'Current';

  const element = elementFromMarkup(`
    <article class="gauntlet-card${overlayClasses}"
      data-faction="${esc(spec.faction)}"
      data-art-max="1.72"
      data-art-min="0.62"
      data-overlay-card="${usesOverlayTemplate}"
      aria-label="${esc(card.name)} card">
      <div class="card-interior">
        ${usesOverlayTemplate ? `<aside class="overlay-title-bar" aria-hidden="true"><span class="overlay-title">${esc(card.name)}</span></aside>` : ''}
        <header class="card-heading">
          <h1 class="card-title">${arcaneMarker}${esc(card.name)}</h1>
          <div class="value-medallion" aria-label="Card value ${Number(card.cost)}">${Number(card.cost)}</div>
        </header>
        <figure class="card-art pending-art"><img alt="" hidden><span class="pending-label">Artwork pending</span></figure>
        <div class="card-rules">${(card.effects || []).map(renderRuleSection).join('')}</div>
        <footer class="card-footer"><span>${esc(card.allegiance)}</span><span>${esc(footerCenter)}</span><span>${esc(version)}</span></footer>
      </div>
    </article>`
  );

  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element, artworkImage: element.querySelector('.card-art img'), preparation: { parchment: true, fit: 'generic' } };
}
