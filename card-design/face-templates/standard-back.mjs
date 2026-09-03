import { elementFromMarkup, esc } from './common.mjs';

export function render(spec) {
  const faction = spec.content?.faction || spec.faction || 'intelligence';
  const element = elementFromMarkup(`
    <div class="gauntlet-card-back gauntlet-card" data-card-back-faction="${esc(faction)}" role="img" aria-label="${esc(spec.label)}">
      <div class="gauntlet-card-back__pattern-window" aria-hidden="true">
        <img class="gauntlet-card-back__pattern" src="/card-design/card-back-pattern.svg" alt="" />
      </div>
      <div class="gauntlet-card-back__frame" aria-hidden="true"></div>
      <div class="gauntlet-card-back__wordmark" aria-hidden="true"></div>
    </div>`
  );
  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element, preparation: { parchment: false, fit: 'none' } };
}
