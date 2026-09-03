import { elementFromMarkup, esc } from './common.mjs';

export function render(spec) {
  const component = spec.content.component;
  const element = elementFromMarkup(`
    <article class="gauntlet-card faction-component-card deed-card financiers-card"
      data-faction="${esc(spec.faction)}"
      data-component-id="${esc(component.id)}"
      data-contract-component-id="${esc(component.id)}"
      data-production-status="${esc(component.productionStatus || 'ready')}"
      data-design-status="${esc(component.designStatus || 'final')}"
      aria-label="${esc(spec.label)}">
      <div class="card-interior">
        <header class="card-heading">
          <h3 class="card-title">${esc(component.name)}</h3>
          <div class="supplemental-type-line" aria-hidden="true"><span class="deed-divider"></span></div>
        </header>
      </div>
    </article>`
  );
  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element };
}
